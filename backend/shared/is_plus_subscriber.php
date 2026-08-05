<?php
/**
 * shared/is_plus_subscriber.php — CareLink Plus entitlement checks.
 *
 * One rule, used everywhere: a subscriber is someone whose paid period has not
 * ended yet. A CANCELLED subscription still counts until current_period_end —
 * they paid for that time. That's why every check tests the period end and not
 * status alone.
 *
 * Helpers can never hold a subscription; every caller passes an employer id.
 */

require_once __DIR__ . '/../load_config.php';
require_once __DIR__ . '/subscriptions_table.php';

if (!function_exists('carelink_is_plus_subscriber')) {

    function carelink_is_plus_subscriber(mysqli $conn, int $user_id): bool
    {
        if ($user_id <= 0) return false;
        ensure_subscriptions_table($conn);

        $st = $conn->prepare(
            "SELECT subscription_id
               FROM subscriptions
              WHERE user_id = ?
                AND status IN ('active','cancelled')
                AND current_period_end > NOW()
              LIMIT 1"
        );
        // Missing table (migration not run yet) must degrade to "not a
        // subscriber" rather than take a page down.
        if (!$st) return false;

        $st->bind_param('i', $user_id);
        if (!$st->execute()) { $st->close(); return false; }
        $row = $st->get_result()->fetch_assoc();
        $st->close();

        return (bool) $row;
    }

    /**
     * Spend one of the 3 monthly featured-post credits.
     * @return bool true if a credit was consumed (so the caller must NOT charge).
     */
    function carelink_spend_featured_credit(mysqli $conn, int $user_id): bool
    {
        if (!carelink_is_plus_subscriber($conn, $user_id)) return false;

        // Roll the monthly allowance over first if the window has passed.
        $reset = $conn->prepare(
            "UPDATE subscriptions
                SET featured_credits_remaining = 3,
                    featured_credits_reset_at  = DATE_ADD(NOW(), INTERVAL 1 MONTH)
              WHERE user_id = ?
                AND (featured_credits_reset_at IS NULL OR featured_credits_reset_at <= NOW())"
        );
        if ($reset) {
            $reset->bind_param('i', $user_id);
            $reset->execute();
            $reset->close();
        }

        // Conditional decrement: the WHERE clause is the guard, so two taps in
        // quick succession can't spend the same credit twice.
        $st = $conn->prepare(
            "UPDATE subscriptions
                SET featured_credits_remaining = featured_credits_remaining - 1
              WHERE user_id = ?
                AND status IN ('active','cancelled')
                AND current_period_end > NOW()
                AND featured_credits_remaining > 0
              LIMIT 1"
        );
        if (!$st) return false;
        $st->bind_param('i', $user_id);
        $st->execute();
        $spent = $st->affected_rows > 0;
        $st->close();

        return $spent;
    }

    /** Full entitlement snapshot, for the subscription screen and feature gates. */
    function carelink_plus_status(mysqli $conn, int $user_id): array
    {
        $out = [
            'is_plus'            => false,
            'status'             => null,
            'started_at'         => null,
            'current_period_end' => null,
            'featured_credits'   => 0,
        ];
        if ($user_id <= 0) return $out;
        ensure_subscriptions_table($conn);

        $st = $conn->prepare(
            "SELECT status, started_at, current_period_end, featured_credits_remaining
               FROM subscriptions
              WHERE user_id = ?
              ORDER BY subscription_id DESC
              LIMIT 1"
        );
        if (!$st) return $out;
        $st->bind_param('i', $user_id);
        if (!$st->execute()) { $st->close(); return $out; }
        $row = $st->get_result()->fetch_assoc();
        $st->close();
        if (!$row) return $out;

        $out['status']             = $row['status'];
        $out['started_at']         = $row['started_at'];
        $out['current_period_end'] = $row['current_period_end'];
        $out['featured_credits']   = (int) $row['featured_credits_remaining'];
        $out['is_plus']            = in_array($row['status'], ['active', 'cancelled'], true)
                                     && strtotime((string) $row['current_period_end']) > time();
        return $out;
    }
}
