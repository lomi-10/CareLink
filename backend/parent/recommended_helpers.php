<?php
// carelink_api/parent/recommended_helpers.php
// Returns personalised helper recommendations with weighted match scores.
// Mirrors helper/recommendations.php's approach (haversine distance + weighted overlap scoring).

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php';

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
    $parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : 0;
    $limit     = isset($_GET['limit'])     ? intval($_GET['limit'])     : 10;

    if ($parent_id <= 0) throw new Exception('parent_id required');

    // ── 1. Parent profile (location, household needs) ────────────────────────
    $stmt = $conn->prepare("
        SELECT pp.profile_id, pp.province, pp.municipality, pp.latitude, pp.longitude
        FROM parent_profiles pp
        WHERE pp.user_id = ?
    ");
    $stmt->bind_param("i", $parent_id);
    $stmt->execute();
    $parent = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$parent) throw new Exception('Parent profile not found');

    $pProvince     = $parent['province']     ?? '';
    $pMunicipality = $parent['municipality'] ?? '';
    $pLat          = !empty($parent['latitude'])  ? floatval($parent['latitude'])  : null;
    $pLng          = !empty($parent['longitude']) ? floatval($parent['longitude']) : null;

    // ── 2. Parent's hiring history — category IDs + typical salary/experience
    //      requirements drawn from their own job posts (signals what they need) ─
    $parentCatIds   = [];
    $parentJobIds   = [];
    $salarySamples  = [];
    $expSamples     = [];
    $stmt = $conn->prepare("
        SELECT category_id, job_ids, salary_offered, salary_period, min_experience_years
        FROM job_posts
        WHERE parent_id = ?
    ");
    $stmt->bind_param("i", $parent_id);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) {
        $parentCatIds[] = (int)$r['category_id'];
        foreach (json_decode($r['job_ids'] ?? '[]', true) ?: [] as $jid) $parentJobIds[] = (int)$jid;
        $monthly = ($r['salary_period'] === 'Daily') ? floatval($r['salary_offered']) * 26 : floatval($r['salary_offered']);
        $salarySamples[] = $monthly;
        if ($r['min_experience_years'] !== null) $expSamples[] = (int)$r['min_experience_years'];
    }
    $stmt->close();
    $parentCatIds = array_values(array_unique($parentCatIds));
    $parentJobIds = array_values(array_unique($parentJobIds));
    $pTypicalSalary = !empty($salarySamples) ? array_sum($salarySamples) / count($salarySamples) : null;
    $pTypicalExp    = !empty($expSamples)    ? (int)round(array_sum($expSamples) / count($expSamples)) : null;

    // ── 3. Reference category names ───────────────────────────────────────────
    $refCats = [];
    $res = $conn->query("SELECT category_id, category_name FROM ref_categories");
    if ($res) while ($r = $res->fetch_assoc()) $refCats[$r['category_id']] = $r['category_name'];

    // ── 4. Approved helpers not already actively placed with this parent ─────
    $stmt = $conn->prepare("
        SELECT u.user_id, u.first_name, u.last_name,
               hp.profile_id, hp.profile_image, hp.bio,
               hp.experience_years, hp.employment_type, hp.work_schedule,
               hp.expected_salary, hp.salary_period,
               hp.barangay, hp.municipality, hp.province,
               hp.latitude, hp.longitude,
               hp.verification_status, hp.rating_average, hp.rating_count
        FROM users u
        JOIN helper_profiles hp ON u.user_id = hp.user_id
        WHERE u.user_type = 'helper' AND u.status = 'approved'
          AND NOT EXISTS (
              SELECT 1 FROM placements pl
              WHERE pl.helper_id = u.user_id AND pl.parent_id = ? AND pl.status = 'Active'
          )
    ");
    $stmt->bind_param("i", $parent_id);
    $stmt->execute();
    $helpersResult = $stmt->get_result();

    // ── 5. Score each helper ──────────────────────────────────────────────────
    $scored = [];
    while ($helper = $helpersResult->fetch_assoc()) {
        $profile_id = (int)$helper['profile_id'];

        // Helper's category + job-role IDs
        $helperCatIds = [];
        $helperJobIds = [];
        $catStmt = $conn->prepare("
            SELECT DISTINCT rc.category_id, rc.category_name, hj.job_id
            FROM helper_jobs hj
            JOIN ref_jobs rj ON hj.job_id = rj.job_id
            JOIN ref_categories rc ON rj.category_id = rc.category_id
            WHERE hj.profile_id = ?
        ");
        $catStmt->bind_param("i", $profile_id);
        $catStmt->execute();
        $catRes = $catStmt->get_result();
        $categoryNames = [];
        while ($r = $catRes->fetch_assoc()) {
            $cid = (int)$r['category_id'];
            if (!in_array($cid, $helperCatIds)) { $helperCatIds[] = $cid; $categoryNames[] = $r['category_name']; }
            $helperJobIds[] = (int)$r['job_id'];
        }
        $catStmt->close();

        $score   = 0;
        $reasons = [];

        // 1. Category match (25 pts) — overlap with the parent's hiring history
        if (!empty($parentCatIds)) {
            $catOverlap = count(array_intersect($parentCatIds, $helperCatIds));
            if ($catOverlap > 0) {
                $score += 25;
                $reasons[] = 'Specializes in care your family has hired for before';
            }
            if (!empty($parentJobIds) && !empty($helperJobIds)) {
                $jobOverlap = count(array_intersect($parentJobIds, $helperJobIds));
                if ($jobOverlap > 0) {
                    $reasons[] = 'Skilled in roles your family typically needs';
                }
            }
        } else {
            $score += 12; // no hiring history yet — partial credit so new parents still see results
        }

        // 2. Distance (20 pts) — real GPS when available, text fallback otherwise
        $hLat     = !empty($helper['latitude'])  ? floatval($helper['latitude'])  : null;
        $hLng     = !empty($helper['longitude']) ? floatval($helper['longitude']) : null;
        $distance = null;

        if ($pLat !== null && $pLng !== null && $hLat !== null && $hLng !== null) {
            $distance = haversine($pLat, $pLng, $hLat, $hLng);
            if ($distance <= 5) {
                $score += 20; $reasons[] = 'Very close (~' . $distance . ' km away)';
            } elseif ($distance <= 20) {
                $score += 14; $reasons[] = 'Nearby (~' . $distance . ' km away)';
            } elseif ($distance <= 50) {
                $score += 7;  $reasons[] = 'Within the province (~' . $distance . ' km)';
            }
        } else {
            $hMunicipality = $helper['municipality'] ?? '';
            $hProvince     = $helper['province']      ?? '';
            if ($hMunicipality && $pMunicipality && strtolower($hMunicipality) === strtolower($pMunicipality)) {
                $score += 20; $distance = rand(1, 5);
                $reasons[] = 'Same city/municipality';
            } elseif ($hProvince && $pProvince && strtolower($hProvince) === strtolower($pProvince)) {
                $score += 10; $distance = rand(10, 50);
                $reasons[] = 'Same province';
            } else {
                $distance = rand(50, 200);
            }
        }

        // 3. Salary fit (15 pts) — helper's expectation fits within what this family typically offers
        if ($pTypicalSalary !== null) {
            $hMonthly = ($helper['salary_period'] === 'Daily') ? floatval($helper['expected_salary']) * 26 : floatval($helper['expected_salary']);
            if ($hMonthly <= $pTypicalSalary) {
                $score += 15;
                $reasons[] = 'Salary expectation fits your budget';
            } elseif ($hMonthly <= $pTypicalSalary * 1.15) {
                $score += 8;
            }
        } else {
            $score += 8;
        }

        // 4. Experience (15 pts)
        $hExpYears = (int)($helper['experience_years'] ?? 0);
        if ($pTypicalExp !== null) {
            if ($hExpYears >= $pTypicalExp) {
                $score += 15;
                $reasons[] = 'Meets the experience level your family looks for';
            } elseif ($hExpYears >= max(0, $pTypicalExp - 1)) {
                $score += 8;
            }
        } else {
            // No history to compare against — scale on raw years
            $score += min(15, $hExpYears * 3);
            if ($hExpYears >= 3) $reasons[] = "$hExpYears years of caregiving experience";
        }

        // 5. Rating (15 pts)
        $rating = (float)($helper['rating_average'] ?? 0);
        $ratingCount = (int)($helper['rating_count'] ?? 0);
        if ($ratingCount > 0) {
            $score += (int)round(($rating / 5) * 15);
            if ($rating >= 4.5) $reasons[] = 'Highly rated by other families (' . number_format($rating, 1) . '★)';
        } else {
            $score += 5; // no reviews yet — small neutral credit
        }

        // 6. Verification bonus (10 pts)
        if (($helper['verification_status'] ?? '') === 'Verified') {
            $score += 10;
            $reasons[] = 'PESO-verified helper';
        }

        $finalScore = min(100, $score);

        if ($finalScore >= 15) {
            $scored[] = [
                'user_id'             => (string)$helper['user_id'],
                'profile_id'          => (string)$profile_id,
                'full_name'           => trim($helper['first_name'] . ' ' . $helper['last_name']),
                'first_name'          => $helper['first_name'],
                'last_name'           => $helper['last_name'],
                'profile_image'       => $helper['profile_image'],
                'bio'                 => $helper['bio'],
                'experience_years'    => $hExpYears,
                'employment_type'     => $helper['employment_type'],
                'work_schedule'       => $helper['work_schedule'],
                'expected_salary'     => (float)$helper['expected_salary'],
                'salary_period'       => $helper['salary_period'],
                'barangay'            => $helper['barangay'],
                'municipality'        => $helper['municipality'],
                'province'            => $helper['province'],
                'distance'            => $distance,
                'distance_exact'      => ($pLat !== null && $hLat !== null),
                'category_ids'        => $helperCatIds,
                'categories'          => $categoryNames,
                'verification_status' => $helper['verification_status'],
                'is_verified'         => ($helper['verification_status'] ?? '') === 'Verified',
                'rating_average'      => $rating,
                'rating_count'        => $ratingCount,
                'match_score'         => $finalScore,
                'match_reasons'       => array_values(array_unique($reasons)),
            ];
        }
    }

    usort($scored, fn($a, $b) => $b['match_score'] - $a['match_score']);
    $recommendations = array_slice($scored, 0, $limit);

    echo json_encode([
        'success'         => true,
        'recommendations' => $recommendations,
        'total_count'     => count($recommendations),
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
