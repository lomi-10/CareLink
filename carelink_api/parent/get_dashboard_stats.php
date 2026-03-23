<?php
// carelink_api/parent/get_dashboard_stats.php
// Get parent dashboard statistics
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/database.php';

try {
    $parent_id = $_GET['parent_id'] ?? null;
    
    if (!$parent_id) {
        throw new Exception('Parent ID is required');
    }
    
    $conn = getDatabaseConnection();
    
    // Posted jobs count
    $sql1 = "SELECT COUNT(*) as count FROM job_posts 
             WHERE parent_id = :parent_id AND status = 'Open'";
    $stmt1 = $conn->prepare($sql1);
    $stmt1->bindParam(':parent_id', $parent_id);
    $stmt1->execute();
    $posted_jobs = $stmt1->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Active applications (pending review)
    $sql2 = "SELECT COUNT(*) as count FROM job_applications ja
             INNER JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
             WHERE jp.parent_id = :parent_id 
             AND ja.status IN ('Pending', 'Reviewed', 'Shortlisted')";
    $stmt2 = $conn->prepare($sql2);
    $stmt2->bindParam(':parent_id', $parent_id);
    $stmt2->execute();
    $active_applications = $stmt2->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Messages count (if you have messages table)
    $messages = 0; // TODO: Implement when messages feature is built
    
    // Hired helpers count
    $sql4 = "SELECT COUNT(*) as count FROM placements 
             WHERE parent_id = :parent_id AND status = 'Active'";
    $stmt4 = $conn->prepare($sql4);
    $stmt4->bindParam(':parent_id', $parent_id);
    $stmt4->execute();
    $hired_helpers = $stmt4->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'posted_jobs' => (int)$posted_jobs,
            'active_applications' => (int)$active_applications,
            'messages' => (int)$messages,
            'hired_helpers' => (int)$hired_helpers
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>