<?php
/**
 * Attendance tracking opt-in/out for a placement.
 *   GET  ?application_id=&user_id=&user_type=parent|helper  -> { attendance_tracking }
 *   POST { application_id, user_id, enabled }                -> parent only; sets the flag
 *
 * Attendance is shared record-keeping, not surveillance — the employer can turn
 * it off for a placement (default is on).
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../../shared/placement_settings_table.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $application_id = isset($body['application_id']) ? (int) $body['application_id'] : 0;
        $user_id        = isset($body['user_id']) ? (int) $body['user_id'] : 0;
        $enabled        = !empty($body['enabled']);

        if ($application_id <= 0 || $user_id <= 0) {
            json_out(['success' => false, 'message' => 'application_id and user_id required'], 400);
        }
        // Only the placement's employer may change the setting.
        if (!carelink_v1_assert_can_view_attendance($conn, $application_id, $user_id, 'parent')) {
            json_out(['success' => false, 'message' => 'Forbidden'], 403);
        }
        set_attendance_tracking($conn, $application_id, $enabled);
        json_out(['success' => true, 'attendance_tracking' => $enabled]);
    }

    // GET
    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $user_id        = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type      = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';

    if ($application_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent', 'helper'], true)) {
        json_out(['success' => false, 'message' => 'application_id, user_id, user_type required'], 400);
    }
    if (!carelink_v1_assert_can_view_attendance($conn, $application_id, $user_id, $user_type)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }
    json_out(['success' => true, 'attendance_tracking' => get_attendance_tracking($conn, $application_id)]);

} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}
?>
