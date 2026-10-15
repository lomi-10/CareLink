-- Preserve the primary category for compatibility and record the full
-- category selection plus number of helper openings for each post.
ALTER TABLE `job_posts`
  ADD COLUMN `category_ids` json DEFAULT NULL COMMENT 'All selected ref_categories.category_id values',
  ADD COLUMN `slots` int unsigned NOT NULL DEFAULT '1' COMMENT 'Number of helpers hired through this post';

UPDATE `job_posts`
SET `category_ids` = JSON_ARRAY(`category_id`)
WHERE `category_ids` IS NULL OR JSON_LENGTH(`category_ids`) = 0;
