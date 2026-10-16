<?php
/**
 * Record a payment made by the employer for an active placement.
 * { application_id, user_id, user_type: "parent", pay_period_start, pay_period_end,
 *   paid_at, gross_amount, deductions: [{label, amount}], payment_method, employer_note? }
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../../shared/ownership_guard.php';
require_once __DIR__ . '/../../shared/payslip_records_table.php';

function payslip_issue_out(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function payslip_issue_valid_date(string $value): bool
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts)) {
        return false;
    }
    return checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]);
}

try {
    if (!$conn) {
        throw new RuntimeException('Database connection failed.');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        payslip_issue_out(['success' => false, 'message' => 'Method not allowed.'], 405);
    }

    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        payslip_issue_out(['success' => false, 'message' => 'Invalid request body.'], 400);
    }

    $application_id = (int) ($input['application_id'] ?? 0);
    $user_id = (int) ($input['user_id'] ?? 0);
    $user_type = trim((string) ($input['user_type'] ?? ''));
    $period_start = trim((string) ($input['pay_period_start'] ?? ''));
    $period_end = trim((string) ($input['pay_period_end'] ?? ''));
    $paid_at = trim((string) ($input['paid_at'] ?? ''));
    $gross_raw = $input['gross_amount'] ?? null;
    $payment_method = trim((string) ($input['payment_method'] ?? ''));
    $employer_note = trim((string) ($input['employer_note'] ?? ''));
    $deductions = $input['deductions'] ?? [];

    if ($application_id <= 0 || $user_id <= 0 || $user_type !== 'parent') {
        payslip_issue_out(['success' => false, 'message' => 'A valid employer and application are required.'], 400);
    }
    carelink_require_self($user_id, $user_id, 'You are not allowed to record this payment.');
    if (!carelink_v1_assert_parent_hire($conn, $application_id, $user_id)) {
        payslip_issue_out(['success' => false, 'message' => 'You are not authorized to record a payment for this placement.'], 403);
    }
    if (
        !payslip_issue_valid_date($period_start)
        || !payslip_issue_valid_date($period_end)
        || !payslip_issue_valid_date($paid_at)
        || $period_start > $period_end
        || $paid_at > date('Y-m-d')
    ) {
        payslip_issue_out(['success' => false, 'message' => 'Enter a valid pay period and a payment date that is not in the future.'], 400);
    }

    if (!is_numeric($gross_raw) || !is_finite((float) $gross_raw) || (float) $gross_raw <= 0) {
        payslip_issue_out(['success' => false, 'message' => 'Gross pay must be greater than zero.'], 400);
    }
    $gross_amount = round((float) $gross_raw, 2);

    $methods = ['Cash', 'Bank transfer', 'E-wallet', 'Other'];
    if (!in_array($payment_method, $methods, true)) {
        payslip_issue_out(['success' => false, 'message' => 'Choose a valid payment method.'], 400);
    }
    if (!is_array($deductions) || count($deductions) > 30) {
        payslip_issue_out(['success' => false, 'message' => 'Deductions must be a list of up to 30 items.'], 400);
    }

    $clean_deductions = [];
    $deductions_total = 0.0;
    foreach ($deductions as $item) {
        if (!is_array($item)) {
            payslip_issue_out(['success' => false, 'message' => 'Each deduction must include a label and amount.'], 400);
        }
        $label = trim((string) ($item['label'] ?? ''));
        $amount_raw = $item['amount'] ?? null;
        if ($label === '' || mb_strlen($label) > 80 || !is_numeric($amount_raw) || !is_finite((float) $amount_raw) || (float) $amount_raw <= 0) {
            payslip_issue_out(['success' => false, 'message' => 'Each deduction needs a label and an amount greater than zero.'], 400);
        }
        $amount = round((float) $amount_raw, 2);
        $deductions_total += $amount;
        $clean_deductions[] = ['label' => $label, 'amount' => $amount];
    }
    $deductions_total = round($deductions_total, 2);
    if ($deductions_total > $gross_amount) {
        payslip_issue_out(['success' => false, 'message' => 'Total deductions cannot exceed gross pay.'], 400);
    }
    if (mb_strlen($employer_note) > 500) {
        payslip_issue_out(['success' => false, 'message' => 'The employer note must be 500 characters or fewer.'], 400);
    }

    ensure_payslip_records_table($conn);
    $deductions_json = json_encode($clean_deductions, JSON_UNESCAPED_UNICODE);
    if ($deductions_json === false) {
        throw new RuntimeException('Could not encode the payment deductions.');
    }
    $net_amount = round($gross_amount - $deductions_total, 2);
    $note_value = $employer_note !== '' ? $employer_note : null;

    $st = $conn->prepare("
        INSERT INTO payslip_records (
            application_id, pay_period_start, pay_period_end, paid_at,
            gross_amount, deductions_json, deductions_total, net_amount,
            payment_method, employer_note, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ");
    if (!$st) {
        throw new RuntimeException('Could not prepare the payment record.');
    }
    $st->bind_param(
        'isssdsddss',
        $application_id,
        $period_start,
        $period_end,
        $paid_at,
        $gross_amount,
        $deductions_json,
        $deductions_total,
        $net_amount,
        $payment_method,
        $note_value
    );
    if (!$st->execute()) {
        $st->close();
        throw new RuntimeException('Could not save the payment record.');
    }
    $payslip_id = (int) $st->insert_id;
    $st->close();

    payslip_issue_out([
        'success' => true,
        'payslip_id' => $payslip_id,
        'message' => 'Payment record created. The helper can now review and acknowledge it.',
    ]);
} catch (Throwable $e) {
    error_log('payslip_issue.php: ' . $e->getMessage());
    payslip_issue_out(['success' => false, 'message' => 'Could not record this payment right now.'], 500);
}
