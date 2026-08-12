<?php
// carelink_api/parent/respond_invite.php
// The helper accepts or declines a job invitation sent by an employer.
// On accept: marks the invite accepted and notifies the employer (the helper can
//   then tap the invite in chat to open the job and apply).
// On decline: marks it declined and notifies the employer.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);
ob_start();
require_once '../dbcon.php';
require_once '../shared/create_notification.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/job_invites_table.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

try {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) throw new Exception('Invalid JSON');

    $message_id = isset($body['message_id']) ? intval($body['message_id']) : 0;
    $helper_id  = isset($body['helper_id'])  ? intval($body['helper_id'])  : 0;
    $action     = isset($body['action'])     ? strtolower(trim($body['action'])) : '';

    if (!$message_id || !$helper_id) throw new Exception('message_id and helper_id are required');
    if (!in_array($action, ['accept', 'decline'], true)) throw new Exception('action must be accept or decline');

    $requester_id = isset($body['requester_id']) ? intval($body['requester_id']) : 0;
    carelink_require_self($requester_id, $helper_id, 'You are not allowed to respond to this invitation.');

    ensure_job_invites_table($conn);

    // ── Load the invite (must belong to this helper) ────────────────────────
    $stmt = $conn->prepare(
        "SELECT invite_id, job_post_id, parent_id, helper_id, status
         FROM job_invites WHERE message_id = ? LIMIT 1"
    );
    $stmt->bind_param("i", $message_id);
    $stmt->execute();
    $invite = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$invite) throw new Exception('Invitation not found');
    if (intval($invite['helper_id']) !== $helper_id) throw new Exception('This invitation is not addressed to you.');

    $job_post_id = intval($invite['job_post_id']);
    $parent_id   = intval($invite['parent_id']);
    $newStatus   = $action === 'accept' ? 'accepted' : 'declined';

    // Already responded — return the existing state without re-notifying.
    if ($invite['status'] !== 'pending') {
        sendResponse(true, 'Invitation already responded to.', [
            'status' => $invite['status'], 'job_post_id' => $job_post_id,
        ]);
    }

    // Defence in depth: a helper may only accept a post PESO has approved.
    //
    // Delivery already withholds a direct-hire offer until approval, so this
    // should be unreachable through the UI. It exists because "the helper
    // agreed to these terms" is the fact a contract is built on — if that can
    // ever attach to unvetted terms, the whole review step is decorative. A
    // guard on the thing being protected costs nothing and cannot be bypassed
    // by a crafted request or a future change to the delivery path.
    if ($action === 'accept') {
        $jobStmt = $conn->prepare("SELECT status FROM job_posts WHERE job_post_id = ? LIMIT 1");
        if ($jobStmt) {
            $jobStmt->bind_param('i', $job_post_id);
            $jobStmt->execute();
            $jobRow = $jobStmt->get_result()->fetch_assoc();
            $jobStmt->close();
            if (!$jobRow || $jobRow['status'] !== 'Open') {
                throw new Exception('This job is still being reviewed by PESO. You can accept once it is approved.');
            }
        }
    }

    // ── Update status ───────────────────────────────────────────────────────
    $stmt = $conn->prepare("UPDATE job_invites SET status = ?, responded_at = NOW() WHERE invite_id = ?");
    $stmt->bind_param("si", $newStatus, $invite['invite_id']);
    $stmt->execute();
    $stmt->close();

    // ── Names for the notification ──────────────────────────────────────────
    $stmt = $conn->prepare("SELECT first_name, last_name FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $helper_id);
    $stmt->execute();
    $helper = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $helperName = $helper ? trim($helper['first_name'] . ' ' . $helper['last_name']) : 'A helper';

    $stmt = $conn->prepare("SELECT title FROM job_posts WHERE job_post_id = ?");
    $stmt->bind_param("i", $job_post_id);
    $stmt->execute();
    $jp = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $jobTitle = $jp ? $jp['title'] : 'your job';

    // ── Notify the employer ─────────────────────────────────────────────────
    if ($action === 'accept') {
        createNotification(
            $conn, $parent_id, 'job_invite',
            'Invitation Accepted',
            "{$helperName} accepted your invitation for \"{$jobTitle}\" and can now apply.",
            'job', $job_post_id
        );
    } else {
        createNotification(
            $conn, $parent_id, 'job_invite',
            'Invitation Declined',
            "{$helperName} declined your invitation for \"{$jobTitle}\".",
            'job', $job_post_id
        );
    }

    sendResponse(true, $action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.', [
        'status' => $newStatus, 'job_post_id' => $job_post_id,
    ]);

} catch (Exception $e) {
    sendResponse(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
