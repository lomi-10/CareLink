<?php
/**
 * POST JSON: { "application_id": int, "employer_id": int, "helper_id": int }
 * Standalone contract PDF generation (also invoked from hire_helper.php after hire).
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
ini_set('error_log', __DIR__ . '/../error.log');

function carelink_contract_send_json(bool $success, string $message, array $extra = []): void
{
    if (ob_get_level()) {
        ob_clean();
    }
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit();
}

$vendorAutoload = __DIR__ . '/../vendor/autoload.php';
if (!is_readable($vendorAutoload)) {
    carelink_contract_send_json(false, 'PDF library not installed. Run: cd carelink_api && composer install');
}

require_once $vendorAutoload;
require_once __DIR__ . '/contract_helpers.php';
require_once __DIR__ . '/bk1_template.php';
require_once __DIR__ . '/contract_generator.inc.php';

include_once __DIR__ . '/../dbcon.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POST required');
    }

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        throw new Exception('Invalid JSON body');
    }

    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $employer_id = isset($input['employer_id']) ? (int) $input['employer_id'] : 0;
    $helper_id = isset($input['helper_id']) ? (int) $input['helper_id'] : 0;

    if ($application_id <= 0 || $employer_id <= 0 || $helper_id <= 0) {
        throw new Exception('application_id, employer_id, and helper_id are required');
    }

    $result = carelink_generate_employment_contract($conn, $application_id, $employer_id, $helper_id);

    carelink_contract_send_json(true, 'Contract generated', [
        'data' => [
            'application_id' => $result['application_id'],
            'job_post_id' => $result['job_post_id'],
            'pdf_url' => $result['pdf_url'],
            'pdf_file_path' => $result['pdf_file_path'],
            'template_version' => $result['template_version'],
        ],
    ]);
} catch (Exception $e) {
    error_log('generate_contract: ' . $e->getMessage());
    carelink_contract_send_json(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
