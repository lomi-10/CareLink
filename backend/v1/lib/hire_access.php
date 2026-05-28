<?php
/**
 * Active hire row for v1 APIs (job_applications + job_posts).
 *
 * @return array<string,mixed>|null
 */

require_once __DIR__ . '/../../shared/mysqli_stmt_helpers.php';

function carelink_v1_load_hire(mysqli $conn, int $application_id): ?array
{
    $st = $conn->prepare("
        SELECT ja.application_id, ja.helper_id, ja.status, jp.parent_id, jp.title AS job_title
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ?
        LIMIT 1
    ");
    if (!$st) {
        return null;
    }
    $st->bind_param('i', $application_id);
    $st->execute();
    $res = $st->get_result();
    if ($res instanceof mysqli_result) {
        $row = $res->fetch_assoc();
        $res->free();
    } else {
        $row = carelink_mysqli_stmt_fetch_assoc($st);
    }
    $st->close();
    if (!$row) {
        return null;
    }
    // DBs may store mixed case (e.g. Hired, HIRED). Normalize so attendance/leave APIs don't false-negative.
    $st = strtolower(trim((string) ($row['status'] ?? '')));
    $ok = in_array($st, ['hired', 'accepted', 'termination_pending'], true);
    if (!$ok) {
        return null;
    }
    return $row;
}

function carelink_v1_assert_can_view_attendance(mysqli $conn, int $application_id, int $user_id, string $user_type): ?array
{
    $hire = carelink_v1_load_hire($conn, $application_id);
    if (!$hire) {
        return null;
    }
    if ($user_type === 'parent' && (int) $hire['parent_id'] === $user_id) {
        return $hire;
    }
    if ($user_type === 'helper' && (int) $hire['helper_id'] === $user_id) {
        return $hire;
    }
    return null;
}

/** Parent (job owner) on active hire for this application. */
function carelink_v1_assert_parent_hire(mysqli $conn, int $application_id, int $parent_user_id): ?array
{
    $hire = carelink_v1_load_hire($conn, $application_id);
    if (!$hire || (int) $hire['parent_id'] !== $parent_user_id) {
        return null;
    }
    return $hire;
}

/** Helper on active hire for this application. */
function carelink_v1_assert_helper_hire(mysqli $conn, int $application_id, int $helper_user_id): ?array
{
    $hire = carelink_v1_load_hire($conn, $application_id);
    if (!$hire || (int) $hire['helper_id'] !== $helper_user_id) {
        return null;
    }
    return $hire;
}
