<?php
// carelink_api/shared/mark_read.php
// Mark notifications as read for a user (all or specific)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';
require_once __DIR__ . '/ownership_guard.php';

$input = json_decode(file_get_contents('php://input'), true);
$user_id         = isset($input['user_id'])         ? intval($input['user_id'])         : 0;
$notification_id = isset($input['notification_id']) ? intval($input['notification_id']) : null;
$requester_id    = isset($input['requester_id'])    ? intval($input['requester_id'])    : 0;

if (!$user_id) { echo json_encode(['success' => false, 'message' => 'user_id required']); exit(); }

try {
    carelink_require_self($requester_id, $user_id, 'You are not allowed to modify these notifications.');
    if ($notification_id) {
        // Mark single notification
        $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $notification_id, $user_id);
    } else {
        // Mark all
        $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
        $stmt->bind_param("i", $user_id);
    }
    $stmt->execute();
    $stmt->close();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
