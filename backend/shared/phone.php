<?php
/**
 * shared/phone.php — Philippine mobile number normalisation.
 *
 * WHY THIS EXISTS: phone numbers are only usable as a login identifier if
 * "09171234567", "+639171234567", "0917 123 4567" and "0917-123-4567" all resolve
 * to the SAME stored value. Otherwise one person creates several accounts and
 * "log in with your number" silently fails for them.
 *
 * Canonical form: 09XXXXXXXXX (11 digits) — what Filipinos actually type and read.
 *
 * Accepted inputs (all → 09171234567):
 *   09171234567        local
 *   +639171234567      international
 *   639171234567       international, no +
 *   9171234567         missing leading 0
 *   0917 123 4567      spaces
 *   0917-123-4567      dashes
 *   (0917) 123-4567    brackets
 */

/**
 * @return string|null canonical 09XXXXXXXXX, or null when it isn't a valid PH mobile.
 */
function carelink_normalize_ph_mobile(?string $raw): ?string
{
    if ($raw === null) return null;

    // Strip everything that isn't a digit or a leading +.
    $s = trim($raw);
    $plus = str_starts_with($s, '+');
    $d = preg_replace('/\D/', '', $s);
    if ($d === '' || $d === null) return null;

    // 63 9XX XXX XXXX  ->  09XX XXX XXXX
    if (str_starts_with($d, '63') && strlen($d) === 12) {
        $d = '0' . substr($d, 2);
    } elseif ($plus && str_starts_with($d, '63')) {
        // "+63..." with a wrong length — reject rather than guess.
        return null;
    } elseif (strlen($d) === 10 && str_starts_with($d, '9')) {
        // 9XX XXX XXXX -> prepend the 0 the user dropped.
        $d = '0' . $d;
    }

    // PH mobiles are exactly 11 digits and always start 09.
    if (!preg_match('/^09\d{9}$/', $d)) return null;

    return $d;
}

/** True when $raw is a valid PH mobile in any accepted format. */
function carelink_is_valid_ph_mobile(?string $raw): bool
{
    return carelink_normalize_ph_mobile($raw) !== null;
}

/** Pretty form for display/emails: 0917 123 4567. */
function carelink_format_ph_mobile(?string $raw): ?string
{
    $n = carelink_normalize_ph_mobile($raw);
    if ($n === null) return null;
    return substr($n, 0, 4) . ' ' . substr($n, 4, 3) . ' ' . substr($n, 7, 4);
}

/** True when the string looks like a phone attempt rather than an email. */
function carelink_looks_like_phone(string $s): bool
{
    return !str_contains($s, '@') && preg_match('/^[\d\s\-\+\(\)]+$/', trim($s)) === 1;
}
