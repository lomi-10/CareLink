<?php
// carelink_api/parent/get_job_details.php
// API to fetch full details of a specific job post

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php'; 

try {
    $job_post_id = isset($_GET['job_post_id']) ? intval($_GET['job_post_id']) : null;
    
    if (!$job_post_id) {
        throw new Exception('Job post ID is required');
    }
    
    $sql = "
        SELECT 
            jp.*,
            rc.category_name,
            rl.language_name as preferred_language_name,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id) as application_count,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id AND status = 'Pending') as new_application_count
        FROM job_posts jp
        LEFT JOIN ref_categories rc ON jp.category_id = rc.category_id
        LEFT JOIN ref_languages rl ON jp.preferred_language_id = rl.language_id
        WHERE jp.job_post_id = ?
    ";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Query preparation failed: " . $conn->error);

    $stmt->bind_param("i", $job_post_id);
    $stmt->execute();
    
    $result = $stmt->get_result();
    $job = $result->fetch_assoc();
    
    if (!$job) throw new Exception('Job not found');
    
    // Data cleanup
    $job['job_post_id'] = intval($job['job_post_id']);
    $job['salary_offered'] = floatval($job['salary_offered']);
    
    // Decode JSON fields
    $json_fields = ['job_ids', 'skill_ids', 'days_off'];
    foreach ($json_fields as $field) {
        if (isset($job[$field]) && !empty($job[$field])) {
            $decoded = json_decode($job[$field], true);
            $job[$field] = is_array($decoded) ? $decoded : [];
        } else {
            $job[$field] = [];
        }
    }
    
    // Convert DB integers to booleans
    $bool_fields = [
        'provides_meals', 'provides_accommodation', 'provides_sss', 
        'provides_philhealth', 'provides_pagibig', 
        'require_police_clearance', 'prefer_tesda_nc2'
    ];
    foreach ($bool_fields as $field) {
        if (isset($job[$field])) {
            $job[$field] = (int)$job[$field] === 1;
        }
    }
    
    echo json_encode([
        'success' => true,
        'job' => $job
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
