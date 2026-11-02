<?php

ob_start();
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST, OPTIONS');
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit();
}

ini_set('display_errors', '0');
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../shared/auth_tokens.php';
require_once __DIR__ . '/../shared/experience_verification.php';

function carelink_work_experience_review_response(bool $success, string $message, int $status = 200): void
{
    if (ob_get_level()) {
        ob_clean();
    }
    http_response_code($status);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit();
}

try {
    $transactionStarted = false;
    if (!$conn) {
        throw new RuntimeException('Database connection failed.');
    }
    $staffId = peso_require_staff($conn);
    if (carelink_authenticated_user_id($conn) !== $staffId) {
        carelink_work_experience_review_response(false, 'Please sign in to the PESO portal again.', 403);
    }
    ensure_experience_verification_schema($conn);

    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        carelink_work_experience_review_response(false, 'Invalid request.', 400);
    }
    $historyId = (int) ($input['history_id'] ?? 0);
    $action = trim((string) ($input['action'] ?? ''));
    $method = trim((string) ($input['method'] ?? ''));
    $note = trim((string) ($input['note'] ?? ''));
    if ($historyId <= 0 || !in_array($action, ['review', 'clear'], true)) {
        carelink_work_experience_review_response(false, 'A valid work-history entry and action are required.', 400);
    }
    if ($action === 'review' && !in_array($method, ['reference_call', 'document_review', 'in_person'], true)) {
        carelink_work_experience_review_response(false, 'Choose how PESO reviewed this entry.', 400);
    }
    if (($action === 'clear' && strlen($note) < 3) || strlen($note) > 500) {
        carelink_work_experience_review_response(false, 'Enter a short reason (up to 500 characters).', 400);
    }

    $conn->begin_transaction();
    $transactionStarted = true;
    $historyStmt = $conn->prepare(
        "SELECT wh.history_id
         FROM helper_work_history wh
         INNER JOIN helper_profiles hp ON hp.profile_id = wh.profile_id
         INNER JOIN users u ON u.user_id = hp.user_id AND u.user_type = 'helper'
         WHERE wh.history_id = ?
         LIMIT 1
         FOR UPDATE"
    );
    if (!$historyStmt) {
        throw new RuntimeException('Unable to prepare the work-history review.');
    }
    $historyStmt->bind_param('i', $historyId);
    if (!$historyStmt->execute()) {
        $historyStmt->close();
        throw new RuntimeException('Unable to load this work-history entry.');
    }
    $history = $historyStmt->get_result()->fetch_assoc();
    $historyStmt->close();
    if (!$history) {
        $conn->rollback();
        $transactionStarted = false;
        carelink_work_experience_review_response(false, 'Work-history entry not found.', 404);
    }

    if ($action === 'review') {
        $updateStmt = $conn->prepare(
            "UPDATE helper_work_history
             SET experience_review_status = 'peso_reviewed',
                 experience_reviewed_by = ?,
                 experience_reviewed_at = NOW(),
                 experience_review_method = ?,
                 experience_review_note = ?
             WHERE history_id = ?"
        );
        if (!$updateStmt) {
            throw new RuntimeException('Unable to prepare the PESO review update.');
        }
        $updateStmt->bind_param('issi', $staffId, $method, $note, $historyId);
        $auditAction = 'WORK_EXPERIENCE_PESO_REVIEWED';
    } else {
        $updateStmt = $conn->prepare(
            "UPDATE helper_work_history
             SET experience_review_status = 'self_reported',
                 experience_reviewed_by = NULL,
                 experience_reviewed_at = NULL,
                 experience_review_method = NULL,
                 experience_review_note = NULL
             WHERE history_id = ?"
        );
        if (!$updateStmt) {
            throw new RuntimeException('Unable to prepare the PESO review update.');
        }
        $updateStmt->bind_param('i', $historyId);
        $auditAction = 'WORK_EXPERIENCE_PESO_REVIEW_CLEARED';
    }
    if (!$updateStmt->execute()) {
        $updateStmt->close();
        throw new RuntimeException('Unable to update this work-history entry.');
    }
    $updateStmt->close();
    peso_audit_verification($conn, $staffId, $auditAction, 'Work Experience', $historyId);
    $conn->commit();
    $transactionStarted = false;
    carelink_work_experience_review_response(true, $action === 'review'
        ? 'Work history marked PESO-reviewed.'
        : 'PESO review removed. This entry is self-reported again.');
} catch (Throwable $e) {
    if (!empty($transactionStarted) && isset($conn) && $conn instanceof mysqli) {
        try {
            $conn->rollback();
        } catch (Throwable $rollbackError) {
            error_log('Work-history review rollback failed: ' . $rollbackError->getMessage());
        }
    }
    error_log('PESO work-history review failed: ' . $e->getMessage());
    carelink_work_experience_review_response(false, $e->getMessage(), 400);
}
