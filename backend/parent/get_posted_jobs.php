<?php
// carelink_api/parent/get_posted_jobs.php
// API to fetch all jobs posted by a parent with applicant counts

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
include_once '../dbcon.php';

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
    if (!$parent_id) throw new Exception('Parent ID is required');

    $sql = "
        SELECT
            jp.*,
            rc.category_name,
            rl.language_name as preferred_language_name,
            (SELECT GROUP_CONCAT(skill_name SEPARATOR ', ') 
             FROM ref_skills 
             WHERE skill_id IN (SELECT JSON_UNQUOTE(JSON_EXTRACT(skill_ids, CONCAT('$[', seq, ']')))
                                FROM (SELECT 0 AS seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 
                                      UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) seqs
                                WHERE seq < JSON_LENGTH(jp.skill_ids))) as skill_names,
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

    $jobs = array();
    while ($row = $result->fetch_assoc()) {
        $row['job_post_id'] = intval($row['job_post_id']);
        $row['salary_offered'] = floatval($row['salary_offered']);
        $row['application_count'] = intval($row['application_count']);
        $row['new_application_count'] = intval($row['new_application_count']);
        
        // Parse JSON fields
        $json_fields = ['job_ids', 'skill_ids', 'days_off'];
        foreach ($json_fields as $field) {
            if (isset($row[$field]) && !empty($row[$field])) {
                // Keep as JSON string for frontend if needed, but here we decode for consistency
                // However, JobDetailsModal expects a JSON string for JSON.parse()
                // Let's keep days_off as string for the frontend JSON.parse call
                if ($field !== 'days_off') {
                    $decoded = json_decode($row[$field], true);
                    $row[$field] = is_array($decoded) ? $decoded : [];
                }
            } else {
                $row[$field] = ($field === 'days_off') ? '[]' : [];
            }
        }
        
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
