<?php

require_once __DIR__ . '/contract_rest_days.php';
/**
 * Returns true if today's calendar weekday matches contract.rest_day (comma-separated, e.g. "Sunday" or "Sun, Thu").
 * If contracts.rest_day is missing or empty, returns false (no rest restriction).
 */
function carelink_attendance_today_is_rest_day(mysqli $conn, int $application_id): bool
{
    $st = @$conn->prepare('SELECT rest_days, rest_day FROM contracts WHERE application_id = ? LIMIT 1');
    if (!$st) {
        return false;
    }
    $st->bind_param('i', $application_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) {
        return false;
    }
    $restDays = isset($row['rest_days']) && is_string($row['rest_days']) ? $row['rest_days'] : null;
    $legacyRestDay = isset($row['rest_day']) && is_string($row['rest_day']) ? $row['rest_day'] : null;
    $restDayCsv = carelink_contract_rest_days_csv($restDays, $legacyRestDay);
    if ($restDayCsv === null) {
        return false;
    }

    $todayLong = date('l');
    $todayShort = date('D');
    $parts = preg_split('/\s*,\s*/', $restDayCsv);
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
