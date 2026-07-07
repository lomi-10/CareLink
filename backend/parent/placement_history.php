<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

function hist_out($ok, $msg, $data = []) {
    echo json_encode(['success' => $ok, 'message' => $msg] + $data);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    $parent_id = isset($_GET['parent_id']) ? (int)$_GET['parent_id'] : 0;
    $requester_id = isset($_GET['requester_id']) ? (int)$_GET['requester_id'] : 0;
    if ($parent_id <= 0) hist_out(false, 'parent_id required');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to view this placement history.');

    $base_url = carelink_url_scheme() . $_SERVER['HTTP_HOST'] . '/carelink_api/uploads/profiles/';

    $sql = "
        SELECT
            ja.application_id,
            ja.job_post_id,
            ja.helper_id,
            ja.status,
            ja.termination_last_day,
            jp.title AS job_title,
            co.employment_start_date,
            co.employment_end_date,
            co.confirmed_salary,
            co.salary_period,
            TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS helper_name,
            hp.profile_image AS helper_photo
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id AND jp.parent_id = ?
        INNER JOIN users u ON u.user_id = ja.helper_id
        LEFT JOIN helper_profiles hp ON hp.user_id = ja.helper_id
        LEFT JOIN contracts co ON co.application_id = ja.application_id
        WHERE (
            LOWER(TRIM(ja.status)) = 'terminated'
            OR (
                LOWER(TRIM(ja.status)) IN ('termination_pending','pending_termination')
                AND ja.termination_last_day IS NOT NULL
                AND ja.termination_last_day < CURDATE()
            )
            OR (
                LOWER(TRIM(ja.status)) IN ('hired','accepted')
                AND co.employment_end_date IS NOT NULL
                AND co.employment_end_date < CURDATE()
            )
        )
        ORDER BY COALESCE(ja.termination_last_day, co.employment_end_date, ja.updated_at) DESC
        LIMIT 100
    ";

    $st = $conn->prepare($sql);
    if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
    $st->bind_param('i', $parent_id);
    $st->execute();
    $res = $st->get_result();

    $placements = [];
    while ($res && ($row = $res->fetch_assoc())) {
        $ended = $row['termination_last_day'] ?? ($row['employment_end_date'] ?? null);
        $photo = $row['helper_photo'] ? $base_url . $row['helper_photo'] : null;
        $placements[] = [
            'application_id'        => (int)$row['application_id'],
            'job_post_id'           => (int)$row['job_post_id'],
            'helper_id'             => (int)$row['helper_id'],
            'helper_name'           => trim((string)($row['helper_name'] ?? '')) ?: 'Helper',
            'helper_photo'          => $photo,
            'job_title'             => $row['job_title'] ?? '',
            'status'                => $row['status'],
            'employment_start_date' => $row['employment_start_date'] ?? null,
            'ended_on'              => $ended,
            'confirmed_salary'      => $row['confirmed_salary'] !== null ? (float)$row['confirmed_salary'] : null,
            'salary_period'         => $row['salary_period'] ?? null,
        ];
    }
    if ($res) $res->free();
    $st->close();

    hist_out(true, 'OK', ['placements' => $placements]);
} catch (Exception $e) {
    hist_out(false, $e->getMessage());
}
