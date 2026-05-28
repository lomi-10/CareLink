<?php
// carelink_api/parent/request_termination.php
// Parent requests contract termination: job_applications → Pending Termination + termination_requests row.
// Active placements may be status "Accepted" or "hired" — both are accepted here.
//
// If you get SQL errors, check:
// 1) Column names below match your `termination_requests` table exactly.
// 2) `job_applications.status` allows the value "Pending Termination" (VARCHAR, or ENUM includes it).

ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';
require_once __DIR__ . '/../shared/mysqli_stmt_helpers.php';

/**
 * Map logical fields → your actual column names (edit if your table differs).
 */
$TERMINATION_REQUESTS = [
    'table' => 'termination_requests',
    'application_id' => 'application_id',
    'initiated_by_user_id' => 'initiated_by_user_id',
    'initiator_role' => 'initiator_role',
    'termination_reason' => 'termination_reason',
    'remarks' => 'remarks',
    'request_status' => 'request_status',
];

function sendResponse($success, $message, $data = null)
{
    if (ob_get_level()) {
        ob_clean();
    }
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        foreach ($data as $key => $value) {
            $response[$key] = $value;
        }
    }
    echo json_encode($response);
    exit();
}

$committed = false;

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('Invalid JSON body');
    }

    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $parent_id = isset($input['parent_id']) ? (int) $input['parent_id'] : 0;
    $termination_reason = isset($input['termination_reason']) ? trim((string) $input['termination_reason']) : '';
    $remarks = isset($input['remarks']) ? trim((string) $input['remarks']) : null;
    if ($remarks === '') {
        $remarks = null;
    }

    if ($application_id <= 0 || $parent_id <= 0) {
        throw new Exception('application_id and parent_id are required');
    }
    if ($termination_reason === '') {
        throw new Exception('termination_reason is required');
    }
    $reasonLen = function_exists('mb_strlen')
        ? mb_strlen($termination_reason, 'UTF-8')
        : strlen($termination_reason);
    if ($reasonLen > 500) {
        throw new Exception('termination_reason must be 500 characters or less');
    }

    $conn->begin_transaction();

    $sel = $conn->prepare('
        SELECT ja.application_id, ja.status, ja.helper_id, jp.job_post_id, jp.title AS job_title
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ? AND jp.parent_id = ?
        FOR UPDATE
    ');
    if (!$sel) {
        throw new Exception('Database error (prepare select): ' . $conn->error);
    }
    $sel->bind_param('ii', $application_id, $parent_id);
    if (!$sel->execute()) {
        $err = $sel->error;
        $sel->close();
        throw new Exception('Database error (execute select): ' . $err);
    }

    $row = null;
    $res = $sel->get_result();
    if ($res === false && $sel->errno) {
        $err = $sel->error;
        $sel->close();
        throw new Exception('Database error (get_result): ' . $err);
    }
    if ($res instanceof mysqli_result) {
        $row = $res->fetch_assoc();
        $res->free();
    } else {
        // No mysqlnd: use bind_result fallback
        $row = carelink_mysqli_stmt_fetch_assoc($sel);
    }
    $sel->close();

    if (!$row) {
        throw new Exception('Application not found or you do not have access');
    }

    $status = (string) $row['status'];
    $allowed = ['Accepted', 'hired'];
    if (!in_array($status, $allowed, true)) {
        if ($status === 'Pending Termination') {
            throw new Exception('Termination has already been requested for this placement');
        }
        throw new Exception('Only an active hired placement can be set to pending termination');
    }

    $T = $TERMINATION_REQUESTS;
    $t = $T['table'];
    $cApp = $T['application_id'];
    $cInit = $T['initiated_by_user_id'];
    $cRole = $T['initiator_role'];
    $cReason = $T['termination_reason'];
    $cRemarks = $T['remarks'];
    $cReqStatus = $T['request_status'];

    $insertSql = "
        INSERT INTO `{$t}` (
            `{$cApp}`,
            `{$cInit}`,
            `{$cRole}`,
            `{$cReason}`,
            `{$cRemarks}`,
            `{$cReqStatus}`,
            created_at
        ) VALUES (?, ?, 'parent', ?, ?, 'pending', NOW())
    ";

    $ins = $conn->prepare($insertSql);
    if (!$ins) {
        throw new Exception('Database error (prepare insert): ' . $conn->error);
    }
    $ins->bind_param('iiss', $application_id, $parent_id, $termination_reason, $remarks);
    if (!$ins->execute()) {
        $err = $ins->error;
        $ins->close();
        throw new Exception('Failed to save termination request: ' . $err);
    }
    $termination_request_id = (int) $conn->insert_id;
    $ins->close();

    $newStatus = 'Pending Termination';
    $upd = $conn->prepare('
        UPDATE job_applications
        SET status = ?,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE application_id = ?
    ');
    if (!$upd) {
        throw new Exception('Database error (prepare update): ' . $conn->error);
    }
    $upd->bind_param('si', $newStatus, $application_id);
    if (!$upd->execute()) {
        $err = $upd->error;
        $upd->close();
        throw new Exception(
            'Could not update application status: ' . $err
            . ' — If status is ENUM, add \'Pending Termination\' to that ENUM (or use VARCHAR).'
        );
    }
    if ($upd->affected_rows === 0) {
        $err = $upd->error;
        $upd->close();
        throw new Exception(
            'Could not update application status (0 rows). ' . ($err !== '' ? $err : 'Often caused by ENUM not listing Pending Termination.')
        );
    }
    $upd->close();

    $conn->commit();
    $committed = true;

    // Optional: notify helper
    $helperId = (int) $row['helper_id'];
    $jobTitle = (string) $row['job_title'];
    $notifPath = __DIR__ . '/../shared/create_notification.php';
    if (is_readable($notifPath)) {
        require_once $notifPath;
        if (function_exists('carelink_create_notification')) {
            carelink_create_notification(
                $conn,
                $helperId,
                'termination_requested',
                'Contract termination requested',
                'Your employer has requested to end the contract for: ' . $jobTitle . '. Reason: ' . $termination_reason,
                'application',
                $application_id
            );
        }
    }

    sendResponse(true, 'Termination request submitted. Status is now Pending Termination.', [
        'termination_request_id' => $termination_request_id,
        'application_id' => $application_id,
        'status' => $newStatus,
    ]);
} catch (Exception $e) {
    if (isset($conn) && $conn && !$committed) {
        try {
            $conn->rollback();
        } catch (Throwable $t) {
        }
    }
    error_log('request_termination: ' . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
