<?php
// shared/interview_reviews_table.php
// PESO's private record of how an interview actually went.
//
// PESO-EYES-ONLY BY DESIGN. `private_notes` is the officer's own assessment —
// what was said, whether either side behaved badly, whether the placement looks
// unsafe. It exists so oversight has a memory across interviews, and it must
// NEVER be sent to the helper or the employer.
//
// That is why it lives here and not on interview_schedules.notes: that column
// is written by the employer when scheduling and IS shown to the helper. Two
// different audiences must not share a column, or one careless SELECT * leaks
// an officer's candid assessment to the person it is about.
//
// Every endpoint that reads this table must be behind peso_require_staff().

if (!function_exists('ensure_interview_reviews_table')) {
    function ensure_interview_reviews_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS interview_reviews (
                review_id      INT AUTO_INCREMENT PRIMARY KEY,
                interview_id   INT NOT NULL,
                reviewed_by    INT NOT NULL,
                /* Pass | Fail | No Show — mirrors interview_schedules.result */
                result         VARCHAR(16) NOT NULL,
                /* Which side failed to appear, when result = 'No Show'. */
                no_show_party  VARCHAR(16) NULL,
                /* PESO EYES ONLY. Never included in any notification or in any
                   payload served to a helper or employer endpoint. */
                private_notes  TEXT NULL,
                notified_at    DATETIME NULL,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY idx_interview (interview_id),
                KEY idx_reviewer (reviewed_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}

if (!function_exists('carelink_interview_reviews')) {
    /**
     * Review history for one interview, newest first.
     *
     * STAFF ONLY — the caller must already have passed peso_require_staff().
     */
    function carelink_interview_reviews(mysqli $conn, int $interviewId): array
    {
        ensure_interview_reviews_table($conn);
        $out = [];
        $stmt = $conn->prepare(
            "SELECT r.review_id, r.result, r.no_show_party, r.private_notes, r.notified_at, r.created_at,
                    TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))) AS reviewer_name
             FROM interview_reviews r
             LEFT JOIN users u ON u.user_id = r.reviewed_by
             WHERE r.interview_id = ?
             ORDER BY r.created_at DESC"
        );
        if (!$stmt) return $out;
        $stmt->bind_param('i', $interviewId);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $row['review_id'] = (int) $row['review_id'];
            $out[] = $row;
        }
        $stmt->close();
        return $out;
    }
}
