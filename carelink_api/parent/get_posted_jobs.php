<?php
// carelink_api/parent/get_posted_jobs.php
// Get all job posts created by a specific parent

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Your standard error settings
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';
 
// 2. Your response helper
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
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : null;
   
    if (!$parent_id) {
        throw new Exception('Parent ID is required');
    }

    $sql = "
        SELECT
            jp.*,
            rc.category_name,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id) as application_count,
            (SELECT COUNT(*) FROM job_applications WHERE job_post_id = jp.job_post_id AND status = 'Pending') as new_application_count
        FROM job_posts jp
        LEFT JOIN ref_categories rc ON jp.category_id = rc.category_id
        WHERE jp.parent_id = ?
        ORDER BY
            CASE jp.status
                WHEN 'Open' THEN 1
                WHEN 'Filled' THEN 2
                WHEN 'Closed' THEN 3
                WHEN 'Expired' THEN 4
            END,
            jp.posted_at DESC
    ";
   
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $parent_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $jobs = array();
    while ($row = $result->fetch_assoc()) {
        $row['application_count'] = intval($row['application_count']);
        $row['new_application_count'] = intval($row['new_application_count']);
        $jobs[] = $row;
    }
    $stmt->close();

    if(empty($jobs)) {
        sendResponse(true, 'No job posts found for this parent', ['jobs' => []]);
    }

    sendResponse(true, 'Job posts retrieved successfully', [
        'jobs' => $jobs,
        'total_count' => count($jobs)
    ]);
   
} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>