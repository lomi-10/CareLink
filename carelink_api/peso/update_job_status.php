<?php
// carelink_api/peso/update_job_status.php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

// Catch preflight requests from React Native / Web
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php';

$input = json_decode(file_get_contents('php://input'), true);

try {
    if (!isset($input['job_post_id']) || !isset($input['status'])) {
        throw new Exception("Missing required fields.");
    }

    $job_id = intval($input['job_post_id']);
    $status = $input['status']; // 'Open' (Approved) or 'Rejected'

    $stmt = $conn->prepare("UPDATE job_posts SET status = ? WHERE job_post_id = ?");
    if (!$stmt) {
        throw new Exception("Database error: " . $conn->error);
    }

    $stmt->bind_param("si", $status, $job_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => "Job status updated to $status"]);
    } else {
        throw new Exception("Failed to update status: " . $stmt->error);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>