<?php
/**
 * GET /api/v1/attendance/today
 * ?application_id=&helper_id=
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../lib/attendance_rest_day.php';
require_once __DIR__ . '/../lib/attendance_calendar.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;

    if ($application_id <= 0 || $helper_id <= 0) {
        json_out(['success' => false, 'message' => 'application_id and helper_id required'], 400);
    }

    $hire = carelink_v1_load_hire($conn, $application_id);
    if (!$hire || (int) $hire['helper_id'] !== $helper_id) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $today = date('Y-m-d');
    $is_rest = carelink_attendance_today_is_rest_day($conn, $application_id);

    $wh = null;
    $ws = 'Full-time';
    $stJ = $conn->prepare('
        SELECT jp.work_hours, jp.work_schedule
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ?
        LIMIT 1
    ');
    if ($stJ) {
        $stJ->bind_param('i', $application_id);
        $stJ->execute();
        $jr = $stJ->get_result()->fetch_assoc();
        $stJ->close();
        if ($jr) {
            $wh = $jr['work_hours'] ?? null;
            $ws = isset($jr['work_schedule']) && trim((string) $jr['work_schedule']) !== ''
                ? trim((string) $jr['work_schedule'])
                : 'Full-time';
        }
    }
    $expected_shift_end_at = carelink_expected_shift_end_at($today, is_string($wh) ? $wh : null, $ws);

    $st = $conn->prepare("
        SELECT id, `date`, status, checked_in_at, checked_out_at, note
        FROM attendance_logs
        WHERE application_id = ? AND `date` = ?
        LIMIT 1
    ");
    $st->bind_param('is', $application_id, $today);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    json_out([
        'success' => true,
        'data' => [
            'date' => $today,
            'is_rest_day' => $is_rest,
            'checked_in' => $row ? (bool) $row['checked_in_at'] : false,
            'checked_out' => $row ? (bool) $row['checked_out_at'] : false,
            'checked_in_at' => $row ? ($row['checked_in_at'] ?? null) : null,
            'checked_out_at' => $row ? ($row['checked_out_at'] ?? null) : null,
            'status' => $row ? ($row['status'] ?? null) : null,
            'log_id' => $row ? (int) $row['id'] : null,
            'expected_shift_end_at' => $expected_shift_end_at,
        ],
    ]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
