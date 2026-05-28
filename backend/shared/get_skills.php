<?php
// carelink_api/shared/get_skills.php
// FIXED - Refactored to match project's standard MySQLi architecture

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Standardized error logging
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

// Include your standard connection file
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

    // Fetch all skills with job_id
    $sql = "SELECT 
                skill_id, 
                job_id, 
                skill_name, 
                description 
            FROM ref_skills 
            ORDER BY job_id, skill_name";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $skills = array();
    
    // Fetch associations safely using MySQLi
    while ($row = $result->fetch_assoc()) {
        // Ensure IDs are cast to integers for cleaner frontend parsing
        $row['skill_id'] = intval($row['skill_id']);
        $row['job_id'] = intval($row['job_id']);
        $skills[] = $row;
    }
    
    $stmt->close();
    
    // Send standard JSON response
    sendResponse(true, "Skills retrieved successfully", array(
        'skills' => $skills,
        'total_count' => count($skills)
    ));

} catch (Exception $e) {
    error_log("ERROR in get_skills.php: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?> 