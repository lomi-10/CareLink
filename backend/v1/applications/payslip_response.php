<?php
/**
 * POST a helper's acknowledgment or dispute for one payslip.
 * { application_id, payslip_id, user_id, user_type: "helper", action, reason? }
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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_out(['success' => false, 'message' => 'Method not allowed.'], 405);
    }

    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        json_out(['success' => false, 'message' => 'Invalid request body.'], 400);
    }

    $application_id = (int) ($input['application_id'] ?? 0);
    $payslip_id = (int) ($input['payslip_id'] ?? 0);
    $user_id = (int) ($input['user_id'] ?? 0);
    $user_type = trim((string) ($input['user_type'] ?? ''));
    $action = trim((string) ($input['action'] ?? ''));
    $reason = trim((string) ($input['reason'] ?? ''));

    if ($application_id <= 0 || $payslip_id <= 0 || $user_id <= 0 || $user_type !== 'helper') {
        json_out(['success' => false, 'message' => 'A valid helper, application, and payslip are required.'], 400);
    }
    if (!in_array($action, ['acknowledge', 'dispute'], true)) {
        json_out(['success' => false, 'message' => 'Choose whether to acknowledge or report an issue.'], 400);
    }
    if ($action === 'dispute' && ($reason === '' || mb_strlen($reason) > 1000)) {
        json_out(['success' => false, 'message' => 'Please explain the issue in 1,000 characters or fewer.'], 400);
    }
    if (!carelink_v1_assert_helper_hire($conn, $application_id, $user_id)) {
        json_out(['success' => false, 'message' => 'You are not authorized to respond to this payslip.'], 403);
    }

    ensure_payslip_records_table($conn);

    if ($action === 'acknowledge') {
        $st = $conn->prepare("
            UPDATE payslip_records
            SET status = 'acknowledged', helper_acknowledged_at = NOW()
            WHERE payslip_id = ? AND application_id = ? AND status = 'pending'
        ");
        if (!$st) {
            throw new RuntimeException('Could not save the payslip response.');
        }
        $st->bind_param('ii', $payslip_id, $application_id);
    } else {
        $st = $conn->prepare("
            UPDATE payslip_records
            SET status = 'disputed', helper_disputed_at = NOW(), helper_dispute_reason = ?
            WHERE payslip_id = ? AND application_id = ? AND status = 'pending'
        ");
        if (!$st) {
            throw new RuntimeException('Could not save the payslip response.');
        }
        $st->bind_param('sii', $reason, $payslip_id, $application_id);
    }

    if (!$st->execute()) {
        $st->close();
        throw new RuntimeException('Could not save the payslip response.');
    }
    $updated = $st->affected_rows;
    $st->close();

    if ($updated !== 1) {
        json_out([
            'success' => false,
            'message' => 'This payslip has already been answered or is no longer available. Refresh to see its current status.',
        ], 409);
    }

    json_out(['success' => true, 'message' => $action === 'acknowledge'
        ? 'Your acknowledgment has been recorded.'
        : 'Your issue has been recorded.']);
} catch (Throwable $e) {
    error_log('payslip_response.php: ' . $e->getMessage());
    json_out(['success' => false, 'message' => 'Could not save your response right now.'], 500);
}
