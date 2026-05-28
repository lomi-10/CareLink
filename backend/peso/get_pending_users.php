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
    
    // Return users for PESO verification screen.
    //
    // Desired behavior:
    // - Show ALL users who reached 100% setup (users.profile_completed = 1)
    // - ALSO show Verified/Rejected users for history, even if profile_completed is old (0)
    // - PESO UI filters handle Pending / Verified / Rejected / All
    $sql = "SELECT 
                u.user_id,
                u.email,
                u.username,
                CONCAT(u.first_name, ' ', IFNULL(u.middle_name, ''), ' ', u.last_name) as name,
                u.user_type,
                COALESCE(h.profile_image, p.profile_image) as profile_image,
                COALESCE(h.contact_number, p.contact_number) as contact_number,
                CASE
                    WHEN COALESCE(u.profile_completed, 0) = 1
                         AND COALESCE(h.verification_status, p.verification_status, 'Unverified') = 'Unverified'
                    THEN 'Pending'
                    ELSE COALESCE(h.verification_status, p.verification_status, 'Unverified')
                END as verification_status,
                COALESCE(h.created_at, p.created_at, u.created_at) as created_at
            FROM users u
            LEFT JOIN helper_profiles h ON u.user_id = h.user_id
            LEFT JOIN parent_profiles p ON u.user_id = p.user_id
            WHERE u.user_type IN ('helper', 'parent')
              AND (
                -- ready for verification (flag already computed by backend sync)
                COALESCE(u.profile_completed, 0) = 1

                -- OR already in PESO workflow / history
                OR COALESCE(h.verification_status, p.verification_status, 'Unverified') IN ('Pending','Verified','Rejected')

                -- OR computed readiness (for databases where profile_completed wasn't updated)
                OR (
                  u.user_type = 'helper'
                  AND h.profile_id IS NOT NULL
                  AND COALESCE(u.username,'') <> '' AND CHAR_LENGTH(u.username) >= 3
                  AND COALESCE(h.contact_number,'') <> ''
                  AND COALESCE(h.province,'') <> ''
                  AND COALESCE(h.municipality,'') <> ''
                  AND COALESCE(h.barangay,'') <> ''
                  AND COALESCE(h.bio,'') <> '' AND CHAR_LENGTH(TRIM(h.bio)) >= 15
                  AND EXISTS (SELECT 1 FROM helper_skills hs WHERE hs.profile_id = h.profile_id)
                  AND EXISTS (
                    SELECT 1 FROM user_documents d
                    WHERE d.user_id = u.user_id
                      AND d.document_type IN ('Barangay Clearance','Valid ID')
                      AND d.status IN ('Pending','Verified')
                  )
                )
                OR (
                  u.user_type = 'parent'
                  AND p.profile_id IS NOT NULL
                  AND COALESCE(p.contact_number,'') <> ''
                  AND COALESCE(p.province,'') <> ''
                  AND COALESCE(p.municipality,'') <> ''
                  AND COALESCE(p.barangay,'') <> ''
                  AND COALESCE(p.bio,'') <> '' AND CHAR_LENGTH(TRIM(p.bio)) >= 15
                  AND EXISTS (SELECT 1 FROM parent_household ph WHERE ph.profile_id = p.profile_id)
                  AND EXISTS (
                    SELECT 1 FROM user_documents d
                    WHERE d.user_id = u.user_id
                      AND d.document_type IN ('Valid ID','Barangay Clearance')
                      AND d.status IN ('Pending','Verified')
                  )
                )
              )
            ORDER BY 
                CASE 
                    WHEN COALESCE(h.verification_status, p.verification_status) = 'Pending' THEN 1
                    WHEN COALESCE(h.verification_status, p.verification_status) = 'Verified' THEN 2
                    WHEN COALESCE(h.verification_status, p.verification_status) = 'Rejected' THEN 3
                    ELSE 4
                END,
                COALESCE(h.created_at, p.created_at, u.created_at) DESC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Query failed: " . $conn->error);
    }
    
    $users = array();
    $base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
    
    while ($row = $result->fetch_assoc()) {
        $row['user_id'] = intval($row['user_id']);
        
        // Build full profile image URL (and repair double-saved URLs)
        if ($row['profile_image']) {
            $img = (string) $row['profile_image'];
            // Some rows were saved incorrectly as: base_url + full_url
            // e.g. http://.../uploads/profiles/http://.../uploads/profiles/file.jpg
            if (preg_match('#/uploads/profiles/(https?://)#i', $img)) {
                // keep only the inner full URL
                $row['profile_image'] = preg_replace('#^.*?/uploads/profiles/#i', '', $img);
                $row['profile_image'] = ltrim($row['profile_image'], '/');
            }
            $img2 = (string) $row['profile_image'];
            if (stripos($img2, 'http://') === 0 || stripos($img2, 'https://') === 0) {
                $row['profile_image'] = $img2;
            } else {
                $row['profile_image'] = $base_url . $img2;
            }
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