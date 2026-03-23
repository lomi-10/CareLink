<?php

// carelink_api/parent/get_job_applications.php
// Get all applications for a specific job

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Your standard error settings
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';

// 2. Your response helper
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

    $job_post_id = isset($_GET['job_post_id']) ? intval($_GET['job_post_id']) : null;
   
    if (!$job_post_id) {
        throw new Exception('Job post ID is required');
    }
   
    $sql = "
        SELECT
            ja.*,
            u.first_name,
            u.middle_name,
            u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as helper_name,
            hp.profile_image as helper_photo,
            hp.gender as helper_gender,
            TIMESTAMPDIFF(YEAR, hp.birth_date, CURDATE()) as helper_age,
            hp.experience_years as helper_experience_years,
            hp.rating_average as helper_rating_average,
            hp.rating_count as helper_rating_count,
            hp.municipality as helper_municipality,
            hp.province as helper_province,
            GROUP_CONCAT(DISTINCT rc.category_name) as helper_categories
        FROM job_applications ja
        INNER JOIN users u ON ja.helper_id = u.user_id
        INNER JOIN helper_profiles hp ON u.user_id = hp.user_id
        LEFT JOIN helper_jobs hj ON hp.profile_id = hj.profile_id
        LEFT JOIN ref_categories rc ON hj.category_id = rc.category_id
        WHERE ja.job_post_id = ?
        GROUP BY ja.application_id
        ORDER BY
            CASE ja.status
                WHEN 'Shortlisted' THEN 1
                WHEN 'Pending' THEN 2
                WHEN 'Reviewed' THEN 3
                WHEN 'Accepted' THEN 4
                WHEN 'Rejected' THEN 5
            END,
            ja.applied_at DESC
    ";
   
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $job_post_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $applications = array(); // Initialize as an empty array
    
    // Loop through all rows
    while ($row = $result->fetch_assoc()) {
        // Convert categories to array inside the loop
        $row['helper_categories'] = $row['helper_categories'] 
            ? explode(',', $row['helper_categories']) 
            : [];
        
        $applications[] = $row;
    }
    $stmt->close();

    // Check if empty, but still return success (standard API practice)
    if (empty($applications)) {
        sendResponse(true, "No applications found", [
            'applications' => [], 
            'total_count' => 0
        ]);
    }

    // Send the full list
    sendResponse(true, "Applications retrieved successfully", [
        'applications' => $applications, 
        'total_count' => count($applications)
    ]);
    
} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>