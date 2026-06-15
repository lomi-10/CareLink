<?php
/**
 * GET /api/v1/applications/{application_id}/attendance
 * ?application_id=&user_id=&user_type=parent|helper&week_start=Y-m-d (optional, Monday of week to display)
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
require_once __DIR__ . '/../lib/attendance_week.php';
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
    $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';
    $week_start_param = isset($_GET['week_start']) ? trim((string) $_GET['week_start']) : '';
    $history_limit = isset($_GET['limit']) ? min(200, max(0, (int) $_GET['limit'])) : 0;

    if ($application_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent', 'helper'], true)) {
        json_out(['success' => false, 'message' => 'application_id, user_id, user_type required'], 400);
    }

    if (!carelink_v1_assert_can_view_attendance($conn, $application_id, $user_id, $user_type)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $today = date('Y-m-d');
    if ($week_start_param !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $week_start_param)) {
        $monday = carelink_attendance_week_monday($week_start_param);
    } else {
        $monday = carelink_attendance_week_monday($today);
    }

    $days = carelink_attendance_merge_week($conn, $application_id, $monday);
    $extras = carelink_attendance_load_contract_extras($conn, $application_id);

    $logs = null;
    if ($history_limit > 0) {
        $lim = min(200, max(1, $history_limit));
        $st = $conn->prepare("
            SELECT id, `date`, status, checked_in_at, checked_out_at, note, created_at
            FROM attendance_logs
            WHERE application_id = ?
            ORDER BY `date` DESC, id DESC
            LIMIT {$lim}
        ");
        $st->bind_param('i', $application_id);
        $st->execute();
        $res = $st->get_result();
        $logs = [];
        while ($r = $res->fetch_assoc()) {
            $logs[] = [
                'id' => (int) $r['id'],
                'date' => $r['date'],
                'status' => $r['status'],
                'checked_in_at' => $r['checked_in_at'],
                'checked_out_at' => $r['checked_out_at'],
                'note' => $r['note'],
                'created_at' => $r['created_at'],
            ];
        }
        $st->close();
    }

    $out = [
        'success' => true,
        'week_start' => $monday,
        'days' => $days,
        'employment_start_date' => $extras['employment_start_date'] ?? null,
        'employment_end_date' => $extras['employment_end_date'] ?? null,
    ];
    if ($logs !== null) {
        $out['logs'] = $logs;
    }
    json_out($out);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
