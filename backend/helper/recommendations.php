<?php
// carelink_api/helper/recommendations.php
// Returns personalised job recommendations with weighted match scores.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/job_match.php';

// ─────────────────────────────────────────────────────────────────────────────
// Haversine distance (km) between two lat/lng pairs
// ─────────────────────────────────────────────────────────────────────────────
function haversine($lat1, $lon1, $lat2, $lon2) {
    $R = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat/2)**2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2)**2;
    return round($R * 2 * atan2(sqrt($a), sqrt(1 - $a)), 1);
}

try {
    $helper_id = isset($_GET['helper_id']) ? intval($_GET['helper_id']) : 0;
    $limit     = isset($_GET['limit'])     ? intval($_GET['limit'])     : 10;
    $requester_id = isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0;

    if ($helper_id <= 0) throw new Exception('helper_id required');
    carelink_require_self($requester_id, $helper_id, 'You are not allowed to view these recommendations.');

    // ── 1. Helper profile (location, preferences, experience) ────────────────
    // NOTE: province/municipality live in helper_profiles, NOT users
    $stmt = $conn->prepare("
        SELECT hp.profile_id, hp.province, hp.municipality,
               hp.experience_years, hp.employment_type, hp.work_schedule,
               hp.expected_salary, hp.salary_period,
               hp.latitude, hp.longitude
        FROM helper_profiles hp
        WHERE hp.user_id = ?
    ");
    $stmt->bind_param("i", $helper_id);
    $stmt->execute();
    $helper = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$helper) throw new Exception('Helper profile not found');

    $profile_id      = (int)$helper['profile_id'];
    $hProvince       = $helper['province']       ?? '';
    $hMunicipality   = $helper['municipality']   ?? '';
    $hExpYears       = (int)($helper['experience_years'] ?? 0);
    $hExpectedSalary = floatval($helper['expected_salary'] ?? 6000);
    $hSalaryPeriod   = $helper['salary_period']   ?? 'Monthly';

    // ── 2. Helper's category IDs (from their selected job roles) ─────────────
    $helperCatIds = [];
    $stmt = $conn->prepare("
        SELECT DISTINCT rc.category_id
        FROM helper_jobs hj
        JOIN ref_jobs rj ON hj.job_id = rj.job_id
        JOIN ref_categories rc ON rj.category_id = rc.category_id
        WHERE hj.profile_id = ?
    ");
    $stmt->bind_param("i", $profile_id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $helperCatIds[] = (int)$r['category_id'];
    $stmt->close();

    // ── 3. Helper's job role IDs ───────────────────────────────────────────
    $helperJobIds = [];
    $stmt = $conn->prepare("SELECT job_id FROM helper_jobs WHERE profile_id = ?");
    $stmt->bind_param("i", $profile_id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $helperJobIds[] = (int)$r['job_id'];
    $stmt->close();

    // ── 4. Helper's skill IDs ─────────────────────────────────────────────
    $helperSkillIds = [];
    $stmt = $conn->prepare("SELECT skill_id FROM helper_skills WHERE profile_id = ?");
    $stmt->bind_param("i", $profile_id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $helperSkillIds[] = (int)$r['skill_id'];
    $stmt->close();

    // ── 5. Reference maps (id → name) ─────────────────────────────────────
    $refCats   = [];
    $refJobs   = [];
    $refSkills = [];
    $res = $conn->query("SELECT category_id, category_name FROM ref_categories");
    if ($res) while ($r = $res->fetch_assoc()) $refCats[$r['category_id']] = $r['category_name'];
    $res = $conn->query("SELECT job_id, job_title FROM ref_jobs");
    if ($res) while ($r = $res->fetch_assoc()) $refJobs[$r['job_id']] = $r['job_title'];
    $res = $conn->query("SELECT skill_id, skill_name FROM ref_skills");
    if ($res) while ($r = $res->fetch_assoc()) $refSkills[$r['skill_id']] = $r['skill_name'];

    // ── 6. Open jobs the helper has NOT applied to yet ────────────────────
    // job_posts uses a single category_id (int), not a JSON array
    $stmt = $conn->prepare("
        SELECT jp.*,
               jp.latitude  AS job_lat,
               jp.longitude AS job_lng,
               rc.category_name,
               u.first_name AS parent_first_name,
               u.last_name  AS parent_last_name,
               u.status     AS parent_account_status,
               COALESCE(pr.avg_rating, 0)   AS parent_rating,
               CASE WHEN sj.saved_id IS NOT NULL THEN 1 ELSE 0 END AS is_saved
        FROM job_posts jp
        JOIN users u ON jp.parent_id = u.user_id
        LEFT JOIN ref_categories rc ON jp.category_id = rc.category_id
        LEFT JOIN (
            SELECT reviewee_id, AVG(rating) AS avg_rating
            FROM placement_reviews
            GROUP BY reviewee_id
        ) pr ON jp.parent_id = pr.reviewee_id
        LEFT JOIN saved_jobs sj
            ON jp.job_post_id = sj.job_post_id AND sj.helper_id = ?
        LEFT JOIN job_applications ja
            ON jp.job_post_id = ja.job_post_id AND ja.helper_id = ? AND ja.status != 'Withdrawn'
        WHERE jp.status = 'Open'
          AND ja.application_id IS NULL
        ORDER BY jp.posted_at DESC
    ");
    $stmt->bind_param("ii", $helper_id, $helper_id);
    $stmt->execute();
    $jobsResult = $stmt->get_result();

    // ── 7. Score each job ─────────────────────────────────────────────────
    $scored = [];
    while ($job = $jobsResult->fetch_assoc()) {
        // Parse JSON arrays from job_posts
        $jobJobIds   = json_decode($job['job_ids']   ?? '[]', true) ?: [];
        $jobSkillIds = json_decode($job['skill_ids'] ?? '[]', true) ?: [];
        $daysOff     = json_decode($job['days_off']  ?? '[]', true) ?: [];

        $jobJobIds   = array_map('intval', $jobJobIds);
        $jobSkillIds = array_map('intval', $jobSkillIds);

        // job_posts.category_id is a single integer
        $jobCatId = (int)$job['category_id'];

        // Resolve names
        $catName    = $job['category_name'] ?? ($refCats[$jobCatId] ?? 'General');
        $jobNames   = array_values(array_filter(array_map(fn($id) => $refJobs[$id] ?? null, $jobJobIds)));
        $skillNames = array_values(array_filter(array_map(fn($id) => $refSkills[$id] ?? null, $jobSkillIds)));

        // ── WEIGHTED SCORING (shared with browse_jobs.php) ───────────────
        $m = carelink_score_job_for_helper($helper, $helperCatIds, $helperJobIds, $helperSkillIds, $job);
        $finalScore = $m['score'];
        $reasons    = $m['reasons'];
        $distance   = $m['distance'];
        $isNew      = $m['is_new'];

        $jobMunicipality = $job['municipality'] ?? '';
        $jobProvince     = $job['province']     ?? '';

        if ($finalScore >= 15) { // only include meaningful matches
            $scored[] = [
                'job_post_id'   => (string)$job['job_post_id'],
                'parent_id'     => (string)$job['parent_id'],
                'title'         => $job['title'],
                'description'   => $job['description'],
                'employment_type'=> $job['employment_type'],
                'work_schedule' => $job['work_schedule'],
                'salary_offered'=> (float)$job['salary_offered'],
                'salary_period' => $job['salary_period'],
                'province'      => $jobProvince,
                'municipality'  => $jobMunicipality,
                'barangay'      => $job['barangay'] ?? '',
                'distance'      => $distance,   // km (null if unknown)
                'distance_exact'=> $m['distance_exact'], // true = GPS, false = estimate
                'category_id'   => $jobCatId,
                'category_name' => $catName,
                'categories'    => [$catName],
                'category_ids'  => [$jobCatId],
                'job_ids'       => $jobJobIds,
                'job_names'     => $jobNames,
                'jobs'          => $jobNames,
                'skill_ids'     => $jobSkillIds,
                'skill_names'   => $skillNames,
                'skills'        => $skillNames,
                'min_age'               => $job['min_age'],
                'max_age'               => $job['max_age'],
                'min_experience_years'  => $job['min_experience_years'],
                'preferred_religion'    => $job['preferred_religion'],
                'require_police_clearance'=> (bool)$job['require_police_clearance'],
                'prefer_tesda_nc2'      => (bool)$job['prefer_tesda_nc2'],
                'start_date'        => $job['start_date'],
                'work_hours'        => $job['work_hours'],
                'days_off'          => $daysOff,
                'contract_duration' => $job['contract_duration'],
                'probation_period'  => $job['probation_period'],
                'benefits'               => $job['benefits'],
                'provides_meals'         => (bool)$job['provides_meals'],
                'provides_accommodation' => (bool)$job['provides_accommodation'],
                'provides_sss'           => (bool)$job['provides_sss'],
                'provides_philhealth'    => (bool)$job['provides_philhealth'],
                'provides_pagibig'       => (bool)$job['provides_pagibig'],
                'vacation_days'          => (int)$job['vacation_days'],
                'sick_days'              => (int)$job['sick_days'],
                'status'    => $job['status'],
                'posted_at' => date('F j, Y', strtotime($job['posted_at'])),
                'expires_at'=> $job['expires_at'],
                'parent_name'    => trim($job['parent_first_name'] . ' ' . $job['parent_last_name']) . ' Family',
                'parent_verified'=> $job['parent_account_status'] === 'approved',
                'parent_rating'  => (float)$job['parent_rating'],
                'match_score'    => $finalScore,
                'match_reasons'  => array_values(array_unique($reasons)),
                'is_saved'       => (bool)$job['is_saved'],
                'is_new'         => $isNew,
            ];
        }
    }
    $stmt->close();

    usort($scored, fn($a, $b) => $b['match_score'] - $a['match_score']);
    $recommendations = array_slice($scored, 0, $limit);

    echo json_encode([
        'success'          => true,
        'recommendations'  => $recommendations,
        'total_count'      => count($recommendations),
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
