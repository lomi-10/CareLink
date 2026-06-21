<?php

require_once __DIR__ . '/attendance_rest_day.php';

/**
 * @param array<string,mixed> $r
 * @return array<string,mixed>
 */
function carelink_placement_task_row_to_api(array $r): array
{
    $recur = $r['recur_days'] ?? null;
    if (is_string($recur) && $recur !== '') {
        $decoded = json_decode($recur, true);
        $recur = is_array($decoded) ? $decoded : null;
    } elseif (!is_array($recur)) {
        $recur = null;
    }

    $valid_priorities = ['low', 'medium', 'high'];
    $priority = in_array($r['priority'] ?? '', $valid_priorities, true) ? $r['priority'] : 'medium';

    return [
        'id' => (int) $r['id'],
        'application_id' => (int) $r['application_id'],
        'created_by' => (int) $r['created_by'],
        'title' => $r['title'],
        'description' => $r['description'],
        'due_date' => $r['due_date'],
        'requires_photo' => !empty($r['requires_photo']),
        'is_recurring' => !empty($r['is_recurring']),
        'recur_days' => $recur,
        'priority' => $priority,
        'status' => $r['status'],
        'completed_at' => $r['completed_at'],
        'photo_url' => $r['photo_url'] ?? null,
        'created_at' => $r['created_at'],
        'updated_at' => $r['updated_at'],
    ];
}

/**
 * Helper must have checked in today (unless today is a scheduled rest day).
 */
function carelink_task_helper_may_complete_today(mysqli $conn, int $application_id): array
{
    if (carelink_attendance_today_is_rest_day($conn, $application_id)) {
        return [true, null];
    }

    $today = date('Y-m-d');
    $st = $conn->prepare("
        SELECT checked_in_at
        FROM attendance_logs
        WHERE application_id = ? AND `date` = ?
        LIMIT 1
    ");
    $st->bind_param('is', $application_id, $today);
    $st->execute();
    $res = $st->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    if ($res) {
        $res->free();
    }
    $st->close();

    if ($row && !empty($row['checked_in_at'])) {
        return [true, null];
    }

    return [false, 'Check in for today before you can mark tasks done.'];
}
