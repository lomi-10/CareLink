<?php
/**
 * shared/revenue_gates.php — one switch for the paid RESTRICTIONS.
 *
 * The distinction that matters:
 *   • Purchase screens (boost, CareLink Plus, placement fee) are ALWAYS live.
 *     The revenue model is real and demonstrable at any time.
 *   • The restrictions Plus lifts (3-post cap, 6-month history, payroll export)
 *     are OFF by default and only apply when this returns true.
 *
 * Why: UAT should measure the product, not the paywall. Acceptance scores
 * collected against artificial friction would say more about the business model
 * than the system. So testers run on an unrestricted free tier, while the
 * defense demo can still show a working purchase flow.
 *
 * Turn on after UAT by adding to backend/config.local.php:
 *     'REVENUE_GATES_ENABLED' => '1',
 *
 * Nothing here ever gates a safety feature. Verification, matching, contracts,
 * signing, messaging, the shared placement record, document pre-screening and
 * CareBot are free at every tier, always.
 */

require_once __DIR__ . '/../load_config.php';

if (!function_exists('carelink_revenue_gates_enabled')) {

    function carelink_revenue_gates_enabled(): bool
    {
        $v = strtolower(trim((string) carelink_cfg('REVENUE_GATES_ENABLED', '0')));
        return in_array($v, ['1', 'true', 'yes', 'on'], true);
    }

    /** Open job posts a free account may hold. Unlimited for Plus. */
    const FREE_TIER_MAX_OPEN_JOBS = 3;

    /** Months of placement history a free account can see. */
    const FREE_TIER_HISTORY_MONTHS = 6;

    /**
     * May this employer open another job post?
     * @return array{allowed:bool, reason:?string}
     */
    function carelink_can_post_job(mysqli $conn, int $parent_id): array
    {
        if (!carelink_revenue_gates_enabled()) {
            return ['allowed' => true, 'reason' => null];
        }

        require_once __DIR__ . '/is_plus_subscriber.php';
        if (carelink_is_plus_subscriber($conn, $parent_id)) {
            return ['allowed' => true, 'reason' => null];
        }

        $st = $conn->prepare(
            "SELECT COUNT(*) AS c FROM job_posts
              WHERE parent_id = ? AND status IN ('Open','Pending')"
        );
        if (!$st) return ['allowed' => true, 'reason' => null]; // never block on an error
        $st->bind_param('i', $parent_id);
        $st->execute();
        $count = (int) ($st->get_result()->fetch_assoc()['c'] ?? 0);
        $st->close();

        if ($count < FREE_TIER_MAX_OPEN_JOBS) {
            return ['allowed' => true, 'reason' => null];
        }
        return [
            'allowed' => false,
            'reason'  => 'Free accounts can have ' . FREE_TIER_MAX_OPEN_JOBS
                . ' open job posts at a time. Close one, or upgrade to CareLink Plus for unlimited posts.',
        ];
    }

    /** Cut-off date for placement history, or null when unrestricted. */
    function carelink_history_cutoff(mysqli $conn, int $parent_id): ?string
    {
        if (!carelink_revenue_gates_enabled()) return null;

        require_once __DIR__ . '/is_plus_subscriber.php';
        if (carelink_is_plus_subscriber($conn, $parent_id)) return null;

        return date('Y-m-d H:i:s', strtotime('-' . FREE_TIER_HISTORY_MONTHS . ' months'));
    }

    /** Payroll export (PDF/CSV) is a Plus feature; viewing payroll never is. */
    function carelink_can_export_payroll(mysqli $conn, int $parent_id): bool
    {
        if (!carelink_revenue_gates_enabled()) return true;
        require_once __DIR__ . '/is_plus_subscriber.php';
        return carelink_is_plus_subscriber($conn, $parent_id);
    }
}
