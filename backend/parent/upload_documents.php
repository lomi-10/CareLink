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
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

include_once '../dbcon.php';
include_once __DIR__ . '/../shared/sync_profile_completed.php';
include_once __DIR__ . '/../shared/file_security.php';

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

    // Ownership check — see the matching comment in helper/upload_documents.php.
    $requester_id = isset($_POST['requester_id']) ? intval($_POST['requester_id']) : 0;
    if ($requester_id <= 0 || $requester_id !== $user_id) {
        throw new Exception("You are not allowed to upload documents for this account.");
    }

    // Verify user exists
    $userCheck = $conn->prepare("SELECT user_id FROM users WHERE user_id = ?");
    $userCheck->bind_param("i", $user_id);
    $userCheck->execute();
    if ($userCheck->get_result()->num_rows === 0) {
        throw new Exception("User not found");
    }
    $userCheck->close();

    // Ensure at least one file is uploaded
    if (!isset($_FILES['valid_id']) && !isset($_FILES['valid_id_back']) && !isset($_FILES['barangay_clearance'])) {
        throw new Exception("Please select at least one document to upload");
    }

    $uploadDir = dirname(__DIR__) . '/uploads/documents/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $filesProcessed = 0;

    $conn->begin_transaction();

    try {
        // --- Process Valid ID (front + back are independent uploads) ---
        $pvFront = null;
        $pvBack  = null;
        if (isset($_FILES['valid_id']) && $_FILES['valid_id']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['valid_id'];
            $fileExt = carelink_validate_uploaded_file($file, 'Valid ID');
            $newFileName = carelink_random_doc_filename('parent_validid', $user_id, $fileExt);
            if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
                $pvFront = $newFileName;
            }
        }
        if (isset($_FILES['valid_id_back']) && $_FILES['valid_id_back']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['valid_id_back'];
            $backExt = carelink_validate_uploaded_file($file, 'Valid ID (Back)');
            $backFileName = carelink_random_doc_filename('parent_validid_back', $user_id, $backExt);
            if (move_uploaded_file($file['tmp_name'], $uploadDir . $backFileName)) {
                $pvBack = $backFileName;
            }
        }
        if ($pvFront !== null || $pvBack !== null) {
            // Upsert — update only the side sent so the other side + its scan survive.
            $chk = $conn->prepare("SELECT document_id FROM user_documents WHERE user_id = ? AND document_type = 'Valid ID' LIMIT 1");
            $chk->bind_param("i", $user_id);
            $chk->execute();
            $exists = $chk->get_result()->num_rows > 0;
            $chk->close();

            if ($exists) {
                if ($pvFront !== null && $pvBack !== null) {
                    $stmt = $conn->prepare("UPDATE user_documents SET file_path = ?, file_path_back = ?, status = 'Pending', uploaded_at = NOW() WHERE user_id = ? AND document_type = 'Valid ID'");
                    $stmt->bind_param("ssi", $pvFront, $pvBack, $user_id);
                } elseif ($pvBack !== null) {
                    $stmt = $conn->prepare("UPDATE user_documents SET file_path_back = ?, status = 'Pending', uploaded_at = NOW() WHERE user_id = ? AND document_type = 'Valid ID'");
                    $stmt->bind_param("si", $pvBack, $user_id);
                } else {
                    $stmt = $conn->prepare("UPDATE user_documents SET file_path = ?, status = 'Pending', uploaded_at = NOW() WHERE user_id = ? AND document_type = 'Valid ID'");
                    $stmt->bind_param("si", $pvFront, $user_id);
                }
                $stmt->execute();
                $stmt->close();
            } else {
                $stmt = $conn->prepare("INSERT INTO user_documents (user_id, document_type, file_path, file_path_back, status, uploaded_at) VALUES (?, 'Valid ID', ?, ?, 'Pending', NOW())");
                $stmt->bind_param("iss", $user_id, $pvFront, $pvBack);
                $stmt->execute();
                $stmt->close();
            }
            $filesProcessed++;
        }

        // --- Process Barangay Clearance ---
        if (isset($_FILES['barangay_clearance']) && $_FILES['barangay_clearance']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['barangay_clearance'];
            $fileExt = carelink_validate_uploaded_file($file, 'Barangay Clearance');
            $newFileName = carelink_random_doc_filename('parent_brgy', $user_id, $fileExt);

            if (move_uploaded_file($file['tmp_name'], $uploadDir . $newFileName)) {
                $del = $conn->prepare("DELETE FROM user_documents WHERE user_id = ? AND document_type = 'Barangay Clearance'");
                $del->bind_param("i", $user_id);
                $del->execute();
                $del->close();

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

        // Return account to PESO queue after new uploads (first-time or replacing rejected docs)
        $updateProfile = $conn->prepare(
            "UPDATE parent_profiles 
             SET verification_status = 'Pending', updated_at = NOW() 
             WHERE user_id = ? 
               AND verification_status IN ('Unverified', 'Pending', 'Rejected')"
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