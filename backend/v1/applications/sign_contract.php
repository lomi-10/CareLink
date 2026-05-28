<?php
/**
 * POST /carelink_api/v1/applications/sign_contract.php
 * Body JSON: { "application_id": int, "user_id": int, "user_type": "parent"|"helper" }
 * Records employer_signed_at or helper_signed_at; when both set, finalizes hire (hired, placement, etc.).
 */

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
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../error.log');

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../../shared/finalize_hire_after_contract.inc.php';

function carelink_sign_send_json(bool $ok, string $message, array $extra = []): void
{
    if (ob_get_level()) {
        ob_clean();
    }
    echo json_encode(array_merge(['success' => $ok, 'message' => $message], $extra));
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST required');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('Invalid JSON');
    }

    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';

    if ($application_id <= 0 || $user_id <= 0) {
        throw new Exception('application_id and user_id are required');
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        throw new Exception('user_type must be parent or helper');
    }

    $conn->begin_transaction();

    $sql = "
        SELECT ja.application_id, ja.job_post_id, ja.helper_id, ja.status,
               ja.employer_signed_at, ja.helper_signed_at,
               jp.parent_id
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ?
        LIMIT 1
        FOR UPDATE
    ";
    $st = $conn->prepare($sql);
    $st->bind_param('i', $application_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row) {
        $conn->rollback();
        throw new Exception('Application not found');
    }

    $status = trim((string) $row['status']);
    $job_post_id = (int) $row['job_post_id'];
    $helper_id = (int) $row['helper_id'];
    $parent_id = (int) $row['parent_id'];

    if ($status === 'hired') {
        $conn->commit();
        carelink_sign_send_json(true, 'Contract already confirmed', [
            'status' => 'hired',
            'employer_signed_at' => $row['employer_signed_at'],
            'helper_signed_at' => $row['helper_signed_at'],
        ]);
    }

    if ($status !== 'contract_pending') {
        $conn->rollback();
        throw new Exception('Contract can only be signed while status is contract_pending');
    }

    if ($user_type === 'parent') {
        if ($user_id !== $parent_id) {
            $conn->rollback();
            throw new Exception('Not authorized to sign as employer for this application');
        }
        if (empty($row['employer_signed_at'])) {
            $up = $conn->prepare('UPDATE job_applications SET employer_signed_at = NOW(), updated_at = NOW() WHERE application_id = ?');
            $up->bind_param('i', $application_id);
            $up->execute();
            $up->close();
        }
    } else {
        if ($user_id !== $helper_id) {
            $conn->rollback();
            throw new Exception('Not authorized to sign as helper for this application');
        }
        if (empty($row['helper_signed_at'])) {
            $up = $conn->prepare('UPDATE job_applications SET helper_signed_at = NOW(), updated_at = NOW() WHERE application_id = ?');
            $up->bind_param('i', $application_id);
            $up->execute();
            $up->close();
        }
    }

    $st2 = $conn->prepare('SELECT status, employer_signed_at, helper_signed_at FROM job_applications WHERE application_id = ? LIMIT 1');
    $st2->bind_param('i', $application_id);
    $st2->execute();
    $row2 = $st2->get_result()->fetch_assoc();
    $st2->close();

    $finalized = false;
    if (
        $row2
        && trim((string) $row2['status']) === 'contract_pending'
        && !empty($row2['employer_signed_at'])
        && !empty($row2['helper_signed_at'])
    ) {
        carelink_finalize_hire_after_contract($conn, $application_id, $job_post_id, $parent_id, $helper_id);
        $finalized = true;
    }

    $conn->commit();

    require_once __DIR__ . '/../../shared/create_notification.php';

    if ($finalized) {
        $jobRow = $conn->query("SELECT title FROM job_posts WHERE job_post_id = $job_post_id")->fetch_assoc();
        $helperUser = $conn->query("SELECT first_name, last_name FROM users WHERE user_id = $helper_id")->fetch_assoc();
        $parentUser = $conn->query("SELECT first_name, last_name FROM users WHERE user_id = $parent_id")->fetch_assoc();
        $jobTitle = $jobRow ? (string) $jobRow['title'] : 'this position';
        $helperName = $helperUser ? trim($helperUser['first_name'] . ' ' . $helperUser['last_name']) : 'the helper';
        $employerName = $parentUser ? trim($parentUser['first_name'] . ' ' . $parentUser['last_name']) : 'the employer';

        $employerMsg = "Hiring confirmed. {$helperName} is now officially hired as {$jobTitle}. "
            . 'Download your contract copy from the app.';
        createNotification(
            $conn,
            $parent_id,
            'status_changed',
            'Hiring confirmed',
            $employerMsg,
            'application',
            $application_id
        );

        $helperMsg = "Congratulations! You are now hired as {$jobTitle} by {$employerName}. "
            . 'Download your contract copy from the app.';
        createNotification(
            $conn,
            $helper_id,
            'status_changed',
            'Congratulations — you\'re hired!',
            $helperMsg,
            'application',
            $application_id
        );

        $adminMsg = "New contract signed. Application #{$application_id} between {$employerName} and {$helperName} "
            . 'is now active.';
        $adminRes = $conn->query(
            "SELECT user_id FROM users WHERE user_type IN ('peso', 'admin') AND status = 'approved'"
        );
        if ($adminRes) {
            while ($adm = $adminRes->fetch_assoc()) {
                $aid = (int) $adm['user_id'];
                if ($aid > 0) {
                    createNotification(
                        $conn,
                        $aid,
                        'contract_signed',
                        'New contract signed',
                        $adminMsg,
                        'application',
                        $application_id
                    );
                }
            }
        }

        carelink_notify_rejected_after_fill($conn, $job_post_id, $application_id, $jobTitle);
    }

    $st3 = $conn->prepare('SELECT status, employer_signed_at, helper_signed_at FROM job_applications WHERE application_id = ? LIMIT 1');
    $st3->bind_param('i', $application_id);
    $st3->execute();
    $out = $st3->get_result()->fetch_assoc();
    $st3->close();

    carelink_sign_send_json(true, $finalized ? 'Contract confirmed. Hire finalized.' : 'Signature recorded.', [
        'status' => $out ? trim((string) $out['status']) : null,
        'employer_signed_at' => $out['employer_signed_at'] ?? null,
        'helper_signed_at' => $out['helper_signed_at'] ?? null,
        'hire_finalized' => $finalized,
    ]);
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    error_log('sign_contract: ' . $e->getMessage());
    carelink_sign_send_json(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
