<?php
/**
 * GET /api/v1/leave-requests/balance.php
 * ?application_id=&helper_id=
 * Returns contractual leave allowances and eligible statutory SIL separately.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
    $asOfDate = isset($_GET['date']) ? trim((string) $_GET['date']) : date('Y-m-d');

    if ($application_id <= 0 || $helper_id <= 0) {
        json_out(['success' => false, 'message' => 'application_id and helper_id required'], 400);
    }
    if (!carelink_leave_is_valid_date($asOfDate)) {
        json_out(['success' => false, 'message' => 'date must be a real calendar date in Y-m-d format'], 400);
    }

    if (!carelink_v1_assert_helper_hire($conn, $application_id, $helper_id)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $bal = carelink_leave_balance($conn, $application_id, $asOfDate);

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
            'paid_available_for_reason' => $bal['paid_available_for_reason'],
            'as_of_date' => $bal['as_of_date'],
            'service_year_start' => $bal['service_year_start'],
            'service_year_end' => $bal['service_year_end'],
            'contract_exists' => $bal['contract_exists'],
            'statutory_sil' => $bal['statutory_sil'],
            'contract_vacation' => $bal['contract_vacation'],
            'contract_sick' => $bal['contract_sick'],
            'blocked_dates' => $blocked,
        ],
    ]);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
