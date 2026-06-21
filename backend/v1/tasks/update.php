<?php
/**
 * REST mirror: PATCH /api/v1/tasks/{id}
 * POST JSON: task_id, user_id, user_type=parent, title?, description?, due_date? (Y-m-d or empty)
 * Only pending tasks. Completed tasks cannot be edited.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PATCH, OPTIONS');
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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_out(['success' => false, 'message' => 'POST required'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $task_id = isset($input['task_id']) ? (int) $input['task_id'] : 0;
    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';

    if ($task_id <= 0 || $user_id <= 0 || $user_type !== 'parent') {
        json_out(['success' => false, 'message' => 'task_id, user_id, user_type=parent required'], 400);
    }

    $st = $conn->prepare("
        SELECT at.id, at.title, at.description, at.due_date, at.status, jp.parent_id, ja.status AS app_status
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
        json_out(['success' => false, 'message' => 'Only the employer can edit this task'], 403);
    }
    if ($row['status'] !== 'pending') {
        json_out(['success' => false, 'message' => 'Completed tasks cannot be edited'], 409);
    }

    $title = array_key_exists('title', $input) ? trim((string) $input['title']) : (string) $row['title'];
    if ($title === '') {
        json_out(['success' => false, 'message' => 'title cannot be empty'], 400);
    }

    $description = array_key_exists('description', $input) ? trim((string) $input['description']) : (string) ($row['description'] ?? '');
    if ($description === '') {
        $description = null;
    }

    $due_raw = array_key_exists('due_date', $input) ? trim((string) $input['due_date']) : (string) ($row['due_date'] ?? '');
    if ($due_raw === '') {
        $due_date = null;
    } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $due_raw)) {
        $due_date = $due_raw;
    } else {
        json_out(['success' => false, 'message' => 'due_date must be YYYY-MM-DD'], 400);
    }

    $priority_raw = array_key_exists('priority', $input) ? trim((string)$input['priority']) : ($row['priority'] ?? 'medium');
    $priority = in_array($priority_raw, ['low', 'medium', 'high'], true) ? $priority_raw : 'medium';

    $upd = $conn->prepare("
        UPDATE `{$t}`
        SET title = ?, description = ?, due_date = ?, priority = ?, updated_at = NOW()
        WHERE id = ? AND status = 'pending'
    ");
    $upd->bind_param('ssssi', $title, $description, $due_date, $priority, $task_id);
    $upd->execute();
    if ($upd->affected_rows === 0) {
        $upd->close();
        json_out(['success' => false, 'message' => 'Could not update task'], 409);
    }
    $upd->close();

    json_out(['success' => true, 'data' => ['id' => $task_id]]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
