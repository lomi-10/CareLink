<?php
// carelink_api/parent/hire_helper.php
// Starts contract flow: status → contract_pending, generates PDF, notifies both parties (not hired until both sign).
// Requires job_applications.status ENUM to include 'auto_rejected' (see deploy notes / Laragon SQL).
//
// Contract term fields are normalized on `contracts` (not job_applications).
// Laragon / MySQL — run once:
// ALTER TABLE contracts
//   ADD COLUMN employment_start_date DATE NULL DEFAULT NULL,
//   ADD COLUMN employment_end_date DATE NULL DEFAULT NULL,
//   ADD COLUMN terms_notes VARCHAR(2000) NULL DEFAULT NULL;
// If you previously added legacy columns on job_applications, drop them:
// ALTER TABLE job_applications
//   DROP COLUMN contract_end_date, DROP COLUMN contract_start_date, DROP COLUMN contract_terms_notes;

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

    $pre = carelink_generate_employment_contract($conn, $application_id, $parent_id, $helper_id, [
        'application_status_required' => 'hireable',
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

    $conn->begin_transaction();

    $sql1 = "UPDATE job_applications SET
        status = 'contract_pending',
        contract_generated_at = NOW(),
        employer_signed_at = NULL,
        helper_signed_at = NULL,
        reviewed_at = NOW(),
        updated_at = NOW()
        WHERE application_id = ? AND job_post_id = ? AND helper_id = ?";
    $stmt1 = $conn->prepare($sql1);
    $stmt1->bind_param('iii', $application_id, $job_post_id, $helper_id);
    $stmt1->execute();
    if ($stmt1->affected_rows === 0) {
        $stmt1->close();
        throw new Exception('Application could not be moved to contract pending (check status)');
    }
    $stmt1->close();

    $sqlSib = "
        UPDATE job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        SET ja.status = 'auto_rejected',
            ja.parent_notes = 'Closed automatically: employer is proceeding with another of your applications with them.',
            ja.reviewed_at = NOW(),
            ja.updated_at = NOW()
        WHERE jp.parent_id = ?
          AND ja.helper_id = ?
          AND ja.application_id <> ?
          AND ja.status IN ('Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled')
    ";
    $stmtSib = $conn->prepare($sqlSib);
    if (!$stmtSib) {
        throw new Exception('Database error (sibling applications)');
    }
    $stmtSib->bind_param('iii', $parent_id, $helper_id, $application_id);
    $stmtSib->execute();
    $othersClosed = (int) $stmtSib->affected_rows;
    $stmtSib->close();

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

    $conn->commit();

    $contract_pdf_url = isset($pre['pdf_url']) ? $pre['pdf_url'] : null;
    $contract_generation_error = null;
    try {
        carelink_contract_write_pdf_file($relativePath, (string) $pre['pdf_binary']);
    } catch (Exception $ex) {
        error_log('hire_helper contract file: ' . $ex->getMessage());
        $contract_generation_error = $ex->getMessage();
    }

    require_once '../shared/create_notification.php';
    $jobRow = $conn->query("SELECT title FROM job_posts WHERE job_post_id = $job_post_id")->fetch_assoc();
    $jobTitle = $jobRow ? $jobRow['title'] : 'a position';
    $reviewTitle = 'Review employment contract';
    $reviewMsgParent = 'Please review and confirm the contract for: ' . $jobTitle;
    if ($othersClosed > 0) {
        $reviewMsgParent .= ' Other open applications from this helper for your posts were closed automatically.';
    }

    $reviewMsgHelper = 'Please review and confirm the contract for: ' . $jobTitle;
    if ($othersClosed > 0) {
        $reviewMsgHelper .= ' Your other applications with this employer were automatically closed because they selected you for this position.';
    }

    createNotification($conn, $parent_id, 'status_changed', $reviewTitle, $reviewMsgParent, 'application', $application_id);
    createNotification($conn, $helper_id, 'status_changed', $reviewTitle, $reviewMsgHelper, 'application', $application_id);

    sendResponse(true, 'Contract created. Waiting for both parties to confirm.', [
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
