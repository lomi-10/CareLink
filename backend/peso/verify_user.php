<?php
// carelink_api/peso/verify_user.php
// PESO verifies or rejects user accounts (helpers or parents)

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

include_once '../dbcon.php';
include_once __DIR__ . '/peso_auth.php';

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

    // Get JSON input
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!isset($data['user_id']) || !isset($data['action'])) {
        throw new Exception("User ID and action are required");
    }

    $user_id = intval($data['user_id']);
    $action = $data['action']; // 'approve' or 'reject'
    $reason = isset($data['reason']) ? $data['reason'] : null;
    $verified_by = isset($data['verified_by']) ? intval($data['verified_by']) : 0; // PESO user_id (actor)

    error_log("=== VERIFY USER === User ID: $user_id, Action: $action");

    // Validate action
    if (!in_array($action, ['approve', 'reject'])) {
        throw new Exception("Invalid action. Must be 'approve' or 'reject'");
    }

    peso_validate_staff_actor($conn, $verified_by);

    // ========================================================================
    // Start Transaction (all-or-nothing: both updates succeed or both fail)
    // ========================================================================
    $conn->begin_transaction();

    try {
        // ====================================================================
        // STEP 1: Get user type
        // ====================================================================
        $userTypeSql = "SELECT user_type, status FROM users WHERE user_id = ?";
        $userTypeStmt = $conn->prepare($userTypeSql);
        $userTypeStmt->bind_param("i", $user_id);
        $userTypeStmt->execute();
        $userTypeResult = $userTypeStmt->get_result();
        
        if ($userTypeResult->num_rows === 0) {
            throw new Exception("User not found");
        }
        
        $user = $userTypeResult->fetch_assoc();
        $user_type = $user['user_type'];
        $current_status = $user['status'];
        $userTypeStmt->close();

        error_log("User type: $user_type, Current status: $current_status");

        // Cannot approve account if any document was rejected (resolve with user first)
        if ($action === 'approve') {
            $docCheck = $conn->prepare("SELECT COUNT(*) AS c FROM user_documents WHERE user_id = ? AND status = 'Rejected'");
            $docCheck->bind_param("i", $user_id);
            $docCheck->execute();
            $rejectedCount = (int) ($docCheck->get_result()->fetch_assoc()['c'] ?? 0);
            $docCheck->close();
            if ($rejectedCount > 0) {
                throw new Exception("Cannot approve this user while one or more documents are rejected. Resolve documents first.");
            }
        }

        // ====================================================================
        // STEP 2: Update users.status (controls access to app)
        // ====================================================================
        
        if ($action === 'approve') {
            $new_user_status = 'approved'; // full access
        } else {
            // keep access so they can fix issues + re-submit
            $new_user_status = 'pending';
        }
        
        $updateUserStatusSql = "UPDATE users 
                               SET status = ?, 
                                   updated_at = NOW() 
                               WHERE user_id = ?";
        
        $updateUserStatusStmt = $conn->prepare($updateUserStatusSql);
        $updateUserStatusStmt->bind_param("si", $new_user_status, $user_id);
        
        if (!$updateUserStatusStmt->execute()) {
            throw new Exception("Failed to update user status: " . $updateUserStatusStmt->error);
        }
        
        $updateUserStatusStmt->close();
        
        error_log("✓ Updated users.status from '$current_status' to '$new_user_status'");

        // ====================================================================
        // STEP 3: Update verification_status in profile table (PESO decision)
        // ====================================================================
        
        if ($action === 'approve') {
            $new_verification_status = 'Verified'; // PESO approved
        } else {
            $new_verification_status = 'Rejected'; // PESO denied
        }

        // Update based on user type (write a clean record of who/when)
        if ($user_type !== 'helper' && $user_type !== 'parent') {
            throw new Exception("Invalid user type for verification: $user_type");
        }

        $profileTable = ($user_type === 'helper') ? 'helper_profiles' : 'parent_profiles';

        if ($action === 'approve') {
            $updateVerificationSql = "UPDATE {$profileTable}
                                      SET verification_status = 'Verified',
                                          verified_by = ?,
                                          verified_at = NOW(),
                                          rejected_by = NULL,
                                          rejected_at = NULL,
                                          rejection_reason = NULL,
                                          updated_at = NOW()
                                      WHERE user_id = ?";
            $updateVerificationStmt = $conn->prepare($updateVerificationSql);
            $updateVerificationStmt->bind_param("ii", $verified_by, $user_id);
        } else {
            $updateVerificationSql = "UPDATE {$profileTable}
                                      SET verification_status = 'Rejected',
                                          rejected_by = ?,
                                          rejected_at = NOW(),
                                          rejection_reason = ?,
                                          updated_at = NOW()
                                      WHERE user_id = ?";
            $updateVerificationStmt = $conn->prepare($updateVerificationSql);
            $updateVerificationStmt->bind_param("isi", $verified_by, $reason, $user_id);
        }
        
        if (!$updateVerificationStmt->execute()) {
            throw new Exception("Failed to update verification status: " . $updateVerificationStmt->error);
        }
        
        if ($updateVerificationStmt->affected_rows === 0) {
            throw new Exception("Profile not found for user");
        }
        
        $updateVerificationStmt->close();
        
        error_log("✓ Updated verification_status to '$new_verification_status'");

        // ====================================================================
        // STEP 4: Log audit trail (actor = PESO)
        // ====================================================================
        $logAction = $action === 'approve' ? 'VERIFY_USER_APPROVE' : 'VERIFY_USER_REJECT';
        peso_audit_verification($conn, $verified_by, $logAction, 'PESO Verification', $user_id);

        // ====================================================================
        // STEP 5: Commit transaction (save all changes)
        // ====================================================================
        
        $conn->commit();
        
        error_log("✓ Transaction committed successfully");

        // Notify the user about verification result
        require_once '../shared/create_notification.php';
        if ($action === 'approve') {
            createNotification($conn, $user_id, 'account_verified',
                'Account Verified! 🎉',
                'Your CareLink account has been verified by PESO. You can now access all features.',
                'account', $user_id);
        } else {
            createNotification($conn, $user_id, 'account_rejected',
                'Account Verification Update',
                'Your account verification was not approved by PESO. Please review your documents and resubmit.',
                'account', $user_id);
        }

        // ====================================================================
        // Send success response
        // ====================================================================
        
        if ($action === 'approve') {
            $message = "User verified successfully! Account status: approved, Verification: Verified";
        } else {
            $message = "User rejected. Account status: pending, Verification: Rejected";
        }
        
        $responseData = array(
            'user_id' => $user_id,
            'user_status' => $new_user_status,
            'verification_status' => $new_verification_status,
            'action' => $action
        );

        sendResponse(true, $message, $responseData);

    } catch (Exception $e) {
        // If anything fails, undo ALL changes
        $conn->rollback();
        error_log("✗ Transaction rolled back: " . $e->getMessage());
        throw $e;
    }

} catch (Exception $e) {
    error_log("ERROR in verify_user.php: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>