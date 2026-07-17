<?php
/**
 * auth/verify_email.php — confirm a signup code and mark the email verified.
 *
 * POST { user_id | email, code }
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

try {
    require_once __DIR__ . "/../dbcon.php";
    require_once __DIR__ . "/../shared/auth_codes.php";

    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $code  = trim((string) ($data['code'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $userId = isset($data['user_id']) ? (int) $data['user_id'] : 0;

    if ($code === '' || (!$userId && $email === '')) {
        echo json_encode(["success" => false, "message" => "Missing code or account."]);
        exit();
    }

    // Resolve the account by id or email.
    if ($userId) {
        $stmt = $conn->prepare("SELECT user_id, first_name, email, email_verified_at FROM users WHERE user_id = ?");
        $stmt->bind_param('i', $userId);
    } else {
        $stmt = $conn->prepare("SELECT user_id, first_name, email, email_verified_at FROM users WHERE email = ?");
        $stmt->bind_param('s', $email);
    }
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        echo json_encode(["success" => false, "message" => "We couldn't find that account."]);
        exit();
    }
    if ($user['email_verified_at'] !== null) {
        echo json_encode(["success" => true, "message" => "This email is already verified. You can sign in.", "already_verified" => true]);
        exit();
    }

    $check = carelink_verify_code($conn, (int) $user['user_id'], 'verify_email', $code);
    if (!$check['ok']) {
        echo json_encode(["success" => false, "message" => $check['message']]);
        exit();
    }

    $upd = $conn->prepare("UPDATE users SET email_verified_at = NOW() WHERE user_id = ?");
    $upd->bind_param('i', $user['user_id']);
    $upd->execute();
    $upd->close();

    echo json_encode([
        "success" => true,
        "message" => "Email verified! You can now sign in.",
        "user_id" => (int) $user['user_id'],
    ]);

} catch (Throwable $e) {
    error_log('verify_email.php: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
}
