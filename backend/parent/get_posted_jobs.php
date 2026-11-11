<?php
// carelink_api/parent/get_posted_jobs.php
// API to fetch all jobs posted by a parent with applicant counts

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
include_once '../dbcon.php';
include_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/job_match.php';
require_once __DIR__ . '/../shared/multivalue_relations.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $response = array("success" => $success, "message" => $message);
    if ($data !== null) {
        foreach ($data as $key => $value) {
            $response[$key] = $value;
        }
    }
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) throw new Exception("Database connection failed");

    $parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : null;
    $requester_id = isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0;
    if (!$parent_id) throw new Exception('Parent ID is required');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to view these job posts.');

    $categoryNames = [];
    $categoryResult = $conn->query('SELECT category_id, category_name FROM ref_categories');
    if ($categoryResult) {
        while ($category = $categoryResult->fetch_assoc()) {
            $categoryNames[(int) $category['category_id']] = $category['category_name'];
        }
    }

    $sql = "
        SELECT
            jp.*,
            rc.category_name,
            rl.language_name as preferred_language_name,
            (SELECT GROUP_CONCAT(rs.skill_name ORDER BY jps.sort_order SEPARATOR ', ')
             FROM job_post_skills jps JOIN ref_skills rs ON rs.skill_id = jps.skill_id
             WHERE jps.job_post_id = jp.job_post_id) as skill_names,
            (SELECT GROUP_CONCAT(rj.job_title ORDER BY jpr.sort_order SEPARATOR ', ')
             FROM job_post_roles jpr JOIN ref_jobs rj ON rj.job_id = jpr.job_id
             WHERE jpr.job_post_id = jp.job_post_id) as role_names,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id) as application_count,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id AND status = 'Pending') as new_application_count
        FROM job_posts jp
        LEFT JOIN ref_categories rc ON jp.category_id = rc.category_id
        LEFT JOIN ref_languages rl ON jp.preferred_language_id = rl.language_id
        WHERE jp.parent_id = ?
        ORDER BY
            CASE jp.status
                WHEN 'Open' THEN 1
                WHEN 'Filled' THEN 2
                WHEN 'Closed' THEN 3
                WHEN 'Expired' THEN 4
                ELSE 5
            END,
            jp.posted_at DESC
    ";
   
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $parent_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $jobRows = [];
    while ($row = $result->fetch_assoc()) $jobRows[] = $row;
    $relationMap = carelink_load_job_post_relations(
        $conn,
        array_map(fn($row) => (int) $row['job_post_id'], $jobRows)
    );
    $jobs = array();
    foreach ($jobRows as $row) {
        $row = carelink_attach_job_post_relations($row, $relationMap);
        $row['job_post_id'] = intval($row['job_post_id']);
        $row['salary_offered'] = floatval($row['salary_offered']);
        $row['application_count'] = intval($row['application_count']);
        $row['new_application_count'] = intval($row['new_application_count']);
        
        $daysOff = json_decode($row['days_off'] ?? '[]', true);
        $row['days_off'] = is_array($daysOff) ? json_encode($daysOff) : '[]';
        if (!$row['category_ids'] && !empty($row['category_id'])) {
            $row['category_ids'] = [(int) $row['category_id']];
        }
        $row['category_ids'] = array_values(array_unique(array_map('intval', $row['category_ids'])));
        $row['categories'] = array_values(array_filter(array_map(
            fn($categoryId) => $categoryNames[$categoryId] ?? null,
            $row['category_ids']
        )));
        $row['category_name'] = implode(', ', $row['categories']) ?: ($row['category_name'] ?? null);
        $row['slots'] = max(1, (int) ($row['slots'] ?? 1));
        $row = carelink_add_househelp_match_context($row, $categoryNames);

        $jobs[] = $row;
    }
    $stmt->close();

    sendResponse(true, 'Jobs retrieved successfully', [
        'jobs' => $jobs,
        'total_count' => count($jobs)
    ]);
   
} catch (Exception $e) {
    sendResponse(false, $e->getMessage());
}
?>
