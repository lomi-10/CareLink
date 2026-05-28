<?php
/**
 * POST /api/v1/attendance/checkin
 * JSON: application_id, helper_id (users.user_id)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../lib/attendance_rest_day.php';
require_once __DIR__ . '/../lib/attendance_calendar.php';
require_once __DIR__ . '/../../shared/create_notification.php';
require_once __DIR__ . '/../../shared/mysqli_stmt_helpers.php';

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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_out(['success' => false, 'message' => 'POST required'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $helper_id = isset($input['helper_id']) ? (int) $input['helper_id'] : 0;

    if ($application_id <= 0 || $helper_id <= 0) {
        json_out(['success' => false, 'message' => 'application_id and helper_id required'], 400);
    }

    $hire = carelink_v1_load_hire($conn, $application_id);
    if (!$hire || (int) $hire['helper_id'] !== $helper_id) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    if (carelink_attendance_today_is_rest_day($conn, $application_id)) {
        json_out(['success' => false, 'message' => 'Cannot check in on a scheduled rest day (contract).'], 422);
    }

    $specialToday = carelink_attendance_today_special_block($conn, $application_id);
    if ($specialToday !== null) {
        $label = $specialToday['type'] === 'holiday' ? 'employer-marked holiday' : 'no-work day';
        json_out(['success' => false, 'message' => 'Cannot check in on a ' . $label . ' (contract).'], 422);
    }

    $today = date('Y-m-d');
    $now = date('Y-m-d H:i:s');

    $st = $conn->prepare("
        SELECT id, checked_in_at, checked_out_at, status
        FROM attendance_logs
        WHERE application_id = ? AND `date` = ?
        LIMIT 1
    ");
    $st->bind_param('is', $application_id, $today);
    $st->execute();
    $er = $st->get_result();
    $existing = $er instanceof mysqli_result ? $er->fetch_assoc() : carelink_mysqli_stmt_fetch_assoc($st);
    if ($er instanceof mysqli_result) {
        $er->free();
    }
    $st->close();

    if ($existing && $existing['checked_in_at']) {
        json_out(['success' => false, 'message' => 'Already checked in today'], 409);
    }

    if ($existing && !$existing['checked_in_at'] && in_array($existing['status'], ['leave', 'unpaid_leave', 'holiday', 'absent'], true)) {
        json_out([
            'success' => false,
            'message' => 'Attendance for today is marked as ' . $existing['status'] . '. Contact your employer if this is wrong.',
        ], 409);
    }

    if ($existing) {
        $upd = $conn->prepare("
            UPDATE attendance_logs
            SET checked_in_at = ?, status = 'present', updated_at = NOW()
            WHERE id = ? AND checked_in_at IS NULL
        ");
        $eid = (int) $existing['id'];
        $upd->bind_param('si', $now, $eid);
        $upd->execute();
        if ($upd->affected_rows === 0) {
            $upd->close();
            json_out(['success' => false, 'message' => 'Could not check in'], 409);
        }
        $upd->close();
        $log_id = $eid;
    } else {
        $ins = $conn->prepare("
            INSERT INTO attendance_logs (application_id, helper_id, `date`, checked_in_at, checked_out_at, status, note)
            VALUES (?, ?, ?, ?, NULL, 'present', NULL)
        ");
        $ins->bind_param('iiss', $application_id, $helper_id, $today, $now);
        if (!$ins->execute()) {
            if ($conn->errno === 1062) {
                json_out(['success' => false, 'message' => 'Already checked in today'], 409);
            }
            throw new Exception('Insert failed');
        }
        $log_id = (int) $conn->insert_id;
        $ins->close();
    }

    $parent_id = (int) $hire['parent_id'];
    $hn = $conn->prepare("SELECT TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS n FROM users WHERE user_id = ? LIMIT 1");
    $hn->bind_param('i', $helper_id);
    $hn->execute();
    $hr = $hn->get_result();
    $hrow = $hr instanceof mysqli_result ? $hr->fetch_assoc() : carelink_mysqli_stmt_fetch_assoc($hn);
    if ($hr instanceof mysqli_result) {
        $hr->free();
    }
    $hn->close();
    $helper_name = trim((string) ($hrow['n'] ?? 'Helper'));
    if ($helper_name === '') {
        $helper_name = 'Helper';
    }
    $timeLabel = date('g:i A', strtotime($now));
    $msg = $helper_name . ' checked in at ' . $timeLabel;
    carelink_create_notification(
        $conn,
        $parent_id,
        'attendance_checkin',
        'Helper checked in',
        $msg,
        'attendance_log',
        $log_id
    );

    json_out(['success' => true, 'data' => ['checked_in_at' => $now, 'date' => $today]]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
