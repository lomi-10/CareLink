<?php
/**
 * shared/demo_status.php — does this user have any activity with the seeded
 * DEMO employers?
 *
 * GET ?user_id=&requester_id=
 * -> { success, is_demo_participant: bool }
 *
 * Lets the app show the "Finish demo session" handover ONLY to someone who is
 * actually in a test session, so the button can't confuse a real user later —
 * and disappears by itself once demo_reset.php has cleared their activity.
 * Read-only counterpart to demo_reset.php; same demo-email scoping.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/ownership_guard.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $user_id      = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;

    if ($user_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'user_id is required.']);
        exit();
    }
    carelink_require_self($requester_id, $user_id, 'You are not allowed to view this.');

    $pattern = '%@carelink-demo.test';

    // An application to a demo employer's post, or a message either way, is
    // enough to say they're mid-test. Kept to two cheap indexed lookups.
    $stmt = $conn->prepare(
        "SELECT
            (SELECT COUNT(*) FROM job_applications ja
               JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
              WHERE ja.helper_id = ?
                AND jp.parent_id IN (SELECT user_id FROM users WHERE email LIKE ?)) AS apps,
            (SELECT COUNT(*) FROM messages m
              WHERE (m.sender_id = ?   AND m.receiver_id IN (SELECT user_id FROM users WHERE email LIKE ?))
                 OR (m.receiver_id = ? AND m.sender_id   IN (SELECT user_id FROM users WHERE email LIKE ?))) AS msgs"
    );
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    $stmt->bind_param('ississ', $user_id, $pattern, $user_id, $pattern, $user_id, $pattern);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $isDemo = ((int) ($row['apps'] ?? 0) + (int) ($row['msgs'] ?? 0)) > 0;

    echo json_encode(['success' => true, 'is_demo_participant' => $isDemo]);
} catch (Throwable $e) {
    error_log('demo_status.php: ' . $e->getMessage());
    // Fail closed: on error, don't offer the demo handover.
    echo json_encode(['success' => false, 'is_demo_participant' => false]);
}
