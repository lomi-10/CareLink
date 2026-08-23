<?php
/**
 * shared/verification_guard.php — is this account PESO-verified?
 *
 * CareLink's rule is that a helper or employer gets no platform features until
 * PESO has verified them; all a pending account may do is finish its profile
 * and wait. That rule was previously only expressed in the UI, so anything that
 * reached an endpoint directly bypassed it entirely.
 *
 * STAFF ARE DELIBERATELY EXEMPT. A pending helper must be able to ask PESO why
 * their document was rejected, and a PESO officer must be able to request more
 * information from someone who is — by definition — not yet verified. Gating
 * staff conversations would break the only channel a pending user has, which is
 * the opposite of protecting them.
 */

if (!function_exists('carelink_verification_status')) {

    /**
     * PESO verification status for any account.
     *
     * Staff (peso/admin) have no profile row and are never "pending" in this
     * sense, so they report as Verified — they are vetted when their account is
     * created, not through this queue.
     *
     * @return string 'Verified' | 'Pending' | 'Rejected' | 'Unverified'
     */
    function carelink_verification_status(mysqli $conn, int $userId): string
    {
        if ($userId <= 0) return 'Unverified';

        $st = $conn->prepare(
            "SELECT u.user_type,
                    COALESCE(hp.verification_status, pp.verification_status) AS vs
               FROM users u
               LEFT JOIN helper_profiles hp ON hp.user_id = u.user_id
               LEFT JOIN parent_profiles pp ON pp.user_id = u.user_id
              WHERE u.user_id = ?
              LIMIT 1"
        );
        if (!$st) return 'Unverified';
        $st->bind_param('i', $userId);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();

        if (!$row) return 'Unverified';
        if (in_array($row['user_type'], ['peso', 'admin'], true)) return 'Verified';

        return (string) ($row['vs'] ?: 'Unverified');
    }

    /** True only when PESO has actually verified this account. */
    function carelink_is_verified(mysqli $conn, int $userId): bool
    {
        return carelink_verification_status($conn, $userId) === 'Verified';
    }

    /** True when this account is staff, who are exempt from the gate. */
    function carelink_is_staff_account(mysqli $conn, int $userId): bool
    {
        $st = $conn->prepare("SELECT user_type FROM users WHERE user_id = ? LIMIT 1");
        if (!$st) return false;
        $st->bind_param('i', $userId);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();
        return $row && in_array($row['user_type'], ['peso', 'admin'], true);
    }
}
