<?php
/**
 * shared/get_support_contact.php — which Super Admin an ordinary helper or
 * parent should message for support.
 *
 * GET -> { success, admin: { user_id, name } | null }
 *
 * staff_contacts.php answers "who may a staff member message" and requires
 * the caller to already BE staff — an ordinary user has no way to discover
 * an admin's user_id at all otherwise. This is the one-directional counterpart:
 * a fixed, deterministic contact (not a directory), used by entry points like
 * "No questions available — any concerns?" on the feedback screen.
 * Sending itself reuses the ordinary messages/send_message.php — no
 * restriction there blocks a helper/parent from writing to an admin.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';

try {
    if (!$conn) throw new Exception('Database connection failed');

    $row = $conn->query(
        "SELECT user_id, first_name, last_name FROM users
          WHERE user_type = 'admin' AND status = 'approved'
          ORDER BY user_id ASC LIMIT 1"
    )->fetch_assoc();

    if (!$row) {
        echo json_encode(['success' => true, 'admin' => null]);
        exit();
    }

    $name = trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
    echo json_encode([
        'success' => true,
        'admin'   => ['user_id' => (int) $row['user_id'], 'name' => $name !== '' ? $name : 'CareLink Support'],
    ]);
} catch (Throwable $e) {
    error_log('get_support_contact.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Could not resolve a support contact.']);
}
