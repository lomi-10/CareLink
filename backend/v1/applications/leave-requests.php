<?php
/**
 * GET /api/v1/applications/{application_id}/leave-requests
 * ?application_id=&user_id=&user_type=parent|helper
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../../shared/mysqli_stmt_helpers.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | (defined('JSON_INVALID_UTF8_SUBSTITUTE') ? JSON_INVALID_UTF8_SUBSTITUTE : 0)
    );
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';

    if ($application_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent', 'helper'], true)) {
        json_out(['success' => false, 'message' => 'application_id, user_id, user_type required'], 400);
    }

    if (!carelink_v1_assert_can_view_attendance($conn, $application_id, $user_id, $user_type)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $st = $conn->prepare("
        SELECT lr.id, lr.application_id, lr.helper_id, lr.`date`, lr.reason_code, lr.helper_note, lr.reason,
               lr.status, lr.paid_leave, lr.response_note, lr.responded_at, lr.responded_by,
               lr.created_at, lr.updated_at,
               TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS helper_name
        FROM leave_requests lr
        LEFT JOIN users u ON u.user_id = lr.helper_id
        WHERE lr.application_id = ?
        ORDER BY CASE LOWER(TRIM(COALESCE(lr.status, '')))
            WHEN 'pending' THEN 0
            WHEN 'approved' THEN 1
            WHEN 'declined' THEN 2
            ELSE 3 END,
            lr.`date` DESC,
            lr.id DESC
    ");
    if (!$st) {
        throw new Exception(
            'Could not prepare leave list query. If `leave_requests` table is missing, run carelink_api/migrations/leave_requests_table.sql — ' . $conn->error
        );
    }
    $st->bind_param('i', $application_id);
    if (!$st->execute()) {
        $err = $st->error;
        $st->close();
        throw new Exception('Could not load leave requests: ' . $err);
    }
    $all = carelink_mysqli_stmt_fetch_all_assoc($st);
    $st->close();
    $rows = [];
    foreach ($all as $r) {
        $hn = trim((string) ($r['helper_name'] ?? ''));
        $rows[] = [
            'id' => (int) $r['id'],
            'application_id' => (int) $r['application_id'],
            'helper_id' => (int) $r['helper_id'],
            'helper_name' => $hn !== '' ? $hn : null,
            'date' => $r['date'],
            'reason_code' => $r['reason_code'] ?? 'other',
            'helper_note' => $r['helper_note'] ?? null,
            'reason' => $r['reason'],
            'status' => $r['status'],
            'paid_leave' => isset($r['paid_leave']) && $r['paid_leave'] !== null ? (int) $r['paid_leave'] : null,
            'response_note' => $r['response_note'] ?? null,
            'responded_at' => $r['responded_at'],
            'responded_by' => isset($r['responded_by']) && $r['responded_by'] !== null ? (int) $r['responded_by'] : null,
            'created_at' => $r['created_at'],
            'updated_at' => $r['updated_at'],
        ];
    }

    json_out(['success' => true, 'data' => $rows]);
} catch (Throwable $e) {
    error_log('[leave-requests.php] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_out(
        [
            'success' => false,
            'message' => $e->getMessage(),
            'error_type' => get_class($e),
        ],
        500
    );
}

if (isset($conn) && $conn) {
    $conn->close();
}
