<?php
// carelink_api/shared/get_user_status.php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

include_once '../dbcon.php';

if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
    echo json_encode(["success" => false, "message" => "Missing user_id parameter"]);
    exit;
}

$user_id = intval($_GET['user_id']);

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // 1. Get base user status and find out their user_type
    $user_sql = "SELECT status, profile_completed, user_type FROM users WHERE user_id = ?";
    $user_stmt = $conn->prepare($user_sql);
    $user_stmt->bind_param("i", $user_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();

    if ($user_result->num_rows === 0) {
        throw new Exception("User not found");
    }
    $user_data = $user_result->fetch_assoc();
    $user_type = $user_data['user_type'];
    $user_stmt->close();

    // 2. Dynamically choose which profile table to check based on user_type
    $verification_status = 'Unverified'; // Default fallback
    
    if ($user_type === 'parent' || $user_type === 'helper') {
        $table_name = ($user_type === 'parent') ? 'parent_profiles' : 'helper_profiles';
        
        $profile_sql = "SELECT verification_status FROM {$table_name} WHERE user_id = ?";
        $profile_stmt = $conn->prepare($profile_sql);
        
        if ($profile_stmt) {
            $profile_stmt->bind_param("i", $user_id);
            $profile_stmt->execute();
            $profile_result = $profile_stmt->get_result();
            
            if ($profile_result->num_rows > 0) {
                $verification_status = $profile_result->fetch_assoc()['verification_status'];
            }
            $profile_stmt->close();
        }
    }

    // 3. Document check
    $doc_count = 0;
    $doc_sql = "SELECT COUNT(*) as doc_count FROM user_documents WHERE user_id = ?";
    $doc_stmt = $conn->prepare($doc_sql);
    if ($doc_stmt) {
        $doc_stmt->bind_param("i", $user_id);
        $doc_stmt->execute();
        $doc_count = $doc_stmt->get_result()->fetch_assoc()['doc_count'];
        $doc_stmt->close();
    }

    // 4. Send Response
    echo json_encode([
        "success" => true,
        // BACKWARDS COMPATIBLE: Keeps your _layout.tsx working perfectly!
        "status" => $user_data['status'], 
        "user_type" => $user_type,
        // SMART DATA: Available for future updates if you need it
        "details" => [
            "profile_completed" => (bool)$user_data['profile_completed'],
            "verification_status" => $verification_status,
            "has_documents" => $doc_count > 0
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>