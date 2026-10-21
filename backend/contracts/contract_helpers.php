<?php
/**
 * Shared helpers for contract generation (escaping, formatting).
 */

if (!function_exists('carelink_contract_escape')) {
    function carelink_contract_escape(?string $s): string
    {
        if ($s === null || $s === '') {
            return 'N/A';
        }
        return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}

if (!function_exists('carelink_contract_age_from_birth')) {
    function carelink_contract_age_from_birth(?string $birthYmd): string
    {
        if (!$birthYmd) {
            return 'N/A';
        }
        $birthYmd = substr(trim($birthYmd), 0, 10);
        try {
            $b = new DateTimeImmutable($birthYmd);
            $now = new DateTimeImmutable('today');
            $y = (int) $b->diff($now)->y;
            return (string) max(0, $y);
        } catch (Exception $e) {
            return 'N/A';
        }
    }
}

if (!function_exists('carelink_fmt_date')) {
    /**
     * Format a stored date/datetime string into a long-form display date
     * ("June 27, 2026") for the BK-1 contract body. Returns the
     * fill-in-the-blank placeholder if $d is empty/zero-date.
     */
    function carelink_fmt_date(?string $d): string
    {
        if (!$d || $d === '0000-00-00') {
            return '_______________';
        }
        $ts = strtotime($d);
        return $ts ? date('F d, Y', $ts) : $d;
    }
}

if (!function_exists('carelink_contract_validate_period')) {
    function carelink_contract_validate_period(string $duration, string $startRaw, string $endRaw): void
    {
        $parseDate = static function (string $value): ?DateTimeImmutable {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                return null;
            }
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            $errors = DateTimeImmutable::getLastErrors();
            if (!$date || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
                return null;
            }
            return $date->format('Y-m-d') === $value ? $date : null;
        };

        $start = $parseDate($startRaw);
        if ($start === null) {
            throw new Exception('A valid employment start date is required before creating or editing a contract.');
        }

        if (strcasecmp($duration, 'Indefinite') === 0) {
            if ($endRaw !== '') {
                throw new Exception('An indefinite contract cannot have a fixed end date.');
            }
            return;
        }

        $end = $parseDate($endRaw);
        if ($end === null) {
            throw new Exception('A valid end date is required for a fixed-term contract.');
        }
        if (!preg_match('/^(\d{1,3})\s*(day|days|week|weeks|month|months|year|years)$/i', $duration, $match)) {
            throw new Exception('Choose a valid fixed-term duration before generating the contract.');
        }

        $amount = (int) $match[1];
        $unit = strtolower(rtrim($match[2], 's'));
        $maximumAmounts = ['day' => 731, 'week' => 104, 'month' => 24, 'year' => 2];
        if ($amount < 1 || $amount > $maximumAmounts[$unit]) {
            throw new Exception("Fixed-term duration exceeds CareLink's 2-year maximum.");
        }

        $addMonths = static function (DateTimeImmutable $date, int $months): DateTimeImmutable {
            $monthIndex = (int) $date->format('n') - 1 + $months;
            $targetYear = (int) $date->format('Y') + intdiv($monthIndex, 12);
            $targetMonth = ($monthIndex % 12) + 1;
            $firstOfTargetMonth = new DateTimeImmutable(sprintf('%04d-%02d-01', $targetYear, $targetMonth));
            $lastDayOfTargetMonth = (int) $firstOfTargetMonth->modify('last day of this month')->format('j');
            return $date->setDate(
                $targetYear,
                $targetMonth,
                min((int) $date->format('j'), $lastDayOfTargetMonth)
            );
        };

        if ($unit === 'day' || $unit === 'week') {
            $days = $amount * ($unit === 'week' ? 7 : 1);
            $anniversary = $start->add(new DateInterval('P' . $days . 'D'));
        } else {
            $months = $amount * ($unit === 'year' ? 12 : 1);
            $anniversary = $addMonths($start, $months);
        }

        $termDays = (int) $start->diff($end)->format('%r%a');
        if ($termDays < 0 || $termDays + 1 < 30) {
            throw new Exception('CareLink requires fixed-term contracts to cover at least 30 inclusive calendar days. This is a platform rule, not a statutory minimum.');
        }
        $expectedEnd = $anniversary->modify('-1 day');
        if ($expectedEnd->format('Y-m-d') !== $end->format('Y-m-d')) {
            throw new Exception('The fixed-term duration does not match the selected start and end dates.');
        }

        $maximumEnd = $addMonths($start, 24)->modify('-1 day');
        if ($expectedEnd > $maximumEnd) {
            throw new Exception('CareLink fixed-term contracts cannot exceed 2 calendar years. Choose Indefinite for longer employment.');
        }
    }
}

if (!function_exists('carelink_contract_validate_work_hours')) {
    function carelink_contract_validate_work_hours(?string $workHours): void
    {
        $value = trim((string) $workHours);
        if ($value === '') {
            throw new Exception('Agreed work hours are required before creating or editing a contract.');
        }
        if (preg_match('/^Flexible(?:\s|$)/i', $value)) {
            return;
        }
        if (!preg_match(
            '/^(\d{1,2}):([0-5]\d)\s*(AM|PM)\s*–\s*(\d{1,2}):([0-5]\d)\s*(AM|PM)$/iu',
            $value,
            $match
        )) {
            throw new Exception('Choose valid start and end times, or use the Flexible hours option.');
        }
        if ((int) $match[1] < 1 || (int) $match[1] > 12 || (int) $match[4] < 1 || (int) $match[4] > 12) {
            throw new Exception('Choose valid start and end times, or use the Flexible hours option.');
        }

        $toMinutes = static function (int $hour, int $minute, string $period): int {
            $hour = $hour % 12 + (strtoupper($period) === 'PM' ? 12 : 0);
            return $hour * 60 + $minute;
        };
        $start = $toMinutes((int) $match[1], (int) $match[2], $match[3]);
        $end = $toMinutes((int) $match[4], (int) $match[5], $match[6]);
        $span = $end - $start;
        if ($span <= 0) {
            $span += 24 * 60;
        }
        $scheduledMinutes = max(0, $span - 60);
        if ($scheduledMinutes <= 0) {
            throw new Exception('The agreed schedule must include working time.');
        }
        if ($scheduledMinutes > 12 * 60) {
            throw new Exception('Scheduled work cannot exceed 12 hours per day, including overtime.');
        }
    }
}

if (!function_exists('carelink_fmt_datetime')) {
    /**
     * Format a stored datetime string into a long-form display date with
     * time-of-day ("June 27, 2026 at 02:30 PM") for the contract's digital
     * signature block. Returns "Pending" if $d is empty/zero-datetime.
     */
    function carelink_fmt_datetime(?string $d): string
    {
        if (!$d || $d === '0000-00-00 00:00:00') {
            return 'Pending';
        }
        $ts = strtotime($d);
        return $ts ? date('F d, Y \a\t h:i A', $ts) : $d;
    }
}

if (!function_exists('carelink_contract_full_name')) {
    function carelink_contract_full_name(array $u): string
    {
        $parts = array_filter([
            isset($u['first_name']) ? trim((string) $u['first_name']) : '',
            isset($u['middle_name']) ? trim((string) $u['middle_name']) : '',
            isset($u['last_name']) ? trim((string) $u['last_name']) : '',
        ]);
        $name = trim(implode(' ', $parts));
        return $name !== '' ? $name : 'N/A';
    }
}

if (!function_exists('carelink_contract_split_duties')) {
    /**
     * Split free-form job duties text into a list of labeled items (a, b, c, ...)
     * for BK-1 item 4. Splits on newlines and strips bullet/number prefixes.
     *
     * @return string[] Non-empty, trimmed duty lines (raw, not yet HTML-escaped)
     */
    function carelink_contract_split_duties(string $text): array
    {
        $text = trim($text);
        if ($text === '') {
            return ['Mga gawain sa tahanan ayon sa napagkasunduan.'];
        }
        $lines = preg_split('/\r\n|\r|\n/', $text);
        $items = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            $line = preg_replace('/^[\-\*•]+\s*/u', '', $line);
            $line = preg_replace('/^[a-zA-Z0-9]+[\.\)]\s*/u', '', $line);
            $line = trim((string) $line);
            if ($line !== '') {
                $items[] = $line;
            }
        }

        // Strip job-advertisement language (intro/marketing/requirements) that
        // doesn't belong in a legal contract's list of actual duties.
        $adPatterns = [
            '/^we are looking for/i',
            '/^we are seeking/i',
            '/^join our/i',
            '/^we offer/i',
            '/^requirements:/i',
            '/^responsibilities:/i',
            '/^qualifications:/i',
            '/^we provide/i',
            '/^about us/i',
            '/^honest[,\s]/i',
            '/^trustworthy/i',
            '/^hardworking/i',
            '/^willing to learn/i',
            '/^good communication/i',
            '/^previous experience in.*is a plus/i',
            '/^must be/i',
            '/^responsibilities\s*include\s*:?/i',
            '/^responsibilities\s*:/i',
            '/^duties\s*include\s*:?/i',
            '/^tasks\s*include\s*:?/i',
            '/^the\s+helper\s+will/i',
        ];
        $filtered = array_values(array_filter($items, function (string $line) use ($adPatterns): bool {
            foreach ($adPatterns as $pattern) {
                if (preg_match($pattern, $line)) {
                    return false;
                }
            }
            return strlen($line) > 3;
        }));

        if (!empty($filtered)) {
            return $filtered;
        }

        return ['Mga tungkulin ayon sa napagkasunduan ng dalawang panig'];
    }
}

if (!function_exists('carelink_contract_format_address')) {
    function carelink_contract_format_address(array $row, string $prefix = ''): string
    {
        if ($prefix !== '') {
            $prefix .= '_';
        }
        $bar = isset($row[$prefix . 'barangay']) ? trim((string) $row[$prefix . 'barangay']) : '';
        $mun = isset($row[$prefix . 'municipality']) ? trim((string) $row[$prefix . 'municipality']) : '';
        $prov = isset($row[$prefix . 'province']) ? trim((string) $row[$prefix . 'province']) : '';
        if ($bar !== '' || $mun !== '' || $prov !== '') {
            $out = trim(implode(', ', array_filter([$bar, $mun, $prov])));
            return $out !== '' ? $out : 'N/A';
        }
        $addr = isset($row['address']) ? trim((string) $row['address']) : '';
        return $addr !== '' ? $addr : 'N/A';
    }
}
