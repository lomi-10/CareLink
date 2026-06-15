<?php
// carelink_api/parent/update_application_status.php

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Error Logging & Production Settings
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

include_once '../dbcon.php';

// 2. Standardized Response Function
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

    // 3. Handle POST Input
    $input = json_decode(file_get_contents('php://input'), true);
    
    $application_id = isset($input['application_id']) ? intval($input['application_id']) : null;
    $new_status = $input['status'] ?? null;
    $parent_notes = $input['parent_notes'] ?? null;
    
    if (!$application_id || !$new_status) {
        throw new Exception('Application ID and status are required');
    }
    
    // 4. Server-side Validation
    $valid_statuses = ['Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled', 'Accepted', 'Rejected', 'Withdrawn', 'contract_pending', 'hired', 'auto_rejected'];
    if (!in_array($new_status, $valid_statuses)) {
        throw new Exception('Invalid status provided');
    }
    
    error_log("=== UPDATE APP STATUS === ID: $application_id to $new_status");

    // 5. mysqli Update Logic
    $sql = "UPDATE job_applications SET 
            status = ?,
            reviewed_at = NOW(),
            parent_notes = ?,
            updated_at = NOW()
            WHERE application_id = ?";
    
    $stmt = $conn->prepare($sql);
    // Bind parameters: s = string, s = string, i = integer
    $stmt->bind_param("ssi", $new_status, $parent_notes, $application_id);
    $stmt->execute();
    
    // 6. Check if any rows were actually changed
    if ($stmt->affected_rows === 0) {
        // This could mean the ID doesn't exist OR the status was already set to this value
        $stmt->close();
        throw new Exception('No changes made. Application may not exist or status is already current.');
    }
    
    $stmt->close();

    // Notify the helper about their application status change
    require_once '../shared/create_notification.php';
    $appRow = $conn->query(
        "SELECT ja.helper_id, jp.title AS job_title
         FROM job_applications ja
         JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
         WHERE ja.application_id = $application_id"
    )->fetch_assoc();
    if ($appRow) {
        $statusMessages = [
            'Reviewed'           => ['title' => 'Application Reviewed', 'msg' => 'The employer has reviewed your application for: ' . $appRow['job_title']],
            'Shortlisted'        => ['title' => 'You\'ve Been Shortlisted! 🌟', 'msg' => 'Great news! You are shortlisted for: ' . $appRow['job_title']],
            'Interview Scheduled'=> ['title' => 'Interview Scheduled', 'msg' => 'An interview has been scheduled for: ' . $appRow['job_title']],
            'Accepted'           => ['title' => 'Congratulations! You\'re Hired! 🎉', 'msg' => 'You have been accepted for the position: ' . $appRow['job_title']],
            'Rejected'           => ['title' => 'Application Update', 'msg' => 'The employer has decided to move forward with other candidates for: ' . $appRow['job_title']],
            'Withdrawn'          => ['title' => 'Application Withdrawn', 'msg' => 'Your application for ' . $appRow['job_title'] . ' has been withdrawn.'],
            'contract_pending'   => ['title' => 'Contract pending your signature', 'msg' => 'Please review and confirm the employment contract for: ' . $appRow['job_title']],
            'hired'              => ['title' => 'You are hired', 'msg' => 'Your contract is confirmed for: ' . $appRow['job_title']],
        ];
        if (isset($statusMessages[$new_status])) {
            createNotification(
                $conn,
                (int)$appRow['helper_id'],
                'status_changed',
                $statusMessages[$new_status]['title'],
                $statusMessages[$new_status]['msg'],
                'application',
                $application_id
            );
        }
    }

    // 7. Success Response
    sendResponse(true, 'Application status updated successfully');
    
} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>