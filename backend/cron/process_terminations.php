<?php
/**
 * Run daily (scheduler / Laragon cron). Moves termination_pending → terminated after last working day.
 * php process_terminations.php
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/create_notification.php';

if (!$conn) {
    fwrite(STDERR, "No DB\n");
    exit(1);
}

$sel = $conn->prepare('
    SELECT ja.application_id, ja.helper_id, jp.parent_id, jp.title AS job_title
    FROM job_applications ja
    INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
    WHERE ja.status = \'termination_pending\'
      AND ja.termination_last_day IS NOT NULL
      AND ja.termination_last_day < CURDATE()
');
if (!$sel) {
    fwrite(STDERR, "Prepare failed\n");
    exit(1);
}
$sel->execute();
$res = $sel->get_result();
$rows = [];
while ($r = $res->fetch_assoc()) {
    $rows[] = $r;
}
$sel->close();

foreach ($rows as $row) {
    $application_id = (int) $row['application_id'];
    $helper_id = (int) $row['helper_id'];
    $parent_id = (int) $row['parent_id'];
    $job_title = (string) $row['job_title'];

    $conn->begin_transaction();
    try {
        $up = $conn->prepare('
            UPDATE job_applications
            SET status = \'terminated\', updated_at = NOW()
            WHERE application_id = ? AND status = \'termination_pending\'
        ');
        $up->bind_param('i', $application_id);
        $up->execute();
        $changed = $up->affected_rows;
        $up->close();

        if ($changed > 0) {
            $pStmt = $conn->prepare(
                "UPDATE placements SET status = 'Terminated', ended_at = NOW() WHERE application_id = ? AND status = 'Active'"
            );
            if ($pStmt) {
                $pStmt->bind_param('i', $application_id);
                $pStmt->execute();
                $pStmt->close();
            }
        }
        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        error_log('process_terminations tx: ' . $e->getMessage());
        continue;
    }

    if ($changed === 0) {
        continue;
    }

    $msgP = "Employment for \"{$job_title}\" has ended. Thank you for using CareLink.";
    $msgH = "Your employment for \"{$job_title}\" has ended. Work mode is now off.";

    carelink_create_notification(
        $conn,
        $parent_id,
        'contract_terminated',
        'Employment ended',
        $msgP,
        'application',
        $application_id
    );
    carelink_create_notification(
        $conn,
        $helper_id,
        'contract_terminated',
        'Employment ended',
        $msgH,
        'application',
        $application_id
    );
}

$conn->close();
echo json_encode(['success' => true, 'processed' => count($rows)]) . "\n";
