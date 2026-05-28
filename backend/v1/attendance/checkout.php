<?php
/**
 * POST /api/v1/attendance/checkout
 * JSON: application_id, helper_id
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
require_once __DIR__ . '/../lib/hire_access.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_out(['success' => false, 'message' => 'POST required'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $helper_id = isset($input['helper_id']) ? (int) $input['helper_id'] : 0;

    if ($application_id <= 0 || $helper_id <= 0) {
        json_out(['success' => false, 'message' => 'application_id and helper_id required'], 400);
    }

    $hire = carelink_v1_load_hire($conn, $application_id);
    if (!$hire || (int) $hire['helper_id'] !== $helper_id) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $today = date('Y-m-d');
    $now = date('Y-m-d H:i:s');

    $st = $conn->prepare("
        SELECT id, checked_in_at, checked_out_at
        FROM attendance_logs
        WHERE application_id = ? AND `date` = ?
        LIMIT 1
    ");
    $st->bind_param('is', $application_id, $today);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row || !$row['checked_in_at']) {
        json_out(['success' => false, 'message' => 'Check in first'], 409);
    }
    if ($row['checked_out_at']) {
        json_out(['success' => false, 'message' => 'Already checked out today'], 409);
    }

    $inTs = strtotime((string) $row['checked_in_at']);
    $outTs = strtotime($now);
    if ($outTs < $inTs) {
        json_out(['success' => false, 'message' => 'Invalid checkout time'], 422);
    }

    $aid = (int) $row['id'];
    $upd = $conn->prepare("UPDATE attendance_logs SET checked_out_at = ?, updated_at = NOW() WHERE id = ?");
    $upd->bind_param('si', $now, $aid);
    $upd->execute();
    $upd->close();

    json_out(['success' => true, 'data' => ['checked_out_at' => $now, 'date' => $today]]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
