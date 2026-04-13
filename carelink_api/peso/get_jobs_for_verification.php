<?php
// carelink_api/peso/get_jobs_for_verification.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php';

try {
    // FIXED: Concatenated first_name & last_name, joined with ref_categories instead of job_categories
    $sql = "
        SELECT 
            j.job_post_id, 
            j.title, 
            j.custom_category, 
            j.salary_offered, 
            j.salary_period, 
            j.status, 
            j.posted_at,
            CONCAT(u.first_name, ' ', u.last_name) AS parent_name, 
            c.category_name
        FROM job_posts j
        JOIN users u ON j.parent_id = u.user_id
        LEFT JOIN ref_categories c ON j.category_id = c.category_id
        ORDER BY j.posted_at DESC
    ";

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $jobs = [];
    while ($row = $result->fetch_assoc()) {
        $jobs[] = $row;
    }

    echo json_encode([
        'success' => true,
        'data' => $jobs
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>