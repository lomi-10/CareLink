<?php
/**
 * REST mirror: POST /api/v1/tasks/{id}/complete
 * JSON: task_id, user_id, user_type=helper, photo_url? (https, e.g. Cloudinary)
 *
 * If requires_photo on task: photo_url required → else 422.
 * Helper must be checked in today (unless rest day). Notification to employer includes photo URL when set.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/placement_task_table.php';
require_once __DIR__ . '/../lib/placement_task_helpers.php';
require_once __DIR__ . '/../../shared/create_notification.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function carelink_task_photo_url_valid(?string $url): bool
{
    if ($url === null || $url === '') {
        return false;
    }
    if (!preg_match('#^https://#i', $url)) {
        return false;
    }
    if (strlen($url) > 1024) {
        return false;
    }
    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

$t = CARELINK_PLACEMENT_TASKS_TABLE;

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_out(['success' => false, 'message' => 'POST required'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $task_id = isset($input['task_id']) ? (int) $input['task_id'] : 0;
    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';
    $photo_url_in = isset($input['photo_url']) ? trim((string) $input['photo_url']) : '';

    if ($task_id <= 0 || $user_id <= 0 || $user_type !== 'helper') {
        json_out(['success' => false, 'message' => 'task_id, user_id, user_type=helper required'], 400);
    }

    $st = $conn->prepare("
        SELECT at.id, at.application_id, at.title, at.status, at.is_recurring, at.requires_photo,
               ja.helper_id, ja.status AS app_status, jp.parent_id
        FROM `{$t}` at
        INNER JOIN job_applications ja ON ja.application_id = at.application_id
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE at.id = ?
        LIMIT 1
    ");
    $st->bind_param('i', $task_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row) {
        json_out(['success' => false, 'message' => 'Task not found'], 404);
    }
    if (!in_array($row['app_status'], ['hired', 'Accepted'], true)) {
        json_out(['success' => false, 'message' => 'Application is not an active hire'], 403);
    }
    if ((int) $row['helper_id'] !== $user_id) {
        json_out(['success' => false, 'message' => 'Only the hired helper can complete this task'], 403);
    }
    if ($row['status'] === 'done') {
        json_out(['success' => true, 'data' => ['id' => $task_id, 'status' => 'done'], 'message' => 'Already completed']);
    }
    if ($row['status'] === 'skipped') {
        json_out(['success' => false, 'message' => 'Task was skipped'], 409);
    }

    $application_id = (int) $row['application_id'];
    [$may, $gateMsg] = carelink_task_helper_may_complete_today($conn, $application_id);
    if (!$may) {
        json_out(['success' => false, 'message' => $gateMsg ?? 'Cannot complete task today'], 422);
    }

    $requires_photo = !empty($row['requires_photo']);
    $photo_url = $photo_url_in !== '' ? $photo_url_in : null;
    if ($requires_photo && !carelink_task_photo_url_valid($photo_url)) {
        json_out(['success' => false, 'message' => 'This task requires a photo. Upload an image and try again.', 'code' => 'photo_required'], 422);
    }
    if ($photo_url !== null && !carelink_task_photo_url_valid($photo_url)) {
        json_out(['success' => false, 'message' => 'Invalid photo_url. Use an https image URL.'], 422);
    }

    $upd = $conn->prepare("
        UPDATE `{$t}`
        SET status = 'done', completed_at = NOW(), photo_url = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $upd->bind_param('si', $photo_url, $task_id);
    $upd->execute();
    $upd->close();

    $parent_id = (int) $row['parent_id'];
    $task_title = (string) $row['title'];

    $hn = $conn->prepare("SELECT TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS n FROM users WHERE user_id = ? LIMIT 1");
    $hn->bind_param('i', $user_id);
    $hn->execute();
    $hrow = $hn->get_result()->fetch_assoc();
    $hn->close();
    $helper_name = trim((string) ($hrow['n'] ?? 'Helper'));
    if ($helper_name === '') {
        $helper_name = 'Helper';
    }

    $message = $helper_name . ' completed: ' . $task_title;
    if ($photo_url) {
        $message .= ' · ' . $photo_url;
    }

    carelink_create_notification(
        $conn,
        $parent_id,
        'task_completed',
        'Task completed',
        $message,
        'application_task',
        $task_id
    );

    json_out([
        'success' => true,
        'data' => [
            'id' => $task_id,
            'status' => 'done',
            'photo_url' => $photo_url,
        ],
    ]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
