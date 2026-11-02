<?php

require_once __DIR__ . '/experience_verification_migration.php';

function carelink_ended_placement_experience_sql(): string
{
    return "CASE
        WHEN ja.termination_last_day IS NOT NULL AND ja.termination_last_day < CURDATE()
            THEN ja.termination_last_day
        WHEN c.employment_end_date IS NOT NULL AND c.employment_end_date < CURDATE()
            THEN c.employment_end_date
        WHEN p.ended_at IS NOT NULL AND DATE(p.ended_at) < CURDATE()
            THEN DATE(p.ended_at)
        ELSE NULL
    END";
}

/**
 * @return array<int, array<string, mixed>>
 */
function carelink_platform_experiences(mysqli $conn, int $helperId): array
{
    ensure_experience_verification_schema($conn);
    $endedOn = carelink_ended_placement_experience_sql();
    $stmt = $conn->prepare(
        "SELECT p.placement_id, p.application_id, jp.title AS position,
                TRIM(CONCAT(COALESCE(parent.first_name, ''), ' ', COALESCE(parent.last_name, ''))) AS employer_name,
                COALESCE(c.employment_start_date, p.start_date) AS start_date,
                {$endedOn} AS end_date
         FROM placements p
         INNER JOIN job_applications ja ON ja.application_id = p.application_id
         INNER JOIN job_posts jp ON jp.job_post_id = p.job_post_id
         INNER JOIN users parent ON parent.user_id = p.parent_id AND parent.user_type = 'parent'
         INNER JOIN contracts c ON c.application_id = p.application_id
         INNER JOIN placement_experience_confirmations ec ON ec.placement_id = p.placement_id
         WHERE p.helper_id = ?
           AND ja.employer_signed_at IS NOT NULL
           AND ja.helper_signed_at IS NOT NULL
           AND ec.helper_confirmed_at IS NOT NULL
           AND ec.parent_confirmed_at IS NOT NULL
           AND {$endedOn} IS NOT NULL
           AND COALESCE(c.employment_start_date, p.start_date) <= {$endedOn}
         ORDER BY end_date DESC, p.placement_id DESC
         LIMIT 50"
    );
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare verified placement history: ' . $conn->error);
    }
    $stmt->bind_param('i', $helperId);
    if (!$stmt->execute()) {
        $stmt->close();
        throw new RuntimeException('Unable to load verified placement history.');
    }
    $result = $stmt->get_result();
    $experiences = [];
    while ($row = $result->fetch_assoc()) {
        $experiences[] = [
            'placement_id' => (int) $row['placement_id'],
            'position' => (string) $row['position'],
            'employer_name' => trim((string) $row['employer_name']),
            'start_date' => (string) $row['start_date'],
            'end_date' => (string) $row['end_date'],
            'source' => 'carelink',
            'verification_status' => 'platform_confirmed',
        ];
    }
    $stmt->close();
    return $experiences;
}

/**
 * @return array<int, array<string, mixed>>
 */
function carelink_pending_placement_confirmations(mysqli $conn, int $userId, string $userType): array
{
    ensure_experience_verification_schema($conn);
    if (!in_array($userType, ['helper', 'parent'], true)) {
        throw new InvalidArgumentException('Only helpers and employers can confirm placement experience.');
    }
    $ownerColumn = $userType === 'helper' ? 'p.helper_id' : 'p.parent_id';
    $counterpartyJoin = $userType === 'helper'
        ? 'INNER JOIN users other ON other.user_id = p.parent_id AND other.user_type = \'parent\''
        : 'INNER JOIN users other ON other.user_id = p.helper_id AND other.user_type = \'helper\'';
    $endedOn = carelink_ended_placement_experience_sql();
    $stmt = $conn->prepare(
        "SELECT p.placement_id, p.application_id, jp.title AS position,
                TRIM(CONCAT(COALESCE(other.first_name, ''), ' ', COALESCE(other.last_name, ''))) AS counterparty_name,
                COALESCE(c.employment_start_date, p.start_date) AS start_date,
                {$endedOn} AS end_date,
                ec.helper_confirmed_at, ec.parent_confirmed_at
         FROM placements p
         INNER JOIN job_applications ja ON ja.application_id = p.application_id
         INNER JOIN job_posts jp ON jp.job_post_id = p.job_post_id
         INNER JOIN contracts c ON c.application_id = p.application_id
         {$counterpartyJoin}
         LEFT JOIN placement_experience_confirmations ec ON ec.placement_id = p.placement_id
         WHERE {$ownerColumn} = ?
           AND ja.employer_signed_at IS NOT NULL
           AND ja.helper_signed_at IS NOT NULL
           AND (ec.helper_confirmed_at IS NULL OR ec.parent_confirmed_at IS NULL)
           AND {$endedOn} IS NOT NULL
           AND COALESCE(c.employment_start_date, p.start_date) <= {$endedOn}
         ORDER BY end_date DESC, p.placement_id DESC
         LIMIT 50"
    );
    if (!$stmt) {
        throw new RuntimeException('Unable to prepare placement confirmations: ' . $conn->error);
    }
    $stmt->bind_param('i', $userId);
    if (!$stmt->execute()) {
        $stmt->close();
        throw new RuntimeException('Unable to load placement confirmations.');
    }
    $result = $stmt->get_result();
    $placements = [];
    while ($row = $result->fetch_assoc()) {
        $placements[] = [
            'placement_id' => (int) $row['placement_id'],
            'application_id' => (int) $row['application_id'],
            'position' => (string) $row['position'],
            'counterparty_name' => trim((string) $row['counterparty_name']),
            'start_date' => (string) $row['start_date'],
            'end_date' => (string) $row['end_date'],
            'other_party_confirmed' => $userType === 'helper'
                ? $row['parent_confirmed_at'] !== null
                : $row['helper_confirmed_at'] !== null,
            'you_confirmed' => $row[$userType === 'helper' ? 'helper_confirmed_at' : 'parent_confirmed_at'] !== null,
        ];
    }
    $stmt->close();
    return $placements;
}
