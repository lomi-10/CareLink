<?php
/**
 * GET /carelink_api/v1/applications/contract.php?application_id=&user_id=&user_type=parent|helper
 * Streams the stored employment contract PDF if the user is party to the application.
 */

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
ini_set('error_log', __DIR__ . '/../../error.log');

require_once __DIR__ . '/../../dbcon.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('GET required');
    }

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';

    if ($application_id <= 0 || $user_id <= 0) {
        throw new Exception('application_id and user_id are required');
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        throw new Exception('user_type must be parent or helper');
    }

    $st = $conn->prepare('
        SELECT ja.helper_id, ja.status, jp.parent_id, c.pdf_file_path
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        INNER JOIN contracts c ON c.application_id = ja.application_id
        WHERE ja.application_id = ?
        LIMIT 1
    ');
    $st->bind_param('i', $application_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row) {
        throw new Exception('Contract not found for this application');
    }

    $allowed = ['contract_pending', 'hired', 'Accepted', 'termination_pending', 'terminated'];
    if (!in_array(trim((string) $row['status']), $allowed, true)) {
        throw new Exception('Contract is not available for this application status');
    }

    if ($user_type === 'parent' && (int) $row['parent_id'] !== $user_id) {
        throw new Exception('Not authorized');
    }
    if ($user_type === 'helper' && (int) $row['helper_id'] !== $user_id) {
        throw new Exception('Not authorized');
    }

    $rel = (string) $row['pdf_file_path'];
    $base = realpath(__DIR__ . '/../../uploads/contracts');
    if ($base === false) {
        throw new Exception('Uploads directory missing');
    }
    $fileName = basename($rel);
    if ($fileName === '' || strpos($fileName, '..') !== false || strpos($fileName, '/') !== false || strpos($fileName, '\\') !== false) {
        throw new Exception('Invalid path');
    }
    $full = realpath($base . DIRECTORY_SEPARATOR . $fileName);
    if ($full === false || strpos($full, $base) !== 0) {
        throw new Exception('File not found');
    }
    if (!is_readable($full)) {
        throw new Exception('File not readable');
    }

    if (ob_get_level()) {
        ob_end_clean();
    }
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $fileName . '"');
    header('Content-Length: ' . filesize($full));
    readfile($full);
    exit();
} catch (Exception $e) {
    error_log('contract GET: ' . $e->getMessage());
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit();
}

if (isset($conn) && $conn) {
    $conn->close();
}
