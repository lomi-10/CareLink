-- =============================================================================
-- CareLink — revenue model (2026-08-02)
--
-- Adds two columns and four tables. Touches no existing data, no matching
-- logic, no contract logic, no verification logic.
--
-- All money is charged to EMPLOYER (parent) accounts only. Nothing here
-- references a helper as a payer — helpers are never charged, per RA 8042 and
-- RA 10364.
--
-- HOW TO RUN: phpMyAdmin -> your database -> SQL tab -> paste ALL of it -> Go.
-- BACK UP FIRST: Export -> Go. Takes ten seconds.
--
-- IF YOU SEE "Duplicate column name" or "Table already exists":
--   That part is ALREADY applied. Nothing is broken. Delete the statements that
--   already ran and run the rest, or just run it again after removing section 1.
--   MySQL has no reliable "only if missing" for columns, and the usual
--   workaround reads information_schema, which Hostinger's database user is not
--   permitted to access.
-- =============================================================================


-- 1 ── STREAM 1: FEATURED JOB POSTS ──────────────────────────────────────────
-- A boost affects SORT ORDER only. It never changes match_score, and it never
-- bypasses PESO review — a post must already be 'Open' to be boosted at all.
ALTER TABLE job_posts
  ADD COLUMN featured_until DATETIME NULL DEFAULT NULL
      COMMENT 'Boost expiry; NULL = never boosted' AFTER expires_at,
  ADD COLUMN featured_boost_paid_at DATETIME NULL DEFAULT NULL
      COMMENT 'When the boost payment settled' AFTER featured_until;

ALTER TABLE job_posts
  ADD INDEX idx_featured (status, featured_until);


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
  -- A cancelled subscriber keeps access until current_period_end, so every
  -- lookup is "status + period end", never status alone.
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
  -- One fee per placement. The contract flow can retry, and a duplicate row
  -- here would mean charging someone twice for the same hire.
  UNIQUE KEY uniq_placement_fee (placement_id),
  INDEX idx_parent_status (parent_id, status),
  CONSTRAINT fk_fees_placement FOREIGN KEY (placement_id) REFERENCES placements(placement_id) ON DELETE CASCADE,
  CONSTRAINT fk_fees_parent    FOREIGN KEY (parent_id)    REFERENCES users(user_id)          ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- 4 ── PAYMENT EVENT LOG ─────────────────────────────────────────────────────
-- PayMongo retries webhooks by design, so every handler is idempotent and
-- records what it saw here. Stores PayMongo ids only — never card data.
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
-- Expect two rows (featured_until, featured_boost_paid_at).
SHOW COLUMNS FROM job_posts LIKE 'featured%';

-- Expect three rows.
SHOW TABLES LIKE 'subscriptions';
SHOW TABLES LIKE 'placement_fees';
SHOW TABLES LIKE 'payment_events';
