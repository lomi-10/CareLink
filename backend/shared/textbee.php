<?php
/**
 * TextBee SMS transport. API credentials stay on the backend.
 */

require_once __DIR__ . '/../load_config.php';
require_once __DIR__ . '/phone.php';

function carelink_textbee_number(?string $phone): ?string
{
    $normalized = carelink_normalize_ph_mobile($phone);
    return $normalized === null ? null : '+63' . substr($normalized, 1);
}

/**
 * Send one TextBee batch. Returns true when the API accepts it for delivery.
 *
 * @param string[] $phoneNumbers Philippine mobile numbers in any supported local format.
 */
function carelink_textbee_send(array $phoneNumbers, string $message): bool
{
    $apiKey = trim((string) carelink_cfg('TEXTBEE_API_KEY', ''));
    if ($apiKey === '') {
        error_log('CareLink TextBee: TEXTBEE_API_KEY is not configured.');
        return false;
    }
    if ($message === '') {
        error_log('CareLink TextBee: refused to send an empty SMS.');
        return false;
    }
    if (!function_exists('curl_init')) {
        error_log('CareLink TextBee: PHP cURL extension is not available.');
        return false;
    }

    $recipients = [];
    $invalidRecipientFound = false;
    foreach ($phoneNumbers as $phone) {
        $number = carelink_textbee_number((string) $phone);
        if ($number === null) {
            $invalidRecipientFound = true;
            error_log('CareLink TextBee: refused to send to an invalid Philippine mobile number.');
            continue;
        }
        $recipients[] = $number;
    }
    $recipients = array_values(array_unique($recipients));
    if (!$recipients) {
        return !$invalidRecipientFound;
    }

    $payload = json_encode([
        'recipients' => $recipients,
        'message' => $message,
    ]);
    if ($payload === false) {
        error_log('CareLink TextBee: could not encode SMS request.');
        return false;
    }

    $curl = curl_init('https://api.textbee.dev/api/v1/gateway/send-sms');
    if ($curl === false) {
        error_log('CareLink TextBee: could not initialize HTTP request.');
        return false;
    }

    $configured = curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 8,
    ]);
    if (!$configured) {
        $curlError = curl_error($curl);
        curl_close($curl);
        error_log('CareLink TextBee: could not configure HTTP request: ' . $curlError);
        return false;
    }

    $response = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($response === false) {
        error_log('CareLink TextBee: request failed: ' . $curlError);
        return false;
    }

    $data = json_decode($response, true);
    if ($status < 200 || $status >= 300 || !is_array($data) || empty($data['success'])) {
        $detail = is_array($data) ? (string) ($data['message'] ?? '') : '';
        error_log('CareLink TextBee: API rejected SMS batch (HTTP ' . $status . '). ' . $detail);
        return false;
    }

    return true;
}

function carelink_textbee_send_to_user(mysqli $conn, int $userId, string $message): bool
{
    $stmt = $conn->prepare('SELECT phone FROM users WHERE user_id = ? LIMIT 1');
    if (!$stmt) {
        error_log('CareLink TextBee: could not prepare recipient lookup: ' . $conn->error);
        return false;
    }
    $stmt->bind_param('i', $userId);
    if (!$stmt->execute()) {
        error_log('CareLink TextBee: could not load recipient phone: ' . $stmt->error);
        $stmt->close();
        return false;
    }
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || empty($row['phone'])) {
        return false;
    }

    return carelink_textbee_send([(string) $row['phone']], $message);
}
