<?php
/**
 * POST /carelink_api/v1/applications/request_contract_changes.php
 * Body JSON: { "application_id": int, "helper_id": int, "reason": string }
 *
 * Helper-side "Disagree": flags the pending contract for the employer to review and
 * regenerate via /parent/edit_contract.php. Retracts the helper's own signature (if
 * already given) so the hire cannot finalize until the employer addresses the request.
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

function carelink_request_changes_send_json(bool $ok, string $message, array $extra = []): void
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
    $helper_id = isset($input['helper_id']) ? (int) $input['helper_id'] : 0;
    $reason = isset($input['reason']) ? trim((string) $input['reason']) : '';

    if ($application_id <= 0 || $helper_id <= 0) {
        throw new Exception('application_id and helper_id are required');
    }
    if ($reason === '') {
        throw new Exception('Please describe what needs to be changed.');
    }
    if (strlen($reason) > 1000) {
        $reason = substr($reason, 0, 1000);
    }

    $conn->begin_transaction();

    $sql = "
        SELECT ja.application_id, ja.job_post_id, ja.status, ja.helper_id,
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

    if ((int) $row['helper_id'] !== $helper_id) {
        $conn->rollback();
        throw new Exception('Not authorized to request changes for this application');
    }

    $status = trim((string) $row['status']);
    if ($status !== 'contract_pending') {
        $conn->rollback();
        throw new Exception('Contract changes can only be requested while status is contract_pending');
    }

    $parent_id = (int) $row['parent_id'];
    $jobTitle = (string) $row['job_title'];

    $up = $conn->prepare('UPDATE job_applications SET helper_signed_at = NULL, updated_at = NOW() WHERE application_id = ?');
    $up->bind_param('i', $application_id);
    $up->execute();
    $up->close();

    $cu = $conn->prepare('UPDATE contracts SET helper_decline_reason = ?, helper_decline_at = NOW() WHERE application_id = ?');
    $cu->bind_param('si', $reason, $application_id);
    $cu->execute();
    if ($cu->affected_rows === 0) {
        $cu->close();
        $conn->rollback();
        throw new Exception('Contract not found for this application');
    }
    $cu->close();

    $conn->commit();

    require_once __DIR__ . '/../../shared/create_notification.php';
    createNotification(
        $conn,
        $parent_id,
        'status_changed',
        'Helper requested contract changes',
        'The helper requested changes to the contract for: ' . $jobTitle . '. Reason: ' . $reason . '. Please review and regenerate the contract.',
        'application',
        $application_id
    );

    carelink_request_changes_send_json(true, 'Your request has been sent to the employer.', [
        'helper_decline_reason' => $reason,
    ]);
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    error_log('request_contract_changes: ' . $e->getMessage());
    carelink_request_changes_send_json(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
