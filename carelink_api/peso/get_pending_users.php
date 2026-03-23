<?php
// carelink_api/peso/cget_pending_users.php
// Get all pending users (helpers and parents) for PESO verification

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

    // Query to get all users (helpers and parents) with their verification status
    // Combines helper_profiles and parent_profiles
    
    $sql = "SELECT 
                u.user_id,
                u.email,
                u.username,
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) as name,
                u.user_type,
                COALESCE(h.profile_image, p.profile_image) as profile_image,
                COALESCE(h.contact_number, p.contact_number) as contact_number,
                COALESCE(h.verification_status, p.verification_status, 'Unverified') as verification_status,
                COALESCE(h.created_at, p.created_at) as created_at
            FROM users u
            LEFT JOIN helper_profiles h ON u.user_id = h.user_id
            LEFT JOIN parent_profiles p ON u.user_id = p.user_id
            WHERE u.user_type IN ('helper', 'parent')
            AND (h.profile_id IS NOT NULL OR p.profile_id IS NOT NULL)
            ORDER BY 
                CASE 
                    WHEN COALESCE(h.verification_status, p.verification_status) = 'Pending' THEN 1
                    WHEN COALESCE(h.verification_status, p.verification_status) = 'Verified' THEN 2
                    WHEN COALESCE(h.verification_status, p.verification_status) = 'Rejected' THEN 3
                    ELSE 4
                END,
                COALESCE(h.created_at, p.created_at) DESC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $users = array();
    $base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
    
    while ($row = $result->fetch_assoc()) {
        $row['user_id'] = intval($row['user_id']);
        
        // Build full profile image URL
        if ($row['profile_image']) {
            $row['profile_image'] = $base_url . $row['profile_image'];
        }
        
        // Format date
        if ($row['created_at']) {
            $row['created_at'] = date('Y-m-d H:i:s', strtotime($row['created_at']));
        }
        
        $users[] = $row;
    }
    
    error_log("Found " . count($users) . " users");
    
    sendResponse(true, "Users retrieved successfully", $users);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>