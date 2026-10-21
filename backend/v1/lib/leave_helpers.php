<?php

require_once __DIR__ . '/attendance_calendar.php';
require_once __DIR__ . '/contract_rest_days.php';
require_once __DIR__ . '/../../shared/leave_entitlement_migration.php';

function carelink_leave_ensure_entitlement_schema(mysqli $conn): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }
    ensure_leave_entitlement_source_column($conn);
    $ensured = true;
}

/**
 * Returns the service-year window containing the requested date.
 *
 * @return array{start:?string,end:?string,sil_eligible:bool,sil_eligible_on:?string}
 */
function carelink_leave_service_year(?string $employmentStart, string $asOfDate): array
{
    if ($employmentStart === null || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $employmentStart)) {
        return ['start' => null, 'end' => null, 'sil_eligible' => false, 'sil_eligible_on' => null];
    }

    $start = new DateTimeImmutable($employmentStart);
    $asOf = new DateTimeImmutable($asOfDate);
    $anniversaryYears = max(0, (int) $start->diff($asOf)->y);
    $periodStart = $start->modify('+' . $anniversaryYears . ' years');
    if ($periodStart > $asOf) {
        $anniversaryYears = max(0, $anniversaryYears - 1);
        $periodStart = $start->modify('+' . $anniversaryYears . ' years');
    }

    $periodEnd = $start->modify('+' . ($anniversaryYears + 1) . ' years')->modify('-1 day');
    $silEligibleOn = $start->modify('+1 year')->format('Y-m-d');

    return [
        'start' => $periodStart->format('Y-m-d'),
        'end' => $periodEnd->format('Y-m-d'),
        'sil_eligible' => $asOf >= new DateTimeImmutable($silEligibleOn),
        'sil_eligible_on' => $silEligibleOn,
    ];
}

/**
 * Paid leave is split between signed-contract vacation/sick leave and statutory SIL.
 *
 * @return array<string,mixed>
 */
function carelink_leave_balance(mysqli $conn, int $application_id, ?string $asOfDate = null): array
{
    carelink_leave_ensure_entitlement_schema($conn);
    $asOfDate = $asOfDate ?? date('Y-m-d');
    $extras = carelink_attendance_load_contract_extras($conn, $application_id);
    $serviceYear = carelink_leave_service_year($extras['employment_start_date'], $asOfDate);
    $vacationTotal = max(0, (int) $extras['vacation_leave_days']);
    $sickTotal = max(0, (int) $extras['sick_leave_days']);
    $silTotal = CARELINK_LEAVE_PAID_CAP;
    $used = ['statutory_sil' => 0, 'contract_vacation' => 0, 'contract_sick' => 0];

    if ($serviceYear['start'] !== null && $serviceYear['end'] !== null) {
        $st = $conn->prepare("
            SELECT
                SUM(CASE
                    WHEN paid_leave_source = 'statutory_sil' THEN 1
                    ELSE 0
                END) AS sil_used,
                SUM(CASE
                    WHEN paid_leave_source = 'contract_sick'
                      OR (paid_leave_source IS NULL AND reason_code = 'sick') THEN 1
                    ELSE 0
                END) AS sick_used,
                SUM(CASE
                    WHEN paid_leave_source = 'contract_vacation'
                      OR (paid_leave_source IS NULL AND reason_code <> 'sick') THEN 1
                    ELSE 0
                END) AS vacation_used
            FROM leave_requests
            WHERE application_id = ?
              AND status = 'approved'
              AND (paid_leave IS NULL OR paid_leave = 1)
              AND `date` BETWEEN ? AND ?
        ");
        $st->bind_param('iss', $application_id, $serviceYear['start'], $serviceYear['end']);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();
        if ($row) {
            $used['statutory_sil'] = (int) ($row['sil_used'] ?? 0);
            $used['contract_sick'] = (int) ($row['sick_used'] ?? 0);
            $used['contract_vacation'] = (int) ($row['vacation_used'] ?? 0);
        }
    }

    $hasServiceYear = $serviceYear['start'] !== null && $serviceYear['end'] !== null;
    $silAvailable = $serviceYear['sil_eligible'] ? $silTotal : 0;
    $silRemaining = max(0, $silAvailable - $used['statutory_sil']);
    $vacationRemaining = $hasServiceYear ? max(0, $vacationTotal - $used['contract_vacation']) : 0;
    $sickRemaining = $hasServiceYear ? max(0, $sickTotal - $used['contract_sick']) : 0;
    $remaining = $silRemaining + $vacationRemaining + $sickRemaining;
    $total = $silAvailable + ($hasServiceYear ? $vacationTotal + $sickTotal : 0);
    $totalUsed = $used['statutory_sil'] + $used['contract_vacation'] + $used['contract_sick'];

    return [
        'as_of_date' => $asOfDate,
        'service_year_start' => $serviceYear['start'],
        'service_year_end' => $serviceYear['end'],
        'contract_exists' => $extras['contract_exists'],
        'statutory_sil' => [
            'total' => $silTotal,
            'available' => $silAvailable,
            'used' => $used['statutory_sil'],
            'remaining' => $silRemaining,
            'eligible' => $serviceYear['sil_eligible'],
            'eligible_on' => $serviceYear['sil_eligible_on'],
        ],
        'contract_vacation' => [
            'total' => $vacationTotal,
            'used' => $used['contract_vacation'],
            'remaining' => $vacationRemaining,
        ],
        'contract_sick' => [
            'total' => $sickTotal,
            'used' => $used['contract_sick'],
            'remaining' => $sickRemaining,
        ],
        'total' => $total,
        'used' => $totalUsed,
        'remaining' => $remaining,
        'at_paid_limit' => $remaining === 0,
        'paid_available_for_reason' => [
            'sick' => carelink_leave_paid_source([
                'statutory_sil' => ['remaining' => $silRemaining],
                'contract_sick' => ['remaining' => $sickRemaining],
                'contract_vacation' => ['remaining' => $vacationRemaining],
            ], 'sick') !== null,
            'personal' => carelink_leave_paid_source([
                'statutory_sil' => ['remaining' => $silRemaining],
                'contract_sick' => ['remaining' => $sickRemaining],
                'contract_vacation' => ['remaining' => $vacationRemaining],
            ], 'personal') !== null,
        ],
    ];
}

/**
 * A leave reason uses its matching contract allowance first, then eligible statutory SIL.
 *
 * @return 'statutory_sil'|'contract_sick'|'contract_vacation'|null
 */
function carelink_leave_paid_source(array $balance, string $reasonCode): ?string
{
    $contractBucket = $reasonCode === 'sick' ? 'contract_sick' : 'contract_vacation';
    if (($balance[$contractBucket]['remaining'] ?? 0) > 0) {
        return $contractBucket;
    }
    if (($balance['statutory_sil']['remaining'] ?? 0) > 0) {
        return 'statutory_sil';
    }
    return null;
}

/**
 * Count all approved paid leave in a calendar year for the legacy application counter.
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
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    return (int) ($row['c'] ?? 0);
}

function carelink_leave_is_valid_date(string $dateYmd): bool
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $dateYmd, $parts)) {
        return false;
    }
    return checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]);
}

/**
 * @return string|null error message, or null if OK
 */
function carelink_leave_validate_work_day(mysqli $conn, int $application_id, string $dateYmd): ?string
{
    if (!carelink_leave_is_valid_date($dateYmd)) {
        return 'Enter a real calendar date.';
    }

    $extras = carelink_attendance_load_contract_extras($conn, $application_id);
    if (!$extras['contract_exists']) {
        return 'Leave requests are available after the signed contract is recorded.';
    }
    if ($extras['employment_start_date'] !== null && $dateYmd < $extras['employment_start_date']) {
        return 'That date is before the contract start date.';
    }
    if ($extras['employment_end_date'] !== null && $dateYmd > $extras['employment_end_date']) {
        return 'That date is after the contract end date.';
    }
    if (carelink_attendance_date_is_weekly_rest($dateYmd, $extras['rest_day'])) {
        return 'That date is a scheduled rest day.';
    }
    $special = carelink_attendance_special_for_date($extras['special_days'], $dateYmd);
    if ($special !== null) {
        return $special['type'] === 'holiday'
            ? 'That date is marked as a holiday on your contract.'
            : 'That date is marked as no-work on your contract.';
    }

    return null;
}

/**
 * Dates helper cannot request leave (rest, contract marks, employment bounds, existing leave).
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
        $date = date('Y-m-d', $t);
        if (carelink_leave_validate_work_day($conn, $application_id, $date) !== null) {
            $blocked[] = $date;
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
    while ($res && ($row = $res->fetch_assoc())) {
        $blocked[] = (string) $row['date'];
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
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) {
        return null;
    }
    if ($row['status'] === 'pending') {
        return 'You already have a pending leave request for that date.';
    }

    return 'Leave for that date was already approved.';
}
