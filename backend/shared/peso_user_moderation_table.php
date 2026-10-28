<?php

function ensure_peso_user_moderation_table(mysqli $conn): void
{
    $sql = "CREATE TABLE IF NOT EXISTS peso_user_moderation (
        moderation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        staff_user_id INT NOT NULL,
        action VARCHAR(20) NOT NULL,
        reason TEXT NOT NULL,
        previous_user_status VARCHAR(20) NOT NULL,
        new_user_status VARCHAR(20) NOT NULL,
        previous_verification_status VARCHAR(20) NOT NULL,
        new_verification_status VARCHAR(20) NOT NULL,
        closed_job_posts INT UNSIGNED NOT NULL DEFAULT 0,
        withdrawn_applications INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (moderation_id),
        KEY idx_moderation_user (user_id, created_at),
        KEY idx_moderation_staff (staff_user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    if (!$conn->query($sql)) {
        throw new RuntimeException('Unable to prepare the account moderation audit log: ' . $conn->error);
    }
}
