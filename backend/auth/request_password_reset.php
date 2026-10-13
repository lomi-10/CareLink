<?php
/**
 * auth/request_password_reset.php — send a reset code through the chosen contact method.
 *
 * POST { identifier, channel }
 *
 * ENUMERATION-SAFE: always replies with the same success message whether or not
 * the address is registered. Saying "no such account" would let anyone test which
 * emails have CareLink accounts — a privacy leak that matters here, because an
 * account means "this person is a domestic helper / is hiring one".
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$GENERIC = "If that contact has a CareLink account, we've sent it a 6-digit reset code.";

try {
    require_once __DIR__ . "/../dbcon.php";
    require_once __DIR__ . "/../shared/auth_codes.php";
    require_once __DIR__ . "/../shared/mailer.php";
    require_once __DIR__ . "/../shared/phone.php";
    require_once __DIR__ . "/../shared/textbee.php";

    $data  = json_decode(file_get_contents("php://input"), true) ?? [];
    $channel = strtolower(trim((string) ($data['channel'] ?? 'email')));
    $identifier = trim((string) ($data['identifier'] ?? $data['email'] ?? ''));

    if (!in_array($channel, ['email', 'sms'], true) || $identifier === '') {
        echo json_encode(["success" => false, "message" => "Enter the email address or mobile number for your account."]);
        exit();
    }

    if ($channel === 'email') {
        $identifier = strtolower($identifier);
        if (!filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(["success" => false, "message" => "Please enter a valid email address."]);
            exit();
        }
        $stmt = $conn->prepare("
            SELECT user_id, first_name, email, phone, account_verification_channel
            FROM users
            WHERE email = ? AND account_verification_channel = 'email'
            LIMIT 1
        ");
    } else {
        $identifier = carelink_normalize_ph_mobile($identifier) ?? '';
        if ($identifier === '') {
            echo json_encode(["success" => false, "message" => "Please enter a valid Philippine mobile number."]);
            exit();
        }
        $stmt = $conn->prepare("
            SELECT user_id, first_name, email, phone, account_verification_channel
            FROM users
            WHERE phone = ? AND account_verification_channel = 'sms'
            LIMIT 1
        ");
    }
    $stmt->bind_param('s', $identifier);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($user) {
        // Cooldown is enforced silently — an attacker must not learn from timing
        // or wording that the address exists.
        if (!carelink_code_on_cooldown($conn, (int) $user['user_id'], 'password_reset')) {
            $code = carelink_issue_code($conn, (int) $user['user_id'], 'password_reset');
            if ($channel === 'sms') {
                carelink_textbee_send(
                    [(string) $user['phone']],
                    'CareLink password reset code: ' . $code . '. It expires in 15 minutes.'
                );
            } else {
                carelink_send_password_reset_code((string) $user['email'], $user['first_name'], $code);
            }
        }
    }

    echo json_encode(["success" => true, "message" => $GENERIC]);

} catch (Throwable $e) {
    error_log('request_password_reset.php: ' . $e->getMessage());
    // Same shape on error — never leak existence through a different response.
    echo json_encode(["success" => true, "message" => $GENERIC]);
}
