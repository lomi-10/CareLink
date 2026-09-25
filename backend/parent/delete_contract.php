<?php
// Delete a pending contract before the helper has signed it.
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$applicationId = (int) ($input['application_id'] ?? 0);
$parentId = (int) ($input['parent_id'] ?? 0);
$requesterId = (int) ($input['requester_id'] ?? 0);

try {
    if (!$applicationId || !$parentId) throw new Exception('application_id and parent_id are required');
    carelink_require_self($requesterId, $parentId, 'You are not allowed to delete this contract.');

    $conn->begin_transaction();
    $stmt = $conn->prepare(
        "SELECT ja.helper_id, ja.status, ja.helper_signed_at, c.pdf_file_path
         FROM job_applications ja
         INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id AND jp.parent_id = ?
         LEFT JOIN contracts c ON c.application_id = ja.application_id
         WHERE ja.application_id = ?
         LIMIT 1 FOR UPDATE"
    );
    $stmt->bind_param('ii', $parentId, $applicationId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) throw new Exception('Contract application not found.');
    if ((string) $row['status'] !== 'contract_pending') throw new Exception('Only a pending contract can be deleted.');
    if (!empty($row['helper_signed_at'])) throw new Exception('This contract cannot be deleted because the helper has already signed it.');

    $delete = $conn->prepare('DELETE FROM contracts WHERE application_id = ?');
    $delete->bind_param('i', $applicationId);
    $delete->execute();
    $delete->close();

    $reset = $conn->prepare(
        "UPDATE job_applications
         SET status = 'Shortlisted', parent_notes = NULL, employer_signed_at = NULL, helper_signed_at = NULL,
             contract_generated_at = NULL, updated_at = NOW()
         WHERE application_id = ?"
    );
    $reset->bind_param('i', $applicationId);
    $reset->execute();
    $reset->close();
    $conn->commit();

    if (!empty($row['pdf_file_path'])) {
        $path = __DIR__ . '/../uploads/' . ltrim((string) $row['pdf_file_path'], '/');
        if (is_file($path)) @unlink($path);
    }

    require_once __DIR__ . '/../shared/create_notification.php';
    createNotification($conn, (int) $row['helper_id'], 'status_changed', 'Contract withdrawn',
        'The employer deleted the pending contract. Your application is available for further opportunities.',
        'application', $applicationId);
    echo json_encode(['success' => true, 'message' => 'Pending contract deleted.']);
} catch (Throwable $e) {
    if (isset($conn)) $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}