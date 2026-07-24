<?php
// carelink_api/peso/application_flags_table.php
//
// Ensures the application_flags table exists. It's a small auxiliary table (who
// flagged which application, why, and whether the flag is still active), created
// on first use with CREATE TABLE IF NOT EXISTS so no manual migration is needed on
// deploy. The "unsubmit" itself is reflected on job_applications.status; this table
// is the audit/reason record and powers the PESO "flagged" filter.

if (!function_exists('carelink_ensure_application_flags_table')) {
    function carelink_ensure_application_flags_table(mysqli $conn): void
    {
        $conn->query("
            CREATE TABLE IF NOT EXISTS application_flags (
                flag_id INT AUTO_INCREMENT PRIMARY KEY,
                application_id INT NOT NULL,
                flagged_by INT NOT NULL,
                reason VARCHAR(500) NOT NULL,
                status ENUM('active','cleared') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                cleared_at DATETIME NULL,
                INDEX (application_id),
                INDEX (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    }
}

// Auto-run on include.
carelink_ensure_application_flags_table($conn);
