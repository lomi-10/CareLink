<?php
// carelink_api/shared/placement_settings_table.php
// Per-placement settings (auto-created, no migration). Currently holds the
// attendance-tracking opt-in: attendance is a shared record-keeping aid for
// payroll, not surveillance. It's OFF by default — the employer opts in per
// placement if they want day-by-day attendance to feed payroll.

if (!function_exists('ensure_placement_settings_table')) {
    function ensure_placement_settings_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS placement_settings (
                application_id      INT PRIMARY KEY,
                attendance_tracking TINYINT(1) NOT NULL DEFAULT 0,
                updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }

    /** True if attendance tracking is enabled for a placement (default OFF/opt-in). */
    function get_attendance_tracking(mysqli $conn, int $application_id): bool
    {
        ensure_placement_settings_table($conn);
        $stmt = $conn->prepare("SELECT attendance_tracking FROM placement_settings WHERE application_id = ? LIMIT 1");
        $stmt->bind_param("i", $application_id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ? ((int) $row['attendance_tracking'] === 1) : false;
    }

    function set_attendance_tracking(mysqli $conn, int $application_id, bool $enabled): void
    {
        ensure_placement_settings_table($conn);
        $val = $enabled ? 1 : 0;
        $stmt = $conn->prepare(
            "INSERT INTO placement_settings (application_id, attendance_tracking)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE attendance_tracking = VALUES(attendance_tracking)"
        );
        $stmt->bind_param("ii", $application_id, $val);
        $stmt->execute();
        $stmt->close();
    }
}
?>
