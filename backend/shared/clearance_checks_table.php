<?php
/**
 * shared/clearance_checks_table.php — record of an officer checking a clearance
 * against the issuing agency's own public portal.
 *
 * WHAT THIS IS, AND CAREFULLY WHAT IT IS NOT
 *
 * NBI and Police clearances are issued by the NBI and the PNP. CareLink has no
 * API to either, does not scrape them, and cannot authenticate their records.
 * What an officer CAN do is open the agency's public verification page, type
 * the reference number printed on the document, and read the result with their
 * own eyes.
 *
 * This table stores what the officer reports having seen. It is a record of a
 * human check, attributed and timestamped — NOT a machine verification, and
 * NOT a PESO seal. frontend/constants/credentials.ts keeps these two documents
 * pesoVerifiable: false for exactly that reason, and this changes nothing about
 * the badge an employer sees.
 *
 * WHY A SEPARATE TABLE RATHER THAN COLUMNS ON user_documents
 *
 *   - A check can be repeated: a clearance that could not be verified today may
 *     be verifiable next week when the portal is back up. Columns would
 *     overwrite; rows keep the sequence.
 *   - Who checked and when is the whole point. An audit trail that can be
 *     silently replaced is not an audit trail.
 *   - user_documents is written by the helper upload flow. Leaving it untouched
 *     keeps this addition strictly on the PESO side.
 */

if (!function_exists('ensure_clearance_checks_table')) {
    function ensure_clearance_checks_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS clearance_checks (
                check_id     INT AUTO_INCREMENT PRIMARY KEY,
                document_id  INT NOT NULL,
                /* Denormalised from user_documents so a per-account history can be
                   read without joining, and so the row survives for audit even if
                   the document row is later replaced. */
                user_id      INT NOT NULL,
                /* What the officer actually typed into the agency's portal. Kept
                   verbatim: if the scan misread it and the officer corrected it by
                   hand, the corrected value is the one that was checked. */
                reference_number VARCHAR(120) NULL,
                /* Where the reference came from, because 'the AI read it' and 'the
                   officer typed it' are different levels of confidence. */
                reference_source ENUM('extracted','manual') NOT NULL DEFAULT 'manual',
                outcome      ENUM('verified_valid','no_record','could_not_verify') NOT NULL,
                note         VARCHAR(500) NULL,
                checked_by   INT NOT NULL,
                checked_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_doc (document_id, checked_at),
                KEY idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}

if (!function_exists('carelink_latest_clearance_checks')) {
    /**
     * The most recent check for each of the given document ids.
     *
     * @param int[] $documentIds
     * @return array<int,array<string,mixed>> keyed by document_id
     */
    function carelink_latest_clearance_checks(mysqli $conn, array $documentIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $documentIds))));
        if (!$ids) {
            return [];
        }
        ensure_clearance_checks_table($conn);

        // Ids are cast to int above, so this interpolation cannot carry a string.
        $in = implode(',', $ids);

        // Latest per document: join the table to its own max(check_id) per doc.
        // MAX(check_id) rather than MAX(checked_at) — two checks in the same
        // second would tie on the timestamp and return both.
        $sql = "SELECT c.document_id, c.reference_number, c.reference_source, c.outcome,
                       c.note, c.checked_by, c.checked_at,
                       TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS checked_by_name
                  FROM clearance_checks c
                  JOIN (SELECT document_id, MAX(check_id) AS latest
                          FROM clearance_checks
                         WHERE document_id IN ($in)
                      GROUP BY document_id) m
                    ON m.latest = c.check_id
             LEFT JOIN users u ON u.user_id = c.checked_by";

        $out = [];
        try {
            $res = $conn->query($sql);
            while ($res && ($row = $res->fetch_assoc())) {
                $docId = (int) $row['document_id'];
                $out[$docId] = [
                    'reference_number' => $row['reference_number'],
                    'reference_source' => $row['reference_source'],
                    'outcome'          => $row['outcome'],
                    'note'             => $row['note'],
                    'checked_by'       => (int) $row['checked_by'],
                    'checked_by_name'  => $row['checked_by_name'] !== '' ? $row['checked_by_name'] : null,
                    'checked_at'       => $row['checked_at'],
                ];
            }
        } catch (Throwable $e) {
            // A missing history must never take the review screen down with it.
            error_log('carelink_latest_clearance_checks: ' . $e->getMessage());
        }
        return $out;
    }
}

if (!function_exists('carelink_clearance_outcome_label')) {
    /** The three outcomes, worded the same way in the API as in the UI. */
    function carelink_clearance_outcome_label(string $outcome): string
    {
        switch ($outcome) {
            case 'verified_valid':    return 'Verified valid';
            case 'no_record':         return 'No matching record';
            case 'could_not_verify':  return 'Could not verify';
            default:                  return $outcome;
        }
    }
}
