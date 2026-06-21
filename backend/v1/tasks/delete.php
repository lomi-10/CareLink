<?php
/**
 * REST mirror: DELETE /api/v1/tasks/{id}
 * POST JSON: task_id, user_id, user_type=parent
 * Deletes only when status = pending.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/placement_task_table.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

$t = CARELINK_PLACEMENT_TASKS_TABLE;

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'DELETE') {
        $task_id = isset($_GET['task_id']) ? (int) $_GET['task_id'] : 0;
        $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
        $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';
    } else {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $task_id = isset($input['task_id']) ? (int) $input['task_id'] : 0;
        $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
        $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';
    }

    if ($task_id <= 0 || $user_id <= 0 || $user_type !== 'parent') {
        json_out(['success' => false, 'message' => 'task_id, user_id, user_type=parent required'], 400);
    }

    $st = $conn->prepare("
        SELECT at.id, at.status, jp.parent_id, ja.status AS app_status
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
    if (!in_array($row['app_status'], ['hired', 'Accepted', 'termination_pending'], true)) {
        json_out(['success' => false, 'message' => 'Application is not an active hire'], 403);
    }
    if ((int) $row['parent_id'] !== $user_id) {
        json_out(['success' => false, 'message' => 'Only the employer can delete this task'], 403);
    }
    if ($row['status'] !== 'pending') {
        json_out(['success' => false, 'message' => 'Only pending tasks can be deleted'], 409);
    }

    $del = $conn->prepare("DELETE FROM `{$t}` WHERE id = ? AND status = 'pending'");
    $del->bind_param('i', $task_id);
    $del->execute();
    if ($del->affected_rows === 0) {
        $del->close();
        json_out(['success' => false, 'message' => 'Could not delete task'], 409);
    }
    $del->close();

    json_out(['success' => true, 'message' => 'Deleted']);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
