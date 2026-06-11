<?php
// carelink_api/helper/delete_document.php
// Deletes a helper's uploaded document (record + stored file)

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
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';

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
    $document_id = isset($input['document_id']) ? intval($input['document_id']) : 0;
    $user_id     = isset($input['user_id'])     ? intval($input['user_id'])     : 0;

    if (!$document_id || !$user_id) {
        throw new Exception("document_id and user_id are required");
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

    sendResponse(true, "Document deleted successfully");

} catch (Exception $e) {
    error_log("DELETE DOCUMENT ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
