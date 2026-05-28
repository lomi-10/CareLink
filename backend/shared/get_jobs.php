<?php
// carelink_api/shared/get_jobs.php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../dbcon.php';

try {
    if (!$conn) throw new Exception("Database connection failed");

    // job_title might be called differently in your DB, adjust if needed (e.g. name or title)
    $sql = "SELECT job_id, category_id, job_title, description FROM ref_jobs ORDER BY job_title";
    $result = $conn->query($sql);
    
    $jobs = array();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $jobs[] = $row;
        }
    }

    echo json_encode([
        'success' => true,
        'jobs' => $jobs,
        'data' => $jobs
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) $conn->close();
?>