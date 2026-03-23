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

    error_log("=== VERIFY DOCUMENT === Document ID: $document_id, Action: $action");

    // Validate action
    if (!in_array($action, ['approve', 'reject'])) {
        throw new Exception("Invalid action. Must be 'approve' or 'reject'");
    }

    // Determine new status
    $new_status = ($action === 'approve') ? 'Verified' : 'Rejected';

    // Start transaction
    $conn->begin_transaction();

    try {
        // Check if document exists
        $checkSql = "SELECT document_id, document_type FROM user_documents WHERE document_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("i", $document_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows === 0) {
            throw new Exception("Document not found");
        }
        
        $doc = $checkResult->fetch_assoc();
        $checkStmt->close();

        // Update document status
        if ($action === 'approve') {
            $updateSql = "UPDATE user_documents 
                         SET status = ?, 
                             rejection_reason = NULL,
                             verified_at = NOW(),
                             updated_at = NOW() 
                         WHERE document_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("si", $new_status, $document_id);
        } else {
            $updateSql = "UPDATE user_documents 
                         SET status = ?, 
                             rejection_reason = ?,
                             verified_at = NULL,
                             updated_at = NOW() 
                         WHERE document_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("ssi", $new_status, $reason, $document_id);
        }

        $updateStmt->execute();
        
        if ($updateStmt->affected_rows === 0) {
            throw new Exception("Document not found or no changes made");
        }
        
        $updateStmt->close();

        // Commit transaction
        $conn->commit();

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