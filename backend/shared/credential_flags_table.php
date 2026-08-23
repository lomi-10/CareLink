<?php
// shared/credential_flags_table.php
// Audit trail for "this account is verified, but a document looks wrong."
//
// WHY A SEPARATE TABLE: rejecting a document already writes a rejection_reason
// onto user_documents, but that row gets overwritten the moment the user
// re-uploads. A fraud concern has to outlive the document it was raised
// against — PESO needs to see that an account was flagged twice for the same
// thing even after both files were replaced. Raised in the Aug 2026 interview.

if (!function_exists('ensure_credential_flags_table')) {
    function ensure_credential_flags_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS credential_flags (
                flag_id       INT AUTO_INCREMENT PRIMARY KEY,
                user_id       INT NOT NULL,
                document_id   INT NULL,
                document_type VARCHAR(64) NULL,
                flagged_by    INT NOT NULL,
                reason        TEXT NOT NULL,
                revoked_verification TINYINT(1) NOT NULL DEFAULT 0,
                /* Kept for context: what the account's status was BEFORE the flag,
                   so a wrongly-revoked account can be put back exactly. */
                prior_verification VARCHAR(16) NULL,
                resolved_at   DATETIME NULL,
                resolved_by   INT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_user (user_id),
                KEY idx_doc (document_id),
                KEY idx_open (user_id, resolved_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}

if (!function_exists('carelink_open_credential_flags')) {
    /** Unresolved flags for an account, newest first. Safe to call before the
     *  table exists — it creates it. */
    function carelink_open_credential_flags(mysqli $conn, int $userId): array
    {
        ensure_credential_flags_table($conn);
        $out = [];
        $stmt = $conn->prepare(
            "SELECT f.flag_id, f.document_id, f.document_type, f.reason,
                    f.revoked_verification, f.created_at,
                    CONCAT(u.first_name, ' ', u.last_name) AS flagged_by_name
             FROM credential_flags f
             LEFT JOIN users u ON f.flagged_by = u.user_id
             WHERE f.user_id = ? AND f.resolved_at IS NULL
             ORDER BY f.created_at DESC"
        );
        if (!$stmt) return $out;
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $row['flag_id'] = (int) $row['flag_id'];
            $row['document_id'] = $row['document_id'] !== null ? (int) $row['document_id'] : null;
            $row['revoked_verification'] = (int) $row['revoked_verification'] === 1;
            $out[] = $row;
        }
        $stmt->close();
        return $out;
    }
}
