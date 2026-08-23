<?php
/**
 * peso/get_complaint_detail.php — the full case file for one complaint.
 *
 * Returns the incident facts (what / when / where / how), both parties with
 * their history, the action tracker, any safety label already issued, and the
 * escalation ladder.
 *
 * GET ?complaint_id=..&staff_user_id=..   (staff only)
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../shared/complaint_tracking_tables.php';

function out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    peso_require_staff($conn);
    ensure_complaint_tracking_tables($conn);
    ensure_user_safety_flags_table($conn);

    $id = (int) ($_GET['complaint_id'] ?? 0);
    if ($id <= 0) throw new Exception('complaint_id is required.');

    $sql = "
        SELECT c.*,
               TRIM(CONCAT(COALESCE(cu.first_name,''),' ',COALESCE(cu.last_name,''))) AS complainant_name,
               cu.user_type AS complainant_type, cu.email AS complainant_email, cu.phone AS complainant_phone,
               TRIM(CONCAT(COALESCE(ru.first_name,''),' ',COALESCE(ru.last_name,''))) AS respondent_name,
               ru.user_type AS respondent_type, ru.email AS respondent_email, ru.phone AS respondent_phone,
               ru.status AS respondent_account_status,
               COALESCE(rhp.barangay, rpp.barangay)         AS respondent_barangay,
               COALESCE(rhp.municipality, rpp.municipality) AS respondent_municipality,
               COALESCE(rhp.province, rpp.province)         AS respondent_province,
               COALESCE(rhp.verification_status, rpp.verification_status) AS respondent_verification,
               COALESCE(chp.barangay, cpp.barangay)         AS complainant_barangay,
               COALESCE(chp.municipality, cpp.municipality) AS complainant_municipality,
               jp.title AS job_title,
               TRIM(CONCAT(COALESCE(res.first_name,''),' ',COALESCE(res.last_name,''))) AS resolved_by_name
        FROM complaints c
        LEFT JOIN users cu ON cu.user_id = c.complainant_id
        LEFT JOIN users ru ON ru.user_id = c.respondent_id
        LEFT JOIN helper_profiles rhp ON rhp.user_id = c.respondent_id
        LEFT JOIN parent_profiles rpp ON rpp.user_id = c.respondent_id
        LEFT JOIN helper_profiles chp ON chp.user_id = c.complainant_id
        LEFT JOIN parent_profiles cpp ON cpp.user_id = c.complainant_id
        LEFT JOIN placements p ON p.placement_id = c.placement_id
        LEFT JOIN job_posts jp ON jp.job_post_id = p.job_post_id
        LEFT JOIN users res ON res.user_id = c.resolved_by
        WHERE c.complaint_id = ? LIMIT 1";

    $st = $conn->prepare($sql);
    if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
    $st->bind_param('i', $id);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$r) throw new Exception('Complaint not found.');

    $respondentId  = (int) ($r['respondent_id'] ?? 0);
    $complainantId = (int) ($r['complainant_id'] ?? 0);

    // Prior history on the person being reported — the single most useful thing
    // an officer can know. A first complaint and a fifth are different cases.
    $priorAgainst = 0;
    $priorUpheld  = 0;
    if ($respondentId > 0) {
        $q = $conn->prepare("SELECT COUNT(*) n FROM complaints WHERE respondent_id = ? AND complaint_id <> ?");
        $q->bind_param('ii', $respondentId, $id);
        $q->execute();
        $priorAgainst = (int) ($q->get_result()->fetch_assoc()['n'] ?? 0);
        $q->close();

        $q = $conn->prepare("SELECT COUNT(*) n FROM complaints WHERE respondent_id = ? AND complaint_id <> ? AND status = 'Resolved'");
        $q->bind_param('ii', $respondentId, $id);
        $q->execute();
        $priorUpheld = (int) ($q->get_result()->fetch_assoc()['n'] ?? 0);
        $q->close();
    }

    $timeline = carelink_complaint_timeline($conn, $id, false);

    // Seed the tracker for cases filed before it existed, so every case shows a
    // start rather than an empty panel.
    if (empty($timeline)) {
        carelink_log_complaint_action(
            $conn, $id, null, 'system', 'received',
            'Complaint received',
            'Filed by the complainant through the CareLink app.',
            null, true
        );
        $timeline = carelink_complaint_timeline($conn, $id, false);
    }

    $flag = null;
    if ($respondentId > 0) {
        $fq = $conn->prepare(
            "SELECT safety_flag_id, level, public_reason, internal_note, issued_at, lifted_at
             FROM user_safety_flags WHERE user_id = ? AND lifted_at IS NULL
             ORDER BY issued_at DESC LIMIT 1"
        );
        $fq->bind_param('i', $respondentId);
        $fq->execute();
        $flag = $fq->get_result()->fetch_assoc() ?: null;
        $fq->close();
        if ($flag) $flag['safety_flag_id'] = (int) $flag['safety_flag_id'];
    }

    // The real-world ladder. Barangay is not integrated — an officer refers by
    // hand and records it here — so it is reported as available-but-manual
    // rather than pretended to be a system step.
    $stage = $r['escalation_stage'] ?: 'peso';

    // Barangay and DOLE are marked done only when a referral was ACTUALLY
    // recorded, not inferred from the current stage. Cases reach PESO by admin
    // forward without ever passing a barangay, and the first version of this
    // ladder inferred "done" from stage = 'peso' — telling an officer a referral
    // had happened when it never did. A ladder that lies is worse than no ladder.
    $referred = ['barangay' => false, 'dole' => false];
    foreach ($timeline as $t) {
        if ($t['action_type'] === 'referred_barangay') $referred['barangay'] = true;
        if ($t['action_type'] === 'referred_dole')     $referred['dole'] = true;
    }
    $ladderState = function (string $key) use ($stage, $referred) {
        if ($stage === $key) return 'active';
        if (!empty($referred[$key])) return 'done';
        return 'todo';
    };

    $ladder = [
        ['key' => 'barangay', 'label' => 'Barangay', 'note' => 'Referred by hand — not yet integrated with CareLink.',
         'state' => $ladderState('barangay')],
        ['key' => 'peso', 'label' => 'PESO Ormoc', 'note' => 'Handled in this screen.',
         'state' => $stage === 'peso' ? 'active' : 'done'],
        ['key' => 'dole', 'label' => 'DOLE', 'note' => 'For cases beyond PESO’s authority.',
         'state' => $ladderState('dole')],
    ];

    $addr = fn(...$parts) => trim(implode(', ', array_filter(array_map('trim', array_filter($parts))))) ?: null;

    out(true, 'ok', [
        'complaint' => [
            'complaint_id'    => (int) $r['complaint_id'],
            'reference'       => 'GRV-' . str_pad((string) $r['complaint_id'], 4, '0', STR_PAD_LEFT),
            'category'        => $r['category'],
            'status'          => $r['status'],
            'escalation_stage'=> $stage,
            // The four questions the panel is organised around.
            'subject'         => $r['subject'],       // the WHAT, in one line
            'description'     => $r['description'],   // the HOW, in the reporter's words
            'incident_at'     => $r['incident_at'],   // the WHEN
            'incident_location' => $r['incident_location'],
            'incident_address'  => $addr($r['incident_location'], $r['incident_barangay'], $r['incident_municipality'], $r['incident_province']),
            'incident_barangay' => $r['incident_barangay'],
            'incident_municipality' => $r['incident_municipality'],
            'incident_province' => $r['incident_province'],
            'evidence_file'   => $r['evidence_file'],
            'created_at'      => $r['created_at'],
            'forwarded_at'    => $r['forwarded_at'],
            'admin_forward_note' => $r['admin_forward_note'],
            'resolution_notes'   => $r['resolution_notes'],
            'resolved_at'     => $r['resolved_at'],
            'resolved_by_name'=> trim((string) $r['resolved_by_name']) ?: null,
            'job_title'       => $r['job_title'],
            'placement_id'    => $r['placement_id'] !== null ? (int) $r['placement_id'] : null,
        ],
        'complainant' => [
            'user_id' => $complainantId,
            'name'    => trim((string) $r['complainant_name']),
            'role'    => $r['complainant_type'] === 'helper' ? 'Helper' : ($r['complainant_type'] === 'parent' ? 'Household Employer' : (string) $r['complainant_role']),
            'email'   => $r['complainant_email'],
            'phone'   => $r['complainant_phone'],
            'location'=> $addr($r['complainant_barangay'], $r['complainant_municipality']),
        ],
        'respondent' => [
            'user_id'        => $respondentId ?: null,
            'name'           => trim((string) $r['respondent_name']) ?: null,
            'role'           => $r['respondent_type'] === 'helper' ? 'Helper' : ($r['respondent_type'] === 'parent' ? 'Household Employer' : null),
            'user_type'      => $r['respondent_type'],
            'email'          => $r['respondent_email'],
            'phone'          => $r['respondent_phone'],
            'location'       => $addr($r['respondent_barangay'], $r['respondent_municipality'], $r['respondent_province']),
            'verification'   => $r['respondent_verification'],
            'account_status' => $r['respondent_account_status'],
            'prior_complaints' => $priorAgainst,
            'prior_upheld'     => $priorUpheld,
        ],
        'timeline'     => $timeline,
        'safety_flag'  => $flag,
        'escalation'   => $ladder,
    ]);

} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
