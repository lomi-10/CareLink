<?php
// carelink_api/peso/get_jobs_for_verification.php

ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php';

function sendJson($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $r = ['success' => $success, 'message' => $message];
    if ($data !== null) $r['data'] = $data;
    echo json_encode($r);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    // Optional filter: ?parent_id=X shows only that parent's jobs
    $parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : 0;

    $where = $parent_id > 0 ? 'WHERE j.parent_id = ?' : '';

    $sql = "
        SELECT
            j.job_post_id,
            j.title,
            j.custom_category,
            j.salary_offered,
            j.salary_period,
            j.status,
            j.posted_at,
            j.verified_at,
            j.rejection_reason,
            CONCAT(u.first_name, ' ', u.last_name)   AS parent_name,
            u.email                                   AS parent_email,
            c.category_name,
            CONCAT(vu.first_name, ' ', vu.last_name)  AS verified_by_name
        FROM job_posts j
        JOIN  users u  ON j.parent_id   = u.user_id
        LEFT JOIN ref_categories c  ON j.category_id  = c.category_id
        LEFT JOIN users vu ON j.verified_by = vu.user_id
        {$where}
        ORDER BY
            CASE j.status WHEN 'Pending' THEN 0 ELSE 1 END,
            j.posted_at DESC
    ";

    if ($parent_id > 0) {
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
        $stmt->bind_param('i', $parent_id);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query($sql);
        if (!$result) throw new Exception('Query failed: ' . $conn->error);
    }

    $jobs = [];
    while ($row = $result->fetch_assoc()) {
        $row['salary_offered'] = (float)$row['salary_offered'];
        $jobs[] = $row;
    }

    sendJson(true, count($jobs) . ' job(s) found', $jobs);

} catch (Exception $e) {
    sendJson(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
