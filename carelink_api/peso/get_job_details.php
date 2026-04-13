<?php
// carelink_api/peso/get_job_details.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
require_once '../dbcon.php';

try {
    if (!isset($_GET['job_post_id'])) throw new Exception("Job Post ID required");
    $job_id = intval($_GET['job_post_id']);

    // Fetch full job details + parent name + category name
    $sql = "SELECT j.*, CONCAT(u.first_name, ' ', u.last_name) AS parent_name, c.category_name 
            FROM job_posts j 
            JOIN users u ON j.parent_id = u.user_id 
            LEFT JOIN ref_categories c ON j.category_id = c.category_id 
            WHERE j.job_post_id = ?";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $job_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'data' => $row]);
    } else {
        throw new Exception("Job not found.");
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>