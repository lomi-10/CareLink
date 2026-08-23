<?php
// shared/contract_signatures_table.php
// Evidence that a contract was actually signed by a specific person, on a
// specific document, at a specific moment.
//
// WHY THIS EXISTS: signing used to be one timestamp — employer_signed_at and
// helper_signed_at. A timestamp records that a row was updated; it proves
// nothing about WHO signed, WHAT they signed, or whether the document has
// changed since. PESO raised e-signature security directly in the Aug 2026
// review, and this project already claims RA 8792 (E-Commerce Act) compliance.
//
// RA 8792 and its IRR treat an electronic signature as reliable when it is:
//   (a) uniquely linked to the signatory,
//   (b) capable of identifying the signatory,
//   (c) created under the signatory's sole control, and
//   (d) linked to the data so that any subsequent change is detectable.
//
// This table is how (a), (b) and (d) are satisfied, and password re-entry at
// the moment of signing (v1/auth/verify_password.php) is how (c) is:
//
//   document_hash  — SHA-256 of the exact contract HTML as rendered at signing.
//                    Re-hash the document later and compare: if it differs, the
//                    contract was altered after signature. That is (d).
//   signature_seal — HMAC-SHA256 over signer id + role + document hash +
//                    timestamp, keyed with the server secret. A row edited
//                    directly in the database no longer verifies, so the
//                    evidence is tamper-EVIDENT rather than merely stored.
//   auth_method    — how identity was established for THIS signature.
//   ip_address / user_agent / consent_text — the surrounding circumstances a
//                    dispute actually turns on.
//
// NOT a digital signature in the PKI sense. There is no certificate authority
// and no private key held by the signer, so this cannot claim the presumption
// that a digitally signed document carries. It is a reliable electronic
// signature with an audit trail — state it that way and never as "PKI".

require_once __DIR__ . '/file_security.php';

if (!function_exists('ensure_contract_signatures_table')) {
    function ensure_contract_signatures_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS contract_signatures (
                signature_id   INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT NOT NULL,
                signer_id      INT NOT NULL,
                /* 'employer' | 'helper' */
                signer_role    VARCHAR(16) NOT NULL,
                /* SHA-256 of the contract document as it stood at signing. */
                document_hash  CHAR(64) NOT NULL,
                /* HMAC over the whole record; recomputed to detect tampering. */
                signature_seal CHAR(64) NOT NULL,
                /* How the signer proved they were themselves. */
                auth_method    VARCHAR(32) NOT NULL DEFAULT 'password',
                consent_text   TEXT NULL,
                ip_address     VARCHAR(45) NULL,
                user_agent     VARCHAR(255) NULL,
                signed_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_signer (application_id, signer_role),
                KEY idx_app (application_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}

if (!function_exists('carelink_signature_seal')) {
    /** The tamper-evident seal over one signature record. */
    function carelink_signature_seal(int $applicationId, int $signerId, string $role, string $docHash, string $signedAt): string
    {
        // Reuses the document-signing secret rather than introducing a second
        // key to lose. Same property: without it the seal cannot be forged.
        return hash_hmac('sha256', $applicationId . '|' . $signerId . '|' . $role . '|' . $docHash . '|' . $signedAt, carelink_doc_signing_secret());
    }
}

if (!function_exists('carelink_record_contract_signature')) {
    /**
     * Writes the evidence for one signature.
     *
     * @param string $documentHtml the contract exactly as the signer saw it.
     * @return array{ok:bool, signature_id?:int, document_hash?:string, message?:string}
     */
    function carelink_record_contract_signature(
        mysqli $conn, int $applicationId, int $signerId, string $role,
        string $documentHtml, string $authMethod = 'password', ?string $consentText = null
    ): array {
        if (!in_array($role, ['employer', 'helper'], true)) {
            return ['ok' => false, 'message' => 'Unknown signer role.'];
        }
        ensure_contract_signatures_table($conn);

        $docHash  = hash('sha256', $documentHtml);
        $signedAt = date('Y-m-d H:i:s');
        $seal     = carelink_signature_seal($applicationId, $signerId, $role, $docHash, $signedAt);

        $ip = substr((string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
        $ua = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
        $consent = $consentText ?? 'I have read this employment contract and agree to be bound by its terms.';

        // Re-signing the same role replaces the record rather than stacking, so
        // one role can never show two conflicting signatures.
        $st = $conn->prepare(
            'INSERT INTO contract_signatures
                (application_id, signer_id, signer_role, document_hash, signature_seal, auth_method, consent_text, ip_address, user_agent, signed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                signer_id = VALUES(signer_id), document_hash = VALUES(document_hash),
                signature_seal = VALUES(signature_seal), auth_method = VALUES(auth_method),
                consent_text = VALUES(consent_text), ip_address = VALUES(ip_address),
                user_agent = VALUES(user_agent), signed_at = VALUES(signed_at)'
        );
        if (!$st) return ['ok' => false, 'message' => 'Could not prepare the signature record.'];
        $st->bind_param('iissssssss', $applicationId, $signerId, $role, $docHash, $seal, $authMethod, $consent, $ip, $ua, $signedAt);
        $ok = $st->execute();
        $id = (int) $st->insert_id;
        $st->close();

        return $ok
            ? ['ok' => true, 'signature_id' => $id, 'document_hash' => $docHash]
            : ['ok' => false, 'message' => 'Could not write the signature record.'];
    }
}

if (!function_exists('carelink_verify_contract_signatures')) {
    /**
     * Checks every signature on a contract, for PESO and for a dispute.
     *
     * Two independent questions per signature:
     *   seal_valid     — has the evidence row itself been tampered with?
     *   document_match — does the contract today still hash to what was signed?
     *
     * A false on the second is the interesting one: it means the agreement was
     * altered after somebody signed it, which is exactly what an audit trail
     * exists to surface.
     */
    function carelink_verify_contract_signatures(mysqli $conn, int $applicationId, ?string $currentDocumentHtml = null): array
    {
        ensure_contract_signatures_table($conn);
        $currentHash = $currentDocumentHtml !== null ? hash('sha256', $currentDocumentHtml) : null;

        $st = $conn->prepare(
            "SELECT s.signature_id, s.signer_id, s.signer_role, s.document_hash, s.signature_seal,
                    s.auth_method, s.consent_text, s.ip_address, s.signed_at,
                    TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS signer_name
             FROM contract_signatures s
             LEFT JOIN users u ON u.user_id = s.signer_id
             WHERE s.application_id = ?
             ORDER BY s.signed_at ASC"
        );
        if (!$st) return [];
        $st->bind_param('i', $applicationId);
        $st->execute();
        $res = $st->get_result();

        $out = [];
        while ($r = $res->fetch_assoc()) {
            $expected = carelink_signature_seal(
                $applicationId, (int) $r['signer_id'], $r['signer_role'], $r['document_hash'], $r['signed_at']
            );
            $out[] = [
                'signature_id'   => (int) $r['signature_id'],
                'signer_id'      => (int) $r['signer_id'],
                'signer_name'    => trim((string) $r['signer_name']),
                'signer_role'    => $r['signer_role'],
                'signed_at'      => $r['signed_at'],
                'auth_method'    => $r['auth_method'],
                'consent_text'   => $r['consent_text'],
                'ip_address'     => $r['ip_address'],
                // hash_equals, not ==, for the same timing reason as everywhere else.
                'seal_valid'     => hash_equals($expected, (string) $r['signature_seal']),
                'document_hash'  => $r['document_hash'],
                'document_match' => $currentHash === null ? null : hash_equals($currentHash, (string) $r['document_hash']),
            ];
        }
        $st->close();
        return $out;
    }
}
