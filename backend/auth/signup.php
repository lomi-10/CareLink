<?php
// api/signup.php

// 1. ENABLE ERROR REPORTING (To log errors but hide them from JSON output)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// 2. CORS HEADERS (Crucial for React Native/Expo)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
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
    require_once __DIR__ . "/../shared/phone_identity.php";
    require_once __DIR__ . "/../shared/mailer.php";
    require_once __DIR__ . "/../shared/textbee.php";

    if (!$conn) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // 4. GET & DECODE JSON INPUT
    $inputJSON = file_get_contents("php://input");
    $data = json_decode($inputJSON, true);

    if (!$data) {
        throw new Exception("No input received.");
    }

    // Validate required fields based on the chosen verification channel.
    $verificationChannel = strtolower(trim((string) ($data['verification_channel'] ?? 'email')));
    if (!in_array($verificationChannel, ['email', 'sms'], true)) {
        echo json_encode(["success" => false, "message" => "Choose email or SMS for account verification."]);
        exit();
    }
    if (empty($data['first_name']) || empty($data['last_name']) || empty($data['password']) || empty($data['user_type'])) {
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
    $emailInput = $verificationChannel === 'email'
        ? strtolower(trim((string) ($data['email'] ?? '')))
        : '';
    $email = $emailInput !== '' ? $emailInput : null;
    $password = $data['password'];
    $user_type = strtolower(trim($data['user_type'])); // "parent", "helper", etc.

    // Public self-service registration: parent & helper only (PESO / system administrator are created elsewhere)
    if (!in_array($user_type, ['parent', 'helper'], true)) {
        echo json_encode(["success" => false, "message" => "Invalid account type for self-registration."]);
        exit();
    }

    // Email validation: correct format + the domain must actually accept mail
    // (MX record). This rejects fake/typo domains without asking the user to
    // confirm anything. It verifies the DOMAIN is real, not the exact inbox.
    if ($verificationChannel === 'email' && $email === null) {
        echo json_encode(["success" => false, "message" => "Enter an email address to receive your verification code."]);
        exit();
    }
    if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "Please enter a valid email address."]);
        exit();
    }
    $emailDomain = $email !== null ? substr(strrchr($email, '@'), 1) : '';
    if ($email !== null && ($emailDomain === '' || (!checkdnsrr($emailDomain, 'MX') && !checkdnsrr($emailDomain, 'A')))) {
        echo json_encode(["success" => false, "message" => "That email domain doesn't seem to exist. Please use a real, working email address."]);
        exit();
    }

    // Store only the contact used for account verification. The alternate can be
    // added later in profile setup.
    $phone = null;
    if ($verificationChannel === 'sms' && !empty($data['phone'])) {
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
    if ($verificationChannel === 'sms' && $phone === null) {
        echo json_encode(["success" => false, "message" => "Enter a mobile number to receive your verification code by SMS."]);
        exit();
    }

    // 5. DUPLICATE CHECKS — report every provided identifier conflict together.
    // These used to run in two places (phone here, email 20 lines later), so when
    // both were taken the user fixed the phone, resubmitted, and only THEN learned
    // the email was taken too. Reporting every clash at once, in form order, means
    // one fix instead of a guessing game.
    $errors = [];

    if ($email !== null) {
        $stmt = $conn->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) {
            $errors['email'] = "This email already has an account. Sign in instead, or use a different email.";
        }
        $stmt->close();
    }

    if ($phone !== null) {
        // Check users.phone AND helper_profiles/parent_profiles.contact_number so
        // a number already tied to another account cannot be used for SMS signup.
        $conflict = carelink_phone_conflict($conn, 0, $phone);
        if ($conflict !== null) {
            $errors['phone'] = $verificationChannel === 'sms'
                ? "This mobile number is already used by another account. Sign in instead, or use a different number."
                : "This mobile number is already used by another account. Use a different number.";
        }
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
    $username_base = $email !== null ? explode('@', $email)[0] : (string) $phone;
    $username_base = preg_replace("/[^a-zA-Z0-9]/", "", $username_base);
    if (empty($username_base)) { $username_base = "user"; }
    $username = $username_base . rand(1000, 9999);

    // 7. START TRANSACTION (The Safety Net)
    $conn->begin_transaction();

    // 8. INSERT INTO USERS TABLE
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $status = "pending";

    $insertQuery = "INSERT INTO users (first_name, middle_name, last_name, username, email, phone, account_verification_channel, password, user_type, status, privacy_consent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt = $conn->prepare($insertQuery);
    if (!$stmt) {
        throw new Exception("SQL Prepare Error (Users): " . $conn->error);
    }

    $stmt->bind_param("ssssssssss", $first_name, $middle_name, $last_name, $username, $email, $phone, $verificationChannel, $hashedPassword, $user_type, $status);

    if (!$stmt->execute()) {
        throw new Exception("Failed to insert user: " . $stmt->error);
    }

    // Grab the new user's auto-incremented ID
    $new_user_id = $conn->insert_id;
    $stmt->close();

    // 9. INSERT INTO PROFILE TABLES
    if ($user_type === 'parent') {
        // Prefill contact_number so the user isn't asked for the same number twice.
        $profSql = "INSERT INTO parent_profiles (user_id) VALUES (?)";
        $profStmt = $conn->prepare($profSql);
        if ($profStmt) {
            $profStmt->bind_param("i", $new_user_id);
            $profStmt->execute();
            $profStmt->close();
        } else {
            throw new Exception("SQL Prepare Error (Parent Profile): " . $conn->error);
        }
    } 
    else if ($user_type === 'helper') {
        // Setting a default verification status for helpers
        $profSql = "INSERT INTO helper_profiles (user_id) VALUES (?)";
        $profStmt = $conn->prepare($profSql);
        if ($profStmt) {
            $profStmt->bind_param("i", $new_user_id);
            $profStmt->execute();
            $profStmt->close();
        } else {
            throw new Exception("SQL Prepare Error (Helper Profile): " . $conn->error);
        }
    }

    // 10. COMMIT TRANSACTION (Save everything)
    $conn->commit();

    // Send only through the channel the user selected.
    $verificationSent = false;
    try {
        $code = carelink_issue_code($conn, (int) $new_user_id, 'verify_email');
        $verificationSent = $verificationChannel === 'sms'
            ? carelink_textbee_send([$phone], 'CareLink verification code: ' . $code . '. It expires in 15 minutes.')
            : carelink_send_verification_code($email, $first_name, $code);
    } catch (Throwable $verificationError) {
        error_log('Signup verification delivery failed: ' . $verificationError->getMessage());
    }

    echo json_encode([
        "success"          => true,
        "message"          => $verificationSent
            ? ($verificationChannel === 'sms'
                ? "Account created! Check your mobile phone for the 6-digit code."
                : "Account created! Check your email for the 6-digit code.")
            : "Account created, but we couldn't send the verification code. Tap Resend to try again.",
        "user_id"          => (int) $new_user_id,
        "email"            => $email,
        "verification_channel" => $verificationChannel,
        "requires_verification" => true,
        "verification_sent" => $verificationSent,
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