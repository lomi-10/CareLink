<?php
/**
 * GET ?application_id=&user_id=&user_type=parent|helper
 * Termination fields + final pay estimate for hired / termination_pending / terminated rows.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/termination_helpers.php';

function td_json(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('GET required');
    }

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';

    if ($application_id <= 0 || $user_id <= 0) {
        td_json(['success' => false, 'message' => 'application_id and user_id required'], 400);
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        td_json(['success' => false, 'message' => 'user_type must be parent or helper'], 400);
    }

    $st = $conn->prepare('
        SELECT ja.application_id, ja.status, ja.helper_id, ja.termination_initiated_by,
               ja.termination_reason, ja.termination_note, ja.termination_notice_date, ja.termination_last_day,
               jp.parent_id
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ?
        LIMIT 1
    ');
    $st->bind_param('i', $application_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row) {
        td_json(['success' => false, 'message' => 'Not found'], 404);
    }

    $parent_id = (int) $row['parent_id'];
    $helper_id = (int) $row['helper_id'];
    if ($user_type === 'parent' && $user_id !== $parent_id) {
        td_json(['success' => false, 'message' => 'Forbidden'], 403);
    }
    if ($user_type === 'helper' && $user_id !== $helper_id) {
        td_json(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $status = trim((string) $row['status']);
    if (!in_array($status, ['hired', 'Accepted', 'termination_pending', 'terminated'], true)) {
        td_json(['success' => false, 'message' => 'No termination data for this application'], 400);
    }

    $labels = carelink_termination_reason_labels();
    $reason = $row['termination_reason'] ? (string) $row['termination_reason'] : null;
    $pay = carelink_termination_final_pay_estimate(
        $conn,
        $application_id,
        $row['termination_last_day'] ? (string) $row['termination_last_day'] : null
    );

    td_json([
        'success' => true,
        'application_id' => $application_id,
        'status' => $status,
        'termination_initiated_by' => $row['termination_initiated_by'] ? (int) $row['termination_initiated_by'] : null,
        'termination_reason' => $reason,
        'termination_reason_label' => $reason && isset($labels[$reason]) ? $labels[$reason] : null,
        'termination_note' => $row['termination_note'],
        'termination_notice_date' => $row['termination_notice_date'],
        'termination_last_day' => $row['termination_last_day'],
        'final_pay_estimate' => $pay,
    ]);
} catch (Exception $e) {
    td_json(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
