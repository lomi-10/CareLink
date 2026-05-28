<?php
// carelink_api/peso/verify_document.php
// PESO verifies individual documents for parent/helper accounts

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

include_once '../dbcon.php';
include_once __DIR__ . '/peso_auth.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    
    $response = array(
        "success" => $success,
        "message" => $message
    );
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // Get JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!isset($data['document_id']) || !isset($data['action'])) {
        throw new Exception("Document ID and action are required");
    }

    $document_id = intval($data['document_id']);
    $action = $data['action']; // 'approve' or 'reject'
    $reason = isset($data['reason']) ? $data['reason'] : null;
    $verified_by = isset($data['verified_by']) ? intval($data['verified_by']) : 0; // PESO user_id (actor)

    error_log("=== VERIFY DOCUMENT === Document ID: $document_id, Action: $action");

    // Validate action
    if (!in_array($action, ['approve', 'reject'])) {
        throw new Exception("Invalid action. Must be 'approve' or 'reject'");
    }

    peso_validate_staff_actor($conn, $verified_by);

    // Determine new status
    $new_status = ($action === 'approve') ? 'Verified' : 'Rejected';

    // Start transaction
    $conn->begin_transaction();

    try {
        // Check if document exists and get owner
        $checkSql = "SELECT document_id, user_id, document_type FROM user_documents WHERE document_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("i", $document_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            throw new Exception("Document not found");
        }
        
        $doc = $checkResult->fetch_assoc();
        $doc_user_id = intval($doc['user_id']);
        $checkStmt->close();

        // Update document status
        if ($action === 'approve') {
            $updateSql = "UPDATE user_documents 
                         SET status = ?, 
                             rejection_reason = NULL,
                             verified_by = ?,
                             verified_at = NOW(),
                             updated_at = NOW() 
                         WHERE document_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("sii", $new_status, $verified_by, $document_id);
        } else {
            $updateSql = "UPDATE user_documents 
                         SET status = ?, 
                             rejection_reason = ?,
                             verified_by = ?,
                             verified_at = NULL,
                             updated_at = NOW() 
                         WHERE document_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("ssii", $new_status, $reason, $verified_by, $document_id);
        }

        $updateStmt->execute();
        
        if ($updateStmt->affected_rows === 0) {
            throw new Exception("Document not found or no changes made");
        }
        
        $updateStmt->close();

        // If at least one document is rejected, auto-reject the account (but keep access so they can re-upload)
        if ($action === 'reject') {
            $userTypeStmt = $conn->prepare("SELECT user_type FROM users WHERE user_id = ?");
            $userTypeStmt->bind_param("i", $doc_user_id);
            $userTypeStmt->execute();
            $uRes = $userTypeStmt->get_result();
            $uRow = $uRes->fetch_assoc();
            $userTypeStmt->close();
            $uType = $uRow ? $uRow['user_type'] : null;

            if ($uType === 'helper') {
                $rejStmt = $conn->prepare(
                    "UPDATE helper_profiles
                     SET verification_status = 'Rejected',
                         rejection_reason = ?,
                         rejected_by = ?,
                         rejected_at = NOW(),
                         updated_at = NOW()
                     WHERE user_id = ?"
                );
            } else if ($uType === 'parent') {
                $rejStmt = $conn->prepare(
                    "UPDATE parent_profiles
                     SET verification_status = 'Rejected',
                         rejection_reason = ?,
                         rejected_by = ?,
                         rejected_at = NOW(),
                         updated_at = NOW()
                     WHERE user_id = ?"
                );
            } else {
                $rejStmt = null;
            }

            if ($rejStmt) {
                $rejStmt->bind_param("sii", $reason, $verified_by, $doc_user_id);
                $rejStmt->execute();
                $rejStmt->close();
            }

            // Keep user able to log in and fix issues
            $conn->query("UPDATE users SET status = 'pending', updated_at = NOW() WHERE user_id = " . (int)$doc_user_id);
        }

        // Log audit trail (actor = PESO)
        $logAction = $action === 'approve' ? 'VERIFY_DOCUMENT_APPROVE' : 'VERIFY_DOCUMENT_REJECT';
        peso_audit_verification($conn, $verified_by, $logAction, 'PESO Verification', $document_id);

        // Commit transaction
        $conn->commit();

        // Notify the document owner
        require_once '../shared/create_notification.php';
        $docRow = $conn->query("SELECT document_type FROM user_documents WHERE document_id = $document_id")->fetch_assoc();
        $docType = $docRow ? $docRow['document_type'] : 'Document';
        if ($action === 'approve') {
            createNotification($conn, (int)$doc_user_id, 'document_verified',
                'Document Verified ✅',
                'Your ' . $docType . ' has been verified by PESO.',
                'document', $document_id);
        } else {
            $reasonText = $reason ? ' Reason: ' . $reason : '';
            createNotification($conn, (int)$doc_user_id, 'document_rejected',
                'Document Rejected',
                'Your ' . $docType . ' was not accepted by PESO.' . $reasonText . ' Please re-upload.',
                'document', $document_id);
        }

        $message = ($action === 'approve') 
            ? "Document verified successfully" 
            : "Document rejected successfully";

        sendResponse(true, $message);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>