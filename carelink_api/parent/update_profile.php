<?php
// carelink_api/parent/update_profile.php

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
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $response = array("success" => $success, "message" => $message);
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) {
        throw new Exception("Database connection failed: " . mysqli_connect_error());
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Invalid request method. POST required.");
    }

    if (!isset($_POST['user_id']) || empty($_POST['user_id'])) {
        throw new Exception("User ID is required");
    }

    $user_id = intval($_POST['user_id']);
    
    // ========================================================================
    // COLLECT DATA
    // ========================================================================
    $contact_number = isset($_POST['contact_number']) ? trim($_POST['contact_number']) : '';
    $province = isset($_POST['province']) ? trim($_POST['province']) : '';
    $municipality = isset($_POST['municipality']) ? trim($_POST['municipality']) : '';
    $barangay = isset($_POST['barangay']) ? trim($_POST['barangay']) : '';
    $landmark = isset($_POST['landmark']) ? trim($_POST['landmark']) : NULL;
    $bio = isset($_POST['bio']) ? trim($_POST['bio']) : '';
    
    $address = '';
    if (!empty($barangay) && !empty($municipality) && !empty($province)) {
        $address = "$barangay, $municipality, $province";
    }
    
    $household_size = isset($_POST['household_size']) ? intval($_POST['household_size']) : NULL;
    $has_children = isset($_POST['has_children']) ? intval($_POST['has_children']) : 0;
    $has_elderly = isset($_POST['has_elderly']) ? intval($_POST['has_elderly']) : 0;
    $has_pets = isset($_POST['has_pets']) ? intval($_POST['has_pets']) : 0;
    $pet_details = isset($_POST['pet_details']) ? trim($_POST['pet_details']) : NULL;
    
    // Children Array
    $children = array();
    if (isset($_POST['children']) && !empty($_POST['children'])) {
        $childrenJson = $_POST['children'];
        $children = json_decode($childrenJson, true);
        if (json_last_error() !== JSON_ERROR_NONE) $children = array();
    }

    // Elderly Array (NEW)
    $elderly = array();
    if (isset($_POST['elderly']) && !empty($_POST['elderly'])) {
        $elderlyJson = $_POST['elderly'];
        $elderly = json_decode($elderlyJson, true);
        if (json_last_error() !== JSON_ERROR_NONE) $elderly = array();
    }
    
    if (empty($contact_number)) throw new Exception("Contact number is required");
    if (empty($province) || empty($municipality) || empty($barangay)) throw new Exception("Address is required");

    // ========================================================================
    // HANDLE IMAGE UPLOAD
    // ========================================================================
    $profile_image_url = null;
    
    if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = dirname(__DIR__) . '/uploads/profiles/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $allowedTypes = array('image/jpeg', 'image/png', 'image/jpg', 'image/gif');
        $fileType = $_FILES['profile_image']['type'];
        
        if (in_array($fileType, $allowedTypes)) {
            $fileExt = strtolower(pathinfo($_FILES['profile_image']['name'], PATHINFO_EXTENSION));
            $newFileName = "parentProfile_" . $user_id . "_" . time() . "." . $fileExt;
            $targetFilePath = $uploadDir . $newFileName;

            if (move_uploaded_file($_FILES['profile_image']['tmp_name'], $targetFilePath)) {
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'];
                $profile_image_url = "$protocol://$host/carelink_api/uploads/profiles/$newFileName";
            }
        }
    }

    // ========================================================================
    // START TRANSACTION
    // ========================================================================
    $conn->begin_transaction();

    try {
        // 1. CHECK IF PROFILE EXISTS
        $checkStmt = $conn->prepare("SELECT profile_id FROM parent_profiles WHERE user_id = ?");
        $checkStmt->bind_param("i", $user_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        $profile_id = null;
        $profileExists = false;
        if ($checkResult->num_rows > 0) {
            $profile_id = intval($checkResult->fetch_assoc()['profile_id']);
            $profileExists = true;
        }
        $checkStmt->close();

        // 2. CREATE OR UPDATE PROFILE
        if ($profileExists) {
            $updateFields = array("contact_number = ?", "province = ?", "municipality = ?", "barangay = ?", "bio = ?", "address = ?", "landmark = ?", "updated_at = NOW()");
            $types = "sssssss";
            $params = array($contact_number, $province, $municipality, $barangay, $bio, $address, $landmark);
            
            if ($profile_image_url !== null) {
                $updateFields[] = "profile_image = ?";
                $types .= "s";
                $params[] = $profile_image_url;
            }
            
            $types .= "i";
            $params[] = $profile_id;
            
            $updateSql = "UPDATE parent_profiles SET " . implode(", ", $updateFields) . " WHERE profile_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            
            $bindRefs = array();
            $bindRefs[] = $types;
            for ($i = 0; $i < count($params); $i++) $bindRefs[] = &$params[$i];
            
            call_user_func_array(array($updateStmt, 'bind_param'), $bindRefs);
            $updateStmt->execute();
            $updateStmt->close();
        } else {
            $insertSql = "INSERT INTO parent_profiles (user_id, contact_number, province, municipality, barangay, address, bio, landmark, profile_image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            $insertStmt = $conn->prepare($insertSql);
            $insertStmt->bind_param("issssssss", $user_id, $contact_number, $province, $municipality, $barangay, $address, $bio, $landmark, $profile_image_url);
            $insertStmt->execute();
            $profile_id = $conn->insert_id;
            $insertStmt->close();
        }

        // 3. UPDATE HOUSEHOLD DATA
        $householdCheckStmt = $conn->prepare("SELECT household_id FROM parent_household WHERE profile_id = ?");
        $householdCheckStmt->bind_param("i", $profile_id);
        $householdCheckStmt->execute();
        $householdResult = $householdCheckStmt->get_result();
        
        if ($householdResult->num_rows > 0) {
            $householdUpdateStmt = $conn->prepare("UPDATE parent_household SET household_size = ?, has_children = ?, has_elderly = ?, has_pets = ?, pet_details = ?, updated_at = NOW() WHERE profile_id = ?");
            $householdUpdateStmt->bind_param("iiiisi", $household_size, $has_children, $has_elderly, $has_pets, $pet_details, $profile_id);
            $householdUpdateStmt->execute();
            $householdUpdateStmt->close();
        } else {
            // FIXED BUG: Changed "iiiis" to "iiiiiis" to correctly match the 6 variables!
            $householdInsertStmt = $conn->prepare("INSERT INTO parent_household (profile_id, household_size, has_children, has_elderly, has_pets, pet_details, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $householdInsertStmt->bind_param("iiiiis", $profile_id, $household_size, $has_children, $has_elderly, $has_pets, $pet_details);
            $householdInsertStmt->execute();
            $householdInsertStmt->close();
        }
        $householdCheckStmt->close();

        // 4. UPDATE CHILDREN DATA
        $conn->query("DELETE FROM parent_children WHERE profile_id = $profile_id");
        if (count($children) > 0) {
            $childInsertStmt = $conn->prepare("INSERT INTO parent_children (profile_id, age, gender, special_needs, created_at) VALUES (?, ?, ?, ?, NOW())");
            foreach ($children as $child) {
                $age = isset($child['age']) ? intval($child['age']) : 0;
                $gender = isset($child['gender']) ? $child['gender'] : NULL;
                $special_needs = isset($child['special_needs']) ? trim($child['special_needs']) : NULL;
                if ($age < 0 || $age > 18) continue;
                
                $childInsertStmt->bind_param("iiss", $profile_id, $age, $gender, $special_needs);
                $childInsertStmt->execute();
            }
            $childInsertStmt->close();
        }

        // 5. UPDATE ELDERLY DATA (NEW)
        $conn->query("DELETE FROM parent_elderly WHERE profile_id = $profile_id");
        if (count($elderly) > 0) {
            // "condition" is a reserved keyword in MySQL, so it must be wrapped in backticks!
            $elderlyInsertStmt = $conn->prepare("INSERT INTO parent_elderly (profile_id, age, gender, `condition`, care_level) VALUES (?, ?, ?, ?, ?)");
            foreach ($elderly as $senior) {
                $age = isset($senior['age']) ? intval($senior['age']) : 0;
                $gender = isset($senior['gender']) ? $senior['gender'] : NULL;
                $condition = isset($senior['condition']) ? trim($senior['condition']) : NULL;
                $care_level = isset($senior['care_level']) ? $senior['care_level'] : 'Independent';
                
                $elderlyInsertStmt->bind_param("iisss", $profile_id, $age, $gender, $condition, $care_level);
                $elderlyInsertStmt->execute();
            }
            $elderlyInsertStmt->close();
        }

        // COMMIT TRANSACTION
        $conn->commit();
        sendResponse(true, "Profile updated successfully!", array(
            'profile_id' => $profile_id,
            'profile_image' => $profile_image_url,
            'children_count' => count($children),
            'elderly_count' => count($elderly)
        ));

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>