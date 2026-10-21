<?php

function carelink_contract_rest_days_csv(?string $restDays, ?string $legacyRestDay = null): ?string
{
    $rawDays = [];
    if ($restDays !== null && trim($restDays) !== '') {
        $decoded = json_decode($restDays, true);
        if (is_array($decoded)) {
            $rawDays = $decoded;
        } elseif (json_last_error() !== JSON_ERROR_NONE) {
            $rawDays = preg_split('/\s*,\s*/', trim($restDays)) ?: [];
        }
    }

    if (!$rawDays && $legacyRestDay !== null && trim($legacyRestDay) !== '') {
        $rawDays = preg_split('/\s*,\s*/', trim($legacyRestDay)) ?: [];
    }

    $days = [];
    foreach ($rawDays as $day) {
        if (!is_string($day) && !is_numeric($day)) {
            continue;
        }
        $day = trim((string) $day);
        if ($day !== '') {
            $days[strtolower($day)] = $day;
        }
    }

    return $days ? implode(', ', array_values($days)) : null;
}
