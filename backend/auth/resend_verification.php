<?php
/**
 * auth/resend_verification.php — send a fresh signup code.
 *
 * POST { user_id | email }
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
    require_once __DIR__ . "/../shared/mailer.php";

    $data   = json_decode(file_get_contents("php://input"), true) ?? [];
    $email  = strtolower(trim((string) ($data['email'] ?? '')));
    $userId = isset($data['user_id']) ? (int) $data['user_id'] : 0;

    if (!$userId && $email === '') {
        echo json_encode(["success" => false, "message" => "Missing account."]);
        exit();
    }

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
    if (carelink_code_on_cooldown($conn, (int) $user['user_id'], 'verify_email')) {
        echo json_encode(["success" => false, "message" => "Please wait a minute before requesting another code."]);
        exit();
    }

    $code = carelink_issue_code($conn, (int) $user['user_id'], 'verify_email');
    $sent = carelink_send_verification_code($user['email'], $user['first_name'], $code);

    echo json_encode([
        "success" => $sent,
        "message" => $sent
            ? "We sent a new code to " . $user['email'] . "."
            : "We couldn't send the email right now. Please try again shortly.",
    ]);

} catch (Throwable $e) {
    error_log('resend_verification.php: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
}
