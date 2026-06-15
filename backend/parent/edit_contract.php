<?php
// carelink_api/parent/edit_contract.php
// Regenerates the employment contract PDF for an application still in `contract_pending`
// (i.e. before both parties have signed / before the hire is finalized).
// Resets both employer/helper signatures so the new PDF shows as unsigned again, and
// clears any pending helper "request changes" flag set via request_contract_changes.php.

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
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

include_once '../dbcon.php';

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

/**
 * @return DateTime|null|false null if empty, false if invalid
 */
function carelink_hire_parse_ymd($s)
{
    $s = trim((string) $s);
    if ($s === '') {
        return null;
    }
    $dt = DateTime::createFromFormat('Y-m-d', $s);
    if ($dt === false || $dt->format('Y-m-d') !== $s) {
        return false;
    }

    return $dt;
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $application_id = isset($input['application_id']) ? intval($input['application_id']) : null;
    $job_post_id = isset($input['job_post_id']) ? intval($input['job_post_id']) : null;
    $parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : null;
    $helper_id = isset($input['helper_id']) ? intval($input['helper_id']) : null;

    if (!$application_id || !$job_post_id || !$parent_id || !$helper_id) {
        throw new Exception('Missing required fields');
    }

    $verifyStmt = $conn->prepare('
        SELECT ja.job_post_id
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ? AND ja.helper_id = ? AND jp.parent_id = ?
        LIMIT 1
    ');
    if (!$verifyStmt) {
        throw new Exception('Database error');
    }
    $verifyStmt->bind_param('iii', $application_id, $helper_id, $parent_id);
    $verifyStmt->execute();
    $verifyRes = $verifyStmt->get_result();
    $verifyRow = $verifyRes ? $verifyRes->fetch_assoc() : null;
    $verifyStmt->close();
    if (!$verifyRow || (int) $verifyRow['job_post_id'] !== $job_post_id) {
        throw new Exception('Application does not match this job or helper');
    }

    $contract_end_raw    = isset($input['contract_end_date'])    ? trim((string) $input['contract_end_date'])    : '';
    $contract_start_raw  = isset($input['contract_start_date'])  ? trim((string) $input['contract_start_date'])  : '';
    $contract_notes_raw  = isset($input['contract_terms_notes']) ? trim((string) $input['contract_terms_notes']) : '';
    $contract_duration   = isset($input['contract_duration'])    ? trim((string) $input['contract_duration'])    : null;
    $confirmed_salary    = isset($input['confirmed_salary'])     ? floatval($input['confirmed_salary'])          : null;
    $work_hours          = isset($input['work_hours'])           ? trim((string) $input['work_hours'])           : null;
    $rest_days_input     = isset($input['rest_days']) && is_array($input['rest_days']) ? $input['rest_days'] : [];
    $rest_days           = !empty($rest_days_input) ? json_encode($rest_days_input) : null;
    $vacation_leave_days = isset($input['vacation_leave_days'])  ? intval($input['vacation_leave_days'])         : 5;
    $sick_leave_days     = isset($input['sick_leave_days'])      ? intval($input['sick_leave_days'])             : 5;
    $special_conditions  = isset($input['special_conditions'])   ? trim((string) $input['special_conditions'])  : null;
    $overtime_rate          = isset($input['overtime_rate'])          ? trim((string) $input['overtime_rate'])          : null;
    $payment_schedule       = isset($input['payment_schedule'])       ? trim((string) $input['payment_schedule'])       : null;
    $other_benefits         = isset($input['other_benefits'])         ? trim((string) $input['other_benefits'])         : null;
    $debt_agreement         = isset($input['debt_agreement'])         ? trim((string) $input['debt_agreement'])         : null;
    $deployment_agreement   = isset($input['deployment_agreement'])   ? trim((string) $input['deployment_agreement'])   : null;
    $termination_conditions = isset($input['termination_conditions']) ? trim((string) $input['termination_conditions']) : null;

    if (empty($rest_days_input)) {
        throw new Exception('Select at least one rest day for the contract.');
    }

    $endDt = carelink_hire_parse_ymd($contract_end_raw);
    if ($endDt === false) {
        throw new Exception('Invalid contract end date (use YYYY-MM-DD).');
    }
    if ($endDt === null && $contract_duration !== 'Indefinite') {
        throw new Exception('Contract end date is required (use YYYY-MM-DD).');
    }

    $js = $conn->prepare('
        SELECT jp.start_date, jp.work_schedule
        FROM job_posts jp
        INNER JOIN job_applications ja ON ja.job_post_id = jp.job_post_id
        WHERE ja.application_id = ? AND jp.parent_id = ?
        LIMIT 1
    ');
    if (!$js) {
        throw new Exception('Database error');
    }
    $js->bind_param('ii', $application_id, $parent_id);
    $js->execute();
    $jr = $js->get_result()->fetch_assoc();
    $js->close();
    $jobStartNorm = null;
    if ($jr && !empty($jr['start_date'])) {
        $t = strtotime((string) $jr['start_date']);
        if ($t !== false) {
            $jobStartNorm = date('Y-m-d', $t);
        }
    }

    $isPartTime = ($jr['work_schedule'] ?? 'Full-time') === 'Part-time';
    if ($confirmed_salary === null || $confirmed_salary <= 0) {
        throw new Exception('Confirmed salary is required.');
    }
    if (!$isPartTime && $confirmed_salary < 7000) {
        throw new Exception('Confirmed salary must be at least ₱7,000 (RA 10361).');
    }

    $startDtCompare = null;
    if ($contract_start_raw !== '') {
        $ps = carelink_hire_parse_ymd($contract_start_raw);
        if ($ps === false) {
            throw new Exception('Invalid employment start date (use YYYY-MM-DD).');
        }
        $startDtCompare = $ps;
    } elseif ($jobStartNorm !== null) {
        $ps = carelink_hire_parse_ymd($jobStartNorm);
        if ($ps instanceof DateTime) {
            $startDtCompare = $ps;
        }
    }

    if ($endDt !== null && $startDtCompare && $endDt < $startDtCompare) {
        throw new Exception('Contract end date must be on or after the employment start date.');
    }

    $notesDb = null;
    if ($contract_notes_raw !== '') {
        if (strlen($contract_notes_raw) > 2000) {
            $contract_notes_raw = substr($contract_notes_raw, 0, 2000);
        }
        $notesDb = $contract_notes_raw;
    }

    $startDb = $contract_start_raw !== '' ? $contract_start_raw : null;
    $endDb = $contract_end_raw !== '' ? $contract_end_raw : null;

    $vendorAutoload = __DIR__ . '/../vendor/autoload.php';
    if (!is_readable($vendorAutoload)) {
        throw new Exception('Composer dependencies missing (vendor/autoload.php). Run: composer install in carelink_api');
    }
    require_once $vendorAutoload;
    require_once __DIR__ . '/../contracts/contract_helpers.php';
    require_once __DIR__ . '/../contracts/bk1_template.php';
    require_once __DIR__ . '/../contracts/contract_generator.inc.php';

    $conn->begin_transaction();

    $lockStmt = $conn->prepare('SELECT status FROM job_applications WHERE application_id = ? AND job_post_id = ? AND helper_id = ? LIMIT 1 FOR UPDATE');
    $lockStmt->bind_param('iii', $application_id, $job_post_id, $helper_id);
    $lockStmt->execute();
    $lockRow = $lockStmt->get_result()->fetch_assoc();
    $lockStmt->close();
    if (!$lockRow) {
        throw new Exception('Application not found');
    }
    $currentStatus = trim((string) $lockRow['status']);
    if ($currentStatus !== 'contract_pending') {
        throw new Exception('Contract can only be edited while status is contract_pending (current status: ' . ($currentStatus !== '' ? $currentStatus : '(empty)') . ').');
    }

    // Reset both signatures: any change to the terms requires both parties to re-confirm.
    $resetStmt = $conn->prepare('UPDATE job_applications SET employer_signed_at = NULL, helper_signed_at = NULL, contract_generated_at = NOW(), updated_at = NOW() WHERE application_id = ?');
    $resetStmt->bind_param('i', $application_id);
    $resetStmt->execute();
    $resetStmt->close();

    $pre = carelink_generate_employment_contract($conn, $application_id, $parent_id, $helper_id, [
        'application_status_required' => 'editable',
        'skip_persist' => true,
        'contract_end_date'    => $contract_end_raw,
        'contract_start_date'  => $contract_start_raw,
        'contract_terms_notes' => ($notesDb !== null && $notesDb !== '') ? $notesDb : '',
        'contract_duration'    => $contract_duration,
        'confirmed_salary'     => $confirmed_salary,
        'work_hours'           => $work_hours,
        'rest_days'            => $rest_days,
        'vacation_leave_days'  => $vacation_leave_days,
        'sick_leave_days'      => $sick_leave_days,
        'special_conditions'   => $special_conditions,
        'overtime_rate'          => $overtime_rate,
        'payment_schedule'       => $payment_schedule,
        'other_benefits'         => $other_benefits,
        'debt_agreement'         => $debt_agreement,
        'deployment_agreement'   => $deployment_agreement,
        'termination_conditions' => $termination_conditions,
    ]);

    $templateVer = isset($pre['template_version']) ? (string) $pre['template_version'] : 'BK-1-v1';
    $relativePath = isset($pre['pdf_file_path']) ? (string) $pre['pdf_file_path'] : '';
    if ($relativePath === '') {
        throw new Exception('Contract path missing');
    }
    carelink_contract_upsert_row(
        $conn,
        $application_id,
        $job_post_id,
        $parent_id,
        $helper_id,
        $relativePath,
        $templateVer,
        $startDb,
        $endDb,
        $notesDb,
        $contract_duration,
        $confirmed_salary,
        $work_hours,
        $rest_days,
        $vacation_leave_days,
        $sick_leave_days,
        $special_conditions,
        $overtime_rate,
        $payment_schedule,
        $other_benefits,
        $debt_agreement,
        $deployment_agreement,
        $termination_conditions
    );

    $clearStmt = $conn->prepare('UPDATE contracts SET helper_decline_reason = NULL, helper_decline_at = NULL WHERE application_id = ?');
    $clearStmt->bind_param('i', $application_id);
    $clearStmt->execute();
    $clearStmt->close();

    $conn->commit();

    $contract_pdf_url = isset($pre['pdf_url']) ? $pre['pdf_url'] : null;
    $contract_generation_error = null;
    try {
        carelink_contract_write_pdf_file($relativePath, (string) $pre['pdf_binary']);
    } catch (Exception $ex) {
        error_log('edit_contract pdf file: ' . $ex->getMessage());
        $contract_generation_error = $ex->getMessage();
    }

    require_once '../shared/create_notification.php';
    $jobRow = $conn->query("SELECT title FROM job_posts WHERE job_post_id = $job_post_id")->fetch_assoc();
    $jobTitle = $jobRow ? $jobRow['title'] : 'a position';

    createNotification(
        $conn,
        $parent_id,
        'status_changed',
        'Contract updated',
        'You updated the employment contract for: ' . $jobTitle . '. Please review and confirm again.',
        'application',
        $application_id
    );
    createNotification(
        $conn,
        $helper_id,
        'status_changed',
        'Contract updated',
        'The employer updated the employment contract for: ' . $jobTitle . '. Please review the new terms and confirm again.',
        'application',
        $application_id
    );

    sendResponse(true, 'Contract updated. Waiting for both parties to confirm again.', [
        'contract_pdf_url' => $contract_pdf_url,
        'contract_generation_error' => $contract_generation_error,
        'application_status' => 'contract_pending',
    ]);
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollback();
    }
    error_log('ERROR: ' . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
