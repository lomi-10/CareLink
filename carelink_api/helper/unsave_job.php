<?php
// carelink_api/helper/unsave_job.php
// Remove a saved job

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

    // Delete the saved job
    $deleteStmt = $conn->prepare("
        DELETE FROM saved_jobs 
        WHERE helper_id = ? AND job_post_id = ?
    ");

    if (!$deleteStmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    // "ii" binds the two integers safely to prevent SQL injection
    $deleteStmt->bind_param("ii", $helper_id, $job_post_id);

    if ($deleteStmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Job removed from saved'
        ]);
    } else {
        throw new Exception("Failed to remove saved job: " . $deleteStmt->error);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>