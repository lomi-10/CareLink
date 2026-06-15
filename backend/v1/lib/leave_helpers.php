<?php

require_once __DIR__ . '/attendance_calendar.php';

/**
 * Paid leave entitlement for this hire: min(job_posts.vacation_days, 5), minimum 1 day if post says 0 (treat 0 as use statutory default 5).
 *
 * @return array{cap:int, raw_job_days:int}
 */
function carelink_leave_paid_entitlement(mysqli $conn, int $application_id): array
{
    $st = $conn->prepare('
        SELECT COALESCE(jp.vacation_days, 0) AS vd
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ?
        LIMIT 1
    ');
    $st->bind_param('i', $application_id);
    $st->execute();
    $res = $st->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    if ($res) {
        $res->free();
    }
    $st->close();
    if (!$row) {
        return ['cap' => CARELINK_LEAVE_PAID_CAP, 'raw_job_days' => 0];
    }
    $raw = (int) $row['vd'];
    if ($raw <= 0) {
        $raw = CARELINK_LEAVE_PAID_CAP;
    }
    $cap = min($raw, CARELINK_LEAVE_PAID_CAP);

    return ['cap' => max(0, $cap), 'raw_job_days' => (int) $row['vd']];
}

/**
 * Count approved leave days in calendar year that count as paid (excludes unpaid approvals).
 */
function carelink_leave_count_paid_used_year(mysqli $conn, int $application_id, int $year): int
{
    $st = $conn->prepare("
        SELECT COUNT(*) AS c
        FROM leave_requests
        WHERE application_id = ?
          AND status = 'approved'
          AND YEAR(`date`) = ?
          AND (paid_leave IS NULL OR paid_leave = 1)
    ");
    $st->bind_param('ii', $application_id, $year);
    $st->execute();
    $res = $st->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    if ($res) {
        $res->free();
    }
    $st->close();

    return $row ? (int) $row['c'] : 0;
}

/**
 * @return array{total:int, used:int, remaining:int, at_paid_limit:bool, unpaid_if_approved:bool}
 */
function carelink_leave_balance(mysqli $conn, int $application_id): array
{
    $ent = carelink_leave_paid_entitlement($conn, $application_id);
    $year = (int) date('Y');
    $used = carelink_leave_count_paid_used_year($conn, $application_id, $year);
    $cap = $ent['cap'];
    $remaining = max(0, $cap - $used);
    $at = $used >= $cap;

    return [
        'total' => $cap,
        'used' => $used,
        'remaining' => $remaining,
        'at_paid_limit' => $at,
        'unpaid_if_approved' => $at,
    ];
}

/**
 * @return string|null error message, or null if OK
 */
function carelink_leave_validate_work_day(mysqli $conn, int $application_id, string $dateYmd): ?string
{
    $extras = carelink_attendance_load_contract_extras($conn, $application_id);
    $restCsv = $extras['rest_day'];
    if (carelink_attendance_date_is_weekly_rest($dateYmd, $restCsv)) {
        return 'That date is a scheduled rest day.';
    }
    $sp = carelink_attendance_special_for_date($extras['special_days'], $dateYmd);
    if ($sp !== null) {
        return $sp['type'] === 'holiday'
            ? 'That date is marked as a holiday on your contract.'
            : 'That date is marked as no-work on your contract.';
    }

    return null;
}

/**
 * @return string|null error if duplicate pending/approved leave exists for date
 */
/**
 * Dates helper cannot request leave (rest, contract marks, existing pending/approved leave).
 *
 * @return list<string>
 */
function carelink_leave_blocked_dates(mysqli $conn, int $application_id, string $fromYmd, string $toYmd): array
{
    $blocked = [];
    $t0 = strtotime($fromYmd . ' 12:00:00');
    $t1 = strtotime($toYmd . ' 12:00:00');
    if ($t0 === false || $t1 === false || $t0 > $t1) {
        return [];
    }
    for ($t = $t0; $t <= $t1; $t += 86400) {
        $d = date('Y-m-d', $t);
        if (carelink_leave_validate_work_day($conn, $application_id, $d) !== null) {
            $blocked[] = $d;
        }
    }

    $st = $conn->prepare("
        SELECT DISTINCT `date` FROM leave_requests
        WHERE application_id = ?
          AND `date` >= ? AND `date` <= ?
          AND status IN ('pending', 'approved')
    ");
    $st->bind_param('iss', $application_id, $fromYmd, $toYmd);
    $st->execute();
    $res = $st->get_result();
    while ($res && ($r = $res->fetch_assoc())) {
        $blocked[] = (string) $r['date'];
    }
    $st->close();

    $blocked = array_values(array_unique($blocked));
    sort($blocked);

    return $blocked;
}

function carelink_leave_validate_not_duplicate(mysqli $conn, int $application_id, string $dateYmd): ?string
{
    $st = $conn->prepare("
        SELECT id, status FROM leave_requests
        WHERE application_id = ? AND `date` = ?
          AND status IN ('pending', 'approved')
        LIMIT 1
    ");
    $st->bind_param('is', $application_id, $dateYmd);
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
    if ($row['status'] === 'pending') {
        return 'You already have a pending leave request for that date.';
    }

    return 'Leave for that date was already approved.';
}
