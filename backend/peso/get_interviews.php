<?php
/**
 * get_interviews.php — PESO oversight list of helper/employer interviews.
 * GET: staff_user_id (PESO staff auth), status? (Scheduled|Confirmed|Completed|Cancelled|Rescheduled|All)
 */
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

function out(bool $ok, string $msg, ?array $data = null): void
{
    $r = ['success' => $ok, 'message' => $msg];
    if ($data !== null) {
        $r['data'] = $data;
    }
    echo json_encode($r);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    peso_require_staff($conn);

    $status = isset($_GET['status']) ? trim((string) $_GET['status']) : 'All';
    $validStatuses = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled'];

    $where = '';
    if ($status !== 'All' && in_array($status, $validStatuses, true)) {
        $where = "WHERE isch.status = '" . $conn->real_escape_string($status) . "'";
    }

    $sql = "
        SELECT isch.interview_id, isch.interview_date, isch.interview_type, isch.location_or_link,
               isch.status, isch.result, isch.parent_confirmed, isch.helper_confirmed,
               jp.title AS job_title,
               CONCAT(hu.first_name, ' ', hu.last_name) AS helper_name,
               CONCAT(pu.first_name, ' ', pu.last_name) AS employer_name
        FROM interview_schedules isch
        INNER JOIN job_applications ja ON ja.application_id = isch.application_id
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        INNER JOIN users hu ON hu.user_id = ja.helper_id
        INNER JOIN users pu ON pu.user_id = jp.parent_id
        $where
        ORDER BY isch.interview_date DESC
        LIMIT 200
    ";
    $res = $conn->query($sql);
    if (!$res) {
        throw new Exception('Query failed: ' . $conn->error);
    }

    $list = [];
    while ($row = $res->fetch_assoc()) {
        $list[] = [
            'interview_id' => (int) $row['interview_id'],
            'code' => 'INT-' . (int) $row['interview_id'],
            'job_title' => $row['job_title'],
            'helper_name' => trim($row['helper_name']),
            'employer_name' => trim($row['employer_name']),
            'interview_date' => $row['interview_date'],
            'interview_type' => $row['interview_type'],
            'location_or_link' => $row['location_or_link'],
            'status' => $row['status'],
            'result' => $row['result'],
            'parent_confirmed' => (bool) $row['parent_confirmed'],
            'helper_confirmed' => (bool) $row['helper_confirmed'],
        ];
    }
    $res->free();

    out(true, 'OK', ['interviews' => $list]);
} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
