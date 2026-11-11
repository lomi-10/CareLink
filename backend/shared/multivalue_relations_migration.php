<?php

require_once __DIR__ . '/multivalue_relations.php';

if (!function_exists('ensure_multivalue_relations')) {
    function ensure_multivalue_relations(mysqli $conn): void
    {
        $definitions = [
            "CREATE TABLE IF NOT EXISTS `job_post_categories` (
                `job_post_id` int NOT NULL,
                `category_id` int NOT NULL,
                `sort_order` int unsigned NOT NULL DEFAULT 0,
                PRIMARY KEY (`job_post_id`, `category_id`),
                KEY `idx_job_post_categories_category` (`category_id`),
                CONSTRAINT `fk_job_post_categories_post` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
            "CREATE TABLE IF NOT EXISTS `job_post_roles` (
                `job_post_id` int NOT NULL,
                `job_id` int NOT NULL,
                `sort_order` int unsigned NOT NULL DEFAULT 0,
                PRIMARY KEY (`job_post_id`, `job_id`),
                KEY `idx_job_post_roles_job` (`job_id`),
                CONSTRAINT `fk_job_post_roles_post` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
            "CREATE TABLE IF NOT EXISTS `job_post_skills` (
                `job_post_id` int NOT NULL,
                `skill_id` int NOT NULL,
                `sort_order` int unsigned NOT NULL DEFAULT 0,
                PRIMARY KEY (`job_post_id`, `skill_id`),
                KEY `idx_job_post_skills_skill` (`skill_id`),
                CONSTRAINT `fk_job_post_skills_post` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
            "CREATE TABLE IF NOT EXISTS `job_post_custom_skills` (
                `job_post_id` int NOT NULL,
                `sort_order` int unsigned NOT NULL DEFAULT 0,
                `custom_skill` text NOT NULL,
                PRIMARY KEY (`job_post_id`, `sort_order`),
                CONSTRAINT `fk_job_post_custom_skills_post` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
            "CREATE TABLE IF NOT EXISTS `helper_custom_jobs` (
                `profile_id` int NOT NULL,
                `sort_order` int unsigned NOT NULL DEFAULT 0,
                `custom_value` text NOT NULL,
                PRIMARY KEY (`profile_id`, `sort_order`),
                CONSTRAINT `fk_helper_custom_jobs_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
            "CREATE TABLE IF NOT EXISTS `helper_custom_skills` (
                `profile_id` int NOT NULL,
                `sort_order` int unsigned NOT NULL DEFAULT 0,
                `custom_value` text NOT NULL,
                PRIMARY KEY (`profile_id`, `sort_order`),
                CONSTRAINT `fk_helper_custom_skills_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci",
        ];
        foreach ($definitions as $sql) {
            if (!$conn->query($sql)) throw new RuntimeException('Could not create normalized relationship table: ' . $conn->error);
        }

        $jobColumns = [];
        foreach (['category_ids', 'job_ids', 'skill_ids', 'custom_skills'] as $column) {
            if (carelink_mvr_column_exists($conn, 'job_posts', $column)) $jobColumns[] = $column;
        }
        if ($jobColumns) {
            $select = array_merge(['job_post_id', 'category_id'], $jobColumns);
            $result = $conn->query('SELECT `' . implode('`, `', $select) . '` FROM `job_posts`');
            if (!$result) throw new RuntimeException('Could not backfill job post relationships: ' . $conn->error);
            while ($row = $result->fetch_assoc()) {
                $jobPostId = (int) $row['job_post_id'];
                $categoryIds = isset($row['category_ids'])
                    ? carelink_parse_id_list($row['category_ids'])
                    : [];
                if (!$categoryIds && (int) ($row['category_id'] ?? 0) > 0) $categoryIds = [(int) $row['category_id']];
                $jobIds = carelink_parse_id_list($row['job_ids'] ?? []);
                $skillIds = carelink_parse_id_list($row['skill_ids'] ?? []);
                $customSkills = carelink_parse_custom_value_list($row['custom_skills'] ?? []);
                carelink_mvr_sync_backfill($conn, 'job_post_categories', 'job_post_id', $jobPostId, $categoryIds);
                carelink_mvr_sync_backfill($conn, 'job_post_roles', 'job_post_id', $jobPostId, $jobIds);
                carelink_mvr_sync_backfill($conn, 'job_post_skills', 'job_post_id', $jobPostId, $skillIds);
                carelink_mvr_sync_backfill($conn, 'job_post_custom_skills', 'job_post_id', $jobPostId, $customSkills);
            }
            $result->free();
        }

        if (carelink_mvr_column_exists($conn, 'helper_profiles', 'custom_jobs')
            || carelink_mvr_column_exists($conn, 'helper_profiles', 'custom_skills')) {
            $profileColumns = ['profile_id'];
            foreach (['custom_jobs', 'custom_skills'] as $column) {
                if (carelink_mvr_column_exists($conn, 'helper_profiles', $column)) $profileColumns[] = $column;
            }
            $result = $conn->query('SELECT `' . implode('`, `', $profileColumns) . '` FROM `helper_profiles`');
            if (!$result) throw new RuntimeException('Could not backfill helper custom values: ' . $conn->error);
            while ($row = $result->fetch_assoc()) {
                $profileId = (int) $row['profile_id'];
                if (array_key_exists('custom_jobs', $row)) {
                    carelink_mvr_sync_backfill($conn, 'helper_custom_jobs', 'profile_id', $profileId, carelink_parse_custom_value_list($row['custom_jobs']));
                }
                if (array_key_exists('custom_skills', $row)) {
                    carelink_mvr_sync_backfill($conn, 'helper_custom_skills', 'profile_id', $profileId, carelink_parse_custom_value_list($row['custom_skills']));
                }
            }
            $result->free();
        }

        foreach ([
            'job_posts' => ['category_ids', 'job_ids', 'skill_ids', 'custom_skills'],
            'helper_profiles' => ['custom_jobs', 'custom_skills'],
        ] as $table => $columns) {
            $existing = array_values(array_filter($columns, fn($column) => carelink_mvr_column_exists($conn, $table, $column)));
            if ($existing && !$conn->query("ALTER TABLE `$table` DROP COLUMN `" . implode('`, DROP COLUMN `', $existing) . '`')) {
                throw new RuntimeException("Could not remove normalized columns from $table: " . $conn->error);
            }
        }
    }
}

if (!function_exists('carelink_mvr_column_exists')) {
    function carelink_mvr_column_exists(mysqli $conn, string $table, string $column): bool
    {
        $allowed = ['job_posts' => ['category_ids', 'job_ids', 'skill_ids', 'custom_skills'], 'helper_profiles' => ['custom_jobs', 'custom_skills']];
        if (!isset($allowed[$table]) || !in_array($column, $allowed[$table], true)) {
            throw new InvalidArgumentException('Unsupported migration column.');
        }
        $stmt = $conn->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        if (!$stmt) throw new RuntimeException('Could not inspect relationship migration columns: ' . $conn->error);
        $stmt->bind_param('ss', $table, $column);
        if (!$stmt->execute()) throw new RuntimeException('Could not inspect relationship migration columns: ' . $stmt->error);
        $stmt->bind_result($count);
        $stmt->fetch();
        $stmt->close();
        return (int) $count > 0;
    }
}

if (!function_exists('carelink_mvr_sync_backfill')) {
    function carelink_mvr_sync_backfill(
        mysqli $conn,
        string $table,
        string $ownerColumn,
        int $ownerId,
        array $values
    ): void {
        carelink_replace_relation_values($conn, $table, $ownerColumn, $ownerId, $values);
    }
}
