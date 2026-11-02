<?php

function ensure_experience_verification_schema(mysqli $conn): void
{
    $columns = [
        'experience_review_status' => "ALTER TABLE `helper_work_history`
            ADD COLUMN `experience_review_status` ENUM('self_reported', 'peso_reviewed')
            NOT NULL DEFAULT 'self_reported'",
        'experience_reviewed_by' => "ALTER TABLE `helper_work_history`
            ADD COLUMN `experience_reviewed_by` INT DEFAULT NULL",
        'experience_reviewed_at' => "ALTER TABLE `helper_work_history`
            ADD COLUMN `experience_reviewed_at` DATETIME DEFAULT NULL",
        'experience_review_method' => "ALTER TABLE `helper_work_history`
            ADD COLUMN `experience_review_method` ENUM('reference_call', 'document_review', 'in_person')
            DEFAULT NULL",
        'experience_review_note' => "ALTER TABLE `helper_work_history`
            ADD COLUMN `experience_review_note` VARCHAR(500) DEFAULT NULL",
    ];

    foreach ($columns as $column => $sql) {
        $check = $conn->query("SHOW COLUMNS FROM `helper_work_history` LIKE '{$column}'");
        if (!$check) {
            throw new RuntimeException("Could not inspect helper_work_history.{$column}: " . $conn->error);
        }
        if ($check->num_rows === 0 && !$conn->query($sql)) {
            throw new RuntimeException("Could not add helper_work_history.{$column}: " . $conn->error);
        }
    }

    $sql = "CREATE TABLE IF NOT EXISTS placement_experience_confirmations (
        placement_id INT NOT NULL,
        helper_confirmed_at DATETIME DEFAULT NULL,
        parent_confirmed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (placement_id),
        CONSTRAINT fk_placement_experience_confirmation_placement
            FOREIGN KEY (placement_id) REFERENCES placements (placement_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";
    if (!$conn->query($sql)) {
        throw new RuntimeException('Could not create placement_experience_confirmations: ' . $conn->error);
    }
}
