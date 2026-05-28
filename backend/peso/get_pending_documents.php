<?php
// carelink_api/peso/get_pending_documents.php
// PESO retrieves all pending documents for verification

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

    // Get all pending documents with user information
    $sql = "SELECT 
                d.document_id,
                d.user_id,
                d.document_type,
                d.file_path,
                d.id_type,
                d.status,
                d.uploaded_at,
                u.user_type,
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) as user_name,
                COALESCE(h.profile_image, p.profile_image) as profile_image
            FROM user_documents d
            INNER JOIN users u ON d.user_id = u.user_id
            LEFT JOIN helper_profiles h ON u.user_id = h.user_id AND u.user_type = 'helper'
            LEFT JOIN parent_profiles p ON u.user_id = p.user_id AND u.user_type = 'parent'
            WHERE d.status = 'Pending'
            ORDER BY d.uploaded_at DESC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $documents = array();
    $doc_base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/documents/";
    $profile_base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
    
    while ($row = $result->fetch_assoc()) {
        $row['document_id'] = intval($row['document_id']);
        $row['user_id'] = intval($row['user_id']);
        
        // Build file URL
        $row['file_url'] = $doc_base_url . $row['file_path'];
        
        // Build profile image URL
        if ($row['profile_image']) {
            $row['profile_image'] = $profile_base_url . $row['profile_image'];
        }
        
        // Format date
        if ($row['uploaded_at']) {
            $row['uploaded_at'] = date('Y-m-d H:i:s', strtotime($row['uploaded_at']));
        }
        
        $documents[] = $row;
    }
    
    error_log("Found " . count($documents) . " pending documents");
    
    sendResponse(true, "Pending documents retrieved successfully", $documents);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>