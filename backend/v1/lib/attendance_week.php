<?php

require_once __DIR__ . '/attendance_calendar.php';

/** Monday Y-m-d of week containing $dateStr */
function carelink_attendance_week_monday(string $dateStr): string
{
    $t = strtotime($dateStr);
    $dow = (int) date('N', $t);
    $mon = strtotime('-' . ($dow - 1) . ' days', $t);
    return date('Y-m-d', $mon);
}
