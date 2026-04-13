<?php
// carelink_api/parent/post_job.php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
ob_start();
require_once '../dbcon.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) throw new Exception('Invalid JSON data');

    $required = ['parent_id', 'description', 'salary_offered', 'municipality'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            throw new Exception("Missing required field: $field");
        }
    }

    $parent_id = intval($data['parent_id']);
    $category_id = isset($data['category_id']) ? intval($data['category_id']) : null;
    $salary = floatval($data['salary_offered']);
    
    if ($salary < 6000) throw new Exception('Minimum salary is ₱6,000 as per PESO regulations.');

    $job_ids_json = json_encode(is_array($data['job_ids'] ?? null) ? $data['job_ids'] : []);
    $skill_ids_json = json_encode(is_array($data['skill_ids'] ?? null) ? $data['skill_ids'] : []);
    $days_off_json = json_encode(is_array($data['days_off'] ?? null) ? $data['days_off'] : []);

    $final_title = trim($data['title'] ?? '');
    $custom_job_title = trim($data['custom_job_title'] ?? '');
    
    if ($custom_job_title) {
        $final_title = $final_title ? "$final_title ($custom_job_title)" : $custom_job_title;
    }
    if (empty($final_title)) throw new Exception('Job title is required');

    $custom_category = trim($data['custom_category'] ?? '');
    if ($category_id == 6 && empty($custom_category)) {
        $custom_category = "Specialized Service " . rand(100, 999);
    }

    // Duplicate Check
    $dup_check = mysqli_prepare($conn, "SELECT job_post_id FROM job_posts WHERE parent_id = ? AND category_id = ? AND title = ? AND status IN ('Open', 'Pending')");
    mysqli_stmt_bind_param($dup_check, "iis", $parent_id, $category_id, $final_title);
    mysqli_stmt_execute($dup_check);
    mysqli_stmt_store_result($dup_check);
    if (mysqli_stmt_num_rows($dup_check) > 0) throw new Exception("You already have an active or pending job post for this role.");
    mysqli_stmt_close($dup_check);

    // Fallbacks
    $description = $data['description'] ?? '';
    $employment_type = $data['employment_type'] ?? 'Any';
    $work_schedule = $data['work_schedule'] ?? 'Any';
    $salary_period = $data['salary_period'] ?? 'Monthly';
    $benefits = strval($data['benefits'] ?? '');
    $province = $data['province'] ?? '';
    $municipality = $data['municipality'] ?? '';
    $barangay = $data['barangay'] ?? '';
    $preferred_religion = $data['preferred_religion'] ?? null;
    $preferred_language_id = isset($data['preferred_language_id']) ? intval($data['preferred_language_id']) : null;
    $require_police_clearance = !empty($data['require_police_clearance']) ? 1 : 0;
    $prefer_tesda_nc2 = !empty($data['prefer_tesda_nc2']) ? 1 : 0;
    $custom_skills = $data['custom_skills'] ?? '';
    $min_age = isset($data['min_age']) ? intval($data['min_age']) : null;
    $max_age = isset($data['max_age']) ? intval($data['max_age']) : null;
    $min_experience_years = isset($data['min_experience_years']) ? intval($data['min_experience_years']) : null;
    $start_date = $data['start_date'] ?? null;
    $work_hours = $data['work_hours'] ?? null;
    $contract_duration = $data['contract_duration'] ?? null;
    $probation_period = $data['probation_period'] ?? null;
    $provides_meals = !empty($data['provides_meals']) ? 1 : 0;
    $provides_accommodation = !empty($data['provides_accommodation']) ? 1 : 0;
    $provides_sss = !empty($data['provides_sss']) ? 1 : 0;
    $provides_philhealth = !empty($data['provides_philhealth']) ? 1 : 0;
    $provides_pagibig = !empty($data['provides_pagibig']) ? 1 : 0;
    $vacation_days = isset($data['vacation_days']) ? intval($data['vacation_days']) : 0;
    $sick_days = isset($data['sick_days']) ? intval($data['sick_days']) : 0;

    // EXACTLY matching the 35 columns in new.sql (NO custom_job_title!)
    $stmt = mysqli_prepare($conn, "
        INSERT INTO job_posts (
            parent_id, category_id, custom_category, job_ids, title,
            description, employment_type, work_schedule, salary_offered, salary_period, 
            benefits, province, municipality, barangay, preferred_religion, 
            preferred_language_id, require_police_clearance, prefer_tesda_nc2, skill_ids, 
            custom_skills, min_age, max_age, min_experience_years, start_date, 
            work_hours, days_off, contract_duration, probation_period, 
            provides_meals, provides_accommodation, provides_sss, 
            provides_philhealth, provides_pagibig, vacation_days, sick_days, 
            status, posted_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?, ?, 
            ?, ?, ?, ?, 
            'Pending', NOW() 
        )
    ");

    if (!$stmt) throw new Exception('Database Error: ' . mysqli_error($conn));

    $types = "iissssssdssssssiiissiiisssssiiiiiii";

    mysqli_stmt_bind_param(
        $stmt, $types,
        $parent_id, $category_id, $custom_category, $job_ids_json, $final_title,
        $description, $employment_type, $work_schedule, $salary, $salary_period, 
        $benefits, $province, $municipality, $barangay, $preferred_religion, 
        $preferred_language_id, $require_police_clearance, $prefer_tesda_nc2, $skill_ids_json, 
        $custom_skills, $min_age, $max_age, $min_experience_years, $start_date, 
        $work_hours, $days_off_json, $contract_duration, $probation_period, 
        $provides_meals, $provides_accommodation, $provides_sss, 
        $provides_philhealth, $provides_pagibig, $vacation_days, $sick_days
    );

    if (!mysqli_stmt_execute($stmt)) throw new Exception('Failed to post job: ' . mysqli_error($conn));

    sendResponse(true, 'Job submitted for PESO verification!', ['job_post_id' => mysqli_insert_id($conn)]);

} catch (Throwable $e) {
    sendResponse(false, $e->getMessage());
}
?>