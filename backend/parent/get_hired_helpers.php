<?php
// Get all hired helpers for a parent
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/database.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

try {
    $parent_id = $_GET['parent_id'] ?? null;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;

    if (!$parent_id) {
        throw new Exception('Parent ID is required');
    }
    carelink_require_self($requester_id, (int) $parent_id, 'You are not allowed to view these helpers.');

    $conn = getDatabaseConnection();
    
    $sql = "
        SELECT 
            p.*,
            jp.title as job_title,
            jp.employment_type,
            jp.salary_offered,
            jp.salary_period,
            u.first_name,
            u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as helper_name,
            hp.profile_image,
            hp.contact_number,
            hp.rating_average,
            hp.rating_count,
            GROUP_CONCAT(DISTINCT rc.category_name) as categories
        FROM placements p
        INNER JOIN job_posts jp ON p.job_post_id = jp.job_post_id
        INNER JOIN users u ON p.helper_id = u.user_id
        INNER JOIN helper_profiles hp ON u.user_id = hp.user_id
        LEFT JOIN helper_jobs hj ON hp.profile_id = hj.profile_id
        LEFT JOIN ref_categories rc ON hj.category_id = rc.category_id
        WHERE p.parent_id = :parent_id
        AND p.status = 'Active'
        GROUP BY p.placement_id
        ORDER BY p.start_date DESC
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':parent_id', $parent_id);
    $stmt->execute();
    
    $helpers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert categories to array
    foreach ($helpers as &$helper) {
        $helper['categories'] = $helper['categories'] 
            ? explode(',', $helper['categories']) 
            : [];
    }
    
    echo json_encode([
        'success' => true,
        'helpers' => $helpers,
        'total_count' => count($helpers)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>