-- ===========================================================================
-- CareLink — complete fresh import for the LIVE database
-- Generated 2026-09-01 13:32 from the local `carelink` schema.
-- ===========================================================================
--
-- USE THIS, NOT database/current.sql.
--
--   current.sql is a July dump: 41 tables, and its helper_profiles and
--   parent_profiles still carry a contact_number column that has since been
--   dropped. Importing it would take the server BACKWARDS by 16 tables.
--   schema.sql is older still and does not even contain
--   task_checklist_items.
--
-- This file is generated from the working local database, so it is the
-- schema the code actually expects: all 57 tables.
--
-- WHAT IT DOES
--   1. DROPS every CareLink table and everything in them.
--   2. Recreates all 57 with the current structure.
--   3. Loads the job/skill reference data and the evaluation instrument.
--   4. Creates the four test accounts (password: CareLink!2026).
--
--   THIS DESTROYS ALL LIVE DATA. Export a backup first:
--     phpMyAdmin > Export > Go.
--
-- HOW TO RUN
--   phpMyAdmin > click the CareLink database > Import > choose this file > Go.
--   If the file is too large for Import, use the SQL tab and paste it.
--
-- AFTERWARDS
--   Re-run the deploy (Actions > Run workflow) so migrate.php confirms the
--   schema, then verify with:  php tools/schema-diff.php --token=<token>
-- ===========================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

-- ---------------------------------------------------------------------------
-- 1. Drop everything
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `application_document_shares`;
DROP TABLE IF EXISTS `application_flags`;
DROP TABLE IF EXISTS `application_tasks`;
DROP TABLE IF EXISTS `attendance_logs`;
DROP TABLE IF EXISTS `auth_codes`;
DROP TABLE IF EXISTS `auth_tokens`;
DROP TABLE IF EXISTS `complaint_actions`;
DROP TABLE IF EXISTS `complaints`;
DROP TABLE IF EXISTS `contract_signatures`;
DROP TABLE IF EXISTS `contracts`;
DROP TABLE IF EXISTS `credential_flags`;
DROP TABLE IF EXISTS `feedback_answers`;
DROP TABLE IF EXISTS `feedback_questions`;
DROP TABLE IF EXISTS `helper_jobs`;
DROP TABLE IF EXISTS `helper_languages`;
DROP TABLE IF EXISTS `helper_profiles`;
DROP TABLE IF EXISTS `helper_skills`;
DROP TABLE IF EXISTS `helper_work_history`;
DROP TABLE IF EXISTS `interview_feedback`;
DROP TABLE IF EXISTS `interview_notes`;
DROP TABLE IF EXISTS `interview_reviews`;
DROP TABLE IF EXISTS `interview_schedules`;
DROP TABLE IF EXISTS `job_applications`;
DROP TABLE IF EXISTS `job_invites`;
DROP TABLE IF EXISTS `job_posts`;
DROP TABLE IF EXISTS `job_views`;
DROP TABLE IF EXISTS `leave_requests`;
DROP TABLE IF EXISTS `log_trail`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `parent_children`;
DROP TABLE IF EXISTS `parent_elderly`;
DROP TABLE IF EXISTS `parent_household`;
DROP TABLE IF EXISTS `parent_profiles`;
DROP TABLE IF EXISTS `password_verify_attempts`;
DROP TABLE IF EXISTS `payment_checkouts`;
DROP TABLE IF EXISTS `payment_events`;
DROP TABLE IF EXISTS `peso_reports`;
DROP TABLE IF EXISTS `placement_fees`;
DROP TABLE IF EXISTS `placement_renewal_intent`;
DROP TABLE IF EXISTS `placement_reviews`;
DROP TABLE IF EXISTS `placement_settings`;
DROP TABLE IF EXISTS `placement_tasks`;
DROP TABLE IF EXISTS `placements`;
DROP TABLE IF EXISTS `ref_categories`;
DROP TABLE IF EXISTS `ref_jobs`;
DROP TABLE IF EXISTS `ref_languages`;
DROP TABLE IF EXISTS `ref_skills`;
DROP TABLE IF EXISTS `saved_jobs`;
DROP TABLE IF EXISTS `saved_profiles`;
DROP TABLE IF EXISTS `saved_searches`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `system_feedback`;
DROP TABLE IF EXISTS `task_checklist_items`;
DROP TABLE IF EXISTS `user_documents`;
DROP TABLE IF EXISTS `user_safety_flags`;
DROP TABLE IF EXISTS `users`;

-- ---------------------------------------------------------------------------
-- 2. Structure (57 tables)
-- ---------------------------------------------------------------------------

CREATE TABLE `application_document_shares` (
  `share_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL COMMENT 'job_applications.application_id this share belongs to',
  `document_id` int NOT NULL COMMENT 'user_documents.document_id the helper chose to share',
  `shared_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`share_id`),
  UNIQUE KEY `uk_app_document` (`application_id`,`document_id`) COMMENT 'A document is shared at most once per application',
  KEY `idx_ads_application` (`application_id`),
  KEY `idx_ads_document` (`document_id`),
  CONSTRAINT `fk_ads_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ads_document` FOREIGN KEY (`document_id`) REFERENCES `user_documents` (`document_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Per-application helper consent: which verified documents are visible to that specific employer';

CREATE TABLE `application_flags` (
  `flag_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `flagged_by` int NOT NULL,
  `reason` varchar(500) NOT NULL,
  `status` enum('active','cleared') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cleared_at` datetime DEFAULT NULL,
  PRIMARY KEY (`flag_id`),
  KEY `application_id` (`application_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `application_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `created_by` int NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `due_date` date DEFAULT NULL,
  `requires_photo` tinyint(1) NOT NULL DEFAULT '0',
  `is_recurring` tinyint(1) NOT NULL DEFAULT '0',
  `priority` enum('low','medium','high') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `recur_days` json DEFAULT NULL COMMENT 'Weekday names e.g. ["Monday","Friday"]',
  `status` enum('pending','done','skipped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `completed_at` datetime DEFAULT NULL,
  `photo_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_application_tasks_app_status` (`application_id`,`status`),
  KEY `fk_application_tasks_creator` (`created_by`),
  CONSTRAINT `fk_application_tasks_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_application_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `attendance_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `helper_id` int NOT NULL,
  `date` date NOT NULL,
  `checked_in_at` datetime DEFAULT NULL,
  `checked_out_at` datetime DEFAULT NULL,
  `status` enum('present','absent','leave','unpaid_leave','holiday') COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_app_date` (`application_id`,`date`),
  KEY `idx_attendance_app` (`application_id`),
  KEY `fk_attendance_logs_helper` (`helper_id`),
  CONSTRAINT `fk_attendance_logs_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_logs_helper` FOREIGN KEY (`helper_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auth_codes` (
  `code_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `purpose` enum('verify_email','password_reset','email_change','contact_change') NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `pending_value` varchar(255) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `consumed_at` datetime DEFAULT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`code_id`),
  KEY `idx_user_purpose` (`user_id`,`purpose`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `fk_auth_codes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `auth_tokens` (
  `token_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'SHA-256 of the token; the token itself is never stored',
  `issued_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uniq_token` (`token_hash`),
  KEY `idx_user` (`user_id`),
  KEY `idx_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `complaint_actions` (
  `action_id` int NOT NULL AUTO_INCREMENT,
  `complaint_id` int NOT NULL,
  `actor_id` int DEFAULT NULL,
  `actor_role` varchar(16) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'peso',
  `action_type` varchar(32) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(180) COLLATE utf8mb4_general_ci NOT NULL,
  `detail` text COLLATE utf8mb4_general_ci,
  `due_date` date DEFAULT NULL,
  `visible_to_parties` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`action_id`),
  KEY `idx_complaint` (`complaint_id`),
  KEY `idx_visible` (`complaint_id`,`visible_to_parties`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `complaints` (
  `complaint_id` int NOT NULL AUTO_INCREMENT,
  `complainant_id` int NOT NULL COMMENT 'Who is filing the complaint',
  `complainant_role` enum('parent','helper') COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Complainant role in CareLink',
  `respondent_id` int DEFAULT NULL COMMENT 'Who is being complained about',
  `placement_id` int DEFAULT NULL COMMENT 'Related placement, if applicable',
  `application_id` int DEFAULT NULL COMMENT 'Job application when filed from the mobile/web app',
  `subject` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `incident_at` datetime DEFAULT NULL,
  `incident_location` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `incident_barangay` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `incident_municipality` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `incident_province` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category` enum('Misconduct','Fraud / Fake Profile','Non-Payment','Abandonment of Work','Harassment','Property Damage','Unsafe Working Conditions','Abuse or Mistreatment','Contract Dispute','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Other',
  `evidence_file` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Optional uploaded evidence',
  `status` enum('Pending','Under Review','Escalated_PESO','Resolved','Dismissed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `escalation_stage` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'peso',
  `resolution_notes` text COLLATE utf8mb4_general_ci,
  `forwarded_by_admin_id` int DEFAULT NULL COMMENT 'Super admin who escalated to PESO',
  `forwarded_at` datetime DEFAULT NULL,
  `admin_forward_note` text COLLATE utf8mb4_general_ci COMMENT 'Internal note when escalating to PESO',
  `resolved_by` int DEFAULT NULL COMMENT 'PESO admin user_id',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`complaint_id`),
  KEY `idx_complainant` (`complainant_id`),
  KEY `idx_respondent` (`respondent_id`),
  KEY `idx_status` (`status`),
  KEY `fk_comp_placement` (`placement_id`),
  KEY `fk_comp_resolved_by` (`resolved_by`),
  KEY `idx_complaints_application` (`application_id`),
  KEY `fk_complaints_forwarded_by` (`forwarded_by_admin_id`),
  CONSTRAINT `fk_comp_complainant` FOREIGN KEY (`complainant_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comp_placement` FOREIGN KEY (`placement_id`) REFERENCES `placements` (`placement_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comp_resolved_by` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comp_respondent` FOREIGN KEY (`respondent_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_complaints_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_complaints_forwarded_by` FOREIGN KEY (`forwarded_by_admin_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `contract_signatures` (
  `signature_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `signer_id` int NOT NULL,
  `signer_role` varchar(16) COLLATE utf8mb4_general_ci NOT NULL,
  `document_hash` char(64) COLLATE utf8mb4_general_ci NOT NULL,
  `signature_seal` char(64) COLLATE utf8mb4_general_ci NOT NULL,
  `auth_method` varchar(32) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'password',
  `consent_text` text COLLATE utf8mb4_general_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `signed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`signature_id`),
  UNIQUE KEY `uniq_signer` (`application_id`,`signer_role`),
  KEY `idx_app` (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `contracts` (
  `contract_id` int unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int unsigned NOT NULL,
  `job_post_id` int unsigned NOT NULL,
  `employer_id` int unsigned NOT NULL,
  `helper_id` int unsigned NOT NULL,
  `pdf_file_path` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_version` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BK-1-v1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `employment_start_date` date DEFAULT NULL,
  `employment_end_date` date DEFAULT NULL,
  `terms_notes` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rest_day` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Comma-separated weekday names',
  `special_days` json DEFAULT NULL COMMENT 'Array of {date, type: holiday|no_work, note}',
  `contract_duration` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmed_salary` decimal(10,2) DEFAULT NULL,
  `work_hours` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rest_days` json DEFAULT NULL,
  `vacation_leave_days` int DEFAULT '5',
  `sick_leave_days` int DEFAULT '5',
  `special_conditions` text COLLATE utf8mb4_unicode_ci,
  `overtime_rate` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Item 7b: overtime rate per hour, e.g. 50',
  `payment_schedule` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Item 7c: salary payment schedule',
  `other_benefits` text COLLATE utf8mb4_unicode_ci COMMENT 'Item 10: other benefits, if any',
  `debt_agreement` text COLLATE utf8mb4_unicode_ci COMMENT 'Item 11: debt agreement, if any',
  `deployment_agreement` text COLLATE utf8mb4_unicode_ci COMMENT 'Item 12: deployment cost agreement, if any',
  `termination_conditions` text COLLATE utf8mb4_unicode_ci COMMENT 'Item 13: termination conditions, if any',
  `helper_decline_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `helper_decline_at` datetime DEFAULT NULL,
  `debt_amount` decimal(10,2) DEFAULT NULL,
  `debt_acknowledged_at` datetime DEFAULT NULL,
  PRIMARY KEY (`contract_id`),
  UNIQUE KEY `uq_contracts_application` (`application_id`),
  KEY `idx_contracts_job` (`job_post_id`),
  KEY `idx_contracts_employer` (`employer_id`),
  KEY `idx_contracts_helper` (`helper_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `credential_flags` (
  `flag_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `document_id` int DEFAULT NULL,
  `document_type` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `flagged_by` int NOT NULL,
  `reason` text COLLATE utf8mb4_general_ci NOT NULL,
  `revoked_verification` tinyint(1) NOT NULL DEFAULT '0',
  `prior_verification` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`flag_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_doc` (`document_id`),
  KEY `idx_open` (`user_id`,`resolved_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `feedback_answers` (
  `answer_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `user_type` enum('helper','parent','peso') COLLATE utf8mb4_general_ci NOT NULL,
  `question_id` int NOT NULL,
  `rating_value` tinyint DEFAULT NULL COMMENT '1-5',
  `text_value` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`answer_id`),
  UNIQUE KEY `uniq_user_question` (`user_id`,`question_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_question` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `feedback_questions` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `question_text` varchar(500) COLLATE utf8mb4_general_ci NOT NULL,
  `question_type` enum('rating','text','choice') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'rating',
  `options` text COLLATE utf8mb4_general_ci,
  `applies_to` enum('all','helper','parent','peso') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'all',
  `sort_order` int NOT NULL DEFAULT '0',
  `iso_characteristic` varchar(48) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Usability',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `helper_jobs` (
  `hj_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `job_id` int NOT NULL COMMENT 'ref_jobs.job_id - specific role',
  PRIMARY KEY (`hj_id`),
  UNIQUE KEY `uk_profile_job` (`profile_id`,`job_id`),
  KEY `idx_job` (`job_id`),
  CONSTRAINT `fk_hjobs_job` FOREIGN KEY (`job_id`) REFERENCES `ref_jobs` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hjobs_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `helper_languages` (
  `hl_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `language_id` int NOT NULL,
  PRIMARY KEY (`hl_id`),
  UNIQUE KEY `uk_profile_lang` (`profile_id`,`language_id`),
  KEY `idx_language` (`language_id`),
  CONSTRAINT `fk_hlang_language` FOREIGN KEY (`language_id`) REFERENCES `ref_languages` (`language_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hlang_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `helper_profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` enum('Male','Female') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `civil_status` enum('Single','Married','Widowed','Separated') COLLATE utf8mb4_general_ci DEFAULT 'Single',
  `religion` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Filter: important per PESO interview',
  `province` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `municipality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `barangay` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Auto-generated: barangay, municipality, province',
  `landmark` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_general_ci,
  `education_level` enum('Elementary','High School Undergrad','High School Grad','College Undergrad','College Grad','Vocational') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `experience_years` int DEFAULT '0',
  `employment_type` enum('Stay-in','Stay-out','Any') COLLATE utf8mb4_general_ci DEFAULT 'Any',
  `work_schedule` enum('Full-time','Part-time','Any') COLLATE utf8mb4_general_ci DEFAULT 'Any' COMMENT 'Hours commitment (college students = Part-time)',
  `expected_salary` decimal(10,2) DEFAULT '6000.00' COMMENT 'Minimum per PESO: ₱6,000',
  `salary_period` enum('Daily','Monthly') COLLATE utf8mb4_general_ci DEFAULT 'Monthly',
  `custom_jobs` text COLLATE utf8mb4_general_ci DEFAULT (_utf8mb4'[]'),
  `custom_skills` text COLLATE utf8mb4_general_ci DEFAULT (_utf8mb4'[]'),
  `verification_status` enum('Unverified','Pending','Verified','Rejected') COLLATE utf8mb4_general_ci DEFAULT 'Unverified',
  `rating_average` decimal(3,2) DEFAULT '0.00',
  `rating_count` int DEFAULT '0',
  `profile_views` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `verified_by` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `rejected_by` int DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_search` (`municipality`,`employment_type`,`work_schedule`),
  KEY `idx_verification` (`verification_status`),
  CONSTRAINT `fk_hprofile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `helper_skills` (
  `hs_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `proficiency_level` enum('Beginner','Intermediate','Advanced','Expert') COLLATE utf8mb4_general_ci DEFAULT 'Intermediate',
  `years_experience` int DEFAULT '0',
  PRIMARY KEY (`hs_id`),
  UNIQUE KEY `uk_profile_skill` (`profile_id`,`skill_id`),
  KEY `idx_skill` (`skill_id`),
  CONSTRAINT `fk_hskills_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hskills_skill` FOREIGN KEY (`skill_id`) REFERENCES `ref_skills` (`skill_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `helper_work_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `employer_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `employer_contact` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `position` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Job title held',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL COMMENT 'NULL = currently employed here',
  `duties` text COLLATE utf8mb4_general_ci,
  `reason_for_leaving` text COLLATE utf8mb4_general_ci,
  `can_contact` tinyint(1) DEFAULT '1' COMMENT '1 = allow employer to be contacted',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_profile` (`profile_id`),
  CONSTRAINT `fk_whistory_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `interview_feedback` (
  `feedback_id` int NOT NULL AUTO_INCREMENT,
  `interview_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(16) COLLATE utf8mb4_general_ci NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text COLLATE utf8mb4_general_ci,
  `other_attended` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  UNIQUE KEY `uniq_party` (`interview_id`,`user_id`),
  KEY `idx_interview` (`interview_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `interview_notes` (
  `application_id` int NOT NULL,
  `parent_id` int NOT NULL,
  `answers` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `interview_reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `interview_id` int NOT NULL,
  `reviewed_by` int NOT NULL,
  `result` varchar(16) COLLATE utf8mb4_general_ci NOT NULL,
  `no_show_party` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `private_notes` text COLLATE utf8mb4_general_ci,
  `notified_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `idx_interview` (`interview_id`),
  KEY `idx_reviewer` (`reviewed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `interview_schedules` (
  `interview_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `interview_date` datetime NOT NULL,
  `interview_type` enum('In-person','Video Call','Phone') COLLATE utf8mb4_general_ci DEFAULT 'In-person',
  `location_or_link` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Address or meeting link',
  `parent_confirmed` tinyint(1) DEFAULT '0',
  `helper_confirmed` tinyint(1) DEFAULT '0',
  `status` enum('Scheduled','Confirmed','Completed','Cancelled','Rescheduled') COLLATE utf8mb4_general_ci DEFAULT 'Scheduled',
  `notes` text COLLATE utf8mb4_general_ci,
  `result` enum('Pending','Pass','Fail','No Show') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `feedback_requested_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`interview_id`),
  KEY `idx_application` (`application_id`),
  CONSTRAINT `fk_isched_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `job_applications` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `helper_id` int NOT NULL COMMENT 'users.user_id of helper',
  `cover_letter` text COLLATE utf8mb4_general_ci,
  `status` enum('Pending','Reviewed','Shortlisted','Interview Scheduled','Accepted','Rejected','Withdrawn','contract_pending','hired','termination_pending','terminated','auto_rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `parent_notes` text COLLATE utf8mb4_general_ci COMMENT 'Private notes by parent',
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `employer_signed_at` datetime DEFAULT NULL,
  `helper_signed_at` datetime DEFAULT NULL,
  `termination_initiated_by` int DEFAULT NULL,
  `contract_generated_at` datetime DEFAULT NULL,
  `leave_days_used` int NOT NULL DEFAULT '0' COMMENT 'Paid leave days used (synced when requests are approved)',
  `termination_reason` enum('moving_away','family_emergency','found_other_work','misconduct','unsafe_conditions','abuse_or_mistreatment','end_of_term','mutual_agreement','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `termination_note` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `termination_notice_date` date DEFAULT NULL,
  `termination_last_day` date DEFAULT NULL,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uk_job_helper` (`job_post_id`,`helper_id`),
  KEY `idx_helper` (`helper_id`),
  KEY `idx_status` (`status`),
  KEY `idx_helper_job` (`helper_id`,`job_post_id`),
  KEY `fk_japps_term_initiator` (`termination_initiated_by`),
  CONSTRAINT `fk_japps_helper` FOREIGN KEY (`helper_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_japps_job` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_japps_term_initiator` FOREIGN KEY (`termination_initiated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `job_invites` (
  `invite_id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `job_post_id` int NOT NULL,
  `parent_id` int NOT NULL,
  `helper_id` int NOT NULL,
  `status` varchar(12) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `responded_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`invite_id`),
  UNIQUE KEY `uniq_invite` (`parent_id`,`helper_id`,`job_post_id`),
  KEY `idx_msg` (`message_id`),
  KEY `idx_helper` (`helper_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `job_posts` (
  `job_post_id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL COMMENT 'users.user_id of parent',
  `category_id` int NOT NULL COMMENT 'ref_categories.category_id',
  `custom_category` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `job_ids` json DEFAULT NULL COMMENT 'Array of selected job IDs',
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `custom_job_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `employment_type` enum('Stay-in','Stay-out','Any') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Any',
  `work_schedule` enum('Full-time','Part-time','Any') COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Hours commitment',
  `salary_offered` decimal(10,2) NOT NULL COMMENT 'Minimum: ₱6,000/month',
  `salary_period` enum('Daily','Weekly','Semi-monthly','Monthly') COLLATE utf8mb4_general_ci DEFAULT 'Monthly',
  `benefits` text COLLATE utf8mb4_general_ci COMMENT 'SSS, PhilHealth, Pag-IBIG, etc.',
  `province` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `municipality` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `barangay` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `preferred_religion` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `preferred_language_id` int DEFAULT NULL COMMENT 'ref_languages.language_id',
  `require_police_clearance` tinyint(1) DEFAULT '0' COMMENT 'Parent can require this',
  `prefer_tesda_nc2` tinyint(1) DEFAULT '0',
  `status` enum('Open','Filled','Closed','Expired','Pending','Rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `visibility` enum('public','direct_hire') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'public' COMMENT 'direct_hire = private offer to one helper; never listed in search',
  `posted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `featured_until` datetime DEFAULT NULL COMMENT 'Boost expiry; NULL = never boosted',
  `featured_boost_paid_at` datetime DEFAULT NULL COMMENT 'When the boost payment settled',
  `filled_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `skill_ids` json DEFAULT NULL COMMENT 'Array of selected skill IDs',
  `custom_skills` text COLLATE utf8mb4_general_ci,
  `min_age` int DEFAULT NULL COMMENT 'Minimum age requirement',
  `max_age` int DEFAULT NULL COMMENT 'Maximum age requirement',
  `min_experience_years` int DEFAULT NULL COMMENT 'Minimum years of experience',
  `start_date` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Preferred start date',
  `work_hours` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Work hours (e.g., 8am-5pm)',
  `days_off` json DEFAULT NULL COMMENT 'Array of preferred days off',
  `contract_duration` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Contract duration',
  `provides_meals` tinyint(1) DEFAULT '0',
  `provides_accommodation` tinyint(1) DEFAULT '0',
  `provides_sss` tinyint(1) DEFAULT '0',
  `provides_philhealth` tinyint(1) DEFAULT '0',
  `provides_pagibig` tinyint(1) DEFAULT '0',
  `vacation_days` int DEFAULT '0',
  `sick_days` int DEFAULT '0',
  `verified_by` int DEFAULT NULL COMMENT 'PESO admin user_id',
  `verified_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_general_ci,
  `salary_min` decimal(10,2) DEFAULT NULL,
  `salary_max` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`job_post_id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_search` (`municipality`,`status`,`employment_type`,`work_schedule`),
  KEY `fk_jposts_language` (`preferred_language_id`),
  KEY `idx_status_expires` (`status`,`expires_at`),
  KEY `idx_verified_by` (`verified_by`),
  KEY `idx_featured` (`status`,`featured_until`),
  KEY `idx_visibility` (`visibility`,`status`),
  CONSTRAINT `fk_jposts_category` FOREIGN KEY (`category_id`) REFERENCES `ref_categories` (`category_id`),
  CONSTRAINT `fk_jposts_language` FOREIGN KEY (`preferred_language_id`) REFERENCES `ref_languages` (`language_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_jposts_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jposts_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `job_views` (
  `view_id` int NOT NULL AUTO_INCREMENT,
  `helper_id` int NOT NULL,
  `job_post_id` int NOT NULL,
  `viewed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`view_id`),
  KEY `idx_helper_time` (`helper_id`,`viewed_at`),
  KEY `idx_job` (`job_post_id`),
  CONSTRAINT `job_views_ibfk_1` FOREIGN KEY (`helper_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `job_views_ibfk_2` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `leave_requests` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int unsigned NOT NULL,
  `helper_id` int unsigned NOT NULL,
  `date` date NOT NULL,
  `reason_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `helper_note` text COLLATE utf8mb4_unicode_ci,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `paid_leave` tinyint(1) DEFAULT NULL,
  `response_note` text COLLATE utf8mb4_unicode_ci,
  `responded_at` datetime DEFAULT NULL,
  `responded_by` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_app` (`application_id`),
  KEY `idx_leave_helper` (`helper_id`),
  KEY `idx_leave_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `log_trail` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'e.g., LOGIN, LOGOUT, APPLY_JOB, UPLOAD_DOC',
  `module` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'e.g., Auth, Profile, Jobs, Documents',
  `record_id` int DEFAULT NULL COMMENT 'ID of affected record',
  `status` enum('Success','Failed','Error') COLLATE utf8mb4_general_ci DEFAULT 'Success',
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `device_info` text COLLATE utf8mb4_general_ci COMMENT 'User agent string',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  CONSTRAINT `fk_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `job_post_id` int DEFAULT NULL COMMENT 'Optional context: which job this is about',
  `message_text` text COLLATE utf8mb4_general_ci NOT NULL,
  `message_type` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'text',
  `image_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_edited` tinyint(1) NOT NULL DEFAULT '0',
  `edited_at` datetime DEFAULT NULL,
  PRIMARY KEY (`message_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  KEY `idx_thread` (`sender_id`,`receiver_id`),
  KEY `fk_msg_job` (`job_post_id`),
  CONSTRAINT `fk_msg_job` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_msg_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT 'Recipient (users.user_id)',
  `type` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `ref_type` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ref_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notifications_user` (`user_id`),
  KEY `idx_notifications_user_unread` (`user_id`,`is_read`),
  KEY `idx_notifications_created` (`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `parent_children` (
  `child_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `age` int NOT NULL COMMENT '0-18 years old',
  `gender` enum('Male','Female','Prefer not to say') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `special_needs` text COLLATE utf8mb4_general_ci COMMENT 'e.g., autism, ADHD, allergies',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`child_id`),
  KEY `idx_profile` (`profile_id`),
  CONSTRAINT `fk_pchildren_profile` FOREIGN KEY (`profile_id`) REFERENCES `parent_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `parent_elderly` (
  `elderly_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `age` int NOT NULL COMMENT '60+ years old',
  `gender` enum('Male','Female','Prefer not to say') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `condition` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'e.g., Alzheimer''s, diabetic, bedridden',
  `care_level` enum('Independent','Needs Assistance','Fully Dependent') COLLATE utf8mb4_general_ci DEFAULT 'Needs Assistance',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`elderly_id`),
  KEY `idx_profile` (`profile_id`),
  CONSTRAINT `fk_pelderly_profile` FOREIGN KEY (`profile_id`) REFERENCES `parent_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `parent_household` (
  `household_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `household_size` int DEFAULT NULL COMMENT 'Total number of people in the house',
  `household_type` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'house, apartment, condominium, townhouse, other',
  `has_children` tinyint(1) DEFAULT '0' COMMENT 'Quick flag; details in parent_children',
  `has_elderly` tinyint(1) DEFAULT '0' COMMENT 'Quick flag; details in parent_elderly',
  `has_pets` tinyint(1) DEFAULT '0',
  `pet_details` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'e.g., 2 dogs, 1 cat',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`household_id`),
  UNIQUE KEY `uk_profile_id` (`profile_id`),
  CONSTRAINT `fk_phousehold_profile` FOREIGN KEY (`profile_id`) REFERENCES `parent_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `parent_profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Leyte',
  `municipality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `barangay` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Auto-generated: barangay, municipality, province',
  `landmark` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_general_ci COMMENT 'Short intro about the family',
  `religion` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Optional; helps judge household fit',
  `verification_status` enum('Unverified','Pending','Verified','Rejected') COLLATE utf8mb4_general_ci DEFAULT 'Unverified',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `verified_by` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `rejected_by` int DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  CONSTRAINT `fk_pprofile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `password_verify_attempts` (
  `user_id` int NOT NULL,
  `attempt_count` int NOT NULL DEFAULT '0',
  `last_attempt` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_password_verify_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `payment_checkouts` (
  `checkout_id` int NOT NULL AUTO_INCREMENT,
  `session_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` int NOT NULL,
  `kind` varchar(32) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'subscription | boost | placement_fee',
  `reference_id` int DEFAULT NULL,
  `checkout_url` text COLLATE utf8mb4_general_ci,
  `status` enum('pending','paid','cancelled') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `settled_at` datetime DEFAULT NULL,
  PRIMARY KEY (`checkout_id`),
  UNIQUE KEY `uniq_session` (`session_id`),
  KEY `idx_user_kind` (`user_id`,`kind`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payment_events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `paymongo_event_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `reference_type` varchar(32) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'boost | placement_fee | subscription',
  `reference_id` int DEFAULT NULL,
  `payload_summary` text COLLATE utf8mb4_general_ci COMMENT 'Sanitised. No payment method details.',
  `received_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  UNIQUE KEY `uniq_event` (`paymongo_event_id`),
  KEY `idx_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `peso_reports` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `report_type` enum('Monthly','Quarterly','Annual','Custom') COLLATE utf8mb4_general_ci NOT NULL,
  `report_period_start` date NOT NULL,
  `report_period_end` date NOT NULL,
  `total_helpers` int DEFAULT '0',
  `total_parents` int DEFAULT '0',
  `total_jobs_posted` int DEFAULT '0',
  `total_placements` int DEFAULT '0',
  `active_placements` int DEFAULT '0',
  `total_complaints` int DEFAULT '0',
  `resolved_complaints` int DEFAULT '0',
  `generated_by` int NOT NULL COMMENT 'PESO admin user_id',
  `report_file` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Exported PDF/Excel path',
  `generated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`),
  KEY `idx_generated_by` (`generated_by`),
  CONSTRAINT `fk_reports_generated_by` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `placement_fees` (
  `fee_id` int NOT NULL AUTO_INCREMENT,
  `placement_id` int NOT NULL,
  `parent_id` int NOT NULL COMMENT 'Payer. Never a helper.',
  `gross_amount` decimal(10,2) NOT NULL,
  `peso_share_amount` decimal(10,2) NOT NULL,
  `platform_share_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','paid','failed','refunded') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `paymongo_payment_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `refunded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fee_id`),
  UNIQUE KEY `uniq_placement_fee` (`placement_id`),
  KEY `idx_parent_status` (`parent_id`,`status`),
  CONSTRAINT `fk_fees_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fees_placement` FOREIGN KEY (`placement_id`) REFERENCES `placements` (`placement_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `placement_renewal_intent` (
  `application_id` int NOT NULL COMMENT 'job_applications.application_id',
  `parent_interested` tinyint(1) DEFAULT NULL COMMENT 'NULL undecided, 0 no, 1 yes',
  `helper_interested` tinyint(1) DEFAULT NULL COMMENT 'NULL undecided, 0 no, 1 yes',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `placement_reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `placement_id` int NOT NULL,
  `reviewer_id` int NOT NULL COMMENT 'Who gave the review',
  `reviewee_id` int NOT NULL COMMENT 'Who was reviewed',
  `reviewer_type` enum('parent','helper') COLLATE utf8mb4_general_ci NOT NULL,
  `rating` decimal(2,1) NOT NULL COMMENT '1.0 to 5.0',
  `review_text` text COLLATE utf8mb4_general_ci,
  `is_visible` tinyint(1) DEFAULT '1' COMMENT '0 = hidden by admin',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uk_placement_reviewer` (`placement_id`,`reviewer_id`),
  KEY `idx_reviewee` (`reviewee_id`),
  KEY `fk_reviews_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_reviews_placement` FOREIGN KEY (`placement_id`) REFERENCES `placements` (`placement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `placement_settings` (
  `application_id` int NOT NULL,
  `attendance_tracking` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `placement_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `created_by` int NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `due_date` date DEFAULT NULL,
  `requires_photo` tinyint(1) NOT NULL DEFAULT '0',
  `is_recurring` tinyint(1) NOT NULL DEFAULT '0',
  `recur_days` json DEFAULT NULL,
  `status` enum('pending','done','skipped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `completed_at` datetime DEFAULT NULL,
  `photo_url` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_placement_tasks_app_status` (`application_id`,`status`),
  KEY `fk_placement_tasks_creator` (`created_by`),
  CONSTRAINT `fk_placement_tasks_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_placement_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `placements` (
  `placement_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int DEFAULT NULL COMMENT 'Source application, if any',
  `parent_id` int NOT NULL,
  `helper_id` int NOT NULL,
  `job_post_id` int DEFAULT NULL,
  `ref_job_id` int DEFAULT NULL,
  `employment_type` enum('Stay-in','Stay-out','Any') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Any' COMMENT 'Accommodation arrangement (snapshot at hire time)',
  `work_schedule` enum('Full-time','Part-time','Any') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `agreed_salary` decimal(10,2) NOT NULL,
  `salary_period` enum('Daily','Weekly','Semi-monthly','Monthly') COLLATE utf8mb4_general_ci DEFAULT 'Monthly',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL COMMENT 'NULL = ongoing',
  `status` enum('Active','Completed','Terminated','On Hold') COLLATE utf8mb4_general_ci DEFAULT 'Active',
  `termination_reason` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`placement_id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_helper` (`helper_id`),
  KEY `idx_status` (`status`),
  KEY `fk_place_application` (`application_id`),
  KEY `fk_place_job` (`job_post_id`),
  KEY `fk_place_ref_job` (`ref_job_id`),
  CONSTRAINT `fk_place_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_place_helper` FOREIGN KEY (`helper_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_place_job` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_place_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_place_ref_job` FOREIGN KEY (`ref_job_id`) REFERENCES `ref_jobs` (`job_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ref_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'PESO Nature of Work',
  `icon` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Icon name for frontend',
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uk_category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ref_jobs` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `job_title` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`job_id`),
  KEY `idx_category` (`category_id`),
  CONSTRAINT `fk_rjobs_category` FOREIGN KEY (`category_id`) REFERENCES `ref_categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ref_languages` (
  `language_id` int NOT NULL AUTO_INCREMENT,
  `language_name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`language_id`),
  UNIQUE KEY `uk_language` (`language_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ref_skills` (
  `skill_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`skill_id`),
  KEY `idx_job` (`job_id`),
  CONSTRAINT `fk_rskills_job` FOREIGN KEY (`job_id`) REFERENCES `ref_jobs` (`job_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `saved_jobs` (
  `saved_id` int NOT NULL AUTO_INCREMENT,
  `helper_id` int NOT NULL,
  `job_post_id` int NOT NULL,
  `saved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`saved_id`),
  UNIQUE KEY `unique_save` (`helper_id`,`job_post_id`),
  KEY `idx_helper` (`helper_id`),
  KEY `idx_job` (`job_post_id`),
  KEY `idx_saved_at` (`saved_at`),
  CONSTRAINT `saved_jobs_ibfk_1` FOREIGN KEY (`helper_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `saved_jobs_ibfk_2` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `saved_profiles` (
  `save_id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL,
  `helper_id` int NOT NULL,
  `saved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`save_id`),
  UNIQUE KEY `uk_parent_helper` (`parent_id`,`helper_id`),
  KEY `idx_helper` (`helper_id`),
  CONSTRAINT `fk_saved_helper` FOREIGN KEY (`helper_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `saved_searches` (
  `search_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `search_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `search_filters` json DEFAULT NULL,
  `alert_enabled` tinyint(1) DEFAULT '0',
  `alert_frequency` enum('instant','daily','weekly') COLLATE utf8mb4_unicode_ci DEFAULT 'daily',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`search_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `saved_searches_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscriptions` (
  `subscription_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plan_type` enum('carelink_plus') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'carelink_plus',
  `status` enum('active','cancelled','expired','past_due') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `started_at` datetime NOT NULL,
  `current_period_end` datetime NOT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `paymongo_subscription_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `featured_credits_remaining` int NOT NULL DEFAULT '3',
  `featured_credits_reset_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`subscription_id`),
  KEY `idx_user_status` (`user_id`,`status`,`current_period_end`),
  CONSTRAINT `fk_subs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `system_feedback` (
  `feedback_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL COMMENT 'NULL if the account was later deleted',
  `user_type` enum('helper','parent','peso') COLLATE utf8mb4_general_ci NOT NULL,
  `overall_rating` tinyint NOT NULL COMMENT '1-5 stars',
  `ease_of_use` tinyint DEFAULT NULL COMMENT '1-5 Likert',
  `trust` tinyint DEFAULT NULL COMMENT '1-5 Likert',
  `would_use` tinyint DEFAULT NULL COMMENT '1-5 Likert',
  `liked_most` text COLLATE utf8mb4_general_ci,
  `confusing_part` text COLLATE utf8mb4_general_ci,
  `context` varchar(32) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'general' COMMENT 'where it was given, e.g. demo_end',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_type` (`user_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `task_checklist_items` (
  `item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `item_text` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_done` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  KEY `idx_checklist_task` (`task_id`),
  CONSTRAINT `fk_checklist_task` FOREIGN KEY (`task_id`) REFERENCES `application_tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_documents` (
  `document_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `document_type` enum('Barangay Clearance','Valid ID','Police Clearance','TESDA NC2') COLLATE utf8mb4_general_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Server path to uploaded file',
  `file_path_back` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Back image for two-sided docs like Valid ID',
  `id_type` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'For Valid ID: PhilSys, Passport, Driver''s License, etc.',
  `expiry_date` date DEFAULT NULL COMMENT 'Confirm with PESO on validity periods',
  `status` enum('Pending','Verified','Rejected') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `ai_verification_status` enum('Unchecked','Passed','Flagged','Failed') COLLATE utf8mb4_general_ci DEFAULT 'Unchecked',
  `ai_confidence_score` decimal(5,2) DEFAULT NULL COMMENT '0-100% confidence',
  `rejection_reason` text COLLATE utf8mb4_general_ci,
  `verified_by` int DEFAULT NULL COMMENT 'PESO admin user_id',
  `verified_at` timestamp NULL DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `ai_extracted_data` json DEFAULT NULL,
  `ai_checked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`document_id`),
  UNIQUE KEY `uk_user_doctype` (`user_id`,`document_type`) COMMENT 'One record per document type per user',
  KEY `idx_status` (`status`),
  KEY `idx_verified_by` (`verified_by`),
  CONSTRAINT `fk_udocs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_udocs_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `user_safety_flags` (
  `safety_flag_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `complaint_id` int DEFAULT NULL,
  `level` varchar(16) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'caution',
  `public_reason` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  `internal_note` text COLLATE utf8mb4_general_ci,
  `issued_by` int NOT NULL,
  `issued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `lifted_at` datetime DEFAULT NULL,
  `lifted_by` int DEFAULT NULL,
  `lift_reason` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`safety_flag_id`),
  KEY `idx_user_active` (`user_id`,`lifted_at`),
  KEY `idx_complaint` (`complaint_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(11) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'bcrypt hashed',
  `first_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `user_type` enum('parent','helper','peso','admin') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'parent',
  `status` enum('pending','approved','suspended') COLLATE utf8mb4_general_ci DEFAULT 'pending' COMMENT 'pending = awaiting profile/verification',
  `profile_completed` tinyint(1) DEFAULT '0' COMMENT '0=incomplete, 1=complete',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `privacy_consent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_email` (`email`),
  UNIQUE KEY `uk_users_phone` (`phone`),
  KEY `idx_usertype` (`user_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- 3. Reference data
-- ---------------------------------------------------------------------------
-- Job categories, job titles, skills and languages: every dropdown in the
-- app is built from these, so a server without them shows empty pickers.
-- feedback_questions is the ISO/IEC 25010 evaluation instrument.

-- ref_categories (6 rows)
INSERT INTO `ref_categories` (`category_id`, `category_name`, `icon`, `description`) VALUES
('1', 'General Househelp', 'home', 'General household chores and maintenance'),
('2', 'Yaya', 'child', 'Childcare and child supervision'),
('3', 'Cook', 'restaurant', 'Food preparation and kitchen management'),
('4', 'Gardening', 'leaf', 'Garden and outdoor maintenance'),
('5', 'Laundry', 'shirt', 'Laundry, ironing, and clothing care'),
('6', 'Others', 'ellipsis', 'Other domestic services not listed above');

-- ref_jobs (43 rows)
INSERT INTO `ref_jobs` (`job_id`, `category_id`, `job_title`, `description`) VALUES
('1', '1', 'Housekeeper', 'General cleaning and home maintenance'),
('2', '1', 'Household Manager', 'Managing the overall household operations'),
('3', '2', 'Yaya / Nanny', 'Primary childcare provider'),
('4', '2', 'Babysitter', 'Occasional or part-time child supervision'),
('5', '2', 'Infant Care Specialist', 'Specialized care for newborns 0-12 months'),
('6', '3', 'Family Cook', 'Preparing daily meals for the household'),
('7', '3', 'Meal Prep Cook', 'Batch cooking and meal planning'),
('8', '4', 'Gardener', 'Plant care and garden maintenance'),
('9', '4', 'Landscape Aide', 'Maintaining lawn and outdoor spaces'),
('10', '5', 'Laundry Person', 'Washing and caring for clothes and linens'),
('11', '5', 'Ironing Specialist', 'Pressing and folding garments'),
('12', '6', 'Elderly Caregiver', 'Assisting senior citizens with daily needs'),
('13', '6', 'Family Driver', 'Driving family members for errands and activities'),
('14', '6', 'Errand Runner', 'Handling outside tasks like bills, grocery, etc.'),
('15', '6', 'Pet Care Aide', 'Feeding, walking, and grooming pets'),
('16', '1', 'All-Around Househelp', NULL),
('17', '1', 'House Cleaner', NULL),
('18', '1', 'Live-in Kasambahay', NULL),
('19', '1', 'Live-out Kasambahay', NULL),
('20', '1', 'Dishwasher / Kitchen Helper', NULL),
('21', '2', 'Toddler Caregiver', NULL),
('22', '2', 'Newborn Care Specialist', NULL),
('23', '2', 'After-School Nanny', NULL),
('24', '2', 'Special-Needs Child Caregiver', NULL),
('25', '3', 'Personal Chef', NULL);
INSERT INTO `ref_jobs` (`job_id`, `category_id`, `job_title`, `description`) VALUES
('26', '3', 'Baker / Pastry Cook', NULL),
('27', '3', 'Kitchen Assistant', NULL),
('28', '3', 'Special Diet Cook', NULL),
('29', '3', 'Catering Helper', NULL),
('30', '4', 'Plant Caretaker', NULL),
('31', '4', 'Lawn Maintenance Aide', NULL),
('32', '4', 'Ornamental Plant Specialist', NULL),
('33', '4', 'Vegetable Garden Tender', NULL),
('34', '5', 'Laundry & Ironing Helper', NULL),
('35', '5', 'Dry Cleaning Aide', NULL),
('36', '5', 'Wash-and-Fold Attendant', NULL),
('37', '6', 'Personal Assistant', NULL),
('38', '6', 'Caregiver for PWD', NULL),
('39', '6', 'Pool Maintenance Aide', NULL),
('40', '6', 'Massage Therapist', NULL),
('41', '6', 'Grocery Shopper', NULL),
('42', '6', 'House Sitter', NULL),
('43', '6', 'Security / Watchman', NULL);

-- ref_languages (10 rows)
INSERT INTO `ref_languages` (`language_id`, `language_name`) VALUES
('8', 'Bicolano'),
('2', 'Cebuano'),
('3', 'English'),
('5', 'Hiligaynon / Ilonggo'),
('4', 'Ilocano'),
('7', 'Kapampangan'),
('10', 'Other'),
('9', 'Pangasinan'),
('1', 'Tagalog'),
('6', 'Waray');

-- ref_skills (21 rows)
INSERT INTO `ref_skills` (`skill_id`, `job_id`, `skill_name`, `description`) VALUES
('1', '1', 'Sweeping & Mopping', 'Regular floor cleaning'),
('2', '1', 'Deep Cleaning', 'Thorough cleaning of rooms and bathrooms'),
('3', '1', 'Organizing & Tidying', 'Keeping the home neat and orderly'),
('4', '1', 'Marketing / Grocery', 'Buying supplies within a given budget'),
('5', '3', 'Toddler Care (1-5 yrs)', 'Supervision and activities for young children'),
('6', '3', 'School-Age Child Care', 'After-school care for children 6-12'),
('7', '3', 'Child with Special Needs', 'Care for children with autism, ADHD, or disability'),
('8', '3', 'Homework Assistance', 'Helping children with school assignments'),
('9', '5', 'Newborn Care (0-12 mos)', 'Bathing, feeding, and soothing newborns'),
('10', '5', 'Breastfeeding Support', 'Assisting nursing mothers'),
('11', '6', 'Filipino Cuisine', 'Preparing traditional Filipino dishes'),
('12', '6', 'Special Diet Cooking', 'Diabetic, low-sodium, or allergen-free meals'),
('13', '6', 'Baking', 'Baking breads, cakes, and pastries'),
('14', '8', 'Plant Watering & Pruning', 'Basic plant maintenance'),
('15', '8', 'Vegetable Garden', 'Growing and maintaining vegetable plots'),
('16', '10', 'Hand Washing', 'Manual laundry washing'),
('17', '10', 'Machine Operation', 'Using washing machines and dryers'),
('18', '10', 'Ironing & Folding', 'Pressing and proper folding of clothes'),
('19', '12', 'Medication Reminders', 'Tracking and reminding patients to take medicine'),
('20', '12', 'Bedridden Patient Care', 'Turning, sponge baths, and hygiene for bed patients'),
('21', '12', 'Dementia / Alzheimer Care', 'Patience-based care and safety supervision');

-- feedback_questions (51 rows)
INSERT INTO `feedback_questions` (`question_id`, `code`, `question_text`, `question_type`, `options`, `applies_to`, `sort_order`, `iso_characteristic`, `active`, `created_at`) VALUES
('1', 'fs_tasks_expected', 'The system performed all the tasks I expected it to.', 'rating', NULL, 'all', '11', 'Functional Suitability', '1', '2026-08-23 21:30:43'),
('2', 'fs_completed_goal', 'I was able to complete what I set out to do (set up my profile / post a job / apply).', 'rating', NULL, 'all', '12', 'Functional Suitability', '1', '2026-08-23 21:30:43'),
('3', 'fs_info_accurate', 'The information shown (job details, helper profiles, match scores) was accurate.', 'rating', NULL, 'all', '13', 'Functional Suitability', '1', '2026-08-23 21:30:43'),
('4', 'fs_appropriate', 'The features are appropriate for finding or hiring household help.', 'rating', NULL, 'all', '14', 'Functional Suitability', '1', '2026-08-23 21:30:43'),
('5', 'us_easy_learn', 'The system was easy to learn, even without someone teaching me.', 'rating', NULL, 'all', '15', 'Usability', '1', '2026-08-23 21:30:43'),
('6', 'us_screens_clear', 'The screens and buttons were easy to understand.', 'rating', NULL, 'all', '16', 'Usability', '1', '2026-08-23 21:30:43'),
('7', 'us_words_clear', 'The words used were clear and easy to understand (not too technical).', 'rating', NULL, 'all', '17', 'Usability', '1', '2026-08-23 21:30:43'),
('8', 'us_next_step', 'I could tell what to do next at each step.', 'rating', NULL, 'all', '18', 'Usability', '1', '2026-08-23 21:30:43'),
('9', 'us_fix_mistake', 'It was easy to correct a mistake when I made one.', 'rating', NULL, 'all', '19', 'Usability', '1', '2026-08-23 21:30:43'),
('10', 'us_text_readable', 'The text was large enough and easy to read.', 'rating', NULL, 'all', '20', 'Usability', '1', '2026-08-23 21:30:43'),
('11', 'us_guide_helpful', 'The guide (\"How CareLink works\") helped me understand the system.', 'rating', NULL, 'all', '21', 'Usability', '1', '2026-08-23 21:30:43'),
('12', 're_no_crash', 'The system worked without crashing or freezing.', 'rating', NULL, 'all', '22', 'Reliability', '1', '2026-08-23 21:30:43'),
('13', 're_consistent', 'The system responded consistently each time I used the same feature.', 'rating', NULL, 'all', '23', 'Reliability', '1', '2026-08-23 21:30:43'),
('14', 're_errors_clear', 'When something went wrong, the system explained it clearly.', 'rating', NULL, 'all', '24', 'Reliability', '1', '2026-08-23 21:30:43'),
('15', 'pe_screens_fast', 'Screens loaded quickly enough.', 'rating', NULL, 'all', '25', 'Performance Efficiency', '1', '2026-08-23 21:30:43'),
('16', 'pe_search_fast', 'Searching and browsing did not take too long.', 'rating', NULL, 'all', '26', 'Performance Efficiency', '1', '2026-08-23 21:30:43'),
('17', 'pe_upload_fast', 'Uploading documents and photos completed in reasonable time.', 'rating', NULL, 'all', '27', 'Performance Efficiency', '1', '2026-08-23 21:30:43'),
('18', 'se_info_safe', 'I felt my personal information was kept safe.', 'rating', NULL, 'all', '28', 'Security', '1', '2026-08-23 21:30:43'),
('19', 'se_docs_peso_only', 'I am comfortable that only PESO can see my ID and Barangay Clearance.', 'rating', NULL, 'all', '29', 'Security', '1', '2026-08-23 21:30:43'),
('20', 'se_peso_trust', 'The PESO verification makes me trust the other people on the platform.', 'rating', NULL, 'all', '30', 'Security', '1', '2026-08-23 21:30:43'),
('21', 'se_in_app_comms', 'I felt safe communicating through the app instead of sharing my number.', 'rating', NULL, 'all', '31', 'Security', '1', '2026-08-23 21:30:43'),
('22', 'pu_easier', 'CareLink would make it easier for me to find work / find a helper.', 'rating', NULL, 'all', '32', 'Perceived Usefulness', '1', '2026-08-23 21:30:43'),
('23', 'pu_safer', 'CareLink is safer than how I would normally find work / hire someone.', 'rating', NULL, 'all', '33', 'Perceived Usefulness', '1', '2026-08-23 21:30:43'),
('24', 'pu_would_use', 'I would use CareLink if it were available today.', 'rating', NULL, 'all', '34', 'Perceived Usefulness', '1', '2026-08-23 21:30:43'),
('25', 'pu_recommend', 'I would recommend CareLink to a friend or relative.', 'rating', NULL, 'all', '35', 'Perceived Usefulness', '1', '2026-08-23 21:30:43');
INSERT INTO `feedback_questions` (`question_id`, `code`, `question_text`, `question_type`, `options`, `applies_to`, `sort_order`, `iso_characteristic`, `active`, `created_at`) VALUES
('26', 'hl_profile_setup', 'Setting up my profile was straightforward.', 'rating', NULL, 'helper', '36', 'Usability', '1', '2026-08-23 21:30:43'),
('27', 'hl_docs_understood', 'I understood what documents I needed and why.', 'rating', NULL, 'helper', '37', 'Usability', '1', '2026-08-23 21:30:43'),
('28', 'hl_matches_relevant', 'The job matches shown were relevant to my skills.', 'rating', NULL, 'helper', '38', 'Functional Suitability', '1', '2026-08-23 21:30:43'),
('29', 'hl_match_pct', 'I understood what the match percentage meant.', 'rating', NULL, 'helper', '39', 'Usability', '1', '2026-08-23 21:30:43'),
('30', 'hl_cover_letter', 'The generated cover letter was a helpful starting point.', 'rating', NULL, 'helper', '40', 'Perceived Usefulness', '1', '2026-08-23 21:30:43'),
('31', 'em_post_job', 'Posting a job was straightforward.', 'rating', NULL, 'parent', '41', 'Usability', '1', '2026-08-23 21:30:43'),
('32', 'em_applicants', 'The applicants shown were relevant to my job post.', 'rating', NULL, 'parent', '42', 'Functional Suitability', '1', '2026-08-23 21:30:43'),
('33', 'em_match_pct', 'I understood what the match percentage meant.', 'rating', NULL, 'parent', '43', 'Usability', '1', '2026-08-23 21:30:43'),
('34', 'em_job_desc', 'The generated job description was a helpful starting point.', 'rating', NULL, 'parent', '44', 'Perceived Usefulness', '1', '2026-08-23 21:30:43'),
('35', 'em_contract_clear', 'I understood what the contract covers and that both parties must sign.', 'rating', NULL, 'parent', '45', 'Usability', '1', '2026-08-23 21:30:43'),
('36', 'oe_liked_most', 'What did you like most about CareLink?', 'text', NULL, 'all', '50', 'Perceived Usefulness', '1', '2026-08-23 21:30:43'),
('37', 'oe_confusing', 'What was the most confusing or difficult part?', 'text', NULL, 'all', '51', 'Usability', '1', '2026-08-23 21:30:43'),
('38', 'oe_missing', 'Was there anything you expected to find but couldn\'t?', 'text', NULL, 'all', '52', 'Functional Suitability', '1', '2026-08-23 21:30:43'),
('39', 'oe_would_change', 'What would you add or change before this is used for real?', 'text', NULL, 'all', '53', 'Perceived Usefulness', '1', '2026-08-23 21:30:43'),
('40', 'oe_errors', '(If applicable) Describe any error or unexpected behaviour you encountered.', 'text', NULL, 'all', '54', 'Reliability', '1', '2026-08-23 21:30:43'),
('996', 'ps_queue_easy', 'The verification queue is easy to review.', 'rating', NULL, 'peso', '46', 'Usability', '1', '2026-08-31 22:51:40'),
('997', 'ps_enough_info', 'I had enough information to decide whether to approve a document.', 'rating', NULL, 'peso', '47', 'Functional Suitability', '1', '2026-08-31 22:51:40'),
('998', 'ps_ai_flags', 'The AI pre-check flags were helpful, not confusing.', 'rating', NULL, 'peso', '48', 'Usability', '1', '2026-08-31 22:51:40'),
('999', 'ps_less_paperwork', 'The system would reduce our manual paperwork.', 'rating', NULL, 'peso', '49', 'Perceived Usefulness', '1', '2026-08-31 22:51:40'),
('1445', 'dm_role', 'Which role did you test?', 'choice', '[\"Helper (Kasambahay)\",\"Employer (Household)\",\"PESO Staff\"]', 'all', '1', 'Respondent Profile', '1', '2026-08-31 23:23:02'),
('1446', 'dm_age', 'Age', 'choice', '[\"18-24\",\"25-34\",\"35-44\",\"45-54\",\"55+\"]', 'all', '2', 'Respondent Profile', '1', '2026-08-31 23:23:02'),
('1447', 'dm_sex', 'Sex', 'choice', '[\"Female\",\"Male\",\"Prefer not to say\"]', 'all', '3', 'Respondent Profile', '1', '2026-08-31 23:23:02'),
('1448', 'dm_education', 'Highest education', 'choice', '[\"Elementary\",\"High School\",\"Vocational\\/TESDA\",\"College\",\"Post-grad\"]', 'all', '4', 'Respondent Profile', '1', '2026-08-31 23:23:02'),
('1449', 'dm_app_freq', 'How often do you use a smartphone app?', 'choice', '[\"Daily\",\"Weekly\",\"Rarely\",\"First time\"]', 'all', '5', 'Respondent Profile', '1', '2026-08-31 23:23:02'),
('1450', 'dm_prior_app', 'Have you used a job-seeking or hiring app before?', 'choice', '[\"Yes\",\"No\"]', 'all', '6', 'Respondent Profile', '1', '2026-08-31 23:23:02');
INSERT INTO `feedback_questions` (`question_id`, `code`, `question_text`, `question_type`, `options`, `applies_to`, `sort_order`, `iso_characteristic`, `active`, `created_at`) VALUES
('1451', 'dm_device', 'Device used today', 'choice', '[\"Android\",\"iPhone\",\"Laptop\\/Desktop browser\"]', 'all', '7', 'Respondent Profile', '1', '2026-08-31 23:23:02');

-- ---------------------------------------------------------------------------
-- 4. Test accounts — password for all four: CareLink!2026
-- ---------------------------------------------------------------------------
-- email_verified_at must be non-NULL: auth/login.php refuses before it even
-- checks the password. status must be exactly 'approved' — every staff guard
-- tests that literal string.

INSERT INTO users
  (user_id, email, phone, email_verified_at, username, password,
   first_name, middle_name, last_name, user_type, status,
   profile_completed, created_at, privacy_consent_at)
VALUES
  (1, 'peso@carelink.test', '09171000001', NOW(), 'peso_officer',
   '$2y$10$PU9iSLFay9CzvD1TJWJR/u8A8GeIUxhr7Ca6AlH/x/VyDx2XAuNOC',
   'PESO', NULL, 'Officer', 'peso', 'approved', 1, NOW(), NOW()),
  (2, 'admin@carelink.test', '09171000002', NOW(), 'super_admin',
   '$2y$10$fcV43YJeisb016fuX3cRiOUCZgdCR2toCS4rH50nN7aBADo27Lyxu',
   'Super', NULL, 'Admin', 'admin', 'approved', 1, NOW(), NOW()),
  (3, 'helper@carelink.test', '09171000003', NOW(), 'test_helper',
   '$2y$10$uVr7lJwP.fo2qZpL3av2Zece0b0aRvXI2jbcyfDy.i5iwevYBfT42',
   'Maria', NULL, 'Santos', 'helper', 'approved', 1, NOW(), NOW()),
  (4, 'employer@carelink.test', '09171000004', NOW(), 'test_employer',
   '$2y$10$.0zT/sUKBnW127dRI3HvuO8wFOHRDkTebNgG7kx5VKHHfj.MjVGxG',
   'Juan', NULL, 'Dela Cruz', 'parent', 'approved', 1, NOW(), NOW());

INSERT INTO helper_profiles
  (user_id, birth_date, gender, civil_status, religion,
   province, municipality, barangay, latitude, longitude, address,
   bio, education_level, experience_years, employment_type, work_schedule,
   expected_salary, salary_period, verification_status)
VALUES
  (3, '1996-04-12', 'Female', 'Single', 'Roman Catholic',
   'Leyte', 'Ormoc', 'Cogon', 11.0064000, 124.6075000, 'Cogon, Ormoc, Leyte',
   'Test helper account for API testing.', 'High School Grad', 3,
   'Stay-out', 'Full-time', 6000.00, 'Monthly', 'Pending');

INSERT INTO parent_profiles
  (user_id, province, municipality, barangay,
   latitude, longitude, address, bio, religion, verification_status)
VALUES
  (4, 'Leyte', 'Ormoc', 'Punta',
   11.0092018, 124.6003072, 'Punta, Ormoc, Leyte',
   'Test household employer account for API testing.', 'Roman Catholic', 'Pending');

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 5. Confirm
-- ---------------------------------------------------------------------------
-- Expect four rows, all approved, all with a verified timestamp.
SELECT user_id, email, user_type, status, email_verified_at FROM users ORDER BY user_id;
