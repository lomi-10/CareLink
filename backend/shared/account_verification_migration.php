<?php

/**
 * Adds a generic signup-verification timestamp without treating an SMS-verified
 * account's email address as verified.
 */
function ensure_account_verified_at_column(mysqli $conn): void
{
    $columns = $conn->query("SHOW COLUMNS FROM `users` LIKE 'account_verified_at'");
    if (!$columns) {
        throw new RuntimeException('Could not inspect users.account_verified_at: ' . $conn->error);
    }

    if ($columns->num_rows === 0) {
        $sql = 'ALTER TABLE `users` ADD COLUMN `account_verified_at` DATETIME NULL AFTER `email_verified_at`';
        if (!$conn->query($sql)) {
            throw new RuntimeException('Could not add users.account_verified_at: ' . $conn->error);
        }
    }

    $channelColumn = $conn->query("SHOW COLUMNS FROM `users` LIKE 'account_verification_channel'");
    if (!$channelColumn) {
        throw new RuntimeException('Could not inspect users.account_verification_channel: ' . $conn->error);
    }
    if ($channelColumn->num_rows === 0) {
        if (!$conn->query("
            ALTER TABLE `users`
            ADD COLUMN `account_verification_channel` VARCHAR(10) NOT NULL DEFAULT 'email'
            AFTER `account_verified_at`
        ")) {
            throw new RuntimeException('Could not add users.account_verification_channel: ' . $conn->error);
        }
        if (!$conn->query("
            UPDATE `users`
            SET `account_verification_channel` = 'sms'
            WHERE `email_verified_at` IS NULL
              AND `phone` IS NOT NULL
              AND `phone` <> ''
        ")) {
            throw new RuntimeException('Could not backfill users.account_verification_channel: ' . $conn->error);
        }
    }

    $emailColumn = $conn->query("SHOW COLUMNS FROM `users` LIKE 'email'");
    if (!$emailColumn) {
        throw new RuntimeException('Could not inspect users.email: ' . $conn->error);
    }
    $emailDefinition = $emailColumn->fetch_assoc();
    if ($emailDefinition && strtoupper((string) $emailDefinition['Null']) === 'NO') {
        if (!$conn->query("
            ALTER TABLE `users`
            MODIFY COLUMN `email` VARCHAR(255) COLLATE utf8mb4_general_ci NULL
        ")) {
            throw new RuntimeException('Could not make users.email optional: ' . $conn->error);
        }
    }

    if (!$conn->query('
        UPDATE `users`
        SET `account_verified_at` = `email_verified_at`
        WHERE `email_verified_at` IS NOT NULL
          AND `account_verified_at` IS NULL
    ')) {
        throw new RuntimeException('Could not backfill users.account_verified_at: ' . $conn->error);
    }
}
