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
ini_set('error_log', __DIR__ . '/../error.log');

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
    $valid_statuses = ['Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled', 'Accepted', 'Rejected', 'Withdrawn'];
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