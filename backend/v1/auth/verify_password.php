<?php
/**
 * POST /carelink_api/v1/auth/verify_password.php
 * Body JSON: { "user_id": int, "password": string }
 *
 * Re-verifies the caller's account password as their electronic signature
 * confirmation (RA 8792 — Electronic Commerce Act) before recording a
 * contract signature via sign_contract.php. Does not modify any contract
 * or application state itself.
 *
 * Rate limiting: 5 incorrect attempts locks further verification for this
 * user for 5 minutes (password_verify_attempts table).
 */

ob_start();
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../error.log');

require_once __DIR__ . '/../../dbcon.php';

const CARELINK_PASSWORD_VERIFY_MAX_ATTEMPTS = 5;
const CARELINK_PASSWORD_VERIFY_LOCKOUT_SECONDS = 300;

function carelink_verify_password_send_json(bool $ok, string $message, array $extra = []): void
{
    if (ob_get_level()) {
        ob_clean();
    }
    echo json_encode(array_merge(['success' => $ok, 'message' => $message], $extra));
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST required');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('Invalid JSON');
    }

    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $password = isset($input['password']) ? (string) $input['password'] : '';

    if ($user_id <= 0 || $password === '') {
        throw new Exception('user_id and password are required');
    }

    $us = $conn->prepare('SELECT password FROM users WHERE user_id = ? LIMIT 1');
    $us->bind_param('i', $user_id);
    $us->execute();
    $userRow = $us->get_result()->fetch_assoc();
    $us->close();

    if (!$userRow) {
        throw new Exception('User not found');
    }

    // Check existing lockout/attempt state
    $at = $conn->prepare('SELECT attempt_count, last_attempt FROM password_verify_attempts WHERE user_id = ? LIMIT 1');
    $at->bind_param('i', $user_id);
    $at->execute();
    $attemptRow = $at->get_result()->fetch_assoc();
    $at->close();

    $attemptCount = $attemptRow ? (int) $attemptRow['attempt_count'] : 0;
    $lastAttempt = $attemptRow['last_attempt'] ?? null;

    if ($attemptCount >= CARELINK_PASSWORD_VERIFY_MAX_ATTEMPTS && $lastAttempt !== null) {
        $elapsed = time() - strtotime((string) $lastAttempt);
        if ($elapsed < CARELINK_PASSWORD_VERIFY_LOCKOUT_SECONDS) {
            carelink_verify_password_send_json(false, 'Too many incorrect attempts. Please try again in a few minutes.', [
                'locked' => true,
                'retry_after_seconds' => CARELINK_PASSWORD_VERIFY_LOCKOUT_SECONDS - $elapsed,
            ]);
        }
        // Lockout window has passed; treat as a fresh attempt count below.
        $attemptCount = 0;
    }

    if (password_verify($password, $userRow['password'])) {
        $reset = $conn->prepare('
            INSERT INTO password_verify_attempts (user_id, attempt_count, last_attempt)
            VALUES (?, 0, NOW())
            ON DUPLICATE KEY UPDATE attempt_count = 0, last_attempt = NOW()
        ');
        $reset->bind_param('i', $user_id);
        $reset->execute();
        $reset->close();

        carelink_verify_password_send_json(true, 'Password verified.');
    }

    $attemptCount++;
    $upd = $conn->prepare('
        INSERT INTO password_verify_attempts (user_id, attempt_count, last_attempt)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE attempt_count = ?, last_attempt = NOW()
    ');
    $upd->bind_param('iii', $user_id, $attemptCount, $attemptCount);
    $upd->execute();
    $upd->close();

    if ($attemptCount >= CARELINK_PASSWORD_VERIFY_MAX_ATTEMPTS) {
        carelink_verify_password_send_json(false, 'Too many incorrect attempts. Please try again in a few minutes.', [
            'locked' => true,
            'retry_after_seconds' => CARELINK_PASSWORD_VERIFY_LOCKOUT_SECONDS,
        ]);
    }

    carelink_verify_password_send_json(false, 'Incorrect password.', [
        'attempts_remaining' => CARELINK_PASSWORD_VERIFY_MAX_ATTEMPTS - $attemptCount,
    ]);
} catch (Exception $e) {
    error_log('verify_password: ' . $e->getMessage());
    carelink_verify_password_send_json(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
