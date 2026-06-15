<?php
/**
 * GET ?parent_id=&helper_id=
 * Returns active applications (Pending, Reviewed, Shortlisted, Interview Scheduled) for this helper with this employer.
 * needs_selection = true when more than one row (employer must pick before hire_helper.php).
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../dbcon.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $parent_id = isset($_GET['parent_id']) ? (int) $_GET['parent_id'] : 0;
    $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;

    if ($parent_id <= 0 || $helper_id <= 0) {
        throw new Exception('parent_id and helper_id are required');
    }

    $sql = "
        SELECT
            ja.application_id,
            ja.job_post_id,
            ja.status,
            ja.applied_at,
            jp.title AS job_title,
            jp.start_date AS job_start_date,
            jp.salary_offered,
            jp.salary_period,
            jp.employment_type,
            jp.work_schedule
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE jp.parent_id = ?
          AND ja.helper_id = ?
          AND ja.status IN ('Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled')
        ORDER BY ja.applied_at DESC
    ";

    $st = $conn->prepare($sql);
    if (!$st) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    $st->bind_param('ii', $parent_id, $helper_id);
    $st->execute();
    $res = $st->get_result();
    $applications = [];
    while ($row = $res->fetch_assoc()) {
        $applications[] = [
            'application_id' => (int) $row['application_id'],
            'job_post_id' => (int) $row['job_post_id'],
            'job_title' => $row['job_title'],
            'status' => $row['status'],
            'applied_at' => $row['applied_at'],
            'job_start_date' => $row['job_start_date'],
            'salary_offered' => $row['salary_offered'] !== null ? (float) $row['salary_offered'] : null,
            'salary_period' => $row['salary_period'],
            'employment_type' => $row['employment_type'],
            'work_schedule' => $row['work_schedule'],
        ];
    }
    $st->close();

    $hn = $conn->prepare('SELECT first_name, last_name FROM users WHERE user_id = ? LIMIT 1');
    $hn->bind_param('i', $helper_id);
    $hn->execute();
    $hr = $hn->get_result()->fetch_assoc();
    $hn->close();
    $helper_name = $hr ? trim($hr['first_name'] . ' ' . $hr['last_name']) : 'This helper';

    echo json_encode([
        'success' => true,
        'needs_selection' => count($applications) > 1,
        'helper_name' => $helper_name,
        'applications' => $applications,
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
