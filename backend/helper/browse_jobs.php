<?php
// carelink_api/helper/browse_jobs.php
//
// Response contract:
// - Returns one JSON object per job_posts row where status = 'Open'.
// - Excludes posts this helper has already applied to (job_applications row with status <> 'Withdrawn').
// - Pending / Closed job_posts never appear here (parent "Pending" tab != helper-visible Open).
// If an employer shows fewer rows here than on the parent app, check status and applications for each job_post_id.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once '../dbcon.php'; 

try {
    $helper_id = isset($_GET['helper_id']) ? intval($_GET['helper_id']) : 0;

    if ($helper_id <= 0) {
        throw new Exception('Helper ID is required');
    }

    // Pre-fetch skill names
    $allSkills = [];
    $skillsRes = $conn->query("SELECT skill_id, skill_name FROM ref_skills");
    if ($skillsRes) {
        while ($r = $skillsRes->fetch_assoc()) {
            $allSkills[$r['skill_id']] = $r['skill_name'];
        }
    }

    // Pre-fetch job reference titles
    $allRefJobs = [];
    $refJobsRes = $conn->query("SELECT job_id, job_title FROM ref_jobs");
    if ($refJobsRes) {
        while ($r = $refJobsRes->fetch_assoc()) {
            $allRefJobs[$r['job_id']] = $r['job_title'];
        }
    }

    $helperStmt = $conn->prepare("SELECT * FROM helper_profiles WHERE user_id = ?");
    $helperStmt->bind_param("i", $helper_id);
    $helperStmt->execute();
    $helper = $helperStmt->get_result()->fetch_assoc();
    
    if (!$helper) throw new Exception('Helper profile not found');

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
    while ($row = $catRes->fetch_assoc()) $helperCats[] = (string)$row['category_id'];

    $helperSkills = [];
    $skillStmt = $conn->prepare("SELECT skill_id FROM helper_skills WHERE profile_id = ?");
    if ($skillStmt) {
        $skillStmt->bind_param("i", $helper['profile_id']);
        $skillStmt->execute();
        $skillRes = $skillStmt->get_result();
        while ($row = $skillRes->fetch_assoc()) $helperSkills[] = (string)$row['skill_id'];
    }

    $jobQuery = "
        SELECT 
            jp.*,
            u.first_name as parent_first_name,
            u.last_name as parent_last_name,
            u.status as parent_account_status,
            u.email as parent_email,
            rc.category_name,
            pp.contact_number as parent_contact_number,
            pp.profile_image as parent_profile_image,
            pp.barangay as parent_barangay,
            pp.municipality as parent_municipality,
            pp.province as parent_province,
            pp.address as parent_address,
            pp.landmark as parent_landmark,
            pp.bio as parent_bio,
            COALESCE(pr.rating, 0) as parent_rating,
            CASE WHEN sj.saved_id IS NOT NULL THEN 1 ELSE 0 END as is_saved,
            sj.saved_at
        FROM job_posts jp
        JOIN users u ON jp.parent_id = u.user_id
        LEFT JOIN parent_profiles pp ON jp.parent_id = pp.user_id
        LEFT JOIN (
            SELECT reviewee_id, AVG(rating) as rating
            FROM placement_reviews
            GROUP BY reviewee_id
        ) pr ON jp.parent_id = pr.reviewee_id   
        LEFT JOIN ref_categories rc ON jp.category_id = rc.category_id
        LEFT JOIN saved_jobs sj ON jp.job_post_id = sj.job_post_id AND sj.helper_id = ?
        WHERE jp.status = 'Open'
        AND NOT EXISTS (
            SELECT 1 FROM job_applications ja
            WHERE ja.job_post_id = jp.job_post_id
              AND ja.helper_id = ?
              AND ja.status != 'Withdrawn'
        )
        ORDER BY jp.posted_at DESC
    ";
    
    $stmt = $conn->prepare($jobQuery);
    $stmt->bind_param("ii", $helper_id, $helper_id);
    $stmt->execute();
    $jobsResult = $stmt->get_result();
    
    $processedJobs = [];
    while ($job = $jobsResult->fetch_assoc()) {
        
        // job_posts uses a single category_id column (not a JSON array)
        $category_ids = !empty($job['category_id']) ? [(string)$job['category_id']] : [];
        $job_ids = json_decode($job['job_ids'], true) ?: [];
        $skill_ids = json_decode($job['skill_ids'], true) ?: [];
        $daysOff = json_decode($job['days_off'], true) ?: [];

        // NEW: Map those raw IDs to actual readable skill strings!
        $job_skills = [];
        foreach($skill_ids as $sid) {
            if(isset($allSkills[$sid])) {
                $job_skills[] = $allSkills[$sid];
            }
        }

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
        
        $sameProvince = ($job['province'] == $helper['province']);
        $sameMunicipality = ($job['municipality'] == $helper['municipality']);
        
        $distance = rand(50, 100);
        if ($sameMunicipality) {
            $distance = rand(1, 5); 
            $matchScore += 15;
            $matchReasons[] = "Very close to your location";
        } elseif ($sameProvince) {
            $distance = rand(10, 30);
            $matchScore += 10;
            $matchReasons[] = "Location nearby";
        }
        
        $monthlySalary = ($job['salary_period'] == 'Daily') ? $job['salary_offered'] * 26 : $job['salary_offered'];
        $helperExpectedSalary = $helper['expected_salary'] ?? 8000;
        
        if ($monthlySalary >= $helperExpectedSalary * 0.8 && $monthlySalary <= $helperExpectedSalary * 1.2) {
            $matchScore += 15;
            $matchReasons[] = "Salary in your range";
        } elseif ($monthlySalary > $helperExpectedSalary * 1.2) {
            $matchScore += 10;
            $matchReasons[] = "Salary above your range";
        }
        
        $helperPreferredSchedule = $helper['work_schedule'] ?? 'any';
        if (strtolower($helperPreferredSchedule) == 'any' || strtolower($job['work_schedule']) == strtolower($helperPreferredSchedule)) {
            $matchScore += 10;
        }

        // FETCH PARENT DOCUMENTS
        $docs_query = "SELECT document_type, file_path FROM user_documents WHERE user_id = " . (int)$job['parent_id'];
        $docs_result = $conn->query($docs_query);
        
        $parent_valid_id = null;
        $parent_proof_of_billing = null;

        if ($docs_result) {
            while ($doc = $docs_result->fetch_assoc()) {
                if ($doc['document_type'] === 'Valid ID') $parent_valid_id = $doc['file_path'];
                if ($doc['document_type'] === 'Proof of Billing') $parent_proof_of_billing = $doc['file_path'];
            }
        }
        
        $processedJobs[] = [
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
            
            'category_ids'  => $category_ids,
            'category_name' => $job['category_name'] ?? null,
            'categories'    => $job['category_name'] ? [$job['category_name']] : [],
            'job_ids'       => $job_ids,
            'job_names'     => array_values(array_filter(array_map(fn($id) => $allRefJobs[(int)$id] ?? null, $job_ids))),
            'jobs'          => array_values(array_filter(array_map(fn($id) => $allRefJobs[(int)$id] ?? null, $job_ids))),
            'skill_ids'     => $skill_ids,
            
            // NEW: Passing both formats so the React frontend handles it perfectly
            'skills' => $job_skills,
            'skill_names' => implode(', ', $job_skills), 
            
            'min_age' => $job['min_age'],
            'max_age' => $job['max_age'],
            'min_experience_years' => $job['min_experience_years'],
            
            'start_date' => $job['start_date'],
            'work_hours' => $job['work_hours'],
            'days_off' => $daysOff,
            
            'provides_meals' => (bool)$job['provides_meals'],
            'provides_accommodation' => (bool)$job['provides_accommodation'],
            'provides_sss' => (bool)$job['provides_sss'],
            'provides_philhealth' => (bool)$job['provides_philhealth'],
            'provides_pagibig' => (bool)$job['provides_pagibig'],
            
            'status' => $job['status'],
            'posted_at' => date("Y-m-d H:i:s", strtotime($job['posted_at'])),
            'expires_at' => $job['expires_at'],
            
            'parent_name' => trim($job['parent_first_name'] . ' ' . $job['parent_last_name']),
            'parent_email' => $job['parent_email'],
            'parent_contact_number' => $job['parent_contact_number'],
            'parent_profile_image' => $job['parent_profile_image'],
            'parent_barangay' => $job['parent_barangay'],
            'parent_municipality' => $job['parent_municipality'],
            'parent_province' => $job['parent_province'],
            'parent_address' => $job['parent_address'],
            'parent_landmark' => $job['parent_landmark'],
            'parent_bio' => $job['parent_bio'],
            'parent_valid_id' => $parent_valid_id,
            'parent_proof_of_billing' => $parent_proof_of_billing,
            'parent_verified' => ($job['parent_account_status'] === 'approved'),
            'parent_rating' => floatval($job['parent_rating']),
            
            'match_score' => min(100, $matchScore),
            'match_reasons' => $matchReasons,
            
            'is_saved' => (bool)$job['is_saved'],
            'saved_at' => $job['saved_at']
        ];
    }
    
    usort($processedJobs, function($a, $b) {
        return $b['match_score'] - $a['match_score'];
    });
    
    echo json_encode([
        'success' => true,
        'jobs' => $processedJobs,
        'total_count' => count($processedJobs)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>