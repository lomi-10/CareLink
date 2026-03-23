<?php
// carelink_api/peso/get_user_details.php
// PESO retrieves full details of a user (helper or parent) for verification purposes

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

    if (!isset($_GET['user_id']) || !isset($_GET['user_type'])) {
        throw new Exception("User ID and user type are required");
    }

    $user_id = intval($_GET['user_id']);
    $user_type = $_GET['user_type'];

    error_log("=== GET USER DETAILS === User ID: $user_id, Type: $user_type");

    // ========================================================================
    // 1. Get user basic info
    // ========================================================================
    
    $userSql = "SELECT 
                    user_id,
                    email,
                    username,
                    first_name,
                    middle_name,
                    last_name,
                    user_type,
                    status,
                    created_at
                FROM users 
                WHERE user_id = ? AND user_type = ?";
    
    $userStmt = $conn->prepare($userSql);
    $userStmt->bind_param("is", $user_id, $user_type);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    if ($userResult->num_rows === 0) {
        throw new Exception("User not found");
    }
    
    $user = $userResult->fetch_assoc();
    $userStmt->close();

    // ========================================================================
    // 2. Get profile based on user type
    // ========================================================================
    
    $profile = null;
    
    if ($user_type === 'helper') {
        $profileSql = "SELECT * FROM helper_profiles WHERE user_id = ?";
        $profileStmt = $conn->prepare($profileSql);
        $profileStmt->bind_param("i", $user_id);
        $profileStmt->execute();
        $profileResult = $profileStmt->get_result();
        
        if ($profileResult->num_rows > 0) {
            $profile = $profileResult->fetch_assoc();
            $profile['profile_id'] = intval($profile['profile_id']);
            $profile['experience_years'] = intval($profile['experience_years']);
            $profile['expected_salary'] = floatval($profile['expected_salary']);
            
            // Build profile image URL
            if ($profile['profile_image']) {
                $base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
                $profile['profile_image'] = $base_url . $profile['profile_image'];
            }
        }
        $profileStmt->close();
        
    } else if ($user_type === 'parent') {
        $profileSql = "SELECT * FROM parent_profiles WHERE user_id = ?";
        $profileStmt = $conn->prepare($profileSql);
        $profileStmt->bind_param("i", $user_id);
        $profileStmt->execute();
        $profileResult = $profileStmt->get_result();
        
        if ($profileResult->num_rows > 0) {
            $profile = $profileResult->fetch_assoc();
            $profile['profile_id'] = intval($profile['profile_id']);
            
            // Build profile image URL
            if ($profile['profile_image']) {
                $base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
                $profile['profile_image'] = $base_url . $profile['profile_image'];
            }
        }
        $profileStmt->close();
    }

    // ========================================================================
    // 3. Get user documents
    // ========================================================================
    
    $documentsSql = "SELECT 
                        document_id,
                        document_type,
                        file_path,
                        id_type,
                        status,
                        rejection_reason,
                        uploaded_at,
                        verified_at
                    FROM user_documents
                    WHERE user_id = ?
                    ORDER BY FIELD(document_type, 'Barangay Clearance', 'Valid ID', 'Police Clearance', 'TESDA NC2')";
    
    $documentsStmt = $conn->prepare($documentsSql);
    $documentsStmt->bind_param("i", $user_id);
    $documentsStmt->execute();
    $documentsResult = $documentsStmt->get_result();
    
    $documents = array();
    $doc_base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/documents/";
    
    while ($row = $documentsResult->fetch_assoc()) {
        $row['document_id'] = intval($row['document_id']);
        $row['file_url'] = $doc_base_url . $row['file_path'];
        $row['uploaded_at'] = $row['uploaded_at'] ? date('Y-m-d H:i:s', strtotime($row['uploaded_at'])) : null;
        $row['verified_at'] = $row['verified_at'] ? date('Y-m-d H:i:s', strtotime($row['verified_at'])) : null;
        $documents[] = $row;
    }
    $documentsStmt->close();

    error_log("Found " . count($documents) . " documents for user $user_id");

    // ========================================================================
    // Return response
    // ========================================================================
    
    $responseData = array(
        'user' => $user,
        'profile' => $profile,
        'documents' => $documents
    );
    
    sendResponse(true, "User details retrieved successfully", $responseData);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>