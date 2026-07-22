<?php
// carelink_api/parent/delete_document.php
// Deletes a parent's uploaded document (record + stored file).
//
// SAFETY RULES (mirrors helper/delete_document.php):
//  - Only the parent themselves may delete their own document (ownership guard).
//  - Blocked while the parent has an ACTIVE placement — a helper is relying on
//    the credentials on file; documents can't disappear mid-engagement.
//  - If the profile was PESO-Verified, deleting ANY document breaks the basis of
//    that verification, so the account reverts to Pending (both verification_status
//    AND users.status together, matching how PESO approval sets both) and the
//    parent is notified.

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

include_once '../dbcon.php';
include_once __DIR__ . '/../shared/ownership_guard.php';
include_once __DIR__ . '/../shared/create_notification.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $response = array("success" => $success, "message" => $message);
    if ($data !== null) {
        foreach ($data as $key => $value) {
            $response[$key] = $value;
        }
    }
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    $input = json_decode(file_get_contents("php://input"), true) ?? [];
    $document_id  = isset($input['document_id'])  ? intval($input['document_id'])  : 0;
    $user_id      = isset($input['user_id'])      ? intval($input['user_id'])      : 0;
    $requester_id = isset($input['requester_id']) ? intval($input['requester_id']) : $user_id;

    if (!$document_id || !$user_id) {
        throw new Exception("document_id and user_id are required");
    }

    carelink_require_self($requester_id, $user_id, 'You are not allowed to delete this document.');

    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

    // Block while actively hiring — a helper is relying on what's on file.
    $activeStmt = $conn->prepare("SELECT placement_id FROM placements WHERE parent_id = ? AND status = 'Active' LIMIT 1");
    $activeStmt->bind_param("i", $user_id);
    $activeStmt->execute();
    $isActive = $activeStmt->get_result()->fetch_assoc();
    $activeStmt->close();
    if ($isActive) {
        throw new Exception("You currently have an active helper placement, so your documents can't be removed. Please contact PESO if you need to update one.");
    }

    // Confirm ownership and grab the file path before deleting
    $findStmt = $conn->prepare("SELECT file_path FROM user_documents WHERE document_id = ? AND user_id = ?");
    $findStmt->bind_param("ii", $document_id, $user_id);
    $findStmt->execute();
    $doc = $findStmt->get_result()->fetch_assoc();
    $findStmt->close();

    if (!$doc) {
        throw new Exception("Document not found");
    }

    $delStmt = $conn->prepare("DELETE FROM user_documents WHERE document_id = ? AND user_id = ?");
    $delStmt->bind_param("ii", $document_id, $user_id);
    $delStmt->execute();
    $deleted = $delStmt->affected_rows > 0;
    $delStmt->close();

    if (!$deleted) {
        throw new Exception("Failed to delete document");
    }

    // Best-effort: remove the stored file from disk
    if (!empty($doc['file_path'])) {
        $filePath = dirname(__DIR__) . "/uploads/documents/" . $doc['file_path'];
        if (is_file($filePath)) {
            @unlink($filePath);
        }
    }

    $logStmt = $conn->prepare("INSERT INTO log_trail (user_id, action, module, record_id, status, ip_address, device_info) VALUES (?, 'DELETE_DOCUMENT', 'Documents', ?, 'Success', ?, ?)");
    $logStmt->bind_param("iiss", $user_id, $document_id, $ip, $ua);
    $logStmt->execute();
    $logStmt->close();

    // If this profile was PESO-Verified, deleting a document breaks the basis of
    // that verification — revert to Pending until re-verified.
    $verification_reverted = false;
    $statStmt = $conn->prepare("SELECT verification_status FROM parent_profiles WHERE user_id = ?");
    $statStmt->bind_param("i", $user_id);
    $statStmt->execute();
    $prof = $statStmt->get_result()->fetch_assoc();
    $statStmt->close();

    if ($prof && $prof['verification_status'] === 'Verified') {
        $revStmt = $conn->prepare("UPDATE parent_profiles SET verification_status = 'Pending', verified_by = NULL, verified_at = NULL, updated_at = NOW() WHERE user_id = ?");
        $revStmt->bind_param("i", $user_id);
        $revStmt->execute();
        $revStmt->close();

        $conn->query("UPDATE users SET status = 'pending', updated_at = NOW() WHERE user_id = " . (int) $user_id);

        $verification_reverted = true;

        $revLogStmt = $conn->prepare("INSERT INTO log_trail (user_id, action, module, record_id, status, ip_address, device_info) VALUES (?, 'VERIFICATION_REVOKED', 'Documents', ?, 'Success', ?, ?)");
        $revLogStmt->bind_param("iiss", $user_id, $document_id, $ip, $ua);
        $revLogStmt->execute();
        $revLogStmt->close();

        createNotification(
            $conn,
            $user_id,
            'verification_revoked',
            'Verification Paused',
            'Deleting a verified document paused your PESO verification. You will need to re-upload and be re-verified before posting jobs again.',
            'document',
            $document_id
        );
    }

    sendResponse(true, "Document deleted successfully", [
        'verification_reverted' => $verification_reverted,
    ]);

} catch (Exception $e) {
    error_log("DELETE DOCUMENT ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
