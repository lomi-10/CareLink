<?php
// shared/account_credentials.php
// One place that answers "what has PESO actually confirmed about this account?"
//
// Used by any staff screen that needs to judge an account without navigating to
// the User Verification screen — the Job Verification panel being the first,
// since a posting from an employer whose ID was altered should not go live.

require_once __DIR__ . '/file_security.php';
require_once __DIR__ . '/credential_flags_table.php';

if (!function_exists('carelink_account_credentials')) {
    /**
     * Documents (with signed, expiring URLs), the account's verification standing,
     * and any unresolved fraud flags.
     *
     * STAFF ONLY. Signed URLs are handed out here, so the caller must already
     * have established that the requester is PESO/admin.
     */
    function carelink_account_credentials(mysqli $conn, int $userId, string $userType): array
    {
        $out = [
            'documents'           => [],
            'verification_status' => null,
            'verified_at'         => null,
            'flags'               => [],
        ];
        if ($userId <= 0) return $out;

        $profileTable = $userType === 'helper' ? 'helper_profiles' : ($userType === 'parent' ? 'parent_profiles' : null);
        if ($profileTable) {
            $stmt = $conn->prepare("SELECT verification_status, verified_at FROM {$profileTable} WHERE user_id = ?");
            if ($stmt) {
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                if ($row = $stmt->get_result()->fetch_assoc()) {
                    $out['verification_status'] = $row['verification_status'];
                    $out['verified_at'] = $row['verified_at'] ? date('Y-m-d H:i:s', strtotime($row['verified_at'])) : null;
                }
                $stmt->close();
            }
        }

        $stmt = $conn->prepare(
            "SELECT document_id, document_type, file_path, file_path_back, id_type, status,
                    rejection_reason, uploaded_at, verified_at,
                    ai_verification_status, ai_confidence_score, ai_extracted_data
             FROM user_documents
             WHERE user_id = ?
             ORDER BY FIELD(document_type, 'Valid ID', 'Barangay Clearance', 'TESDA NC2', 'NBI Clearance', 'Police Clearance'), uploaded_at DESC"
        );
        if ($stmt) {
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $res = $stmt->get_result();
            while ($row = $res->fetch_assoc()) {
                $row['document_id'] = (int) $row['document_id'];
                // Never return file_path itself — a raw path invites building a
                // static URL from it, which is the bug the signed links replaced.
                $row['is_pdf'] = !empty($row['file_path'])
                    && strtolower(pathinfo(explode('?', $row['file_path'])[0], PATHINFO_EXTENSION)) === 'pdf';
                $row['file_url'] = !empty($row['file_path']) ? carelink_signed_document_url($row['document_id']) : null;
                $row['file_url_back'] = !empty($row['file_path_back']) ? carelink_signed_document_url($row['document_id'], 'back') : null;
                unset($row['file_path'], $row['file_path_back']);

                $row['uploaded_at'] = $row['uploaded_at'] ? date('Y-m-d H:i:s', strtotime($row['uploaded_at'])) : null;
                $row['verified_at'] = $row['verified_at'] ? date('Y-m-d H:i:s', strtotime($row['verified_at'])) : null;
                $row['ai_confidence_score'] = $row['ai_confidence_score'] !== null ? (float) $row['ai_confidence_score'] : null;
                $row['ai_legitimacy_score'] = null;
                $row['ai_warnings'] = [];
                // ai_fields is what the scan READ off the page. The full-screen
                // viewer shows it beside the document so an officer can compare
                // the two without closing anything — so it has to travel here,
                // not just in get_user_details.php.
                $row['ai_fields'] = [];
                if (!empty($row['ai_extracted_data'])) {
                    $decoded = json_decode($row['ai_extracted_data'], true);
                    if (is_array($decoded)) {
                        $row['ai_legitimacy_score'] = isset($decoded['legitimacy_score']) && $decoded['legitimacy_score'] !== null
                            ? (float) $decoded['legitimacy_score'] : null;
                        if (isset($decoded['warnings']) && is_array($decoded['warnings'])) $row['ai_warnings'] = $decoded['warnings'];
                        if (isset($decoded['fields']) && is_array($decoded['fields']))     $row['ai_fields']   = $decoded['fields'];
                    }
                }
                unset($row['ai_extracted_data']);
                $out['documents'][] = $row;
            }
            $stmt->close();
        }

        $out['flags'] = carelink_open_credential_flags($conn, $userId);
        return $out;
    }
}
