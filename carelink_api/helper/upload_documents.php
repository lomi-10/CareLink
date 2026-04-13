<?php
// carelink_api/helper/upload_documents.php
// Handles document uploads for helpers

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
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';
include_once __DIR__ . '/../shared/sync_profile_completed.php';

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

    if (!isset($_POST['user_id']) || empty($_POST['user_id'])) {
        throw new Exception("User ID is required");
    }

    $user_id = intval($_POST['user_id']);
    error_log("=== UPLOAD DOCUMENTS === User ID: $user_id");

    // Verify user exists and is a helper
    $checkUserSql = "SELECT user_id, user_type FROM users WHERE user_id = ?";
    $checkUserStmt = $conn->prepare($checkUserSql);
    $checkUserStmt->bind_param("i", $user_id);
    $checkUserStmt->execute();
    $checkUserResult = $checkUserStmt->get_result();
    
    if ($checkUserResult->num_rows === 0) {
        throw new Exception("User not found");
    }
    
    $userData = $checkUserResult->fetch_assoc();
    if ($userData['user_type'] !== 'helper') {
        throw new Exception("Only helpers can upload documents");
    }
    $checkUserStmt->close();

    // Create upload directory
    $uploadDir = dirname(__DIR__) . "/uploads/documents/";
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $uploadedDocs = array();
    $errors = array();

    // ========================================================================
    // DOCUMENT 1: Barangay Clearance (REQUIRED)
    // ========================================================================
    
    if (isset($_FILES['barangay_clearance']) && $_FILES['barangay_clearance']['error'] === UPLOAD_ERR_OK) {
        $fileExt = strtolower(pathinfo($_FILES['barangay_clearance']['name'], PATHINFO_EXTENSION));
        $allowedExts = array('jpg', 'jpeg', 'png', 'pdf');
        
        if (in_array($fileExt, $allowedExts)) {
            $fileName = "barangay_" . $user_id . "_" . time() . "." . $fileExt;
            $filePath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['barangay_clearance']['tmp_name'], $filePath)) {
                $uploadedDocs['barangay_clearance'] = $fileName;
                error_log("✅ Barangay Clearance uploaded: $fileName");
            } else {
                $errors[] = "Failed to save Barangay Clearance";
            }
        } else {
            $errors[] = "Barangay Clearance: Invalid file type (only jpg, png, pdf allowed)";
        }
    }

    // ========================================================================
    // DOCUMENT 2: Valid ID (REQUIRED)
    // ========================================================================
    
    // Get ID type from POST (PhilSys, Passport, Driver's License, etc.)
    $id_type = isset($_POST['id_type']) ? trim($_POST['id_type']) : 'PhilSys';
    
    if (isset($_FILES['valid_id']) && $_FILES['valid_id']['error'] === UPLOAD_ERR_OK) {
        $fileExt = strtolower(pathinfo($_FILES['valid_id']['name'], PATHINFO_EXTENSION));
        $allowedExts = array('jpg', 'jpeg', 'png', 'pdf');
        
        if (in_array($fileExt, $allowedExts)) {
            $fileName = "valid_id_" . $user_id . "_" . time() . "." . $fileExt;
            $filePath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['valid_id']['tmp_name'], $filePath)) {
                $uploadedDocs['valid_id'] = array(
                    'file_name' => $fileName,
                    'id_type' => $id_type
                );
                error_log("✅ Valid ID uploaded: $fileName (Type: $id_type)");
            } else {
                $errors[] = "Failed to save Valid ID";
            }
        } else {
            $errors[] = "Valid ID: Invalid file type (only jpg, png, pdf allowed)";
        }
    }

    // ========================================================================
    // DOCUMENT 3: Police Clearance (OPTIONAL)
    // ========================================================================
    
    if (isset($_FILES['police_clearance']) && $_FILES['police_clearance']['error'] === UPLOAD_ERR_OK) {
        $fileExt = strtolower(pathinfo($_FILES['police_clearance']['name'], PATHINFO_EXTENSION));
        $allowedExts = array('jpg', 'jpeg', 'png', 'pdf');
        
        if (in_array($fileExt, $allowedExts)) {
            $fileName = "police_" . $user_id . "_" . time() . "." . $fileExt;
            $filePath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['police_clearance']['tmp_name'], $filePath)) {
                $uploadedDocs['police_clearance'] = $fileName;
                error_log("✅ Police Clearance uploaded: $fileName");
            } else {
                $errors[] = "Failed to save Police Clearance";
            }
        } else {
            $errors[] = "Police Clearance: Invalid file type (only jpg, png, pdf allowed)";
        }
    }

    // ========================================================================
    // DOCUMENT 4: TESDA NC2 (OPTIONAL)
    // ========================================================================
    
    if (isset($_FILES['tesda_nc2']) && $_FILES['tesda_nc2']['error'] === UPLOAD_ERR_OK) {
        $fileExt = strtolower(pathinfo($_FILES['tesda_nc2']['name'], PATHINFO_EXTENSION));
        $allowedExts = array('jpg', 'jpeg', 'png', 'pdf');
        
        if (in_array($fileExt, $allowedExts)) {
            $fileName = "tesda_" . $user_id . "_" . time() . "." . $fileExt;
            $filePath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['tesda_nc2']['tmp_name'], $filePath)) {
                $uploadedDocs['tesda_nc2'] = $fileName;
                error_log("✅ TESDA NC2 uploaded: $fileName");
            } else {
                $errors[] = "Failed to save TESDA NC2";
            }
        } else {
            $errors[] = "TESDA NC2: Invalid file type (only jpg, png, pdf allowed)";
        }
    }

    // Check if at least one file was uploaded
    if (empty($uploadedDocs)) {
        throw new Exception("No valid documents were uploaded. " . implode(", ", $errors));
    }

    // ========================================================================
    // START TRANSACTION - Save to user_documents table
    // ========================================================================
    
    $conn->begin_transaction();

    try {
        $savedCount = 0;

        // ====================================================================
        // Save Barangay Clearance
        // ====================================================================
        if (isset($uploadedDocs['barangay_clearance'])) {
            // Check if already exists
            $checkSql = "SELECT document_id FROM user_documents 
                        WHERE user_id = ? AND document_type = 'Barangay Clearance'";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("i", $user_id);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing record
                $updateSql = "UPDATE user_documents 
                            SET file_path = ?, 
                                status = 'Pending', 
                                uploaded_at = NOW(),
                                updated_at = NOW()
                            WHERE user_id = ? AND document_type = 'Barangay Clearance'";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("si", $uploadedDocs['barangay_clearance'], $user_id);
                $updateStmt->execute();
                $updateStmt->close();
                error_log("Updated existing Barangay Clearance");
            } else {
                // Insert new record
                $insertSql = "INSERT INTO user_documents 
                            (user_id, document_type, file_path, status, uploaded_at) 
                            VALUES (?, 'Barangay Clearance', ?, 'Pending', NOW())";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("is", $user_id, $uploadedDocs['barangay_clearance']);
                $insertStmt->execute();
                $insertStmt->close();
                error_log("Inserted new Barangay Clearance");
            }
            $checkStmt->close();
            $savedCount++;
        }

        // ====================================================================
        // Save Valid ID
        // ====================================================================
        if (isset($uploadedDocs['valid_id'])) {
            $checkSql = "SELECT document_id FROM user_documents 
                        WHERE user_id = ? AND document_type = 'Valid ID'";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("i", $user_id);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                // Update existing
                $updateSql = "UPDATE user_documents 
                            SET file_path = ?, 
                                id_type = ?,
                                status = 'Pending', 
                                uploaded_at = NOW(),
                                updated_at = NOW()
                            WHERE user_id = ? AND document_type = 'Valid ID'";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("ssi", 
                    $uploadedDocs['valid_id']['file_name'], 
                    $uploadedDocs['valid_id']['id_type'], 
                    $user_id
                );
                $updateStmt->execute();
                $updateStmt->close();
                error_log("Updated existing Valid ID");
            } else {
                // Insert new
                $insertSql = "INSERT INTO user_documents 
                            (user_id, document_type, file_path, id_type, status, uploaded_at) 
                            VALUES (?, 'Valid ID', ?, ?, 'Pending', NOW())";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("iss", 
                    $user_id, 
                    $uploadedDocs['valid_id']['file_name'],
                    $uploadedDocs['valid_id']['id_type']
                );
                $insertStmt->execute();
                $insertStmt->close();
                error_log("Inserted new Valid ID");
            }
            $checkStmt->close();
            $savedCount++;
        }

        // ====================================================================
        // Save Police Clearance
        // ====================================================================
        if (isset($uploadedDocs['police_clearance'])) {
            $checkSql = "SELECT document_id FROM user_documents 
                        WHERE user_id = ? AND document_type = 'Police Clearance'";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("i", $user_id);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                $updateSql = "UPDATE user_documents 
                            SET file_path = ?, 
                                status = 'Pending', 
                                uploaded_at = NOW(),
                                updated_at = NOW()
                            WHERE user_id = ? AND document_type = 'Police Clearance'";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("si", $uploadedDocs['police_clearance'], $user_id);
                $updateStmt->execute();
                $updateStmt->close();
                error_log("Updated existing Police Clearance");
            } else {
                $insertSql = "INSERT INTO user_documents 
                            (user_id, document_type, file_path, status, uploaded_at) 
                            VALUES (?, 'Police Clearance', ?, 'Pending', NOW())";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("is", $user_id, $uploadedDocs['police_clearance']);
                $insertStmt->execute();
                $insertStmt->close();
                error_log("Inserted new Police Clearance");
            }
            $checkStmt->close();
            $savedCount++;
        }

        // ====================================================================
        // Save TESDA NC2
        // ====================================================================
        if (isset($uploadedDocs['tesda_nc2'])) {
            $checkSql = "SELECT document_id FROM user_documents 
                        WHERE user_id = ? AND document_type = 'TESDA NC2'";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("i", $user_id);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                $updateSql = "UPDATE user_documents 
                            SET file_path = ?, 
                                status = 'Pending', 
                                uploaded_at = NOW(),
                                updated_at = NOW()
                            WHERE user_id = ? AND document_type = 'TESDA NC2'";
                $updateStmt = $conn->prepare($updateSql);
                $updateStmt->bind_param("si", $uploadedDocs['tesda_nc2'], $user_id);
                $updateStmt->execute();
                $updateStmt->close();
                error_log("Updated existing TESDA NC2");
            } else {
                $insertSql = "INSERT INTO user_documents 
                            (user_id, document_type, file_path, status, uploaded_at) 
                            VALUES (?, 'TESDA NC2', ?, 'Pending', NOW())";
                $insertStmt = $conn->prepare($insertSql);
                $insertStmt->bind_param("is", $user_id, $uploadedDocs['tesda_nc2']);
                $insertStmt->execute();
                $insertStmt->close();
                error_log("Inserted new TESDA NC2");
            }
            $checkStmt->close();
            $savedCount++;
        }

        $profile_completed = carelink_sync_helper_profile_completed($conn, $user_id);

        // Commit transaction
        $conn->commit();
        error_log("=== TRANSACTION COMMITTED === Saved $savedCount documents");

        // Log action in log_trail
        $logSql = "INSERT INTO log_trail (user_id, action, module, status, created_at) 
                   VALUES (?, 'UPLOAD_DOCUMENTS', 'Documents', 'Success', NOW())";
        $logStmt = $conn->prepare($logSql);
        $logStmt->bind_param("i", $user_id);
        $logStmt->execute();
        $logStmt->close();

        // Return success response
        sendResponse(true, "$savedCount document(s) uploaded successfully!", array(
            'documents_uploaded' => $savedCount,
            'files' => array_keys($uploadedDocs),
            'errors' => $errors,
            'profile_completed' => $profile_completed
        ));

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    error_log("Stack: " . $e->getTraceAsString());
    
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>