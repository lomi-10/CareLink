<?php
// carelink_api/peso/get_notifications.php — same shape as helper/parent

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
if (!$user_id) { echo json_encode(['success' => false, 'message' => 'user_id required']); exit(); }

try {
    $chk = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'peso'");
    $chk->bind_param("i", $user_id);
    $chk->execute();
    if ($chk->get_result()->num_rows === 0) {
        $chk->close();
        echo json_encode(['success' => false, 'message' => 'Not a PESO account']);
        exit();
    }
    $chk->close();

    $stmt = $conn->prepare(
        "SELECT notification_id, type, title, message, is_read, ref_type, ref_id, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 80"
    );
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $notifications = [];
    $unread = 0;
    while ($row = $result->fetch_assoc()) {
        $row['notification_id'] = (int)$row['notification_id'];
        $row['is_read'] = (bool)$row['is_read'];
        $row['ref_id']  = $row['ref_id'] !== null ? (int)$row['ref_id'] : null;
        if (!$row['is_read']) $unread++;
        $notifications[] = $row;
    }
    $stmt->close();

    echo json_encode(['success' => true, 'notifications' => $notifications, 'unread_count' => $unread]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
