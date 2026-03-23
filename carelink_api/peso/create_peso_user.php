<?php
// carelink_api/peso/create_peso_user.php
// PESO creates a new account for fellow PESO officers

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);

include_once '../dbcon.php';

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

        // Insert into users table
        $insertUserSql = "INSERT INTO users 
                         (first_name, middle_name, last_name, email, username, password, user_type, status, profile_completed, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, 'peso', 'active', 1, NOW())";
        
        $insertUserStmt = $conn->prepare($insertUserSql);
        $insertUserStmt->bind_param(
            "ssssss", 
            $first_name, 
            $middle_name, 
            $last_name, 
            $email, 
            $username, 
            $hashed_password
        );
        
        if (!$insertUserStmt->execute()) {
            throw new Exception("Failed to create user: " . $insertUserStmt->error);
        }
        
        $new_user_id = $conn->insert_id;
        $insertUserStmt->close();

        // Optionally create a peso_profiles table entry if you have one
        // For now, we'll just store the contact number in users table or create a simple profile
        
        // If you have a peso_profiles table, uncomment and adjust:
        /*
        $insertProfileSql = "INSERT INTO peso_profiles 
                            (user_id, contact_number, created_at) 
                            VALUES (?, ?, NOW())";
        $insertProfileStmt = $conn->prepare($insertProfileSql);
        $insertProfileStmt->bind_param("is", $new_user_id, $contact_number);
        $insertProfileStmt->execute();
        $insertProfileStmt->close();
        */

        // Log the creation
        error_log("PESO user created successfully. User ID: $new_user_id, Email: $email");

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