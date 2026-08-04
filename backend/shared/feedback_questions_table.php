<?php
/**
 * shared/feedback_questions_table.php — the in-app CareLink Plus/UAT feedback
 * instrument (auto-created, no migration).
 *
 * Deliberately separate from `system_feedback` (the short end-of-demo modal):
 * this is the persistent "Send Feedback" screen reachable from the menu,
 * answered once per question rather than once per submission — so if new
 * questions are added later, a returning user sees only the new ones instead
 * of being asked everything again. `system_feedback` is untouched by this.
 *
 * feedback_questions — the instrument itself, versioned by `code` so re-runs
 *   of the seed are idempotent and existing answers stay linked correctly
 *   even if question text is later edited.
 * feedback_answers   — one row per (user_id, question_id), which is what
 *   makes "answer only the ones you haven't answered yet" possible.
 */

if (!function_exists('ensure_feedback_questions_table')) {
    function ensure_feedback_questions_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS feedback_questions (
                question_id     INT AUTO_INCREMENT PRIMARY KEY,
                code            VARCHAR(64) NOT NULL UNIQUE,
                question_text   VARCHAR(500) NOT NULL,
                question_type   ENUM('rating','text') NOT NULL DEFAULT 'rating',
                applies_to      ENUM('all','helper','parent') NOT NULL DEFAULT 'all',
                sort_order      INT NOT NULL DEFAULT 0,
                active          TINYINT(1) NOT NULL DEFAULT 1,
                created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );

        $conn->query(
            "CREATE TABLE IF NOT EXISTS feedback_answers (
                answer_id       INT AUTO_INCREMENT PRIMARY KEY,
                user_id         INT NOT NULL,
                user_type       ENUM('helper','parent','peso') NOT NULL,
                question_id     INT NOT NULL,
                rating_value    TINYINT NULL COMMENT '1-5',
                text_value      TEXT NULL,
                created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_user_question (user_id, question_id),
                INDEX idx_user (user_id),
                INDEX idx_question (question_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );

        carelink_seed_feedback_questions($conn);
    }
}

if (!function_exists('carelink_seed_feedback_questions')) {
    /**
     * 15 rating questions covering usability, trust, reliability, support and
     * intent-to-use, plus 2 open-text — a real instrument, not a placeholder.
     * INSERT IGNORE on the unique `code`, so re-running this (every request)
     * is a no-op once seeded, and adding a NEW question later is just adding
     * one more row here — every existing user then sees just that one as
     * unanswered, without re-asking anything they already answered.
     */
    function carelink_seed_feedback_questions(mysqli $conn): void
    {
        static $done = false;
        if ($done) return;
        $done = true;

        $rows = [
            ['overall_rating',        'Overall, how would you rate your experience using CareLink?', 'rating', 'all', 1],
            ['ease_of_use',           'The app was easy to use and navigate.', 'rating', 'all', 2],
            ['ease_of_signup',        'Signing up and setting up my profile was straightforward.', 'rating', 'all', 3],
            ['trust_documents',       'I felt my personal information and documents were safe.', 'rating', 'all', 4],
            ['peso_confidence',       "PESO's verification made me feel more confident using the app.", 'rating', 'all', 5],
            ['match_relevance',       'The matches I saw felt relevant to me.', 'rating', 'all', 6],
            ['messaging_reliable',    'Messaging within the app was reliable and easy to use.', 'rating', 'all', 7],
            ['contract_clarity',      'The contract and signing process was clear to me.', 'rating', 'all', 8],
            ['work_mode_helpful',     'Work Mode (tasks, attendance, leave) was helpful for day-to-day work.', 'rating', 'all', 9],
            ['reliability',           'The app worked without crashing or freezing during my use.', 'rating', 'all', 10],
            ['speed',                 'The app responded quickly to my actions.', 'rating', 'all', 11],
            ['support_findable',      'If I had a problem, I knew how to get help (CareBot, PESO, or support).', 'rating', 'all', 12],
            ['fees_fair',             'Any fees involved felt reasonable and were clearly explained.', 'rating', 'parent', 13],
            ['recommend',             'I would recommend CareLink to others.', 'rating', 'all', 14],
            ['continue_using',        'I would continue using CareLink for real hiring or job searching.', 'rating', 'all', 15],
            ['liked_most',            'What did you like most about CareLink?', 'text', 'all', 16],
            ['confusing_part',        'What was confusing, frustrating, or hard to use?', 'text', 'all', 17],
        ];

        $stmt = $conn->prepare(
            "INSERT IGNORE INTO feedback_questions
                (code, question_text, question_type, applies_to, sort_order)
             VALUES (?, ?, ?, ?, ?)"
        );
        if (!$stmt) return;
        foreach ($rows as $r) {
            $stmt->bind_param('ssssi', $r[0], $r[1], $r[2], $r[3], $r[4]);
            $stmt->execute();
        }
        $stmt->close();
    }
}
