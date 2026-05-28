<?php
// Helper proposes an interview time from chat — notifies parent + optional chat line

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';
require_once '../shared/create_notification.php';

$input = json_decode(file_get_contents('php://input'), true);
$helper_id   = isset($input['helper_id'])   ? intval($input['helper_id'])   : 0;
$parent_id   = isset($input['parent_id'])   ? intval($input['parent_id'])   : 0;
$job_post_id = isset($input['job_post_id']) ? intval($input['job_post_id']) : 0;
$proposed    = isset($input['proposed_datetime']) ? trim($input['proposed_datetime']) : '';
$notes       = isset($input['notes']) ? trim($input['notes']) : '';

if (!$helper_id || !$parent_id || !$proposed) {
    echo json_encode(['success' => false, 'message' => 'helper_id, parent_id, and proposed_datetime required']);
    exit();
}

try {
    $h = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'helper'");
    $h->bind_param("i", $helper_id);
    $h->execute();
    if ($h->get_result()->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid helper']);
        exit();
    }
    $h->close();

    $p = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'parent'");
    $p->bind_param("i", $parent_id);
    $p->execute();
    if ($p->get_result()->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid parent']);
        exit();
    }
    $p->close();

    $nameRow = $conn->query("SELECT CONCAT(first_name,' ',last_name) AS n FROM users WHERE user_id = $helper_id")->fetch_assoc();
    $helperName = $nameRow ? $nameRow['n'] : 'A helper';

    $jobTitle = '';
    if ($job_post_id > 0) {
        $jr = $conn->query("SELECT title FROM job_posts WHERE job_post_id = $job_post_id AND parent_id = $parent_id")->fetch_assoc();
        $jobTitle = $jr ? ' for "' . $jr['title'] . '"' : '';
    }

    $body = $helperName . ' proposed an interview' . $jobTitle . '. Preferred time: ' . $proposed . '.';
    if ($notes !== '') $body .= ' Notes: ' . $notes;

    createNotification($conn, $parent_id, 'interview_request',
        'Interview time proposed',
        $body,
        'message', $helper_id);

    // Chat message so thread shows context
    $chatLine = "[Interview request] I'd like to schedule an interview. Proposed: $proposed" . ($notes ? ". Notes: $notes" : '');
    $jp = $job_post_id > 0 ? $job_post_id : null;
    if ($jp === null) {
        $stmt = $conn->prepare(
            "INSERT INTO messages (sender_id, receiver_id, message_text, message_type, sent_at)
             VALUES (?, ?, ?, 'text', NOW())"
        );
        $stmt->bind_param("iis", $helper_id, $parent_id, $chatLine);
    } else {
        $stmt = $conn->prepare(
            "INSERT INTO messages (sender_id, receiver_id, job_post_id, message_text, message_type, sent_at)
             VALUES (?, ?, ?, ?, 'text', NOW())"
        );
        $stmt->bind_param("iiis", $helper_id, $parent_id, $jp, $chatLine);
    }
    $stmt->execute();
    $mid = $conn->insert_id;
    $stmt->close();

    echo json_encode(['success' => true, 'message_id' => $mid]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
