<?php
/**
 * Complete a job post once the number of finalized hires reaches its openings.
 *
 * Call after setting an application to hired/Accepted. When called from
 * contract finalization it runs inside the caller's transaction.
 */
function carelink_refresh_job_post_slots(mysqli $conn, int $job_post_id): bool
{
    $jobStmt = $conn->prepare('SELECT slots FROM job_posts WHERE job_post_id = ? LIMIT 1 FOR UPDATE');
    if (!$jobStmt) throw new Exception('Could not check job openings: ' . $conn->error);
    $jobStmt->bind_param('i', $job_post_id);
    if (!$jobStmt->execute()) throw new Exception('Could not check job openings: ' . $jobStmt->error);
    $job = $jobStmt->get_result()->fetch_assoc();
    $jobStmt->close();
    if (!$job) throw new Exception('Job post not found while checking filled openings.');

    $slotCount = max(1, (int) $job['slots']);
    $hireStmt = $conn->prepare(
        "SELECT COUNT(*) AS hired_count FROM job_applications
         WHERE job_post_id = ? AND status IN ('hired', 'Accepted')"
    );
    if (!$hireStmt) throw new Exception('Could not count finalized hires: ' . $conn->error);
    $hireStmt->bind_param('i', $job_post_id);
    if (!$hireStmt->execute()) throw new Exception('Could not count finalized hires: ' . $hireStmt->error);
    $hireCount = (int) ($hireStmt->get_result()->fetch_assoc()['hired_count'] ?? 0);
    $hireStmt->close();
    if ($hireCount < $slotCount) return false;

    $fillStmt = $conn->prepare(
        "UPDATE job_posts SET status = 'Filled', filled_at = COALESCE(filled_at, NOW())
         WHERE job_post_id = ? AND status <> 'Filled'"
    );
    if (!$fillStmt) throw new Exception('Could not mark the post filled: ' . $conn->error);
    $fillStmt->bind_param('i', $job_post_id);
    if (!$fillStmt->execute()) throw new Exception('Could not mark the post filled: ' . $fillStmt->error);
    $fillStmt->close();

    $appStmt = $conn->prepare(
        "UPDATE job_applications
         SET status = 'Rejected', parent_notes = 'Position has been filled', updated_at = NOW()
         WHERE job_post_id = ?
           AND status NOT IN ('hired', 'Accepted', 'termination_pending', 'terminated', 'Rejected', 'Withdrawn', 'auto_rejected')"
    );
    if (!$appStmt) throw new Exception('Could not close applications for the filled post: ' . $conn->error);
    $appStmt->bind_param('i', $job_post_id);
    if (!$appStmt->execute()) throw new Exception('Could not close applications for the filled post: ' . $appStmt->error);
    $appStmt->close();

    $interviewStmt = $conn->prepare(
        "UPDATE interview_schedules ins
         INNER JOIN job_applications ja ON ja.application_id = ins.application_id
         SET ins.status = 'Cancelled', ins.updated_at = NOW()
         WHERE ja.job_post_id = ? AND ja.status = 'Rejected'
           AND ja.parent_notes = 'Position has been filled'
           AND ins.status NOT IN ('Cancelled', 'Completed')"
    );
    if (!$interviewStmt) throw new Exception('Could not cancel interviews for the filled post: ' . $conn->error);
    $interviewStmt->bind_param('i', $job_post_id);
    if (!$interviewStmt->execute()) throw new Exception('Could not cancel interviews for the filled post: ' . $interviewStmt->error);
    $interviewStmt->close();

    return true;
}

function carelink_lock_available_job_slot(mysqli $conn, int $job_post_id, int $application_id): void
{
    $jobStmt = $conn->prepare('SELECT slots FROM job_posts WHERE job_post_id = ? LIMIT 1 FOR UPDATE');
    if (!$jobStmt) throw new Exception('Could not lock a job opening: ' . $conn->error);
    $jobStmt->bind_param('i', $job_post_id);
    if (!$jobStmt->execute()) throw new Exception('Could not lock a job opening: ' . $jobStmt->error);
    $job = $jobStmt->get_result()->fetch_assoc();
    $jobStmt->close();
    if (!$job) throw new Exception('Job post not found while checking available openings.');

    $hireStmt = $conn->prepare(
        "SELECT COUNT(*) AS hired_count FROM job_applications
         WHERE job_post_id = ? AND application_id != ? AND status IN ('hired', 'Accepted')"
    );
    if (!$hireStmt) throw new Exception('Could not count finalized hires: ' . $conn->error);
    $hireStmt->bind_param('ii', $job_post_id, $application_id);
    if (!$hireStmt->execute()) throw new Exception('Could not count finalized hires: ' . $hireStmt->error);
    $hireCount = (int) ($hireStmt->get_result()->fetch_assoc()['hired_count'] ?? 0);
    $hireStmt->close();
    if ($hireCount >= max(1, (int) $job['slots'])) {
        throw new Exception('All advertised openings are already filled.');
    }
}

function carelink_assert_job_post_has_openings(mysqli $conn, int $job_post_id): void
{
    $stmt = $conn->prepare('SELECT slots FROM job_posts WHERE job_post_id = ? LIMIT 1 FOR UPDATE');
    if (!$stmt) throw new Exception('Could not check remaining job openings: ' . $conn->error);
    $stmt->bind_param('i', $job_post_id);
    if (!$stmt->execute()) throw new Exception('Could not check remaining job openings: ' . $stmt->error);
    $job = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$job) throw new Exception('Job post not found.');

    $hireStmt = $conn->prepare(
        "SELECT COUNT(*) AS hired_count FROM job_applications
         WHERE job_post_id = ? AND status IN ('hired', 'Accepted')"
    );
    if (!$hireStmt) throw new Exception('Could not count finalized hires: ' . $conn->error);
    $hireStmt->bind_param('i', $job_post_id);
    if (!$hireStmt->execute()) throw new Exception('Could not count finalized hires: ' . $hireStmt->error);
    $hireCount = (int) ($hireStmt->get_result()->fetch_assoc()['hired_count'] ?? 0);
    $hireStmt->close();
    if ($hireCount >= max(1, (int) $job['slots'])) {
        throw new Exception('All advertised openings are filled. Increase the number of openings before reopening this post.');
    }
}
?>
