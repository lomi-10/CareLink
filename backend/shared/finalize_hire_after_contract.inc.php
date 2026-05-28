<?php
/**
 * Run inside an active transaction. Fills job, creates placement, rejects other applicants.
 * Expects job_applications row already updated to status = 'hired' by caller, or caller passes
 * and this function updates — single source: we update to hired here.
 *
 * @throws Exception
 */
function carelink_finalize_hire_after_contract(
    mysqli $conn,
    int $application_id,
    int $job_post_id,
    int $parent_id,
    int $helper_id
): void {
    $st0 = $conn->prepare('SELECT status FROM job_applications WHERE application_id = ? LIMIT 1 FOR UPDATE');
    $st0->bind_param('i', $application_id);
    $st0->execute();
    $r0 = $st0->get_result()->fetch_assoc();
    $st0->close();
    if ($r0 && isset($r0['status']) && trim((string) $r0['status']) === 'hired') {
        return;
    }

    $jobSql = "SELECT employment_type, work_schedule, salary_offered, salary_period
               FROM job_posts WHERE job_post_id = ? AND parent_id = ? LIMIT 1";
    $jobStmt = $conn->prepare($jobSql);
    if (!$jobStmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    $jobStmt->bind_param('ii', $job_post_id, $parent_id);
    $jobStmt->execute();
    $jobDetails = $jobStmt->get_result()->fetch_assoc();
    $jobStmt->close();

    if (!$jobDetails) {
        throw new Exception('Job not found');
    }

    $sql1 = "UPDATE job_applications SET status = 'hired', reviewed_at = NOW(), updated_at = NOW()
             WHERE application_id = ? AND job_post_id = ? AND helper_id = ? AND status = 'contract_pending'";
    $stmt1 = $conn->prepare($sql1);
    $stmt1->bind_param('iii', $application_id, $job_post_id, $helper_id);
    $stmt1->execute();
    if ($stmt1->affected_rows === 0) {
        $stmt1->close();
        throw new Exception('Could not finalize hire (application not in contract_pending or already updated)');
    }
    $stmt1->close();

    $sql2 = "UPDATE job_posts SET status = 'Filled', filled_at = NOW() WHERE job_post_id = ? AND parent_id = ?";
    $stmt2 = $conn->prepare($sql2);
    $stmt2->bind_param('ii', $job_post_id, $parent_id);
    $stmt2->execute();
    $stmt2->close();

    $chkPl = $conn->prepare('SELECT placement_id FROM placements WHERE application_id = ? LIMIT 1');
    $chkPl->bind_param('i', $application_id);
    $chkPl->execute();
    $hasPl = $chkPl->get_result()->fetch_assoc();
    $chkPl->close();
    if (!$hasPl) {
        $sql3 = "INSERT INTO placements (application_id, parent_id, helper_id, job_post_id, employment_type, work_schedule, agreed_salary, salary_period, start_date, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'Active', NOW())";
        $stmt3 = $conn->prepare($sql3);
        $stmt3->bind_param(
            'iiiissss',
            $application_id,
            $parent_id,
            $helper_id,
            $job_post_id,
            $jobDetails['employment_type'],
            $jobDetails['work_schedule'],
            $jobDetails['salary_offered'],
            $jobDetails['salary_period']
        );
        $stmt3->execute();
        $stmt3->close();
    }

    $sql4 = "UPDATE job_applications SET status = 'Rejected', parent_notes = 'Position has been filled', updated_at = NOW()
             WHERE job_post_id = ? AND application_id != ?
               AND status NOT IN ('hired', 'Accepted', 'Rejected', 'Withdrawn', 'contract_pending', 'auto_rejected')";
    $stmt4 = $conn->prepare($sql4);
    $stmt4->bind_param('ii', $job_post_id, $application_id);
    $stmt4->execute();
    $stmt4->close();
}

/**
 * Notify rejected applicants after position filled (call after commit).
 */
function carelink_notify_rejected_after_fill(mysqli $conn, int $job_post_id, int $application_id, string $jobTitle): void
{
    require_once __DIR__ . '/create_notification.php';
    $rejectedStmt = $conn->prepare(
        "SELECT helper_id FROM job_applications WHERE job_post_id = ? AND application_id != ? AND status = 'Rejected' AND parent_notes = 'Position has been filled'"
    );
    $rejectedStmt->bind_param('ii', $job_post_id, $application_id);
    $rejectedStmt->execute();
    $rejResult = $rejectedStmt->get_result();
    while ($rRow = $rejResult->fetch_assoc()) {
        createNotification(
            $conn,
            (int) $rRow['helper_id'],
            'status_changed',
            'Application Update',
            "The position \"$jobTitle\" has been filled. Thank you for your interest.",
            'application',
            $application_id
        );
    }
    $rejectedStmt->close();
}
