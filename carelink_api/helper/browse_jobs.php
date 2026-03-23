<?php
// helper/browse_jobs.php
// Fetch open job postings with advanced match scoring for helpers

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../dbcon.php';

$helper_id = isset($_GET['helper_id']) ? intval($_GET['helper_id']) : 0;

if ($helper_id === 0) {
    echo json_encode(['success' => false, 'message' => 'Helper ID is required']);
    exit;
}

try {
    // 1. Fetch Helper Profile & Location
    $helper_stmt = $conn->prepare("
        SELECT 
            hp.*, 
            u.latitude, u.longitude
        FROM helper_profiles hp
        JOIN users u ON hp.user_id = u.user_id
        WHERE hp.user_id = ?
    ");
    $helper_stmt->bind_param("i", $helper_id);
    $helper_stmt->execute();
    $helper = $helper_stmt->get_result()->fetch_assoc();

    if (!$helper) {
        throw new Exception('Helper profile not found');
    }

    // 2. Fetch Helper's Categories (Corrected to use helper_jobs)
    $helper_categories = [];
    $cat_stmt = $conn->prepare("
        SELECT rc.category_id 
        FROM helper_jobs hj
        JOIN ref_jobs rj ON hj.job_id = rj.job_id
        JOIN ref_categories rc ON rj.category_id = rc.category_id
        WHERE hj.profile_id = ?
    ");
    $cat_stmt->bind_param("i", $helper['profile_id']);
    $cat_stmt->execute();
    $cat_res = $cat_stmt->get_result();
    while ($row = $cat_res->fetch_assoc()) {
        $helper_categories[] = (string)$row['category_id'];
    }

    // 3. Pre-fetch Reference Data (Fixes the N+1 slow query problem)
    $categories_ref = [];
    $res = $conn->query("SELECT category_id, category_name FROM ref_categories");
    if ($res) while ($row = $res->fetch_assoc()) $categories_ref[$row['category_id']] = $row['category_name'];

    $jobs_ref = [];
    $res = $conn->query("SELECT job_id, job_title FROM ref_jobs");
    if ($res) while ($row = $res->fetch_assoc()) $jobs_ref[$row['job_id']] = $row['job_title'];

    $skills_ref = [];
    $res = $conn->query("SELECT skill_id, skill_name FROM ref_skills");
    if ($res) while ($row = $res->fetch_assoc()) $skills_ref[$row['skill_id']] = $row['skill_name'];

    // 4. Fetch All Open Jobs
    $jobs_stmt = $conn->prepare("
        SELECT 
            jp.*,
            u.first_name, u.last_name, u.status as parent_account_status,
            u.latitude as parent_lat, u.longitude as parent_lng,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id AND helper_id = ?) as already_applied
        FROM job_posts jp
        JOIN users u ON jp.parent_id = u.user_id
        WHERE jp.status = 'Open'
        ORDER BY jp.created_at DESC
    ");
    $jobs_stmt->bind_param("i", $helper_id);
    $jobs_stmt->execute();
    $jobs_result = $jobs_stmt->get_result();

    $jobs = [];
    
    while ($job = $jobs_result->fetch_assoc()) {
        // Skip if already applied
        if ($job['already_applied'] > 0) continue;

        // Decode JSON Arrays Safely
        $category_ids = json_decode($job['category_ids'], true) ?: [];
        $job_ids = json_decode($job['job_ids'], true) ?: [];
        $skill_ids = json_decode($job['skill_ids'], true) ?: []; // FIXED SYNTAX ERROR
        $days_off = json_decode($job['days_off'], true) ?: [];

        // Map IDs to Names instantly using arrays
        $cat_names = array_values(array_filter(array_map(function($id) use ($categories_ref) { return $categories_ref[$id] ?? null; }, $category_ids)));
        $job_names = array_values(array_filter(array_map(function($id) use ($jobs_ref) { return $jobs_ref[$id] ?? null; }, $job_ids)));
        $skill_names = array_values(array_filter(array_map(function($id) use ($skills_ref) { return $skills_ref[$id] ?? null; }, $skill_ids)));

        // Calculate Haversine Distance
        $distance = null;
        if (!empty($helper['latitude']) && !empty($helper['longitude']) && !empty($job['parent_lat']) && !empty($job['parent_lng'])) {
            $earth_radius = 6371; // km
            $lat1 = deg2rad($helper['latitude']);
            $lon1 = deg2rad($helper['longitude']);
            $lat2 = deg2rad($job['parent_lat']);
            $lon2 = deg2rad($job['parent_lng']);
            
            $dlat = $lat2 - $lat1;
            $dlon = $lon2 - $lon1;
            
            $a = sin($dlat/2) * sin($dlat/2) + cos($lat1) * cos($lat2) * sin($dlon/2) * sin($dlon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = round($earth_radius * $c, 1);
        }

        // --- MATCH SCORING LOGIC ---
        $match_score = 0;
        $match_reasons = [];

        // Category match (+30 points)
        foreach ($category_ids as $cat_id) {
            if (in_array((string)$cat_id, $helper_categories)) {
                $match_score += 30;
                $match_reasons[] = "Category matches";
                break;
            }
        }

        // Location proximity (+25 points)
        if ($distance !== null) {
            if ($distance <= 5) {
                $match_score += 25;
                $match_reasons[] = "Very close location (< 5km)";
            } elseif ($distance <= 10) {
                $match_score += 15;
                $match_reasons[] = "Location nearby";
            } elseif ($distance <= 20) {
                $match_score += 10;
            }
        }

        // Salary match (+20 points)
        $monthly_salary = $job['salary_period'] === 'Daily' ? $job['salary_offered'] * 26 : $job['salary_offered'];
        $helper_expected = (float)$helper['expected_salary'];
        
        if ($helper_expected > 0 && $monthly_salary >= ($helper_expected * 0.8)) { // Allows 20% negotiation leeway
            $match_score += 20;
            $match_reasons[] = "Salary in range";
        }

        // Work schedule match (+15 points)
        if ($job['work_schedule'] === 'Any' || $helper['work_schedule'] === $job['work_schedule']) {
            $match_score += 15;
        }

        // Experience requirement (+10 points)
        if (!empty($job['min_experience_years'])) {
            if ($helper['experience_years'] >= $job['min_experience_years']) {
                $match_score += 10;
                $match_reasons[] = "Meets experience requirement";
            }
        } else {
            $match_score += 10; // No requirement = automatic points
        }

        // Build Final Job Object
        $jobs[] = [
            'job_post_id' => (string)$job['job_post_id'],
            'parent_id' => (string)$job['parent_id'],
            'title' => $job['title'],
            'description' => $job['description'],
            'employment_type' => $job['employment_type'],
            'work_schedule' => $job['work_schedule'],
            'salary_offered' => (float)$job['salary_offered'],
            'salary_period' => $job['salary_period'],
            'province' => $job['province'],
            'municipality' => $job['municipality'],
            'barangay' => $job['barangay'] ?? '',
            'distance' => $distance,
            
            'category_ids' => $category_ids,
            'categories' => $cat_names,
            'job_ids' => $job_ids,
            'jobs' => $job_names,
            'skill_ids' => $skill_ids,
            'skills' => $skill_names,

            'min_age' => $job['min_age'] ? (int)$job['min_age'] : null,
            'max_age' => $job['max_age'] ? (int)$job['max_age'] : null,
            'min_experience_years' => $job['min_experience_years'] ? (int)$job['min_experience_years'] : null,
            'preferred_religion' => $job['preferred_religion'],
            'require_police_clearance' => (bool)$job['require_police_clearance'],
            'prefer_tesda_nc2' => (bool)$job['prefer_tesda_nc2'],

            'start_date' => $job['start_date'],
            'work_hours' => $job['work_hours'],
            'days_off' => $days_off,
            'contract_duration' => $job['contract_duration'],
            'probation_period' => $job['probation_period'],

            'provides_meals' => (bool)$job['provides_meals'],
            'provides_accommodation' => (bool)$job['provides_accommodation'],
            'provides_sss' => (bool)$job['provides_sss'],
            'provides_philhealth' => (bool)$job['provides_philhealth'],
            'provides_pagibig' => (bool)$job['provides_pagibig'],
            
            'status' => $job['status'],
            'posted_at' => date("F j, Y", strtotime($job['created_at'])), // Basic fallback format, React Native handles 'time ago' easily
            'parent_name' => trim($job['first_name'] . ' ' . $job['last_name']) . " Family",
            'parent_verified' => ($job['parent_account_status'] === 'approved'),
            
            'match_score' => min(100, $match_score), // Cap at 100%
            'match_reasons' => $match_reasons,
        ];
    }

    echo json_encode([
        'success' => true,
        'jobs' => $jobs,
        'total' => count($jobs)
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>