-- =============================================================================
-- CareLink — revenue model (2026-08-02)
-- Run ONCE in phpMyAdmin -> your DB -> SQL tab. BACK UP FIRST.
--
-- Purely additive: adds two columns and two tables. Touches no existing data,
-- no matching logic, no contract logic, no verification logic.
--
-- All money is charged to EMPLOYER (parent) accounts only. Nothing here
-- references helper_id as a payer — helpers are never charged, per RA 8042 /
-- RA 10364.
-- =============================================================================


-- 1 ── STREAM 1: FEATURED JOB POSTS ──────────────────────────────────────────
-- A boost only affects SORT ORDER in browse. It never changes match_score and
-- never bypasses PESO review (a post must already be status='Open' to surface).
--
-- SAFE TO RE-RUN. MySQL 8 has no "ADD COLUMN IF NOT EXISTS", so each change is
-- guarded by an information_schema check and only executed when missing.
-- Re-running this file is a no-op rather than a "Duplicate column name" error.

SET @db := DATABASE();

SET @needs_col := (SELECT COUNT(*) = 0 FROM information_schema.columns
  WHERE table_schema = @db AND table_name = 'job_posts' AND column_name = 'featured_until');
SET @sql := IF(@needs_col,
  "ALTER TABLE job_posts ADD COLUMN featured_until DATETIME NULL DEFAULT NULL COMMENT 'Boost expiry; NULL = never boosted' AFTER expires_at",
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @needs_col := (SELECT COUNT(*) = 0 FROM information_schema.columns
  WHERE table_schema = @db AND table_name = 'job_posts' AND column_name = 'featured_boost_paid_at');
SET @sql := IF(@needs_col,
  "ALTER TABLE job_posts ADD COLUMN featured_boost_paid_at DATETIME NULL DEFAULT NULL COMMENT 'When the boost payment settled' AFTER featured_until",
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Browse filters on status and reads featured_until on every row.
SET @needs_idx := (SELECT COUNT(*) = 0 FROM information_schema.statistics
  WHERE table_schema = @db AND table_name = 'job_posts' AND index_name = 'idx_featured');
SET @sql := IF(@needs_idx,
  'ALTER TABLE job_posts ADD INDEX idx_featured (status, featured_until)',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;


-- 2 ── STREAM 2: CARELINK PLUS SUBSCRIPTIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id                   INT NOT NULL,
  plan_type                 ENUM('carelink_plus') NOT NULL DEFAULT 'carelink_plus',
  status                    ENUM('active','cancelled','expired','past_due') NOT NULL DEFAULT 'active',
  started_at                DATETIME NOT NULL,
  current_period_end        DATETIME NOT NULL,
  cancelled_at              DATETIME NULL DEFAULT NULL,
  paymongo_subscription_id  VARCHAR(255) NULL DEFAULT NULL,
  featured_credits_remaining INT NOT NULL DEFAULT 3,
  featured_credits_reset_at DATETIME NULL DEFAULT NULL,
  created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- A cancelled subscriber keeps access until current_period_end, so lookups
  -- are always "status + period end", never status alone.
  INDEX idx_user_status (user_id, status, current_period_end),
  CONSTRAINT fk_subs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- 3 ── STREAM 3: PLACEMENT SUCCESS FEES ──────────────────────────────────────
-- peso_share_amount ACCUMULATES here. It is never disbursed automatically —
-- payout requires a signed MOA with PESO Ormoc City.
CREATE TABLE IF NOT EXISTS placement_fees (
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
  -- One fee per placement: the trigger fires on contract completion, which can
  -- be retried, and a duplicate charge would be a real-money bug.
  UNIQUE KEY uniq_placement_fee (placement_id),
  INDEX idx_parent_status (parent_id, status),
  CONSTRAINT fk_fees_placement FOREIGN KEY (placement_id) REFERENCES placements(placement_id) ON DELETE CASCADE,
  CONSTRAINT fk_fees_parent    FOREIGN KEY (parent_id)    REFERENCES users(user_id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- 4 ── PAYMENT EVENT LOG ─────────────────────────────────────────────────────
-- Webhooks arrive more than once by design, so every handler is idempotent and
-- records what it saw here. Never stores card data — PayMongo ids only.
CREATE TABLE IF NOT EXISTS payment_events (
  event_id          INT AUTO_INCREMENT PRIMARY KEY,
  paymongo_event_id VARCHAR(255) NOT NULL,
  event_type        VARCHAR(64) NOT NULL,
  reference_type    VARCHAR(32) NULL COMMENT 'boost | placement_fee | subscription',
  reference_id      INT NULL,
  payload_summary   TEXT NULL COMMENT 'Sanitised. No payment method details.',
  received_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_event (paymongo_event_id),
  INDEX idx_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ── CHECK YOUR WORK ─────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'job_posts'
      AND column_name IN ('featured_until','featured_boost_paid_at'))       AS job_post_cols_expect_2,
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('subscriptions','placement_fees','payment_events')) AS new_tables_expect_3;
