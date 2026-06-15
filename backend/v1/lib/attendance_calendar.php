<?php

require_once __DIR__ . '/placement_task_table.php';

/** RA 10361 caps annual paid service incentive leave; we cap paid leave at 5 days/year. */
const CARELINK_LEAVE_PAID_CAP = 5;

/**
 * @return list<array{date:string,type:string,note:?string}>
 */
function carelink_attendance_parse_special_days(?string $json): array
{
    if ($json === null || trim($json) === '') {
        return [];
    }
    $d = json_decode($json, true);
    if (!is_array($d)) {
        return [];
    }
    $out = [];
    foreach ($d as $row) {
        if (!is_array($row)) {
            continue;
        }
        $date = isset($row['date']) ? trim((string) $row['date']) : '';
        $type = isset($row['type']) ? trim((string) $row['type']) : '';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            continue;
        }
        if (!in_array($type, ['holiday', 'no_work'], true)) {
            continue;
        }
        $note = isset($row['note']) ? trim((string) $row['note']) : null;
        if ($note === '') {
            $note = null;
        }
        $out[] = ['date' => $date, 'type' => $type, 'note' => $note];
    }
    return $out;
}

/** @param list<array{date:string,type:string,note:?string}> $list */
function carelink_attendance_special_for_date(array $list, string $dateYmd): ?array
{
    foreach ($list as $row) {
        if ($row['date'] === $dateYmd) {
            return $row;
        }
    }
    return null;
}

function carelink_attendance_date_is_weekly_rest(string $dateYmd, ?string $restDayCsv): bool
{
    if ($restDayCsv === null || trim($restDayCsv) === '') {
        return false;
    }
    $t = strtotime($dateYmd . ' 12:00:00');
    if ($t === false) {
        return false;
    }
    $todayLong = date('l', $t);
    $todayShort = date('D', $t);
    $parts = preg_split('/\s*,\s*/', trim($restDayCsv));
    foreach ($parts as $p) {
        $p = trim($p);
        if ($p === '') {
            continue;
        }
        if (strcasecmp($p, $todayLong) === 0 || strcasecmp($p, $todayShort) === 0) {
            return true;
        }
        if (strlen($p) >= 3 && strncasecmp($p, $todayLong, strlen($p)) === 0) {
            return true;
        }
    }
    return false;
}

/**
 * Parse end time from job_posts.work_hours (e.g. "8:00 am - 5:00 pm"). Returns 'H:i' 24h or null.
 */
function carelink_parse_work_hours_end_time(?string $workHours): ?string
{
    if ($workHours === null || trim($workHours) === '') {
        return null;
    }
    $s = trim($workHours);
    if (preg_match('/-\s*([0-9]{1,2}\s*:\s*[0-9]{2}\s*(?:am|pm|AM|PM))\s*$/', $s, $m)) {
        $ts = strtotime('2000-01-01 ' . trim($m[1]));
        if ($ts !== false) {
            return date('H:i', $ts);
        }
    }
    if (preg_match('/-\s*([0-9]{1,2})\s*(am|pm|AM|PM)\s*$/', $s, $m)) {
        $ts = strtotime('2000-01-01 ' . trim($m[1]) . ':00 ' . trim($m[2]));
        if ($ts !== false) {
            return date('H:i', $ts);
        }
    }

    return null;
}

function carelink_default_shift_end_hhmm(string $workSchedule): string
{
    return stripos($workSchedule, 'part') !== false ? '17:00' : '18:00';
}

/** @return string|null "Y-m-d H:i:s" local server TZ */
function carelink_expected_shift_end_at(?string $dateYmd, ?string $workHours, string $workSchedule): ?string
{
    if ($dateYmd === null || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateYmd)) {
        return null;
    }
    $hhmm = carelink_parse_work_hours_end_time($workHours);
    if ($hhmm === null) {
        $hhmm = carelink_default_shift_end_hhmm($workSchedule);
    }

    return $dateYmd . ' ' . $hhmm . ':00';
}

/**
 * @param ?array<string,mixed> $log
 * @param list<array{date:string,type:string,note:?string}> $specialList
 * @return array<string,mixed>
 */
function carelink_attendance_resolve_day(
    string $dateYmd,
    ?array $log,
    string $todayYmd,
    ?string $contractRestCsv,
    array $specialList,
    ?string $contractStartYmd = null,
    ?string $contractEndYmd = null
): array {
    $cs = $contractStartYmd !== null && trim($contractStartYmd) !== '' ? trim($contractStartYmd) : null;
    $ce = $contractEndYmd !== null && trim($contractEndYmd) !== '' ? trim($contractEndYmd) : null;
    if ($cs !== null && $dateYmd < $cs) {
        return [
            'date' => $dateYmd,
            'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
            'status' => 'none',
            'cell_type' => 'out_of_contract',
            'checked_in' => false,
            'check_in_at' => null,
            'check_out_at' => null,
            'note' => null,
            'special_note' => null,
        ];
    }
    if ($ce !== null && $dateYmd > $ce) {
        return [
            'date' => $dateYmd,
            'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
            'status' => 'none',
            'cell_type' => 'out_of_contract',
            'checked_in' => false,
            'check_in_at' => null,
            'check_out_at' => null,
            'note' => null,
            'special_note' => null,
        ];
    }

    $checked_in_at = $log['checked_in_at'] ?? null;
    $checked_out_at = $log['checked_out_at'] ?? null;
    $dbStatus = $log ? (string) ($log['status'] ?? 'absent') : 'absent';

    $special = carelink_attendance_special_for_date($specialList, $dateYmd);
    $isFuture = $dateYmd > $todayYmd;
    $isWeeklyRest = carelink_attendance_date_is_weekly_rest($dateYmd, $contractRestCsv);

    if ($checked_in_at) {
        return [
            'date' => $dateYmd,
            'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
            'status' => 'present',
            'cell_type' => 'present',
            'checked_in' => true,
            'check_in_at' => $checked_in_at,
            'check_out_at' => $checked_out_at,
            'note' => $log['note'] ?? null,
            'special_note' => $special['note'] ?? null,
        ];
    }

    if ($dbStatus === 'leave') {
        return [
            'date' => $dateYmd,
            'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
            'status' => 'leave',
            'cell_type' => 'leave',
            'checked_in' => false,
            'check_in_at' => null,
            'check_out_at' => $checked_out_at,
            'note' => $log['note'] ?? null,
            'special_note' => null,
        ];
    }

    if ($dbStatus === 'unpaid_leave') {
        return [
            'date' => $dateYmd,
            'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
            'status' => 'unpaid_leave',
            'cell_type' => 'unpaid_leave',
            'checked_in' => false,
            'check_in_at' => null,
            'check_out_at' => $checked_out_at,
            'note' => $log['note'] ?? null,
            'special_note' => null,
        ];
    }

    if ($special !== null) {
        if ($special['type'] === 'holiday') {
            return [
                'date' => $dateYmd,
                'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
                'status' => 'holiday',
                'cell_type' => 'holiday',
                'checked_in' => false,
                'check_in_at' => null,
                'check_out_at' => null,
                'note' => $special['note'],
                'special_note' => $special['note'],
            ];
        }
        if ($special['type'] === 'no_work') {
            return [
                'date' => $dateYmd,
                'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
                'status' => 'no_work',
                'cell_type' => 'no_work',
                'checked_in' => false,
                'check_in_at' => null,
                'check_out_at' => null,
                'note' => $special['note'],
                'special_note' => $special['note'],
            ];
        }
    }

    if ($dbStatus === 'holiday') {
        return [
            'date' => $dateYmd,
            'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
            'status' => 'holiday',
            'cell_type' => 'holiday',
            'checked_in' => false,
            'check_in_at' => null,
            'check_out_at' => $checked_out_at,
            'note' => $log['note'] ?? null,
            'special_note' => null,
        ];
    }

    if ($isFuture) {
        return [
            'date' => $dateYmd,
            'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
            'status' => 'none',
            'cell_type' => 'future',
            'checked_in' => false,
            'check_in_at' => null,
            'check_out_at' => null,
            'note' => null,
            'special_note' => null,
        ];
    }

    if ($isWeeklyRest) {
        return [
            'date' => $dateYmd,
            'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
            'status' => 'rest',
            'cell_type' => 'rest',
            'checked_in' => false,
            'check_in_at' => null,
            'check_out_at' => null,
            'note' => $log['note'] ?? null,
            'special_note' => null,
        ];
    }

    return [
        'date' => $dateYmd,
        'weekday' => date('D', strtotime($dateYmd . ' 12:00:00')),
        'status' => 'absent',
        'cell_type' => 'absent',
        'checked_in' => false,
        'check_in_at' => null,
        'check_out_at' => $checked_out_at,
        'note' => $log['note'] ?? null,
        'special_note' => null,
    ];
}

/**
 * @return array{rest_day:?string,special_days:array,vacation_days:int}
 */
function carelink_attendance_load_contract_extras(mysqli $conn, int $application_id): array
{
    $st = $conn->prepare('
        SELECT c.rest_day, c.special_days, COALESCE(jp.vacation_days, 0) AS vacation_days,
               c.employment_start_date, c.employment_end_date
        FROM contracts c
        INNER JOIN job_posts jp ON jp.job_post_id = c.job_post_id
        WHERE c.application_id = ?
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
        return [
            'rest_day' => null,
            'special_days' => [],
            'vacation_days' => 0,
            'employment_start_date' => null,
            'employment_end_date' => null,
        ];
    }

    $raw = $row['special_days'] ?? null;
    $parsed = carelink_attendance_parse_special_days(is_string($raw) ? $raw : null);
    $es = $row['employment_start_date'] ?? null;
    $ee = $row['employment_end_date'] ?? null;

    return [
        'rest_day' => isset($row['rest_day']) && trim((string) $row['rest_day']) !== '' ? trim((string) $row['rest_day']) : null,
        'special_days' => $parsed,
        'vacation_days' => (int) ($row['vacation_days'] ?? 0),
        'employment_start_date' => $es !== null && $es !== '' ? (string) $es : null,
        'employment_end_date' => $ee !== null && $ee !== '' ? (string) $ee : null,
    ];
}

/**
 * @return list<array<string,mixed>>
 */
function carelink_attendance_merge_week(mysqli $conn, int $application_id, string $mondayYmd): array
{
    $extras = carelink_attendance_load_contract_extras($conn, $application_id);
    $specialFull = $extras['special_days'];
    $restCsv = $extras['rest_day'];
    $cStart = $extras['employment_start_date'] ?? null;
    $cEnd = $extras['employment_end_date'] ?? null;

    $sunday = date('Y-m-d', strtotime($mondayYmd . ' +6 days'));
    $st = $conn->prepare("
        SELECT `date`, status, checked_in_at, checked_out_at, note
        FROM attendance_logs
        WHERE application_id = ? AND `date` >= ? AND `date` <= ?
    ");
    $st->bind_param('iss', $application_id, $mondayYmd, $sunday);
    $st->execute();
    $res = $st->get_result();
    $byDate = [];
    while ($r = $res->fetch_assoc()) {
        $byDate[$r['date']] = $r;
    }
    $st->close();

    $today = date('Y-m-d');
    $days = [];
    for ($i = 0; $i < 7; $i++) {
        $d = date('Y-m-d', strtotime($mondayYmd . ' +' . $i . ' days'));
        $log = $byDate[$d] ?? null;
        $days[] = carelink_attendance_resolve_day($d, $log, $today, $restCsv, $specialFull, $cStart, $cEnd);
    }
    return $days;
}

/**
 * @return list<array<string,mixed>>
 */
function carelink_attendance_merge_month(mysqli $conn, int $application_id, int $year, int $month, ?array $extrasPreloaded = null): array
{
    $extras = $extrasPreloaded ?? carelink_attendance_load_contract_extras($conn, $application_id);
    $specialFull = $extras['special_days'];
    $restCsv = $extras['rest_day'];
    $cStart = $extras['employment_start_date'] ?? null;
    $cEnd = $extras['employment_end_date'] ?? null;

    $first = sprintf('%04d-%02d-01', $year, $month);
    $last = date('Y-m-t', strtotime($first . ' 12:00:00'));
    $st = $conn->prepare("
        SELECT `date`, status, checked_in_at, checked_out_at, note
        FROM attendance_logs
        WHERE application_id = ? AND `date` >= ? AND `date` <= ?
    ");
    $st->bind_param('iss', $application_id, $first, $last);
    $st->execute();
    $res = $st->get_result();
    $byDate = [];
    while ($r = $res->fetch_assoc()) {
        $byDate[$r['date']] = $r;
    }
    $st->close();

    $today = date('Y-m-d');
    $days = [];
    $t = strtotime($first . ' 12:00:00');
    $end = strtotime($last . ' 12:00:00');
    for ($cur = $t; $cur <= $end; $cur += 86400) {
        $d = date('Y-m-d', $cur);
        $log = $byDate[$d] ?? null;
        $days[] = carelink_attendance_resolve_day($d, $log, $today, $restCsv, $specialFull, $cStart, $cEnd);
    }

    return $days;
}

/**
 * @return array<string,int>
 */
function carelink_attendance_tasks_completed_by_date(mysqli $conn, int $application_id, string $fromYmd, string $toYmd): array
{
    $t = CARELINK_PLACEMENT_TASKS_TABLE;
    $st = $conn->prepare("
        SELECT DATE(completed_at) AS d, COUNT(*) AS c
        FROM `{$t}`
        WHERE application_id = ?
          AND status = 'done'
          AND completed_at IS NOT NULL
          AND DATE(completed_at) >= ?
          AND DATE(completed_at) <= ?
        GROUP BY DATE(completed_at)
    ");
    $st->bind_param('iss', $application_id, $fromYmd, $toYmd);
    $st->execute();
    $res = $st->get_result();
    $map = [];
    while ($r = $res->fetch_assoc()) {
        $map[(string) $r['d']] = (int) $r['c'];
    }
    $st->close();
    return $map;
}

/**
 * @return array{used:int,limit:int,remaining: ?int}
 */
/**
 * If today is marked holiday or no_work on the contract, return that row; else null.
 *
 * @return array{date:string,type:string,note:?string}|null
 */
function carelink_attendance_today_special_block(mysqli $conn, int $application_id): ?array
{
    $st = $conn->prepare('SELECT special_days FROM contracts WHERE application_id = ? LIMIT 1');
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
    $raw = $row && isset($row['special_days']) ? $row['special_days'] : null;
    $list = carelink_attendance_parse_special_days(is_string($raw) ? $raw : null);
    $today = date('Y-m-d');

    return carelink_attendance_special_for_date($list, $today);
}

function carelink_attendance_leave_balance(mysqli $conn, int $application_id, int $year, int $vacationLimit): array
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
    $used = $row ? (int) $row['c'] : 0;
    $limit = $vacationLimit > 0 ? min($vacationLimit, CARELINK_LEAVE_PAID_CAP) : CARELINK_LEAVE_PAID_CAP;
    $rem = max(0, $limit - $used);

    return ['used' => $used, 'limit' => $limit, 'remaining' => $rem];
}

/**
 * @param list<array<string,mixed>> $monthDays
 * @return array<int, string>
 */
function carelink_attendance_month_summary(array $monthDays): array
{
    $present = 0;
    $absent = 0;
    $leave = 0;
    $rest = 0;
    $holiday = 0;
    $no_work = 0;
    foreach ($monthDays as $d) {
        $ct = $d['cell_type'] ?? '';
        switch ($ct) {
            case 'present':
                $present++;
                break;
            case 'absent':
                $absent++;
                break;
            case 'leave':
            case 'unpaid_leave':
                $leave++;
                break;
            case 'rest':
                $rest++;
                break;
            case 'holiday':
                $holiday++;
                break;
            case 'no_work':
                $no_work++;
                break;
            default:
                break;
        }
    }
    return [
        'present' => $present,
        'absent' => $absent,
        'leave' => $leave,
        'rest_days' => $rest,
        'holiday' => $holiday,
        'no_work' => $no_work,
    ];
}
