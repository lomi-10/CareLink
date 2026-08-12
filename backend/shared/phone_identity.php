<?php
/**
 * shared/phone_identity.php — one mobile number, one account.
 *
 * WHY THIS EXISTS: users.phone has a UNIQUE index and signup.php checks it, but
 * the signup field is optional and almost nobody fills it. Real numbers are
 * entered later in the PROFILE, as helper_profiles/parent_profiles
 * .contact_number — which had no uniqueness check and never synced to
 * users.phone. Net effect: the unique index guarded a column nothing wrote to,
 * and the same number could register a helper AND a parent account.
 *
 * Every profile save now routes through here, so the profile is the thing that
 * actually claims the number.
 */

require_once __DIR__ . '/phone.php';

if (!function_exists('carelink_phone_conflict')) {

    /**
     * Is this number already in use by someone else?
     * Checks users.phone AND both profile tables, because historical rows have
     * a contact_number with no matching users.phone.
     *
     * @return string|null  conflicting account type ('helper'|'parent'|...) or null
     */
    function carelink_phone_conflict(mysqli $conn, int $user_id, string $normalized): ?string
    {
        if ($normalized === '') return null;

        // users.phone is now the single source of truth (see
        // database/migration_2026_08_06_phone_normalization.sql). This used to
        // also scan helper_profiles.contact_number and parent_profiles
        // .contact_number, because the same number lived in three columns that
        // nothing kept in agreement. With the copies backfilled into
        // users.phone and no longer written, one lookup is both correct and
        // able to use the UNIQUE index instead of two EXISTS subqueries.
        $sql = "SELECT u.user_type
                  FROM users u
                 WHERE u.user_id <> ? AND u.phone = ?
                 LIMIT 1";
        $st = $conn->prepare($sql);
        if (!$st) return null; // never block a save because of a lookup failure
        $st->bind_param('is', $user_id, $normalized);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();

        return $row ? (string) $row['user_type'] : null;
    }

    /**
     * Claim the number for this user: verifies it's free, then mirrors it into
     * users.phone so phone login and the UNIQUE index actually work.
     *
     * @return array{ok:bool, message:?string}
     */
    function carelink_claim_phone(mysqli $conn, int $user_id, ?string $rawOrNormalized): array
    {
        $normalized = carelink_normalize_ph_mobile((string) $rawOrNormalized);

        // Cleared number: release it so it can be reused by its real owner.
        if ($normalized === null || $normalized === '') {
            $st = $conn->prepare("UPDATE users SET phone = NULL WHERE user_id = ?");
            if ($st) { $st->bind_param('i', $user_id); $st->execute(); $st->close(); }
            return ['ok' => true, 'message' => null];
        }

        $conflict = carelink_phone_conflict($conn, $user_id, $normalized);
        if ($conflict !== null) {
            $who = $conflict === 'helper' ? 'a helper account'
                 : ($conflict === 'parent' ? 'an employer account' : 'another account');
            return [
                'ok' => false,
                'message' => 'This mobile number is already registered to ' . $who
                    . '. Each number can only be used by one CareLink account — please use a different number.',
            ];
        }

        $st = $conn->prepare("UPDATE users SET phone = ? WHERE user_id = ?");
        if ($st) {
            $st->bind_param('si', $normalized, $user_id);
            // A race between two saves is caught by the UNIQUE index; treat a
            // failure here as a conflict rather than silently carrying on.
            if (!$st->execute()) {
                $st->close();
                return ['ok' => false, 'message' => 'This mobile number is already registered to another account.'];
            }
            $st->close();
        }

        return ['ok' => true, 'message' => null];
    }
}
