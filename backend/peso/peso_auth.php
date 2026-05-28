<?php
/**
 * Shared guard for PESO staff-only GET/report endpoints.
 * Client passes staff_user_id query param (logged-in PESO user from AsyncStorage).
 */
declare(strict_types=1);

/**
 * @param mysqli $conn
 * @return int authenticated PESO staff user_id
 */
function peso_require_staff(mysqli $conn): int
{
    $raw = isset($_GET['staff_user_id']) ? trim((string) $_GET['staff_user_id']) : '';
    if ($raw === '') {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'message' => 'PESO staff authentication required. Pass staff_user_id query parameter.']);
        exit();
    }
    $uid = (int) $raw;
    if ($uid <= 0) {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'message' => 'Invalid staff_user_id.']);
        exit();
    }

    $st = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'peso' AND LOWER(TRIM(status)) = 'approved' LIMIT 1");
    if (!$st) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'message' => 'Auth check failed']);
        exit();
    }
    $st->bind_param('i', $uid);
    $st->execute();
    $res = $st->get_result();
    $ok = $res && $res->num_rows > 0;
    $st->close();

    if (!$ok) {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'message' => 'Not an approved PESO staff account.']);
        exit();
    }

    return $uid;
}

/**
 * Verify JSON actor for mutations (verify_user, verify_document, update_job_status).
 */
function peso_validate_staff_actor(mysqli $conn, int $verified_by): void
{
    if ($verified_by <= 0) {
        throw new Exception('verified_by (PESO staff user id) is required');
    }
    $st = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'peso' AND LOWER(TRIM(status)) = 'approved' LIMIT 1");
    if (!$st) {
        throw new Exception('Auth check failed');
    }
    $st->bind_param('i', $verified_by);
    $st->execute();
    $res = $st->get_result();
    $ok = $res && $res->num_rows > 0;
    $st->close();
    if (!$ok) {
        throw new Exception('verified_by must be an approved PESO staff account');
    }
}

/**
 * Mandatory audit row for every successful approve/reject path.
 *
 * @throws Exception when INSERT fails (forces transaction rollback upstream)
 */
function peso_audit_verification(mysqli $conn, int $staffUserId, string $actionCode, string $module, int $recordId): void
{
    $stmt = $conn->prepare('INSERT INTO log_trail (user_id, action, module, record_id, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    if (!$stmt) {
        throw new Exception('Audit log prepare failed: ' . $conn->error);
    }
    $status = 'Success';
    $stmt->bind_param('issis', $staffUserId, $actionCode, $module, $recordId, $status);
    if (!$stmt->execute()) {
        $err = $stmt->error;
        $stmt->close();
        throw new Exception('Audit log insert failed: ' . $err);
    }
    $stmt->close();
}
