<?php
// carelink_api/peso/get_dashboard_stats.php
// PESO dashboard statistics

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

    // Get total helpers
    $totalHelpersSql = "SELECT COUNT(*) as count FROM users WHERE user_type = 'helper'";
    $totalHelpersResult = $conn->query($totalHelpersSql);
    $total_helpers = $totalHelpersResult->fetch_assoc()['count'];

    // Get pending helpers
    $pendingHelpersSql = "SELECT COUNT(*) as count 
                          FROM helper_profiles 
                          WHERE verification_status = 'Pending'";
    $pendingHelpersResult = $conn->query($pendingHelpersSql);
    $pending_helpers = $pendingHelpersResult->fetch_assoc()['count'];

    // Get verified helpers
    $verifiedHelpersSql = "SELECT COUNT(*) as count 
                           FROM helper_profiles 
                           WHERE verification_status = 'Verified'";
    $verifiedHelpersResult = $conn->query($verifiedHelpersSql);
    $verified_helpers = $verifiedHelpersResult->fetch_assoc()['count'];

    // Get total parents
    $totalParentsSql = "SELECT COUNT(*) as count FROM users WHERE user_type = 'parent'";
    $totalParentsResult = $conn->query($totalParentsSql);
    $total_parents = $totalParentsResult->fetch_assoc()['count'];

    // Get pending documents
    $pendingDocsSql = "SELECT COUNT(*) as count 
                       FROM user_documents 
                       WHERE status = 'Pending'";
    $pendingDocsResult = $conn->query($pendingDocsSql);
    $pending_documents = $pendingDocsResult->fetch_assoc()['count'];

    // Get verified documents
    $verifiedDocsSql = "SELECT COUNT(*) as count 
                        FROM user_documents 
                        WHERE status = 'Verified'";
    $verifiedDocsResult = $conn->query($verifiedDocsSql);
    $verified_documents = $verifiedDocsResult->fetch_assoc()['count'];

    $stats = array(
        'total_helpers' => intval($total_helpers),
        'pending_helpers' => intval($pending_helpers),
        'verified_helpers' => intval($verified_helpers),
        'total_parents' => intval($total_parents),
        'pending_documents' => intval($pending_documents),
        'verified_documents' => intval($verified_documents),
    );

    sendResponse(true, "Stats retrieved successfully", $stats);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>