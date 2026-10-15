<?php
/**
 * job_match.php — single source of truth for helper⇄job match scoring.
 *
 * Both helper/recommendations.php (dashboard) and helper/browse_jobs.php (Browse)
 * MUST use this so the SAME job always shows the SAME percentage and reasons.
 *
 * Weighted model (max 100):
 *   Category coverage 25 · Job roles 15 · Skills 15 · Location 10 · Experience 10 ·
 *   Salary 15 · Employer rating 10
 */

if (!function_exists('carelink_haversine')) {
    /** Great-circle distance in km between two lat/lng points. */
    function carelink_haversine($lat1, $lon1, $lat2, $lon2): float
    {
        $R = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
        return round($R * 2 * atan2(sqrt($a), sqrt(1 - $a)), 1);
    }
}

if (!function_exists('carelink_add_househelp_match_context')) {
    /** Attach the reference taxonomy used to fairly score an all-around post. */
    function carelink_add_househelp_match_context(array $job, array $categoryNames): array
    {
        $generalId = null;
        $specialtyIds = [];
        $specialtyNames = [];
        foreach ($categoryNames as $id => $name) {
            $normalizedName = strtolower(trim((string) $name));
            if ($normalizedName === 'general househelp') {
                $generalId = (int) $id;
            } elseif ($normalizedName !== 'others') {
                $specialtyIds[] = (int) $id;
                $specialtyNames[] = (string) $name;
            }
        }
        $job['general_househelp_category_id'] = $generalId;
        $job['household_specialty_category_ids'] = $specialtyIds;
        $job['household_specialty_category_names'] = $specialtyNames;
        return $job;
    }
}

/**
 * Score one job for one helper.
 *
 * @param array $helper         helper_profiles row (province, municipality,
 *                              experience_years, expected_salary, salary_period,
 *                              latitude, longitude)
 * @param int[] $helperCatIds   helper's category ids
 * @param int[] $helperJobIds   helper's job-role ids
 * @param int[] $helperSkillIds helper's skill ids
 * @param array $job            job_posts row (category_id, category_ids, job_ids, skill_ids,
 *                              province, municipality, latitude/longitude or
 *                              job_lat/job_lng, min_experience_years,
 *                              salary_offered, salary_period, parent_rating,
 *                              posted_at)
 *
 * @return array{score:int, reasons:string[], distance:?float, distance_exact:bool, is_new:bool}
 */
function carelink_score_job_for_helper(array $helper, array $helperCatIds, array $helperJobIds, array $helperSkillIds, array $job): array
{
    $helperCatIds   = array_map('intval', $helperCatIds);
    $helperJobIds   = array_map('intval', $helperJobIds);
    $helperSkillIds = array_map('intval', $helperSkillIds);

    $jobJobIds   = array_map('intval', json_decode($job['job_ids']   ?? '[]', true) ?: []);
    $jobSkillIds = array_map('intval', json_decode($job['skill_ids'] ?? '[]', true) ?: []);
    $jobCatIds = array_map('intval', json_decode($job['category_ids'] ?? '[]', true) ?: []);
    if (!$jobCatIds && !empty($job['category_id'])) $jobCatIds = [(int) $job['category_id']];
    $jobCatIds = array_values(array_unique(array_filter($jobCatIds, fn($id) => $id > 0)));

    $score   = 0;
    $reasons = [];

    // 1. Category coverage (25) — multi-specialty posts earn proportional credit.
    $categoryOverlap = count(array_intersect($jobCatIds, $helperCatIds));
    $categoryDenominator = count($jobCatIds);
    $generalCategoryId = (int) ($job['general_househelp_category_id'] ?? 0);
    if ($generalCategoryId > 0 && in_array($generalCategoryId, $jobCatIds, true)) {
        $specialtyIds = array_values(array_unique(array_map('intval', $job['household_specialty_category_ids'] ?? [])));
        if ($specialtyIds) {
            $categoryDenominator = count($specialtyIds);
            $categoryOverlap = in_array($generalCategoryId, $helperCatIds, true)
                ? $categoryDenominator
                : count(array_intersect($specialtyIds, $helperCatIds));
        }
    }
    if ($categoryOverlap > 0 && $categoryDenominator > 0) {
        $categoryPoints = (int) round(($categoryOverlap / $categoryDenominator) * 25);
        $score += $categoryPoints;
        $reasons[] = $categoryOverlap === $categoryDenominator
            ? 'All required categories match your specialties'
            : "$categoryOverlap/" . $categoryDenominator . ' required categories match';
    }

    // 2. Job roles (15) — proportional coverage avoids granting full credit for
    //    one matching role when the employer explicitly selected several roles.
    if (!empty($jobJobIds) && !empty($helperJobIds)) {
        $overlap = count(array_intersect($jobJobIds, $helperJobIds));
        if ($overlap > 0) {
            $pts = (int) round(($overlap / count($jobJobIds)) * 15);
            $score += $pts;
            $reasons[] = "$overlap/" . count($jobJobIds) . ' required job roles match';
        }
    } elseif ($jobCatIds && $categoryOverlap > 0) {
        $score += 8; // no specific roles required — partial credit if category matched
    }

    // 3. Skills (15) — proportional ---------------------------------------------
    if (!empty($jobSkillIds)) {
        $matching = count(array_intersect($jobSkillIds, $helperSkillIds));
        $pts      = (int) round(($matching / count($jobSkillIds)) * 15);
        if ($pts > 0) { $score += $pts; $reasons[] = "$matching/" . count($jobSkillIds) . ' required skills match'; }
    } else {
        $score += 8; // no specific skills required
    }

    // 4. Location (10) — real GPS, else text fallback (deterministic) -----------
    $jobMunicipality = $job['municipality'] ?? '';
    $jobProvince     = $job['province']     ?? '';
    $hMunicipality   = $helper['municipality'] ?? '';
    $hProvince       = $helper['province']     ?? '';
    $jobLat = isset($job['job_lat']) && $job['job_lat'] !== '' ? floatval($job['job_lat'])
            : (!empty($job['latitude'])  ? floatval($job['latitude'])  : null);
    $jobLng = isset($job['job_lng']) && $job['job_lng'] !== '' ? floatval($job['job_lng'])
            : (!empty($job['longitude']) ? floatval($job['longitude']) : null);
    $hLat = !empty($helper['latitude'])  ? floatval($helper['latitude'])  : null;
    $hLng = !empty($helper['longitude']) ? floatval($helper['longitude']) : null;

    $distance      = null;
    $distanceExact = ($hLat !== null && $hLng !== null && $jobLat !== null && $jobLng !== null);

    if ($distanceExact) {
        $distance = carelink_haversine($hLat, $hLng, $jobLat, $jobLng);
        if ($distance <= 5)       { $score += 10; $reasons[] = 'Very close (~' . $distance . ' km away)'; }
        elseif ($distance <= 20)  { $score += 7;  $reasons[] = 'Nearby (~' . $distance . ' km away)'; }
        elseif ($distance <= 50)  { $score += 3;  $reasons[] = 'Within the province (~' . $distance . ' km)'; }
    } else {
        // Deterministic estimates (no rand — so dashboard & Browse agree exactly).
        if ($jobMunicipality && $hMunicipality && strtolower($jobMunicipality) === strtolower($hMunicipality)) {
            $score += 10; $distance = 3.0; $reasons[] = 'Same city/municipality';
        } elseif ($jobProvince && $hProvince && strtolower($jobProvince) === strtolower($hProvince)) {
            $score += 5; $distance = 25.0; $reasons[] = 'Same province';
        }
    }

    // 5. Experience (10) --------------------------------------------------------
    $hExpYears = (int) ($helper['experience_years'] ?? 0);
    $reqExp    = (int) ($job['min_experience_years'] ?? 0);
    if ($hExpYears >= $reqExp) {
        $score += 10;
    } elseif ($hExpYears >= $reqExp - 1) {
        $score += 5;
        $reasons[] = 'Nearly meets experience requirement';
    }

    // 6. Salary (15) ------------------------------------------------------------
    $hExpectedSalary = floatval($helper['expected_salary'] ?? 6400);
    $hSalaryPeriod   = $helper['salary_period'] ?? 'Monthly';
    $jobMonthly    = (($job['salary_period'] ?? '') === 'Daily') ? floatval($job['salary_offered'] ?? 0) * 26 : floatval($job['salary_offered'] ?? 0);
    $helperMonthly = ($hSalaryPeriod === 'Daily') ? $hExpectedSalary * 26 : $hExpectedSalary;
    if ($jobMonthly >= $helperMonthly) {
        $score += 15;
        $reasons[] = 'Salary meets or exceeds your expectation';
    } elseif ($jobMonthly >= $helperMonthly * 0.85) {
        $score += 9;
    }

    // 7. Employer rating (10) ---------------------------------------------------
    $parentRating = (float) ($job['parent_rating'] ?? 0);
    if ($parentRating > 0) {
        $score += (int) round(($parentRating / 5) * 10);
        if ($parentRating >= 4.5) {
            $reasons[] = 'Highly rated employer (' . number_format($parentRating, 1) . '★)';
        }
    } else {
        $score += 7; // no reviews yet — neutral benefit of the doubt, not a penalty
    }

    $daysSince = floor((time() - strtotime($job['posted_at'] ?? 'now')) / 86400);

    return [
        'score'          => min(100, $score),
        'reasons'        => array_values(array_unique($reasons)),
        'distance'       => $distance,
        'distance_exact' => $distanceExact,
        'is_new'         => $daysSince <= 3,
    ];
}
