<?php
// carelink_api/parent/update_job_status.php

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Standard Error Logging
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';

// 2. Your Standard Response Function
function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $response = array("success" => $success, "message" => $message);
    if ($data !== null) {
        foreach ($data as $key => $value) {
            $response[$key] = $value;
        }
    }
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $input = json_decode(file_get_contents('php://input'), true);
    
    $job_post_id = isset($input['job_post_id']) ? intval($input['job_post_id']) : null;
    $new_status = $input['status'] ?? null;
    
    if (!$job_post_id || !$new_status) {
        throw new Exception('Job ID and status are required');
    }
    
    if (!in_array($new_status, ['Open', 'Filled', 'Closed'])) {
        throw new Exception('Invalid status provided');
    }
    
    error_log("=== UPDATE JOB STATUS === ID: $job_post_id to $new_status");

    // 3. Dynamic SQL Construction (mysqli style)
    $sql = "UPDATE job_posts SET status = ?";
    
    if ($new_status === 'Filled') {
        $sql .= ", filled_at = NOW()";
    }
    if ($new_status === 'Open') {
        $sql .= ", filled_at = NULL";
    }
    
    $sql .= " WHERE job_post_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $new_status, $job_post_id);
    $stmt->execute();
    
    // 4. Affected Rows Check
    if ($stmt->affected_rows === 0) {
        $stmt->close();
        throw new Exception('Job not found or no changes made');
    }
    
    $stmt->close();

    // 5. Success Response
    sendResponse(true, 'Job status updated successfully');
    
} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>