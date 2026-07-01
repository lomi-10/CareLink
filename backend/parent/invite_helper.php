<?php
// carelink_api/parent/invite_helper.php
// Parent invites a helper to apply for a specific job.
// Creates a message in the messages table AND a notification for the helper.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);
ob_start();
require_once '../dbcon.php';
require_once '../shared/create_notification.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

try {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) throw new Exception('Invalid JSON');

    $parent_id   = isset($body['parent_id'])   ? intval($body['parent_id'])   : 0;
    $helper_id   = isset($body['helper_id'])   ? intval($body['helper_id'])   : 0;
    $job_post_id = isset($body['job_post_id']) ? intval($body['job_post_id']) : 0;

    if (!$parent_id || !$helper_id || !$job_post_id)
        throw new Exception('parent_id, helper_id and job_post_id are required');

    $requester_id = isset($body['requester_id']) ? intval($body['requester_id']) : 0;
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to send invitations for this employer account.');

    // ── Get parent name + job title ──────────────────────────────────────────
    $stmt = $conn->prepare("SELECT first_name, last_name FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $parent_id);
    $stmt->execute();
    $parent = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$parent) throw new Exception('Parent not found');
    $parentName = trim($parent['first_name'] . ' ' . $parent['last_name']);

    $stmt = $conn->prepare("SELECT title, category_id FROM job_posts WHERE job_post_id = ? AND parent_id = ?");
    $stmt->bind_param("ii", $job_post_id, $parent_id);
    $stmt->execute();
    $job = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$job) throw new Exception('Job post not found or does not belong to this parent');
    $jobTitle = $job['title'];

    // ── Check: helper hasn't already applied or been invited ────────────────
    $stmt = $conn->prepare(
        "SELECT message_id FROM messages
         WHERE sender_id = ? AND receiver_id = ? AND job_post_id = ?
           AND message_text LIKE '%invited you to apply%'
         LIMIT 1"
    );
    $stmt->bind_param("iii", $parent_id, $helper_id, $job_post_id);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($existing) throw new Exception('You have already sent an invitation for this job to this helper.');

    // ── Send invitation message ──────────────────────────────────────────────
    $messageText = "Hi! I'd like to invite you to apply for my job posting: \"{$jobTitle}\". "
        . "Please check the job listing and apply if you're interested. Looking forward to hearing from you!";

    $stmt = $conn->prepare(
        "INSERT INTO messages (sender_id, receiver_id, message_text, job_post_id, message_type, sent_at)
         VALUES (?, ?, ?, ?, 'text', NOW())"
    );
    $stmt->bind_param("iisi", $parent_id, $helper_id, $messageText, $job_post_id);
    $stmt->execute();
    $message_id = $conn->insert_id;
    $stmt->close();

    if (!$message_id) throw new Exception('Failed to send invitation message');

    // ── Notify the helper ────────────────────────────────────────────────────
    createNotification(
        $conn,
        $helper_id,
        'job_invite',
        'Job Invitation',
        "{$parentName} invited you to apply for \"{$jobTitle}\"",
        'job',
        $job_post_id
    );

    sendResponse(true, 'Invitation sent successfully!', ['message_id' => $message_id]);

} catch (Exception $e) {
    sendResponse(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
