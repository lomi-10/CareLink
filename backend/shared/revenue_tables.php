<?php
/**
 * shared/revenue_tables.php — every table the revenue flow needs, created on
 * demand (no migration run required).
 *
 * WHY THIS EXISTS: these tables were only ever defined in
 * database/migration_2026_08_02_revenue.sql, which has to be pasted into
 * phpMyAdmin by hand. On any database where that was never run, the failure
 * was SILENT and total:
 *
 *   webhooks/paymongo.php calls wh_claim_event() -> prepare() fails because
 *   payment_events does not exist -> returns false -> the handler reads that
 *   as "already processed", replies 200 "Duplicate event ignored", and exits
 *   WITHOUT granting anything.
 *
 * So PayMongo took the payment, emailed its receipt, got a 200 back, and never
 * retried — while the app granted nothing and, with no subscription row to
 * find, kept offering the upgrade forever. Creating the tables here means the
 * flow cannot fail that way again on a fresh deploy.
 *
 * payment_checkouts is new: it records the checkout session we sent a user to,
 * which is what lets us reconcile a payment WITHOUT a webhook (see
 * parent/confirm_subscription.php) and lets a repeat tap reuse the same
 * session instead of opening a second one.
 */

require_once __DIR__ . '/subscriptions_table.php';

if (!function_exists('ensure_revenue_tables')) {
    function ensure_revenue_tables(mysqli $conn): void
    {
        ensure_subscriptions_table($conn);

        // PayMongo retries by design, so every handler is idempotent and records
        // what it saw here. PayMongo ids only — never card data.
        $conn->query(
            "CREATE TABLE IF NOT EXISTS payment_events (
                event_id          INT AUTO_INCREMENT PRIMARY KEY,
                paymongo_event_id VARCHAR(255) NOT NULL,
                event_type        VARCHAR(64) NOT NULL,
                reference_type    VARCHAR(32) NULL COMMENT 'boost | placement_fee | subscription',
                reference_id      INT NULL,
                payload_summary   TEXT NULL COMMENT 'Sanitised. No payment method details.',
                received_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_event (paymongo_event_id),
                INDEX idx_type (event_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );

        // peso_share_amount ACCUMULATES here. Never disbursed automatically —
        // payout requires a signed MOA with PESO Ormoc City.
        // No FK constraints: this may be created before placements exists on a
        // partially-migrated database, and a failed FK would abort the CREATE.
        $conn->query(
            "CREATE TABLE IF NOT EXISTS placement_fees (
                fee_id                INT AUTO_INCREMENT PRIMARY KEY,
                placement_id          INT NOT NULL,
                parent_id             INT NOT NULL COMMENT 'Payer. Never a helper.',
                gross_amount          DECIMAL(10,2) NOT NULL,
                peso_share_amount     DECIMAL(10,2) NOT NULL,
                platform_share_amount DECIMAL(10,2) NOT NULL,
                status                ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
                paymongo_payment_id   VARCHAR(255) NULL DEFAULT NULL,
                paid_at               DATETIME NULL DEFAULT NULL,
                refunded_at           DATETIME NULL DEFAULT NULL,
                created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_placement_fee (placement_id),
                INDEX idx_parent_status (parent_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );

        // One row per checkout session we hand a user. Two jobs:
        //  1. lets us ASK PayMongo whether it was paid, so settlement no longer
        //     depends on a webhook reaching this server at all;
        //  2. the `status` column is the idempotency guard shared by the webhook
        //     and the confirm endpoint, so a payment grants exactly one month
        //     no matter how many times either path runs.
        $conn->query(
            "CREATE TABLE IF NOT EXISTS payment_checkouts (
                checkout_id   INT AUTO_INCREMENT PRIMARY KEY,
                session_id    VARCHAR(255) NOT NULL,
                user_id       INT NOT NULL,
                kind          VARCHAR(32) NOT NULL COMMENT 'subscription | boost | placement_fee',
                reference_id  INT NULL,
                checkout_url  TEXT NULL,
                status        ENUM('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                settled_at    DATETIME NULL DEFAULT NULL,
                UNIQUE KEY uniq_session (session_id),
                INDEX idx_user_kind (user_id, kind, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }
}
