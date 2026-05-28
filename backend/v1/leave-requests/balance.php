<?php
/**
 * GET /api/v1/leave-requests/balance.php
 * ?application_id=&helper_id=
 * Returns paid leave balance for the active hire (RA 10361 cap 5 vs job post vacation_days).
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
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../lib/leave_helpers.php';

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

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;

    if ($application_id <= 0 || $helper_id <= 0) {
        json_out(['success' => false, 'message' => 'application_id and helper_id required'], 400);
    }

    if (!carelink_v1_assert_helper_hire($conn, $application_id, $helper_id)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $bal = carelink_leave_balance($conn, $application_id);
    $ent = carelink_leave_paid_entitlement($conn, $application_id);

    $from = date('Y-m-d');
    $to = date('Y-m-d', strtotime('+120 days'));
    $blocked = carelink_leave_blocked_dates($conn, $application_id, $from, $to);

    json_out([
        'success' => true,
        'data' => [
            'total' => $bal['total'],
            'used' => $bal['used'],
            'remaining' => $bal['remaining'],
            'at_paid_limit' => $bal['at_paid_limit'],
            'unpaid_if_approved_next' => $bal['unpaid_if_approved'],
            'job_post_vacation_days' => $ent['raw_job_days'],
            'paid_cap' => CARELINK_LEAVE_PAID_CAP,
            'blocked_dates' => $blocked,
        ],
    ]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
