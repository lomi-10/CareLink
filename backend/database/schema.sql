-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for carelink
CREATE DATABASE IF NOT EXISTS `carelink` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `carelink`;

-- Dumping structure for table carelink.application_document_shares
CREATE TABLE IF NOT EXISTS `application_document_shares` (
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

-- Dumping data for table carelink.application_document_shares: ~0 rows (approximately)

-- Dumping structure for table carelink.application_tasks
CREATE TABLE IF NOT EXISTS `application_tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `created_by` int NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `due_date` date DEFAULT NULL,
  `requires_photo` tinyint(1) NOT NULL DEFAULT '0',
  `is_recurring` tinyint(1) NOT NULL DEFAULT '0',
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table carelink.application_tasks: ~1 rows (approximately)

-- Dumping structure for table carelink.attendance_logs
CREATE TABLE IF NOT EXISTS `attendance_logs` (
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table carelink.attendance_logs: ~2 rows (approximately)

-- Dumping structure for table carelink.complaints
CREATE TABLE IF NOT EXISTS `complaints` (
  `complaint_id` int NOT NULL AUTO_INCREMENT,
  `complainant_id` int NOT NULL COMMENT 'Who is filing the complaint',
  `complainant_role` enum('parent','helper') COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Complainant role in CareLink',
  `respondent_id` int DEFAULT NULL COMMENT 'Who is being complained about',
  `placement_id` int DEFAULT NULL COMMENT 'Related placement, if applicable',
  `application_id` int DEFAULT NULL COMMENT 'Job application when filed from the mobile/web app',
  `subject` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `category` enum('Misconduct','Fraud / Fake Profile','Non-Payment','Abandonment of Work','Harassment','Property Damage','Unsafe Working Conditions','Abuse or Mistreatment','Contract Dispute','Other') COLLATE utf8mb4_general_ci DEFAULT 'Other',
  `evidence_file` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Optional uploaded evidence',
  `status` enum('Pending','Under Review','Escalated_PESO','Resolved','Dismissed') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Pending',
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

-- Dumping data for table carelink.complaints: ~0 rows (approximately)

-- Dumping structure for table carelink.contracts
CREATE TABLE IF NOT EXISTS `contracts` (
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
  PRIMARY KEY (`contract_id`),
  UNIQUE KEY `uq_contracts_application` (`application_id`),
  KEY `idx_contracts_job` (`job_post_id`),
  KEY `idx_contracts_employer` (`employer_id`),
  KEY `idx_contracts_helper` (`helper_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table carelink.contracts: ~1 rows (approximately)

-- Dumping structure for table carelink.helper_jobs
CREATE TABLE IF NOT EXISTS `helper_jobs` (
  `hj_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `job_id` int NOT NULL COMMENT 'ref_jobs.job_id - specific role',
  PRIMARY KEY (`hj_id`),
  UNIQUE KEY `uk_profile_job` (`profile_id`,`job_id`),
  KEY `idx_job` (`job_id`),
  CONSTRAINT `fk_hjobs_job` FOREIGN KEY (`job_id`) REFERENCES `ref_jobs` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hjobs_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.helper_jobs: ~23 rows (approximately)

-- Dumping structure for table carelink.helper_languages
CREATE TABLE IF NOT EXISTS `helper_languages` (
  `hl_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `language_id` int NOT NULL,
  PRIMARY KEY (`hl_id`),
  UNIQUE KEY `uk_profile_lang` (`profile_id`,`language_id`),
  KEY `idx_language` (`language_id`),
  CONSTRAINT `fk_hlang_language` FOREIGN KEY (`language_id`) REFERENCES `ref_languages` (`language_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hlang_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.helper_languages: ~18 rows (approximately)

-- Dumping structure for table carelink.helper_profiles
CREATE TABLE IF NOT EXISTS `helper_profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `contact_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
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
  `employment_type` enum('Live-in','Live-out','Any') COLLATE utf8mb4_general_ci DEFAULT 'Any' COMMENT 'Accommodation arrangement',
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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.helper_profiles: ~9 rows (approximately)

-- Dumping structure for table carelink.helper_skills
CREATE TABLE IF NOT EXISTS `helper_skills` (
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
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.helper_skills: ~19 rows (approximately)

-- Dumping structure for table carelink.helper_work_history
CREATE TABLE IF NOT EXISTS `helper_work_history` (
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

-- Dumping data for table carelink.helper_work_history: ~0 rows (approximately)

-- Dumping structure for table carelink.interview_schedules
CREATE TABLE IF NOT EXISTS `interview_schedules` (
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
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`interview_id`),
  KEY `idx_application` (`application_id`),
  CONSTRAINT `fk_isched_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.interview_schedules: ~0 rows (approximately)

-- Dumping structure for table carelink.job_applications
CREATE TABLE IF NOT EXISTS `job_applications` (
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
  `termination_reason` enum('moving_away','family_emergency','found_other_work','misconduct','unsafe_conditions','abuse_or_mistreatment','end_of_term','mutual_agreement','other') COLLATE utf8mb4_general_ci DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.job_applications: ~7 rows (approximately)

-- Dumping structure for table carelink.job_posts
CREATE TABLE IF NOT EXISTS `job_posts` (
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
  `salary_period` enum('Daily','Weekly','Monthly') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Monthly',
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
  `posted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
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
  PRIMARY KEY (`job_post_id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_search` (`municipality`,`status`,`employment_type`,`work_schedule`),
  KEY `fk_jposts_language` (`preferred_language_id`),
  KEY `idx_status_expires` (`status`,`expires_at`),
  KEY `idx_verified_by` (`verified_by`),
  CONSTRAINT `fk_jposts_category` FOREIGN KEY (`category_id`) REFERENCES `ref_categories` (`category_id`),
  CONSTRAINT `fk_jposts_language` FOREIGN KEY (`preferred_language_id`) REFERENCES `ref_languages` (`language_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_jposts_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jposts_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.job_posts: ~10 rows (approximately)

-- Dumping structure for table carelink.job_views
CREATE TABLE IF NOT EXISTS `job_views` (
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

-- Dumping data for table carelink.job_views: ~0 rows (approximately)

-- Dumping structure for table carelink.leave_requests
CREATE TABLE IF NOT EXISTS `leave_requests` (
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

-- Dumping data for table carelink.leave_requests: ~0 rows (approximately)

-- Dumping structure for table carelink.log_trail
CREATE TABLE IF NOT EXISTS `log_trail` (
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
) ENGINE=InnoDB AUTO_INCREMENT=592 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.log_trail: ~522 rows (approximately)

-- Dumping structure for table carelink.messages
CREATE TABLE IF NOT EXISTS `messages` (
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
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.messages: ~28 rows (approximately)

-- Dumping structure for table carelink.notifications
CREATE TABLE IF NOT EXISTS `notifications` (
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
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.notifications: ~138 rows (approximately)

-- Dumping structure for table carelink.parent_children
CREATE TABLE IF NOT EXISTS `parent_children` (
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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.parent_children: ~6 rows (approximately)

-- Dumping structure for table carelink.parent_elderly
CREATE TABLE IF NOT EXISTS `parent_elderly` (
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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.parent_elderly: ~6 rows (approximately)

-- Dumping structure for table carelink.parent_household
CREATE TABLE IF NOT EXISTS `parent_household` (
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.parent_household: ~5 rows (approximately)

-- Dumping structure for table carelink.parent_profiles
CREATE TABLE IF NOT EXISTS `parent_profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `contact_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Leyte',
  `municipality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `barangay` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Auto-generated: barangay, municipality, province',
  `landmark` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_general_ci COMMENT 'Short intro about the family',
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.parent_profiles: ~7 rows (approximately)

-- Dumping structure for table carelink.peso_reports
CREATE TABLE IF NOT EXISTS `peso_reports` (
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

-- Dumping data for table carelink.peso_reports: ~0 rows (approximately)

-- Dumping structure for table carelink.placements
CREATE TABLE IF NOT EXISTS `placements` (
  `placement_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int DEFAULT NULL COMMENT 'Source application, if any',
  `parent_id` int NOT NULL,
  `helper_id` int NOT NULL,
  `job_post_id` int DEFAULT NULL,
  `ref_job_id` int DEFAULT NULL,
  `employment_type` enum('Live-in','Live-out') COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Actual agreed arrangement',
  `work_schedule` enum('Full-time','Part-time') COLLATE utf8mb4_general_ci NOT NULL,
  `agreed_salary` decimal(10,2) NOT NULL,
  `salary_period` enum('Daily','Monthly') COLLATE utf8mb4_general_ci DEFAULT 'Monthly',
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.placements: ~3 rows (approximately)

-- Dumping structure for table carelink.placement_renewal_intent
CREATE TABLE IF NOT EXISTS `placement_renewal_intent` (
  `application_id` int NOT NULL COMMENT 'job_applications.application_id',
  `parent_interested` tinyint(1) DEFAULT NULL COMMENT 'NULL undecided, 0 no, 1 yes',
  `helper_interested` tinyint(1) DEFAULT NULL COMMENT 'NULL undecided, 0 no, 1 yes',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.placement_renewal_intent: ~1 rows (approximately)

-- Dumping structure for table carelink.placement_reviews
CREATE TABLE IF NOT EXISTS `placement_reviews` (
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.placement_reviews: ~0 rows (approximately)

-- Dumping structure for table carelink.placement_tasks
CREATE TABLE IF NOT EXISTS `placement_tasks` (
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

-- Dumping data for table carelink.placement_tasks: ~0 rows (approximately)

-- Dumping structure for table carelink.ref_categories
CREATE TABLE IF NOT EXISTS `ref_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'PESO Nature of Work',
  `icon` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Icon name for frontend',
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uk_category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.ref_categories: ~6 rows (approximately)

-- Dumping structure for table carelink.ref_jobs
CREATE TABLE IF NOT EXISTS `ref_jobs` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `job_title` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`job_id`),
  KEY `idx_category` (`category_id`),
  CONSTRAINT `fk_rjobs_category` FOREIGN KEY (`category_id`) REFERENCES `ref_categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.ref_jobs: ~15 rows (approximately)

-- Dumping structure for table carelink.ref_languages
CREATE TABLE IF NOT EXISTS `ref_languages` (
  `language_id` int NOT NULL AUTO_INCREMENT,
  `language_name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`language_id`),
  UNIQUE KEY `uk_language` (`language_name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.ref_languages: ~10 rows (approximately)

-- Dumping structure for table carelink.ref_skills
CREATE TABLE IF NOT EXISTS `ref_skills` (
  `skill_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`skill_id`),
  KEY `idx_job` (`job_id`),
  CONSTRAINT `fk_rskills_job` FOREIGN KEY (`job_id`) REFERENCES `ref_jobs` (`job_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.ref_skills: ~21 rows (approximately)

-- Dumping structure for table carelink.saved_jobs
CREATE TABLE IF NOT EXISTS `saved_jobs` (
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table carelink.saved_jobs: ~1 rows (approximately)

-- Dumping structure for table carelink.saved_profiles
CREATE TABLE IF NOT EXISTS `saved_profiles` (
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

-- Dumping data for table carelink.saved_profiles: ~0 rows (approximately)

-- Dumping structure for table carelink.saved_searches
CREATE TABLE IF NOT EXISTS `saved_searches` (
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

-- Dumping data for table carelink.saved_searches: ~0 rows (approximately)

-- Dumping structure for table carelink.users
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
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
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_usertype` (`user_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.users: ~20 rows (approximately)

-- Dumping structure for table carelink.user_documents
CREATE TABLE IF NOT EXISTS `user_documents` (
  `document_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `document_type` enum('Barangay Clearance','Valid ID','Police Clearance','TESDA NC2') COLLATE utf8mb4_general_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Server path to uploaded file',
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
  PRIMARY KEY (`document_id`),
  UNIQUE KEY `uk_user_doctype` (`user_id`,`document_type`) COMMENT 'One record per document type per user',
  KEY `idx_status` (`status`),
  KEY `idx_verified_by` (`verified_by`),
  CONSTRAINT `fk_udocs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_udocs_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.user_documents: ~34 rows (approximately)

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

-- ---------------------------------------------------------------------------
-- Migration: add profile_views to helper_profiles (Profile Views stat)
-- Run this against an existing database that predates this column.
-- ---------------------------------------------------------------------------
ALTER TABLE `helper_profiles` ADD COLUMN IF NOT EXISTS `profile_views` int DEFAULT '0' AFTER `rating_count`;

-- ---------------------------------------------------------------------------
-- Migration: profile_view_log — tracks who viewed a helper profile and when
-- Allows helpers to see which parents viewed their profile (last 7 days).
-- Rate-limited at the app layer: one entry per viewer-helper pair per hour.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profile_view_log` (
  `view_id`     int NOT NULL AUTO_INCREMENT,
  `helper_id`   int NOT NULL,
  `viewer_id`   int NOT NULL,
  `viewer_type` enum('parent') NOT NULL DEFAULT 'parent',
  `viewed_at`   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`view_id`),
  KEY `idx_helper_viewed` (`helper_id`, `viewed_at`),
  KEY `idx_viewer` (`viewer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- Migration: salary range on job_posts (salary_min / salary_max)
-- salary_min replaces salary_offered as the advertised minimum (≥ ₱7,000).
-- salary_offered is kept for backward compat and set equal to salary_min.
-- ---------------------------------------------------------------------------
ALTER TABLE `job_posts`
  ADD COLUMN IF NOT EXISTS `salary_min` decimal(10,2) DEFAULT NULL COMMENT 'Minimum salary offered (≥ ₱7,000)',
  ADD COLUMN IF NOT EXISTS `salary_max` decimal(10,2) DEFAULT NULL COMMENT 'Maximum salary offered (optional)';

-- ---------------------------------------------------------------------------
-- Migration: new contract confirmation fields on contracts table
-- These are set at hire time via HireContractTermsModal (not job post).
-- ---------------------------------------------------------------------------
ALTER TABLE `contracts`
  ADD COLUMN IF NOT EXISTS `contract_duration` varchar(50) DEFAULT NULL COMMENT '3 Months / 6 Months / 1 Year / 2 Years / Indefinite',
  ADD COLUMN IF NOT EXISTS `confirmed_salary`  decimal(10,2) DEFAULT NULL COMMENT 'Salary confirmed at hire (≥ ₱7,000)',
  ADD COLUMN IF NOT EXISTS `work_hours`        varchar(100) DEFAULT NULL COMMENT 'e.g. 8am–5pm',
  ADD COLUMN IF NOT EXISTS `rest_days`         json DEFAULT NULL COMMENT 'Array of weekday names, e.g. ["Sun","Sat"]',
  ADD COLUMN IF NOT EXISTS `vacation_leave_days` int DEFAULT 5 COMMENT 'Vacation leave days per year',
  ADD COLUMN IF NOT EXISTS `sick_leave_days`   int DEFAULT 5 COMMENT 'Sick leave days per year',
  ADD COLUMN IF NOT EXISTS `special_conditions` text DEFAULT NULL COMMENT 'Special agreements at hire time';

-- ---------------------------------------------------------------------------
-- Migration: PESO BK-1 18-item template fields on contracts table
-- Set at hire time via HireContractTermsModal (Compensation / Additional Terms).
-- ---------------------------------------------------------------------------
ALTER TABLE `contracts`
  ADD COLUMN IF NOT EXISTS `overtime_rate`          varchar(100) DEFAULT NULL COMMENT 'Item 7b: overtime rate per hour, e.g. 50',
  ADD COLUMN IF NOT EXISTS `payment_schedule`       varchar(100) DEFAULT NULL COMMENT 'Item 7c: salary payment schedule',
  ADD COLUMN IF NOT EXISTS `other_benefits`         text DEFAULT NULL COMMENT 'Item 10: other benefits, if any',
  ADD COLUMN IF NOT EXISTS `debt_agreement`         text DEFAULT NULL COMMENT 'Item 11: debt agreement, if any',
  ADD COLUMN IF NOT EXISTS `deployment_agreement`   text DEFAULT NULL COMMENT 'Item 12: deployment cost agreement, if any',
  ADD COLUMN IF NOT EXISTS `termination_conditions` text DEFAULT NULL COMMENT 'Item 13: termination conditions, if any';

-- ---------------------------------------------------------------------------
-- Migration: numeric debt amount + helper acknowledgment (RA 10364 safeguard —
-- debt bondage via unchecked deployment/debt agreements). debt_amount lets the
-- system warn when it exceeds one month's salary; debt_acknowledged_at records
-- that the helper explicitly accepted the terms before signing.
-- ---------------------------------------------------------------------------
ALTER TABLE `contracts`
  ADD COLUMN IF NOT EXISTS `debt_amount`           decimal(10,2) DEFAULT NULL COMMENT 'Numeric debt/deployment amount, alongside the free-text debt_agreement',
  ADD COLUMN IF NOT EXISTS `debt_acknowledged_at`  datetime DEFAULT NULL COMMENT 'When the helper explicitly acknowledged debt terms before signing';

-- ---------------------------------------------------------------------------
-- Migration: password re-entry attempts (digital signature confirmation, RA 8792)
-- Tracks failed attempts on /v1/auth/verify_password.php; 5 failures locks
-- further verification for that user for 5 minutes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_verify_attempts` (
  `user_id` int NOT NULL,
  `attempt_count` int NOT NULL DEFAULT 0,
  `last_attempt` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_password_verify_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Migration: helper "request contract changes" flag on contracts table
-- Set by /v1/applications/request_contract_changes.php when the helper asks
-- the employer to review/regenerate the contract before signing; cleared by
-- /parent/edit_contract.php once the employer regenerates the contract.
-- ---------------------------------------------------------------------------
ALTER TABLE `contracts`
  ADD COLUMN IF NOT EXISTS `helper_decline_reason` varchar(1000) DEFAULT NULL COMMENT 'Helper-submitted reason for requesting contract changes',
  ADD COLUMN IF NOT EXISTS `helper_decline_at` datetime DEFAULT NULL COMMENT 'When the helper last requested contract changes';

-- ---------------------------------------------------------------------------
-- Migration: align placements.employment_type / work_schedule with job_posts
-- job_posts.employment_type was renamed from ('Live-in','Live-out','Any') to
-- ('Stay-in','Stay-out','Any'), but placements.employment_type was left as
-- ('Live-in','Live-out') NOT NULL — carelink_finalize_hire_after_contract()
-- copies jp.employment_type/work_schedule straight into placements, so a
-- 'Stay-in'/'Stay-out'/'Any' value (or work_schedule = 'Any') triggers
-- "Data truncated for column 'employment_type'" when signing a contract.
-- ---------------------------------------------------------------------------
ALTER TABLE `placements`
  MODIFY COLUMN `employment_type` enum('Live-in','Live-out','Stay-in','Stay-out','Any') COLLATE utf8mb4_general_ci NOT NULL,
  MODIFY COLUMN `work_schedule` enum('Full-time','Part-time','Any') COLLATE utf8mb4_general_ci NOT NULL;

UPDATE `placements` SET `employment_type` = 'Stay-in'  WHERE `employment_type` = 'Live-in';
UPDATE `placements` SET `employment_type` = 'Stay-out' WHERE `employment_type` = 'Live-out';

ALTER TABLE `placements`
  MODIFY COLUMN `employment_type` enum('Stay-in','Stay-out','Any') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Any' COMMENT 'Accommodation arrangement (snapshot at hire time)';

-- ---------------------------------------------------------------------------
-- Migration: privacy consent at registration (RA 10173 / NPC Circular 16-01).
-- Records when the user explicitly agreed to data collection/processing;
-- signup.php rejects registration if this consent is not given.
-- ---------------------------------------------------------------------------
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `privacy_consent_at` datetime DEFAULT NULL COMMENT 'When the user agreed to data processing at signup (RA 10173 / NPC Circular 16-01)';

-- ---------------------------------------------------------------------------
-- Migration: AI document pre-verification (Google Gemini vision).
-- Reuses the existing ai_verification_status / ai_confidence_score columns as
-- the "current result". Adds the AI-extracted fields (for PESO name-match
-- review) and a timestamp distinct from verified_at (PESO's manual decision).
-- ---------------------------------------------------------------------------
ALTER TABLE `user_documents`
  ADD COLUMN IF NOT EXISTS `ai_extracted_data` json DEFAULT NULL COMMENT 'AI-extracted fields from the Gemini scan (name, id number, dob, legitimacy_score, etc.)',
  ADD COLUMN IF NOT EXISTS `ai_checked_at` datetime DEFAULT NULL COMMENT 'When the AI scan produced its result (distinct from verified_at = PESO manual decision)';
