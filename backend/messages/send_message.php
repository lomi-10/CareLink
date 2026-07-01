<?php
// carelink_api/messages/send_message.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

$input        = json_decode(file_get_contents('php://input'), true);
$sender_id    = isset($input['sender_id'])    ? intval($input['sender_id'])    : 0;
$receiver_id  = isset($input['receiver_id'])  ? intval($input['receiver_id'])  : 0;
$text         = isset($input['message_text']) ? trim($input['message_text'])   : '';
$job_post_id  = isset($input['job_post_id'])  ? intval($input['job_post_id'])  : null;
$message_type = isset($input['message_type']) ? trim($input['message_type'])   : 'text';
$image_url    = isset($input['image_url'])    ? trim($input['image_url'])      : null;
$requester_id = isset($input['requester_id']) ? intval($input['requester_id']) : 0;

$allowed_types = ['text', 'image', 'video_call'];
if (!in_array($message_type, $allowed_types)) $message_type = 'text';

// image messages can have empty text; video_call messages carry the URL as text
if (!$sender_id || !$receiver_id || ($text === '' && $message_type === 'text' && !$image_url)) {
    echo json_encode(['success' => false, 'message' => 'sender_id, receiver_id, and message content required']);
    exit();
}

try {
    // Only the real sender's own device can send a message AS that sender —
    // otherwise anyone could impersonate any user in a chat.
    carelink_require_self($requester_id, $sender_id, 'You are not allowed to send messages as this account.');

    $stmt = $conn->prepare(
        "INSERT INTO messages (sender_id, receiver_id, job_post_id, message_text, message_type, image_url, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())"
    );
    $stmt->bind_param("iiisss", $sender_id, $receiver_id, $job_post_id, $text, $message_type, $image_url);
    $stmt->execute();
    $message_id = $conn->insert_id;
    $stmt->close();

    // Notify the receiver (skip notifications for video_call type to avoid noise)
    require_once '../shared/create_notification.php';
    $nameRow = $conn->query("SELECT CONCAT(first_name,' ',last_name) AS n FROM users WHERE user_id = $sender_id")->fetch_assoc();
    $senderName = $nameRow ? $nameRow['n'] : 'Someone';

    if ($message_type === 'video_call') {
        $notifBody = $senderName . ' is inviting you to a video call!';
    } elseif ($message_type === 'image') {
        $notifBody = $senderName . ' sent you an image.';
    } else {
        $notifBody = mb_substr($text, 0, 80) . (mb_strlen($text) > 80 ? '…' : '');
    }
    createNotification($conn, $receiver_id, 'new_message',
        'New Message from ' . $senderName,
        $notifBody,
        'message', $sender_id);

    echo json_encode(['success' => true, 'message_id' => $message_id]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
