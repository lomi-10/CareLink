<?php
/**
 * PATCH /api/v1/leave-requests/respond.php
 * JSON: leave_request_id, user_id (parent), status: approved|declined, note? (employer response)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PATCH, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../lib/leave_helpers.php';
require_once __DIR__ . '/../../shared/create_notification.php';
require_once __DIR__ . '/../../shared/mysqli_stmt_helpers.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function carelink_leave_format_date_display(string $ymd): string
{
    $t = strtotime($ymd . ' 12:00:00');
    return $t ? date('M j, Y', $t) : $ymd;
}

/** Ensure attendance_logs reflects approved leave for that calendar day. */
function carelink_leave_sync_attendance(mysqli $conn, int $application_id, int $helper_id, string $date_ymd, string $status_val): void
{
    $st = $conn->prepare("
        INSERT INTO attendance_logs (application_id, helper_id, `date`, checked_in_at, checked_out_at, status, note)
        VALUES (?, ?, ?, NULL, NULL, ?, NULL)
        ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            checked_in_at = NULL,
            checked_out_at = NULL,
            updated_at = CURRENT_TIMESTAMP
    ");
    $st->bind_param('iiss', $application_id, $helper_id, $date_ymd, $status_val);
    $st->execute();
    $st->close();
}

function carelink_leave_sync_application_paid_count(mysqli $conn, int $application_id): void
{
    $year = (int) date('Y');
    $used = carelink_leave_count_paid_used_year($conn, $application_id, $year);
    $st = $conn->prepare('UPDATE job_applications SET leave_days_used = ? WHERE application_id = ? LIMIT 1');
    $st->bind_param('ii', $used, $application_id);
    $st->execute();
    $st->close();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if (!in_array($method, ['PATCH', 'POST'], true)) {
        json_out(['success' => false, 'message' => 'PATCH or POST required'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $leave_id = isset($input['leave_request_id']) ? (int) $input['leave_request_id'] : (isset($input['id']) ? (int) $input['id'] : 0);
    if ($leave_id <= 0 && isset($_GET['id'])) {
        $leave_id = (int) $_GET['id'];
    }
    $parent_user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $status_new = isset($input['status']) ? trim((string) $input['status']) : '';
    $response_note = isset($input['note']) ? trim((string) $input['note']) : '';
    if ($response_note === '') {
        $response_note = null;
    } elseif (strlen($response_note) > 500) {
        json_out(['success' => false, 'message' => 'Note too long'], 400);
    }

    if ($leave_id <= 0 || $parent_user_id <= 0) {
        json_out(['success' => false, 'message' => 'leave_request_id and user_id (employer) required'], 400);
    }
    if (!in_array($status_new, ['approved', 'declined'], true)) {
        json_out(['success' => false, 'message' => 'status must be approved or declined'], 400);
    }

    $st = $conn->prepare("
        SELECT id, application_id, helper_id, `date`, status
        FROM leave_requests
        WHERE id = ?
        LIMIT 1
    ");
    $st->bind_param('i', $leave_id);
    $st->execute();
    $lr = $st->get_result();
    $req = $lr instanceof mysqli_result ? $lr->fetch_assoc() : carelink_mysqli_stmt_fetch_assoc($st);
    if ($lr instanceof mysqli_result) {
        $lr->free();
    }
    $st->close();

    if (!$req) {
        json_out(['success' => false, 'message' => 'Leave request not found'], 404);
    }

    $application_id = (int) $req['application_id'];
    if (!carelink_v1_assert_parent_hire($conn, $application_id, $parent_user_id)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    if ($req['status'] !== 'pending') {
        json_out(['success' => false, 'message' => 'This request was already responded to'], 409);
    }

    $now = date('Y-m-d H:i:s');
    $helper_id = (int) $req['helper_id'];
    $date_ymd = (string) $req['date'];

    $is_paid = false;
    if ($status_new === 'approved') {
        $bal = carelink_leave_balance($conn, $application_id);
        $is_paid = $bal['remaining'] > 0;
    }

    if ($status_new === 'approved') {
        $paid_leave_val = $is_paid ? 1 : 0;
        $upd = $conn->prepare("
            UPDATE leave_requests
            SET status = ?, responded_at = ?, responded_by = ?, response_note = ?, paid_leave = ?, updated_at = NOW()
            WHERE id = ? AND status = 'pending'
        ");
        $upd->bind_param('ssisii', $status_new, $now, $parent_user_id, $response_note, $paid_leave_val, $leave_id);
    } else {
        $upd = $conn->prepare("
            UPDATE leave_requests
            SET status = ?, responded_at = ?, responded_by = ?, response_note = ?, updated_at = NOW()
            WHERE id = ? AND status = 'pending'
        ");
        $upd->bind_param('ssisi', $status_new, $now, $parent_user_id, $response_note, $leave_id);
    }

    $upd->execute();
    if ($upd->affected_rows === 0) {
        $upd->close();
        json_out(['success' => false, 'message' => 'Could not update request'], 409);
    }
    $upd->close();

    if ($status_new === 'approved') {
        $att_status = $is_paid ? 'leave' : 'unpaid_leave';
        carelink_leave_sync_attendance($conn, $application_id, $helper_id, $date_ymd, $att_status);
        carelink_leave_sync_application_paid_count($conn, $application_id);
    }

    $date_label = carelink_leave_format_date_display($date_ymd);
    $verb = $status_new === 'approved' ? 'approved' : 'declined';
    $msg = 'Your leave request for ' . $date_label . ' was ' . $verb . '.';
    if ($status_new === 'approved' && !$is_paid) {
        $msg .= ' (Recorded as unpaid leave — paid leave days for this year are already used.)';
    }
    if ($response_note !== null && $status_new === 'declined') {
        $msg .= ' Note: ' . $response_note;
    }

    carelink_create_notification(
        $conn,
        $helper_id,
        'leave_request_responded',
        'Leave request ' . $verb,
        $msg,
        'leave_request',
        $leave_id
    );

    json_out([
        'success' => true,
        'data' => [
            'id' => $leave_id,
            'status' => $status_new,
            'responded_at' => $now,
            'paid_leave' => $status_new === 'approved' ? $is_paid : null,
        ],
    ]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
