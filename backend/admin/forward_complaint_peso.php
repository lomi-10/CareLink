<?php
/**
 * POST JSON: complaint_id, admin_user_id, admin_note? (optional)
 * Sets complaints.status = Escalated_PESO; notifies PESO officers + both parties.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/create_notification.php';

function out($ok, $msg, $extra = [])
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        out(false, 'POST required');
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $complaint_id = isset($input['complaint_id']) ? (int) $input['complaint_id'] : 0;
    $admin_id = isset($input['admin_user_id']) ? (int) $input['admin_user_id'] : 0;
    $admin_note = isset($input['admin_note']) ? trim((string) $input['admin_note']) : '';
    if ($admin_note !== '' && strlen($admin_note) > 2000) {
        $admin_note = substr($admin_note, 0, 2000);
    }

    if ($complaint_id <= 0 || $admin_id <= 0) {
        out(false, 'complaint_id and admin_user_id required');
    }

    $chk = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'admin' LIMIT 1");
    $chk->bind_param('i', $admin_id);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) {
        $chk->close();
        out(false, 'Forbidden');
    }
    $chk->close();

    $st = $conn->prepare('
        SELECT complaint_id, application_id, placement_id, complainant_id, respondent_id, subject, status
        FROM complaints WHERE complaint_id = ? LIMIT 1
    ');
    $st->bind_param('i', $complaint_id);
    $st->execute();
    $c = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$c) {
        out(false, 'Complaint not found');
    }
    if ($c['status'] !== 'Pending') {
        out(false, 'Complaint was already processed');
    }

    $app_id = (int) ($c['application_id'] ?? 0);
    if ($app_id <= 0 && !empty($c['placement_id'])) {
        $pst = $conn->prepare('SELECT application_id FROM placements WHERE placement_id = ? LIMIT 1');
        $pid = (int) $c['placement_id'];
        $pst->bind_param('i', $pid);
        $pst->execute();
        $prow = $pst->get_result()->fetch_assoc();
        $pst->close();
        if ($prow && $prow['application_id']) {
            $app_id = (int) $prow['application_id'];
        }
    }

    $complainant = (int) $c['complainant_id'];
    $other = (int) ($c['respondent_id'] ?? 0);
    if ($other <= 0 && $app_id > 0) {
        $hire = $conn->prepare('SELECT helper_id, parent_id FROM job_applications ja INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id WHERE ja.application_id = ? LIMIT 1');
        $hire->bind_param('i', $app_id);
        $hire->execute();
        $hrow = $hire->get_result()->fetch_assoc();
        $hire->close();
        if ($hrow) {
            $helper_id = (int) $hrow['helper_id'];
            $parent_id = (int) $hrow['parent_id'];
            $other = $complainant === $parent_id ? $helper_id : $parent_id;
        }
    }

    $now = date('Y-m-d H:i:s');
    $note = $admin_note === '' ? null : $admin_note;
    $upd = $conn->prepare('
        UPDATE complaints
        SET status = \'Escalated_PESO\',
            admin_forward_note = ?,
            forwarded_by_admin_id = ?,
            forwarded_at = ?,
            updated_at = NOW()
        WHERE complaint_id = ? AND status = \'Pending\'
    ');
    $upd->bind_param('sisi', $note, $admin_id, $now, $complaint_id);
    $upd->execute();
    if ($upd->affected_rows === 0) {
        $upd->close();
        out(false, 'Could not update complaint');
    }
    $upd->close();

    $subj = (string) $c['subject'];
    $pid = (int) ($c['placement_id'] ?? 0);
    $refLabel = $app_id > 0 ? ('application #' . $app_id) : ($pid > 0 ? 'placement #' . $pid : 'a reported profile');
    $pesoTitle = 'PESO review required';
    $pesoMsg = 'Super Admin escalated a complaint regarding ' . $refLabel . ': ' . $subj;
    $st2 = $conn->prepare("SELECT user_id FROM users WHERE user_type = 'peso'");
    $st2->execute();
    $r2 = $st2->get_result();
    while ($r2 && ($u = $r2->fetch_assoc())) {
        $uid = (int) $u['user_id'];
        if ($uid > 0) {
            carelink_create_notification($conn, $uid, 'complaint_escalated_peso', $pesoTitle, $pesoMsg, 'complaint', $complaint_id);
        }
    }
    if ($r2) {
        $r2->free();
    }
    $st2->close();

    $partyTitle = 'Complaint forwarded to PESO';
    $partyMsg = 'Your CareLink complaint (“' . $subj . '”) was reviewed and forwarded to PESO for follow-up. You may be contacted by staff.';
    carelink_create_notification($conn, $complainant, 'complaint_escalated_notice', $partyTitle, $partyMsg, 'complaint', $complaint_id);
    if ($other > 0) {
        carelink_create_notification($conn, $other, 'complaint_escalated_notice', $partyTitle, 'A complaint on your shared placement was forwarded to PESO for review.', 'complaint', $complaint_id);
    }

    out(true, 'Forwarded to PESO and users notified.');
} catch (Exception $e) {
    out(false, $e->getMessage());
}
