<?php
// carelink_api/messages/edit_message.php
// Allows a sender to edit their own text message

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';

$input      = json_decode(file_get_contents('php://input'), true);
$message_id = isset($input['message_id']) ? intval($input['message_id']) : 0;
$user_id    = isset($input['user_id'])    ? intval($input['user_id'])    : 0;
$new_text   = isset($input['new_text'])   ? trim($input['new_text'])     : '';

if (!$message_id || !$user_id || $new_text === '') {
    echo json_encode(['success' => false, 'message' => 'message_id, user_id, and new_text required']);
    exit();
}

try {
    // Verify the message belongs to the sender and is a text message
    $check = $conn->prepare(
        "SELECT message_id FROM messages WHERE message_id = ? AND sender_id = ? AND message_type = 'text'"
    );
    $check->bind_param("ii", $message_id, $user_id);
    $check->execute();
    $res = $check->get_result();
    if ($res->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Message not found or not editable']);
        exit();
    }
    $check->close();

    $stmt = $conn->prepare(
        "UPDATE messages SET message_text = ?, is_edited = 1, edited_at = NOW() WHERE message_id = ?"
    );
    $stmt->bind_param("si", $new_text, $message_id);
    $stmt->execute();
    $stmt->close();

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
