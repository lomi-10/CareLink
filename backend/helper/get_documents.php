<?php
// carelink_api/helper/get_documents.php
// Retrieves all documents for the helper, along with a summary of their document status

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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

    if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
        throw new Exception("User ID is required");
    }

    $user_id = intval($_GET['user_id']);
    error_log("=== GET DOCUMENTS === User ID: $user_id");

    // ========================================================================
    // QUERY: Get all documents for this user
    // ========================================================================
    
    $sql = "SELECT 
                document_id,
                user_id,
                document_type,
                file_path,
                id_type,
                expiry_date,
                status,
                rejection_reason,
                verified_by,
                verified_at,
                uploaded_at,
                updated_at
            FROM user_documents
            WHERE user_id = ?
            ORDER BY 
                FIELD(document_type, 'Barangay Clearance', 'Valid ID', 'Police Clearance', 'TESDA NC2'),
                uploaded_at DESC";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $documents = array();
    
    // Base URL for file access
    $base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/documents/";
    
    while ($row = $result->fetch_assoc()) {
        // Convert to integers
        $row['document_id'] = intval($row['document_id']);
        $row['user_id'] = intval($row['user_id']);
        
        // Add full file URL
        $row['file_url'] = $base_url . $row['file_path'];
        
        // Parse dates
        $row['uploaded_at'] = $row['uploaded_at'] ? date('Y-m-d H:i:s', strtotime($row['uploaded_at'])) : null;
        $row['updated_at'] = $row['updated_at'] ? date('Y-m-d H:i:s', strtotime($row['updated_at'])) : null;
        $row['verified_at'] = $row['verified_at'] ? date('Y-m-d H:i:s', strtotime($row['verified_at'])) : null;
        
        $documents[] = $row;
    }
    
    $stmt->close();
    
    error_log("Found " . count($documents) . " documents for user $user_id");
    
    // ========================================================================
    // DOCUMENT STATUS SUMMARY
    // ========================================================================
    
    $summary = array(
        'total_uploaded' => count($documents),
        'verified' => 0,
        'pending' => 0,
        'rejected' => 0,
        'required_missing' => array(),
        'optional_missing' => array()
    );
    
    // Count by status
    foreach ($documents as $doc) {
        if ($doc['status'] === 'Verified') {
            $summary['verified']++;
        } elseif ($doc['status'] === 'Pending') {
            $summary['pending']++;
        } elseif ($doc['status'] === 'Rejected') {
            $summary['rejected']++;
        }
    }
    
    // Check required documents
    $required_docs = array('Barangay Clearance', 'Valid ID');
    $uploaded_types = array_column($documents, 'document_type');
    
    foreach ($required_docs as $req) {
        if (!in_array($req, $uploaded_types)) {
            $summary['required_missing'][] = $req;
        }
    }
    
    // Check optional documents
    $optional_docs = array('Police Clearance', 'TESDA NC2');
    foreach ($optional_docs as $opt) {
        if (!in_array($opt, $uploaded_types)) {
            $summary['optional_missing'][] = $opt;
        }
    }
    
    // ========================================================================
    // RETURN RESPONSE
    // ========================================================================
    
    sendResponse(true, "Documents retrieved successfully", array(
        'documents' => $documents,
        'summary' => $summary
    ));

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    error_log("Stack: " . $e->getTraceAsString());
    
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>