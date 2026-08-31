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
                /* ISO/IEC 25010 quality characteristic this item measures.
                   Chapter 4 reports a weighted mean PER characteristic, so the
                   grouping has to live with the question, not be re-derived by
                   hand in a spreadsheet afterwards. */
                iso_characteristic VARCHAR(48) NOT NULL DEFAULT 'Usability',
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

        // Added after the table already existed in some environments.
        $cols = [];
        $res = $conn->query("SHOW COLUMNS FROM feedback_questions");
        if ($res) while ($r = $res->fetch_assoc()) $cols[$r["Field"]] = true;
        // applies_to was enum(all,helper,parent). PESO staff answer their own
        // four items (Part III of the instrument), so the enum has to carry
        // 'peso' or those rows silently fail to insert.
        $conn->query("ALTER TABLE feedback_questions MODIFY applies_to ENUM('all','helper','parent','peso') NOT NULL DEFAULT 'all'");

        if (!isset($cols["iso_characteristic"])) {
            $conn->query("ALTER TABLE feedback_questions ADD COLUMN iso_characteristic VARCHAR(48) NOT NULL DEFAULT 'Usability' AFTER sort_order");
        }

        carelink_seed_feedback_questions($conn);
    }
}

if (!function_exists('carelink_seed_feedback_questions')) {
    /**
     * The Chapter 4 instrument, mapped to ISO/IEC 25010.
     *
     * Rewritten Aug 2026. The previous 17 items were reasonable product
     * questions but were not grouped by any quality model, so Chapter 4 could
     * only report one overall mean — a panel asking "which characteristic scored
     * lowest?" had no answer. Each item now carries the ISO/IEC 25010
     * characteristic it measures, so the analysis reports a weighted mean per
     * characteristic and an overall mean, which is what the rubric expects.
     *
     * Mirrors docs/chapter4-evaluation-instrument.md. Keep the two in step: the
     * doc is what the panel reads, this is what the app actually asks.
     *
     * Codes are stable and INSERT IGNORE keeps re-seeding a no-op, so answers
     * already collected stay attached even when wording is edited.
     *
     * Scale: 5 Strongly Agree - 4 Agree - 3 Neutral - 2 Disagree - 1 Strongly Disagree.
     */
    function carelink_seed_feedback_questions(mysqli $conn): void
    {
        static $done = false;
        if ($done) return;
        $done = true;

        $FS = 'Functional Suitability';
        $US = 'Usability';
        $RE = 'Reliability';
        $PE = 'Performance Efficiency';
        $SE = 'Security';
        $PU = 'Perceived Usefulness';

        $rows = [
            // A. Functional Suitability
            ['fs_tasks_expected',  'The system performed all the tasks I expected it to.', 'rating', 'all', 1, $FS],
            ['fs_completed_goal',  'I was able to complete what I set out to do (set up my profile / post a job / apply).', 'rating', 'all', 2, $FS],
            ['fs_info_accurate',   'The information shown (job details, helper profiles, match scores) was accurate.', 'rating', 'all', 3, $FS],
            ['fs_appropriate',     'The features are appropriate for finding or hiring household help.', 'rating', 'all', 4, $FS],

            // B. Usability — the heaviest section, given the target users
            ['us_easy_learn',      'The system was easy to learn, even without someone teaching me.', 'rating', 'all', 5, $US],
            ['us_screens_clear',   'The screens and buttons were easy to understand.', 'rating', 'all', 6, $US],
            ['us_words_clear',     'The words used were clear and easy to understand (not too technical).', 'rating', 'all', 7, $US],
            ['us_next_step',       'I could tell what to do next at each step.', 'rating', 'all', 8, $US],
            ['us_fix_mistake',     'It was easy to correct a mistake when I made one.', 'rating', 'all', 9, $US],
            ['us_text_readable',   'The text was large enough and easy to read.', 'rating', 'all', 10, $US],
            ['us_guide_helpful',   'The guide ("How CareLink works") helped me understand the system.', 'rating', 'all', 11, $US],

            // C. Reliability
            ['re_no_crash',        'The system worked without crashing or freezing.', 'rating', 'all', 12, $RE],
            ['re_consistent',      'The system responded consistently each time I used the same feature.', 'rating', 'all', 13, $RE],
            ['re_errors_clear',    'When something went wrong, the system explained it clearly.', 'rating', 'all', 14, $RE],

            // D. Performance Efficiency
            ['pe_screens_fast',    'Screens loaded quickly enough.', 'rating', 'all', 15, $PE],
            ['pe_search_fast',     'Searching and browsing did not take too long.', 'rating', 'all', 16, $PE],
            ['pe_upload_fast',     'Uploading documents and photos completed in reasonable time.', 'rating', 'all', 17, $PE],

            // E. Security — critical for this domain
            ['se_info_safe',       'I felt my personal information was kept safe.', 'rating', 'all', 18, $SE],
            ['se_docs_peso_only',  'I am comfortable that only PESO can see my ID and Barangay Clearance.', 'rating', 'all', 19, $SE],
            ['se_peso_trust',      'The PESO verification makes me trust the other people on the platform.', 'rating', 'all', 20, $SE],
            ['se_in_app_comms',    'I felt safe communicating through the app instead of sharing my number.', 'rating', 'all', 21, $SE],

            // F. Perceived Usefulness (TAM) — panels usually expect this
            ['pu_easier',          'CareLink would make it easier for me to find work / find a helper.', 'rating', 'all', 22, $PU],
            ['pu_safer',           'CareLink is safer than how I would normally find work / hire someone.', 'rating', 'all', 23, $PU],
            ['pu_would_use',       'I would use CareLink if it were available today.', 'rating', 'all', 24, $PU],
            ['pu_recommend',       'I would recommend CareLink to a friend or relative.', 'rating', 'all', 25, $PU],

            // Role-specific — asked only of the matching respondent.
            ['hl_profile_setup',   'Setting up my profile was straightforward.', 'rating', 'helper', 26, $US],
            ['hl_docs_understood', 'I understood what documents I needed and why.', 'rating', 'helper', 27, $US],
            ['hl_matches_relevant','The job matches shown were relevant to my skills.', 'rating', 'helper', 28, $FS],
            ['hl_match_pct',       'I understood what the match percentage meant.', 'rating', 'helper', 29, $US],
            ['hl_cover_letter',    'The generated cover letter was a helpful starting point.', 'rating', 'helper', 30, $PU],

            ['em_post_job',        'Posting a job was straightforward.', 'rating', 'parent', 31, $US],
            ['em_applicants',      'The applicants shown were relevant to my job post.', 'rating', 'parent', 32, $FS],
            ['em_match_pct',       'I understood what the match percentage meant.', 'rating', 'parent', 33, $US],
            ['em_job_desc',        'The generated job description was a helpful starting point.', 'rating', 'parent', 34, $PU],
            ['em_contract_clear',  'I understood what the contract covers and that both parties must sign.', 'rating', 'parent', 35, $US],

            // PESO staff. The applies_to enum originally had no 'peso' value, so
            // these four could not be stored at all — the ALTER above widens it.
            ['ps_queue_easy',      'The verification queue is easy to review.', 'rating', 'peso', 36, $US],
            ['ps_enough_info',     'I had enough information to decide whether to approve a document.', 'rating', 'peso', 37, $FS],
            ['ps_ai_flags',        'The AI pre-check flags were helpful, not confusing.', 'rating', 'peso', 38, $US],
            ['ps_less_paperwork',  'The system would reduce our manual paperwork.', 'rating', 'peso', 39, $PU],

            // Open-ended — the quotes that make Chapter 4 readable.
            ['oe_liked_most',      'What did you like most about CareLink?', 'text', 'all', 40, $PU],
            ['oe_confusing',       'What was the most confusing or difficult part?', 'text', 'all', 41, $US],
            ['oe_missing',         "Was there anything you expected to find but couldn't?", 'text', 'all', 42, $FS],
            ['oe_would_change',    'What would you add or change before this is used for real?', 'text', 'all', 43, $PU],
            ['oe_errors',          '(If applicable) Describe any error or unexpected behaviour you encountered.', 'text', 'all', 44, $RE],
        ];

        $stmt = $conn->prepare(
            "INSERT INTO feedback_questions
                (code, question_text, question_type, applies_to, sort_order, iso_characteristic)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                question_text = VALUES(question_text),
                question_type = VALUES(question_type),
                applies_to    = VALUES(applies_to),
                sort_order    = VALUES(sort_order),
                iso_characteristic = VALUES(iso_characteristic)"
        );
        if (!$stmt) return;
        foreach ($rows as $r) {
            $stmt->bind_param('ssssis', $r[0], $r[1], $r[2], $r[3], $r[4], $r[5]);
            $stmt->execute();
        }
        $stmt->close();

        // Retire the pre-ISO items rather than deleting them: answers already
        // collected against them stay valid history, they simply stop being asked.
        $conn->query(
            "UPDATE feedback_questions SET active = 0
             WHERE code IN ('overall_rating','ease_of_use','ease_of_signup','trust_documents',
                            'peso_confidence','match_relevance','messaging_reliable','contract_clarity',
                            'work_mode_helpful','reliability','speed','support_findable','fees_fair',
                            'recommend','continue_using','liked_most','confusing_part')"
        );
    }
}
