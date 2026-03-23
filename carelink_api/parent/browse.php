<?php
// carelink_api/parent/browse.php

// 1. Force CORS headers to allow your React Native app to read this file
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle pre-flight checks from the browser
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// 2. FIXED PATH: Pointing exactly to your dbcon.php
require_once '../dbcon.php'; 

try {
    // Fetch approved helpers and their profiles
    $query = "
        SELECT 
            u.user_id, u.first_name, u.last_name,
            hp.profile_id, hp.profile_image, hp.birth_date, hp.gender,
            hp.experience_years, hp.employment_type, hp.work_schedule,
            hp.expected_salary, hp.municipality, hp.province,
            hp.verification_status, hp.availability_status,
            hp.rating_average, hp.rating_count, hp.bio
        FROM users u
        JOIN helper_profiles hp ON u.user_id = hp.user_id
        WHERE u.user_type = 'helper' AND u.status = 'approved'
    ";

    // Use $conn exposed by dbcon.php
    $result = $conn->query($query);

    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $helpers = [];

    while ($row = $result->fetch_assoc()) {
        // Calculate exact age dynamically from birth_date
        $age = null;
        if (!empty($row['birth_date'])) {
            try {
                $dob = new DateTime($row['birth_date']);
                $now = new DateTime();
                $age = $now->diff($dob)->y;
            } catch (Exception $e) {
                $age = null; // Fallback if date is somehow invalid
            }
        }

        $profile_id = (int)$row['profile_id'];

        // Fetch the Categories (e.g., Yaya, Cook) for this specific helper
        $jobs_query = "
            SELECT rc.category_id, rc.category_name 
            FROM helper_jobs hj
            JOIN ref_jobs rj ON hj.job_id = rj.job_id
            JOIN ref_categories rc ON rj.category_id = rc.category_id
            WHERE hj.profile_id = $profile_id
            GROUP BY rc.category_id, rc.category_name
        ";
        
        $jobs_result = $conn->query($jobs_query);
        $category_ids = [];
        $categories = [];
        
        if ($jobs_result) {
            while ($job = $jobs_result->fetch_assoc()) {
                $category_ids[] = (string)$job['category_id']; 
                $categories[] = $job['category_name'];
            }
        }

        // Build the JSON object exactly how your React app expects it
        $helpers[] = [
            'user_id' => (string)$row['user_id'],
            'profile_id' => (string)$row['profile_id'],
            'full_name' => trim($row['first_name'] . ' ' . $row['last_name']),
            'first_name' => $row['first_name'],
            'last_name' => $row['last_name'],
            'profile_image' => $row['profile_image'],
            'age' => $age,
            'gender' => $row['gender'],
            'category_ids' => $category_ids,
            'categories' => $categories,
            'experience_years' => (int)$row['experience_years'],
            'employment_type' => $row['employment_type'],
            'work_schedule' => $row['work_schedule'],
            'expected_salary' => (float)$row['expected_salary'],
            'municipality' => $row['municipality'],
            'province' => $row['province'],
            'verification_status' => $row['verification_status'],
            'availability_status' => $row['availability_status'],
            'rating_average' => (float)$row['rating_average'],
            'rating_count' => (int)$row['rating_count'],
            'bio' => $row['bio']
        ];
    }

    // Return the clean data to React Native
    echo json_encode([
        'success' => true,
        'helpers' => $helpers
    ]);

} catch (Exception $e) {
    // If anything fails, send a clean JSON error back to React instead of crashing
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>  