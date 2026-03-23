<?php
// carelink_api/parent/get_profile.php

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
    error_log("=== GET PARENT PROFILE (NORMALIZED) === User ID: $user_id");

    // ========================================================================
    // QUERY 1: USER DATA
    // ========================================================================
    $userSql = "SELECT user_id, email, username, first_name, middle_name, last_name, user_type, status, profile_completed, created_at FROM users WHERE user_id = ?";
    $userStmt = $conn->prepare($userSql);
    $userStmt->bind_param("i", $user_id);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    if ($userResult->num_rows === 0) {
        throw new Exception("User not found or not a service seeker");
    }
    
    $user = $userResult->fetch_assoc();
    $userStmt->close();

    // ========================================================================
    // QUERY 2: PROFILE DATA
    // ========================================================================
    $profileSql = "SELECT * FROM parent_profiles WHERE user_id = ?";
    $profileStmt = $conn->prepare($profileSql);
    $profileStmt->bind_param("i", $user_id);
    $profileStmt->execute();
    $profileResult = $profileStmt->get_result();
    
    $profile = null;
    $profile_id = null;
    
    if ($profileResult->num_rows > 0) {
        $profile = $profileResult->fetch_assoc();
        $profile_id = intval($profile['profile_id']);
        $profile['profile_id'] = $profile_id;
    }
    $profileStmt->close();

    // ========================================================================
    // QUERY 3: HOUSEHOLD DATA
    // ========================================================================
    $household = null;
    if ($profile_id !== null) {
        $householdSql = "SELECT household_id, household_size, has_children, has_elderly, has_pets, pet_details, created_at, updated_at FROM parent_household WHERE profile_id = ?";
        $householdStmt = $conn->prepare($householdSql);
        $householdStmt->bind_param("i", $profile_id);
        $householdStmt->execute();
        $householdResult = $householdStmt->get_result();
        
        if ($householdResult->num_rows > 0) {
            $household = $householdResult->fetch_assoc();
            $household['household_id'] = intval($household['household_id']);
            $household['household_size'] = $household['household_size'] !== null ? intval($household['household_size']) : null;
            $household['has_children'] = intval($household['has_children']) === 1;
            $household['has_elderly'] = intval($household['has_elderly']) === 1;
            $household['has_pets'] = intval($household['has_pets']) === 1;
        }
        $householdStmt->close();
    }

    // ========================================================================
    // QUERY 4: CHILDREN DATA
    // ========================================================================
    $children = array();
    $children_count = 0;
    
    if ($profile_id !== null) {
        $childrenSql = "SELECT child_id, age, gender, special_needs, created_at, updated_at FROM parent_children WHERE profile_id = ? ORDER BY age ASC";
        $childrenStmt = $conn->prepare($childrenSql);
        $childrenStmt->bind_param("i", $profile_id);
        $childrenStmt->execute();
        $childrenResult = $childrenStmt->get_result();
        
        while ($row = $childrenResult->fetch_assoc()) {
            $row['child_id'] = intval($row['child_id']);
            $row['age'] = intval($row['age']);
            $children[] = $row;
        }
        $children_count = count($children);
        $childrenStmt->close();
    }

    // ========================================================================
    // QUERY 4.5: ELDERLY DATA (NEW)
    // ========================================================================
    $elderly = array();
    $elderly_count = 0;
    
    if ($profile_id !== null) {
        $elderlySql = "SELECT elderly_id, age, gender, `condition`, care_level FROM parent_elderly WHERE profile_id = ? ORDER BY age ASC";
        $elderlyStmt = $conn->prepare($elderlySql);
        $elderlyStmt->bind_param("i", $profile_id);
        $elderlyStmt->execute();
        $elderlyResult = $elderlyStmt->get_result();
        
        while ($row = $elderlyResult->fetch_assoc()) {
            $row['elderly_id'] = intval($row['elderly_id']);
            $row['age'] = intval($row['age']);
            $elderly[] = $row;
        }
        $elderly_count = count($elderly);
        $elderlyStmt->close();
    }

    // ========================================================================
    // QUERY 5: DOCUMENTS DATA
    // ========================================================================
    $documents = array();
    $docsSql = "SELECT document_id, document_type, file_path, status, uploaded_at FROM user_documents WHERE user_id = ?";
    $docsStmt = $conn->prepare($docsSql);
    $docsStmt->bind_param("i", $user_id);
    $docsStmt->execute();
    $docsResult = $docsStmt->get_result();
    
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    
    while ($row = $docsResult->fetch_assoc()) {
        $row['document_id'] = intval($row['document_id']);
        $row['file_url'] = "$protocol://$host/carelink_api/uploads/documents/" . $row['file_path'];
        $documents[] = $row;
    }
    $docsStmt->close();

    // ========================================================================
    // COMBINE DATA & SEND RESPONSE
    // ========================================================================
    $responseData = array(
        'user' => $user,
        'profile' => $profile,
        'household' => $household,
        'children' => $children,
        'children_count' => $children_count,
        'elderly' => $elderly, // NEW
        'elderly_count' => $elderly_count, // NEW
        'documents' => $documents
    );
    
    error_log("✅ Retrieved profile with $children_count children, $elderly_count elderly, and " . count($documents) . " documents");
    
    sendResponse(true, "Profile retrieved successfully", $responseData);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>