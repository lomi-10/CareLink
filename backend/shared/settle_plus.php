<?php
/**
 * shared/settle_plus.php — the single place a CareLink Plus payment is turned
 * into entitlement.
 *
 * Two things can settle a payment:
 *   1. webhooks/paymongo.php   — PayMongo tells us (needs the webhook to be
 *                                registered AND reachable AND signed correctly)
 *   2. parent/confirm_subscription.php — we ask PayMongo directly when the user
 *                                returns from checkout
 *
 * Path 2 exists because path 1 has three ways to silently not happen, and when
 * it doesn't, the employer has paid real money and received nothing. Asking
 * PayMongo on return removes that whole class of failure.
 *
 * Both paths call carelink_settle_plus(), which grants exactly one month per
 * checkout session no matter how many times it is called or by which path.
 */

require_once __DIR__ . '/revenue_tables.php';
require_once __DIR__ . '/create_notification.php';
require_once __DIR__ . '/paymongo.php';

if (!function_exists('carelink_settle_plus')) {

    /**
     * Claim a checkout session for settlement.
     *
     * The UPDATE is the lock: only the caller that flips 'pending' -> 'paid'
     * gets a true back, so the webhook and the confirm endpoint racing on the
     * same payment can never both grant a month.
     *
     * @return bool true = you won the claim and must now grant.
     */
    function carelink_claim_checkout(mysqli $conn, string $sessionId, int $userId, string $kind): bool
    {
        if ($sessionId === '') return false;

        $st = $conn->prepare(
            "UPDATE payment_checkouts
                SET status = 'paid', settled_at = NOW()
              WHERE session_id = ? AND status = 'pending'"
        );
        if (!$st) return false;
        $st->bind_param('s', $sessionId);
        $st->execute();
        $won = $st->affected_rows > 0;
        $st->close();
        if ($won) return true;

        // No pending row flipped. Either it was already settled (do nothing), or
        // we never recorded this session — which happens for a payment started
        // before this table existed. Insert it as already-paid so the first
        // caller grants and every later one is deduplicated by the unique key.
        $chk = $conn->prepare("SELECT status FROM payment_checkouts WHERE session_id = ? LIMIT 1");
        if (!$chk) return false;
        $chk->bind_param('s', $sessionId);
        $chk->execute();
        $row = $chk->get_result()->fetch_assoc();
        $chk->close();

        if ($row) return false; // already 'paid' — a previous call granted it

        $ins = $conn->prepare(
            "INSERT IGNORE INTO payment_checkouts
                (session_id, user_id, kind, status, settled_at)
             VALUES (?, ?, ?, 'paid', NOW())"
        );
        if (!$ins) return false;
        $ins->bind_param('sis', $sessionId, $userId, $kind);
        $ins->execute();
        $inserted = $ins->affected_rows > 0;
        $ins->close();

        return $inserted;
    }

    /**
     * Add one month of CareLink Plus.
     *
     * Extends from current_period_end rather than NOW so renewing early never
     * costs the employer the days they already paid for.
     */
    function carelink_grant_plus_month(mysqli $conn, int $parentId): void
    {
        if ($parentId <= 0) return;
        ensure_subscriptions_table($conn);

        $existing = $conn->prepare(
            "SELECT subscription_id, current_period_end FROM subscriptions
              WHERE user_id = ? ORDER BY subscription_id DESC LIMIT 1"
        );
        if (!$existing) return;
        $existing->bind_param('i', $parentId);
        $existing->execute();
        $row = $existing->get_result()->fetch_assoc();
        $existing->close();

        if ($row && strtotime((string) $row['current_period_end']) > time()) {
            $ext = $conn->prepare(
                "UPDATE subscriptions
                    SET status = 'active', cancelled_at = NULL,
                        current_period_end = DATE_ADD(current_period_end, INTERVAL 1 MONTH),
                        featured_credits_remaining = featured_credits_remaining + 3
                  WHERE subscription_id = ?"
            );
            if ($ext) {
                $ext->bind_param('i', $row['subscription_id']);
                $ext->execute();
                $ext->close();
            }
            return;
        }

        // Expired or first purchase — a fresh period starting now.
        $ins = $conn->prepare(
            "INSERT INTO subscriptions
                (user_id, plan_type, status, started_at, current_period_end,
                 featured_credits_remaining, featured_credits_reset_at)
             VALUES (?, 'carelink_plus', 'active', NOW(),
                     DATE_ADD(NOW(), INTERVAL 1 MONTH), 3, DATE_ADD(NOW(), INTERVAL 1 MONTH))"
        );
        if ($ins) {
            $ins->bind_param('i', $parentId);
            $ins->execute();
            $ins->close();
        }
    }

    /**
     * Settle a paid CareLink Plus checkout: claim it, grant the month, notify.
     *
     * @return bool true if THIS call granted the month (false = already settled).
     */
    function carelink_settle_plus(mysqli $conn, string $sessionId, int $parentId): bool
    {
        if ($parentId <= 0) return false;
        ensure_revenue_tables($conn);

        if (!carelink_claim_checkout($conn, $sessionId, $parentId, 'subscription')) {
            return false;
        }

        carelink_grant_plus_month($conn, $parentId);

        if (function_exists('createNotification')) {
            createNotification(
                $conn, $parentId, 'payment', 'CareLink Plus is active',
                'Your payment went through. You have 3 featured post credits this month, '
                . 'unlimited open job posts, and priority PESO review.',
                null, null
            );
        }
        return true;
    }

    /** Has this checkout session actually been paid? */
    function carelink_checkout_is_paid(array $body): bool
    {
        $attrs = $body['data']['attributes'] ?? [];

        // A settled session carries at least one payment marked 'paid'.
        foreach (($attrs['payments'] ?? []) as $p) {
            if (($p['attributes']['status'] ?? '') === 'paid') return true;
        }
        // Belt and braces: some methods surface it on the intent instead.
        return (($attrs['payment_intent']['attributes']['status'] ?? '') === 'succeeded');
    }

    /**
     * Ask PayMongo about every checkout session still open for this employer and
     * settle any that were paid.
     *
     * Called both when the user returns from checkout AND before starting a new
     * checkout — the second one is what stops a user who already paid (but whose
     * webhook never landed) from being sent to pay a second time.
     *
     * @return bool true if this call granted a month.
     */
    function carelink_reconcile_plus(mysqli $conn, int $parentId): bool
    {
        if ($parentId <= 0 || !carelink_paymongo_configured()) return false;
        ensure_revenue_tables($conn);

        // Last 24h only — an older pending row is abandoned, and re-checking it
        // forever would mean a PayMongo round trip on every app focus.
        $st = $conn->prepare(
            "SELECT session_id FROM payment_checkouts
              WHERE user_id = ? AND kind = 'subscription' AND status = 'pending'
                AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
              ORDER BY checkout_id DESC LIMIT 5"
        );
        if (!$st) return false;
        $st->bind_param('i', $parentId);
        $st->execute();
        $res = $st->get_result();
        $sessions = [];
        while ($row = $res->fetch_assoc()) $sessions[] = (string) $row['session_id'];
        $st->close();

        $settled = false;
        foreach ($sessions as $sessionId) {
            $r = carelink_paymongo_request('GET', '/checkout_sessions/' . rawurlencode($sessionId));
            // Network/API hiccup: leave it pending and try again next time rather
            // than marking it cancelled and losing the user's money.
            if (!$r['ok']) continue;

            if (carelink_checkout_is_paid($r['body'] ?? [])) {
                if (carelink_settle_plus($conn, $sessionId, $parentId)) $settled = true;
            }
        }
        return $settled;
    }

    /** Record a checkout session we just handed the user, so it can be reconciled. */
    function carelink_record_checkout(
        mysqli $conn, string $sessionId, int $userId, string $kind, ?string $url = null, ?int $refId = null
    ): void {
        if ($sessionId === '') return;
        ensure_revenue_tables($conn);
        $st = $conn->prepare(
            "INSERT IGNORE INTO payment_checkouts (session_id, user_id, kind, reference_id, checkout_url)
             VALUES (?, ?, ?, ?, ?)"
        );
        if (!$st) return;
        $st->bind_param('sisis', $sessionId, $userId, $kind, $refId, $url);
        $st->execute();
        $st->close();
    }
}
