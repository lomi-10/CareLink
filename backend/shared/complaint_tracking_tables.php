<?php
// shared/complaint_tracking_tables.php
// The case-file layer for complaints: incident facts, an action trail, and
// safety labels.
//
// FROM THE PESO INTERVIEW (Aug 2026):
//
//  • A complaint was only "subject + description". An officer could not see WHEN
//    or WHERE the incident happened, so every case started with a phone call to
//    ask. Those are now first-class fields.
//
//  • Resolve/Dismiss was the whole vocabulary. Real handling is a sequence —
//    received, reviewed, referred, action planned, action done — and both PESO
//    AND the two people involved need to see where the case stands. Hence
//    complaint_actions, which is a tracker, not a status column.
//
//  • The real-world escalation is Barangay -> PESO -> DOLE. Barangay is out of
//    scope for this build, so it exists as a recordable referral step the
//    officer performs manually, not as an integration. escalation_stage keeps
//    the ladder explicit so adding it later does not mean reshaping the table.

if (!function_exists('ensure_complaint_tracking_tables')) {
    function ensure_complaint_tracking_tables(mysqli $conn): void
    {
        // Incident facts. Added by ALTER because `complaints` already exists in
        // every environment; each column is guarded so this is safe to re-run.
        $cols = [];
        $res = $conn->query("SHOW COLUMNS FROM complaints");
        if ($res) while ($r = $res->fetch_assoc()) $cols[$r['Field']] = true;

        $add = [
            'incident_at'          => "ADD COLUMN incident_at DATETIME NULL AFTER description",
            'incident_location'    => "ADD COLUMN incident_location VARCHAR(255) NULL AFTER incident_at",
            'incident_barangay'    => "ADD COLUMN incident_barangay VARCHAR(120) NULL AFTER incident_location",
            'incident_municipality'=> "ADD COLUMN incident_municipality VARCHAR(120) NULL AFTER incident_barangay",
            'incident_province'    => "ADD COLUMN incident_province VARCHAR(120) NULL AFTER incident_municipality",
            'escalation_stage'     => "ADD COLUMN escalation_stage VARCHAR(20) NOT NULL DEFAULT 'peso' AFTER status",
        ];
        foreach ($add as $col => $clause) {
            if (!isset($cols[$col])) $conn->query("ALTER TABLE complaints {$clause}");
        }

        // The tracker. One row per thing that happened to the case.
        $conn->query(
            "CREATE TABLE IF NOT EXISTS complaint_actions (
                action_id     INT AUTO_INCREMENT PRIMARY KEY,
                complaint_id  INT NOT NULL,
                actor_id      INT NULL,
                actor_role    VARCHAR(16) NOT NULL DEFAULT 'peso',
                /* received | under_review | referred_barangay | referred_dole |
                   action_planned | action_taken | resolved | dismissed */
                action_type   VARCHAR(32) NOT NULL,
                title         VARCHAR(180) NOT NULL,
                detail        TEXT NULL,
                /* Set for 'action_planned' — what PESO commits to doing next. */
                due_date      DATE NULL,
                /* Internal notes stay internal. The tracker the two parties see
                   is filtered on this flag, so an officer can keep a working
                   note without it being published to the people involved. */
                visible_to_parties TINYINT(1) NOT NULL DEFAULT 1,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_complaint (complaint_id),
                KEY idx_visible (complaint_id, visible_to_parties)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}

if (!function_exists('ensure_user_safety_flags_table')) {
    /**
     * Public safety labels.
     *
     * THIS IS THE MOST CONSEQUENTIAL TABLE IN THE PROJECT. A label here is shown
     * to strangers browsing the platform, and for a kasambahay it can end their
     * ability to find work. Four rules are built into how it is used, and the
     * endpoints enforce them:
     *
     *  1. A label may only be issued from a complaint PESO has actually
     *     RESOLVED with a confirmed finding. Never on an accusation, never
     *     while a case is open. An unproven allegation must not be publishable.
     *
     *  2. `public_reason` is a SHORT factual line written by the officer. The
     *     complaint description and the complainant's identity are never
     *     published — the reporter is often the more vulnerable party, and
     *     naming them invites retaliation.
     *
     *  3. Labels apply to EMPLOYERS exactly as they do to helpers. An employer
     *     with a confirmed abuse finding is precisely who a helper needs warned
     *     about, and a one-directional system would just be a blacklist for
     *     workers.
     *
     *  4. Every label is liftable, and lifting is recorded rather than deleted,
     *     so a wrongly-issued label leaves a trail instead of vanishing.
     */
    function ensure_user_safety_flags_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS user_safety_flags (
                safety_flag_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id        INT NOT NULL,
                complaint_id   INT NULL,
                /* caution = confirmed but limited; serious = confirmed and severe */
                level          VARCHAR(16) NOT NULL DEFAULT 'caution',
                /* Shown publicly. Short, factual, no names, no narrative. */
                public_reason  VARCHAR(200) NOT NULL,
                /* PESO-only context behind the decision. */
                internal_note  TEXT NULL,
                issued_by      INT NOT NULL,
                issued_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                lifted_at      DATETIME NULL,
                lifted_by      INT NULL,
                lift_reason    TEXT NULL,
                KEY idx_user_active (user_id, lifted_at),
                KEY idx_complaint (complaint_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}

if (!function_exists('carelink_active_safety_flag')) {
    /**
     * The active public label for one account, or null.
     *
     * SAFE FOR PUBLIC PAYLOADS: returns only the level, the short public reason
     * and the issue date. internal_note and complaint_id are deliberately not
     * selected, so this can never leak case detail into a browse response.
     */
    function carelink_active_safety_flag(mysqli $conn, int $userId): ?array
    {
        if ($userId <= 0) return null;
        ensure_user_safety_flags_table($conn);
        $st = $conn->prepare(
            "SELECT level, public_reason, issued_at
             FROM user_safety_flags
             WHERE user_id = ? AND lifted_at IS NULL
             ORDER BY FIELD(level,'serious','caution'), issued_at DESC
             LIMIT 1"
        );
        if (!$st) return null;
        $st->bind_param('i', $userId);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();
        return $row ?: null;
    }
}

if (!function_exists('carelink_complaint_timeline')) {
    /**
     * The case tracker.
     *
     * @param bool $partyView true when the viewer is the complainant or the
     *   respondent — internal-only entries are withheld. PESO passes false.
     */
    function carelink_complaint_timeline(mysqli $conn, int $complaintId, bool $partyView): array
    {
        ensure_complaint_tracking_tables($conn);
        $sql = "SELECT a.action_id, a.action_type, a.title, a.detail, a.due_date,
                       a.visible_to_parties, a.created_at, a.actor_role,
                       TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS actor_name
                FROM complaint_actions a
                LEFT JOIN users u ON u.user_id = a.actor_id
                WHERE a.complaint_id = ?"
            . ($partyView ? " AND a.visible_to_parties = 1" : "")
            . " ORDER BY a.created_at ASC, a.action_id ASC";
        $st = $conn->prepare($sql);
        if (!$st) return [];
        $st->bind_param('i', $complaintId);
        $st->execute();
        $res = $st->get_result();
        $out = [];
        while ($r = $res->fetch_assoc()) {
            $out[] = [
                'action_id'   => (int) $r['action_id'],
                'action_type' => $r['action_type'],
                'title'       => $r['title'],
                'detail'      => $r['detail'],
                'due_date'    => $r['due_date'],
                'created_at'  => $r['created_at'],
                'actor_role'  => $r['actor_role'],
                // Parties see "PESO", not which officer — an individual name
                // invites people to go around the office and approach them.
                'actor_name'  => $partyView ? 'PESO Ormoc' : trim((string) $r['actor_name']),
                'internal'    => !((int) $r['visible_to_parties'] === 1),
            ];
        }
        $st->close();
        return $out;
    }
}

if (!function_exists('carelink_log_complaint_action')) {
    /** Appends one entry to the tracker. */
    function carelink_log_complaint_action(
        mysqli $conn, int $complaintId, ?int $actorId, string $actorRole,
        string $type, string $title, ?string $detail = null,
        ?string $dueDate = null, bool $visible = true
    ): int {
        ensure_complaint_tracking_tables($conn);
        $st = $conn->prepare(
            'INSERT INTO complaint_actions
               (complaint_id, actor_id, actor_role, action_type, title, detail, due_date, visible_to_parties)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        if (!$st) return 0;
        $vis = $visible ? 1 : 0;
        $st->bind_param('iisssssi', $complaintId, $actorId, $actorRole, $type, $title, $detail, $dueDate, $vis);
        $st->execute();
        $id = (int) $st->insert_id;
        $st->close();
        return $id;
    }
}

if (!function_exists('carelink_public_credentials')) {
    /**
     * The credential seals an account has earned, for BROWSE payloads.
     *
     * SAFE TO SHOW A STRANGER. Returns only the document TYPE and that PESO
     * verified it — never a file, never a URL, never an extracted field. That
     * distinction is the whole reason this is a separate function from
     * carelink_account_credentials(): a Valid ID and a Barangay Clearance are
     * never shown to an employer because they carry the helper's home address,
     * but the FACT that PESO checked them is exactly the trust signal a stranger
     * needs before hiring or accepting work.
     *
     * Only PESO-verifiable types are returned. NBI and Police Clearance are
     * excluded entirely — PESO cannot authenticate those records, so publishing
     * them as credentials would imply an assurance nobody has given.
     */
    function carelink_public_credentials(mysqli $conn, int $userId): array
    {
        if ($userId <= 0) return [];
        $out = [];
        $st = $conn->prepare(
            "SELECT document_type, status
             FROM user_documents
             WHERE user_id = ?
               AND status = 'Verified'
               AND document_type IN ('Valid ID', 'Barangay Clearance', 'TESDA NC2')
             ORDER BY FIELD(document_type, 'Valid ID', 'Barangay Clearance', 'TESDA NC2')"
        );
        if (!$st) return $out;
        $st->bind_param('i', $userId);
        $st->execute();
        $res = $st->get_result();
        while ($r = $res->fetch_assoc()) $out[] = $r;
        $st->close();
        return $out;
    }
}
