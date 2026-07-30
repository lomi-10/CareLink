-- migration_2026_07_19_verified_field_change.sql
-- Adds support for verified email + contact-number changes from the profile editor.
--
-- 1. auth_codes.purpose gains two new purposes:
--      email_change   — code sent to the NEW email address (proves ownership).
--      contact_change — code sent to the user's CURRENT verified email (proves owner).
-- 2. auth_codes gains pending_value: the exact new value a code was issued for, so a
--    code issued for one value can never confirm a different one.
--
-- Safe to run on prod: purely additive (enum widened, nullable column added).

ALTER TABLE auth_codes
  MODIFY COLUMN purpose ENUM('verify_email','password_reset','email_change','contact_change') NOT NULL;

ALTER TABLE auth_codes
  ADD COLUMN pending_value VARCHAR(255) NULL AFTER code_hash;
