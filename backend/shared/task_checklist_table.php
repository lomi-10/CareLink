<?php
// shared/task_checklist_table.php
// Checklist items inside a post-hire task (v1/tasks/checklist.php).
//
// WHY THIS FILE EXISTS
//
// task_checklist_items was the one table in the system with NO creation path
// in code. It appears in backend/database/current.sql and nowhere else — not
// even in schema.sql — so on any server built from schema.sql, or on any
// database where that dump was never imported, the checklist endpoint hits an
// unknown table. Under PHP 8.1's throwing mysqli that is a fatal error, not an
// empty list.
//
// It also made migrate.php's own report useless in that case: the table would
// sit in still_missing forever with nothing able to fix it, so the endpoint
// would report failure on every deploy and there would be no remedy to apply.
//
// The definition below matches current.sql exactly.

if (!function_exists('ensure_task_checklist_items_table')) {
    function ensure_task_checklist_items_table(mysqli $conn): void
    {
        // The foreign key is added separately, below, rather than inlined here.
        // CREATE TABLE with a REFERENCES clause fails outright if the parent
        // table is absent, which would leave a server with no application_tasks
        // unable to create this one either — turning one missing table into two.
        $conn->query(
            "CREATE TABLE IF NOT EXISTS task_checklist_items (
                item_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                task_id    BIGINT UNSIGNED NOT NULL,
                item_text  VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
                is_done    TINYINT(1) NOT NULL DEFAULT 0,
                sort_order INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (item_id),
                KEY idx_checklist_task (task_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        // ON DELETE CASCADE matters: deleting a task must take its checklist
        // items with it, or they become unreachable rows keyed to a task id
        // that no longer exists.
        $parentExists = $conn->query("SHOW TABLES LIKE 'application_tasks'");
        if (!$parentExists || $parentExists->num_rows === 0) {
            return;
        }

        $hasFk = $conn->query(
            "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
               AND TABLE_NAME = 'task_checklist_items'
               AND CONSTRAINT_NAME = 'fk_checklist_task'"
        );
        if ($hasFk && $hasFk->num_rows > 0) {
            return;
        }

        try {
            $conn->query(
                "ALTER TABLE task_checklist_items
                 ADD CONSTRAINT fk_checklist_task FOREIGN KEY (task_id)
                 REFERENCES application_tasks (id) ON DELETE CASCADE"
            );
        } catch (Throwable $e) {
            // An existing table with orphaned rows will refuse the constraint.
            // The table itself is what the endpoint needs; a missing FK is worth
            // far less than aborting every other migration behind it.
            error_log('ensure_task_checklist_items_table: FK not added — ' . $e->getMessage());
        }
    }
}
