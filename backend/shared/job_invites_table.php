<?php
// carelink_api/shared/job_invites_table.php
// Auto-creates the job_invites table (no migration needed) and exposes a helper
// to ensure it exists. A job invite is a special chat message (message_type
// 'job_invite') the employer sends a helper; this table tracks whether the helper
// has accepted or declined it, so the chat can show Accept/Decline and, once
// accepted, make the invite tappable straight to the job to apply.

if (!function_exists('ensure_job_invites_table')) {
    function ensure_job_invites_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS job_invites (
                invite_id    INT AUTO_INCREMENT PRIMARY KEY,
                message_id   INT NOT NULL,
                job_post_id  INT NOT NULL,
                parent_id    INT NOT NULL,
                helper_id    INT NOT NULL,
                status       VARCHAR(12) NOT NULL DEFAULT 'pending',
                responded_at DATETIME NULL,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_invite (parent_id, helper_id, job_post_id),
                KEY idx_msg (message_id),
                KEY idx_helper (helper_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}
?>
