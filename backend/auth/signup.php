<?php
// api/signup.php

// 1. ENABLE ERROR REPORTING (To log errors but hide them from JSON output)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// 2. CORS HEADERS (Crucial for React Native/Expo)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    
    require_once "../dbcon.php";
    require_once __DIR__ . "/../shared/auth_codes.php";
    require_once __DIR__ . "/../shared/phone.php";
    require_once __DIR__ . "/../shared/mailer.php";

    if (!$conn) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // 4. GET & DECODE JSON INPUT
    $inputJSON = file_get_contents("php://input");
    $data = json_decode($inputJSON, true);

    if (!$data) {
        throw new Exception("No input received.");
    }

    // Validate required fields based on your React Native state
    if (empty($data['first_name']) || empty($data['last_name']) || empty($data['email']) || empty($data['password']) || empty($data['user_type'])) {
        echo json_encode(["success" => false, "message" => "Missing required fields."]);
        exit();
    }

    // RA 10173 (Data Privacy Act) / NPC Circular 16-01: registration must not
    // proceed without the user explicitly consenting to data collection/processing.
    if (empty($data['privacy_consent'])) {
        echo json_encode(["success" => false, "message" => "You must agree to the data privacy consent to create an account."]);
        exit();
    }

    // Clean the input data
    $first_name = trim($data['first_name']);
    $middle_name = trim($data['middle_name'] ?? '');
    $last_name = trim($data['last_name']);
    $email = strtolower(trim($data['email']));
    $password = $data['password'];
    $user_type = strtolower(trim($data['user_type'])); // "parent", "helper", etc.

    // Public self-service registration: parent & helper only (PESO / super admin are created elsewhere)
    if (!in_array($user_type, ['parent', 'helper'], true)) {
        echo json_encode(["success" => false, "message" => "Invalid account type for self-registration."]);
        exit();
    }

    // Email validation: correct format + the domain must actually accept mail
    // (MX record). This rejects fake/typo domains without asking the user to
    // confirm anything. It verifies the DOMAIN is real, not the exact inbox.
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Please enter a valid email address."]);
        exit();
    }
    $emailDomain = substr(strrchr($email, '@'), 1);
    if ($emailDomain === '' || (!checkdnsrr($emailDomain, 'MX') && !checkdnsrr($emailDomain, 'A'))) {
        echo json_encode(["success" => false, "message" => "That email domain doesn't seem to exist. Please use a real, working email address."]);
        exit();
    }

    // Mobile number — a second way to sign in, for users who find a number easier
    // to remember than an email. Stored canonically (09XXXXXXXXX) so every format
    // the user might type resolves to the same account. Optional: anyone who'd
    // rather not give a number still signs in with their email.
    $phone = null;
    if (!empty($data['phone'])) {
        $phone = carelink_normalize_ph_mobile((string) $data['phone']);
        if ($phone === null) {
            echo json_encode([
                "success" => false,
                "message" => "Please enter a valid Philippine mobile number, like 0917 123 4567.",
                "errors"  => ["phone" => "Please enter a valid Philippine mobile number, like 0917 123 4567."],
            ]);
            exit();
        }
    }

    // 5. DUPLICATE CHECKS — email and phone TOGETHER.
    // These used to run in two places (phone here, email 20 lines later), so when
    // both were taken the user fixed the phone, resubmitted, and only THEN learned
    // the email was taken too. Reporting every clash at once, in form order, means
    // one fix instead of a guessing game.
    $errors = [];

    $stmt = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        $errors['email'] = "This email already has an account. Sign in instead, or use a different email.";
    }
    $stmt->close();

    if ($phone !== null) {
        $pstmt = $conn->prepare("SELECT user_id FROM users WHERE phone = ?");
        $pstmt->bind_param("s", $phone);
        $pstmt->execute();
        if ($pstmt->get_result()->num_rows > 0) {
            // Phone is optional, so tell them the cheapest way out rather than
            // leaving them stuck on a field they never needed to fill.
            $errors['phone'] = "This mobile number is already used by another account. Use a different number, or leave it blank — it's optional.";
        }
        $pstmt->close();
    }

    if (!empty($errors)) {
        echo json_encode([
            "success" => false,
            "message" => implode("\n\n", array_values($errors)),
            "errors"  => $errors,      // lets the form highlight the exact fields
            "reason"  => "duplicate",
        ]);
        exit();
    }

    // 6. GENERATE USERNAME
    $username_base = explode('@', $email)[0];
    $username_base = preg_replace("/[^a-zA-Z0-9]/", "", $username_base);
    if (empty($username_base)) { $username_base = "user"; }
    $username = $username_base . rand(1000, 9999);

    // 7. START TRANSACTION (The Safety Net)
    $conn->begin_transaction();

    // 8. INSERT INTO USERS TABLE
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $status = "pending";

    // Notice we are inserting first_name, middle_name, and last_name now!
    $insertQuery = "INSERT INTO users (first_name, middle_name, last_name, username, email, phone, password, user_type, status, privacy_consent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt = $conn->prepare($insertQuery);
    if (!$stmt) {
        throw new Exception("SQL Prepare Error (Users): " . $conn->error);
    }

    $stmt->bind_param("sssssssss", $first_name, $middle_name, $last_name, $username, $email, $phone, $hashedPassword, $user_type, $status);

    if (!$stmt->execute()) {
        throw new Exception("Failed to insert user: " . $stmt->error);
    }

    // Grab the new user's auto-incremented ID
    $new_user_id = $conn->insert_id;
    $stmt->close();

    // 9. INSERT INTO PROFILE TABLES
    if ($user_type === 'parent') {
        // Prefill contact_number so the user isn't asked for the same number twice.
        $profSql = "INSERT INTO parent_profiles (user_id, contact_number) VALUES (?, ?)";
        $profStmt = $conn->prepare($profSql);
        if ($profStmt) {
            $profStmt->bind_param("is", $new_user_id, $phone);
            $profStmt->execute();
            $profStmt->close();
        } else {
            throw new Exception("SQL Prepare Error (Parent Profile): " . $conn->error);
        }
    } 
    else if ($user_type === 'helper') {
        // Setting a default verification status for helpers
        $profSql = "INSERT INTO helper_profiles (user_id, contact_number) VALUES (?, ?)";
        $profStmt = $conn->prepare($profSql);
        if ($profStmt) {
            $profStmt->bind_param("is", $new_user_id, $phone);
            $profStmt->execute();
            $profStmt->close();
        } else {
            throw new Exception("SQL Prepare Error (Helper Profile): " . $conn->error);
        }
    }

    // 10. COMMIT TRANSACTION (Save everything)
    $conn->commit();

    // 11. EMAIL VERIFICATION
    // Deliberately AFTER the commit: the account is valid whether or not our SMTP
    // is reachable. If the mail fails the user can hit "Resend" instead of losing
    // a registration to someone else's outage.
    $emailSent = false;
    try {
        $code = carelink_issue_code($conn, (int) $new_user_id, 'verify_email');
        $emailSent = carelink_send_verification_code($email, $first_name, $code);
    } catch (Throwable $mailErr) {
        error_log('Signup verification email failed for ' . $email . ': ' . $mailErr->getMessage());
    }

    echo json_encode([
        "success"          => true,
        "message"          => $emailSent
            ? "Account created! Check your email for the 6-digit code."
            : "Account created, but we couldn't send the verification email. Tap Resend to try again.",
        "user_id"          => (int) $new_user_id,
        "email"            => $email,
        "requires_verification" => true,
        "email_sent"       => $emailSent,
    ]);

} catch (Exception $e) {
    // 11. ROLLBACK ON ERROR (Wipe the failed attempt)
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }
    
    http_response_code(200); // Keep 200 so React Native can read the JSON error
    echo json_encode([
        "success" => false, 
        "message" => "Server Error: " . $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>