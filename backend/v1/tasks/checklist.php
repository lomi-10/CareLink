<?php
/**
 * Task checklist items endpoint.
 *
 * GET    ?task_id=&user_id=&user_type=parent|helper  → list items
 * POST   JSON: { task_id, user_id, user_type, item_text }  → add item
 * PUT    JSON: { item_id, user_id, user_type, task_id }     → toggle is_done
 * DELETE JSON: { item_id, user_id, user_type, task_id }     → remove item
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/placement_task_table.php';

function json_out_c($data, int $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

$t = CARELINK_PLACEMENT_TASKS_TABLE;

/**
 * Verify that $user_id owns the task (is parent) or is the assigned helper.
 * Returns the task row or sends 403/404.
 */
function load_task_auth(mysqli $conn, string $t, int $task_id, int $user_id, string $user_type): array {
    $st = $conn->prepare("
        SELECT at.id, at.application_id, at.status,
               jp.parent_id, ja.helper_id
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
    if (!$row) json_out_c(['success' => false, 'message' => 'Task not found'], 404);
    if ($user_type === 'parent' && (int)$row['parent_id'] !== $user_id)  json_out_c(['success' => false, 'message' => 'Forbidden'], 403);
    if ($user_type === 'helper' && (int)$row['helper_id'] !== $user_id)  json_out_c(['success' => false, 'message' => 'Forbidden'], 403);
    return $row;
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    $method = $_SERVER['REQUEST_METHOD'];

    // ── GET ──────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $task_id   = isset($_GET['task_id'])   ? (int)$_GET['task_id']   : 0;
        $user_id   = isset($_GET['user_id'])   ? (int)$_GET['user_id']   : 0;
        $user_type = isset($_GET['user_type']) ? trim($_GET['user_type']) : '';
        if ($task_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent','helper'], true))
            json_out_c(['success' => false, 'message' => 'task_id, user_id, user_type required'], 400);

        load_task_auth($conn, $t, $task_id, $user_id, $user_type);

        $st = $conn->prepare("SELECT item_id, item_text, is_done, sort_order FROM task_checklist_items WHERE task_id = ? ORDER BY sort_order, item_id");
        $st->bind_param('i', $task_id);
        $st->execute();
        $res = $st->get_result();
        $items = [];
        while ($r = $res->fetch_assoc()) {
            $items[] = ['item_id' => (int)$r['item_id'], 'item_text' => $r['item_text'], 'is_done' => (bool)$r['is_done'], 'sort_order' => (int)$r['sort_order']];
        }
        $st->close();
        json_out_c(['success' => true, 'data' => $items]);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $user_id   = isset($input['user_id'])   ? (int)$input['user_id']   : 0;
    $user_type = isset($input['user_type']) ? trim($input['user_type']) : '';
    $task_id   = isset($input['task_id'])   ? (int)$input['task_id']   : 0;

    if ($task_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent','helper'], true))
        json_out_c(['success' => false, 'message' => 'task_id, user_id, user_type required'], 400);

    load_task_auth($conn, $t, $task_id, $user_id, $user_type);

    // ── POST (add) ────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $text = isset($input['item_text']) ? trim($input['item_text']) : '';
        if ($text === '') json_out_c(['success' => false, 'message' => 'item_text required'], 400);

        // Sort order = max + 1
        $ord_st = $conn->prepare("SELECT COALESCE(MAX(sort_order),0)+1 AS nxt FROM task_checklist_items WHERE task_id=?");
        $ord_st->bind_param('i', $task_id);
        $ord_st->execute();
        $nxt = (int)($ord_st->get_result()->fetch_assoc()['nxt'] ?? 1);
        $ord_st->close();

        $ins = $conn->prepare("INSERT INTO task_checklist_items (task_id, item_text, is_done, sort_order) VALUES (?, ?, 0, ?)");
        $ins->bind_param('isi', $task_id, $text, $nxt);
        $ins->execute();
        $new_id = (int)$conn->insert_id;
        $ins->close();
        json_out_c(['success' => true, 'data' => ['item_id' => $new_id, 'item_text' => $text, 'is_done' => false, 'sort_order' => $nxt]], 201);
    }

    // ── PUT (toggle) ──────────────────────────────────────────────────────────
    if ($method === 'PUT') {
        $item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;
        if ($item_id <= 0) json_out_c(['success' => false, 'message' => 'item_id required'], 400);

        $upd = $conn->prepare("UPDATE task_checklist_items SET is_done = 1 - is_done WHERE item_id = ? AND task_id = ?");
        $upd->bind_param('ii', $item_id, $task_id);
        $upd->execute();
        if ($upd->affected_rows === 0) json_out_c(['success' => false, 'message' => 'Item not found'], 404);
        $upd->close();
        json_out_c(['success' => true]);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if ($method === 'DELETE') {
        $item_id = isset($input['item_id']) ? (int)$input['item_id'] : 0;
        if ($item_id <= 0) json_out_c(['success' => false, 'message' => 'item_id required'], 400);

        $del = $conn->prepare("DELETE FROM task_checklist_items WHERE item_id = ? AND task_id = ?");
        $del->bind_param('ii', $item_id, $task_id);
        $del->execute();
        $del->close();
        json_out_c(['success' => true]);
    }

    json_out_c(['success' => false, 'message' => 'Method not allowed'], 405);
} catch (Exception $e) {
    json_out_c(['success' => false, 'message' => $e->getMessage()], 500);
}
if (isset($conn) && $conn) $conn->close();
