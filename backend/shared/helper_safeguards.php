<?php

function carelink_ensure_helper_safeguards_schema(mysqli $conn): void
{
    $column = $conn->query("SHOW COLUMNS FROM helper_profiles LIKE 'preferred_rest_day'");
    if (!$column) {
        throw new Exception('Unable to inspect helper profile schema: ' . $conn->error);
    }
    if ($column->num_rows === 0 && !$conn->query(
        "ALTER TABLE helper_profiles ADD COLUMN preferred_rest_day VARCHAR(3) NULL DEFAULT NULL AFTER religion"
    )) {
        throw new Exception('Unable to add helper rest-day preference: ' . $conn->error);
    }

    if (!$conn->query("
        CREATE TABLE IF NOT EXISTS carelink_safeguard_migrations (
            migration_key VARCHAR(120) NOT NULL PRIMARY KEY,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    ")) {
        throw new Exception('Unable to prepare safeguard migration tracking: ' . $conn->error);
    }

    $conn->begin_transaction();
    try {
        $migrationKey = 'remove_religion_preferences_20261105';
        $mark = $conn->prepare('INSERT IGNORE INTO carelink_safeguard_migrations (migration_key) VALUES (?)');
        if (!$mark) {
            throw new Exception('Unable to prepare safeguard migration: ' . $conn->error);
        }
        $mark->bind_param('s', $migrationKey);
        if (!$mark->execute()) {
            throw new Exception('Unable to record safeguard migration: ' . $mark->error);
        }
        $isFirstRun = $mark->affected_rows === 1;
        $mark->close();

        if ($isFirstRun) {
            if (!$conn->query('UPDATE helper_profiles SET religion = NULL WHERE religion IS NOT NULL')) {
                throw new Exception('Unable to clear existing helper religion values: ' . $conn->error);
            }
            if (!$conn->query('UPDATE job_posts SET preferred_religion = NULL WHERE preferred_religion IS NOT NULL')) {
                throw new Exception('Unable to clear existing job religion preferences: ' . $conn->error);
            }
        }
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
}

function carelink_helper_age_from_birth_date(?string $birthDate): ?int
{
    $birthDate = trim((string) $birthDate);
    if ($birthDate === '') {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $birthDate);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) ||
        $date->format('Y-m-d') !== $birthDate) {
        return null;
    }

    $today = new DateTimeImmutable('today');
    if ($date > $today) {
        return null;
    }

    return $date->diff($today)->y;
}

function carelink_validate_adult_birth_date(?string $birthDate): string
{
    $birthDate = trim((string) $birthDate);
    $age = carelink_helper_age_from_birth_date($birthDate);
    if ($age === null || $age < 18) {
        throw new InvalidArgumentException(
            'CareLink currently allows helper registrations for adults aged 18 and older. Enter a valid birth date.'
        );
    }

    return $birthDate;
}

function carelink_require_adult_helper(mysqli $conn, int $helperId): int
{
    $stmt = $conn->prepare('SELECT birth_date FROM helper_profiles WHERE user_id = ? LIMIT 1');
    if (!$stmt) {
        throw new Exception('Unable to verify helper age: ' . $conn->error);
    }
    $stmt->bind_param('i', $helperId);
    if (!$stmt->execute()) {
        throw new Exception('Unable to verify helper age: ' . $stmt->error);
    }
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $age = $row ? carelink_helper_age_from_birth_date($row['birth_date'] ?? null) : null;
    if ($age === null || $age < 18) {
        throw new Exception('CareLink currently allows helper accounts and employment for adults aged 18 and older.');
    }
    return $age;
}
