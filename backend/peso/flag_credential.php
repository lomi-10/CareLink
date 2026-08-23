<?php
// carelink_api/peso/flag_credential.php
// PESO raises a fraud concern against a document on an ALREADY-VERIFIED account,
// and optionally pulls that account's verification back.
//
// This is distinct from verify_document.php's reject, which is part of the first
// review pass. This endpoint is for what happens afterwards: an officer notices
// altered or fabricated details on an account that was already cleared. Two
// levels, because those are genuinely different decisions:
//
//   revoke_verification = false → concern recorded, owner notified, account stays
//        verified. For "this looks off, watch it" without cutting off someone's
//        income on a suspicion.
//   revoke_verification = true  → account returns to Rejected and must be
//        re-reviewed. For "this is fake."
//
// Either way the flag survives a re-upload (see shared/credential_flags_table.php).

ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
// Authorization is listed because lib/authFetch.ts attaches a bearer token to
// every API_URL request. Without it here, the browser preflight for this POST
// is refused and the request never reaches PHP.
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);

include_once '../dbcon.php';
include_once __DIR__ . '/peso_auth.php';
include_once __DIR__ . '/../shared/credential_flags_table.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) $response['data'] = $data;
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $data = json_decode(file_get_contents('php://input'), true);

    $document_id = isset($data['document_id']) ? intval($data['document_id']) : 0;
    $user_id     = isset($data['user_id']) ? intval($data['user_id']) : 0;
    $reason      = isset($data['reason']) ? trim((string) $data['reason']) : '';
    $revoke      = !empty($data['revoke_verification']);
    $flagged_by  = isset($data['flagged_by']) ? intval($data['flagged_by']) : 0;

    if ($reason === '') {
        throw new Exception('A reason is required. It is shown to the account holder and kept on the record.');
    }
    if ($document_id <= 0 && $user_id <= 0) {
        throw new Exception('Either a document or an account must be identified.');
    }

    peso_validate_staff_actor($conn, $flagged_by);
    ensure_credential_flags_table($conn);

    $conn->begin_transaction();

    try {
        $document_type = null;

        // Resolve the owner from the document itself when one was named, so a
        // mismatched user_id in the request can never redirect the flag onto a
        // different account.
        if ($document_id > 0) {
            $stmt = $conn->prepare('SELECT user_id, document_type FROM user_documents WHERE document_id = ?');
            $stmt->bind_param('i', $document_id);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$row) throw new Exception('Document not found.');
            $user_id = (int) $row['user_id'];
            $document_type = $row['document_type'];
        }

        $stmt = $conn->prepare('SELECT user_type FROM users WHERE user_id = ?');
        $stmt->bind_param('i', $user_id);
        $stmt->execute();
        $userRow = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$userRow) throw new Exception('Account not found.');

        $user_type = $userRow['user_type'];
        if ($user_type !== 'helper' && $user_type !== 'parent') {
            throw new Exception('Only helper and employer accounts carry PESO credentials.');
        }
        $profileTable = $user_type === 'helper' ? 'helper_profiles' : 'parent_profiles';

        // Snapshot the status BEFORE changing it, so a flag raised in error can
        // be undone exactly rather than guessed at.
        $prior = null;
        $res = $conn->query("SELECT verification_status FROM {$profileTable} WHERE user_id = " . (int) $user_id);
        if ($res && ($r = $res->fetch_assoc())) $prior = $r['verification_status'];

        // The flagged document goes to Rejected so the owner sees exactly which
        // file is disputed and what to replace.
        if ($document_id > 0) {
            $stmt = $conn->prepare(
                "UPDATE user_documents
                 SET status = 'Rejected', rejection_reason = ?, verified_by = ?, verified_at = NULL, updated_at = NOW()
                 WHERE document_id = ?"
            );
            $stmt->bind_param('sii', $reason, $flagged_by, $document_id);
            $stmt->execute();
            $stmt->close();
        }

        $revokeInt = $revoke ? 1 : 0;
        $stmt = $conn->prepare(
            'INSERT INTO credential_flags (user_id, document_id, document_type, flagged_by, reason, revoked_verification, prior_verification)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $docIdOrNull = $document_id > 0 ? $document_id : null;
        $stmt->bind_param('iisisis', $user_id, $docIdOrNull, $document_type, $flagged_by, $reason, $revokeInt, $prior);
        $stmt->execute();
        $flag_id = (int) $stmt->insert_id;
        $stmt->close();

        if ($revoke) {
            $stmt = $conn->prepare(
                "UPDATE {$profileTable}
                 SET verification_status = 'Rejected',
                     rejection_reason = ?,
                     rejected_by = ?,
                     rejected_at = NOW(),
                     verified_at = NULL,
                     updated_at = NOW()
                 WHERE user_id = ?"
            );
            $stmt->bind_param('sii', $reason, $flagged_by, $user_id);
            $stmt->execute();
            $stmt->close();

            // Access is kept ('pending', not 'suspended') so they can re-upload
            // and answer PESO. Locking them out of the only channel where they
            // could clear this up would make the flag unresolvable.
            $stmt = $conn->prepare("UPDATE users SET status = 'pending', updated_at = NOW() WHERE user_id = ?");
            $stmt->bind_param('i', $user_id);
            $stmt->execute();
            $stmt->close();
        }

        peso_audit_verification(
            $conn, $flagged_by,
            $revoke ? 'CREDENTIAL_FLAG_REVOKE' : 'CREDENTIAL_FLAG_RAISE',
            'PESO Verification', $flag_id
        );

        $conn->commit();

        require_once '../shared/create_notification.php';
        $docLabel = $document_type ? $document_type : 'a submitted document';
        if ($revoke) {
            createNotification($conn, $user_id, 'account_rejected',
                'Verification withdrawn',
                'PESO has withdrawn your verified status after reviewing your ' . $docLabel . '. Reason: ' . $reason
                    . ' Please upload a corrected document — your account stays open so you can resolve this.',
                'account', $user_id);
        } else {
            createNotification($conn, $user_id, 'document_rejected',
                'A document needs your attention',
                'PESO flagged your ' . $docLabel . ' for review. Reason: ' . $reason
                    . ' Please upload a clear, current copy.',
                'document', $document_id > 0 ? $document_id : $user_id);
        }

        sendResponse(true, $revoke
            ? 'Account flagged and verification withdrawn. The account holder has been notified.'
            : 'Concern recorded. The account holder has been notified and the flag stays on file.',
            ['flag_id' => $flag_id, 'user_id' => $user_id, 'revoked' => $revoke]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log('ERROR in flag_credential.php: ' . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) $conn->close();
