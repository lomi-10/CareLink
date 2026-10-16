<?php

if (!function_exists('ensure_payslip_records_table')) {
    function ensure_payslip_records_table(mysqli $conn): void
    {
        $sql = "CREATE TABLE IF NOT EXISTS payslip_records (
            payslip_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            application_id INT NOT NULL,
            pay_period_start DATE NOT NULL,
            pay_period_end DATE NOT NULL,
            paid_at DATE NOT NULL,
            gross_amount DECIMAL(10,2) NOT NULL,
            deductions_json JSON DEFAULT NULL,
            deductions_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            net_amount DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(32) NOT NULL DEFAULT 'Cash',
            employer_note VARCHAR(500) DEFAULT NULL,
            status ENUM('pending','acknowledged','disputed') NOT NULL DEFAULT 'pending',
            helper_acknowledged_at DATETIME DEFAULT NULL,
            helper_disputed_at DATETIME DEFAULT NULL,
            helper_dispute_reason VARCHAR(1000) DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (payslip_id),
            KEY idx_payslips_application_paid (application_id, paid_at),
            CONSTRAINT fk_payslips_application
                FOREIGN KEY (application_id) REFERENCES job_applications (application_id)
                ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        if (!$conn->query($sql)) {
            throw new RuntimeException('Could not prepare the payslip records table.');
        }
    }
}
