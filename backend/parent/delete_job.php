<?php
// carelink_api/parent/delete_job.php

// 1. Initialize Output Buffering
ob_start();

// 2. Standardized Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS"); // Match their method but add OPTIONS
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// 3. Handle CORS Pre-flight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 4. Error Logging Configuration
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

// 5. Database Connection (Your include)
include_once '../dbcon.php'; 

// 6. Your Standardized Response Function
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
    // 7. DB Check (Using your $conn variable)
    if (!$conn) {
        throw new Exception("Database connection failed: " . mysqli_connect_error());
    }

    // 8. Request Method Validation
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Invalid request method. POST required.");
    }

    // 9. Input Handling (Converted from JSON to your variable style)
    $input = json_decode(file_get_contents('php://input'), true);
    $job_post_id = isset($input['job_post_id']) ? intval($input['job_post_id']) : null;
    $parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : null;

    if (!$job_post_id || !$parent_id) {
        throw new Exception("Job ID and Parent ID are required");
    }
    
    error_log("=== DELETE JOB POST === Job ID: $job_post_id by Parent: $parent_id");

    // 10. Query 1: Ownership Verification (Converted to mysqli)
    $checkSql = "SELECT parent_id FROM job_posts WHERE job_post_id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $job_post_id);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    $job = $checkResult->fetch_assoc();
    $checkStmt->close();

    if (!$job) {
        throw new Exception("Job not found");
    }

    if (intval($job['parent_id']) !== $parent_id) {
        throw new Exception("Unauthorized: You do not own this job posting");
    }

    // 11. Transaction Management (mysqli style)
    $conn->begin_transaction();

    // 12. Query 2: Delete Applications
    $delAppSql = "DELETE FROM job_applications WHERE job_post_id = ?";
    $delAppStmt = $conn->prepare($delAppSql);
    $delAppStmt->bind_param("i", $job_post_id);
    $delAppStmt->execute();
    $delAppStmt->close();

    // 13. Query 3: Delete Job
    $delJobSql = "DELETE FROM job_posts WHERE job_post_id = ?";
    $delJobStmt = $conn->prepare($delJobSql);
    $delJobStmt->bind_param("i", $job_post_id);
    $delJobStmt->execute();

    if ($delJobStmt->affected_rows === 0) {
        throw new Exception("Failed to delete job");
    }
    $delJobStmt->close();

    // 14. Commit
    $conn->commit();

    // 15. Success Response
    sendResponse(true, "Job deleted successfully");

} catch (Exception $e) {
    // 16. Rollback on failure
    if (isset($conn) && $conn) {
        $conn->rollback();
    }
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

// 17. Cleanup
if (isset($conn) && $conn) {
    $conn->close();
}
?>