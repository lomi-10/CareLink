<?php

function ensure_helper_tesda_multiple_documents(mysqli $conn): void
{
    $columnCheck = $conn->query("SHOW COLUMNS FROM `user_documents` LIKE 'single_upload_type'");
    if (!$columnCheck) {
        throw new RuntimeException('Could not inspect user_documents.single_upload_type: ' . $conn->error);
    }
    if ($columnCheck->num_rows === 0) {
        $sql = "ALTER TABLE `user_documents`
                ADD COLUMN `single_upload_type` varchar(32) COLLATE utf8mb4_general_ci
                GENERATED ALWAYS AS (
                    CASE WHEN `document_type` = 'TESDA NC2' THEN NULL ELSE `document_type` END
                ) STORED AFTER `document_type`";
        if (!$conn->query($sql)) {
            throw new RuntimeException('Could not add user_documents.single_upload_type: ' . $conn->error);
        }
    }

    $legacyIndexCheck = $conn->query("SHOW INDEX FROM `user_documents` WHERE Key_name = 'uk_user_doctype'");
    if (!$legacyIndexCheck) {
        throw new RuntimeException('Could not inspect the legacy user_documents unique index: ' . $conn->error);
    }
    $hasLegacyIndex = $legacyIndexCheck->num_rows > 0;

    $newIndexCheck = $conn->query("SHOW INDEX FROM `user_documents` WHERE Key_name = 'uk_user_single_doctype'");
    if (!$newIndexCheck) {
        throw new RuntimeException('Could not inspect the user_documents single-upload index: ' . $conn->error);
    }
    $hasNewIndex = $newIndexCheck->num_rows > 0;

    if ($hasLegacyIndex && $hasNewIndex) {
        if (!$conn->query("ALTER TABLE `user_documents` DROP INDEX `uk_user_doctype`")) {
            throw new RuntimeException('Could not drop the legacy user_documents unique index: ' . $conn->error);
        }
    } elseif ($hasLegacyIndex) {
        $sql = "ALTER TABLE `user_documents`
                DROP INDEX `uk_user_doctype`,
                ADD UNIQUE KEY `uk_user_single_doctype` (`user_id`, `single_upload_type`)";
        if (!$conn->query($sql)) {
            throw new RuntimeException('Could not allow multiple TESDA NC2 documents: ' . $conn->error);
        }
    } elseif (!$hasNewIndex) {
        $sql = "ALTER TABLE `user_documents`
                ADD UNIQUE KEY `uk_user_single_doctype` (`user_id`, `single_upload_type`)";
        if (!$conn->query($sql)) {
            throw new RuntimeException('Could not add the user_documents single-upload index: ' . $conn->error);
        }
    }
}
