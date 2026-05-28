<?php
/**
 * GET /api/v1/applications/attendance_month.php
 * ?application_id=&user_id=&user_type=parent|helper&year=&month=
 * Returns full calendar month merged with attendance, rest_days, special_days, tasks per day, leave balance.
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
    $year = isset($_GET['year']) ? (int) $_GET['year'] : 0;
    $month = isset($_GET['month']) ? (int) $_GET['month'] : 0;

    if ($application_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent', 'helper'], true)) {
        json_out(['success' => false, 'message' => 'application_id, user_id, user_type required'], 400);
    }

    if ($year < 2000 || $year > 2100 || $month < 1 || $month > 12) {
        json_out(['success' => false, 'message' => 'year and month (1-12) required'], 400);
    }

    if (!carelink_v1_assert_can_view_attendance($conn, $application_id, $user_id, $user_type)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $extras = carelink_attendance_load_contract_extras($conn, $application_id);
    $first = sprintf('%04d-%02d-01', $year, $month);
    $last = date('Y-m-t', strtotime($first . ' 12:00:00'));

    $monthDays = carelink_attendance_merge_month($conn, $application_id, $year, $month, $extras);
    $tasksMap = carelink_attendance_tasks_completed_by_date($conn, $application_id, $first, $last);

    foreach ($monthDays as $i => $d) {
        $dt = $d['date'] ?? '';
        $monthDays[$i]['tasks_completed'] = isset($tasksMap[$dt]) ? (int) $tasksMap[$dt] : 0;
        $monthDays[$i]['checked_in_at'] = $d['check_in_at'] ?? null;
        $monthDays[$i]['checked_out_at'] = $d['check_out_at'] ?? null;
    }

    $lb = carelink_attendance_leave_balance($conn, $application_id, $year, $extras['vacation_days']);
    $summary = carelink_attendance_month_summary($monthDays);

    json_out([
        'success' => true,
        'year' => $year,
        'month' => $month,
        'month_start' => $first,
        'month_end' => $last,
        'employment_start_date' => $extras['employment_start_date'] ?? null,
        'employment_end_date' => $extras['employment_end_date'] ?? null,
        'rest_days' => $extras['rest_day'],
        'special_days' => $extras['special_days'],
        'vacation_days_limit' => $extras['vacation_days'],
        'leave_balance' => [
            'used' => $lb['used'],
            'limit' => $lb['limit'],
            'remaining' => $lb['remaining'],
        ],
        'summary' => $summary,
        'days' => $monthDays,
    ]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
