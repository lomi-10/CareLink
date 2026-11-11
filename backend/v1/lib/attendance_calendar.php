<?php

require_once __DIR__ . '/contract_rest_days.php';

const CARELINK_LEAVE_PAID_CAP = 5;

/**
 * @return list<array{date:string,type:string,note:?string}>
 */
function carelink_attendance_parse_special_days(?string $json): array
{
    if ($json === null || trim($json) === '') {
        return [];
    }
    $days = json_decode($json, true);
    if (!is_array($days)) {
        return [];
    }

    $normalized = [];
    foreach ($days as $day) {
        if (!is_array($day)) {
            continue;
        }
        $date = isset($day['date']) ? trim((string) $day['date']) : '';
        $type = isset($day['type']) ? trim((string) $day['type']) : '';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !in_array($type, ['holiday', 'no_work'], true)) {
            continue;
        }
        $note = isset($day['note']) ? trim((string) $day['note']) : null;
        $normalized[] = ['date' => $date, 'type' => $type, 'note' => $note !== '' ? $note : null];
    }
    return $normalized;
}

/** @param list<array{date:string,type:string,note:?string}> $list */
function carelink_attendance_special_for_date(array $list, string $dateYmd): ?array
{
    foreach ($list as $day) {
        if ($day['date'] === $dateYmd) {
            return $day;
        }
    }
    return null;
}

function carelink_attendance_date_is_weekly_rest(string $dateYmd, ?string $restDayCsv): bool
{
    if ($restDayCsv === null || trim($restDayCsv) === '') {
        return false;
    }
    $timestamp = strtotime($dateYmd . ' 12:00:00');
    if ($timestamp === false) {
        return false;
    }

    $weekday = date('l', $timestamp);
    $weekdayShort = date('D', $timestamp);
    foreach (preg_split('/\s*,\s*/', trim($restDayCsv)) ?: [] as $restDay) {
        if ($restDay === '') {
            continue;
        }
        if (strcasecmp($restDay, $weekday) === 0 || strcasecmp($restDay, $weekdayShort) === 0) {
            return true;
        }
        if (strlen($restDay) >= 3 && strncasecmp($restDay, $weekday, strlen($restDay)) === 0) {
            return true;
        }
    }
    return false;
}

/** @return array<string,mixed> */
function carelink_attendance_load_contract_extras(mysqli $conn, int $application_id): array
{
    $stmt = $conn->prepare('
        SELECT c.rest_day, c.rest_days, c.special_days, c.vacation_leave_days,
               c.sick_leave_days, c.employment_start_date, c.employment_end_date
        FROM contracts c
        WHERE c.application_id = ?
        LIMIT 1
    ');
    $stmt->bind_param('i', $application_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    if ($result) {
        $result->free();
    }
    $stmt->close();

    if (!$row) {
        return [
            'rest_day' => null,
            'special_days' => [],
            'vacation_leave_days' => 0,
            'sick_leave_days' => 0,
            'employment_start_date' => null,
            'employment_end_date' => null,
            'contract_exists' => false,
        ];
    }

    return [
        'rest_day' => carelink_contract_rest_days_csv(
            isset($row['rest_days']) && is_string($row['rest_days']) ? $row['rest_days'] : null,
            isset($row['rest_day']) && is_string($row['rest_day']) ? $row['rest_day'] : null
        ),
        'special_days' => carelink_attendance_parse_special_days(
            isset($row['special_days']) && is_string($row['special_days']) ? $row['special_days'] : null
        ),
        'vacation_leave_days' => max(0, (int) ($row['vacation_leave_days'] ?? 0)),
        'sick_leave_days' => max(0, (int) ($row['sick_leave_days'] ?? 0)),
        'employment_start_date' => !empty($row['employment_start_date']) ? (string) $row['employment_start_date'] : null,
        'employment_end_date' => !empty($row['employment_end_date']) ? (string) $row['employment_end_date'] : null,
        'contract_exists' => true,
    ];
}
