<?php
// carelink_api/parent/post_job.php
// FIXED: Handles native JSON arrays and maps all 34 parameters perfectly

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error handling
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__DIR__) . '/error.log');

ob_start();

require_once '../dbcon.php';

function sendResponse($success, $message, $data = null) {
    ob_clean();
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        sendResponse(false, 'Invalid JSON data');
    }

    // Validate required fields
    $required = ['parent_id', 'description', 'salary_offered', 'municipality'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            sendResponse(false, "Missing required field: $field");
        }
    }

    // Arrays & Custom texts (React Native passes these as arrays directly)
    $category_ids = is_array($data['category_ids']) ? $data['category_ids'] : [];
    $job_ids = is_array($data['job_ids']) ? $data['job_ids'] : [];
    $custom_category = $data['custom_category'] ?? null;
    $custom_job_title = $data['custom_job_title'] ?? null;
    $title = trim($data['title'] ?? '');

    if (empty($category_ids) && !$custom_category) {
        sendResponse(false, 'Please select at least one category');
    }

    if (empty($job_ids) && !$custom_job_title && !$title) {
        sendResponse(false, 'Please select at least one job or provide a job title');
    }

    // Use the first category in the array as the primary category_id to satisfy the DB constraint
    $primary_category_id = !empty($category_ids) ? intval($category_ids[0]) : 1; 

    // Validate salary
    $salary = floatval($data['salary_offered']);
    if ($salary < 6000) {
        sendResponse(false, 'Minimum salary is ₱6,000 as per PESO requirements');
    }

    // Get parent_id
    $parent_id = intval($data['parent_id']);

    // Verify parent exists and is verified
    $stmt = mysqli_prepare($conn, "
        SELECT p.verification_status 
        FROM parent_profiles p 
        WHERE p.user_id = ?
    ");
    mysqli_stmt_bind_param($stmt, 'i', $parent_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $parent = mysqli_fetch_assoc($result);

    if (!$parent) {
        sendResponse(false, 'Parent profile not found');
    }

    if ($parent['verification_status'] !== 'Verified') {
        sendResponse(false, 'Your account must be verified before posting jobs');
    }

    // Encode arrays into JSON strings to store them safely in the DB
    $category_ids_json = json_encode($category_ids);
    $job_ids_json = json_encode($job_ids);
    $skill_ids_json = json_encode(is_array($data['skill_ids'] ?? null) ? $data['skill_ids'] : []);
    $days_off_json = json_encode(is_array($data['days_off'] ?? null) ? $data['days_off'] : []);

    // Prepare job post data
    $final_title = $title;
    if ($custom_job_title) {
        $final_title = $title ? "$title ($custom_job_title)" : $custom_job_title;
    }

    $description = trim($data['description']);
    $employment_type = $data['employment_type'] ?? 'Any';
    $work_schedule = $data['work_schedule'] ?? 'Any';
    $salary_period = $data['salary_period'] ?? 'Monthly';
    
    // Location
    $province = trim($data['province']);
    $municipality = trim($data['municipality']);
    $barangay = trim($data['barangay'] ?? '');
    
    // Age range
    $min_age = isset($data['min_age']) ? intval($data['min_age']) : null;
    $max_age = isset($data['max_age']) ? intval($data['max_age']) : null;
    
    // Experience
    $min_experience_years = isset($data['min_experience_years']) ? intval($data['min_experience_years']) : null;
    
    // Work schedule
    $start_date = $data['start_date'] ?? null;
    $work_hours = $data['work_hours'] ?? null;
    
    // Contract
    $contract_duration = $data['contract_duration'] ?? null;
    $probation_period = $data['probation_period'] ?? null;
    
    // Benefits
    $benefits = trim($data['benefits'] ?? '');
    $provides_meals = !empty($data['provides_meals']) ? 1 : 0;
    $provides_accommodation = !empty($data['provides_accommodation']) ? 1 : 0;
    $provides_sss = !empty($data['provides_sss']) ? 1 : 0;
    $provides_philhealth = !empty($data['provides_philhealth']) ? 1 : 0;
    $provides_pagibig = !empty($data['provides_pagibig']) ? 1 : 0;
    $vacation_days = isset($data['vacation_days']) ? intval($data['vacation_days']) : 0;
    $sick_days = isset($data['sick_days']) ? intval($data['sick_days']) : 0;
    
    // Preferences
    $preferred_religion = $data['preferred_religion'] ?? null;
    $preferred_language_id = isset($data['preferred_language_id']) ? intval($data['preferred_language_id']) : null;
    
    // Requirements
    $require_police_clearance = !empty($data['require_police_clearance']) ? 1 : 0;
    $prefer_tesda_nc2 = !empty($data['prefer_tesda_nc2']) ? 1 : 0;

    // Insert job post
    $stmt = mysqli_prepare($conn, "
        INSERT INTO job_posts (
            parent_id, category_id, title, description, employment_type, work_schedule,
            salary_offered, salary_period, benefits, province, municipality, barangay,
            preferred_religion, preferred_language_id, require_police_clearance, prefer_tesda_nc2,
            status, posted_at, category_ids, job_ids, skill_ids, min_age, max_age,
            min_experience_years, start_date, work_hours, days_off, contract_duration,
            probation_period, provides_meals, provides_accommodation, provides_sss,
            provides_philhealth, provides_pagibig, vacation_days, sick_days
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
            'Open', NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    ");

    // Exact 34 parameter string perfectly matched
    mysqli_stmt_bind_param(
        $stmt,
        'iissssds' . 'sssssiii' . 'sssiiiss' . 'sssiiiii' . 'ii',
        $parent_id,
        $primary_category_id,
        $final_title,
        $description,
        $employment_type,
        $work_schedule,
        $salary,
        $salary_period,
        
        $benefits,
        $province,
        $municipality,
        $barangay,
        $preferred_religion,
        $preferred_language_id,
        $require_police_clearance,
        $prefer_tesda_nc2,
        
        $category_ids_json,
        $job_ids_json,
        $skill_ids_json,
        $min_age,
        $max_age,
        $min_experience_years,
        $start_date,
        $work_hours,
        
        $days_off_json,
        $contract_duration,
        $probation_period,
        $provides_meals,
        $provides_accommodation,
        $provides_sss,
        $provides_philhealth,
        $provides_pagibig,
        
        $vacation_days,
        $sick_days
    );

    if (!mysqli_stmt_execute($stmt)) {
        error_log('Job post insert error: ' . mysqli_error($conn));
        sendResponse(false, 'Failed to post job: ' . mysqli_error($conn));
    }

    $job_post_id = mysqli_insert_id($conn);

    sendResponse(true, 'Job posted successfully!', [
        'job_post_id' => $job_post_id
    ]);

} catch (Exception $e) {
    error_log('Job post error: ' . $e->getMessage());
    sendResponse(false, 'Server error: ' . $e->getMessage());
}
?>