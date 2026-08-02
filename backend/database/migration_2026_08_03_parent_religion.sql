-- =============================================================================
-- CareLink — parent religion (2026-08-03)
-- Run ONCE in phpMyAdmin -> your DB -> SQL tab.
--
-- Employers can now state their religion, the same as helpers already can.
-- It helps both sides judge fit (household practices, dietary rules, rest days
-- around worship) before anyone commits to a placement.
--
-- Optional field, and SAFE TO RE-RUN.
-- =============================================================================

SET @db := DATABASE();

SET @needs_col := (SELECT COUNT(*) = 0 FROM information_schema.columns
  WHERE table_schema = @db AND table_name = 'parent_profiles' AND column_name = 'religion');
SET @sql := IF(@needs_col,
  "ALTER TABLE parent_profiles ADD COLUMN religion VARCHAR(50) NULL DEFAULT NULL COMMENT 'Optional; helps judge household fit' AFTER bio",
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Expect 1.
SELECT COUNT(*) AS parent_religion_column_expect_1
  FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'parent_profiles' AND column_name = 'religion';
