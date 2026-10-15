<?php
// carelink_api/parent/estimate_matches.php
// Estimates how many helper profiles match a draft job post (used by the
// "Estimated Matches" widget on the Review & Publish step).

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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

    $category_ids = is_array($data['category_ids'] ?? null)
        ? array_values(array_unique(array_filter(array_map('intval', $data['category_ids']), fn($v) => $v > 0)))
        : [];
    if (!$category_ids && !empty($data['category_id'])) $category_ids = [intval($data['category_id'])];
    $categoryResult = $conn->query('SELECT category_id, category_name FROM ref_categories');
    if (!$categoryResult) throw new Exception('Could not load job categories: ' . $conn->error);
    $generalCategoryId = null;
    $specialtyCategoryIds = [];
    while ($category = $categoryResult->fetch_assoc()) {
        $categoryName = strtolower(trim((string) $category['category_name']));
        if ($categoryName === 'general househelp') {
            $generalCategoryId = (int) $category['category_id'];
        } elseif ($categoryName !== 'others') {
            $specialtyCategoryIds[] = (int) $category['category_id'];
        }
    }
    if ($generalCategoryId !== null && in_array($generalCategoryId, $category_ids, true)) {
        $category_ids = array_values(array_unique(array_merge($category_ids, $specialtyCategoryIds)));
    }
    $job_ids = is_array($data['job_ids'] ?? null)
        ? array_values(array_unique(array_filter(array_map('intval', $data['job_ids']), fn($v) => $v > 0)))
        : [];
    $province = trim($data['province'] ?? '');
    $municipality = trim($data['municipality'] ?? '');
    $salary_min = isset($data['salary_min']) ? floatval($data['salary_min']) : 0;
    $salary_max = (isset($data['salary_max']) && $data['salary_max'] !== null && $data['salary_max'] !== '')
        ? floatval($data['salary_max']) : null;
    $min_experience_years = isset($data['min_experience_years']) ? intval($data['min_experience_years']) : 0;
    $min_age = isset($data['min_age']) ? intval($data['min_age']) : 18;
    $max_age = isset($data['max_age']) ? intval($data['max_age']) : 65;
    $employment_type = $data['employment_type'] ?? 'Any';
    $work_schedule = $data['work_schedule'] ?? 'Any';

    if ($province === '' || (!$category_ids && empty($job_ids))) {
        sendResponse(true, 'Not enough information to estimate matches', [
            'available' => 0,
            'highly_compatible' => 0,
        ]);
    }

    $salary_ceiling = $salary_max !== null ? $salary_max : ($salary_min > 0 ? $salary_min * 1.5 : 999999);

    // Job/category match: any helper offering this category, or one of the specific job titles
    $category_placeholders = implode(',', array_fill(0, count($category_ids), '?'));
    $job_filter = $category_ids ? "rj.category_id IN ($category_placeholders)" : '1 = 0';
    $job_params = $category_ids;
    $job_types = str_repeat('i', count($category_ids));
    if (!empty($job_ids)) {
        $placeholders = implode(',', array_fill(0, count($job_ids), '?'));
        $job_filter .= " OR hj.job_id IN ($placeholders)";
        $job_params = array_merge($job_params, $job_ids);
        $job_types .= str_repeat('i', count($job_ids));
    }

    // 'Any' on either side always matches; otherwise employment_type is compared
    // directly now that helper_profiles also uses Stay-in/Stay-out.
    $employmentMatch = "(? = 'Any' OR hp.employment_type = 'Any'
        OR (? = 'Stay-in' AND hp.employment_type = 'Stay-in')
        OR (? = 'Stay-out' AND hp.employment_type = 'Stay-out'))";
    $scheduleMatch = "(? = 'Any' OR hp.work_schedule = 'Any' OR hp.work_schedule = ?)";

    $sql = "SELECT
                COUNT(DISTINCT hp.profile_id) AS available,
                COUNT(DISTINCT CASE WHEN
                    hp.municipality = ?
                    AND hp.expected_salary <= ?
                    AND hp.experience_years >= ?
                    AND (hp.birth_date IS NULL OR TIMESTAMPDIFF(YEAR, hp.birth_date, CURDATE()) BETWEEN ? AND ?)
                    AND $employmentMatch
                    AND $scheduleMatch
                THEN hp.profile_id END) AS highly_compatible
            FROM helper_profiles hp
            JOIN users u ON hp.user_id = u.user_id
            JOIN helper_jobs hj ON hj.profile_id = hp.profile_id
            JOIN ref_jobs rj ON rj.job_id = hj.job_id
            WHERE u.status = 'approved'
              AND hp.verification_status = 'Verified'
              AND hp.province = ?
              AND ($job_filter)";

    $types = 'sdiii' . 'sss' . 'ss' . 's' . $job_types;
    $params = array_merge(
        [$municipality, $salary_ceiling, $min_experience_years, $min_age, $max_age,
         $employment_type, $employment_type, $employment_type,
         $work_schedule, $work_schedule,
         $province],
        $job_params
    );

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Query preparation failed: ' . $conn->error);

    $bindArgs = [$types];
    foreach ($params as $key => $value) {
        $bindArgs[] = &$params[$key];
    }
    call_user_func_array([$stmt, 'bind_param'], $bindArgs);

    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    sendResponse(true, 'Estimated matches retrieved', [
        'available' => intval($row['available'] ?? 0),
        'highly_compatible' => intval($row['highly_compatible'] ?? 0),
    ]);

} catch (Exception $e) {
    sendResponse(false, $e->getMessage());
}
