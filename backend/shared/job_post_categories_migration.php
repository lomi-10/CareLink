<?php
if (!function_exists('ensure_job_post_categories_and_slots')) {
    function ensure_job_post_categories_and_slots(mysqli $conn): void
    {
        $tableResult = $conn->query("SHOW TABLES LIKE 'job_posts'");
        if (!$tableResult || $tableResult->num_rows === 0) {
            throw new RuntimeException('Cannot add job categories and openings: job_posts table is missing.');
        }
        $tableResult->free();

        $columnResult = $conn->query("SHOW COLUMNS FROM `job_posts` LIKE 'slots'");
        if (!$columnResult) {
            throw new RuntimeException("Could not inspect job_posts.slots: " . $conn->error);
        }
        $slotsExists = $columnResult->num_rows > 0;
        $columnResult->free();
        if (!$slotsExists && !$conn->query(
            "ALTER TABLE `job_posts` ADD COLUMN `slots` int unsigned NOT NULL DEFAULT '1' COMMENT 'Number of helpers hired through this post'"
        )) {
            throw new RuntimeException("Could not add job_posts.slots: " . $conn->error);
        }
    }
}
?>
