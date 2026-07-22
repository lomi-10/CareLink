<?php
/**
 * auth/request_profile_change.php — begin a verified change of email or contact number.
 *
 * POST { user_id, requester_id, field: 'email'|'contact', value }
 *
 * Sends a 6-digit code:
 *   • email   → to the NEW address (proves the user controls it)
 *   • contact → to the user's CURRENT email (proves account ownership; no SMS)
 *
 * The new value is stored on the code row (pending_value) so confirmation can
 * only apply the exact value this code was issued for. Requires the caller to be
 * the account owner (carelink_require_self).
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

/** a***@gmail.com — hint the destination without revealing it fully. */
function carelink_mask_email(string $email): string {
    $at = strpos($email, '@');
    if ($at === false) return $email;
    $name = substr($email, 0, $at);
    $domain = substr($email, $at);
    $keep = max(1, min(2, strlen($name)));
    return substr($name, 0, $keep) . str_repeat('*', max(1, strlen($name) - $keep)) . $domain;
}

try {
    require_once __DIR__ . "/../dbcon.php";
    require_once __DIR__ . "/../shared/auth_codes.php";
    require_once __DIR__ . "/../shared/mailer.php";
    require_once __DIR__ . "/../shared/ownership_guard.php";

    $data        = json_decode(file_get_contents("php://input"), true) ?? [];
    $userId      = isset($data['user_id']) ? (int) $data['user_id'] : 0;
    $requesterId = isset($data['requester_id']) ? (int) $data['requester_id'] : $userId;
    $field       = strtolower(trim((string) ($data['field'] ?? '')));
    $value       = trim((string) ($data['value'] ?? ''));

    carelink_require_self($requesterId, $userId, "You can only change your own account.");

    if (!in_array($field, ['email', 'contact'], true)) {
        echo json_encode(["success" => false, "message" => "Unknown field."]);
        exit();
    }
    if (!carelink_mail_configured()) {
        echo json_encode(["success" => false, "message" => "Email isn't set up on the server, so we can't send a verification code right now."]);
        exit();
    }

    $stmt = $conn->prepare("SELECT user_id, first_name, email FROM users WHERE user_id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$user) {
        echo json_encode(["success" => false, "message" => "We couldn't find that account."]);
        exit();
    }

    if ($field === 'email') {
        $newEmail = strtolower($value);
        if ($newEmail === '' || !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(["success" => false, "message" => "Please enter a valid email address."]);
            exit();
        }
        if ($newEmail === strtolower((string) $user['email'])) {
            echo json_encode(["success" => false, "message" => "That's already your email address."]);
            exit();
        }
        $dup = $conn->prepare("SELECT user_id FROM users WHERE email = ? AND user_id <> ? LIMIT 1");
        $dup->bind_param('si', $newEmail, $userId);
        $dup->execute();
        $taken = $dup->get_result()->fetch_assoc();
        $dup->close();
        if ($taken) {
            echo json_encode(["success" => false, "message" => "That email is already used by another account."]);
            exit();
        }
        if (carelink_code_on_cooldown($conn, $userId, 'email_change')) {
            echo json_encode(["success" => false, "message" => "Please wait a minute before requesting another code."]);
            exit();
        }
        $code = carelink_issue_code($conn, $userId, 'email_change', $newEmail);
        $html = carelink_mail_template(
            "Confirm your new email",
            "Enter this code in CareLink to set <b>" . htmlspecialchars($newEmail) . "</b> as your new sign-in email.",
            $code,
            "This code expires in 15 minutes. If you didn't request this, you can ignore this email."
        );
        carelink_send_mail($newEmail, (string) $user['first_name'], "Confirm your new CareLink email", $html, "Your CareLink verification code is {$code}. It expires in 15 minutes.");
        echo json_encode(["success" => true, "message" => "We sent a 6-digit code to {$newEmail}.", "sent_to" => carelink_mask_email($newEmail)]);
        exit();
    }

    // field === 'contact' — code goes to the CURRENT email (we have no SMS).
    $digits = preg_replace('/\D/', '', $value);
    if (strlen($digits) < 7 || strlen($digits) > 13) {
        echo json_encode(["success" => false, "message" => "Please enter a valid contact number."]);
        exit();
    }
    $currentEmail = strtolower((string) $user['email']);
    if ($currentEmail === '' || !filter_var($currentEmail, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Add a valid email to your account first — we send the confirmation code there."]);
        exit();
    }
    if (carelink_code_on_cooldown($conn, $userId, 'contact_change')) {
        echo json_encode(["success" => false, "message" => "Please wait a minute before requesting another code."]);
        exit();
    }
    $code = carelink_issue_code($conn, $userId, 'contact_change', $value);
    $html = carelink_mail_template(
        "Confirm your new contact number",
        "Enter this code in CareLink to set <b>" . htmlspecialchars($value) . "</b> as your contact number.",
        $code,
        "This code expires in 15 minutes. If you didn't request this, you can ignore this email."
    );
    carelink_send_mail($currentEmail, (string) $user['first_name'], "Confirm your new contact number", $html, "Your CareLink verification code is {$code}. It expires in 15 minutes.");
    echo json_encode(["success" => true, "message" => "We sent a 6-digit code to your email " . carelink_mask_email($currentEmail) . ".", "sent_to" => carelink_mask_email($currentEmail)]);

} catch (Throwable $e) {
    error_log('request_profile_change.php: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Something went wrong. Please try again."]);
}
