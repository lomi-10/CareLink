<?php
/**
 * POST JSON: application_id, user_id, user_type (parent|helper), reason, note (optional), is_mutual_agreement (bool)
 * Sets termination_* fields and status = termination_pending; notifies counterparty and PESO users.
 */

ob_start();
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/termination_helpers.php';
require_once __DIR__ . '/../../shared/create_notification.php';

function carelink_term_json(bool $ok, string $message, array $extra = []): void
{
    if (ob_get_level()) {
        ob_clean();
    }
    echo json_encode(array_merge(['success' => $ok, 'message' => $message], $extra));
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST required');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('Invalid JSON');
    }

    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';
    $reason_in = isset($input['reason']) ? trim((string) $input['reason']) : '';
    $note = isset($input['note']) ? trim((string) $input['note']) : '';
    $is_mutual = !empty($input['is_mutual_agreement']);

    if ($application_id <= 0 || $user_id <= 0) {
        throw new Exception('application_id and user_id are required');
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        throw new Exception('user_type must be parent or helper');
    }
    if ($note !== '' && strlen($note) > 2000) {
        $note = substr($note, 0, 2000);
    }

    $allowed = carelink_termination_reason_codes();
    $reason = $is_mutual ? 'mutual_agreement' : $reason_in;
    if (!in_array($reason, $allowed, true)) {
        throw new Exception('Invalid or missing termination reason');
    }

    $conn->begin_transaction();

    $sql = "
        SELECT ja.application_id, ja.helper_id, ja.status,
               ja.employer_signed_at, ja.helper_signed_at,
               jp.parent_id, jp.title AS job_title
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ?
        LIMIT 1
        FOR UPDATE
    ";
    $st = $conn->prepare($sql);
    $st->bind_param('i', $application_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row) {
        $conn->rollback();
        throw new Exception('Application not found');
    }

    $status = trim((string) $row['status']);
    if (!in_array($status, ['hired', 'Accepted'], true)) {
        $conn->rollback();
        throw new Exception('Termination can only start from an active hire');
    }
    if (empty($row['employer_signed_at']) || empty($row['helper_signed_at'])) {
        $conn->rollback();
        throw new Exception('Both parties must have signed before ending employment');
    }

    $parent_id = (int) $row['parent_id'];
    $helper_id = (int) $row['helper_id'];
    if ($user_type === 'parent' && $user_id !== $parent_id) {
        $conn->rollback();
        throw new Exception('Not authorized');
    }
    if ($user_type === 'helper' && $user_id !== $helper_id) {
        $conn->rollback();
        throw new Exception('Not authorized');
    }

    $dates = carelink_termination_compute_dates($is_mutual);
    $notice = $dates['notice_date'];
    $last = $dates['last_day'];

    $up = $conn->prepare('
        UPDATE job_applications SET
            status = \'termination_pending\',
            termination_initiated_by = ?,
            termination_reason = ?,
            termination_note = ?,
            termination_notice_date = ?,
            termination_last_day = ?,
            updated_at = NOW()
        WHERE application_id = ? AND status IN (\'hired\', \'Accepted\')
    ');
    $reason_db = $reason;
    $up->bind_param('issssi', $user_id, $reason_db, $note, $notice, $last, $application_id);
    $up->execute();
    if ($up->affected_rows === 0) {
        $up->close();
        $conn->rollback();
        throw new Exception('Could not start termination (application may have changed)');
    }
    $up->close();

    $conn->commit();

    $job_title = (string) $row['job_title'];
    $pu = $conn->query("SELECT first_name, last_name FROM users WHERE user_id = {$parent_id}")->fetch_assoc();
    $hu = $conn->query("SELECT first_name, last_name FROM users WHERE user_id = {$helper_id}")->fetch_assoc();
    $parent_name = $pu ? trim($pu['first_name'] . ' ' . $pu['last_name']) : 'Employer';
    $helper_name = $hu ? trim($hu['first_name'] . ' ' . $hu['last_name']) : 'Helper';

    $who = $user_type === 'parent' ? $parent_name : $helper_name;
    $counter_id = $user_type === 'parent' ? $helper_id : $parent_id;
    $counter_msg = "{$who} has started ending the placement for \"{$job_title}\". Last working day: {$last}. Open the app for details.";

    carelink_create_notification(
        $conn,
        $counter_id,
        'contract_terminated',
        'Employment ending',
        $counter_msg,
        'application',
        $application_id
    );

    carelink_notify_all_peso_users_contract_terminated(
        $conn,
        $application_id,
        $job_title,
        $parent_name,
        $helper_name,
        $last
    );

    $pay = carelink_termination_final_pay_estimate($conn, $application_id, $last);

    carelink_term_json(true, 'Termination started.', [
        'status' => 'termination_pending',
        'termination_notice_date' => $notice,
        'termination_last_day' => $last,
        'termination_reason' => $reason_db,
        'final_pay_estimate' => $pay,
    ]);
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    error_log('termination_initiate: ' . $e->getMessage());
    carelink_term_json(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
