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
        return !empty($items) ? $items : [$text];
    }
}

if (!function_exists('carelink_contract_format_address')) {
    function carelink_contract_format_address(array $row, string $prefix = ''): string
    {
        $parts = [];
        if ($prefix !== '') {
            $prefix .= '_';
        }
        $bar = isset($row[$prefix . 'barangay']) ? trim((string) $row[$prefix . 'barangay']) : '';
        $mun = isset($row[$prefix . 'municipality']) ? trim((string) $row[$prefix . 'municipality']) : '';
        $prov = isset($row[$prefix . 'province']) ? trim((string) $row[$prefix . 'province']) : '';
        $addr = isset($row['address']) ? trim((string) $row['address']) : '';
        if ($addr !== '') {
            $parts[] = $addr;
        }
        if ($bar !== '' || $mun !== '' || $prov !== '') {
            $parts[] = trim(implode(', ', array_filter([$bar, $mun, $prov])));
        }
        $out = trim(implode(' — ', array_filter($parts)));
        return $out !== '' ? $out : 'N/A';
    }
}
