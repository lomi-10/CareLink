<?php
// carelink_api/helper/recommendations.php
// Get personalized job recommendations

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once '../dbcon.php'; 

try {
    $helper_id = isset($_GET['helper_id']) ? intval($_GET['helper_id']) : 0;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;

    if ($helper_id <= 0) {
        throw new Exception('Helper ID is required');
    }

    // 1. Get helper's profile and location
    $helperStmt = $conn->prepare("
        SELECT hp.*, u.province, u.municipality, u.latitude, u.longitude
        FROM helper_profiles hp
        JOIN users u ON hp.user_id = u.user_id
        WHERE hp.user_id = ?
    ");
    $helperStmt->bind_param("i", $helper_id);
    $helperStmt->execute();
    $helper = $helperStmt->get_result()->fetch_assoc();
    
    if (!$helper) {
        throw new Exception('Helper profile not found');
    }

    // 2. Get helper's categories and skills 
    $helperCats = [];
    $catStmt = $conn->prepare("
        SELECT rc.category_id 
        FROM helper_jobs hj
        JOIN ref_jobs rj ON hj.job_id = rj.job_id
        JOIN ref_categories rc ON rj.category_id = rc.category_id
        WHERE hj.profile_id = ?
    ");
    $catStmt->bind_param("i", $helper['profile_id']);
    $catStmt->execute();
    $catRes = $catStmt->get_result();
    while ($row = $catRes->fetch_assoc()) {
        $helperCats[] = (string)$row['category_id'];
    }

    $helperSkills = [];
    $skillStmt = $conn->prepare("SELECT skill_id FROM helper_skills WHERE profile_id = ?");
    if ($skillStmt) {
        $skillStmt->bind_param("i", $helper['profile_id']);
        $skillStmt->execute();
        $skillRes = $skillStmt->get_result();
        while ($row = $skillRes->fetch_assoc()) {
            $helperSkills[] = (string)$row['skill_id'];
        }
    }

    // 3. Pre-fetch Reference Data
    $categories_ref = [];
    $res = $conn->query("SELECT category_id, category_name as name FROM ref_categories");
    if ($res) while ($row = $res->fetch_assoc()) $categories_ref[$row['category_id']] = $row['name'];

    $jobs_ref = [];
    $res = $conn->query("SELECT job_id, job_title as name FROM ref_jobs");
    if ($res) while ($row = $res->fetch_assoc()) $jobs_ref[$row['job_id']] = $row['name'];

    $skills_ref = [];
    $res = $conn->query("SELECT skill_id, skill_name as name FROM ref_skills");
    if ($res) while ($row = $res->fetch_assoc()) $skills_ref[$row['skill_id']] = $row['name'];

    // 4. Main query - Get jobs the helper HAS NOT applied to yet
    $jobQuery = "
        SELECT 
            jp.*,
            u.first_name as parent_first_name,
            u.last_name as parent_last_name,
            u.province as parent_province,
            u.municipality as parent_municipality,
            u.status as parent_account_status,
            u.latitude as parent_lat,
            u.longitude as parent_lng,
            COALESCE(pr.rating, 0) as parent_rating,
            CASE WHEN sj.saved_id IS NOT NULL THEN 1 ELSE 0 END as is_saved
        FROM job_posts jp
        JOIN users u ON jp.parent_id = u.user_id
        LEFT JOIN (
            SELECT ratee_id, AVG(overall_rating) as rating
            FROM ratings
            GROUP BY ratee_id
        ) pr ON jp.parent_id = pr.ratee_id
        LEFT JOIN saved_jobs sj ON jp.job_post_id = sj.job_post_id AND sj.helper_id = ?
        LEFT JOIN job_applications ja ON jp.job_post_id = ja.job_post_id AND ja.helper_id = ?
        WHERE jp.status = 'Open'
        AND ja.application_id IS NULL
        ORDER BY jp.created_at DESC
    ";
    
    $stmt = $conn->prepare($jobQuery);
    // "ii" because we use the helper_id twice (once for saved_jobs, once for job_applications)
    $stmt->bind_param("ii", $helper_id, $helper_id);
    $stmt->execute();
    $jobsResult = $stmt->get_result();
    
    // 5. Process and score each job
    $processedJobs = [];
    while ($job = $jobsResult->fetch_assoc()) {
        
        // Decode JSON arrays safely
        $category_ids = json_decode($job['category_ids'], true) ?: [];
        $job_ids = json_decode($job['job_ids'], true) ?: [];
        $skill_ids = json_decode($job['skill_ids'], true) ?: [];
        $daysOff = json_decode($job['days_off'], true) ?: [];

        // Map IDs to Names
        $cat_names = array_values(array_filter(array_map(function($id) use ($categories_ref) { return $categories_ref[$id] ?? null; }, $category_ids)));
        $job_names = array_values(array_filter(array_map(function($id) use ($jobs_ref) { return $jobs_ref[$id] ?? null; }, $job_ids)));
        $skill_names = array_values(array_filter(array_map(function($id) use ($skills_ref) { return $skills_ref[$id] ?? null; }, $skill_ids)));

        // Match Scoring
        $matchScore = 0;
        $matchReasons = [];
        
        $categoryMatch = count(array_intersect($category_ids, $helperCats));
        if ($categoryMatch > 0) {
            $matchScore += 30;
            $matchReasons[] = "Category matches your profile";
        }
        
        $skillMatch = count(array_intersect($skill_ids, $helperSkills));
        if ($skillMatch > 0) {
            $matchScore += 20;
            $matchReasons[] = "Required skills match yours";
        }
        
        // Distance calculation
        $sameProvince = ($job['parent_province'] == $helper['province']);
        $sameMunicipality = ($job['parent_municipality'] == $helper['municipality']);
        
        $distance = 0;
        if (!empty($helper['latitude']) && !empty($helper['longitude']) && !empty($job['parent_lat']) && !empty($job['parent_lng'])) {
            $earth_radius = 6371;
            $lat1 = deg2rad($helper['latitude']);
            $lon1 = deg2rad($helper['longitude']);
            $lat2 = deg2rad($job['parent_lat']);
            $lon2 = deg2rad($job['parent_lng']);
            $dlat = $lat2 - $lat1;
            $dlon = $lon2 - $lon1;
            $a = sin($dlat/2) * sin($dlat/2) + cos($lat1) * cos($lat2) * sin($dlon/2) * sin($dlon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = round($earth_radius * $c, 1);
            
            if ($distance <= 5) { $matchScore += 15; $matchReasons[] = "Very close location"; }
            elseif ($distance <= 20) { $matchScore += 10; $matchReasons[] = "Location nearby"; }
        } else {
            // Fallback
            if ($sameMunicipality) {
                $distance = rand(1, 5);
                $matchScore += 15;
                $matchReasons[] = "Very close to your location";
            } elseif ($sameProvince) {
                $distance = rand(10, 30);
                $matchScore += 10;
                $matchReasons[] = "Location nearby";
            } else {
                $distance = rand(50, 100); 
            }
        }
        
        // Salary match
        $monthlySalary = ($job['salary_period'] == 'Daily') ? $job['salary_offered'] * 26 : $job['salary_offered'];
        $helperExpectedSalary = $helper['expected_salary'] ?? 8000;
        
        if ($monthlySalary >= $helperExpectedSalary * 0.8 && $monthlySalary <= $helperExpectedSalary * 1.2) {
            $matchScore += 15;
            $matchReasons[] = "Salary in your range";
        } elseif ($monthlySalary > $helperExpectedSalary * 1.2) {
            $matchScore += 10;
            $matchReasons[] = "Salary above your range";
        }
        
        // Work schedule match
        $helperPreferredSchedule = $helper['work_schedule'] ?? 'any';
        if (strtolower($helperPreferredSchedule) == 'any' || strtolower($job['work_schedule']) == strtolower($helperPreferredSchedule)) {
            $matchScore += 10;
        }

        // New job bonus (+5 points if posted within the last 3 days)
        $postedDate = strtotime($job['created_at']);
        $now = time();
        $daysSincePosted = floor(($now - $postedDate) / (60 * 60 * 24));
        
        if ($daysSincePosted <= 3) {
            $matchScore += 5;
            $matchReasons[] = "Recently posted";
        }
        
        // Only include in recommendations if the score is somewhat relevant (e.g., > 10 points)
        if ($matchScore > 10) {
            $processedJobs[] = [
                'job_post_id' => (string)$job['job_post_id'],
                'parent_id' => (string)$job['parent_id'],
                'title' => $job['title'],
                'description' => $job['description'],
                'employment_type' => $job['employment_type'],
                'work_schedule' => $job['work_schedule'],
                'salary_offered' => (float)$job['salary_offered'],
                'salary_period' => $job['salary_period'],
                'province' => $job['parent_province'],
                'municipality' => $job['parent_municipality'],
                'barangay' => $job['barangay'] ?? '',
                'distance' => $distance,
                
                'category_ids' => $category_ids,
                'categories' => $cat_names,
                'job_ids' => $job_ids,
                'jobs' => $job_names,
                'skill_ids' => $skill_ids,
                'skills' => $skill_names,
                
                'min_age' => $job['min_age'],
                'max_age' => $job['max_age'],
                'min_experience_years' => $job['min_experience_years'],
                'preferred_religion' => $job['preferred_religion'],
                'require_police_clearance' => (bool)$job['require_police_clearance'],
                'prefer_tesda_nc2' => (bool)$job['prefer_tesda_nc2'],
                
                'start_date' => $job['start_date'],
                'work_hours' => $job['work_hours'],
                'days_off' => $daysOff,
                'contract_duration' => $job['contract_duration'],
                'probation_period' => $job['probation_period'],
                
                'benefits' => $job['benefits'],
                'provides_meals' => (bool)$job['provides_meals'],
                'provides_accommodation' => (bool)$job['provides_accommodation'],
                'provides_sss' => (bool)$job['provides_sss'],
                'provides_philhealth' => (bool)$job['provides_philhealth'],
                'provides_pagibig' => (bool)$job['provides_pagibig'],
                'vacation_days' => $job['vacation_days'],
                'sick_days' => $job['sick_days'],
                
                'status' => $job['status'],
                'posted_at' => date("F j, Y", strtotime($job['created_at'])),
                'expires_at' => $job['expires_at'],
                
                'parent_name' => trim($job['parent_first_name'] . ' ' . $job['parent_last_name']) . " Family",
                'parent_verified' => ($job['parent_account_status'] === 'approved'),
                'parent_rating' => floatval($job['parent_rating']),
                
                'match_score' => min(100, $matchScore),
                'match_reasons' => $matchReasons,
                
                'is_saved' => (bool)$job['is_saved']
            ];
        }
    }
    
    // Sort by highest match score first
    usort($processedJobs, function($a, $b) {
        return $b['match_score'] - $a['match_score'];
    });

    // Apply the limit
    $recommendations = array_slice($processedJobs, 0, $limit);
    
    echo json_encode([
        'success' => true,
        'recommendations' => $recommendations,
        'total_count' => count($recommendations)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>