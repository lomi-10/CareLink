<?php
// carelink_api/messages/get_conversations.php
// Returns a list of conversations (unique chat partners) with latest message preview

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
    // Get latest message per conversation partner, with partner info
    $stmt = $conn->prepare("
        SELECT
            m.message_id,
            m.message_text,
            m.message_type,
            m.sent_at,
            m.is_read,
            m.sender_id,
            m.job_post_id,
            jp.title AS job_title,
            CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS partner_id,
            u.first_name, u.last_name, u.user_type,
            hp.profile_image AS helper_photo,
            pp.profile_image AS parent_photo,
            (SELECT COUNT(*) FROM messages
             WHERE receiver_id = ? AND is_read = 0
             AND sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
            ) AS unread_count
        FROM messages m
        JOIN (
            SELECT MAX(message_id) AS max_id
            FROM messages
            WHERE sender_id = ? OR receiver_id = ?
            GROUP BY LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
        ) latest ON m.message_id = latest.max_id
        JOIN users u ON u.user_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        LEFT JOIN helper_profiles hp ON u.user_id = hp.user_id AND u.user_type = 'helper'
        LEFT JOIN parent_profiles  pp ON u.user_id = pp.user_id AND u.user_type = 'parent'
        LEFT JOIN job_posts jp ON m.job_post_id = jp.job_post_id
        ORDER BY m.sent_at DESC
    ");
    $stmt->bind_param("iiiiii", $user_id, $user_id, $user_id, $user_id, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $base = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
    $conversations = [];
    while ($row = $result->fetch_assoc()) {
        $rawPhoto = ($row['user_type'] === 'helper') ? $row['helper_photo'] : $row['parent_photo'];
        $photo    = null;
        if ($rawPhoto) {
            $photo = (stripos($rawPhoto, 'http') === 0) ? $rawPhoto : $base . $rawPhoto;
        }
        $msgType = $row['message_type'] ?? 'text';
        $previewText = $row['message_text'];
        if ($msgType === 'image')      $previewText = 'Sent a photo';
        if ($msgType === 'video_call') $previewText = 'Video call invitation';

        $conversations[] = [
            'partner_id'    => (int)$row['partner_id'],
            'partner_name'  => trim($row['first_name'] . ' ' . $row['last_name']),
            'partner_type'  => $row['user_type'],
            'partner_photo' => $photo,
            'last_message'  => $previewText,
            'last_sent_at'  => $row['sent_at'],
            'is_mine'       => (int)$row['sender_id'] === $user_id,
            'unread_count'  => (int)$row['unread_count'],
            'job_post_id'   => $row['job_post_id'] ? (int)$row['job_post_id'] : null,
            'job_title'     => $row['job_title'],
        ];
    }
    $stmt->close();

    echo json_encode(['success' => true, 'conversations' => $conversations]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
