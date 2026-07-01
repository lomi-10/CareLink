<?php
// carelink_api/messages/get_conversations.php
// Returns a list of conversations (unique chat partners) with latest message preview.
// Also surfaces "pending" connections (shortlisted-or-further job applications) that
// don't have any messages yet, so parents/helpers can find each other right away.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

$user_id      = isset($_GET['user_id'])      ? intval($_GET['user_id'])      : 0;
$requester_id = isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0;
if (!$user_id) { echo json_encode(['success' => false, 'message' => 'user_id required']); exit(); }

try {
    // Only the inbox's own owner can list their conversations.
    carelink_require_self($requester_id, $user_id, 'You are not allowed to view this inbox.');

    $base = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
    $conversations = [];
    $seenPartners  = [];

    // 1. Existing message threads — latest message per conversation partner
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

        $partnerId = (int)$row['partner_id'];
        $conversations[] = [
            'partner_id'         => $partnerId,
            'partner_name'       => trim($row['first_name'] . ' ' . $row['last_name']),
            'partner_type'       => $row['user_type'],
            'partner_photo'      => $photo,
            'last_message'       => $previewText,
            'last_sent_at'       => $row['sent_at'],
            'is_mine'            => (int)$row['sender_id'] === $user_id,
            'unread_count'       => (int)$row['unread_count'],
            'job_post_id'        => $row['job_post_id'] ? (int)$row['job_post_id'] : null,
            'job_title'          => $row['job_title'],
            'has_messages'       => true,
            'application_status' => null,
        ];
        $seenPartners[$partnerId] = true;
    }
    $stmt->close();

    // 2. Pending connections — shortlisted-or-further applications without messages yet
    $shortlistedStatuses = "'Shortlisted','Interview Scheduled','Accepted','contract_pending','hired'";
    $userRow  = $conn->query("SELECT user_type FROM users WHERE user_id = $user_id")->fetch_assoc();
    $userType = $userRow['user_type'] ?? null;

    $stmt2 = null;
    if ($userType === 'parent') {
        $stmt2 = $conn->prepare("
            SELECT
                ja.helper_id AS partner_id, ja.job_post_id, jp.title AS job_title, ja.status,
                COALESCE(ja.updated_at, ja.reviewed_at, ja.applied_at) AS event_at,
                u.first_name, u.last_name, u.user_type, hp.profile_image
            FROM job_applications ja
            JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
            JOIN users u ON u.user_id = ja.helper_id
            LEFT JOIN helper_profiles hp ON hp.user_id = u.user_id
            WHERE jp.parent_id = ? AND ja.status IN ($shortlistedStatuses)
            ORDER BY event_at DESC
        ");
    } elseif ($userType === 'helper') {
        $stmt2 = $conn->prepare("
            SELECT
                jp.parent_id AS partner_id, ja.job_post_id, jp.title AS job_title, ja.status,
                COALESCE(ja.updated_at, ja.reviewed_at, ja.applied_at) AS event_at,
                u.first_name, u.last_name, u.user_type, pp.profile_image
            FROM job_applications ja
            JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
            JOIN users u ON u.user_id = jp.parent_id
            LEFT JOIN parent_profiles pp ON pp.user_id = u.user_id
            WHERE ja.helper_id = ? AND ja.status IN ($shortlistedStatuses)
            ORDER BY event_at DESC
        ");
    }

    if ($stmt2) {
        $stmt2->bind_param("i", $user_id);
        $stmt2->execute();
        $res2 = $stmt2->get_result();
        while ($row = $res2->fetch_assoc()) {
            $partnerId = (int)$row['partner_id'];
            if (isset($seenPartners[$partnerId])) continue; // already has a message thread
            $seenPartners[$partnerId] = true; // first row per partner is the most recent (ORDER BY event_at DESC)

            $rawPhoto = $row['profile_image'] ?? null;
            $photo    = null;
            if ($rawPhoto) {
                $photo = (stripos($rawPhoto, 'http') === 0) ? $rawPhoto : $base . $rawPhoto;
            }

            $conversations[] = [
                'partner_id'         => $partnerId,
                'partner_name'       => trim($row['first_name'] . ' ' . $row['last_name']),
                'partner_type'       => $row['user_type'],
                'partner_photo'      => $photo,
                'last_message'       => null,
                'last_sent_at'       => $row['event_at'],
                'is_mine'            => false,
                'unread_count'       => 0,
                'job_post_id'        => (int)$row['job_post_id'],
                'job_title'          => $row['job_title'],
                'has_messages'       => false,
                'application_status' => $row['status'],
            ];
        }
        $stmt2->close();
    }

    usort($conversations, function ($a, $b) {
        return strtotime($b['last_sent_at']) <=> strtotime($a['last_sent_at']);
    });

    echo json_encode(['success' => true, 'conversations' => $conversations]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
