<?php
if (!function_exists('ensure_job_post_categories_and_slots')) {
    function ensure_job_post_categories_and_slots(mysqli $conn): void
    {
        $tableResult = $conn->query("SHOW TABLES LIKE 'job_posts'");
        if (!$tableResult || $tableResult->num_rows === 0) {
            throw new RuntimeException('Cannot add job categories and openings: job_posts table is missing.');
        }
        $tableResult->free();

        $columns = [
            'category_ids' => "ALTER TABLE `job_posts` ADD COLUMN `category_ids` json DEFAULT NULL COMMENT 'All selected ref_categories.category_id values'",
            'slots' => "ALTER TABLE `job_posts` ADD COLUMN `slots` int unsigned NOT NULL DEFAULT '1' COMMENT 'Number of helpers hired through this post'",
        ];
        foreach ($columns as $column => $alterSql) {
            $columnResult = $conn->query("SHOW COLUMNS FROM `job_posts` LIKE '$column'");
            if (!$columnResult) {
                throw new RuntimeException("Could not inspect job_posts.$column: " . $conn->error);
            }
            $exists = $columnResult->num_rows > 0;
            $columnResult->free();
            if (!$exists && !$conn->query($alterSql)) {
                throw new RuntimeException("Could not add job_posts.$column: " . $conn->error);
            }
        }

        if (!$conn->query(
            "UPDATE `job_posts`
             SET `category_ids` = JSON_ARRAY(`category_id`)
             WHERE `category_ids` IS NULL OR JSON_LENGTH(`category_ids`) = 0"
        )) {
            throw new RuntimeException('Could not backfill job post categories: ' . $conn->error);
        }
    }
}
?>
