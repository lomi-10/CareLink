<?php
// shared/interview_feedback_table.php
// How the interview actually went, answered by the two people who were there.
//
// CHANGED Aug 2026 on PESO's instruction. The PESO panel used to carry a free-text
// box where the officer wrote their own assessment of an interview they did not
// attend. That was backwards: the officer was recording a second-hand impression
// as the record. Now both the helper and the employer are prompted to rate and
// comment after the interview, and PESO READS what they said.
//
// PRIVACY: this feedback is between each party and PESO. Neither party sees what
// the other wrote about them — an interview review that the other side can read
// is not a candid one, and for a kasambahay it invites retaliation.

if (!function_exists('ensure_interview_feedback_table')) {
    function ensure_interview_feedback_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS interview_feedback (
                feedback_id   INT AUTO_INCREMENT PRIMARY KEY,
                interview_id  INT NOT NULL,
                user_id       INT NOT NULL,
                /* 'helper' | 'employer' — who is speaking */
                role          VARCHAR(16) NOT NULL,
                /* 1-5. The number PESO tallies. */
                rating        TINYINT NOT NULL,
                /* Their words. PESO and super admin only. */
                comment       TEXT NULL,
                /* Did the other side turn up? Answers the no-show question
                   without PESO having to phone anyone. */
                other_attended TINYINT(1) NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_party (interview_id, user_id),
                KEY idx_interview (interview_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );

        // Marks that the "how did it go?" prompt has already gone out, so the
        // lazy trigger cannot notify the same pair twice.
        $cols = [];
        $res = $conn->query("SHOW COLUMNS FROM interview_schedules");
        if ($res) while ($r = $res->fetch_assoc()) $cols[$r['Field']] = true;
        if (!isset($cols['feedback_requested_at'])) {
            $conn->query("ALTER TABLE interview_schedules ADD COLUMN feedback_requested_at DATETIME NULL AFTER result");
        }
    }
}

if (!function_exists('carelink_interview_feedback')) {
    /** Both parties' feedback for one interview. STAFF ONLY — contains comments. */
    function carelink_interview_feedback(mysqli $conn, int $interviewId): array
    {
        ensure_interview_feedback_table($conn);
        $out = [];
        $st = $conn->prepare(
            "SELECT f.feedback_id, f.user_id, f.role, f.rating, f.comment, f.other_attended, f.created_at,
                    TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS name
             FROM interview_feedback f
             LEFT JOIN users u ON u.user_id = f.user_id
             WHERE f.interview_id = ? ORDER BY f.created_at ASC"
        );
        if (!$st) return $out;
        $st->bind_param('i', $interviewId);
        $st->execute();
        $res = $st->get_result();
        while ($r = $res->fetch_assoc()) {
            $r['feedback_id'] = (int) $r['feedback_id'];
            $r['rating'] = (int) $r['rating'];
            $r['other_attended'] = $r['other_attended'] === null ? null : ((int) $r['other_attended'] === 1);
            $out[] = $r;
        }
        $st->close();
        return $out;
    }
}

if (!function_exists('carelink_request_interview_feedback')) {
    /**
     * Prompts BOTH parties to rate the interview, once.
     *
     * Fired lazily — whenever an interview is loaded and its date has passed —
     * rather than by a cron, because this project has no scheduler. The
     * feedback_requested_at guard is what keeps "lazy" from meaning "repeatedly".
     *
     * @return bool true if the prompt was sent on this call.
     */
    function carelink_request_interview_feedback(mysqli $conn, int $interviewId): bool
    {
        ensure_interview_feedback_table($conn);

        $st = $conn->prepare(
            "SELECT isch.feedback_requested_at, isch.interview_date, isch.status,
                    ja.helper_id, jp.parent_id, jp.title AS job_title, ja.application_id
             FROM interview_schedules isch
             INNER JOIN job_applications ja ON ja.application_id = isch.application_id
             INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
             WHERE isch.interview_id = ? LIMIT 1"
        );
        if (!$st) return false;
        $st->bind_param('i', $interviewId);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();
        if (!$row) return false;

        if (!empty($row['feedback_requested_at'])) return false;      // already asked
        if (($row['status'] ?? '') === 'Cancelled') return false;      // nothing happened
        $when = strtotime((string) $row['interview_date']);
        if (!$when || $when > time()) return false;                    // not yet held

        $up = $conn->prepare("UPDATE interview_schedules SET feedback_requested_at = NOW() WHERE interview_id = ? AND feedback_requested_at IS NULL");
        $up->bind_param('i', $interviewId);
        $up->execute();
        $claimed = $up->affected_rows > 0;
        $up->close();
        // Two viewers can load the same interview at once; only the row that
        // actually claimed the update sends the notifications.
        if (!$claimed) return false;

        require_once __DIR__ . '/create_notification.php';
        $title = 'How did your interview go?';
        $body  = 'Please rate your interview for "' . $row['job_title']
               . '" and tell PESO how it went. Your comments go to PESO only — the other party never sees them.';
        foreach ([(int) $row['helper_id'], (int) $row['parent_id']] as $uid) {
            if ($uid > 0) {
                createNotification($conn, $uid, 'interview_feedback_request', $title, $body, 'interview', $interviewId);
            }
        }
        return true;
    }
}
