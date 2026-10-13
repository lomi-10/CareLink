<?php

/**
 * Adds the helper availability column on databases that predate the field.
 */
function ensure_helper_availability_column(mysqli $conn): void
{
    $columns = $conn->query("SHOW COLUMNS FROM `helper_profiles` LIKE 'availability_status'");
    if (!$columns) {
        throw new RuntimeException('Could not inspect helper_profiles availability column: ' . $conn->error);
    }

    if ($columns->num_rows > 0) {
        return;
    }

    $sql = "ALTER TABLE `helper_profiles`
            ADD COLUMN `availability_status`
            ENUM('Available', 'Currently Employed')
            NOT NULL DEFAULT 'Available'";
    if (!$conn->query($sql)) {
        throw new RuntimeException('Could not add helper_profiles.availability_status: ' . $conn->error);
    }
}
