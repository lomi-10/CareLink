<?php
// carelink_api/parent/hire_helper.php

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS"); // Changed to POST
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';

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
    
    $application_id = isset($input['application_id']) ? intval($input['application_id']) : null;
    $job_post_id = isset($input['job_post_id']) ? intval($input['job_post_id']) : null;
    $parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : null;
    $helper_id = isset($input['helper_id']) ? intval($input['helper_id']) : null;
    
    if (!$application_id || !$job_post_id || !$parent_id || !$helper_id) {
        throw new Exception('Missing required fields');
    }
    
    // Start transaction - mysqli style
    $conn->begin_transaction();
    
    // 1. Get job details
    $jobSql = "SELECT employment_type, work_schedule, salary_offered, salary_period 
               FROM job_posts WHERE job_post_id = ?";
    $jobStmt = $conn->prepare($jobSql);
    $jobStmt->bind_param('i', $job_post_id);
    $jobStmt->execute();
    $result = $jobStmt->get_result();
    $jobDetails = $result->fetch_assoc();
    $jobStmt->close();    

    if (!$jobDetails) {
        throw new Exception('Job not found');
    }
    
    // 2. Update application status
    $sql1 = "UPDATE job_applications SET status = 'Accepted', reviewed_at = NOW(), updated_at = NOW() 
             WHERE application_id = ?";
    $stmt1 = $conn->prepare($sql1);
    $stmt1->bind_param('i', $application_id);
    $stmt1->execute();
    
    // Note: mysqli uses affected_rows (property, not a function)
    if ($stmt1->affected_rows === 0) {
        $stmt1->close();
        throw new Exception('Application not found or already accepted');
    }
    $stmt1->close();
    
    // 3. Mark job as Filled
    $sql2 = "UPDATE job_posts SET status = 'Filled', filled_at = NOW() WHERE job_post_id = ?";
    $stmt2 = $conn->prepare($sql2);
    $stmt2->bind_param('i', $job_post_id);
    $stmt2->execute();
    $stmt2->close();
    
    // 4. Create placement record
    // Adjusted bind_param types: iiiiisss (5 integers, 3 strings)
    $sql3 = "INSERT INTO placements (application_id, parent_id, helper_id, job_post_id, employment_type, work_schedule, agreed_salary, salary_period, start_date, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Active', NOW())";
    $stmt3 = $conn->prepare($sql3);
    $stmt3->bind_param('iiiissss', 
        $application_id, 
        $parent_id, 
        $helper_id, 
        $job_post_id, 
        $jobDetails['employment_type'], 
        $jobDetails['work_schedule'], 
        $jobDetails['salary_offered'], 
        $jobDetails['salary_period']
    );
    $stmt3->execute();
    $stmt3->close();
    
    // 5. Reject others
    $sql4 = "UPDATE job_applications SET status = 'Rejected', parent_notes = 'Position has been filled', updated_at = NOW() 
             WHERE job_post_id = ? AND application_id != ? AND status NOT IN ('Accepted', 'Rejected')";
    $stmt4 = $conn->prepare($sql4);
    $stmt4->bind_param('ii', $job_post_id, $application_id);
    $stmt4->execute();
    $stmt4->close();
    
    $conn->commit();
    
    // Use your sendResponse instead of raw echo json_encode
    sendResponse(true, 'Helper hired successfully');
    
} catch (Exception $e) {
    if (isset($conn)) { $conn->rollback(); }
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>