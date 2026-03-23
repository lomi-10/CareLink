<?php
// carelink_api/parent/get_job_details.php
// FIXED: Converted to strictly use MySQLi instead of PDO

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Use your actual dbcon file here
require_once '../dbcon.php'; 

try {
    $job_post_id = $_GET['job_post_id'] ?? null;
    
    if (!$job_post_id) {
        throw new Exception('Job post ID is required');
    }
    
    // MySQLi query using ? for the parameter
    $sql = "
        SELECT 
            jp.*,
            rl.language_name as preferred_language_name,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id) as application_count,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id AND status = 'Pending') as new_application_count
        FROM job_posts jp
        LEFT JOIN ref_languages rl ON jp.preferred_language_id = rl.language_id
        WHERE jp.job_post_id = ?
    ";
    
    // Assuming your dbcon.php exposes a variable named $conn
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Query preparation failed: " . $conn->error);
    }

    // Bind the parameter ("s" means string. It works safely for both UUIDs and Integers)
    $stmt->bind_param("s", $job_post_id);
    $stmt->execute();
    
    // Get the result using MySQLi
    $result = $stmt->get_result();
    $job = $result->fetch_assoc();
    
    if (!$job) {
        throw new Exception('Job not found');
    }
    
    // Decode JSON strings back into arrays for React Native
    $json_fields = ['category_ids', 'job_ids', 'skill_ids', 'days_off'];
    foreach ($json_fields as $field) {
        if (isset($job[$field]) && !empty($job[$field])) {
            $decoded = json_decode($job[$field], true);
            $job[$field] = is_array($decoded) ? $decoded : [];
        } else {
            $job[$field] = [];
        }
    }
    
    // Convert DB integers to booleans for the React Native form switches
    $bool_fields = [
        'provides_meals', 'provides_accommodation', 'provides_sss', 
        'provides_philhealth', 'provides_pagibig', 
        'require_police_clearance', 'prefer_tesda_nc2'
    ];
    foreach ($bool_fields as $field) {
        if (isset($job[$field])) {
            $job[$field] = (bool)$job[$field];
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