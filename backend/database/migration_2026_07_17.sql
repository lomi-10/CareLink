-- =============================================================================
-- CareLink — production migration (2026-07-17)
-- Run ONCE in Hostinger hPanel -> Databases -> phpMyAdmin -> your DB -> SQL tab.
--
-- BACK UP FIRST: phpMyAdmin -> Export -> Go. Takes 10 seconds, saves your thesis.
--
-- Paste this whole file and press Go. Safe to run on a live database: it only
-- ADDS columns and never deletes a row.
--
-- Covers everything built this session:
--   1. Kinsenas (semi-monthly) salary period
--   2. Stay-in / Stay-out rename
--   3. Email verification (+ grandfathering every existing user)
--   4. One-time codes table (verification + password reset)
--   5. Phone as a login identifier (+ safe backfill)
-- =============================================================================


-- 1 ── KINSENAS ───────────────────────────────────────────────────────────────
-- Adds 'Semi-monthly' to the payout schedule. Existing values are untouched.
ALTER TABLE job_posts
  MODIFY COLUMN salary_period ENUM('Daily','Weekly','Semi-monthly','Monthly')
  NULL DEFAULT 'Monthly';


-- 2 ── STAY-IN / STAY-OUT ─────────────────────────────────────────────────────
-- Widen -> migrate -> shrink. Doing the shrink alone would WIPE the work
-- preference of every helper still marked Live-in/Live-out.
-- (If this already shows Stay-in/Stay-out on production, these 4 statements are
--  harmless no-ops — run them anyway.)
ALTER TABLE helper_profiles
  MODIFY COLUMN employment_type ENUM('Live-in','Live-out','Stay-in','Stay-out','Any')
  NULL DEFAULT 'Any';

UPDATE helper_profiles SET employment_type = 'Stay-in'  WHERE employment_type = 'Live-in';
UPDATE helper_profiles SET employment_type = 'Stay-out' WHERE employment_type = 'Live-out';

ALTER TABLE helper_profiles
  MODIFY COLUMN employment_type ENUM('Stay-in','Stay-out','Any')
  NULL DEFAULT 'Any';


-- 3 ── EMAIL VERIFICATION ─────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN email_verified_at DATETIME NULL DEFAULT NULL AFTER email;

-- CRITICAL: grandfather everyone who registered before verification existed.
-- login.php blocks any account with a NULL here — without this UPDATE, every
-- current user (including your demo accounts) is locked out the moment you
-- upload the new auth files.
UPDATE users
   SET email_verified_at = COALESCE(created_at, NOW())
 WHERE email_verified_at IS NULL;


-- 4 ── ONE-TIME CODES (verification + password reset) ──────────────────────────
CREATE TABLE IF NOT EXISTS auth_codes (
  code_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  purpose     ENUM('verify_email','password_reset') NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,   -- hashed, never plaintext
  expires_at  DATETIME NOT NULL,
  consumed_at DATETIME NULL DEFAULT NULL,
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_purpose (user_id, purpose),
  INDEX idx_expires (expires_at),
  CONSTRAINT fk_auth_codes_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 5 ── PHONE LOGIN ────────────────────────────────────────────────────────────
-- Canonical format 09XXXXXXXXX. UNIQUE still allows many NULLs, so users without
-- a number simply don't use phone login.
ALTER TABLE users
  ADD COLUMN phone VARCHAR(11) NULL DEFAULT NULL AFTER email;

ALTER TABLE users
  ADD UNIQUE KEY uk_users_phone (phone);

-- Backfill from existing profile contact numbers, but ONLY where it's safe:
--   • the number is a real PH mobile (09XXXXXXXXX, or +639XXXXXXXXX normalised)
--   • exactly ONE account uses it — a number shared by 6 accounts can't identify
--     anyone, and would break the UNIQUE key anyway
-- Everything else is left alone: those users keep signing in with their email and
-- can add a number later. No profile data is modified.
UPDATE users u
  JOIN (
    SELECT num, MIN(user_id) AS user_id
      FROM (
        SELECT user_id,
               CASE WHEN contact_number LIKE '+63%' THEN CONCAT('0', SUBSTRING(contact_number, 4))
                    ELSE contact_number END AS num
          FROM parent_profiles
         WHERE contact_number IS NOT NULL AND contact_number <> ''
        UNION ALL
        SELECT user_id,
               CASE WHEN contact_number LIKE '+63%' THEN CONCAT('0', SUBSTRING(contact_number, 4))
                    ELSE contact_number END AS num
          FROM helper_profiles
         WHERE contact_number IS NOT NULL AND contact_number <> ''
      ) normalised
     WHERE num REGEXP '^09[0-9]{9}$'
     GROUP BY num
    HAVING COUNT(DISTINCT user_id) = 1
  ) safe ON safe.user_id = u.user_id
   SET u.phone = safe.num
 WHERE u.phone IS NULL;


-- ── CHECK YOUR WORK ──────────────────────────────────────────────────────────
-- Run these after. Expect: verified = total, and 0 rows with a NULL verified.
SELECT COUNT(*) AS total_users,
       SUM(email_verified_at IS NOT NULL) AS verified,
       SUM(phone IS NOT NULL)             AS with_phone_login
  FROM users;
