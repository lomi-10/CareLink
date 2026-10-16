<?php
/**
 * GET payslip records for the helper on an active placement.
 * ?application_id=&user_id=&user_type=helper
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
require_once __DIR__ . '/../../shared/payslip_records_table.php';

function json_out($data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

try {
    if (!$conn) {
        throw new RuntimeException('Database connection failed.');
    }

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';

    if ($application_id <= 0 || $user_id <= 0 || !in_array($user_type, ['helper', 'parent'], true)) {
        json_out(['success' => false, 'message' => 'A valid user and application are required.'], 400);
    }

    require_once __DIR__ . '/../../shared/ownership_guard.php';
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : $user_id;
    carelink_require_self($requester_id, $user_id, 'You are not allowed to view these payment records.');

    $authorizedHire = $user_type === 'parent'
        ? carelink_v1_assert_parent_hire($conn, $application_id, $user_id)
        : carelink_v1_assert_helper_hire($conn, $application_id, $user_id);
    if (!$authorizedHire) {
        json_out(['success' => false, 'message' => 'You are not authorized to view these payment records.'], 403);
    }

    ensure_payslip_records_table($conn);

    $st = $conn->prepare("
        SELECT payslip_id, application_id, pay_period_start, pay_period_end, paid_at,
               gross_amount, deductions_json, deductions_total, net_amount,
               payment_method, employer_note, status, helper_acknowledged_at,
               helper_disputed_at, helper_dispute_reason, created_at
        FROM payslip_records
        WHERE application_id = ?
        ORDER BY paid_at DESC, payslip_id DESC
    ");
    if (!$st) {
        throw new RuntimeException('Could not load the payslip records.');
    }
    $st->bind_param('i', $application_id);
    if (!$st->execute()) {
        $st->close();
        throw new RuntimeException('Could not load the payslip records.');
    }

    $res = $st->get_result();
    $payslips = [];
    while ($row = $res->fetch_assoc()) {
        $decodedDeductions = $row['deductions_json'] !== null
            ? json_decode((string) $row['deductions_json'], true)
            : [];
        $payslips[] = [
            'payslip_id' => (int) $row['payslip_id'],
            'application_id' => (int) $row['application_id'],
            'pay_period_start' => $row['pay_period_start'],
            'pay_period_end' => $row['pay_period_end'],
            'paid_at' => $row['paid_at'],
            'gross_amount' => (float) $row['gross_amount'],
            'deductions' => is_array($decodedDeductions) ? $decodedDeductions : [],
            'deductions_total' => (float) $row['deductions_total'],
            'net_amount' => (float) $row['net_amount'],
            'payment_method' => $row['payment_method'],
            'employer_note' => $row['employer_note'],
            'status' => $row['status'],
            'helper_acknowledged_at' => $row['helper_acknowledged_at'],
            'helper_disputed_at' => $row['helper_disputed_at'],
            'helper_dispute_reason' => $row['helper_dispute_reason'],
            'created_at' => $row['created_at'],
        ];
    }
    $st->close();

    json_out(['success' => true, 'payslips' => $payslips]);
} catch (Throwable $e) {
    error_log('payslips.php: ' . $e->getMessage());
    json_out(['success' => false, 'message' => 'Could not load payment records right now.'], 500);
}
