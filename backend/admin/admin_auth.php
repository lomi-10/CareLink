<?php
/**
 * Shared guard for super-admin-only endpoints.
 * Mirrors peso/peso_auth.php's pattern, for user_type = 'admin'.
 */
declare(strict_types=1);

/**
 * @param mysqli $conn
 * @param int $adminId already-parsed candidate admin user id
 * @return int authenticated admin user_id
 */
function admin_require_staff(mysqli $conn, int $adminId): int
{
    if ($adminId <= 0) {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'message' => 'Admin authentication required. Pass admin_user_id.']);
        exit();
    }

    $st = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'admin' LIMIT 1");
    if (!$st) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'message' => 'Auth check failed']);
        exit();
    }
    $st->bind_param('i', $adminId);
    $st->execute();
    $res = $st->get_result();
    $ok = $res && $res->num_rows > 0;
    $st->close();

    if (!$ok) {
        http_response_code(403);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['success' => false, 'message' => 'Not an approved admin account.']);
        exit();
    }

    return $adminId;
}
