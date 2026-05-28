<?php
/**
 * POST JSON: helper_id, application_id, task_id, is_done (bool)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST required');
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $helper_id = isset($input['helper_id']) ? (int) $input['helper_id'] : 0;
    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $task_id = isset($input['task_id']) ? (int) $input['task_id'] : 0;
    $is_done = !empty($input['is_done']);

    if ($helper_id <= 0 || $application_id <= 0 || $task_id <= 0) {
        throw new Exception('helper_id, application_id, and task_id required');
    }

    $st0 = $conn->prepare("
        SELECT 1 FROM job_applications
        WHERE application_id = ? AND helper_id = ? AND status IN ('hired', 'Accepted', 'termination_pending')
        LIMIT 1
    ");
    $st0->bind_param('ii', $application_id, $helper_id);
    $st0->execute();
    if (!$st0->get_result()->fetch_row()) {
        $st0->close();
        throw new Exception('Not authorized');
    }
    $st0->close();

    $done = $is_done ? 1 : 0;
    $st = $conn->prepare("
        UPDATE helper_placement_tasks SET is_done = ?, updated_at = NOW()
        WHERE task_id = ? AND application_id = ?
    ");
    $st->bind_param('iii', $done, $task_id, $application_id);
    $st->execute();
    if ($st->affected_rows === 0) {
        $st->close();
        throw new Exception('Task not found');
    }
    $st->close();

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
