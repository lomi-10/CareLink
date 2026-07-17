<?php
/**
 * auth/reset_password.php — consume a reset code and set a new password.
 *
 * POST { email, code, password }
 *
 * The password policy is enforced HERE, server-side. useSignupForm.ts checks the
 * same rules in the UI, but client checks are advisory — anyone can POST straight
 * to this endpoint, so the real gate has to live on the server.
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

/** Mirrors the client rules in hooks/auth/useSignupForm.ts. */
function carelink_password_problem(string $p): ?string
{
    if (strlen($p) < 8)                                  return 'Password must be at least 8 characters.';
    if (!preg_match('/[A-Z]/', $p))                      return 'Password must include an uppercase letter.';
    if (!preg_match('/[0-9]/', $p))                      return 'Password must include a number.';
    if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $p))     return 'Password must include a special character.';
    return null;
}

try {
    require_once __DIR__ . "/../dbcon.php";
    require_once __DIR__ . "/../shared/auth_codes.php";

    $data     = json_decode(file_get_contents("php://input"), true) ?? [];
    $email    = strtolower(trim((string) ($data['email'] ?? '')));
    $code     = trim((string) ($data['code'] ?? ''));
    $password = (string) ($data['password'] ?? '');

    if ($email === '' || $code === '' || $password === '') {
        echo json_encode(["success" => false, "message" => "Missing email, code, or new password."]);
        exit();
    }

    $problem = carelink_password_problem($password);
    if ($problem !== null) {
        echo json_encode(["success" => false, "message" => $problem]);
        exit();
    }

    $stmt = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Same wording as a bad code: never confirm whether the address is registered.
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

    // Someone proving inbox ownership also proves the address is real, so a reset
    // doubles as verification for any account still pending it.
    $ver = $conn->prepare("UPDATE users SET email_verified_at = NOW() WHERE user_id = ? AND email_verified_at IS NULL");
    $ver->bind_param('i', $user['user_id']);
    $ver->execute();
    $ver->close();

    echo json_encode(["success" => true, "message" => "Password updated. You can now sign in."]);

} catch (Throwable $e) {
    error_log('reset_password.php: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
}
