<?php
// carelink_api/interviews/cancel.php
// Parent (or helper) cancels a scheduled interview; notify the other party.

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

if (!$interview_id || !$user_id) {
    echo json_encode(['success' => false, 'message' => 'interview_id and user_id required']);
    exit();
}

try {
    $row = $conn->query(
        "SELECT ins.application_id, ja.helper_id, jp.title AS job_title, jp.parent_id
         FROM interview_schedules ins
         JOIN job_applications ja ON ins.application_id = ja.application_id
         JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
         WHERE ins.interview_id = " . (int)$interview_id
    )->fetch_assoc();

    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'Interview not found']);
        exit();
    }

    $parent_id = (int)$row['parent_id'];
    $helper_id = (int)$row['helper_id'];

    if ($user_id !== $parent_id && $user_id !== $helper_id) {
        echo json_encode(['success' => false, 'message' => 'Not authorized']);
        exit();
    }

    $stmt = $conn->prepare(
        "UPDATE interview_schedules SET status = 'Cancelled', updated_at = NOW() WHERE interview_id = ?"
    );
    $stmt->bind_param("i", $interview_id);
    $stmt->execute();
    $stmt->close();

    require_once '../shared/create_notification.php';
    $jobTitle = $row['job_title'] ?? 'Position';

    if ($user_id === $parent_id) {
        createNotification($conn, $helper_id, 'interview_declined',
            'Interview Cancelled',
            "The interview for \"$jobTitle\" was cancelled.",
            'application', (int)$row['application_id']);
    } else {
        createNotification($conn, $parent_id, 'interview_declined',
            'Interview Cancelled',
            "The helper cancelled the interview for \"$jobTitle\".",
            'application', (int)$row['application_id']);
    }

    echo json_encode(['success' => true, 'status' => 'Cancelled']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
