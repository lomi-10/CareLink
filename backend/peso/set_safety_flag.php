<?php
/**
 * peso/set_safety_flag.php — issue or lift a PUBLIC safety label on an account.
 *
 * PESO asked to mark accounts with confirmed issues so that, for example, an
 * employer browsing helpers can see the marking. That is a reasonable safety
 * goal and it is also the most damaging thing this system can do to a person:
 * for a kasambahay it can end their ability to find work, and for a household
 * it is a public accusation. So the rules below are enforced HERE, on the
 * server, not merely suggested in the UI:
 *
 *  1. ONLY FROM A RESOLVED CASE. A label requires a complaint whose status is
 *     'Resolved' — PESO having actually upheld the finding. An open or
 *     dismissed case cannot produce one. Publishing an unproven allegation is
 *     the specific harm this guard exists to prevent.
 *
 *  2. NO NARRATIVE, NO NAMES. public_reason is a short officer-written line and
 *     is the ONLY text ever shown publicly. The description and the
 *     complainant's identity are never published — the reporter is frequently
 *     the more vulnerable party and naming them invites retaliation.
 *
 *  3. SYMMETRIC. Employers can be labelled exactly as helpers can. A
 *     one-directional system would be a blacklist for workers.
 *
 *  4. LIFTABLE, WITH A TRAIL. Lifting sets lifted_at rather than deleting, so a
 *     label issued in error leaves a record.
 *
 * POST { action: 'issue'|'lift', user_id?, complaint_id?, level?, public_reason?,
 *        internal_note?, safety_flag_id?, lift_reason?, staff_user_id }
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

try {
    if (!$conn) throw new Exception('Database connection failed');

    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $action  = trim((string) ($in['action'] ?? 'issue'));
    $staffId = (int) ($in['staff_user_id'] ?? 0);

    peso_validate_staff_actor($conn, $staffId);
    ensure_user_safety_flags_table($conn);
    ensure_complaint_tracking_tables($conn);

    if ($action === 'lift') {
        $flagId  = (int) ($in['safety_flag_id'] ?? 0);
        $reason  = trim((string) ($in['lift_reason'] ?? ''));
        if ($flagId <= 0) throw new Exception('safety_flag_id is required.');
        if ($reason === '') throw new Exception('Say why the label is being lifted — it stays on the record.');

        $q = $conn->prepare("SELECT user_id FROM user_safety_flags WHERE safety_flag_id = ? AND lifted_at IS NULL LIMIT 1");
        $q->bind_param('i', $flagId);
        $q->execute();
        $row = $q->get_result()->fetch_assoc();
        $q->close();
        if (!$row) throw new Exception('That label does not exist or was already lifted.');

        $u = $conn->prepare("UPDATE user_safety_flags SET lifted_at = NOW(), lifted_by = ?, lift_reason = ? WHERE safety_flag_id = ?");
        $u->bind_param('isi', $staffId, $reason, $flagId);
        $u->execute();
        $u->close();

        peso_audit_verification($conn, $staffId, 'SAFETY_FLAG_LIFT', 'complaints', $flagId);

        createNotification($conn, (int) $row['user_id'], 'account_verified',
            'Your account marking has been removed',
            'PESO has lifted the safety marking on your CareLink account. It is no longer shown to other users.',
            'account', (int) $row['user_id']);

        out(true, 'Label lifted. It is no longer shown to other users.');
    }

    // ── Issue ───────────────────────────────────────────────────────────────
    $userId      = (int) ($in['user_id'] ?? 0);
    $complaintId = (int) ($in['complaint_id'] ?? 0);
    $level       = trim((string) ($in['level'] ?? 'caution'));
    $publicReason= trim((string) ($in['public_reason'] ?? ''));
    $internalNote= trim((string) ($in['internal_note'] ?? ''));

    if ($userId <= 0) throw new Exception('user_id is required.');
    if (!in_array($level, ['caution', 'serious'], true)) throw new Exception('Level must be caution or serious.');
    if ($publicReason === '') throw new Exception('A short public reason is required — it is the only text other users will see.');
    if (mb_strlen($publicReason) > 200) throw new Exception('Keep the public reason under 200 characters.');

    // GUARD 1 — the label must come from a case PESO actually upheld.
    if ($complaintId <= 0) throw new Exception('A resolved complaint must be cited.');
    $q = $conn->prepare("SELECT status, respondent_id, subject FROM complaints WHERE complaint_id = ? LIMIT 1");
    $q->bind_param('i', $complaintId);
    $q->execute();
    $c = $q->get_result()->fetch_assoc();
    $q->close();
    if (!$c) throw new Exception('Complaint not found.');
    if ($c['status'] !== 'Resolved') {
        throw new Exception('This case is ' . strtolower((string) $c['status'])
            . '. A public marking can only be issued from a complaint PESO has resolved with a confirmed finding.');
    }
    if ((int) $c['respondent_id'] !== $userId) {
        throw new Exception('That account is not the party reported in this case.');
    }

    // Only helper and employer accounts are browsable, so only they can carry one.
    $q = $conn->prepare("SELECT user_type FROM users WHERE user_id = ? LIMIT 1");
    $q->bind_param('i', $userId);
    $q->execute();
    $ur = $q->get_result()->fetch_assoc();
    $q->close();
    if (!$ur) throw new Exception('Account not found.');
    if (!in_array($ur['user_type'], ['helper', 'parent'], true)) {
        throw new Exception('Only helper and employer accounts can carry a public marking.');
    }

    // One active label per account. Re-issuing supersedes the old one rather
    // than stacking, so a profile can never show two contradictory markings.
    $conn->query("UPDATE user_safety_flags SET lifted_at = NOW(), lifted_by = " . (int) $staffId
        . ", lift_reason = 'Superseded by a newer marking' WHERE user_id = " . (int) $userId . " AND lifted_at IS NULL");

    $ins = $conn->prepare(
        'INSERT INTO user_safety_flags (user_id, complaint_id, level, public_reason, internal_note, issued_by)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $noteOrNull = $internalNote !== '' ? $internalNote : null;
    $ins->bind_param('iisssi', $userId, $complaintId, $level, $publicReason, $noteOrNull, $staffId);
    $ins->execute();
    $flagId = (int) $ins->insert_id;
    $ins->close();

    // The marking is part of the case history, and the parties can see it —
    // a public consequence should never be invisible on the record that caused it.
    carelink_log_complaint_action(
        $conn, $complaintId, $staffId, 'peso', 'action_taken',
        ($level === 'serious' ? 'Serious' : 'Caution') . ' marking placed on the reported account',
        'Other users will see: "' . $publicReason . '"',
        null, true
    );

    peso_audit_verification($conn, $staffId, 'SAFETY_FLAG_ISSUE_' . strtoupper($level), 'complaints', $flagId);

    // The person is told plainly, including what others will see and how to
    // contest it. Being labelled without being told is indefensible.
    createNotification($conn, $userId, 'account_rejected',
        'A safety marking was placed on your account',
        'Following PESO\'s review of a complaint, your CareLink account now carries a '
            . ($level === 'serious' ? 'serious' : 'caution') . ' marking that other users can see. '
            . 'It reads: "' . $publicReason . '". Contact PESO Ormoc if you believe this is wrong.',
        'account', $userId);

    out(true, 'Marking issued. Other users will now see it on this account.', [
        'safety_flag_id' => $flagId,
        'level'          => $level,
    ]);

} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
