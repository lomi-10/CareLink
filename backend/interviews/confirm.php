<?php
// carelink_api/interviews/confirm.php
// Helper confirms/declines a scheduled interview

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';

$input        = json_decode(file_get_contents('php://input'), true);
$interview_id = isset($input['interview_id']) ? intval($input['interview_id']) : 0;
$user_id      = isset($input['user_id'])      ? intval($input['user_id'])      : 0;
$action       = $input['action'] ?? '';  // 'confirm' | 'decline'

if (!$interview_id || !$user_id || !in_array($action, ['confirm', 'decline'])) {
    echo json_encode(['success' => false, 'message' => 'interview_id, user_id, and action required']);
    exit();
}

try {
    $status     = $action === 'confirm' ? 'Confirmed'  : 'Cancelled';
    $helperConf = $action === 'confirm' ? 1             : 0;

    $stmt = $conn->prepare(
        "UPDATE interview_schedules
         SET helper_confirmed = ?, status = ?, updated_at = NOW()
         WHERE interview_id = ?"
    );
    $stmt->bind_param("isi", $helperConf, $status, $interview_id);
    $stmt->execute();
    $stmt->close();

    // Notify parent
    require_once '../shared/create_notification.php';
    $row = $conn->query(
        "SELECT ins.application_id, jp.title AS job_title, jp.parent_id,
                u.first_name, u.last_name
         FROM interview_schedules ins
         JOIN job_applications ja ON ins.application_id = ja.application_id
         JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
         JOIN users u ON ja.helper_id = u.user_id
         WHERE ins.interview_id = $interview_id"
    )->fetch_assoc();

    if ($row) {
        $helperName = trim($row['first_name'] . ' ' . $row['last_name']);
        if ($action === 'confirm') {
            createNotification($conn, (int)$row['parent_id'], 'interview_confirmed',
                'Interview Confirmed ✅',
                "$helperName confirmed the interview for \"{$row['job_title']}\".",
                'application', (int)$row['application_id']);
        } else {
            createNotification($conn, (int)$row['parent_id'], 'interview_declined',
                'Interview Declined',
                "$helperName declined the interview for \"{$row['job_title']}\".",
                'application', (int)$row['application_id']);
        }
    }

    echo json_encode(['success' => true, 'status' => $status]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
