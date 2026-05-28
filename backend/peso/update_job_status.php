<?php
// carelink_api/peso/update_job_status.php

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
error_reporting(0);
require_once '../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

function sendJson($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $r = ['success' => $success, 'message' => $message];
    if ($data !== null) $r['data'] = $data;
    echo json_encode($r);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    if (!$conn) throw new Exception('Database connection failed');

    if (empty($input['job_post_id']) || empty($input['status'])) {
        throw new Exception('Missing required fields: job_post_id, status');
    }

    $job_id      = intval($input['job_post_id']);
    $status      = $input['status'];             // 'Open' (approve) | 'Rejected'
    $verified_by = !empty($input['verified_by']) ? intval($input['verified_by']) : 0;
    $reason      = isset($input['reason'])       ? trim($input['reason'])         : null;

    if (!in_array($status, ['Open', 'Rejected', 'Closed'])) {
        throw new Exception('Invalid status value');
    }

    peso_validate_staff_actor($conn, $verified_by);

    // ── 1. Update job_posts ───────────────────────────────────────────────
    $stmt = $conn->prepare("
        UPDATE job_posts
        SET status          = ?,
            verified_by     = ?,
            verified_at     = NOW(),
            rejection_reason = ?
        WHERE job_post_id = ?
    ");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('sisi', $status, $verified_by, $reason, $job_id);
    if (!$stmt->execute()) throw new Exception('Update failed: ' . $stmt->error);
    $stmt->close();

    // ── 2. Log to log_trail ───────────────────────────────────────────────
    $logAction = ($status === 'Open') ? 'VERIFY_JOB_APPROVE' : 'VERIFY_JOB_REJECT';
    $module    = 'PESO Job Verification';
    peso_audit_verification($conn, $verified_by, $logAction, $module, $job_id);

    // Notify the parent about their job post decision
    require_once '../shared/create_notification.php';
    $jobRow = $conn->query("SELECT title, parent_id FROM job_posts WHERE job_post_id = $job_id")->fetch_assoc();
    if ($jobRow) {
        if ($status === 'Open') {
            createNotification($conn, (int)$jobRow['parent_id'], 'job_verified',
                'Job Post Approved ✅',
                'Your job post "' . $jobRow['title'] . '" has been verified by PESO and is now live.',
                'job', $job_id);
        } else {
            $reasonText = $reason ? ' Reason: ' . $reason : '';
            createNotification($conn, (int)$jobRow['parent_id'], 'job_rejected',
                'Job Post Rejected',
                'Your job post "' . $jobRow['title'] . '" was rejected by PESO.' . $reasonText,
                'job', $job_id);
        }
    }

    $verb = ($status === 'Open') ? 'approved' : 'rejected';
    sendJson(true, "Job post {$verb} successfully.");

} catch (Exception $e) {
    sendJson(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
