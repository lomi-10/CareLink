<?php
// carelink_api/peso/create_peso_user.php
// PESO creates a new account for fellow PESO officers

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);

include_once '../dbcon.php';
include_once __DIR__ . '/peso_auth.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    
    $response = array(
        "success" => $success,
        "message" => $message
    );
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Get JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // Only an existing approved PESO staff member may create another PESO
    // account — without this, anyone could self-register as PESO staff.
    $staff_user_id = isset($data['staff_user_id']) ? (int) $data['staff_user_id'] : 0;
    peso_validate_staff_actor($conn, $staff_user_id);

    // Validate required fields
    $required = ['first_name', 'last_name', 'email', 'username', 'password'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            throw new Exception("Field '$field' is required");
        }
    }

    $first_name = trim($data['first_name']);
    $middle_name = isset($data['middle_name']) ? trim($data['middle_name']) : null;
    $last_name = trim($data['last_name']);
    $email = trim($data['email']);
    $username = trim($data['username']);
    $password = $data['password'];
    $contact_number = isset($data['contact_number']) ? trim($data['contact_number']) : null;

    error_log("=== CREATE PESO USER === Email: $email, Username: $username");

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Invalid email format");
    }

    // Validate password length
    if (strlen($password) < 6) {
        throw new Exception("Password must be at least 6 characters");
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // Check if email already exists
        $checkEmailSql = "SELECT user_id FROM users WHERE email = ?";
        $checkEmailStmt = $conn->prepare($checkEmailSql);
        $checkEmailStmt->bind_param("s", $email);
        $checkEmailStmt->execute();
        $checkEmailResult = $checkEmailStmt->get_result();
        
        if ($checkEmailResult->num_rows > 0) {
            throw new Exception("Email already exists");
        }
        $checkEmailStmt->close();

        // Check if username already exists
        $checkUsernameSql = "SELECT user_id FROM users WHERE username = ?";
        $checkUsernameStmt = $conn->prepare($checkUsernameSql);
        $checkUsernameStmt->bind_param("s", $username);
        $checkUsernameStmt->execute();
        $checkUsernameResult = $checkUsernameStmt->get_result();
        
        if ($checkUsernameResult->num_rows > 0) {
            throw new Exception("Username already exists");
        }
        $checkUsernameStmt->close();

        // Hash password
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // status MUST be 'approved'.
        //
        // This previously wrote 'active', which no code anywhere looks for. Both
        // staff guards (peso_require_staff and peso_validate_staff_actor) test
        // for status = 'approved', so every account created here could log in
        // and then be refused by User Verification, Job Verification, reports —
        // every staff-only screen in the portal. admin/admin_create_user.php has
        // always written 'approved'; this endpoint was the odd one out.
        $insertUserSql = "INSERT INTO users
                         (first_name, middle_name, last_name, email, username, password, phone, user_type, status, profile_completed, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'peso', 'approved', 1, NOW())";

        $insertUserStmt = $conn->prepare($insertUserSql);
        if (!$insertUserStmt) throw new Exception('Prepare failed: ' . $conn->error);
        // The form has always collected a contact number and this endpoint has
        // always thrown it away — the profile insert below it was commented out.
        $insertUserStmt->bind_param(
            "sssssss",
            $first_name,
            $middle_name,
            $last_name,
            $email,
            $username,
            $hashed_password,
            $contact_number
        );

        if (!$insertUserStmt->execute()) {
            throw new Exception("Failed to create user: " . $insertUserStmt->error);
        }
        
        $new_user_id = $conn->insert_id;
        $insertUserStmt->close();

        // Granting someone staff access is the most privilege-sensitive action
        // in this portal, and it was the only PESO mutation with no audit row.
        // Inside the transaction, so a failed log rolls the account back rather
        // than leaving an unattributable staff account behind.
        peso_audit_verification($conn, $staff_user_id, 'CREATE_PESO_USER', 'User Management', $new_user_id);

        error_log("PESO user created. User ID: $new_user_id, Email: $email, by staff: $staff_user_id");

        // Commit transaction
        $conn->commit();

        sendResponse(true, "PESO user created successfully", array(
            'user_id' => $new_user_id,
            'email' => $email,
            'username' => $username
        ));

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>