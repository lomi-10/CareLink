<?php
// carelink_api/parent/upload_documents.php
// Upload Valid ID and/or Barangay Clearance for parent verification

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
include_once __DIR__ . '/../shared/sync_profile_completed.php';

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
    error_log("=== PARENT DOCUMENT UPLOAD === User ID: $user_id");

    // Verify user exists
    $userCheck = $conn->prepare("SELECT user_id FROM users WHERE user_id = ?");
    $userCheck->bind_param("i", $user_id);
    $userCheck->execute();
    if ($userCheck->get_result()->num_rows === 0) {
        throw new Exception("User not found");
    }
    $userCheck->close();

    // Ensure at least one file is uploaded
    if (!isset($_FILES['valid_id']) && !isset($_FILES['barangay_clearance'])) {
        throw new Exception("Please select at least one document to upload");
    }

    $uploadDir = dirname(__DIR__) . '/uploads/documents/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $allowedTypes = array('image/jpeg', 'image/jpg', 'image/png', 'application/pdf');
    $filesProcessed = 0;

    $conn->begin_transaction();

    try {
        // --- Process Valid ID ---
        if (isset($_FILES['valid_id']) && $_FILES['valid_id']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['valid_id'];
            if (!in_array($file['type'], $allowedTypes)) throw new Exception("Invalid file type for Valid ID. JPG, PNG, or PDF only.");
            if ($file['size'] > 5 * 1024 * 1024) throw new Exception("Valid ID file size too large. Maximum 5MB.");

            $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $newFileName = "parent_validid_" . $user_id . "_" . time() . "." . $fileExt;
            
            if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
                $conn->query("DELETE FROM user_documents WHERE user_id = $user_id AND document_type = 'Valid ID'");
                $stmt = $conn->prepare("INSERT INTO user_documents (user_id, document_type, file_path, status, uploaded_at) VALUES (?, 'Valid ID', ?, 'Pending', NOW())");
                $stmt->bind_param("is", $user_id, $newFileName);
                $stmt->execute();
                $stmt->close();
                $filesProcessed++;
            }
        }

        // --- Process Barangay Clearance ---
        if (isset($_FILES['barangay_clearance']) && $_FILES['barangay_clearance']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['barangay_clearance'];
            if (!in_array($file['type'], $allowedTypes)) throw new Exception("Invalid file type for Barangay Clearance. JPG, PNG, or PDF only.");
            if ($file['size'] > 5 * 1024 * 1024) throw new Exception("Barangay Clearance file size too large. Maximum 5MB.");

            $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $newFileName = "parent_brgy_" . $user_id . "_" . time() . "." . $fileExt;
            
            if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
                $conn->query("DELETE FROM user_documents WHERE user_id = $user_id AND document_type = 'Barangay Clearance'");
                $stmt = $conn->prepare("INSERT INTO user_documents (user_id, document_type, file_path, status, uploaded_at) VALUES (?, 'Barangay Clearance', ?, 'Pending', NOW())");
                $stmt->bind_param("is", $user_id, $newFileName);
                $stmt->execute();
                $stmt->close();
                $filesProcessed++;
            }
        }

        if ($filesProcessed === 0) {
            throw new Exception("No valid files were successfully processed.");
        }

        // Update parent profile verification status to Pending (if not already Verified)
        $updateProfile = $conn->prepare(
            "UPDATE parent_profiles 
             SET verification_status = 'Pending', updated_at = NOW() 
             WHERE user_id = ? AND verification_status = 'Unverified'"
        );
        $updateProfile->bind_param("i", $user_id);
        $updateProfile->execute();
        $updateProfile->close();

        $profile_completed = carelink_sync_parent_profile_completed($conn, $user_id);

        $conn->commit();
        error_log("✅ Successfully uploaded $filesProcessed documents for User $user_id");

        sendResponse(true, "Documents uploaded successfully! Your account is now pending review.", array(
            'profile_completed' => $profile_completed
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