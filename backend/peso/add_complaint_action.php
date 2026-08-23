<?php
/**
 * peso/add_complaint_action.php
 *
 * Records what PESO DID, or what it commits to doing next, and moves the case
 * along. Replaces the old Resolve/Dismiss pair, which PESO said was the whole
 * vocabulary the screen offered for work that is actually a sequence of steps.
 *
 * Every entry lands on a tracker that BOTH the complainant and the respondent
 * can see (shared/get_complaint_tracking.php), unless the officer marks it
 * internal. Both parties are notified when a visible entry is added, because a
 * tracker nobody is told about is not tracking.
 *
 * POST { complaint_id, staff_user_id, action_type, title, detail?, due_date?,
 *        internal?, new_status?, escalation_stage? }
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../shared/complaint_tracking_tables.php';
require_once __DIR__ . '/../shared/create_notification.php';

function out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

const CARELINK_ACTION_TYPES = [
    'under_review'      => 'Under review',
    'referred_barangay' => 'Referred to the barangay',
    'referred_dole'     => 'Referred to DOLE',
    'action_planned'    => 'Action to be taken',
    'action_taken'      => 'Action taken',
    'resolved'          => 'Resolved',
    'dismissed'         => 'Dismissed',
];

try {
    if (!$conn) throw new Exception('Database connection failed');

    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $complaintId = (int) ($in['complaint_id'] ?? 0);
    $staffId     = (int) ($in['staff_user_id'] ?? 0);
    $type        = trim((string) ($in['action_type'] ?? ''));
    $title       = trim((string) ($in['title'] ?? ''));
    $detail      = trim((string) ($in['detail'] ?? ''));
    $dueDate     = trim((string) ($in['due_date'] ?? ''));
    $internal    = !empty($in['internal']);
    $newStatus   = trim((string) ($in['new_status'] ?? ''));
    $stage       = trim((string) ($in['escalation_stage'] ?? ''));

    if ($complaintId <= 0) throw new Exception('complaint_id is required.');
    if (!isset(CARELINK_ACTION_TYPES[$type])) throw new Exception('Unknown action type.');
    if ($title === '') throw new Exception('Say what was done, in one line.');
    if ($type === 'action_planned' && $dueDate === '') {
        throw new Exception('An action to be taken needs a target date, or it is not a commitment.');
    }

    peso_validate_staff_actor($conn, $staffId);
    ensure_complaint_tracking_tables($conn);

    $st = $conn->prepare(
        "SELECT complainant_id, respondent_id, subject, status FROM complaints WHERE complaint_id = ? LIMIT 1"
    );
    $st->bind_param('i', $complaintId);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) throw new Exception('Complaint not found.');

    $conn->begin_transaction();
    try {
        $actionId = carelink_log_complaint_action(
            $conn, $complaintId, $staffId, 'peso', $type, $title,
            $detail !== '' ? $detail : null,
            $dueDate !== '' ? $dueDate : null,
            !$internal
        );
        if ($actionId <= 0) throw new Exception('Could not write to the case tracker.');

        // Closing actions carry the status with them, so the tracker and the
        // status column can never disagree about whether a case is finished.
        if ($type === 'resolved' || $type === 'dismissed') {
            $newStatus = $type === 'resolved' ? 'Resolved' : 'Dismissed';
        }
        if ($newStatus !== '') {
            if (!in_array($newStatus, ['Pending', 'Under Review', 'Escalated_PESO', 'Resolved', 'Dismissed'], true)) {
                throw new Exception('Unknown status.');
            }
            $closing = in_array($newStatus, ['Resolved', 'Dismissed'], true);
            $sqlU = $closing
                ? "UPDATE complaints SET status = ?, resolution_notes = ?, resolved_by = ?, resolved_at = NOW(), updated_at = NOW() WHERE complaint_id = ?"
                : "UPDATE complaints SET status = ?, resolution_notes = ?, updated_at = NOW() WHERE complaint_id = ?";
            $u = $conn->prepare($sqlU);
            $notes = $detail !== '' ? $detail : $title;
            if ($closing) $u->bind_param('ssii', $newStatus, $notes, $staffId, $complaintId);
            else          $u->bind_param('ssi', $newStatus, $notes, $complaintId);
            $u->execute();
            $u->close();
        }

        if ($stage !== '') {
            if (!in_array($stage, ['barangay', 'peso', 'dole'], true)) throw new Exception('Unknown escalation stage.');
            $u = $conn->prepare("UPDATE complaints SET escalation_stage = ?, updated_at = NOW() WHERE complaint_id = ?");
            $u->bind_param('si', $stage, $complaintId);
            $u->execute();
            $u->close();
        }

        peso_audit_verification($conn, $staffId, 'COMPLAINT_' . strtoupper($type), 'complaints', $complaintId);
        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

    // Outside the transaction: a failed notification must not erase a recorded
    // action. Internal notes notify nobody — that is the point of marking them.
    if (!$internal) {
        $label = CARELINK_ACTION_TYPES[$type];
        $body  = $title . ($detail !== '' ? ' — ' . $detail : '');
        foreach ([(int) $row['complainant_id'], (int) $row['respondent_id']] as $uid) {
            if ($uid > 0) {
                createNotification(
                    $conn, $uid, 'complaint_update',
                    'Case update: ' . $label,
                    'Your case "' . $row['subject'] . '" has an update from PESO. ' . $body,
                    'complaint', $complaintId
                );
            }
        }
    }

    out(true, $internal
        ? 'Internal note saved. The parties were not notified.'
        : 'Recorded. Both parties can see this on their case tracker and have been notified.',
        ['action_id' => $actionId]);

} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
