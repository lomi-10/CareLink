<?php
// carelink_api/peso/get_job_details.php

ob_start();
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php';

function sendJson($ok, $msg, $data = null) {
    if (ob_get_level()) ob_clean();
    $r = ['success' => $ok, 'message' => $msg];
    if ($data !== null) $r['data'] = $data;
    echo json_encode($r);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    if (!isset($_GET['job_post_id'])) throw new Exception('Job Post ID required');

    $job_id = intval($_GET['job_post_id']);

    $sql = "
        SELECT
            j.*,
            CONCAT(u.first_name, ' ', u.last_name)   AS parent_name,
            u.email                                   AS parent_email,
            c.category_name,
            CONCAT(vu.first_name, ' ', vu.last_name)  AS verified_by_name,
            vu.email                                  AS verified_by_email
        FROM job_posts j
        JOIN  users u  ON j.parent_id   = u.user_id
        LEFT JOIN ref_categories c  ON j.category_id  = c.category_id
        LEFT JOIN users vu ON j.verified_by = vu.user_id
        WHERE j.job_post_id = ?
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('i', $job_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $row['salary_offered'] = (float)$row['salary_offered'];
        sendJson(true, 'Job found', $row);
    } else {
        throw new Exception('Job not found.');
    }

} catch (Exception $e) {
    sendJson(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
