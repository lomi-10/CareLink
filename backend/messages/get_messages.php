<?php
// carelink_api/messages/get_messages.php
// Returns all messages between two users, marks them as read

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';

$user_id    = isset($_GET['user_id'])    ? intval($_GET['user_id'])    : 0;
$partner_id = isset($_GET['partner_id']) ? intval($_GET['partner_id']) : 0;
if (!$user_id || !$partner_id) {
    echo json_encode(['success' => false, 'message' => 'user_id and partner_id required']);
    exit();
}

try {
    // Mark messages from partner as read
    $markStmt = $conn->prepare(
        "UPDATE messages SET is_read = 1, read_at = NOW()
         WHERE sender_id = ? AND receiver_id = ? AND is_read = 0"
    );
    $markStmt->bind_param("ii", $partner_id, $user_id);
    $markStmt->execute();
    $markStmt->close();

    // Fetch all messages in the thread
    $stmt = $conn->prepare("
        SELECT message_id, sender_id, receiver_id, message_text,
               message_type, image_url, is_edited, edited_at,
               is_read, sent_at, job_post_id
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?)
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY sent_at ASC
    ");
    $stmt->bind_param("iiii", $user_id, $partner_id, $partner_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    // Chat images are stored under project root: uploads/messages/ (sibling of carelink_api/), not inside carelink_api/.
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $apiBase = $scheme . '://' . $host . rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/');

    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $imageUrl = null;
        if ($row['image_url']) {
            $rel = $row['image_url'];
            if (strpos($rel, 'http') === 0) {
                $imageUrl = $rel;
            } elseif (strpos($rel, 'uploads/') === 0) {
                $imageUrl = $scheme . '://' . $host . '/' . ltrim($rel, '/');
            } else {
                $imageUrl = $apiBase . '/' . ltrim($rel, '/');
            }
        }
        $messages[] = [
            'message_id'   => (int)$row['message_id'],
            'sender_id'    => (int)$row['sender_id'],
            'receiver_id'  => (int)$row['receiver_id'],
            'message_text' => $row['message_text'],
            'message_type' => $row['message_type'] ?? 'text',
            'image_url'    => $imageUrl,
            'is_edited'    => (bool)$row['is_edited'],
            'edited_at'    => $row['edited_at'],
            'is_read'      => (bool)$row['is_read'],
            'sent_at'      => $row['sent_at'],
            'job_post_id'  => $row['job_post_id'] ? (int)$row['job_post_id'] : null,
        ];
    }
    $stmt->close();

    echo json_encode(['success' => true, 'messages' => $messages]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
