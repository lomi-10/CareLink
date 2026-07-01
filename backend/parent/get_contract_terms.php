<?php
/**
 * GET ?application_id=&parent_id=
 * Returns the persisted contract terms for an application (from the `contracts` table,
 * plus a few job_posts fields), so the parent can pre-fill the "Edit contract" form.
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $parent_id = isset($_GET['parent_id']) ? (int) $_GET['parent_id'] : 0;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;

    if ($application_id <= 0 || $parent_id <= 0) {
        throw new Exception('application_id and parent_id are required');
    }

    // The SQL below already confirms the application belongs to parent_id —
    // this confirms the caller IS parent_id, not just claiming to be.
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to view this contract.');

    $sql = "
        SELECT
            ja.application_id,
            ja.job_post_id,
            ja.status,
            jp.title AS job_title,
            jp.work_schedule,
            c.employment_start_date,
            c.employment_end_date,
            c.terms_notes,
            c.contract_duration,
            c.confirmed_salary,
            c.work_hours,
            c.rest_days,
            c.vacation_leave_days,
            c.sick_leave_days,
            c.special_conditions,
            c.overtime_rate,
            c.payment_schedule,
            c.other_benefits,
            c.debt_agreement,
            c.deployment_agreement,
            c.termination_conditions
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        LEFT JOIN contracts c ON c.application_id = ja.application_id
        WHERE ja.application_id = ?
          AND jp.parent_id = ?
        LIMIT 1
    ";
    $st = $conn->prepare($sql);
    if (!$st) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    $st->bind_param('ii', $application_id, $parent_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row) {
        throw new Exception('Application not found or does not belong to this employer');
    }

    $restDays = [];
    if (!empty($row['rest_days'])) {
        $decoded = json_decode((string) $row['rest_days'], true);
        if (is_array($decoded)) {
            $restDays = $decoded;
        }
    }

    echo json_encode([
        'success' => true,
        'application_id' => (int) $row['application_id'],
        'job_post_id' => (int) $row['job_post_id'],
        'job_title' => $row['job_title'],
        'status' => $row['status'],
        'work_schedule' => $row['work_schedule'],
        'contract' => [
            'employment_start_date' => $row['employment_start_date'],
            'employment_end_date' => $row['employment_end_date'],
            'terms_notes' => $row['terms_notes'],
            'contract_duration' => $row['contract_duration'],
            'confirmed_salary' => $row['confirmed_salary'] !== null ? (float) $row['confirmed_salary'] : null,
            'work_hours' => $row['work_hours'],
            'rest_days' => $restDays,
            'vacation_leave_days' => $row['vacation_leave_days'] !== null ? (int) $row['vacation_leave_days'] : 5,
            'sick_leave_days' => $row['sick_leave_days'] !== null ? (int) $row['sick_leave_days'] : 5,
            'special_conditions' => $row['special_conditions'],
            'overtime_rate' => $row['overtime_rate'],
            'payment_schedule' => $row['payment_schedule'],
            'other_benefits' => $row['other_benefits'],
            'debt_agreement' => $row['debt_agreement'],
            'deployment_agreement' => $row['deployment_agreement'],
            'termination_conditions' => $row['termination_conditions'],
        ],
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
