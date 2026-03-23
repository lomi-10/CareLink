<?php
// carelink_api/admin_create_user.php
// Create Admin or PESO user accounts
// SECURITY: Should be called from authenticated super admin only

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error handling
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

ob_start();

require_once 'dbcon.php';

// Helper function to send JSON response
function sendResponse($success, $message, $data = null) {
    ob_clean();
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// Helper function to get client IP
function get_client_ip() {
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        return $_SERVER['HTTP_CLIENT_IP'];
    else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if(isset($_SERVER['REMOTE_ADDR']))
        return $_SERVER['REMOTE_ADDR'];
    return 'UNKNOWN';
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        sendResponse(false, 'Invalid request data');
    }

    // Validate required fields
    $required = ['first_name', 'last_name', 'email', 'password', 'user_type'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            sendResponse(false, "Missing required field: $field");
        }
    }

    // Extract and sanitize data
    $first_name = trim($data['first_name']);
    $middle_name = isset($data['middle_name']) ? trim($data['middle_name']) : '';
    $last_name = trim($data['last_name']);
    $email = strtolower(trim($data['email']));
    $password = $data['password'];
    $user_type = strtolower(trim($data['user_type'])); // 'admin' or 'peso'

    // Validate user_type (SECURITY: Only admin or peso allowed)
    if (!in_array($user_type, ['admin', 'peso'])) {
        sendResponse(false, 'Invalid user type. Must be either "admin" or "peso".');
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Invalid email format');
    }

    // Validate password strength
    if (strlen($password) < 6) {
        sendResponse(false, 'Password must be at least 6 characters long');
    }

    // Check if email already exists
    $stmt = mysqli_prepare($conn, "SELECT user_id FROM users WHERE email = ?");
    mysqli_stmt_bind_param($stmt, 's', $email);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);

    if (mysqli_num_rows($result) > 0) {
        sendResponse(false, 'Email already registered. Please use a different email.');
    }

    // Generate username from email
    $username = explode('@', $email)[0] . rand(1000, 9999);

    // Hash password
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);

    // Start transaction
    mysqli_begin_transaction($conn);

    try {
        // Insert into users table
        // IMPORTANT: Admin/PESO users are created with status='approved' and profile_completed=1
        // They do NOT have profiles in helper_profiles or parent_profiles
        $stmt = mysqli_prepare($conn, "
            INSERT INTO users (
                email, 
                username, 
                password, 
                first_name, 
                middle_name, 
                last_name, 
                user_type, 
                status, 
                profile_completed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 1)
        ");

        mysqli_stmt_bind_param(
            $stmt,
            'sssssss',
            $email,
            $username,
            $hashed_password,
            $first_name,
            $middle_name,
            $last_name,
            $user_type
        );

        if (!mysqli_stmt_execute($stmt)) {
            throw new Exception('Failed to create admin account: ' . mysqli_error($conn));
        }

        $user_id = mysqli_insert_id($conn);

        // Log account creation
        $ip_address = get_client_ip();
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        
        $log_stmt = mysqli_prepare($conn, "
            INSERT INTO log_trail (
                user_id, 
                action, 
                module, 
                status, 
                ip_address, 
                device_info
            ) VALUES (?, 'CREATE_ADMIN', 'Admin', 'Success', ?, ?)
        ");
        
        mysqli_stmt_bind_param($log_stmt, 'iss', $user_id, $ip_address, $user_agent);
        mysqli_stmt_execute($log_stmt);

        // Commit transaction
        mysqli_commit($conn);

        // Success response
        $role_name = $user_type === 'admin' ? 'Super Admin' : 'PESO Officer';
        
        sendResponse(true, "$role_name account created successfully!", [
            'user_id' => $user_id,
            'email' => $email,
            'user_type' => $user_type,
            'full_name' => trim("$first_name $middle_name $last_name"),
            'status' => 'approved'
        ]);

    } catch (Exception $e) {
        // Rollback on error
        mysqli_rollback($conn);
        error_log('Admin creation error: ' . $e->getMessage());
        sendResponse(false, $e->getMessage());
    }

} catch (Exception $e) {
    error_log('Admin create user error: ' . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}

mysqli_close($conn);
?>