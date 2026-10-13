-- Manual fallback for a database where backend/migrate.php cannot be called.
-- Check first with:
--   SHOW COLUMNS FROM helper_profiles LIKE 'availability_status';
-- Run this ALTER only when that query returns no rows. It is intentionally
-- written without ADD COLUMN IF NOT EXISTS for compatibility with older MySQL.
ALTER TABLE `helper_profiles`
  ADD COLUMN `availability_status` enum('Available','Currently Employed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Available';
