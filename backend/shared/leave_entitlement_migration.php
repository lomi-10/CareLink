<?php

function ensure_leave_entitlement_source_column(mysqli $conn): void
{
    $columns = $conn->query("SHOW COLUMNS FROM `leave_requests` LIKE 'paid_leave_source'");
    if (!$columns) {
        throw new RuntimeException('Could not inspect leave_requests paid_leave_source: ' . $conn->error);
    }

    if ($columns->num_rows > 0) {
        return;
    }

    if (!$conn->query(
        "ALTER TABLE `leave_requests`
         ADD COLUMN `paid_leave_source` varchar(32) DEFAULT NULL
         COMMENT 'statutory_sil, contract_sick, contract_vacation, or unpaid'"
    )) {
        throw new RuntimeException('Could not add leave_requests.paid_leave_source: ' . $conn->error);
    }

    if (!$conn->query(
        "UPDATE `leave_requests`
         SET `paid_leave_source` = CASE
             WHEN `reason_code` = 'sick' THEN 'contract_sick'
             ELSE 'contract_vacation'
         END
         WHERE `status` = 'approved'
           AND `paid_leave` = 1
           AND `paid_leave_source` IS NULL"
    )) {
        throw new RuntimeException('Could not classify existing paid leave requests: ' . $conn->error);
    }
}
