<?php
/**
 * POST /api/v1/leave-requests/create.php
 * JSON: application_id, helper_id, date (Y-m-d), reason_code (sick|personal|family_emergency|other), helper_note?, reason? (legacy)
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
require_once __DIR__ . '/../lib/leave_helpers.php';
require_once __DIR__ . '/../../shared/create_notification.php';
require_once __DIR__ . '/../../shared/mysqli_stmt_helpers.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

function carelink_leave_format_date_display(string $ymd): string
{
    $t = strtotime($ymd . ' 12:00:00');
    return $t ? date('M j, Y', $t) : $ymd;
}

/** @return array{0:string,1:?string,2:string} [combined reason line, helper_note, reason_code] */
function carelink_leave_normalize_input(array $input): array
{
    $codes = ['sick', 'personal', 'family_emergency', 'other'];
    $code = isset($input['reason_code']) ? trim((string) $input['reason_code']) : '';
    if ($code === '' && isset($input['reason']) && trim((string) $input['reason']) !== '') {
        $code = 'other';
    }
    if (!in_array($code, $codes, true)) {
        $code = 'other';
    }
    $note = isset($input['helper_note']) ? trim((string) $input['helper_note']) : '';
    if ($note === '' && isset($input['reason']) && $code === 'other') {
        $note = trim((string) $input['reason']);
    }
    if (strlen($note) > 500) {
        $note = substr($note, 0, 500);
    }
    $helper_note = $note === '' ? null : $note;

    $labels = [
        'sick' => 'Sick leave',
        'personal' => 'Personal',
        'family_emergency' => 'Family emergency',
        'other' => 'Other',
    ];
    $line = $labels[$code] ?? 'Leave';
    if ($helper_note !== null) {
        $line .= ' — ' . $helper_note;
    }

    return [$line, $helper_note, $code];
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
    $date_raw = isset($input['date']) ? trim((string) $input['date']) : '';

    [$reason_line, $helper_note, $code] = carelink_leave_normalize_input($input);

    if ($application_id <= 0 || $helper_id <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_raw)) {
        json_out(['success' => false, 'message' => 'application_id, helper_id, and date (Y-m-d) required'], 400);
    }

    if (!carelink_v1_assert_helper_hire($conn, $application_id, $helper_id)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    $today = date('Y-m-d');
    if ($date_raw < $today) {
        json_out(['success' => false, 'message' => 'Leave date cannot be in the past'], 422);
    }

    $wd = carelink_leave_validate_work_day($conn, $application_id, $date_raw);
    if ($wd !== null) {
        json_out(['success' => false, 'message' => $wd], 422);
    }

    $dup = carelink_leave_validate_not_duplicate($conn, $application_id, $date_raw);
    if ($dup !== null) {
        json_out(['success' => false, 'message' => $dup], 409);
    }

    $bal = carelink_leave_balance($conn, $application_id);
    $warnings = [];
    if ($bal['at_paid_limit']) {
        $warnings[] = 'paid_limit_reached';
    }

    $ins = $conn->prepare("
        INSERT INTO leave_requests (application_id, helper_id, `date`, reason_code, helper_note, reason, status, responded_at, paid_leave)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, NULL)
    ");
    $ins->bind_param('iissss', $application_id, $helper_id, $date_raw, $code, $helper_note, $reason_line);
    if (!$ins->execute()) {
        $ins->close();
        throw new Exception('Insert failed');
    }
    $new_id = (int) $conn->insert_id;
    $ins->close();

    $hire = carelink_v1_load_hire($conn, $application_id);
    $parent_id = (int) ($hire['parent_id'] ?? 0);

    $hn = $conn->prepare("SELECT TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS n FROM users WHERE user_id = ? LIMIT 1");
    $hn->bind_param('i', $helper_id);
    $hn->execute();
    $hr = $hn->get_result();
    $hrow = $hr instanceof mysqli_result ? $hr->fetch_assoc() : carelink_mysqli_stmt_fetch_assoc($hn);
    if ($hr instanceof mysqli_result) {
        $hr->free();
    }
    $hn->close();
    $helper_name = trim((string) ($hrow['n'] ?? 'Helper'));
    if ($helper_name === '') {
        $helper_name = 'Helper';
    }

    $date_label = carelink_leave_format_date_display($date_raw);
    $msg = $helper_name . ' is requesting leave on ' . $date_label . '. Reason: ' . $reason_line;

    if ($parent_id > 0) {
        carelink_create_notification(
            $conn,
            $parent_id,
            'leave_request_submitted',
            'Leave request',
            $msg,
            'leave_request',
            $new_id
        );
    }

    $out = [
        'success' => true,
        'data' => [
            'id' => $new_id,
            'application_id' => $application_id,
            'helper_id' => $helper_id,
            'date' => $date_raw,
            'reason_code' => $code,
            'helper_note' => $helper_note,
            'reason' => $reason_line_db,
            'status' => 'pending',
        ],
    ];
    if (count($warnings) > 0) {
        $out['warnings'] = $warnings;
    }
    json_out($out);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
