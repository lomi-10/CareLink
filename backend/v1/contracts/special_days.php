<?php
/**
 * POST /api/v1/contracts/special_days.php
 * JSON: application_id, parent_user_id, special_days: [{ date, type: holiday|no_work, note? }, ...]
 * Replaces the contract's special_days JSON (employer only).
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
require_once __DIR__ . '/../lib/attendance_calendar.php';

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
    $parent_user_id = isset($input['parent_user_id']) ? (int) $input['parent_user_id'] : 0;
    $rawList = $input['special_days'] ?? null;

    if ($application_id <= 0 || $parent_user_id <= 0) {
        json_out(['success' => false, 'message' => 'application_id and parent_user_id required'], 400);
    }

    if (!is_array($rawList)) {
        json_out(['success' => false, 'message' => 'special_days must be an array'], 400);
    }

    if (!carelink_v1_assert_parent_hire($conn, $application_id, $parent_user_id)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $normalized = [];
    foreach ($rawList as $row) {
        if (!is_array($row)) {
            continue;
        }
        $date = isset($row['date']) ? trim((string) $row['date']) : '';
        $type = isset($row['type']) ? trim((string) $row['type']) : '';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            json_out(['success' => false, 'message' => 'Invalid date in special_days: ' . $date], 400);
        }
        if (!in_array($type, ['holiday', 'no_work'], true)) {
            json_out(['success' => false, 'message' => 'Invalid type for ' . $date], 400);
        }
        $note = isset($row['note']) ? trim((string) $row['note']) : null;
        if ($note === '') {
            $note = null;
        }
        $normalized[] = ['date' => $date, 'type' => $type, 'note' => $note];
    }

    $cd = $conn->prepare('SELECT contract_id, employment_start_date, employment_end_date FROM contracts WHERE application_id = ? LIMIT 1');
    $cStart = null;
    $cEnd = null;
    if ($cd) {
        $cd->bind_param('i', $application_id);
        $cd->execute();
        $crow = $cd->get_result()->fetch_assoc();
        $cd->close();
        if (!$crow || empty($crow['contract_id'])) {
            json_out(['success' => false, 'message' => 'Contract not found for this placement'], 404);
        }
        $cStart = !empty($crow['employment_start_date']) ? (string) $crow['employment_start_date'] : null;
        $cEnd = !empty($crow['employment_end_date']) ? (string) $crow['employment_end_date'] : null;
    } else {
        json_out(['success' => false, 'message' => 'Database error'], 500);
    }
    foreach ($normalized as $entry) {
        $d = $entry['date'];
        if ($cStart !== null && $d < $cStart) {
            json_out(['success' => false, 'message' => 'Date ' . $d . ' is before the contract start (' . $cStart . ').'], 400);
        }
        if ($cEnd !== null && $d > $cEnd) {
            json_out(['success' => false, 'message' => 'Date ' . $d . ' is after the contract end (' . $cEnd . ').'], 400);
        }
    }

    $json = json_encode($normalized, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        json_out(['success' => false, 'message' => 'Could not encode JSON'], 500);
    }

    $st = $conn->prepare('UPDATE contracts SET special_days = ? WHERE application_id = ? LIMIT 1');
    $st->bind_param('si', $json, $application_id);
    if (!$st->execute()) {
        $st->close();
        json_out(['success' => false, 'message' => 'Update failed'], 500);
    }
    $st->close();

    $parsed = carelink_attendance_parse_special_days($json);
    json_out(['success' => true, 'special_days' => $parsed]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
