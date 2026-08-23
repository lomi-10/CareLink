<?php
/**
 * admin/delete_feedback.php — remove evaluation responses.
 *
 * Needed because the database carries sample/demo responses from testing, and
 * leaving them in would corrupt the Chapter 4 weighted means with data that was
 * never given by a real respondent. Deleting research data is a real action, so:
 *
 *   - super admin only;
 *   - every deletion writes an audit row naming what was removed;
 *   - three explicit scopes, no "delete everything" convenience.
 *
 * POST { admin_user_id, scope, answer_id? | user_id? | feedback_id? }
 *   scope = 'answer'      remove one answer to one question
 *         = 'respondent'  remove every instrument answer by one user
 *         = 'system'      remove one end-of-demo system_feedback row
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/admin_auth.php';

function out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $adminId = (int) ($in['admin_user_id'] ?? 0);
    $scope   = trim((string) ($in['scope'] ?? ''));

    admin_require_staff($conn, $adminId);

    $removed = 0;
    $what = '';

    if ($scope === 'answer') {
        $answerId = (int) ($in['answer_id'] ?? 0);
        if ($answerId <= 0) throw new Exception('answer_id is required.');
        $st = $conn->prepare('DELETE FROM feedback_answers WHERE answer_id = ?');
        $st->bind_param('i', $answerId);
        $st->execute();
        $removed = $st->affected_rows;
        $st->close();
        $what = 'answer #' . $answerId;

    } elseif ($scope === 'respondent') {
        $userId = (int) ($in['user_id'] ?? 0);
        if ($userId <= 0) throw new Exception('user_id is required.');
        $st = $conn->prepare('DELETE FROM feedback_answers WHERE user_id = ?');
        $st->bind_param('i', $userId);
        $st->execute();
        $removed = $st->affected_rows;
        $st->close();
        $what = 'all ' . $removed . ' answers by user #' . $userId;

    } elseif ($scope === 'system') {
        $feedbackId = (int) ($in['feedback_id'] ?? 0);
        if ($feedbackId <= 0) throw new Exception('feedback_id is required.');
        $st = $conn->prepare('DELETE FROM system_feedback WHERE feedback_id = ?');
        $st->bind_param('i', $feedbackId);
        $st->execute();
        $removed = $st->affected_rows;
        $st->close();
        $what = 'system feedback #' . $feedbackId;

    } else {
        throw new Exception('scope must be answer, respondent or system.');
    }

    if ($removed === 0) out(false, 'Nothing matched — it may already have been deleted.');

    // Deleting research data leaves a trace, always.
    $log = $conn->prepare(
        "INSERT INTO log_trail (user_id, action, module, record_id, status, created_at)
         VALUES (?, ?, 'Evaluation', ?, 'Success', NOW())"
    );
    if ($log) {
        $action = 'DELETE_FEEDBACK_' . strtoupper($scope);
        $rid = (int) ($in['answer_id'] ?? $in['user_id'] ?? $in['feedback_id'] ?? 0);
        $log->bind_param('isi', $adminId, $action, $rid);
        $log->execute();
        $log->close();
    }

    out(true, 'Removed ' . $what . '.', ['removed' => $removed]);

} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
