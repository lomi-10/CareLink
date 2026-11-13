<?php

function carelink_ensure_helper_safeguards_schema(mysqli $conn): void
{
    $column = $conn->query("SHOW COLUMNS FROM helper_profiles LIKE 'preferred_rest_day'");
    if (!$column) {
        throw new Exception('Unable to inspect helper profile schema: ' . $conn->error);
    }
    if ($column->num_rows === 0 && !$conn->query(
        "ALTER TABLE helper_profiles ADD COLUMN preferred_rest_day VARCHAR(3) NULL DEFAULT NULL AFTER civil_status"
    )) {
        throw new Exception('Unable to add helper rest-day preference: ' . $conn->error);
    }

    $columnsToRemove = [
        'helper_profiles' => ['religion'],
        'parent_profiles' => ['religion'],
        'job_posts' => ['preferred_religion', 'min_age', 'max_age'],
    ];
    foreach ($columnsToRemove as $table => $tableColumns) {
        foreach ((array) $tableColumns as $columnName) {
            $result = $conn->query("SHOW COLUMNS FROM `$table` LIKE '$columnName'");
            if (!$result) {
                throw new Exception("Unable to inspect $table.$columnName: " . $conn->error);
            }
            $exists = $result->num_rows > 0;
            $result->free();
            if ($exists && !$conn->query("ALTER TABLE `$table` DROP COLUMN `$columnName`")) {
                throw new Exception("Unable to remove $table.$columnName: " . $conn->error);
            }
        }
    }

    if (!$conn->query('DROP TABLE IF EXISTS carelink_safeguard_migrations')) {
        throw new Exception('Unable to remove obsolete safeguard migration table: ' . $conn->error);
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
