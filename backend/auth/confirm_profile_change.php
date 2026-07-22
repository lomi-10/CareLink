<?php
/**
 * auth/confirm_profile_change.php — finish a verified email / contact-number change.
 *
 * POST { user_id, requester_id, field: 'email'|'contact', code }
 *
 * The new value is NOT taken from the request — it's read from the code row
 * (pending_value), so only the exact value the code was issued for can be applied.
 * On success: email → users.email (+ re-mark verified); contact → the caller's
 * helper_profiles / parent_profiles contact_number.
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
    require_once __DIR__ . "/../shared/ownership_guard.php";

    $data        = json_decode(file_get_contents("php://input"), true) ?? [];
    $userId      = isset($data['user_id']) ? (int) $data['user_id'] : 0;
    $requesterId = isset($data['requester_id']) ? (int) $data['requester_id'] : $userId;
    $field       = strtolower(trim((string) ($data['field'] ?? '')));
    $code        = trim((string) ($data['code'] ?? ''));

    carelink_require_self($requesterId, $userId, "You can only change your own account.");

    if (!in_array($field, ['email', 'contact'], true)) {
        echo json_encode(["success" => false, "message" => "Unknown field."]);
        exit();
    }

    $purpose = $field === 'email' ? 'email_change' : 'contact_change';
    $res = carelink_verify_code($conn, $userId, $purpose, $code);
    if (!$res['ok']) {
        echo json_encode(["success" => false, "message" => $res['message']]);
        exit();
    }

    $newValue = isset($res['value']) ? trim((string) $res['value']) : '';
    if ($newValue === '') {
        echo json_encode(["success" => false, "message" => "This code can't be used for that change. Please start again."]);
        exit();
    }

    if ($field === 'email') {
        // Re-check uniqueness at apply time (someone could have taken it since request).
        $dup = $conn->prepare("SELECT user_id FROM users WHERE email = ? AND user_id <> ? LIMIT 1");
        $dup->bind_param('si', $newValue, $userId);
        $dup->execute();
        $taken = $dup->get_result()->fetch_assoc();
        $dup->close();
        if ($taken) {
            echo json_encode(["success" => false, "message" => "That email is already used by another account."]);
            exit();
        }
        // The new address is proven (the code was delivered there), so keep it verified.
        $upd = $conn->prepare("UPDATE users SET email = ?, email_verified_at = NOW(), updated_at = NOW() WHERE user_id = ?");
        $upd->bind_param('si', $newValue, $userId);
        $upd->execute();
        $upd->close();
        echo json_encode(["success" => true, "message" => "Your email was updated.", "field" => "email", "value" => $newValue]);
        exit();
    }

    // field === 'contact' — write to the caller's profile table.
    $ut = $conn->prepare("SELECT user_type FROM users WHERE user_id = ?");
    $ut->bind_param('i', $userId);
    $ut->execute();
    $userType = (string) ($ut->get_result()->fetch_assoc()['user_type'] ?? '');
    $ut->close();

    $table = $userType === 'helper' ? 'helper_profiles' : ($userType === 'parent' ? 'parent_profiles' : null);
    if ($table === null) {
        echo json_encode(["success" => false, "message" => "Contact number isn't editable for this account type."]);
        exit();
    }

    $upd = $conn->prepare("UPDATE {$table} SET contact_number = ?, updated_at = NOW() WHERE user_id = ?");
    $upd->bind_param('si', $newValue, $userId);
    $upd->execute();
    $upd->close();
    echo json_encode(["success" => true, "message" => "Your contact number was updated.", "field" => "contact", "value" => $newValue]);

} catch (Throwable $e) {
    error_log('confirm_profile_change.php: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
}
