<?php
/**
 * auth/reset_password.php — consume a reset code and set a new password.
 *
 * POST { identifier, channel, code, password }
 *
 * The password policy is enforced HERE, server-side. useSignupForm.ts checks the
 * same rules in the UI, but client checks are advisory — anyone can POST straight
 * to this endpoint, so the real gate has to live on the server.
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

/** Mirrors the client rules in hooks/auth/useSignupForm.ts. */
function carelink_password_problem(string $p): ?string
{
    if (strlen($p) < 8)                                  return 'Password must be at least 8 characters.';
    if (!preg_match('/[a-z]/', $p))                      return 'Password must include a lowercase letter.';
    if (!preg_match('/[A-Z]/', $p))                      return 'Password must include an uppercase letter.';
    if (!preg_match('/[0-9]/', $p))                      return 'Password must include a number.';
    if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $p))     return 'Password must include a special character.';
    return null;
}

try {
    require_once __DIR__ . "/../dbcon.php";
    require_once __DIR__ . "/../shared/auth_codes.php";
    require_once __DIR__ . "/../shared/phone.php";

    $data     = json_decode(file_get_contents("php://input"), true) ?? [];
    $channel  = strtolower(trim((string) ($data['channel'] ?? 'email')));
    $identifier = trim((string) ($data['identifier'] ?? $data['email'] ?? ''));
    $code     = trim((string) ($data['code'] ?? ''));
    $password = (string) ($data['password'] ?? '');

    if (!in_array($channel, ['email', 'sms'], true) || $identifier === '' || $code === '' || $password === '') {
        echo json_encode(["success" => false, "message" => "Missing contact, code, or new password."]);
        exit();
    }

    if ($channel === 'email') {
        $identifier = strtolower($identifier);
        if (!filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(["success" => false, "message" => "Please enter a valid email address."]);
            exit();
        }
        $stmt = $conn->prepare("
            SELECT user_id FROM users
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
            SELECT user_id FROM users
            WHERE phone = ? AND account_verification_channel = 'sms'
            LIMIT 1
        ");
    }
    $stmt->bind_param('s', $identifier);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $problem = carelink_password_problem($password);
    if ($problem !== null) {
        echo json_encode(["success" => false, "message" => $problem]);
        exit();
    }

    // Same wording as a bad code: never confirm whether the contact is registered.
    if (!$user) {
        echo json_encode(["success" => false, "message" => "That code is invalid or has expired. Please request a new one."]);
        exit();
    }

    $check = carelink_verify_code($conn, (int) $user['user_id'], 'password_reset', $code);
    if (!$check['ok']) {
        echo json_encode(["success" => false, "message" => $check['message']]);
        exit();
    }

    // bcrypt to match signup.php (password_hash + PASSWORD_BCRYPT).
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $upd = $conn->prepare("UPDATE users SET password = ? WHERE user_id = ?");
    $upd->bind_param('si', $hash, $user['user_id']);
    $upd->execute();
    $upd->close();

    // Proving the selected contact method completes signup verification too.
    $verSql = $channel === 'email'
        ? "UPDATE users SET account_verified_at = NOW(), email_verified_at = NOW() WHERE user_id = ? AND account_verified_at IS NULL"
        : "UPDATE users SET account_verified_at = NOW() WHERE user_id = ? AND account_verified_at IS NULL";
    $ver = $conn->prepare($verSql);
    $ver->bind_param('i', $user['user_id']);
    $ver->execute();
    $ver->close();

    echo json_encode(["success" => true, "message" => "Password updated. You can now sign in."]);

} catch (Throwable $e) {
    error_log('reset_password.php: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
}
