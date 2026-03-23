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
    // 3. DB CONNECTION
    if (!file_exists("dbcon.php")) {
        throw new Exception("dbcon.php file not found.");
    }
    require_once "../dbcon.php"; 

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

    // Clean the input data
    $first_name = trim($data['first_name']);
    $middle_name = trim($data['middle_name'] ?? '');
    $last_name = trim($data['last_name']);
    $email = strtolower(trim($data['email']));
    $password = $data['password'];
    $user_type = strtolower(trim($data['user_type'])); // "parent", "helper", etc.

    // 5. GENERATE USERNAME
    $username_base = explode('@', $email)[0];
    $username_base = preg_replace("/[^a-zA-Z0-9]/", "", $username_base);
    if (empty($username_base)) { $username_base = "user"; }
    $username = $username_base . rand(1000, 9999);

    // 6. CHECK FOR DUPLICATE EMAIL
    $checkQuery = "SELECT user_id FROM users WHERE email = ?";
    $stmt = $conn->prepare($checkQuery);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Email already registered."]);
        $stmt->close();
        exit();
    }
    $stmt->close();

    // 7. START TRANSACTION (The Safety Net)
    $conn->begin_transaction();

    // 8. INSERT INTO USERS TABLE
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $status = "pending";

    // Notice we are inserting first_name, middle_name, and last_name now!
    $insertQuery = "INSERT INTO users (first_name, middle_name, last_name, username, email, password, user_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($insertQuery);
    if (!$stmt) {
        throw new Exception("SQL Prepare Error (Users): " . $conn->error);
    }
    
    $stmt->bind_param("ssssssss", $first_name, $middle_name, $last_name, $username, $email, $hashedPassword, $user_type, $status);

    if (!$stmt->execute()) {
        throw new Exception("Failed to insert user: " . $stmt->error);
    }

    // Grab the new user's auto-incremented ID
    $new_user_id = $conn->insert_id;
    $stmt->close();

    // 9. INSERT INTO PROFILE TABLES
    if ($user_type === 'parent') {
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
        $profSql = "INSERT INTO helper_profiles (user_id, verification_status) VALUES (?, 'Unverified')";
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

    // Send success response back to React Native
    echo json_encode([
        "success" => true, 
        "message" => "Account created successfully!"
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