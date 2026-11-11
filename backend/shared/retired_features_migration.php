<?php

function carelink_remove_retired_feature_tables(mysqli $conn): void
{
    $tables = [
        'feedback_answers',
        'task_checklist_items',
        'helper_placement_tasks',
        'placement_tasks',
        'application_tasks',
        'attendance_logs',
        'feedback_questions',
        'system_feedback',
        'placement_settings',
    ];

    foreach ($tables as $table) {
        if (!$conn->query("DROP TABLE IF EXISTS `$table`")) {
            throw new RuntimeException("Unable to remove retired table $table: " . $conn->error);
        }
    }
}
