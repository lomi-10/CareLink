<?php
// carelink_api/helper/save_job.php
// Save a job for later

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle pre-flight checks from the browser/app
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once '../dbcon.php';

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    $helper_id = isset($input['helper_id']) ? intval($input['helper_id']) : 0;
    $job_post_id = isset($input['job_post_id']) ? intval($input['job_post_id']) : 0;

    if ($helper_id <= 0 || $job_post_id <= 0) {
        throw new Exception('Helper ID and Job Post ID are required');
    }
    
    // 1. Check if already saved
    $checkStmt = $conn->prepare("
        SELECT saved_id FROM saved_jobs 
        WHERE helper_id = ? AND job_post_id = ?
    ");
    
    if (!$checkStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    // "ii" means two integers
    $checkStmt->bind_param("ii", $helper_id, $job_post_id);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Job already saved'
        ]);
        exit;
    }
    
    // 2. Save the job
    $insertStmt = $conn->prepare("
        INSERT INTO saved_jobs (helper_id, job_post_id, saved_at)
        VALUES (?, ?, NOW())
    ");
    
    if (!$insertStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $insertStmt->bind_param("ii", $helper_id, $job_post_id);
    
    if ($insertStmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Job saved successfully'
        ]);
    } else {
        throw new Exception("Failed to save job: " . $insertStmt->error);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>