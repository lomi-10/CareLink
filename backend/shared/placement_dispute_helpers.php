<?php
/**
 * Shared validation for complaints & reviews tied to job_applications.
 *
 * @return array<string,mixed>|null
 */
function carelink_load_application_parties(mysqli $conn, int $application_id): ?array
{
    $st = $conn->prepare('
        SELECT ja.application_id, ja.helper_id, ja.status,
               ja.job_post_id, ja.termination_last_day,
               jp.parent_id, jp.title AS job_title,
               c.employment_end_date AS contract_employment_end_date,
               p.ended_at AS placement_ended_at
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        LEFT JOIN contracts c ON c.application_id = ja.application_id
        LEFT JOIN (
            SELECT application_id, MAX(placement_id) AS placement_id
            FROM placements
            WHERE application_id IS NOT NULL
            GROUP BY application_id
        ) latest ON latest.application_id = ja.application_id
        LEFT JOIN placements p ON p.placement_id = latest.placement_id
        WHERE ja.application_id = ?
        LIMIT 1
    ');
    if (!$st) {
        return null;
    }
    $st->bind_param('i', $application_id);
    $st->execute();
    $res = $st->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    if ($res) {
        $res->free();
    }
    $st->close();
    return $row ?: null;
}

/** @return true if user is parent or helper on this application */
function carelink_user_on_application(array $hire, int $user_id, string $user_type): bool
{
    if ($user_type === 'parent') {
        return (int) $hire['parent_id'] === $user_id;
    }
    if ($user_type === 'helper') {
        return (int) $hire['helper_id'] === $user_id;
    }

    return false;
}

/** Hire is active, ending, or ended — complaints allowed */
function carelink_application_allows_complaint(string $status): bool
{
    $s = strtolower(trim($status));
    $ok = ['hired', 'accepted', 'termination_pending', 'terminated'];
    return in_array($s, $ok, true);
}

/**
 * Reviews allowed once the placement is ended for the user — same cases as renewal / “recently ended” lists:
 * terminated; stale termination notice; natural contract end; or placements.ended_at before today.
 */
function carelink_application_allows_review(array $hire): bool
{
    $status = (string) ($hire['status'] ?? '');
    $termination_last_day = isset($hire['termination_last_day']) && $hire['termination_last_day'] !== null
        && trim((string) $hire['termination_last_day']) !== ''
        ? substr(trim((string) $hire['termination_last_day']), 0, 10)
        : null;
    $employment_end = isset($hire['contract_employment_end_date']) && $hire['contract_employment_end_date'] !== null
        && trim((string) $hire['contract_employment_end_date']) !== ''
        ? substr(trim((string) $hire['contract_employment_end_date']), 0, 10)
        : null;

    if (carelink_application_allows_renewal_intent($status, $termination_last_day, $employment_end)) {
        return true;
    }

    $rawEnded = isset($hire['placement_ended_at']) ? trim((string) $hire['placement_ended_at']) : '';
    if ($rawEnded === '' || strncmp($rawEnded, '0000-00-00', 10) === 0) {
        return false;
    }
    $day = substr($rawEnded, 0, 10);
    $today = (new DateTimeImmutable('today'))->format('Y-m-d');

    return $day < $today;
}

/**
 * Contract renewal prompts: terminated; termination notice finished;
 * or hired/accepted with employment_end_date in contracts past.
 *
 * @param ?string $termination_last_day YYYY-MM-DD or null
 * @param ?string $employment_end_date From contracts.employment_end_date
 */
function carelink_application_allows_renewal_intent(
    string $status,
    ?string $termination_last_day,
    ?string $employment_end_date = null
): bool {
    $s = strtolower(trim($status));
    if ($s === 'terminated') {
        return true;
    }

    if ($s === 'termination_pending' || $s === 'pending_termination') {
        $t = $termination_last_day ?? '';
        if ($t === '') {
            return false;
        }
        $t = substr($t, 0, 10);
        $today = (new DateTimeImmutable('today'))->format('Y-m-d');

        return $t < $today;
    }

    if (($s === 'hired' || $s === 'accepted') && $employment_end_date !== null && $employment_end_date !== '') {
        $ed = substr(trim((string) $employment_end_date), 0, 10);
        if ($ed === '' || $ed === '0000-00-00') {
            return false;
        }
        $today = (new DateTimeImmutable('today'))->format('Y-m-d');

        return $ed < $today;
    }

    return false;
}
/**
 * Latest placement row for an application (your schema links placements.application_id → job_applications).
 */
function carelink_placement_id_for_application(mysqli $conn, int $application_id): ?int
{
    $st = $conn->prepare('
        SELECT placement_id FROM placements
        WHERE application_id = ?
        ORDER BY placement_id DESC
        LIMIT 1
    ');
    if (!$st) {
        return null;
    }
    $st->bind_param('i', $application_id);
    $st->execute();
    $res = $st->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    if ($res) {
        $res->free();
    }
    $st->close();
    if (!$row) {
        return null;
    }

    return (int) $row['placement_id'] > 0 ? (int) $row['placement_id'] : null;
}

/**
 * Map app/API category keys to `complaints.category` ENUM in current.sql.
 *
 * @return string One of: Misconduct, Fraud / Fake Profile, Non-Payment, Abandonment of Work,
 *                 Harassment, Property Damage, Unsafe Working Conditions, Abuse or Mistreatment,
 *                 Contract Dispute, Other
 */
function carelink_map_complaint_category(string $cat): string
{
    $c = strtolower(trim($cat));
    $map = [
        'conduct' => 'Misconduct',
        'payment' => 'Non-Payment',
        // Split from a single generic 'safety' key (which was previously
        // mismapped to 'Property Damage') into two specific categories, so
        // PESO/admin triage can tell environmental hazards apart from abuse.
        'unsafe_conditions' => 'Unsafe Working Conditions',
        'abuse_or_mistreatment' => 'Abuse or Mistreatment',
        // Was previously mismapped to 'Abandonment of Work' — a generic contract
        // dispute (e.g. unmet terms) is not the same thing as the helper leaving.
        'contract' => 'Contract Dispute',
        'harassment' => 'Harassment',
        'fraud' => 'Fraud / Fake Profile',
        'other' => 'Other',
    ];

    return $map[$c] ?? 'Other';
}

function carelink_notify_users_by_type(mysqli $conn, string $user_type, string $notif_type, string $title, string $message, ?string $ref_type, ?int $ref_id): void
{
    require_once __DIR__ . '/create_notification.php';
    $st = $conn->prepare('SELECT user_id FROM users WHERE user_type = ?');
    if (!$st) {
        return;
    }
    $st->bind_param('s', $user_type);
    $st->execute();
    $res = $st->get_result();
    while ($res && ($r = $res->fetch_assoc())) {
        $uid = (int) $r['user_id'];
        if ($uid > 0) {
            carelink_create_notification($conn, $uid, $notif_type, $title, $message, $ref_type, $ref_id);
        }
    }
    if ($res) {
        $res->free();
    }
    $st->close();
}
