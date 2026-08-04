<?php
/**
 * shared/subscriptions_table.php — CareLink Plus entitlement records
 * (auto-created, no migration).
 *
 * WHY THIS EXISTS: every subscription file (subscribe.php, cancel_subscription.php,
 * webhooks/paymongo.php, is_plus_subscriber.php) already assumed this table's
 * existence and defended against it being MISSING by degrading to "not a
 * subscriber" — but nothing ever actually created it. The practical effect: the
 * webhook's INSERT/UPDATE against `subscriptions` fatals (caught, logged, 500 —
 * so PayMongo retries and fails identically every time), so a payment is taken
 * but the account is never marked Plus. `is_plus_subscriber()` then always
 * returns false, so the "already subscribed" gate in subscribe.php never
 * engages and every tap opens a brand new checkout — a paid-but-never-granted
 * subscription that looks purchasable indefinitely.
 */

if (!function_exists('ensure_subscriptions_table')) {
    function ensure_subscriptions_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS subscriptions (
                subscription_id            INT AUTO_INCREMENT PRIMARY KEY,
                user_id                    INT NOT NULL COMMENT 'employer (parent) account only',
                plan_type                  VARCHAR(32) NOT NULL DEFAULT 'carelink_plus',
                status                     ENUM('active','cancelled','past_due','expired') NOT NULL DEFAULT 'active',
                started_at                 DATETIME NOT NULL,
                current_period_end         DATETIME NOT NULL COMMENT 'access holds until this instant, cancelled or not',
                cancelled_at               DATETIME NULL,
                featured_credits_remaining INT NOT NULL DEFAULT 0 COMMENT '3 Featured Job Post boosts included per month',
                featured_credits_reset_at  DATETIME NULL,
                paymongo_subscription_id   VARCHAR(64) NULL,
                created_at                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user (user_id),
                INDEX idx_period_end (current_period_end)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}
