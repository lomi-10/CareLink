<?php
// carelink_api/parent/get_documents.php
// Get all documents for parent user

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
ini_set('display_startup_errors', 0);
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
        throw new Exception("Database connection failed: " . mysqli_connect_error());
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception("Invalid request method. GET required.");
    }

    if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
        throw new Exception("User ID is required");
    }
    
    $user_id = intval($_GET['user_id']);
    error_log("=== GET PARENT DOCUMENTS === User ID: $user_id");

    // Fetch ALL documents for this parent
    $sql = "SELECT 
                document_id,
                user_id,
                document_type,
                file_path,
                status,
                uploaded_at
            FROM user_documents 
            WHERE user_id = ? 
            ORDER BY uploaded_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $documents = array();
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    
    while ($row = $result->fetch_assoc()) {
        $row['file_url'] = "$protocol://$host/carelink_api/uploads/documents/" . $row['file_path'];
        $row['document_id'] = intval($row['document_id']);
        $documents[] = $row;
    }
    
    $stmt->close();
    
    error_log("✅ Retrieved " . count($documents) . " documents.");
    
    // Note: Returning 'documents' array to match frontend update
    sendResponse(true, "Documents retrieved successfully", array(
        'documents' => $documents
    ));

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>