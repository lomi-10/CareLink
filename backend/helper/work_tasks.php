<?php
/**
 * GET ?helper_id=&application_id= — list tasks for a hired application
 * POST JSON: helper_id, application_id, title, task_date (optional Y-m-d) — add task (minimal; optional for employers later)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';

function send_json($data)
{
    echo json_encode($data);
    exit();
}

function assert_hired(mysqli $conn, int $application_id, int $helper_id): void
{
    $st = $conn->prepare("
        SELECT 1 FROM job_applications
        WHERE application_id = ? AND helper_id = ? AND status IN ('hired', 'Accepted', 'termination_pending')
        LIMIT 1
    ");
    $st->bind_param('ii', $application_id, $helper_id);
    $st->execute();
    $ok = $st->get_result()->fetch_row();
    $st->close();
    if (!$ok) {
        throw new Exception('Not authorized or application is not an active hire');
    }
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;
        $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
        if ($helper_id <= 0 || $application_id <= 0) {
            throw new Exception('helper_id and application_id required');
        }
        assert_hired($conn, $application_id, $helper_id);

        $st = $conn->prepare("
            SELECT task_id, application_id, title, sort_order, is_done, task_date, created_at
            FROM helper_placement_tasks
            WHERE application_id = ?
            ORDER BY sort_order ASC, task_id ASC
        ");
        $st->bind_param('i', $application_id);
        $st->execute();
        $res = $st->get_result();
        $tasks = [];
        while ($r = $res->fetch_assoc()) {
            $tasks[] = [
                'task_id' => (int) $r['task_id'],
                'application_id' => (int) $r['application_id'],
                'title' => $r['title'],
                'sort_order' => (int) $r['sort_order'],
                'is_done' => (bool) $r['is_done'],
                'task_date' => $r['task_date'],
                'created_at' => $r['created_at'],
            ];
        }
        $st->close();
        send_json(['success' => true, 'tasks' => $tasks]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $helper_id = isset($input['helper_id']) ? (int) $input['helper_id'] : 0;
        $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
        $title = isset($input['title']) ? trim((string) $input['title']) : '';
        $task_date = isset($input['task_date']) ? trim((string) $input['task_date']) : null;
        if ($helper_id <= 0 || $application_id <= 0 || $title === '') {
            throw new Exception('helper_id, application_id, and title required');
        }
        assert_hired($conn, $application_id, $helper_id);

        $td = ($task_date !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $task_date)) ? $task_date : null;
        if ($td === null) {
            $st = $conn->prepare("
                INSERT INTO helper_placement_tasks (application_id, title, sort_order, is_done, task_date)
                VALUES (?, ?, 0, 0, NULL)
            ");
            $st->bind_param('is', $application_id, $title);
        } else {
            $st = $conn->prepare("
                INSERT INTO helper_placement_tasks (application_id, title, sort_order, is_done, task_date)
                VALUES (?, ?, 0, 0, ?)
            ");
            $st->bind_param('iss', $application_id, $title, $td);
        }
        $st->execute();
        $id = $conn->insert_id;
        $st->close();
        send_json(['success' => true, 'task_id' => (int) $id]);
    }

    throw new Exception('Method not allowed');
} catch (Exception $e) {
    send_json(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
