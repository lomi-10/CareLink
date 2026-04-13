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

-- Dumping structure for table carelink.complaints
CREATE TABLE IF NOT EXISTS `complaints` (
  `complaint_id` int NOT NULL AUTO_INCREMENT,
  `complainant_id` int NOT NULL COMMENT 'Who is filing the complaint',
  `respondent_id` int DEFAULT NULL COMMENT 'Who is being complained about',
  `placement_id` int DEFAULT NULL COMMENT 'Related placement, if applicable',
  `subject` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci NOT NULL,
  `category` enum('Misconduct','Fraud / Fake Profile','Non-Payment','Abandonment of Work','Harassment','Property Damage','Other') COLLATE utf8mb4_general_ci DEFAULT 'Other',
  `evidence_file` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Optional uploaded evidence',
  `status` enum('Pending','Under Review','Resolved','Dismissed') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `resolution_notes` text COLLATE utf8mb4_general_ci,
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
  CONSTRAINT `fk_comp_complainant` FOREIGN KEY (`complainant_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comp_placement` FOREIGN KEY (`placement_id`) REFERENCES `placements` (`placement_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comp_resolved_by` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comp_respondent` FOREIGN KEY (`respondent_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.complaints: ~0 rows (approximately)

-- Dumping structure for table carelink.contracts
CREATE TABLE IF NOT EXISTS `contracts` (
  `contract_id` int NOT NULL AUTO_INCREMENT,
  `placement_id` int NOT NULL,
  `contract_type` enum('Initial','Renewal','Amendment') COLLATE utf8mb4_general_ci DEFAULT 'Initial',
  `contract_file` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Path to generated/uploaded PDF',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL COMMENT 'NULL = indefinite',
  `salary` decimal(10,2) NOT NULL,
  `salary_period` enum('Daily','Monthly') COLLATE utf8mb4_general_ci DEFAULT 'Monthly',
  `benefits` text COLLATE utf8mb4_general_ci COMMENT 'SSS, PhilHealth, Pag-IBIG, etc.',
  `duties` text COLLATE utf8mb4_general_ci NOT NULL,
  `work_hours` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'e.g., 8AM-5PM, Mon-Sat',
  `rest_days` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'e.g., Sunday',
  `parent_signed` tinyint(1) DEFAULT '0',
  `helper_signed` tinyint(1) DEFAULT '0',
  `parent_signed_at` timestamp NULL DEFAULT NULL,
  `helper_signed_at` timestamp NULL DEFAULT NULL,
  `status` enum('Draft','Active','Expired','Terminated') COLLATE utf8mb4_general_ci DEFAULT 'Draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`contract_id`),
  KEY `idx_placement` (`placement_id`),
  CONSTRAINT `fk_contracts_placement` FOREIGN KEY (`placement_id`) REFERENCES `placements` (`placement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.contracts: ~0 rows (approximately)

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
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.helper_jobs: ~15 rows (approximately)
INSERT INTO `helper_jobs` (`hj_id`, `profile_id`, `job_id`) VALUES
	(32, 1, 1),
	(33, 1, 2),
	(29, 1, 3),
	(30, 1, 4),
	(31, 1, 5),
	(34, 1, 6),
	(35, 1, 7),
	(36, 1, 8),
	(37, 1, 9),
	(39, 1, 10),
	(38, 1, 11),
	(40, 1, 12),
	(41, 1, 13),
	(42, 1, 14),
	(43, 1, 15);

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
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.helper_languages: ~6 rows (approximately)
INSERT INTO `helper_languages` (`hl_id`, `profile_id`, `language_id`) VALUES
	(63, 1, 1),
	(64, 1, 2),
	(65, 1, 3),
	(66, 1, 4),
	(67, 1, 5),
	(68, 1, 6);

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
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Auto-generated: barangay, municipality, province',
  `landmark` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_general_ci,
  `education_level` enum('Elementary','High School Undergrad','High School Grad','College Undergrad','College Grad','Vocational') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `experience_years` int DEFAULT '0',
  `employment_type` enum('Live-in','Live-out','Any') COLLATE utf8mb4_general_ci DEFAULT 'Any' COMMENT 'Accommodation arrangement',
  `work_schedule` enum('Full-time','Part-time','Any') COLLATE utf8mb4_general_ci DEFAULT 'Any' COMMENT 'Hours commitment (college students = Part-time)',
  `expected_salary` decimal(10,2) DEFAULT '6000.00' COMMENT 'Minimum per PESO: ₱6,000',
  `salary_period` enum('Daily','Monthly') COLLATE utf8mb4_general_ci DEFAULT 'Monthly',
  `availability_status` enum('Available','Employed','Not Available') COLLATE utf8mb4_general_ci DEFAULT 'Available',
  `custom_jobs` text COLLATE utf8mb4_general_ci DEFAULT (_utf8mb4'[]'),
  `custom_skills` text COLLATE utf8mb4_general_ci DEFAULT (_utf8mb4'[]'),
  `verification_status` enum('Unverified','Pending','Verified','Rejected') COLLATE utf8mb4_general_ci DEFAULT 'Unverified',
  `rating_average` decimal(3,2) DEFAULT '0.00',
  `rating_count` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_search` (`municipality`,`availability_status`,`employment_type`,`work_schedule`),
  KEY `idx_verification` (`verification_status`),
  CONSTRAINT `fk_hprofile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.helper_profiles: ~1 rows (approximately)
INSERT INTO `helper_profiles` (`profile_id`, `user_id`, `contact_number`, `profile_image`, `birth_date`, `gender`, `civil_status`, `religion`, `province`, `municipality`, `barangay`, `address`, `landmark`, `bio`, `education_level`, `experience_years`, `employment_type`, `work_schedule`, `expected_salary`, `salary_period`, `availability_status`, `custom_jobs`, `custom_skills`, `verification_status`, `rating_average`, `rating_count`, `created_at`, `updated_at`) VALUES
	(1, 1, '09396954318', 'http://localhost/carelink_api/uploads/profiles/helper_1_1774364835.jpg', '2002-03-10', 'Male', 'Single', 'Catholic', 'Leyte', 'Palompon', 'San Josekol', 'San Josekol, Palompon, Leyte', 'Near SM', 'I am good', 'High School Grad', 0, 'Live-out', 'Part-time', 6000.00, 'Monthly', 'Available', '[]', '[]', 'Verified', 0.00, 0, '2026-03-02 01:44:36', '2026-03-30 05:03:12'),
	(2, 14, NULL, NULL, NULL, NULL, 'Single', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'Any', 'Any', 6000.00, 'Monthly', 'Available', '[]', '[]', 'Unverified', 0.00, 0, '2026-03-30 13:46:28', NULL);

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
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.helper_skills: ~7 rows (approximately)
INSERT INTO `helper_skills` (`hs_id`, `profile_id`, `skill_id`, `proficiency_level`, `years_experience`) VALUES
	(19, 1, 5, 'Intermediate', 0),
	(20, 1, 6, 'Intermediate', 0),
	(21, 1, 7, 'Intermediate', 0),
	(22, 1, 2, 'Intermediate', 0),
	(23, 1, 1, 'Intermediate', 0),
	(24, 1, 3, 'Intermediate', 0),
	(25, 1, 4, 'Intermediate', 0);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.interview_schedules: ~0 rows (approximately)

-- Dumping structure for table carelink.job_applications
CREATE TABLE IF NOT EXISTS `job_applications` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `job_post_id` int NOT NULL,
  `helper_id` int NOT NULL COMMENT 'users.user_id of helper',
  `cover_letter` text COLLATE utf8mb4_general_ci,
  `status` enum('Pending','Reviewed','Shortlisted','Interview Scheduled','Accepted','Rejected','Withdrawn') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `parent_notes` text COLLATE utf8mb4_general_ci COMMENT 'Private notes by parent',
  `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uk_job_helper` (`job_post_id`,`helper_id`),
  KEY `idx_helper` (`helper_id`),
  KEY `idx_status` (`status`),
  KEY `idx_helper_job` (`helper_id`,`job_post_id`),
  CONSTRAINT `fk_japps_helper` FOREIGN KEY (`helper_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_japps_job` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.job_applications: ~0 rows (approximately)

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
  `employment_type` enum('Live-in','Live-out','Any') COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Accommodation arrangement',
  `work_schedule` enum('Full-time','Part-time','Any') COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Hours commitment',
  `salary_offered` decimal(10,2) NOT NULL COMMENT 'Minimum: ₱6,000/month',
  `salary_period` enum('Daily','Monthly') COLLATE utf8mb4_general_ci DEFAULT 'Monthly',
  `benefits` text COLLATE utf8mb4_general_ci COMMENT 'SSS, PhilHealth, Pag-IBIG, etc.',
  `province` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `municipality` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `barangay` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `preferred_religion` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `preferred_language_id` int DEFAULT NULL COMMENT 'ref_languages.language_id',
  `require_police_clearance` tinyint(1) DEFAULT '0' COMMENT 'Parent can require this',
  `prefer_tesda_nc2` tinyint(1) DEFAULT '0',
  `status` enum('Open','Filled','Closed','Expired','Pending') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `posted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `filled_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `skill_ids` json DEFAULT NULL COMMENT 'Array of selected skill IDs',
  `custom_skills` text COLLATE utf8mb4_general_ci DEFAULT NULL,
  `min_age` int DEFAULT NULL COMMENT 'Minimum age requirement',
  `max_age` int DEFAULT NULL COMMENT 'Maximum age requirement',
  `min_experience_years` int DEFAULT NULL COMMENT 'Minimum years of experience',
  `start_date` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Preferred start date',
  `work_hours` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Work hours (e.g., 8am-5pm)',
  `days_off` json DEFAULT NULL COMMENT 'Array of preferred days off',
  `contract_duration` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Contract duration',
  `probation_period` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Probation period',
  `provides_meals` tinyint(1) DEFAULT '0',
  `provides_accommodation` tinyint(1) DEFAULT '0',
  `provides_sss` tinyint(1) DEFAULT '0',
  `provides_philhealth` tinyint(1) DEFAULT '0',
  `provides_pagibig` tinyint(1) DEFAULT '0',
  `vacation_days` int DEFAULT '0',
  `sick_days` int DEFAULT '0',
  PRIMARY KEY (`job_post_id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_search` (`municipality`,`status`,`employment_type`,`work_schedule`),
  KEY `fk_jposts_language` (`preferred_language_id`),
  KEY `idx_status_expires` (`status`,`expires_at`),
  CONSTRAINT `fk_jposts_category` FOREIGN KEY (`category_id`) REFERENCES `ref_categories` (`category_id`),
  CONSTRAINT `fk_jposts_language` FOREIGN KEY (`preferred_language_id`) REFERENCES `ref_languages` (`language_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_jposts_parent` FOREIGN KEY (`parent_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.job_posts: ~1 rows (approximately)

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
) ENGINE=InnoDB AUTO_INCREMENT=186 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping structure for table carelink.messages
CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `job_post_id` int DEFAULT NULL COMMENT 'Optional context: which job this is about',
  `message_text` text COLLATE utf8mb4_general_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `read_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  KEY `idx_thread` (`sender_id`,`receiver_id`),
  KEY `fk_msg_job` (`job_post_id`),
  CONSTRAINT `fk_msg_job` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_msg_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.messages: ~0 rows (approximately)

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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.parent_children: ~1 rows (approximately)
INSERT INTO `parent_children` (`child_id`, `profile_id`, `age`, `gender`, `special_needs`, `created_at`, `updated_at`) VALUES
	(7, 1, 18, 'Male', 'Autism', '2026-03-15 16:38:01', NULL);

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.parent_elderly: ~0 rows (approximately)
INSERT INTO `parent_elderly` (`elderly_id`, `profile_id`, `age`, `gender`, `condition`, `care_level`, `created_at`, `updated_at`) VALUES
	(1, 1, 61, 'Female', 'Bedridden', 'Fully Dependent', '2026-03-15 16:38:01', NULL);

-- Dumping structure for table carelink.parent_household
CREATE TABLE IF NOT EXISTS `parent_household` (
  `household_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `household_size` int DEFAULT NULL COMMENT 'Total number of people in the house',
  `has_children` tinyint(1) DEFAULT '0' COMMENT 'Quick flag; details in parent_children',
  `has_elderly` tinyint(1) DEFAULT '0' COMMENT 'Quick flag; details in parent_elderly',
  `has_pets` tinyint(1) DEFAULT '0',
  `pet_details` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'e.g., 2 dogs, 1 cat',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`household_id`),
  UNIQUE KEY `uk_profile_id` (`profile_id`),
  CONSTRAINT `fk_phousehold_profile` FOREIGN KEY (`profile_id`) REFERENCES `parent_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.parent_household: ~1 rows (approximately)
INSERT INTO `parent_household` (`household_id`, `profile_id`, `household_size`, `has_children`, `has_elderly`, `has_pets`, `pet_details`, `created_at`, `updated_at`) VALUES
	(1, 1, 10, 1, 1, 1, '2 dogs german cut', '2026-03-15 10:54:38', '2026-03-15 16:38:01');

-- Dumping structure for table carelink.parent_profiles
CREATE TABLE IF NOT EXISTS `parent_profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `contact_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Leyte',
  `municipality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `barangay` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Auto-generated: barangay, municipality, province',
  `landmark` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_general_ci COMMENT 'Short intro about the family',
  `verification_status` enum('Unverified','Pending','Verified','Rejected') COLLATE utf8mb4_general_ci DEFAULT 'Unverified',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  CONSTRAINT `fk_pprofile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.parent_profiles: ~2 rows (approximately)
INSERT INTO `parent_profiles` (`profile_id`, `user_id`, `contact_number`, `profile_image`, `province`, `municipality`, `barangay`, `address`, `landmark`, `bio`, `verification_status`, `created_at`, `updated_at`) VALUES
	(1, 2, '09396954318', 'http://localhost/carelink_api/uploads/profiles/parentProfile_2_1773577099.jpg', 'Leyte', 'Isabela', 'San Jose', 'San Jose, Isabela, Leyte', 'Near our House', 'Test Bio', 'Verified', '2026-03-05 10:16:53', '2026-03-15 17:17:09'),
	(2, 9, NULL, NULL, 'Leyte', NULL, NULL, NULL, NULL, NULL, 'Verified', '2026-03-25 05:54:51', '2026-03-25 05:57:13');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.placements: ~0 rows (approximately)

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.placement_reviews: ~0 rows (approximately)

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
INSERT INTO `ref_categories` (`category_id`, `category_name`, `icon`, `description`) VALUES
	(1, 'General Househelp', 'home', 'General household chores and maintenance'),
	(2, 'Yaya', 'child', 'Childcare and child supervision'),
	(3, 'Cook', 'restaurant', 'Food preparation and kitchen management'),
	(4, 'Gardener', 'leaf', 'Garden and outdoor maintenance'),
	(5, 'Laundry Person', 'shirt', 'Laundry, ironing, and clothing care'),
	(6, 'Others', 'ellipsis', 'Other domestic services not listed above');

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
INSERT INTO `ref_jobs` (`job_id`, `category_id`, `job_title`, `description`) VALUES
	(1, 1, 'Housekeeper', 'General cleaning and home maintenance'),
	(2, 1, 'Household Manager', 'Managing the overall household operations'),
	(3, 2, 'Yaya / Nanny', 'Primary childcare provider'),
	(4, 2, 'Babysitter', 'Occasional or part-time child supervision'),
	(5, 2, 'Infant Care Specialist', 'Specialized care for newborns 0-12 months'),
	(6, 3, 'Family Cook', 'Preparing daily meals for the household'),
	(7, 3, 'Meal Prep Cook', 'Batch cooking and meal planning'),
	(8, 4, 'Gardener', 'Plant care and garden maintenance'),
	(9, 4, 'Landscape Aide', 'Maintaining lawn and outdoor spaces'),
	(10, 5, 'Laundry Person', 'Washing and caring for clothes and linens'),
	(11, 5, 'Ironing Specialist', 'Pressing and folding garments'),
	(12, 6, 'Elderly Caregiver', 'Assisting senior citizens with daily needs'),
	(13, 6, 'Family Driver', 'Driving family members for errands and activities'),
	(14, 6, 'Errand Runner', 'Handling outside tasks like bills, grocery, etc.'),
	(15, 6, 'Pet Care Aide', 'Feeding, walking, and grooming pets');

-- Dumping structure for table carelink.ref_languages
CREATE TABLE IF NOT EXISTS `ref_languages` (
  `language_id` int NOT NULL AUTO_INCREMENT,
  `language_name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`language_id`),
  UNIQUE KEY `uk_language` (`language_name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.ref_languages: ~10 rows (approximately)
INSERT INTO `ref_languages` (`language_id`, `language_name`) VALUES
	(8, 'Bicolano'),
	(2, 'Cebuano'),
	(3, 'English'),
	(5, 'Hiligaynon / Ilonggo'),
	(4, 'Ilocano'),
	(7, 'Kapampangan'),
	(10, 'Other'),
	(9, 'Pangasinan'),
	(1, 'Tagalog'),
	(6, 'Waray');

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
INSERT INTO `ref_skills` (`skill_id`, `job_id`, `skill_name`, `description`) VALUES
	(1, 1, 'Sweeping & Mopping', 'Regular floor cleaning'),
	(2, 1, 'Deep Cleaning', 'Thorough cleaning of rooms and bathrooms'),
	(3, 1, 'Organizing & Tidying', 'Keeping the home neat and orderly'),
	(4, 1, 'Marketing / Grocery', 'Buying supplies within a given budget'),
	(5, 3, 'Toddler Care (1-5 yrs)', 'Supervision and activities for young children'),
	(6, 3, 'School-Age Child Care', 'After-school care for children 6-12'),
	(7, 3, 'Child with Special Needs', 'Care for children with autism, ADHD, or disability'),
	(8, 3, 'Homework Assistance', 'Helping children with school assignments'),
	(9, 5, 'Newborn Care (0-12 mos)', 'Bathing, feeding, and soothing newborns'),
	(10, 5, 'Breastfeeding Support', 'Assisting nursing mothers'),
	(11, 6, 'Filipino Cuisine', 'Preparing traditional Filipino dishes'),
	(12, 6, 'Special Diet Cooking', 'Diabetic, low-sodium, or allergen-free meals'),
	(13, 6, 'Baking', 'Baking breads, cakes, and pastries'),
	(14, 8, 'Plant Watering & Pruning', 'Basic plant maintenance'),
	(15, 8, 'Vegetable Garden', 'Growing and maintaining vegetable plots'),
	(16, 10, 'Hand Washing', 'Manual laundry washing'),
	(17, 10, 'Machine Operation', 'Using washing machines and dryers'),
	(18, 10, 'Ironing & Folding', 'Pressing and proper folding of clothes'),
	(19, 12, 'Medication Reminders', 'Tracking and reminding patients to take medicine'),
	(20, 12, 'Bedridden Patient Care', 'Turning, sponge baths, and hygiene for bed patients'),
	(21, 12, 'Dementia / Alzheimer Care', 'Patience-based care and safety supervision');

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table carelink.saved_jobs: ~0 rows (approximately)
INSERT INTO `saved_jobs` (`saved_id`, `helper_id`, `job_post_id`, `saved_at`) VALUES
	(1, 1, 2, '2026-03-25 01:30:58');

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
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.users: ~7 rows (approximately)
INSERT INTO `users` (`user_id`, `email`, `username`, `password`, `first_name`, `middle_name`, `last_name`, `user_type`, `status`, `profile_completed`, `created_at`, `updated_at`, `last_login`) VALUES
	(1, 'sean@gmail.com', 'sean3656', '$2y$10$ix2Ys48ZgJFPe5J9MiTUtO0Mq8r4LO4kZ.3KhXvL3Iqbfh1tjS6eG', 'Sean Howie', 'Genshin Impact', 'Eulogio', 'helper', 'approved', 0, '2026-03-02 01:44:36', '2026-03-30 05:03:12', NULL),
	(2, 'kirby@gmail.com', 'kirby1942', '$2y$10$/kaQADUGo.YF61535.m3RuLiZaJGjmQidyie6IpfMVO5yDk5IR0Lm', 'Kirby', 'Baguion', 'Calderon', 'parent', 'approved', 0, '2026-03-05 10:16:53', '2026-03-15 17:17:09', NULL),
	(3, 'jess@carelink.com', 'jess123', '$2y$10$ASsCdY8WMNQRxUK8.PU/FukYJhHabfbZgB1xLufF6TMzbsMONCywW', 'Jess', 'Baguion', 'Almene', 'admin', 'approved', 1, '2026-03-05 13:09:38', '2026-03-15 06:07:20', NULL),
	(4, 'gabriel@peso.com', 'gabriel1234', '$2y$10$AyQ.MzYEngRYjmxhNE3kNO1qkr8ikXYMGEfI2Khvlym5ctz1AZKh2', 'Gabriel', NULL, 'Suarez', 'peso', 'approved', 1, '2026-03-05 13:52:11', '2026-03-15 06:07:20', NULL),
	(5, 'jarid@carelink.com', 'jarid606', '$2y$10$ZRmzSar3WfZJg0Y6TPlEPeH8JNBCjLNIM.232lCmA86qYkXZMka7W', 'Jarid', '', 'Lumangtad', 'admin', 'approved', 1, '2026-03-06 13:46:25', NULL, NULL),
	(9, 'newparent@gmail.com', 'newparent9599', '$2y$10$l0CEbqL.9JP1ynumGJC6aO65VKuA92BXq7NVxTJl/RWNgyFnRebRi', 'New', '', 'Parent', 'parent', 'approved', 0, '2026-03-25 05:54:51', '2026-03-25 05:57:13', NULL),
	(14, 'sample@gmail.com', 'sample4618', '$2y$10$8Ls3IE7VDjrYwpTRUPEmjuHIpalENMEp9xM1Upb4EPgWvfI7VS2Py', 'sample', '', 'helper', 'helper', 'pending', 0, '2026-03-30 13:46:28', NULL, NULL);

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.user_documents: ~8 rows (approximately)
INSERT INTO `user_documents` (`document_id`, `user_id`, `document_type`, `file_path`, `id_type`, `expiry_date`, `status`, `ai_verification_status`, `ai_confidence_score`, `rejection_reason`, `verified_by`, `verified_at`, `uploaded_at`, `updated_at`) VALUES
	(1, 1, 'Barangay Clearance', 'barangay_1_1773489962.jpg', NULL, NULL, 'Pending', 'Unchecked', NULL, NULL, NULL, '2026-03-07 15:37:07', '2026-03-14 12:06:02', '2026-03-14 12:06:02'),
	(2, 1, 'Valid ID', 'valid_id_1_1773489962.png', 'PhilSys', NULL, 'Pending', 'Unchecked', NULL, NULL, NULL, '2026-03-07 15:37:10', '2026-03-14 12:06:02', '2026-03-14 12:06:02'),
	(3, 1, 'Police Clearance', 'police_1_1773489989.jpg', NULL, NULL, 'Pending', 'Unchecked', NULL, NULL, NULL, NULL, '2026-03-14 12:06:29', NULL),
	(4, 1, 'TESDA NC2', 'tesda_1_1773489989.jpg', NULL, NULL, 'Rejected', 'Unchecked', NULL, 'Amat', NULL, NULL, '2026-03-14 12:06:29', '2026-03-30 05:42:03'),
	(7, 2, 'Valid ID', 'parent_validid_2_1773594913.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-03-15 17:17:06', '2026-03-15 17:15:13', '2026-03-15 17:17:06'),
	(8, 2, 'Barangay Clearance', 'parent_brgy_2_1773594913.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-03-15 17:17:03', '2026-03-15 17:15:13', '2026-03-15 17:17:03'),
	(9, 9, 'Valid ID', 'parent_validid_9_1774418179.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-03-25 05:57:07', '2026-03-25 05:56:19', '2026-03-25 05:57:07'),
	(10, 9, 'Barangay Clearance', 'parent_brgy_9_1774418179.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-03-25 05:57:10', '2026-03-25 05:56:19', '2026-03-25 05:57:10');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
