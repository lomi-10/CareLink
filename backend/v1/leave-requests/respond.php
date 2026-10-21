<?php
/**
 * PATCH /api/v1/leave-requests/respond.php
 * JSON: leave_request_id, user_id (parent), status: approved|declined, note? (employer response)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PATCH, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
            status = IF(
                status IN ('present', 'holiday', 'rest', 'no_work') OR checked_in_at IS NOT NULL,
                status,
                VALUES(status)
            ),
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
    $transactionStarted = false;
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

    carelink_leave_ensure_entitlement_schema($conn);
    $st = $conn->prepare("SELECT application_id FROM leave_requests WHERE id = ? LIMIT 1");
    $st->bind_param('i', $leave_id);
    $st->execute();
    $req = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$req) {
        json_out(['success' => false, 'message' => 'Leave request not found'], 404);
    }

    $application_id = (int) $req['application_id'];
    $conn->begin_transaction();
    $transactionStarted = true;
    $lock = $conn->prepare('SELECT application_id FROM job_applications WHERE application_id = ? FOR UPDATE');
    $lock->bind_param('i', $application_id);
    $lock->execute();
    $placement = $lock->get_result()->fetch_assoc();
    $lock->close();
    if (!$placement || !carelink_v1_assert_parent_hire($conn, $application_id, $parent_user_id)) {
        $conn->rollback();
        $transactionStarted = false;
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $st = $conn->prepare("
        SELECT id, application_id, helper_id, `date`, reason_code, status
        FROM leave_requests
        WHERE id = ? AND application_id = ?
        FOR UPDATE
    ");
    $st->bind_param('ii', $leave_id, $application_id);
    $st->execute();
    $req = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$req) {
        $conn->rollback();
        $transactionStarted = false;
        json_out(['success' => false, 'message' => 'Leave request not found'], 404);
    }
    if ($req['status'] !== 'pending') {
        $conn->rollback();
        $transactionStarted = false;
        json_out(['success' => false, 'message' => 'This request was already responded to'], 409);
    }

    $now = date('Y-m-d H:i:s');
    $helper_id = (int) $req['helper_id'];
    $date_ymd = (string) $req['date'];
    $paidSource = null;

    if ($status_new === 'approved') {
        $validationError = carelink_leave_validate_work_day($conn, $application_id, $date_ymd);
        if ($validationError !== null) {
            $conn->rollback();
            $transactionStarted = false;
            json_out(['success' => false, 'message' => $validationError], 409);
        }

        $duplicate = $conn->prepare("
            SELECT id
            FROM leave_requests
            WHERE application_id = ? AND `date` = ? AND id <> ? AND status = 'approved'
            LIMIT 1
            FOR UPDATE
        ");
        $duplicate->bind_param('isi', $application_id, $date_ymd, $leave_id);
        $duplicate->execute();
        $duplicateRow = $duplicate->get_result()->fetch_assoc();
        $duplicate->close();
        if ($duplicateRow) {
            $conn->rollback();
            $transactionStarted = false;
            json_out(['success' => false, 'message' => 'Another leave request for that date has already been approved.'], 409);
        }

        $attendance = $conn->prepare("
            SELECT status, checked_in_at
            FROM attendance_logs
            WHERE application_id = ? AND `date` = ?
            LIMIT 1
        ");
        $attendance->bind_param('is', $application_id, $date_ymd);
        $attendance->execute();
        $attendanceRow = $attendance->get_result()->fetch_assoc();
        $attendance->close();
        if ($attendanceRow && (
            ($attendanceRow['status'] ?? '') === 'present'
            || !empty($attendanceRow['checked_in_at'])
        )) {
            $conn->rollback();
            $transactionStarted = false;
            json_out([
                'success' => false,
                'message' => 'Attendance is already recorded for that date. Resolve the attendance record before approving leave.',
            ], 409);
        }
        if ($attendanceRow && in_array((string) ($attendanceRow['status'] ?? ''), ['holiday', 'rest', 'no_work'], true)) {
            $conn->rollback();
            $transactionStarted = false;
            json_out(['success' => false, 'message' => 'That date is already recorded as a non-work day.'], 409);
        }

        $bal = carelink_leave_balance($conn, $application_id, $date_ymd);
        $paidSource = carelink_leave_paid_source($bal, (string) $req['reason_code']);
    }

    $is_paid = $paidSource !== null;
    $paid_leave_val = $status_new === 'approved' ? ($is_paid ? 1 : 0) : null;
    $paidSourceForStorage = $status_new === 'approved' ? ($paidSource ?? 'unpaid') : null;
    $upd = $conn->prepare("
        UPDATE leave_requests
        SET status = ?, responded_at = ?, responded_by = ?, response_note = ?,
            paid_leave = ?, paid_leave_source = ?, updated_at = NOW()
        WHERE id = ? AND status = 'pending'
    ");
    $upd->bind_param(
        'ssisisi',
        $status_new,
        $now,
        $parent_user_id,
        $response_note,
        $paid_leave_val,
        $paidSourceForStorage,
        $leave_id
    );
    $upd->execute();
    if ($upd->affected_rows === 0) {
        $upd->close();
        $conn->rollback();
        $transactionStarted = false;
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
    if ($status_new === 'approved' && $is_paid) {
        $sourceLabels = [
            'statutory_sil' => 'statutory Service Incentive Leave',
            'contract_sick' => 'agreed contract sick leave',
            'contract_vacation' => 'agreed contract vacation leave',
        ];
        $msg .= ' Recorded as paid using ' . ($sourceLabels[$paidSource] ?? 'your paid leave allowance') . '.';
    } elseif ($status_new === 'approved') {
        $msg .= ' Recorded as unpaid because no eligible paid allowance remains for this leave reason.';
    }
    if ($response_note !== null && $status_new === 'declined') {
        $msg .= ' Note: ' . $response_note;
    }

    if (!carelink_create_notification(
        $conn,
        $helper_id,
        'leave_request_responded',
        'Leave request ' . $verb,
        $msg,
        'leave_request',
        $leave_id
    )) {
        throw new Exception('Leave decision was not saved because the helper notification could not be created.');
    }

    $conn->commit();
    $transactionStarted = false;

    json_out([
        'success' => true,
        'data' => [
            'id' => $leave_id,
            'status' => $status_new,
            'responded_at' => $now,
            'paid_leave' => $status_new === 'approved' ? $is_paid : null,
            'paid_leave_source' => $status_new === 'approved' ? $paidSourceForStorage : null,
        ],
    ]);
} catch (Throwable $e) {
    if (!empty($transactionStarted) && isset($conn) && $conn) {
        $conn->rollback();
    }
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
