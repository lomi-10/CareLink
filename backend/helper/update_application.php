<?php
// helper/update_application.php
// Allows a helper to update their cover letter and shared documents
// on an application that is still in 'Pending' status.
// Once reviewed/shortlisted/etc., editing is no longer permitted.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'POST required']);
    exit;
}

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

$input          = json_decode(file_get_contents('php://input'), true) ?? [];
$application_id = isset($input['application_id']) ? intval($input['application_id']) : 0;
$helper_id      = isset($input['helper_id'])      ? intval($input['helper_id'])      : 0;
$cover_letter   = isset($input['cover_letter'])   ? trim($input['cover_letter'])     : '';
$requester_id   = isset($input['requester_id'])   ? intval($input['requester_id'])   : 0;
$shared_doc_ids = [];
if (isset($input['shared_document_ids']) && is_array($input['shared_document_ids'])) {
    $shared_doc_ids = array_values(array_unique(array_map('intval', $input['shared_document_ids'])));
}

if ($application_id <= 0 || $helper_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'application_id and helper_id are required']);
    exit;
}

try {
    carelink_require_self($requester_id, $helper_id, 'You are not allowed to edit this application.');
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}

if (empty($cover_letter)) {
    echo json_encode(['success' => false, 'message' => 'Cover letter is required']);
    exit;
}

if (strlen($cover_letter) < 50) {
    echo json_encode(['success' => false, 'message' => 'Cover letter must be at least 50 characters']);
    exit;
}

if (strlen($cover_letter) > 1000) {
    echo json_encode(['success' => false, 'message' => 'Cover letter must not exceed 1000 characters']);
    exit;
}

try {
    // Verify the application belongs to this helper and is still Pending
    $chk = $conn->prepare("
        SELECT application_id, status FROM job_applications
        WHERE application_id = ? AND helper_id = ?
    ");
    $chk->bind_param("ii", $application_id, $helper_id);
    $chk->execute();
    $app = $chk->get_result()->fetch_assoc();
    $chk->close();

    if (!$app) {
        echo json_encode(['success' => false, 'message' => 'Application not found']);
        exit;
    }

    if ($app['status'] !== 'Pending') {
        echo json_encode([
            'success' => false,
            'message' => 'Only Pending applications can be edited. This application is already ' . $app['status'] . '.',
        ]);
        exit;
    }

    // Update cover letter + bump updated_at
    $upd = $conn->prepare("
        UPDATE job_applications
        SET cover_letter = ?, updated_at = NOW()
        WHERE application_id = ?
    ");
    $upd->bind_param("si", $cover_letter, $application_id);
    $upd->execute();
    $upd->close();

    // Replace shared documents — raw SQL with safe integers, no prepared statement complexity
    $safe_app = intval($application_id);
    $safe_hlp = intval($helper_id);
    $conn->query("DELETE FROM application_document_shares WHERE application_id = $safe_app");

    if (!empty($shared_doc_ids)) {
        $safe_ids = array_values(array_filter(array_map('intval', $shared_doc_ids), fn($id) => $id > 0));
        if (!empty($safe_ids)) {
            $id_list = implode(',', $safe_ids);
            $res = $conn->query(
                "SELECT document_id FROM user_documents
                 WHERE document_id IN ($id_list) AND user_id = $safe_hlp AND status = 'Verified'"
            );
            $verified = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) $verified[] = intval($row['document_id']);
            }
            if (!empty($verified)) {
                $values = implode(',', array_map(fn($did) => "($safe_app, $did)", $verified));
                $conn->query("INSERT IGNORE INTO application_document_shares (application_id, document_id) VALUES $values");
            }
        }
    }

    echo json_encode(['success' => true, 'message' => 'Application updated successfully']);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
