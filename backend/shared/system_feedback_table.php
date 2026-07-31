<?php
// carelink_api/shared/system_feedback_table.php
// Feedback about CareLink ITSELF (auto-created, no migration).
//
// Deliberately separate from placement_reviews: that table is a helper and an
// employer rating EACH OTHER at the end of a placement, and it feeds the
// matching algorithm. This one rates the SYSTEM, and feeds the capstone's
// Chapter 4 evaluation. Conflating them would pollute both.
//
// See docs/chapter4-evaluation-instrument.md — the full ISO 25010 instrument is
// administered on paper to every tester; these in-app answers are the short,
// supplementary version captured while the experience is still fresh.

if (!function_exists('ensure_system_feedback_table')) {
    function ensure_system_feedback_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS system_feedback (
                feedback_id     INT AUTO_INCREMENT PRIMARY KEY,
                user_id         INT NULL COMMENT 'NULL if the account was later deleted',
                user_type       ENUM('helper','parent','peso') NOT NULL,
                overall_rating  TINYINT NOT NULL COMMENT '1-5 stars',
                ease_of_use     TINYINT NULL COMMENT '1-5 Likert',
                trust           TINYINT NULL COMMENT '1-5 Likert',
                would_use       TINYINT NULL COMMENT '1-5 Likert',
                liked_most      TEXT NULL,
                confusing_part  TEXT NULL,
                context         VARCHAR(32) NOT NULL DEFAULT 'general'
                                COMMENT 'where it was given, e.g. demo_end',
                created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user (user_id),
                INDEX idx_type (user_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}
?>
