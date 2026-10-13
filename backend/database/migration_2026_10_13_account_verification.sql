-- Manual fallback if backend/migrate.php cannot be called.
-- Check each field first; only run its ALTER when that column is missing.
--   SHOW COLUMNS FROM users LIKE 'account_verified_at';
--   SHOW COLUMNS FROM users LIKE 'account_verification_channel';
--   SHOW COLUMNS FROM users LIKE 'email';
-- The email ALTER is only needed when Null is NO in the result.
ALTER TABLE `users`
  ADD COLUMN `account_verified_at` datetime DEFAULT NULL AFTER `email_verified_at`;

ALTER TABLE `users`
  ADD COLUMN `account_verification_channel` varchar(10) NOT NULL DEFAULT 'email'
  AFTER `account_verified_at`;

-- Existing unverified accounts with a mobile number already received SMS OTPs.
UPDATE `users`
SET `account_verification_channel` = 'sms'
WHERE `email_verified_at` IS NULL
  AND `phone` IS NOT NULL
  AND `phone` <> '';

-- Existing unique email indexes allow multiple NULL values in MySQL.
ALTER TABLE `users`
  MODIFY COLUMN `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL;

-- Preserve the verified status of accounts that used the existing email OTP.
UPDATE `users`
SET `account_verified_at` = `email_verified_at`
WHERE `email_verified_at` IS NOT NULL
  AND `account_verified_at` IS NULL;
