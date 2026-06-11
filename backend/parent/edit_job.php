<?php
// carelink_api/parent/edit_job.php

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
    if (empty($data['job_post_id']) || empty($data['parent_id'])) {
        throw new Exception('Job Post ID and Parent ID are required');
    }

    $job_post_id = intval($data['job_post_id']);
    $parent_id = intval($data['parent_id']);
    $category_id = isset($data['category_id']) ? intval($data['category_id']) : null;
    $salary_min = isset($data['salary_min']) ? floatval($data['salary_min']) : (isset($data['salary_offered']) ? floatval($data['salary_offered']) : 0);
    $salary_max = isset($data['salary_max']) && $data['salary_max'] !== null ? floatval($data['salary_max']) : null;
    $salary = $salary_min;

    if ($salary < 7000) throw new Exception('Minimum salary is ₱7,000 as required by RA 10361 (Kasambahay Law).');

    $job_ids_json = json_encode(is_array($data['job_ids'] ?? null) ? $data['job_ids'] : []);
    $skill_ids_json = json_encode(is_array($data['skill_ids'] ?? null) ? $data['skill_ids'] : []);
    $days_off_json = json_encode(is_array($data['days_off'] ?? null) ? $data['days_off'] : []);

    $raw_title = trim($data['title'] ?? '');
    $custom_job_title = trim($data['custom_job_title'] ?? '');
    $final_title = $raw_title;
    if ($custom_job_title) {
        $final_title = $raw_title ? "$raw_title ($custom_job_title)" : $custom_job_title;
    }

    // Duplicate Check
    $dup_check = mysqli_prepare($conn, "SELECT job_post_id FROM job_posts WHERE parent_id = ? AND category_id = ? AND title = ? AND status IN ('Open', 'Pending') AND job_post_id != ?");
    mysqli_stmt_bind_param($dup_check, "iisi", $parent_id, $category_id, $final_title, $job_post_id);
    mysqli_stmt_execute($dup_check);
    mysqli_stmt_store_result($dup_check);
    if (mysqli_stmt_num_rows($dup_check) > 0) throw new Exception("You already have an active or pending job post for this exact role.");
    mysqli_stmt_close($dup_check);

    $custom_category = trim($data['custom_category'] ?? '');
    if ($category_id == 6 && empty($custom_category)) $custom_category = "Specialized Service " . rand(100, 999);

    $description = $data['description'] ?? '';
    $employment_type = $data['employment_type'] ?? 'Any';
    $work_schedule = $data['work_schedule'] ?? 'Any';
    $salary_period = $data['salary_period'] ?? 'Monthly';
    $province = $data['province'] ?? '';
    $municipality = $data['municipality'] ?? '';
    $barangay = $data['barangay'] ?? '';
    $min_age = isset($data['min_age']) ? intval($data['min_age']) : null;
    $max_age = isset($data['max_age']) ? intval($data['max_age']) : null;
    $min_experience_years = isset($data['min_experience_years']) ? intval($data['min_experience_years']) : null;
    $start_date = $data['start_date'] ?? null;
    $work_hours = $data['work_hours'] ?? null;
    $contract_duration = $data['contract_duration'] ?? null;
    $benefits = strval($data['benefits'] ?? '');
    $custom_skills = trim($data['custom_skills'] ?? '');
    $provides_meals = !empty($data['provides_meals']) ? 1 : 0;
    $provides_accommodation = !empty($data['provides_accommodation']) ? 1 : 0;
    $provides_sss = !empty($data['provides_sss']) ? 1 : 0;
    $provides_philhealth = !empty($data['provides_philhealth']) ? 1 : 0;
    $provides_pagibig = !empty($data['provides_pagibig']) ? 1 : 0;
    $vacation_days = isset($data['vacation_days']) ? intval($data['vacation_days']) : 0;
    $sick_days = isset($data['sick_days']) ? intval($data['sick_days']) : 0;
    $preferred_religion = $data['preferred_religion'] ?? null;
    $preferred_language_id = isset($data['preferred_language_id']) ? intval($data['preferred_language_id']) : null;
    $require_police_clearance = !empty($data['require_police_clearance']) ? 1 : 0;
    $prefer_tesda_nc2 = !empty($data['prefer_tesda_nc2']) ? 1 : 0;

    $stmt = mysqli_prepare($conn, "
        UPDATE job_posts SET
            category_id = ?, custom_category = ?, job_ids = ?, skill_ids = ?,
            title = ?, description = ?, employment_type = ?,
            work_schedule = ?, salary_offered = ?, salary_min = ?, salary_max = ?, salary_period = ?, province = ?,
            municipality = ?, barangay = ?, min_age = ?, max_age = ?,
            min_experience_years = ?, start_date = ?, work_hours = ?, days_off = ?,
            contract_duration = ?, benefits = ?, custom_skills = ?,
            provides_meals = ?, provides_accommodation = ?, provides_sss = ?, provides_philhealth = ?,
            provides_pagibig = ?, vacation_days = ?, sick_days = ?, preferred_religion = ?,
            preferred_language_id = ?, require_police_clearance = ?, prefer_tesda_nc2 = ?,
            status = 'Pending', updated_at = NOW()
            WHERE job_post_id = ? AND parent_id = ?
    ");

    if (!$stmt) throw new Exception('Database Error: ' . mysqli_error($conn));

    $types = "isssssssdddssssiiissssssiiiiiiisiiiii";

    mysqli_stmt_bind_param(
        $stmt, $types,
        $category_id, $custom_category, $job_ids_json, $skill_ids_json,
        $final_title, $description, $employment_type,
        $work_schedule, $salary, $salary_min, $salary_max, $salary_period, $province,
        $municipality, $barangay, $min_age, $max_age,
        $min_experience_years, $start_date, $work_hours, $days_off_json,
        $contract_duration, $benefits, $custom_skills,
        $provides_meals, $provides_accommodation, $provides_sss, $provides_philhealth,
        $provides_pagibig, $vacation_days, $sick_days, $preferred_religion,
        $preferred_language_id, $require_police_clearance, $prefer_tesda_nc2,
        $job_post_id, $parent_id
    );

    if (!mysqli_stmt_execute($stmt)) throw new Exception('Failed to update job: ' . mysqli_error($conn));
    
    sendResponse(true, 'Job updated and submitted for PESO verification!');
    
} catch (Throwable $e) { 
    sendResponse(false, $e->getMessage());
}
?>
