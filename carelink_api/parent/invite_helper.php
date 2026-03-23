<?php
// carelink_api/parent/invite_helper.php
// Invite a helper to apply to a specific job
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once '../config/database.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $helper_id = $input['helper_id'] ?? null;
    $job_post_id = $input['job_post_id'] ?? null;
    $parent_id = $input['parent_id'] ?? null;
    $message = $input['message'] ?? null;
    
    if (!$helper_id || !$job_post_id || !$parent_id) {
        throw new Exception('Missing required fields');
    }
    
    $conn = getDatabaseConnection();
    
    // Check if helper already applied
    $checkSql = "SELECT application_id FROM job_applications 
                 WHERE job_post_id = :job_post_id AND helper_id = :helper_id";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bindParam(':job_post_id', $job_post_id);
    $checkStmt->bindParam(':helper_id', $helper_id);
    $checkStmt->execute();
    
    if ($checkStmt->fetch()) {
        throw new Exception('Helper has already applied to this job');
    }
    
    // TODO: Create invitation record in your invitations table
    // For now, we'll send a notification (implement your notification system)
    
    $sql = "INSERT INTO job_invitations (
            parent_id, helper_id, job_post_id, message, status, sent_at
            ) VALUES (
            :parent_id, :helper_id, :job_post_id, :message, 'Sent', NOW()
            )";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':parent_id', $parent_id);
    $stmt->bindParam(':helper_id', $helper_id);
    $stmt->bindParam(':job_post_id', $job_post_id);
    $stmt->bindParam(':message', $message);
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Invitation sent successfully'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>