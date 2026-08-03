-- =============================================================================
-- CareLink — parent religion (2026-08-03)
--
-- Employers can state their religion, the same as helpers already can. It helps
-- both sides judge household fit (practices, dietary rules, rest days around
-- worship) before anyone commits to a placement. Optional field.
--
-- HOW TO RUN: phpMyAdmin -> your database -> SQL tab -> paste -> Go.
--
-- IF YOU SEE "Duplicate column name 'religion'":
--   That means it is ALREADY applied. Nothing is wrong, nothing was damaged —
--   just move on. MySQL has no "add column only if missing", and the usual
--   workaround reads information_schema, which Hostinger's database user is not
--   allowed to touch. A plain statement plus this note is the honest tradeoff.
-- =============================================================================

ALTER TABLE parent_profiles
  ADD COLUMN religion VARCHAR(50) NULL DEFAULT NULL
  COMMENT 'Optional; helps judge household fit' AFTER bio;


-- Check it worked. Expect one row named "religion".
SHOW COLUMNS FROM parent_profiles LIKE 'religion';
