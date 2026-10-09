<?php
declare(strict_types=1);

function ensure_announcements_table(mysqli $conn): void
{
    $sql = "
        CREATE TABLE IF NOT EXISTS announcements (
            announcement_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(160) NOT NULL,
            body TEXT NOT NULL,
            image_path VARCHAR(255) NULL,
            published_by INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_announcements_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    if (!$conn->query($sql)) {
        throw new RuntimeException('Could not initialize announcements: ' . $conn->error);
    }
}
