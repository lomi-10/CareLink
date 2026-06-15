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
