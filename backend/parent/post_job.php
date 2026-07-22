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
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/job_title.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

try {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) throw new Exception('Invalid JSON data');

    $required = ['parent_id', 'description', 'municipality'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            throw new Exception("Missing required field: $field");
        }
    }

    $parent_id = intval($data['parent_id']);
    $requester_id = isset($data['requester_id']) ? intval($data['requester_id']) : 0;
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to post jobs for this employer account.');
    $category_id = isset($data['category_id']) ? intval($data['category_id']) : null;
    $salary_min = isset($data['salary_min']) ? floatval($data['salary_min']) : (isset($data['salary_offered']) ? floatval($data['salary_offered']) : 0);
    $salary_max = isset($data['salary_max']) && $data['salary_max'] !== null ? floatval($data['salary_max']) : null;
    $salary = $salary_min; // backward compat: salary_offered = salary_min

    // ₱7,000 is a CareLink platform standard to promote fair compensation — it is
    // set above the actual Region VIII kasambahay minimum wage (Wage Order
    // VIII-DW-06: ₱6,400/mo for chartered cities & 1st-class municipalities,
    // ₱5,800/mo elsewhere). RA 10361 establishes that minimum wages are set by
    // regional wage boards; it does not itself mandate this specific figure.
    if ($salary < 7000) throw new Exception('CareLink enforces a minimum salary of ₱7,000/month as a platform standard to promote fair compensation.');

    $job_ids_json = json_encode(is_array($data['job_ids'] ?? null) ? $data['job_ids'] : []);
    $skill_ids_json = json_encode(is_array($data['skill_ids'] ?? null) ? $data['skill_ids'] : []);
    $days_off_json = json_encode(is_array($data['days_off'] ?? null) ? $data['days_off'] : []);

    $final_title = trim($data['title'] ?? '');
    $custom_job_title = trim($data['custom_job_title'] ?? '');

    // A parent's custom title REPLACES the generated one (it used to be appended in
    // parentheses, which made titles longer instead of clearer). With no custom
    // title, rebuild server-side from the category + selected roles so the stored
    // title is concise regardless of what the client sent.
    if ($custom_job_title !== '') {
        $final_title = $custom_job_title;
    } else {
        $cat_name = '';
        $cat_q = mysqli_prepare($conn, "SELECT category_name FROM ref_categories WHERE category_id = ?");
        mysqli_stmt_bind_param($cat_q, "i", $category_id);
        mysqli_stmt_execute($cat_q);
        mysqli_stmt_bind_result($cat_q, $cat_name_res);
        if (mysqli_stmt_fetch($cat_q)) $cat_name = (string) $cat_name_res;
        mysqli_stmt_close($cat_q);

        $role_names = carelink_role_names_for_job_ids($conn, $job_ids_json);
        $final_title = carelink_build_job_title($cat_name, $role_names, null);
    }
    if (empty($final_title)) throw new Exception('Job title is required');

    $custom_category = trim($data['custom_category'] ?? '');
    if ($category_id == 6 && empty($custom_category)) {
        $custom_category = "Specialized Service " . rand(100, 999);
    }

    // Duplicate Check — compare the actual ROLE SET, not the title. Titles are now
    // concise (3+ roles collapse to the category name), so matching on title would
    // wrongly block a parent from posting two genuinely different Cook jobs.
    // Sets are compared in PHP because stored job_ids JSON varies in order and type.
    $new_role_set = carelink_normalize_job_ids($job_ids_json);
    if (!empty($new_role_set)) {
        $dup_check = mysqli_prepare($conn, "SELECT job_ids FROM job_posts WHERE parent_id = ? AND category_id = ? AND status IN ('Open', 'Pending')");
        mysqli_stmt_bind_param($dup_check, "ii", $parent_id, $category_id);
        mysqli_stmt_execute($dup_check);
        $dup_res = mysqli_stmt_get_result($dup_check);
        while ($dup_res && ($dup_row = mysqli_fetch_assoc($dup_res))) {
            if (carelink_normalize_job_ids($dup_row['job_ids']) === $new_role_set) {
                mysqli_stmt_close($dup_check);
                throw new Exception("You already have an active or pending job post with exactly these roles.");
            }
        }
        mysqli_stmt_close($dup_check);
    }

    // Fallbacks
    $description = $data['description'] ?? '';
    $employment_type = $data['employment_type'] ?? 'Any';
    $work_schedule = $data['work_schedule'] ?? 'Any';
    // Payout schedule only — the salary amount above is always MONTHLY.
    // Whitelisted against the job_posts.salary_period enum: an unknown value would
    // otherwise trip MySQL strict mode with "Data truncated for column".
    $salary_period = $data['salary_period'] ?? 'Monthly';
    if (!in_array($salary_period, ['Daily', 'Weekly', 'Semi-monthly', 'Monthly'], true)) {
        $salary_period = 'Monthly';
    }
    $benefits = strval($data['benefits'] ?? '');
    $province = $data['province'] ?? '';
    $municipality = $data['municipality'] ?? '';
    $barangay = $data['barangay'] ?? '';
    $latitude  = isset($data['latitude'])  && $data['latitude']  !== null ? floatval($data['latitude'])  : null;
    $longitude = isset($data['longitude']) && $data['longitude'] !== null ? floatval($data['longitude']) : null;
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
    $provides_meals = !empty($data['provides_meals']) ? 1 : 0;
    $provides_accommodation = !empty($data['provides_accommodation']) ? 1 : 0;
    $provides_sss = !empty($data['provides_sss']) ? 1 : 0;
    $provides_philhealth = !empty($data['provides_philhealth']) ? 1 : 0;
    $provides_pagibig = !empty($data['provides_pagibig']) ? 1 : 0;
    $vacation_days = isset($data['vacation_days']) ? intval($data['vacation_days']) : 0;
    $sick_days = isset($data['sick_days']) ? intval($data['sick_days']) : 0;

    $stmt = mysqli_prepare($conn, "
        INSERT INTO job_posts (
            parent_id, category_id, custom_category, job_ids, title,
            description, employment_type, work_schedule, salary_offered, salary_min, salary_max, salary_period,
            benefits, province, municipality, barangay, latitude, longitude,
            preferred_religion, preferred_language_id, require_police_clearance, prefer_tesda_nc2,
            skill_ids, custom_skills, min_age, max_age, min_experience_years, start_date,
            work_hours, days_off, contract_duration,
            provides_meals, provides_accommodation, provides_sss,
            provides_philhealth, provides_pagibig, vacation_days, sick_days,
            status, posted_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            'Pending', NOW()
        )
    ");

    if (!$stmt) throw new Exception('Database Error: ' . mysqli_error($conn));

    $types = "iissssssdddsssssddsiiissiiissssiiiiiii";

    mysqli_stmt_bind_param(
        $stmt, $types,
        $parent_id, $category_id, $custom_category, $job_ids_json, $final_title,
        $description, $employment_type, $work_schedule, $salary, $salary_min, $salary_max, $salary_period,
        $benefits, $province, $municipality, $barangay, $latitude, $longitude,
        $preferred_religion, $preferred_language_id, $require_police_clearance, $prefer_tesda_nc2,
        $skill_ids_json, $custom_skills, $min_age, $max_age, $min_experience_years, $start_date,
        $work_hours, $days_off_json, $contract_duration,
        $provides_meals, $provides_accommodation, $provides_sss,
        $provides_philhealth, $provides_pagibig, $vacation_days, $sick_days
    );

    if (!mysqli_stmt_execute($stmt)) throw new Exception('Failed to post job: ' . mysqli_error($conn));

    $new_job_id = mysqli_insert_id($conn);
    mysqli_stmt_close($stmt);

    require_once __DIR__ . '/../shared/notify_peso_staff.php';
    notifyAllPesoStaff(
        $conn,
        'peso_queue_job',
        'New job post pending verification',
        'A parent submitted "' . $final_title . '" for PESO approval.',
        'job',
        $new_job_id
    );

    sendResponse(true, 'Job submitted for PESO verification!', ['job_post_id' => $new_job_id]);

} catch (Throwable $e) {
    sendResponse(false, $e->getMessage());
}
?>