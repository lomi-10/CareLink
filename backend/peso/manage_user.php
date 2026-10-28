<?php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST, OPTIONS');
    echo json_encode(['success' => false, 'message' => 'POST required']);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);

include_once '../dbcon.php';
include_once __DIR__ . '/peso_auth.php';
include_once __DIR__ . '/../shared/auth_tokens.php';
include_once __DIR__ . '/../shared/peso_user_moderation_table.php';

function peso_manage_response(bool $success, string $message, ?array $data = null): void
{
    if (ob_get_level()) {
        ob_clean();
    }
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('A valid JSON request is required.');
    }

    $userId = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $staffId = isset($input['verified_by']) ? (int) $input['verified_by'] : 0;
    $action = isset($input['action']) && is_string($input['action']) ? trim($input['action']) : '';
    $reason = isset($input['reason']) && is_string($input['reason']) ? trim($input['reason']) : '';

    if ($userId <= 0) {
        throw new Exception('A valid user ID is required.');
    }
    if (!in_array($action, ['unverify', 'suspend', 'restore'], true)) {
        throw new Exception('Action must be unverify, suspend, or restore.');
    }
    if ($reason === '') {
        throw new Exception('A reason is required for this account action.');
    }
    if (mb_strlen($reason) > 1000) {
        throw new Exception('The reason must be 1000 characters or fewer.');
    }

    if (carelink_authenticated_user_id($conn) !== $staffId) {
        http_response_code(403);
        throw new Exception('A valid signed-in PESO session is required.');
    }
    peso_validate_staff_actor($conn, $staffId);

    ensure_peso_user_moderation_table($conn);
    ensure_auth_tokens_table($conn);

    $conn->begin_transaction();
    try {
        $userStmt = $conn->prepare("SELECT user_type, status FROM users WHERE user_id = ? FOR UPDATE");
        if (!$userStmt) {
            throw new Exception('Unable to load the account for moderation.');
        }
        $userStmt->bind_param('i', $userId);
        if (!$userStmt->execute()) {
            $userStmt->close();
            throw new Exception('Unable to load the account for moderation.');
        }
        $user = $userStmt->get_result()->fetch_assoc();
        $userStmt->close();
        if (!$user || !in_array($user['user_type'], ['helper', 'parent'], true)) {
            throw new Exception('Only helper and household-employer accounts can be managed here.');
        }

        $profileTable = $user['user_type'] === 'helper' ? 'helper_profiles' : 'parent_profiles';
        $profileStmt = $conn->prepare("SELECT verification_status FROM {$profileTable} WHERE user_id = ? FOR UPDATE");
        if (!$profileStmt) {
            throw new Exception('Unable to load the account verification record.');
        }
        $profileStmt->bind_param('i', $userId);
        if (!$profileStmt->execute()) {
            $profileStmt->close();
            throw new Exception('Unable to load the account verification record.');
        }
        $profile = $profileStmt->get_result()->fetch_assoc();
        $profileStmt->close();
        if (!$profile) {
            throw new Exception('The account profile could not be found.');
        }

        $previousUserStatus = (string) $user['status'];
        $previousVerificationStatus = (string) ($profile['verification_status'] ?? 'Unverified');
        $newUserStatus = $previousUserStatus;
        $newVerificationStatus = $previousVerificationStatus;
        $closedJobs = 0;
        $withdrawnApplications = 0;

        if ($action === 'unverify') {
            if ($previousUserStatus !== 'approved' || $previousVerificationStatus !== 'Verified') {
                throw new Exception('Only an approved, verified account can be unverified.');
            }
            $newUserStatus = 'pending';
            $newVerificationStatus = 'Pending';

            $updateProfile = $conn->prepare(
                "UPDATE {$profileTable}
                    SET verification_status = 'Pending',
                        verified_by = NULL,
                        verified_at = NULL,
                        rejected_by = NULL,
                        rejected_at = NULL,
                        rejection_reason = NULL,
                        updated_at = NOW()
                  WHERE user_id = ?"
            );
            if (!$updateProfile) {
                throw new Exception('Unable to return the account to verification review.');
            }
            $updateProfile->bind_param('i', $userId);
            if (!$updateProfile->execute()) {
                $updateProfile->close();
                throw new Exception('Unable to return the account to verification review.');
            }
            $updateProfile->close();
        } elseif ($action === 'suspend') {
            if ($previousUserStatus !== 'approved' || $previousVerificationStatus !== 'Verified') {
                throw new Exception('Only an approved, verified account can be suspended.');
            }
            $newUserStatus = 'suspended';

            if ($user['user_type'] === 'parent') {
                $jobStmt = $conn->prepare("UPDATE job_posts SET status = 'Closed', updated_at = NOW() WHERE parent_id = ? AND status = 'Open'");
                if (!$jobStmt) {
                    throw new Exception('Unable to close the account’s open job posts.');
                }
                $jobStmt->bind_param('i', $userId);
                if (!$jobStmt->execute()) {
                    $jobStmt->close();
                    throw new Exception('Unable to close the account’s open job posts.');
                }
                $closedJobs = $jobStmt->affected_rows;
                $jobStmt->close();

                $applicationStmt = $conn->prepare(
                    "UPDATE job_applications ja
                       INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
                        SET ja.status = 'Withdrawn', ja.updated_at = NOW()
                      WHERE jp.parent_id = ?
                        AND ja.status NOT IN ('Rejected', 'Withdrawn', 'auto_rejected', 'contract_pending', 'hired', 'termination_pending', 'terminated')
                        AND ja.employer_signed_at IS NULL
                        AND ja.helper_signed_at IS NULL"
                );
            } else {
                $applicationStmt = $conn->prepare(
                    "UPDATE job_applications
                        SET status = 'Withdrawn', updated_at = NOW()
                      WHERE helper_id = ?
                        AND status NOT IN ('Rejected', 'Withdrawn', 'auto_rejected', 'contract_pending', 'hired', 'termination_pending', 'terminated')
                        AND employer_signed_at IS NULL
                        AND helper_signed_at IS NULL"
                );
            }
            if (!$applicationStmt) {
                throw new Exception('Unable to withdraw eligible applications.');
            }
            $applicationStmt->bind_param('i', $userId);
            if (!$applicationStmt->execute()) {
                $applicationStmt->close();
                throw new Exception('Unable to withdraw eligible applications.');
            }
            $withdrawnApplications = $applicationStmt->affected_rows;
            $applicationStmt->close();

            $tokenStmt = $conn->prepare("UPDATE auth_tokens SET expires_at = NOW() WHERE user_id = ?");
            if (!$tokenStmt) {
                throw new Exception('Unable to revoke active account sessions.');
            }
            $tokenStmt->bind_param('i', $userId);
            if (!$tokenStmt->execute()) {
                $tokenStmt->close();
                throw new Exception('Unable to revoke active account sessions.');
            }
            $tokenStmt->close();
        } else {
            if ($previousUserStatus !== 'suspended' || $previousVerificationStatus !== 'Verified') {
                throw new Exception('Only a suspended, still-verified account can be restored.');
            }
            $newUserStatus = 'approved';
        }

        $userUpdate = $conn->prepare("UPDATE users SET status = ?, updated_at = NOW() WHERE user_id = ?");
        if (!$userUpdate) {
            throw new Exception('Unable to update the account status.');
        }
        $userUpdate->bind_param('si', $newUserStatus, $userId);
        if (!$userUpdate->execute()) {
            $userUpdate->close();
            throw new Exception('Unable to update the account status.');
        }
        $userUpdate->close();

        $auditStmt = $conn->prepare(
            "INSERT INTO peso_user_moderation
                (user_id, staff_user_id, action, reason, previous_user_status, new_user_status,
                 previous_verification_status, new_verification_status, closed_job_posts, withdrawn_applications)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        if (!$auditStmt) {
            throw new Exception('Unable to record the moderation decision.');
        }
        $auditStmt->bind_param(
            'iissssssii',
            $userId,
            $staffId,
            $action,
            $reason,
            $previousUserStatus,
            $newUserStatus,
            $previousVerificationStatus,
            $newVerificationStatus,
            $closedJobs,
            $withdrawnApplications
        );
        if (!$auditStmt->execute()) {
            $auditStmt->close();
            throw new Exception('Unable to record the moderation decision.');
        }
        $auditStmt->close();

        $auditAction = [
            'unverify' => 'UNVERIFY_USER',
            'suspend' => 'SUSPEND_USER',
            'restore' => 'RESTORE_USER',
        ][$action];
        peso_audit_verification($conn, $staffId, $auditAction, 'PESO Account Management', $userId);

        require_once __DIR__ . '/../shared/create_notification.php';
        $notification = [
            'unverify' => [
                'account_unverified',
                'Verification review required',
                'PESO returned your account to verification review. Reason: ' . $reason . ' Please update your information or documents.',
            ],
            'suspend' => [
                'account_suspended',
                'Account suspended by PESO',
                'Your account was suspended. Reason: ' . $reason . ' Open job posts and unsigned applications were closed or withdrawn; signed and hired work records were preserved. Contact PESO for assistance.',
            ],
            'restore' => [
                'account_restored',
                'Account access restored',
                'PESO restored access to your account. Reason: ' . $reason,
            ],
        ][$action];
        if (createNotification($conn, $userId, $notification[0], $notification[1], $notification[2], 'account', $userId) === false) {
            throw new Exception('The account was not changed because its notification could not be recorded.');
        }

        $conn->commit();
        peso_manage_response(true, 'Account action completed.', [
            'user_id' => $userId,
            'action' => $action,
            'user_status' => $newUserStatus,
            'verification_status' => $newVerificationStatus,
            'closed_job_posts' => $closedJobs,
            'withdrawn_applications' => $withdrawnApplications,
        ]);
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
} catch (Throwable $e) {
    error_log('PESO account management failed: ' . $e->getMessage());
    if (http_response_code() < 400) {
        http_response_code(400);
    }
    peso_manage_response(false, $e->getMessage());
}
