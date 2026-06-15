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
INSERT INTO `application_tasks` (`id`, `application_id`, `created_by`, `title`, `description`, `due_date`, `requires_photo`, `is_recurring`, `recur_days`, `status`, `completed_at`, `photo_url`, `created_at`, `updated_at`) VALUES
	(1, 3, 2, 'Clean the pets', NULL, NULL, 0, 0, NULL, 'pending', NULL, NULL, '2026-04-19 13:55:59', '2026-04-19 13:55:59');

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
INSERT INTO `attendance_logs` (`id`, `application_id`, `helper_id`, `date`, `checked_in_at`, `checked_out_at`, `status`, `note`, `created_at`, `updated_at`) VALUES
	(1, 3, 17, '2026-04-19', '2026-04-19 19:29:39', '2026-04-19 19:29:41', 'present', NULL, '2026-04-19 11:29:39', '2026-04-19 11:29:41'),
	(2, 3, 17, '2026-04-20', '2026-04-20 02:59:51', '2026-04-20 03:00:45', 'present', NULL, '2026-04-19 18:59:51', '2026-04-19 19:00:45'),
	(3, 3, 17, '2026-04-23', '2026-04-23 14:38:39', NULL, 'present', NULL, '2026-04-23 06:38:39', '2026-04-23 06:38:39'),
	(4, 3, 17, '2026-04-27', '2026-04-27 12:34:46', NULL, 'present', NULL, '2026-04-27 04:34:46', '2026-04-27 04:34:46'),
	(5, 5, 21, '2026-04-28', '2026-04-28 20:33:07', NULL, 'present', NULL, '2026-04-28 12:33:07', '2026-04-28 12:33:07'),
	(6, 3, 17, '2026-05-06', '2026-05-06 18:13:29', NULL, 'present', NULL, '2026-05-06 10:13:29', '2026-05-06 10:13:29');

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
  `category` enum('Misconduct','Fraud / Fake Profile','Non-Payment','Abandonment of Work','Harassment','Property Damage','Other') COLLATE utf8mb4_general_ci DEFAULT 'Other',
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
INSERT INTO `contracts` (`contract_id`, `application_id`, `job_post_id`, `employer_id`, `helper_id`, `pdf_file_path`, `template_version`, `created_at`, `employment_start_date`, `employment_end_date`, `terms_notes`, `rest_day`, `special_days`) VALUES
	(1, 3, 3, 2, 17, 'contracts/contract_app3_20260418_140554.pdf', 'BK-1-v1', '2026-04-18 14:05:54', '2026-04-25', '2027-04-25', NULL, NULL, NULL),
	(2, 4, 6, 19, 18, 'contracts/contract_app4_20260428_183310.pdf', 'BK-1-v1', '2026-04-28 18:33:10', '2026-04-29', '2027-06-29', NULL, NULL, NULL),
	(3, 5, 7, 20, 21, 'contracts/contract_app5_20260428_201613.pdf', 'BK-1-v1', '2026-04-28 20:16:13', '2026-04-29', '2026-10-29', 'Extend Months', NULL, NULL);

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
INSERT INTO `helper_jobs` (`hj_id`, `profile_id`, `job_id`) VALUES
	(74, 1, 1),
	(75, 1, 2),
	(76, 1, 3),
	(77, 1, 4),
	(78, 1, 5),
	(79, 1, 6),
	(80, 1, 7),
	(81, 1, 8),
	(82, 1, 9),
	(83, 1, 10),
	(84, 1, 11),
	(85, 1, 12),
	(86, 1, 13),
	(87, 1, 14),
	(88, 1, 15),
	(45, 3, 1),
	(44, 3, 2),
	(73, 4, 8),
	(68, 5, 1),
	(69, 5, 2),
	(71, 6, 1),
	(70, 6, 2),
	(72, 9, 10);

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
INSERT INTO `helper_languages` (`hl_id`, `profile_id`, `language_id`) VALUES
	(100, 1, 1),
	(101, 1, 2),
	(102, 1, 3),
	(103, 1, 4),
	(104, 1, 5),
	(105, 1, 6),
	(69, 3, 2),
	(98, 4, 1),
	(99, 4, 2),
	(89, 5, 1),
	(90, 5, 2),
	(91, 5, 3),
	(92, 6, 1),
	(93, 6, 2),
	(94, 6, 3),
	(95, 9, 1),
	(96, 9, 2),
	(97, 9, 3);

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
INSERT INTO `helper_profiles` (`profile_id`, `user_id`, `contact_number`, `profile_image`, `birth_date`, `gender`, `civil_status`, `religion`, `province`, `municipality`, `barangay`, `latitude`, `longitude`, `address`, `landmark`, `bio`, `education_level`, `experience_years`, `employment_type`, `work_schedule`, `expected_salary`, `salary_period`, `custom_jobs`, `custom_skills`, `verification_status`, `rating_average`, `rating_count`, `created_at`, `updated_at`, `verified_by`, `verified_at`, `rejected_by`, `rejected_at`, `rejection_reason`) VALUES
	(1, 1, '09396954318', 'http://localhost/carelink_api/uploads/profiles/helper_1_1774364835.jpg', '2002-03-10', 'Male', 'Single', 'Catholic', 'Leyte', 'Palompon', 'Mazawalo', 11.0464299, 124.3860640, 'Mazawalo, Palompon, Leyte', 'Near SM', 'I am good and very very good', 'High School Grad', 0, 'Live-out', 'Part-time', 6000.00, 'Monthly', '[]', '[]', 'Verified', 0.00, 0, '2026-03-02 01:44:36', '2026-06-05 16:43:52', NULL, NULL, NULL, NULL, NULL),
	(2, 14, NULL, NULL, NULL, NULL, 'Single', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'Any', 'Any', 6000.00, 'Monthly', '[]', '[]', 'Unverified', 0.00, 0, '2026-03-30 13:46:28', NULL, NULL, NULL, NULL, NULL, NULL),
	(3, 15, '09999999999', NULL, '2001-10-13', 'Female', 'Single', 'Catholic', 'Leyte', 'Ormoc', 'Punta', NULL, NULL, 'Punta, Ormoc, Leyte', 'near riverside', 'Sample', 'College Grad', 0, 'Any', 'Any', 6000.00, 'Monthly', '[]', '[]', 'Verified', 0.00, 0, '2026-04-08 09:09:42', '2026-04-14 15:01:27', 4, '2026-04-14 15:01:27', NULL, NULL, NULL),
	(4, 17, '09999999999', 'http://localhost/carelink_api/uploads/profiles/helper_17_1776166680.jpg', '2001-10-13', 'Female', 'Single', 'Catholic', 'Cebu', 'Pilar', 'Esperanza', 10.7998654, 124.5364924, 'Esperanza, Pilar, Cebu', 'near riverside', 'Kuan kanang Bio ni kurt russel ardines', 'High School Grad', 100, 'Live-out', 'Part-time', 6000.00, 'Monthly', '[]', '[]', 'Verified', 0.00, 0, '2026-04-12 16:27:01', '2026-05-25 18:07:46', 4, '2026-04-14 14:50:11', NULL, NULL, NULL),
	(5, 18, '09999999999', 'http://localhost/carelink_api/uploads/profiles/helper_18_1777366827.jpg', '2005-12-03', 'Male', 'Single', 'Catholic', 'Cebu', 'Pilar', 'Upper Poblacion', NULL, NULL, 'Upper Poblacion, Pilar, Cebu', 'near municipal hall', 'Im a great Helper', 'College Grad', 2, 'Live-out', 'Part-time', 8000.00, 'Monthly', '[]', '[]', 'Verified', 0.00, 0, '2026-04-28 08:56:29', '2026-04-28 10:13:57', 4, '2026-04-28 10:13:57', NULL, NULL, NULL),
	(6, 21, '09999999', 'http://localhost/carelink_api/uploads/profiles/helper_21_1777375647.jpg', '2007-02-01', 'Female', 'Single', 'Roman Catholic', 'Leyte', 'Isabel', 'Matlang', NULL, NULL, 'Matlang, Isabel, Leyte', 'Near elem school', 'Sample Bio Helper', 'High School Grad', 2, 'Live-in', 'Full-time', 6000.00, 'Monthly', '[]', '[]', 'Verified', 0.00, 0, '2026-04-28 11:02:35', '2026-04-28 11:43:35', 22, '2026-04-28 11:43:35', NULL, NULL, NULL),
	(7, 23, NULL, NULL, NULL, NULL, 'Single', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'Any', 'Any', 6000.00, 'Monthly', '[]', '[]', 'Unverified', 0.00, 0, '2026-05-11 06:48:14', NULL, NULL, NULL, NULL, NULL, NULL),
	(8, 24, NULL, NULL, NULL, NULL, 'Single', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'Any', 'Any', 6000.00, 'Monthly', '[]', '[]', 'Unverified', 0.00, 0, '2026-05-11 06:49:24', NULL, NULL, NULL, NULL, NULL, NULL),
	(9, 26, '099999999', 'http://localhost/carelink_api/uploads/profiles/helper_26_1778483681.jpg', '2002-12-11', 'Male', 'Single', 'Catholic', 'Leyte', 'Merida', 'Poblacion', NULL, NULL, 'Poblacion, Merida, Leyte', 'near ivan\'s bakeshop', 'Labandera in your hood', 'High School Grad', 4, 'Live-out', 'Full-time', 6000.00, 'Monthly', '[]', '[]', 'Verified', 0.00, 0, '2026-05-11 06:58:56', '2026-05-11 07:50:03', 22, '2026-05-11 07:50:03', NULL, NULL, NULL);

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
INSERT INTO `helper_skills` (`hs_id`, `profile_id`, `skill_id`, `proficiency_level`, `years_experience`) VALUES
	(26, 3, 1, 'Intermediate', 0),
	(27, 3, 2, 'Intermediate', 0),
	(44, 5, 1, 'Intermediate', 0),
	(45, 5, 2, 'Intermediate', 0),
	(46, 5, 3, 'Intermediate', 0),
	(47, 5, 4, 'Intermediate', 0),
	(48, 6, 1, 'Intermediate', 0),
	(49, 6, 2, 'Intermediate', 0),
	(50, 6, 3, 'Intermediate', 0),
	(51, 6, 4, 'Intermediate', 0),
	(52, 9, 16, 'Intermediate', 0),
	(53, 4, 14, 'Intermediate', 0),
	(54, 1, 1, 'Intermediate', 0),
	(55, 1, 2, 'Intermediate', 0),
	(56, 1, 3, 'Intermediate', 0),
	(57, 1, 4, 'Intermediate', 0),
	(58, 1, 5, 'Intermediate', 0),
	(59, 1, 6, 'Intermediate', 0),
	(60, 1, 7, 'Intermediate', 0);

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
INSERT INTO `interview_schedules` (`interview_id`, `application_id`, `interview_date`, `interview_type`, `location_or_link`, `parent_confirmed`, `helper_confirmed`, `status`, `notes`, `result`, `created_at`, `updated_at`) VALUES
	(1, 4, '2026-04-29 10:29:33', 'In-person', 'ormoc city plaza', 1, 0, 'Scheduled', 'Meet in there in time', 'Pending', '2026-04-28 10:30:05', NULL),
	(2, 6, '2026-05-12 07:42:25', 'In-person', 'Ormoc Plaza', 1, 0, 'Scheduled', '', 'Pending', '2026-05-11 07:42:41', NULL);

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
  `termination_reason` enum('moving_away','family_emergency','found_other_work','misconduct','end_of_term','mutual_agreement','other') COLLATE utf8mb4_general_ci DEFAULT NULL,
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
INSERT INTO `job_applications` (`application_id`, `job_post_id`, `helper_id`, `cover_letter`, `status`, `parent_notes`, `applied_at`, `reviewed_at`, `updated_at`, `employer_signed_at`, `helper_signed_at`, `termination_initiated_by`, `contract_generated_at`, `leave_days_used`, `termination_reason`, `termination_note`, `termination_notice_date`, `termination_last_day`) VALUES
	(1, 2, 1, 'xhSXSxsDWBJHBDWBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'Pending', NULL, '2026-04-08 04:18:16', '2026-04-08 05:43:06', '2026-04-08 05:50:33', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
	(2, 5, 17, 'hvhhfhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', 'auto_rejected', 'Closed automatically: employer is proceeding with another of your applications with them.', '2026-04-14 17:59:35', '2026-04-18 06:05:54', '2026-04-18 06:05:54', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
	(3, 3, 17, 'nkjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj', 'termination_pending', NULL, '2026-04-16 16:55:49', '2026-04-18 06:06:35', '2026-04-28 03:16:18', '2026-04-18 14:06:05', '2026-04-18 14:06:35', 17, '2026-04-18 14:05:54', 0, 'mutual_agreement', '', '2026-04-28', '2026-04-28'),
	(4, 6, 18, 'my skills and expertise perfectly match your job description', 'hired', NULL, '2026-04-28 10:27:59', '2026-04-28 10:33:52', '2026-04-28 10:33:52', '2026-04-28 18:33:23', '2026-04-28 18:33:52', NULL, '2026-04-28 18:33:10', 0, NULL, NULL, NULL, NULL),
	(5, 7, 21, 'SampleSampleSampleSampleSampleSampleSampleSampleSampleSample', 'hired', NULL, '2026-04-28 12:06:03', '2026-04-28 12:23:19', '2026-04-28 12:23:19', '2026-04-28 20:17:35', '2026-04-28 20:23:19', NULL, '2026-04-28 20:16:13', 0, NULL, NULL, NULL, NULL),
	(6, 8, 1, 'i believe my skills matches in your job description', 'Interview Scheduled', NULL, '2026-05-11 07:37:57', '2026-05-11 07:41:48', '2026-05-11 07:42:41', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
	(7, 9, 26, 'Sample LetterSample LetterSample LetterSample Letter', 'Shortlisted', NULL, '2026-05-11 08:07:24', '2026-05-11 08:12:04', '2026-05-11 08:12:04', NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
	(8, 9, 17, 'lololopbkl iyfbguhijihgtdrsasedrtfyuioikhgjfhdser6tyuij', 'Pending', NULL, '2026-05-12 18:01:36', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
	(9, 8, 17, 'Dear New Parent,\n\nI am writing to express my strong interest in the Laundry Person position you have posted. I believe my skills and experience make me a great fit for this role.\n\nI have experience in Laundry Person and I am confident I can perform the duties required. I am hardworking, reliable, and eager to contribute to your household.\n\nI would welcome the opportunity to discuss how I can be of service to you and your family. Thank you for considering my application!\n\nSincerely,\n[Your Name]', 'Pending', NULL, '2026-05-24 16:45:10', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL),
	(10, 2, 17, 'Dear Kirby Calderon,\n\nI am writing to express my strong interest in the Family Cook position you have posted. I believe my skills and experience make me a great fit for this role.\n\nI have experience in Cook and I am confident I can perform the duties required. I am hardworking, reliable, and eager to contribute to your household.\n\nI would welcome the opportunity to discuss how I can be of service to you and your family. Thank you for considering my application!\n\nSincerely,\n[Your Name]', 'Pending', NULL, '2026-06-03 07:12:33', NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL);

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
INSERT INTO `job_posts` (`job_post_id`, `parent_id`, `category_id`, `custom_category`, `job_ids`, `title`, `custom_job_title`, `description`, `employment_type`, `work_schedule`, `salary_offered`, `salary_period`, `benefits`, `province`, `municipality`, `barangay`, `latitude`, `longitude`, `preferred_religion`, `preferred_language_id`, `require_police_clearance`, `prefer_tesda_nc2`, `status`, `posted_at`, `expires_at`, `filled_at`, `updated_at`, `skill_ids`, `custom_skills`, `min_age`, `max_age`, `min_experience_years`, `start_date`, `work_hours`, `days_off`, `contract_duration`, `provides_meals`, `provides_accommodation`, `provides_sss`, `provides_philhealth`, `provides_pagibig`, `vacation_days`, `sick_days`, `verified_by`, `verified_at`, `rejection_reason`) VALUES
	(2, 2, 3, '', '["6"]', 'Family Cook', '', 'CookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookCookingnounououb', 'Stay-out', 'Part-time', 8000.00, 'Monthly', '13th month pay', 'Leyte', 'Isabela', 'San Jose', NULL, NULL, 'Roman Catholic', 8, 1, 1, 'Open', '2026-04-06 14:31:00', NULL, NULL, '2026-05-25 15:28:41', '["13", "11"]', '0', 18, 65, 0, 'Apr 15, 2026', NULL, '["Saturday", "Tuesday"]', 'Indefinite', 1, 1, 0, 1, 0, 10, 10, NULL, NULL, NULL),
	(3, 2, 6, 'Pet Care', '["15"]', 'Pet Care Aide', '', 'The Impact You\'ll Make\nAs a Pet Care Aide, you’ll be the heartbeat of our animal care operations. Your hands-on care will ensure that every pet feels safe, healthy, and loved. From feeding and grooming to playtime and health monitoring, you’ll be making a direct difference in the lives of animals and the families who cherish them.\n\nWhat You\'ll Do\nProvide daily feeding, fresh water, and enrichment activities for dogs, cats, and other small animals.\nMaintain clean, safe, and comfortable living spaces—sanitizing kennels, litter boxes, and play areas.\nMonitor animal behavior and health, promptly reporting any changes or concerns to veterinary staff.\nAssist with grooming tasks such as bathing, brushing, and nail trimming.\nSupport exercise routines, including supervised play sessions and walks.\nComfort and calm anxious or newly arrived animals through gentle handling and positive interaction.\nHelp with intake and discharge processes, ensuring accurate records and smooth transitions for pets.\nWhat You\'ll Bring\nA genuine love for animals and a commitment to their well-being.\nExperience in animal care (shelter, kennel, veterinary clinic, or pet sitting) is a plus, but not required—we value passion and willingness to learn.\nAbility to handle animals of various sizes and temperaments safely and confidently.\nPhysical stamina for active, sometimes physically demanding work.\nStrong observation skills to detect changes in animal behavior or health.\nReliability, empathy, and a team-oriented mindset.\nWhy You\'ll Love It Here\nWork in a supportive, animal-loving environment where your compassion makes a real difference.\nHands-on training in animal handling, health monitoring, and enrichment techniques.\nOpportunities to grow into veterinary assistant or animal behavior roles.\nStaff discounts on pet supplies and services.\nFlexible scheduling options to support work-life balance.\nWe are an equal opportunity employer and welcome applicants from all backgrounds.\n\nJoin Us\nIf you have a heart for animals and a desire to make their days brighter, we’d love to meet you. Send us your resume—and if you have one, a short note about your favorite animal care experience. Let’s create happier tails together. 🐾', 'Stay-out', 'Part-time', 8000.00, 'Monthly', 'Extra Payment for Overtime', 'Leyte', 'Isabela', 'San Jose', NULL, NULL, 'Iglesia ni Cristo', 8, 1, 1, 'Filled', '2026-04-07 02:51:29', NULL, '2026-04-18 06:06:35', '2026-05-25 15:28:41', '[]', 'Knows how to take care of pets', 18, 65, 0, 'Apr 25, 2026', '8:00 am - 10:00 pm', '["Wednesday", "Thursday"]', '1 year', 1, 0, 1, 0, 0, 5, 5, 4, '2026-04-18 02:45:48', NULL),
	(4, 16, 3, '', '["6"]', 'Family Cook', NULL, 'samplesmdsamplesmdsamplesmdsamplesmdsamplesmdsamplesmdsamplesmdsamplesmdsamplesmdsamplesmdsamplesmdsamplesmd', 'Any', 'Any', 8000.00, 'Monthly', '', 'Leyte', 'Ormoc', 'Cogon', NULL, NULL, 'Roman Catholic', 2, 1, 1, 'Open', '2026-04-08 09:30:26', NULL, NULL, '2026-04-14 09:16:55', '["13", "11"]', '', 18, 65, 0, 'Apr 30, 2026', NULL, '["Wednesday", "Thursday"]', '6 months', 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL),
	(5, 2, 4, '', '["8"]', 'Gardener', NULL, 'loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll loolllll', 'Stay-out', 'Part-time', 8000.00, 'Daily', '', 'Leyte', 'Isabela', 'San Jose', NULL, NULL, 'Roman Catholic', 8, 1, 1, 'Open', '2026-04-14 17:16:16', NULL, NULL, '2026-05-25 15:28:41', '["14", "15"]', '', 18, 65, 0, 'Apr 30, 2026', NULL, '["Thursday"]', 'Indefinite', 0, 0, 0, 0, 0, 0, 0, 4, '2026-04-14 17:29:34', NULL),
	(6, 19, 1, '', '["2", "1"]', 'Household Manager, Housekeeper', NULL, 'We are looking for general househelp.', 'Stay-out', 'Part-time', 8000.00, 'Monthly', 'SSS', 'Leyte', 'Ormoc City', '', NULL, NULL, 'Roman Catholic', 2, 1, 1, 'Filled', '2026-04-28 10:23:24', NULL, '2026-04-28 10:33:52', '2026-05-25 15:28:41', '["2", "4", "3", "1"]', '', 18, 40, 1, 'Apr 29, 2026', '8:00am-6:00pm', '["Sunday", "Saturday"]', 'Indefinite', 1, 1, 1, 0, 0, 30, 30, 4, '2026-04-28 10:25:10', NULL),
	(7, 20, 1, '', '["2", "1"]', 'Household Manager, Housekeeper', NULL, 'SampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSample', 'Stay-in', 'Full-time', 8000.00, 'Monthly', 'SSS', 'Leyte', 'Ormoc City', '', NULL, NULL, 'Roman Catholic', 2, 1, 1, 'Filled', '2026-04-28 11:51:23', NULL, '2026-04-28 12:23:19', '2026-05-25 15:28:41', '["2", "4", "1", "3"]', '', 18, 65, 2, 'Apr 29, 2026', '8:00am-9:00pm', '["Sunday"]', '6 months', 1, 0, 1, 0, 0, 0, 0, 22, '2026-04-28 11:54:27', NULL),
	(8, 20, 5, '', '["10"]', 'Laundry Person', NULL, 'SampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSampleSample', 'Stay-out', 'Part-time', 6000.00, 'Monthly', 'SSS', 'Leyte', 'Ormoc City', '', NULL, NULL, 'Iglesia ni Cristo', 3, 1, 1, 'Open', '2026-04-28 11:53:13', NULL, NULL, '2026-05-25 15:28:41', '["16", "18"]', '', 18, 65, 0, 'Apr 30, 2026', '8:00am-9:00pm', '["Sunday"]', '6 months', 0, 0, 0, 0, 0, 0, 0, 22, '2026-04-28 11:53:57', NULL),
	(9, 27, 6, 'Driver', '["14"]', 'Driving (Driving)', NULL, 'Sample descriptionSample descriptionSample descriptionSample descriptionSample descriptionSample descriptionSample descriptionSample descriptionSample descriptionSample description', 'Stay-in', 'Full-time', 8000.00, 'Monthly', '', 'Leyte', 'Ormoc City', '', NULL, NULL, 'Roman Catholic', 2, 1, 1, 'Open', '2026-05-11 08:04:16', NULL, NULL, '2026-05-25 15:28:41', '[]', 'Driving, Licensed\n', 30, 65, 1, 'May 12, 2026', NULL, '["Tuesday", "Saturday"]', 'Indefinite', 0, 0, 0, 0, 0, 0, 0, 22, '2026-05-11 08:05:06', NULL),
	(10, 2, 1, '', '["2"]', 'Household Manager', NULL, 'We are looking for a reliable helper to join our family!\n\nResponsibilities include:\n• general household related tasks\n• Maintaining a clean and organized home\n• Following family instructions carefully\n• Other duties as assigned\n\nRequirements:\n• Honest and hardworking\n• Good communication skills\n• Willing to learn\n• Previous experience is a plus\n\nWe offer a friendly, respectful working environment!', 'Any', 'Any', 8000.00, 'Monthly', '', 'Leyte', 'Ormoc City', '', NULL, NULL, 'Islam', 8, 1, 1, 'Rejected', '2026-05-24 16:47:30', NULL, NULL, '2026-06-06 07:25:30', '[]', '', 18, 65, 0, NULL, NULL, '[]', 'Indefinite', 1, 0, 1, 0, 0, 0, 0, 4, '2026-06-06 07:25:30', 'incomplete'),
	(11, 27, 4, '', '["9"]', 'Landscape Aide', NULL, 'We are looking for a dedicated Landscape Aide to take care of our garden and outdoor spaces!\n\nResponsibilities include:\n• Planting, watering, and maintaining plants and flowers\n• Mowing the lawn and trimming hedges\n• Keeping the garden clean and free of debris\n• Assisting with outdoor maintenance tasks\n\nRequirements:\n• Enjoys working with plants and outdoors\n• Basic gardening knowledge is a plus\n• Physically fit and able to do manual work\n• Reliable and hardworking\n\nWe offer a nice working environment and fair pay!', 'Stay-out', 'Part-time', 8000.00, 'Weekly', '', 'Leyte', 'Ormoc City', '', NULL, NULL, 'Roman Catholic', 2, 1, 1, 'Open', '2026-06-06 07:24:35', NULL, NULL, '2026-06-06 07:25:20', '[]', 'plant plant', 18, 65, 10, 'Jun 19, 2026', NULL, '["Monday", "Thursday"]', 'Indefinite', 1, 0, 1, 0, 0, 0, 0, 4, '2026-06-06 07:25:20', NULL);

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
INSERT INTO `log_trail` (`log_id`, `user_id`, `action`, `module`, `record_id`, `status`, `ip_address`, `device_info`, `created_at`) VALUES
	(1, 1, 'LOGIN', NULL, NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-02 01:44:42'),
	(2, 1, 'LOGIN', NULL, NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-02 01:44:47'),
	(3, 1, 'LOGIN', NULL, NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-02 01:47:52'),
	(4, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-02 01:53:45'),
	(5, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-02 02:22:26'),
	(6, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 09:43:34'),
	(7, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 10:16:58'),
	(8, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:10:23'),
	(9, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:10:29'),
	(10, 3, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:11:37'),
	(11, 3, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:12:04'),
	(12, 3, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:35:49'),
	(13, 3, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:36:12'),
	(14, 3, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:36:42'),
	(15, 3, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:44:15'),
	(16, 3, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:47:02'),
	(17, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 13:52:48'),
	(18, 3, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 14:05:50'),
	(19, 3, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-06 07:03:00'),
	(20, 3, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-06 13:18:54'),
	(21, 3, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-06 13:19:10'),
	(22, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-06 14:59:36'),
	(23, 1, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-03-06 15:39:47'),
	(24, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-07 05:40:39'),
	(25, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-07 05:58:29'),
	(26, 4, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-07 08:24:19'),
	(27, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-07 08:24:36'),
	(28, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-07 12:02:21'),
	(29, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-07 15:37:27'),
	(30, 1, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-07 15:37:46'),
	(31, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 03:25:08'),
	(32, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 03:42:20'),
	(33, 2, 'LOGIN', 'Auth', NULL, '', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 03:43:13'),
	(34, 2, 'LOGOUT', NULL, NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 03:43:36'),
	(35, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 03:43:43'),
	(36, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 03:51:57'),
	(37, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 03:52:45'),
	(38, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 04:56:19'),
	(39, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 04:56:23'),
	(40, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-08 04:56:34'),
	(41, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/145.0.0.0', '2026-03-14 12:01:07'),
	(42, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 12:01:31'),
	(43, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 12:04:27'),
	(44, 1, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-03-14 12:06:02'),
	(45, 1, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-03-14 12:06:29'),
	(46, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 12:14:05'),
	(47, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 12:15:01'),
	(48, 1, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-03-14 15:06:11'),
	(49, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 15:06:58'),
	(50, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/145.0.0.0', '2026-03-14 15:24:16'),
	(51, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 15:24:37'),
	(52, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 15:48:31'),
	(53, 4, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-03-14 15:51:23'),
	(54, 1, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-03-14 15:51:41'),
	(55, 1, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-03-14 16:22:14'),
	(56, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 16:27:55'),
	(57, 1, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-03-14 16:28:52'),
	(58, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-14 16:29:29'),
	(59, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 06:06:11'),
	(60, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 06:06:46'),
	(61, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 06:08:50'),
	(62, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 06:09:04'),
	(63, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 06:09:45'),
	(64, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 06:43:09'),
	(65, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/145.0.0.0', '2026-03-15 06:54:39'),
	(66, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/145.0.0.0', '2026-03-15 09:44:49'),
	(67, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/145.0.0.0', '2026-03-15 09:46:23'),
	(68, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/145.0.0.0', '2026-03-15 09:48:52'),
	(69, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/145.0.0.0', '2026-03-15 09:49:02'),
	(70, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 10:50:25'),
	(71, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 10:52:23'),
	(72, 2, 'LOGIN', 'Auth', NULL, 'Failed', '192.168.1.104', 'okhttp/4.12.0', '2026-03-15 11:37:23'),
	(73, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 15:12:24'),
	(74, 1, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-03-15 15:39:42'),
	(75, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 15:57:23'),
	(76, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 15:57:29'),
	(77, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 16:01:36'),
	(78, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 16:01:42'),
	(79, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 16:05:36'),
	(80, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/145.0.0.0', '2026-03-15 16:06:47'),
	(81, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 16:27:02'),
	(82, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 16:52:59'),
	(83, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 16:58:41'),
	(84, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 17:16:51'),
	(85, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-15 17:17:51'),
	(86, 2, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-03-16 03:32:42'),
	(87, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-16 07:48:02'),
	(88, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-16 07:55:08'),
	(89, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-16 07:56:11'),
	(90, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-16 08:16:55'),
	(91, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-16 08:20:54'),
	(92, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-16 08:30:53'),
	(93, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-16 08:45:40'),
	(94, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-16 09:17:17'),
	(95, 2, 'LOGIN', 'Auth', NULL, 'Success', '10.27.81.215', 'okhttp/4.12.0', '2026-03-17 09:20:29'),
	(96, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-17 09:23:01'),
	(97, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-18 02:03:23'),
	(98, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-19 00:28:03'),
	(99, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-19 01:02:02'),
	(100, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-19 01:02:43'),
	(101, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-19 01:44:46'),
	(102, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-20 10:43:04'),
	(103, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-22 15:26:50'),
	(104, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-24 13:26:03'),
	(105, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-24 15:07:29'),
	(106, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-24 15:13:01'),
	(107, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-24 15:19:19'),
	(108, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-24 15:20:09'),
	(109, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-24 15:21:27'),
	(110, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-24 15:38:07'),
	(111, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-24 17:14:38'),
	(112, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-24 17:14:58'),
	(113, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-24 17:15:59'),
	(114, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-24 17:17:23'),
	(115, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 01:26:53'),
	(116, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 01:50:17'),
	(117, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 01:50:56'),
	(118, 1, 'LOGIN', 'Auth', NULL, 'Success', '10.60.115.17', 'okhttp/4.12.0', '2026-03-25 02:46:12'),
	(119, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-25 04:34:35'),
	(120, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 04:35:09'),
	(121, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 04:56:36'),
	(122, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 05:02:53'),
	(123, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 05:04:08'),
	(124, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 05:36:55'),
	(125, 9, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 05:55:21'),
	(126, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 05:56:49'),
	(127, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 05:57:22'),
	(128, 9, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 05:57:43'),
	(129, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 05:59:55'),
	(130, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 13:34:06'),
	(131, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 13:39:28'),
	(132, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 13:40:16'),
	(133, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 17:00:30'),
	(134, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 17:00:44'),
	(135, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-25 17:03:56'),
	(136, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-26 08:17:14'),
	(137, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-26 08:17:24'),
	(138, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-26 09:36:15'),
	(139, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-26 09:36:26'),
	(140, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-26 09:37:03'),
	(141, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-26 09:37:38'),
	(142, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-26 09:37:55'),
	(143, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-28 16:37:15'),
	(144, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-28 16:37:49'),
	(145, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-29 06:29:19'),
	(146, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-29 06:29:37'),
	(147, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-29 06:30:23'),
	(148, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-29 06:31:16'),
	(149, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-29 06:51:42'),
	(150, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-29 12:06:22'),
	(151, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-29 12:10:23'),
	(152, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-29 12:10:50'),
	(153, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-29 12:11:07'),
	(154, 2, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-03-29 12:24:55'),
	(155, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-03-29 12:27:23'),
	(156, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 04:58:02'),
	(157, 1, 'LOGIN', 'Auth', NULL, 'Success', '191.168.89.118', 'okhttp/4.12.0', '2026-03-30 05:01:35'),
	(158, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 05:04:52'),
	(159, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 05:20:51'),
	(160, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 05:21:10'),
	(161, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 05:31:06'),
	(162, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 05:32:41'),
	(163, 3, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 05:33:45'),
	(164, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 05:38:32'),
	(165, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 05:43:17'),
	(166, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 06:40:57'),
	(167, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 06:43:33'),
	(168, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 06:48:17'),
	(169, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 06:52:32'),
	(170, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 06:52:56'),
	(171, 3, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 06:54:26'),
	(172, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 13:38:33'),
	(173, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 13:39:38'),
	(174, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 13:39:49'),
	(175, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 13:40:51'),
	(176, 14, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-30 13:47:04'),
	(177, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-01 10:43:19'),
	(178, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-02 10:33:46'),
	(179, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-05 10:02:45'),
	(180, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-05 10:02:55'),
	(181, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-05 13:30:34'),
	(182, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-05 16:22:25'),
	(183, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-06 00:57:57'),
	(184, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-06 01:08:48'),
	(185, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-06 01:09:38'),
	(186, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-07 02:51:51'),
	(187, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 02:38:43'),
	(188, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 02:39:15'),
	(189, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 03:38:55'),
	(190, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 03:55:41'),
	(191, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 03:55:55'),
	(192, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 04:36:31'),
	(193, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 04:38:33'),
	(194, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 04:38:49'),
	(195, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 05:34:25'),
	(196, 2, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 05:42:12'),
	(197, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 05:42:47'),
	(198, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 06:25:24'),
	(199, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 06:48:49'),
	(200, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 06:49:59'),
	(201, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 06:56:19'),
	(202, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 06:56:31'),
	(203, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 07:00:51'),
	(204, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 07:01:46'),
	(205, 15, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 09:10:59'),
	(206, 15, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-04-08 09:18:18'),
	(207, 16, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 09:18:50'),
	(208, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 09:22:22'),
	(209, 16, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 09:26:47'),
	(210, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 09:31:47'),
	(211, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-08 09:35:17'),
	(212, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-11 04:15:14'),
	(213, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-11 04:15:35'),
	(214, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-11 06:04:32'),
	(215, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 15:47:26'),
	(216, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 15:48:29'),
	(217, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 15:51:59'),
	(218, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 15:53:22'),
	(219, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 15:55:26'),
	(220, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 15:55:48'),
	(221, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 15:56:59'),
	(222, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 16:23:48'),
	(223, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 16:25:26'),
	(224, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 16:27:05'),
	(225, 17, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 16:27:15'),
	(226, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 16:46:59'),
	(227, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 16:47:54'),
	(228, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 16:48:35'),
	(229, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 17:35:32'),
	(230, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 17:43:40'),
	(231, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/146.0.0.0', '2026-04-12 17:44:31'),
	(232, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 17:59:25'),
	(233, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-12 18:02:24'),
	(234, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 08:49:05'),
	(235, 17, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 09:15:56'),
	(236, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 09:16:42'),
	(237, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 09:47:27'),
	(238, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 11:05:08'),
	(239, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 11:31:53'),
	(240, 17, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 11:36:04'),
	(241, 17, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-04-14 11:37:39'),
	(242, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 11:38:30'),
	(243, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 11:38:33'),
	(244, 17, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 11:38:50'),
	(245, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 11:39:06'),
	(246, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 11:43:54'),
	(247, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 18, 'Success', NULL, NULL, '2026-04-14 14:37:15'),
	(248, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 17, 'Success', NULL, NULL, '2026-04-14 14:37:18'),
	(249, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 15, 'Success', NULL, NULL, '2026-04-14 14:37:22'),
	(250, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 16, 'Success', NULL, NULL, '2026-04-14 14:37:24'),
	(251, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 17, 'Success', NULL, NULL, '2026-04-14 14:37:27'),
	(252, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 17, 'Success', NULL, NULL, '2026-04-14 14:37:31'),
	(253, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 17, 'Success', NULL, NULL, '2026-04-14 14:37:36'),
	(254, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 17, 'Success', NULL, NULL, '2026-04-14 14:37:43'),
	(255, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 17, 'Success', NULL, NULL, '2026-04-14 14:46:36'),
	(256, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 17, 'Success', NULL, NULL, '2026-04-14 14:50:11'),
	(257, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 14:59:15'),
	(258, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 15, 'Success', NULL, NULL, '2026-04-14 14:59:31'),
	(259, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 15, 'Success', NULL, NULL, '2026-04-14 14:59:35'),
	(260, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 15, 'Success', NULL, NULL, '2026-04-14 15:01:27'),
	(261, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 16:33:41'),
	(262, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 16:33:48'),
	(263, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 16:33:55'),
	(264, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 16:34:04'),
	(265, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 16:34:12'),
	(266, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 16:35:11'),
	(267, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 17:16:34'),
	(268, 4, 'VERIFY_JOB_APPROVE', 'PESO Job Verification', 5, 'Success', NULL, NULL, '2026-04-14 17:29:34'),
	(269, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 17:29:47'),
	(270, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 17:34:17'),
	(271, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 17:35:05'),
	(272, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 17:45:23'),
	(273, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 17:49:51'),
	(274, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 17:58:53'),
	(275, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-04-14 17:59:45'),
	(276, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-15 14:37:18'),
	(277, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 15:13:22'),
	(278, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 17:28:26'),
	(279, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 17:31:07'),
	(280, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 17:33:36'),
	(281, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 17:38:24'),
	(282, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 17:55:36'),
	(283, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 17:58:58'),
	(284, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 17:59:19'),
	(285, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 17:59:54'),
	(286, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 18:00:40'),
	(287, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-15 18:38:27'),
	(288, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-15 18:39:24'),
	(289, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-16 13:40:20'),
	(290, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-16 16:24:15'),
	(291, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-16 16:54:22'),
	(292, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-16 16:54:35'),
	(293, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-16 16:54:59'),
	(294, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-16 16:55:31'),
	(295, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-16 16:56:03'),
	(296, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-16 17:42:34'),
	(297, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-16 18:31:18'),
	(298, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-16 18:32:37'),
	(299, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-17 04:06:35'),
	(300, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-17 04:32:42'),
	(301, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-17 04:52:16'),
	(302, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-17 06:21:15'),
	(303, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-17 06:21:40'),
	(304, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-17 06:23:01'),
	(305, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-17 06:25:09'),
	(306, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-17 07:55:56'),
	(307, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-17 10:00:35'),
	(308, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-17 17:38:22'),
	(309, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 02:45:37'),
	(310, 4, 'VERIFY_JOB_APPROVE', 'PESO Job Verification', 3, 'Success', NULL, NULL, '2026-04-18 02:45:48'),
	(311, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 02:45:58'),
	(312, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 03:08:23'),
	(313, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 03:09:27'),
	(314, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 03:09:30'),
	(315, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 03:19:06'),
	(316, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 03:56:30'),
	(317, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 03:56:50'),
	(318, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 04:09:25'),
	(319, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 05:43:29'),
	(320, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 06:06:15'),
	(321, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 07:05:52'),
	(322, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 18:11:33'),
	(323, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 18:11:51'),
	(324, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-18 18:12:23'),
	(325, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 03:00:53'),
	(326, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 11:20:58'),
	(327, 4, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-04-19 11:28:21'),
	(328, 17, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-04-19 11:28:57'),
	(329, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 11:35:03'),
	(330, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 13:52:53'),
	(331, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 13:54:50'),
	(332, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 13:56:18'),
	(333, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 14:23:20'),
	(334, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 15:00:35'),
	(335, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 17:13:53'),
	(336, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-19 18:59:33'),
	(337, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 02:52:00'),
	(338, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 02:54:26'),
	(339, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 02:55:34'),
	(340, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 07:43:11'),
	(341, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 07:45:50'),
	(342, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 07:46:17'),
	(343, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 08:28:40'),
	(344, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 12:16:55'),
	(345, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-20 14:06:12'),
	(346, 1, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-04-20 16:23:07'),
	(347, 2, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-04-20 16:23:44'),
	(348, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-21 06:37:08'),
	(349, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-21 06:38:23'),
	(350, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-21 06:41:10'),
	(351, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-21 07:53:04'),
	(352, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-21 09:29:24'),
	(353, 1, 'LOGIN', 'Auth', NULL, 'Success', '10.246.178.239', 'okhttp/4.12.0', '2026-04-23 06:25:41'),
	(354, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 12:04:05'),
	(355, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 12:10:06'),
	(356, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 12:12:38'),
	(357, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 12:14:04'),
	(358, 1, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-04-23 16:18:46'),
	(359, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 16:20:27'),
	(360, 2, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-04-23 16:21:20'),
	(361, 1, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-04-23 17:33:30'),
	(362, 17, 'LOGIN', 'Auth', NULL, 'Success', '192.168.1.104', 'okhttp/4.12.0', '2026-04-23 17:33:51'),
	(363, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 17:49:19'),
	(364, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 17:50:32'),
	(365, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 17:56:26'),
	(366, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 18:00:35'),
	(367, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 18:00:53'),
	(368, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 18:22:08'),
	(369, 16, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-23 18:56:33'),
	(370, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-23 19:07:34'),
	(371, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-23 19:07:37'),
	(372, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-23 19:07:54'),
	(373, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-23 19:10:07'),
	(374, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-23 19:10:14'),
	(375, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-23 19:24:49'),
	(376, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-27 04:11:37'),
	(377, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-27 04:17:05'),
	(378, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-27 04:21:30'),
	(379, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-27 04:47:54'),
	(380, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-27 04:59:39'),
	(381, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-27 06:53:59'),
	(382, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-27 07:15:40'),
	(383, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-27 07:18:21'),
	(384, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 02:16:51'),
	(385, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-28 03:15:46'),
	(386, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-28 03:17:12'),
	(387, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-28 05:41:17'),
	(388, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-28 05:47:08'),
	(389, 18, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 08:56:36'),
	(390, 18, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-04-28 09:01:18'),
	(391, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 09:04:06'),
	(392, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 19, 'Success', NULL, NULL, '2026-04-28 09:05:50'),
	(393, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 20, 'Success', NULL, NULL, '2026-04-28 09:05:53'),
	(394, 4, 'VERIFY_DOCUMENT_REJECT', 'PESO Verification', 21, 'Success', NULL, NULL, '2026-04-28 09:06:24'),
	(395, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 22, 'Success', NULL, NULL, '2026-04-28 09:06:33'),
	(396, 18, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 09:06:54'),
	(397, 18, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-04-28 09:09:03'),
	(398, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 09:09:58'),
	(399, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 19, 'Success', NULL, NULL, '2026-04-28 09:10:14'),
	(400, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 20, 'Success', NULL, NULL, '2026-04-28 09:10:17'),
	(401, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 21, 'Success', NULL, NULL, '2026-04-28 09:10:21'),
	(402, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 22, 'Success', NULL, NULL, '2026-04-28 09:10:23'),
	(403, 19, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 09:18:41'),
	(404, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 09:24:24'),
	(405, 18, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 09:51:33'),
	(406, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 09:52:28'),
	(407, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 18, 'Success', NULL, NULL, '2026-04-28 10:13:57'),
	(408, 18, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 10:14:10'),
	(409, 19, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 10:16:20'),
	(410, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 10:17:33'),
	(411, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 24, 'Success', NULL, NULL, '2026-04-28 10:18:04'),
	(412, 4, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 23, 'Success', NULL, NULL, '2026-04-28 10:18:07'),
	(413, 4, 'VERIFY_USER_APPROVE', 'PESO Verification', 19, 'Success', NULL, NULL, '2026-04-28 10:18:10'),
	(414, 19, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 10:18:59'),
	(415, 18, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-28 10:23:47'),
	(416, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 10:25:03'),
	(417, 4, 'VERIFY_JOB_APPROVE', 'PESO Job Verification', 6, 'Success', NULL, NULL, '2026-04-28 10:25:10'),
	(418, 18, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 10:25:32'),
	(419, 19, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-28 10:28:27'),
	(420, 18, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-28 10:30:39'),
	(421, 19, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-04-28 10:32:23'),
	(422, 18, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 10:33:38'),
	(423, 3, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:03:22'),
	(424, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:05:18'),
	(425, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:08:32'),
	(426, 21, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:08:52'),
	(427, 21, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-04-28 11:31:44'),
	(428, 20, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:34:00'),
	(429, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:42:35'),
	(430, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 25, 'Success', NULL, NULL, '2026-04-28 11:42:58'),
	(431, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 26, 'Success', NULL, NULL, '2026-04-28 11:43:02'),
	(432, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 27, 'Success', NULL, NULL, '2026-04-28 11:43:06'),
	(433, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 28, 'Success', NULL, NULL, '2026-04-28 11:43:09'),
	(434, 22, 'VERIFY_USER_APPROVE', 'PESO Verification', 21, 'Success', NULL, NULL, '2026-04-28 11:43:35'),
	(435, 22, 'VERIFY_DOCUMENT_REJECT', 'PESO Verification', 30, 'Success', NULL, NULL, '2026-04-28 11:44:12'),
	(436, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 29, 'Success', NULL, NULL, '2026-04-28 11:44:43'),
	(437, 20, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:44:58'),
	(438, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:46:09'),
	(439, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 31, 'Success', NULL, NULL, '2026-04-28 11:46:24'),
	(440, 22, 'VERIFY_USER_APPROVE', 'PESO Verification', 20, 'Success', NULL, NULL, '2026-04-28 11:46:28'),
	(441, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:47:06'),
	(442, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:53:46'),
	(443, 22, 'VERIFY_JOB_APPROVE', 'PESO Job Verification', 8, 'Success', NULL, NULL, '2026-04-28 11:53:57'),
	(444, 22, 'VERIFY_JOB_APPROVE', 'PESO Job Verification', 7, 'Success', NULL, NULL, '2026-04-28 11:54:27'),
	(445, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:54:44'),
	(446, 21, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:55:19'),
	(447, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:56:15'),
	(448, 21, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:57:26'),
	(449, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:57:52'),
	(450, 21, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 11:59:01'),
	(451, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:00:45'),
	(452, 21, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:02:07'),
	(453, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:06:57'),
	(454, 21, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:08:33'),
	(455, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:10:49'),
	(456, 21, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:19:36'),
	(457, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:24:20'),
	(458, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:26:37'),
	(459, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:30:13'),
	(460, 21, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-04-28 12:32:46'),
	(461, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 10:12:43'),
	(462, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 10:13:49'),
	(463, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 10:21:28'),
	(464, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 13:05:47'),
	(465, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 14:48:30'),
	(466, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 14:49:34'),
	(467, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 15:30:19'),
	(468, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0', '2026-05-06 16:15:09'),
	(469, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/147.0.0.0', '2026-05-08 15:19:34'),
	(470, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 03:17:55'),
	(471, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 04:06:02'),
	(472, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 04:12:05'),
	(473, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 04:16:30'),
	(474, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 04:17:14'),
	(475, 18, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 06:15:56'),
	(476, 19, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 06:16:58'),
	(477, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 06:33:42'),
	(478, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 06:41:58'),
	(479, 17, 'LOGIN', 'Auth', NULL, 'Success', '10.126.140.239', 'okhttp/4.12.0', '2026-05-11 06:43:45'),
	(480, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 06:45:21'),
	(481, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 06:45:28'),
	(482, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 06:56:08'),
	(483, 24, 'LOGIN', 'Auth', NULL, 'Failed', '10.126.140.239', 'okhttp/4.12.0', '2026-05-11 06:57:01'),
	(484, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:00:48'),
	(485, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:01:45'),
	(486, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:04:26'),
	(487, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:04:29'),
	(488, 27, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:09:39'),
	(489, 26, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:12:15'),
	(490, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:15:05'),
	(491, 26, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:15:32'),
	(492, 26, 'UPLOAD_DOCUMENTS', 'Documents', NULL, 'Success', NULL, NULL, '2026-05-11 07:16:13'),
	(493, 26, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:16:43'),
	(494, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:17:00'),
	(495, 26, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:30:44'),
	(496, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:36:51'),
	(497, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:38:35'),
	(498, 19, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:39:52'),
	(499, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:40:20'),
	(500, 16, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:40:55'),
	(501, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:41:34'),
	(502, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:42:56'),
	(503, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:43:56'),
	(504, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:44:01'),
	(505, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:45:33'),
	(506, 27, 'LOGIN', 'Auth', NULL, 'Failed', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:46:22'),
	(507, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:48:24'),
	(508, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 33, 'Success', NULL, NULL, '2026-05-11 07:49:17'),
	(509, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 32, 'Success', NULL, NULL, '2026-05-11 07:49:20'),
	(510, 22, 'VERIFY_USER_APPROVE', 'PESO Verification', 27, 'Success', NULL, NULL, '2026-05-11 07:49:24'),
	(511, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 34, 'Success', NULL, NULL, '2026-05-11 07:49:42'),
	(512, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 35, 'Success', NULL, NULL, '2026-05-11 07:49:46'),
	(513, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 36, 'Success', NULL, NULL, '2026-05-11 07:49:52'),
	(514, 22, 'VERIFY_DOCUMENT_APPROVE', 'PESO Verification', 37, 'Success', NULL, NULL, '2026-05-11 07:50:01'),
	(515, 22, 'VERIFY_USER_APPROVE', 'PESO Verification', 26, 'Success', NULL, NULL, '2026-05-11 07:50:03'),
	(516, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 07:50:41'),
	(517, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 08:04:50'),
	(518, 22, 'VERIFY_JOB_APPROVE', 'PESO Job Verification', 9, 'Success', NULL, NULL, '2026-05-11 08:05:06'),
	(519, 26, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 08:05:34'),
	(520, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 08:08:02'),
	(521, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 15:48:03'),
	(522, 22, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 15:48:08'),
	(523, 26, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-11 15:57:45'),
	(524, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-12 17:39:27'),
	(525, 16, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-13 03:51:41'),
	(526, 19, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-13 03:52:09'),
	(527, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-13 08:19:02'),
	(528, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-13 08:25:45'),
	(529, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-15 13:13:13'),
	(530, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-05-16 08:07:27'),
	(531, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-05-21 06:34:08'),
	(532, 18, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-05-21 06:34:41'),
	(533, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-21 06:36:21'),
	(534, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-21 06:36:24'),
	(535, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-21 06:46:08'),
	(536, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-21 06:46:11'),
	(537, 19, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-05-21 06:46:28'),
	(538, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-21 06:54:15'),
	(539, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-21 06:54:19'),
	(540, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-21 07:03:10'),
	(541, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-05-24 10:50:23'),
	(542, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-24 14:00:12'),
	(543, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-24 15:13:22'),
	(544, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-24 16:29:34'),
	(545, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-24 16:45:27'),
	(546, 17, 'LOGIN', 'Auth', NULL, 'Success', '191.168.89.93', 'okhttp/4.12.0', '2026-05-25 01:48:35'),
	(547, 17, 'LOGIN', 'Auth', NULL, 'Success', '191.168.89.93', 'okhttp/4.12.0', '2026-05-25 02:03:53'),
	(548, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-05-25 10:13:14'),
	(549, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-05-25 15:57:29'),
	(550, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-01 06:07:39'),
	(551, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-01 06:08:00'),
	(552, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-01 07:14:35'),
	(553, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-01 08:17:55'),
	(554, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-01 08:20:15'),
	(555, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-03 07:12:17'),
	(556, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-03 07:13:25'),
	(557, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-03 08:00:46'),
	(558, 2, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-04 03:39:46'),
	(559, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-04 03:40:42'),
	(560, 17, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-04 03:40:55'),
	(561, 21, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-04 03:41:11'),
	(562, 18, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-04 03:41:41'),
	(563, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-04 03:42:03'),
	(564, 20, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-04 03:51:07'),
	(565, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-04 03:51:27'),
	(566, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-05 03:26:37'),
	(567, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-05 03:29:41'),
	(568, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-05 17:01:22'),
	(569, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-05 17:01:46'),
	(570, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-06 07:23:12'),
	(571, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-06 07:25:05'),
	(572, 4, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-06 07:25:12'),
	(573, 4, 'VERIFY_JOB_APPROVE', 'PESO Job Verification', 11, 'Success', NULL, NULL, '2026-06-06 07:25:20'),
	(574, 4, 'VERIFY_JOB_REJECT', 'PESO Job Verification', 10, 'Success', NULL, NULL, '2026-06-06 07:25:30'),
	(575, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0', '2026-06-06 07:25:43'),
	(576, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-06 07:26:24'),
	(577, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-06 07:27:08'),
	(578, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 06:43:53'),
	(579, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 06:46:41'),
	(580, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 13:36:13'),
	(581, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 13:38:46'),
	(582, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 14:16:14'),
	(583, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 14:17:03'),
	(584, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 16:51:03'),
	(585, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 16:52:03'),
	(586, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/148.0.0.0', '2026-06-07 16:54:05'),
	(587, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/149.0.0.0', '2026-06-08 03:35:33'),
	(588, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/149.0.0.0', '2026-06-08 03:47:04'),
	(589, 27, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/149.0.0.0', '2026-06-08 03:51:50'),
	(590, 1, 'LOGIN', 'Auth', NULL, 'Success', '10.248.147.239', 'okhttp/4.12.0', '2026-06-08 04:35:28'),
	(591, 1, 'LOGIN', 'Auth', NULL, 'Success', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0', '2026-06-08 04:44:54');

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
INSERT INTO `messages` (`message_id`, `sender_id`, `receiver_id`, `job_post_id`, `message_text`, `message_type`, `image_url`, `is_read`, `read_at`, `sent_at`, `is_edited`, `edited_at`) VALUES
	(1, 2, 17, NULL, 'hi', 'text', NULL, 1, '2026-04-15 17:59:02', '2026-04-15 17:57:36', 0, NULL),
	(2, 2, 17, NULL, 'hi uy', 'text', NULL, 1, '2026-04-15 17:59:02', '2026-04-15 17:57:52', 0, NULL),
	(3, 2, 1, 5, 'Hi! I\'d like to invite you to apply for my job posting: "Gardener". Please check the job listing and apply if you\'re interested. Looking forward to hearing from you!', 'text', NULL, 1, '2026-04-15 18:00:02', '2026-04-15 17:59:36', 0, NULL),
	(4, 2, 1, 2, 'Hi! I\'d like to invite you to apply for my job posting: "Family Cook". Please check the job listing and apply if you\'re interested. Looking forward to hearing from you!', 'text', NULL, 1, '2026-04-15 18:39:31', '2026-04-15 18:38:52', 0, NULL),
	(5, 2, 1, 2, 'hi', 'text', NULL, 1, '2026-04-15 18:39:31', '2026-04-15 18:39:12', 0, NULL),
	(6, 1, 2, 2, 'unsay naa', 'text', NULL, 1, '2026-04-16 13:40:25', '2026-04-16 13:39:59', 0, NULL),
	(7, 2, 1, 2, 'wa oy', 'text', NULL, 1, '2026-04-16 16:25:56', '2026-04-16 13:40:34', 0, NULL),
	(8, 2, 1, 2, 'https://meet.jit.si/CareLink-1-2', 'video_call', NULL, 1, '2026-04-16 16:25:56', '2026-04-16 16:22:29', 0, NULL),
	(9, 1, 2, 2, 'https://meet.jit.si/CareLink-1-2', 'video_call', NULL, 1, '2026-04-16 17:39:26', '2026-04-16 16:26:00', 0, NULL),
	(10, 1, 2, 2, 'lol', 'text', NULL, 1, '2026-04-16 17:39:26', '2026-04-16 16:53:59', 0, NULL),
	(11, 2, 1, 2, 'Hi! I\'d like to invite you to apply for my job posting: "Family Cook". Please check the job listing and apply if you\'re interested. Looking forward to hearing from you!', 'text', NULL, 1, '2026-04-17 04:47:31', '2026-04-16 18:31:00', 0, NULL),
	(12, 17, 2, NULL, 'i would like to apply sah', 'text', NULL, 1, '2026-04-17 04:06:45', '2026-04-17 04:05:21', 0, NULL),
	(13, 17, 2, NULL, '', 'image', 'uploads/messages/msg_17_1776398740_c7a8694f.jpg', 1, '2026-04-17 04:06:45', '2026-04-17 04:05:40', 0, NULL),
	(14, 1, 2, 2, 'https://meet.jit.si/CareLink-1-2', 'video_call', NULL, 1, '2026-04-21 09:27:54', '2026-04-21 06:38:10', 0, NULL),
	(15, 2, 1, 5, 'Hi! I\'d like to invite you to apply for my job posting: "Gardener". Please check the job listing and apply if you\'re interested. Looking forward to hearing from you!', 'text', NULL, 1, '2026-04-23 12:07:49', '2026-04-21 09:27:51', 0, NULL),
	(16, 19, 18, NULL, 'hey', 'text', NULL, 1, '2026-04-28 10:30:51', '2026-04-28 10:28:53', 0, NULL),
	(17, 19, 18, 6, 'Interview scheduled: In-person on Apr 29, 2026 10:29 AM. Location: ormoc city plaza', 'text', NULL, 1, '2026-04-28 10:30:51', '2026-04-28 10:30:05', 0, NULL),
	(18, 18, 19, 6, 'https://meet.jit.si/CareLink-18-19', 'video_call', NULL, 1, '2026-04-28 10:32:28', '2026-04-28 10:31:07', 0, NULL),
	(19, 20, 21, 7, 'Hi! I\'d like to invite you to apply for my job posting: "Household Manager, Housekeeper". Please check the job listing and apply if you\'re interested. Looking forward to hearing from you!', 'text', NULL, 1, '2026-04-28 11:57:36', '2026-04-28 11:56:31', 0, NULL),
	(20, 20, 21, 7, 'Hi! I\'d like to invite you to apply for my job posting: "Household Manager, Housekeeper". Please check the job listing and apply if you\'re interested. Looking forward to hearing from you!', 'text', NULL, 1, '2026-04-28 11:59:43', '2026-04-28 11:58:28', 0, NULL),
	(21, 21, 20, 7, 'im interested', 'text', NULL, 1, '2026-04-28 12:07:55', '2026-04-28 12:00:05', 0, NULL),
	(22, 20, 21, 7, 'https://meet.jit.si/CareLink-20-21', 'video_call', NULL, 1, '2026-04-28 12:20:03', '2026-04-28 12:11:41', 0, NULL),
	(23, 2, 15, 2, 'Hi! I\'d like to invite you to apply for my job posting: "Family Cook". Please check the job listing and apply if you\'re interested. Looking forward to hearing from you!', 'text', NULL, 0, NULL, '2026-05-11 07:38:59', 0, NULL),
	(24, 20, 1, 8, 'hdihidwidh', 'text', NULL, 1, '2026-05-11 07:43:05', '2026-05-11 07:42:01', 0, NULL),
	(25, 20, 1, 8, '', 'image', 'uploads/messages/msg_20_1778485327_0114c4e0.jpg', 1, '2026-05-11 07:43:05', '2026-05-11 07:42:07', 0, NULL),
	(26, 20, 1, 8, 'Interview scheduled: In-person on May 12, 2026 7:42 AM. Location: Ormoc Plaza', 'text', NULL, 1, '2026-05-11 07:43:05', '2026-05-11 07:42:41', 0, NULL),
	(27, 2, 17, NULL, 'https://meet.jit.si/CareLink-2-17', 'video_call', NULL, 0, NULL, '2026-06-01 08:52:04', 0, NULL),
	(28, 2, 17, NULL, 'https://meet.jit.si/CareLink-2-17', 'video_call', NULL, 0, NULL, '2026-06-03 08:13:35', 0, NULL),
	(29, 1, 20, 8, 'https://meet.jit.si/CareLink-1-20', 'video_call', NULL, 0, NULL, '2026-06-08 03:50:10', 0, NULL),
	(30, 1, 2, 5, 'https://meet.jit.si/CareLink-1-2', 'video_call', NULL, 0, NULL, '2026-06-08 04:42:04', 0, NULL);

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
INSERT INTO `notifications` (`notification_id`, `user_id`, `type`, `title`, `message`, `is_read`, `ref_type`, `ref_id`, `created_at`) VALUES
	(1, 1, 'job_invite', 'Job Invitation', 'Kirby Calderon invited you to apply for "Family Cook"', 1, 'job', 2, '2026-04-17 02:31:00'),
	(2, 17, 'profile_update', 'Profile Updated', 'Your profile is 100% complete and has been submitted for PESO verification.', 1, 'profile', 4, '2026-04-17 12:04:21'),
	(3, 2, 'new_message', 'New Message from kurt ardines', 'i would like to apply sah', 1, 'message', 17, '2026-04-17 12:05:21'),
	(4, 2, 'new_message', 'New Message from kurt ardines', 'kurt ardines sent you an image.', 1, 'message', 17, '2026-04-17 12:05:40'),
	(5, 17, 'status_changed', 'Congratulations! You\'re Hired!', 'Kirby Calderon has hired you for the position: Pet Care Aide. Check your applications for details.', 1, 'application', 3, '2026-04-18 01:43:43'),
	(6, 17, 'status_changed', 'Congratulations! You\'re Hired!', 'Kirby Calderon has hired you for the position: Pet Care Aide. Check your applications for details.', 1, 'application', 3, '2026-04-18 10:19:45'),
	(7, 2, 'job_verified', 'Job Post Approved ✅', 'Your job post "Pet Care Aide" has been verified by PESO and is now live.', 1, 'job', 3, '2026-04-18 10:45:48'),
	(8, 2, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Pet Care Aide', 1, 'application', 3, '2026-04-18 11:07:52'),
	(9, 17, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Pet Care Aide', 1, 'application', 3, '2026-04-18 11:07:52'),
	(10, 2, 'status_changed', 'Contract confirmed', 'Contract confirmed. kurt ardines is now hired.', 1, 'application', 3, '2026-04-18 11:08:36'),
	(11, 17, 'status_changed', 'Contract confirmed', 'Contract confirmed. You are now hired for Pet Care Aide.', 1, 'application', 3, '2026-04-18 11:08:36'),
	(12, 2, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Pet Care Aide Other open applications from this helper for your posts were closed automatically.', 1, 'application', 3, '2026-04-18 11:56:06'),
	(13, 17, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Pet Care Aide Your other applications with this employer were automatically closed because they selected you for this position.', 1, 'application', 3, '2026-04-18 11:56:06'),
	(14, 2, 'status_changed', 'Hiring confirmed', 'Hiring confirmed. kurt ardines is now officially hired as Pet Care Aide. Download your contract copy from the app.', 1, 'application', 3, '2026-04-18 11:56:59'),
	(15, 17, 'status_changed', 'Congratulations — you\'re hired!', 'Congratulations! You are now hired as Pet Care Aide by Kirby Calderon. Download your contract copy from the app.', 1, 'application', 3, '2026-04-18 11:56:59'),
	(16, 3, 'contract_signed', 'New contract signed', 'New contract signed. Application #3 between Kirby Calderon and kurt ardines is now active.', 0, 'application', 3, '2026-04-18 11:56:59'),
	(17, 4, 'contract_signed', 'New contract signed', 'New contract signed. Application #3 between Kirby Calderon and kurt ardines is now active.', 1, 'application', 3, '2026-04-18 11:56:59'),
	(18, 5, 'contract_signed', 'New contract signed', 'New contract signed. Application #3 between Kirby Calderon and kurt ardines is now active.', 0, 'application', 3, '2026-04-18 11:56:59'),
	(19, 2, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Pet Care Aide Other open applications from this helper for your posts were closed automatically.', 1, 'application', 3, '2026-04-18 14:05:54'),
	(20, 17, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Pet Care Aide Your other applications with this employer were automatically closed because they selected you for this position.', 1, 'application', 3, '2026-04-18 14:05:54'),
	(21, 2, 'status_changed', 'Hiring confirmed', 'Hiring confirmed. kurt ardines is now officially hired as Pet Care Aide. Download your contract copy from the app.', 1, 'application', 3, '2026-04-18 14:06:35'),
	(22, 17, 'status_changed', 'Congratulations — you\'re hired!', 'Congratulations! You are now hired as Pet Care Aide by Kirby Calderon. Download your contract copy from the app.', 1, 'application', 3, '2026-04-18 14:06:35'),
	(23, 3, 'contract_signed', 'New contract signed', 'New contract signed. Application #3 between Kirby Calderon and kurt ardines is now active.', 0, 'application', 3, '2026-04-18 14:06:35'),
	(24, 4, 'contract_signed', 'New contract signed', 'New contract signed. Application #3 between Kirby Calderon and kurt ardines is now active.', 1, 'application', 3, '2026-04-18 14:06:35'),
	(25, 5, 'contract_signed', 'New contract signed', 'New contract signed. Application #3 between Kirby Calderon and kurt ardines is now active.', 0, 'application', 3, '2026-04-18 14:06:35'),
	(26, 2, 'attendance_checkin', 'Helper checked in', 'kurt ardines checked in at 7:29 PM', 1, 'attendance_log', 1, '2026-04-19 19:29:39'),
	(27, 2, 'attendance_checkin', 'Helper checked in', 'kurt ardines checked in at 2:59 AM', 1, 'attendance_log', 2, '2026-04-20 02:59:51'),
	(28, 2, 'new_message', 'New Message from Sean Howie Eulogio', 'Sean Howie Eulogio is inviting you to a video call!', 1, 'message', 1, '2026-04-21 14:38:10'),
	(29, 1, 'job_invite', 'Job Invitation', 'Kirby Calderon invited you to apply for "Gardener"', 1, 'job', 5, '2026-04-21 17:27:51'),
	(30, 2, 'attendance_checkin', 'Helper checked in', 'kurt ardines checked in at 2:38 PM', 1, 'attendance_log', 3, '2026-04-23 14:38:39'),
	(31, 17, 'profile_update', 'Profile Updated', 'Your profile is 100% complete and has been submitted for PESO verification.', 1, 'profile', 4, '2026-04-27 12:34:34'),
	(32, 2, 'attendance_checkin', 'Helper checked in', 'kurt ardines checked in at 12:34 PM', 1, 'attendance_log', 4, '2026-04-27 12:34:46'),
	(33, 2, 'contract_terminated', 'Employment ending', 'kurt ardines has started ending the placement for "Pet Care Aide". Last working day: 2026-04-28. Open the app for details.', 1, 'application', 3, '2026-04-28 11:16:18'),
	(34, 3, 'contract_terminated', 'Contract termination', 'Placement "Pet Care Aide" (Kirby Calderon / kurt ardines): contract ending; last working day 2026-04-28.', 0, 'application', 3, '2026-04-28 11:16:18'),
	(35, 4, 'contract_terminated', 'Contract termination', 'Placement "Pet Care Aide" (Kirby Calderon / kurt ardines): contract ending; last working day 2026-04-28.', 1, 'application', 3, '2026-04-28 11:16:18'),
	(36, 5, 'contract_terminated', 'Contract termination', 'Placement "Pet Care Aide" (Kirby Calderon / kurt ardines): contract ending; last working day 2026-04-28.', 0, 'application', 3, '2026-04-28 11:16:18'),
	(37, 18, 'profile_update', 'Profile Updated', 'Your profile was updated successfully. Complete all sections to submit for verification.', 1, 'profile', 5, '2026-04-28 17:00:27'),
	(38, 18, 'profile_update', 'Profile Updated', 'Your profile is 100% complete and has been submitted for PESO verification.', 1, 'profile', 5, '2026-04-28 17:03:38'),
	(39, 18, 'document_verified', 'Document Verified ✅', 'Your Barangay Clearance has been verified by PESO.', 1, 'document', 19, '2026-04-28 17:05:50'),
	(40, 18, 'document_verified', 'Document Verified ✅', 'Your Valid ID has been verified by PESO.', 1, 'document', 20, '2026-04-28 17:05:53'),
	(41, 18, 'document_rejected', 'Document Rejected', 'Your Police Clearance was not accepted by PESO. Reason: Invalid Please re-upload.', 1, 'document', 21, '2026-04-28 17:06:24'),
	(42, 18, 'document_verified', 'Document Verified ✅', 'Your TESDA NC2 has been verified by PESO.', 1, 'document', 22, '2026-04-28 17:06:33'),
	(43, 18, 'document_verified', 'Document Verified ✅', 'Your Barangay Clearance has been verified by PESO.', 1, 'document', 19, '2026-04-28 17:10:14'),
	(44, 18, 'document_verified', 'Document Verified ✅', 'Your Valid ID has been verified by PESO.', 1, 'document', 20, '2026-04-28 17:10:17'),
	(45, 18, 'document_verified', 'Document Verified ✅', 'Your Police Clearance has been verified by PESO.', 1, 'document', 21, '2026-04-28 17:10:21'),
	(46, 18, 'document_verified', 'Document Verified ✅', 'Your TESDA NC2 has been verified by PESO.', 1, 'document', 22, '2026-04-28 17:10:23'),
	(47, 19, 'profile_update', 'Profile Updated', 'Your profile was updated successfully. Complete all sections to submit for verification.', 1, 'profile', 4, '2026-04-28 17:22:55'),
	(48, 18, 'account_verified', 'Account Verified! 🎉', 'Your CareLink account has been verified by PESO. You can now access all features.', 1, 'account', 18, '2026-04-28 18:13:57'),
	(49, 19, 'document_verified', 'Document Verified ✅', 'Your Barangay Clearance has been verified by PESO.', 1, 'document', 24, '2026-04-28 18:18:04'),
	(50, 19, 'document_verified', 'Document Verified ✅', 'Your Valid ID has been verified by PESO.', 1, 'document', 23, '2026-04-28 18:18:07'),
	(51, 19, 'account_verified', 'Account Verified! 🎉', 'Your CareLink account has been verified by PESO. You can now access all features.', 1, 'account', 19, '2026-04-28 18:18:10'),
	(52, 4, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Household Manager, Housekeeper" for PESO approval.', 0, 'job', 6, '2026-04-28 18:23:24'),
	(53, 19, 'job_verified', 'Job Post Approved ✅', 'Your job post "Household Manager, Housekeeper" has been verified by PESO and is now live.', 1, 'job', 6, '2026-04-28 18:25:10'),
	(54, 19, 'application_received', 'New Application Received', 'George Pericano applied for your job: Household Manager, Housekeeper', 1, 'application', 4, '2026-04-28 18:28:00'),
	(55, 18, 'new_message', 'New Message from Pinky Pacabis', 'hey', 1, 'message', 19, '2026-04-28 18:28:53'),
	(56, 18, 'interview_scheduled', 'Interview Scheduled', 'Your interview for "Household Manager, Housekeeper" is set: In-person on Apr 29, 2026 10:29am.', 1, 'application', 4, '2026-04-28 18:30:05'),
	(57, 19, 'interview_scheduled', 'Interview confirmed', 'You scheduled an interview with the applicant for "Household Manager, Housekeeper" (In-person, Apr 29, 2026 10:29am).', 1, 'application', 4, '2026-04-28 18:30:05'),
	(58, 19, 'new_message', 'New Message from George Pericano', 'George Pericano is inviting you to a video call!', 1, 'message', 18, '2026-04-28 18:31:07'),
	(59, 19, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Household Manager, Housekeeper', 1, 'application', 4, '2026-04-28 18:33:10'),
	(60, 18, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Household Manager, Housekeeper', 1, 'application', 4, '2026-04-28 18:33:10'),
	(61, 19, 'status_changed', 'Hiring confirmed', 'Hiring confirmed. George Pericano is now officially hired as Household Manager, Housekeeper. Download your contract copy from the app.', 1, 'application', 4, '2026-04-28 18:33:52'),
	(62, 18, 'status_changed', 'Congratulations — you\'re hired!', 'Congratulations! You are now hired as Household Manager, Housekeeper by Pinky Pacabis. Download your contract copy from the app.', 1, 'application', 4, '2026-04-28 18:33:52'),
	(63, 3, 'contract_signed', 'New contract signed', 'New contract signed. Application #4 between Pinky Pacabis and George Pericano is now active.', 0, 'application', 4, '2026-04-28 18:33:52'),
	(64, 4, 'contract_signed', 'New contract signed', 'New contract signed. Application #4 between Pinky Pacabis and George Pericano is now active.', 0, 'application', 4, '2026-04-28 18:33:52'),
	(65, 5, 'contract_signed', 'New contract signed', 'New contract signed. Application #4 between Pinky Pacabis and George Pericano is now active.', 0, 'application', 4, '2026-04-28 18:33:52'),
	(66, 21, 'profile_update', 'Profile Updated', 'Your profile was updated successfully. Complete all sections to submit for verification.', 1, 'profile', 6, '2026-04-28 19:27:27'),
	(67, 20, 'profile_update', 'Profile Updated', 'Your profile was updated successfully. Complete all sections to submit for verification.', 1, 'profile', 5, '2026-04-28 19:38:01'),
	(68, 21, 'document_verified', 'Document Verified ✅', 'Your Barangay Clearance has been verified by PESO.', 1, 'document', 25, '2026-04-28 19:42:58'),
	(69, 21, 'document_verified', 'Document Verified ✅', 'Your Valid ID has been verified by PESO.', 1, 'document', 26, '2026-04-28 19:43:02'),
	(70, 21, 'document_verified', 'Document Verified ✅', 'Your Police Clearance has been verified by PESO.', 1, 'document', 27, '2026-04-28 19:43:06'),
	(71, 21, 'document_verified', 'Document Verified ✅', 'Your TESDA NC2 has been verified by PESO.', 1, 'document', 28, '2026-04-28 19:43:09'),
	(72, 21, 'account_verified', 'Account Verified! 🎉', 'Your CareLink account has been verified by PESO. You can now access all features.', 1, 'account', 21, '2026-04-28 19:43:35'),
	(73, 20, 'document_rejected', 'Document Rejected', 'Your Barangay Clearance was not accepted by PESO. Reason: Invalid Document Please re-upload.', 1, 'document', 30, '2026-04-28 19:44:12'),
	(74, 20, 'document_verified', 'Document Verified ✅', 'Your Valid ID has been verified by PESO.', 1, 'document', 29, '2026-04-28 19:44:43'),
	(75, 20, 'document_verified', 'Document Verified ✅', 'Your Barangay Clearance has been verified by PESO.', 1, 'document', 31, '2026-04-28 19:46:24'),
	(76, 20, 'account_verified', 'Account Verified! 🎉', 'Your CareLink account has been verified by PESO. You can now access all features.', 1, 'account', 20, '2026-04-28 19:46:28'),
	(77, 4, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Household Manager, Housekeeper" for PESO approval.', 0, 'job', 7, '2026-04-28 19:51:23'),
	(78, 22, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Household Manager, Housekeeper" for PESO approval.', 1, 'job', 7, '2026-04-28 19:51:23'),
	(79, 4, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Laundry Person" for PESO approval.', 0, 'job', 8, '2026-04-28 19:53:13'),
	(80, 22, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Laundry Person" for PESO approval.', 1, 'job', 8, '2026-04-28 19:53:13'),
	(81, 20, 'job_verified', 'Job Post Approved ✅', 'Your job post "Laundry Person" has been verified by PESO and is now live.', 1, 'job', 8, '2026-04-28 19:53:57'),
	(82, 20, 'job_verified', 'Job Post Approved ✅', 'Your job post "Household Manager, Housekeeper" has been verified by PESO and is now live.', 1, 'job', 7, '2026-04-28 19:54:27'),
	(83, 21, 'job_invite', 'Job Invitation', 'New Parent invited you to apply for "Household Manager, Housekeeper"', 1, 'job', 7, '2026-04-28 19:56:31'),
	(84, 21, 'job_invite', 'Job Invitation', 'New Parent invited you to apply for "Household Manager, Housekeeper"', 1, 'job', 7, '2026-04-28 19:58:28'),
	(85, 20, 'new_message', 'New Message from New Helper', 'im interested', 1, 'message', 21, '2026-04-28 20:00:05'),
	(86, 20, 'application_received', 'New Application Received', 'New Helper applied for your job: Household Manager, Housekeeper', 1, 'application', 5, '2026-04-28 20:06:03'),
	(87, 21, 'status_changed', 'You\'ve Been Shortlisted! 🌟', 'Great news! You are shortlisted for: Household Manager, Housekeeper', 1, 'application', 5, '2026-04-28 20:07:48'),
	(88, 21, 'new_message', 'New Message from New Parent', 'New Parent is inviting you to a video call!', 1, 'message', 20, '2026-04-28 20:11:41'),
	(89, 20, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Household Manager, Housekeeper', 1, 'application', 5, '2026-04-28 20:16:13'),
	(90, 21, 'status_changed', 'Review employment contract', 'Please review and confirm the contract for: Household Manager, Housekeeper', 1, 'application', 5, '2026-04-28 20:16:13'),
	(91, 20, 'status_changed', 'Hiring confirmed', 'Hiring confirmed. New Helper is now officially hired as Household Manager, Housekeeper. Download your contract copy from the app.', 1, 'application', 5, '2026-04-28 20:23:19'),
	(92, 21, 'status_changed', 'Congratulations — you\'re hired!', 'Congratulations! You are now hired as Household Manager, Housekeeper by New Parent. Download your contract copy from the app.', 0, 'application', 5, '2026-04-28 20:23:19'),
	(93, 3, 'contract_signed', 'New contract signed', 'New contract signed. Application #5 between New Parent and New Helper is now active.', 0, 'application', 5, '2026-04-28 20:23:19'),
	(94, 4, 'contract_signed', 'New contract signed', 'New contract signed. Application #5 between New Parent and New Helper is now active.', 0, 'application', 5, '2026-04-28 20:23:19'),
	(95, 5, 'contract_signed', 'New contract signed', 'New contract signed. Application #5 between New Parent and New Helper is now active.', 0, 'application', 5, '2026-04-28 20:23:19'),
	(96, 22, 'contract_signed', 'New contract signed', 'New contract signed. Application #5 between New Parent and New Helper is now active.', 1, 'application', 5, '2026-04-28 20:23:19'),
	(97, 20, 'attendance_checkin', 'Helper checked in', 'New Helper checked in at 8:33 PM', 0, 'attendance_log', 5, '2026-04-28 20:33:07'),
	(98, 2, 'attendance_checkin', 'Helper checked in', 'kurt ardines checked in at 6:13 PM', 1, 'attendance_log', 6, '2026-05-06 18:13:29'),
	(99, 2, 'placement_renewal', 'Helper interested in renewing', 'Your helper indicated they may want to renew this placement. (Pet Care Aide)', 1, 'job_application', 3, '2026-05-06 22:48:34'),
	(100, 27, 'profile_update', 'Profile Updated', 'Your profile was updated successfully. Complete all sections to submit for verification.', 1, 'profile', 7, '2026-05-11 15:11:10'),
	(101, 26, 'profile_update', 'Profile Updated', 'Your profile was updated successfully. Complete all sections to submit for verification.', 1, 'profile', 9, '2026-05-11 15:14:41'),
	(102, 20, 'application_received', 'New Application Received', 'Sean Howie Eulogio applied for your job: Laundry Person', 1, 'application', 6, '2026-05-11 15:37:57'),
	(103, 15, 'job_invite', 'Job Invitation', 'Kirby Calderon invited you to apply for "Family Cook"', 0, 'job', 2, '2026-05-11 15:38:59'),
	(104, 1, 'status_changed', 'You\'ve Been Shortlisted! 🌟', 'Great news! You are shortlisted for: Laundry Person', 1, 'application', 6, '2026-05-11 15:41:48'),
	(105, 1, 'new_message', 'New Message from New Parent', 'hdihidwidh', 1, 'message', 20, '2026-05-11 15:42:01'),
	(106, 1, 'new_message', 'New Message from New Parent', 'New Parent sent you an image.', 1, 'message', 20, '2026-05-11 15:42:07'),
	(107, 1, 'interview_scheduled', 'Interview Scheduled', 'Your interview for "Laundry Person" is set: In-person on May 12, 2026 7:42am.', 1, 'application', 6, '2026-05-11 15:42:41'),
	(108, 20, 'interview_scheduled', 'Interview confirmed', 'You scheduled an interview with the applicant for "Laundry Person" (In-person, May 12, 2026 7:42am).', 0, 'application', 6, '2026-05-11 15:42:41'),
	(109, 27, 'document_verified', 'Document Verified ✅', 'Your Barangay Clearance has been verified by PESO.', 1, 'document', 33, '2026-05-11 15:49:17'),
	(110, 27, 'document_verified', 'Document Verified ✅', 'Your Valid ID has been verified by PESO.', 1, 'document', 32, '2026-05-11 15:49:20'),
	(111, 27, 'account_verified', 'Account Verified! 🎉', 'Your CareLink account has been verified by PESO. You can now access all features.', 1, 'account', 27, '2026-05-11 15:49:24'),
	(112, 26, 'document_verified', 'Document Verified ✅', 'Your Barangay Clearance has been verified by PESO.', 1, 'document', 34, '2026-05-11 15:49:42'),
	(113, 26, 'document_verified', 'Document Verified ✅', 'Your Valid ID has been verified by PESO.', 1, 'document', 35, '2026-05-11 15:49:46'),
	(114, 26, 'document_verified', 'Document Verified ✅', 'Your Police Clearance has been verified by PESO.', 1, 'document', 36, '2026-05-11 15:49:52'),
	(115, 26, 'document_verified', 'Document Verified ✅', 'Your TESDA NC2 has been verified by PESO.', 1, 'document', 37, '2026-05-11 15:50:01'),
	(116, 26, 'account_verified', 'Account Verified! 🎉', 'Your CareLink account has been verified by PESO. You can now access all features.', 1, 'account', 26, '2026-05-11 15:50:03'),
	(117, 4, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Driving (Driving)" for PESO approval.', 0, 'job', 9, '2026-05-11 16:04:16'),
	(118, 22, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Driving (Driving)" for PESO approval.', 0, 'job', 9, '2026-05-11 16:04:16'),
	(119, 27, 'job_verified', 'Job Post Approved ✅', 'Your job post "Driving (Driving)" has been verified by PESO and is now live.', 1, 'job', 9, '2026-05-11 16:05:06'),
	(120, 27, 'application_received', 'New Application Received', 'New Helper12 applied for your job: Driving (Driving)', 1, 'application', 7, '2026-05-11 16:07:24'),
	(121, 26, 'status_changed', 'You\'ve Been Shortlisted! 🌟', 'Great news! You are shortlisted for: Driving (Driving)', 1, 'application', 7, '2026-05-11 16:12:04'),
	(122, 27, 'application_received', 'New Application Received', 'kurt ardines applied for your job: Driving (Driving)', 1, 'application', 8, '2026-05-13 02:01:36'),
	(123, 20, 'application_received', 'New Application Received', 'kurt ardines applied for your job: Laundry Person', 0, 'application', 9, '2026-05-25 00:45:10'),
	(124, 4, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Household Manager" for PESO approval.', 0, 'job', 10, '2026-05-25 00:47:30'),
	(125, 22, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Household Manager" for PESO approval.', 0, 'job', 10, '2026-05-25 00:47:30'),
	(126, 17, 'profile_update', 'Profile Updated', 'Your profile is 100% complete and has been submitted for PESO verification.', 0, 'profile', 4, '2026-05-26 02:07:46'),
	(127, 17, 'new_message', 'New Message from Kirby Calderon', 'Kirby Calderon is inviting you to a video call!', 0, 'message', 2, '2026-06-01 16:52:04'),
	(128, 2, 'application_received', 'New Application Received', 'kurt ardines applied for your job: Family Cook', 1, 'application', 10, '2026-06-03 15:12:33'),
	(129, 17, 'new_message', 'New Message from Kirby Calderon', 'Kirby Calderon is inviting you to a video call!', 0, 'message', 2, '2026-06-03 16:13:35'),
	(130, 1, 'profile_update', 'Profile Updated', 'Your profile is 100% complete and has been submitted for PESO verification.', 1, 'profile', 1, '2026-06-06 00:43:52'),
	(131, 4, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Landscape Aide" for PESO approval.', 0, 'job', 11, '2026-06-06 15:24:35'),
	(132, 22, 'peso_queue_job', 'New job post pending verification', 'A parent submitted "Landscape Aide" for PESO approval.', 0, 'job', 11, '2026-06-06 15:24:35'),
	(133, 27, 'job_verified', 'Job Post Approved ✅', 'Your job post "Landscape Aide" has been verified by PESO and is now live.', 1, 'job', 11, '2026-06-06 15:25:20'),
	(134, 2, 'job_rejected', 'Job Post Rejected', 'Your job post "Household Manager" was rejected by PESO. Reason: incomplete', 0, 'job', 10, '2026-06-06 15:25:30'),
	(135, 27, 'profile_update', 'Profile Updated', 'Your profile is 100% complete and has been submitted for PESO verification.', 1, 'profile', 7, '2026-06-06 15:26:37'),
	(136, 27, 'profile_update', 'Profile Updated', 'Your profile is 100% complete and has been submitted for PESO verification.', 1, 'profile', 7, '2026-06-06 15:26:53'),
	(137, 20, 'new_message', 'New Message from Sean Howie Eulogio', 'Sean Howie Eulogio is inviting you to a video call!', 0, 'message', 1, '2026-06-08 11:50:10'),
	(138, 2, 'new_message', 'New Message from Sean Howie Eulogio', 'Sean Howie Eulogio is inviting you to a video call!', 0, 'message', 1, '2026-06-08 12:42:04');

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
INSERT INTO `parent_children` (`child_id`, `profile_id`, `age`, `gender`, `special_needs`, `created_at`, `updated_at`) VALUES
	(8, 3, 12, 'Prefer not to say', 'Autism', '2026-04-08 09:21:05', NULL),
	(11, 1, 18, 'Male', 'Autism', '2026-04-15 17:36:09', NULL),
	(12, 4, 8, 'Female', 'Autism', '2026-04-28 09:22:55', NULL),
	(13, 5, 10, 'Male', 'Autism', '2026-04-28 11:38:01', NULL),
	(14, 5, 11, 'Female', 'Autism', '2026-04-28 11:38:01', NULL),
	(17, 7, 0, 'Prefer not to say', NULL, '2026-06-06 07:26:53', NULL);

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
INSERT INTO `parent_elderly` (`elderly_id`, `profile_id`, `age`, `gender`, `condition`, `care_level`, `created_at`, `updated_at`) VALUES
	(2, 3, 65, 'Prefer not to say', 'Bedridden', 'Needs Assistance', '2026-04-08 09:21:05', NULL),
	(5, 1, 61, 'Female', 'Bedridden', 'Fully Dependent', '2026-04-15 17:36:09', NULL),
	(6, 4, 55, 'Male', 'Bedridden', 'Independent', '2026-04-28 09:22:55', NULL),
	(7, 4, 52, 'Female', 'Diabetic', 'Needs Assistance', '2026-04-28 09:22:55', NULL),
	(8, 5, 52, 'Female', 'Diabetic', 'Independent', '2026-04-28 11:38:01', NULL),
	(9, 5, 65, 'Male', 'Diabetic', 'Independent', '2026-04-28 11:38:01', NULL);

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
INSERT INTO `parent_household` (`household_id`, `profile_id`, `household_size`, `household_type`, `has_children`, `has_elderly`, `has_pets`, `pet_details`, `created_at`, `updated_at`) VALUES
	(1, 1, 10, NULL, 1, 1, 1, '2 dogs german cut', '2026-03-15 10:54:38', '2026-04-15 17:36:09'),
	(2, 3, 5, NULL, 1, 1, 1, '1 golden retriever', '2026-04-08 09:21:05', NULL),
	(3, 4, 8, 'townhouse', 1, 1, 0, '', '2026-04-28 09:22:55', NULL),
	(4, 5, 8, 'house', 1, 1, 1, '1 golden retriever', '2026-04-28 11:38:01', NULL),
	(5, 7, 8, 'house', 0, 0, 0, '', '2026-05-11 07:11:10', '2026-06-06 07:26:53');

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
INSERT INTO `parent_profiles` (`profile_id`, `user_id`, `contact_number`, `profile_image`, `province`, `municipality`, `barangay`, `latitude`, `longitude`, `address`, `landmark`, `bio`, `verification_status`, `created_at`, `updated_at`, `verified_by`, `verified_at`, `rejected_by`, `rejected_at`, `rejection_reason`) VALUES
	(1, 2, '09396954318', 'http://localhost/carelink_api/uploads/profiles/parentProfile_2_1773577099.jpg', 'Leyte', 'Isabel', 'San Roque', 10.9698251, 124.4578588, 'San Roque, Isabel, Leyte', 'Near our House', 'Test Bio ni Kirby cAlderon', 'Verified', '2026-03-05 10:16:53', '2026-04-15 17:36:09', NULL, NULL, NULL, NULL, NULL),
	(2, 9, NULL, NULL, 'Leyte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Verified', '2026-03-25 05:54:51', '2026-03-25 05:57:13', NULL, NULL, NULL, NULL, NULL),
	(3, 16, '09999999999', NULL, 'Leyte', 'Ormoc', 'Cogon', NULL, NULL, 'Cogon, Ormoc, Leyte', 'near Aclc', 'sample', 'Verified', '2026-04-08 09:10:25', '2026-04-08 09:24:30', NULL, NULL, NULL, NULL, NULL),
	(4, 19, '0999999999', 'http://localhost/carelink_api/uploads/profiles/parentProfile_19_1777368175.jpg', 'Leyte', 'Isabel', 'Matlang', NULL, NULL, 'Matlang, Isabel, Leyte', 'Isabel', 'Need Assistance for Elderly Parents', 'Verified', '2026-04-28 09:18:35', '2026-04-28 10:18:10', 4, '2026-04-28 10:18:10', NULL, NULL, NULL),
	(5, 20, '0999999999', 'http://localhost/carelink_api/uploads/profiles/parentProfile_20_1777376281.jpg', 'Leyte', 'Isabel', 'Matlang', NULL, NULL, 'Matlang, Isabel, Leyte', 'Isabel', 'Sample Parent Bio', 'Verified', '2026-04-28 11:01:40', '2026-04-28 11:46:28', 22, '2026-04-28 11:46:28', NULL, NULL, NULL),
	(6, 25, NULL, NULL, 'Leyte', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Unverified', '2026-05-11 06:52:26', NULL, NULL, NULL, NULL, NULL, NULL),
	(7, 27, '0999999999', 'http://localhost/carelink_api/uploads/profiles/parentProfile_27_1780730813.jpg', 'Leyte', 'Isabel', 'Matlang', NULL, NULL, 'Matlang, Isabel, Leyte', 'Isabel', 'More about the Household basta kuan', 'Verified', '2026-05-11 07:00:38', '2026-06-06 07:26:53', 22, '2026-05-11 07:49:24', NULL, NULL, NULL);

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
INSERT INTO `placements` (`placement_id`, `application_id`, `parent_id`, `helper_id`, `job_post_id`, `ref_job_id`, `employment_type`, `work_schedule`, `agreed_salary`, `salary_period`, `start_date`, `end_date`, `status`, `termination_reason`, `created_at`, `ended_at`, `updated_at`) VALUES
	(1, 3, 2, 17, 3, NULL, 'Live-out', 'Part-time', 8000.00, 'Monthly', '2026-04-18', NULL, 'Active', NULL, '2026-04-18 06:06:35', NULL, NULL),
	(2, 4, 19, 18, 6, NULL, 'Live-out', 'Part-time', 8000.00, 'Monthly', '2026-04-28', NULL, 'Active', NULL, '2026-04-28 10:33:52', NULL, NULL),
	(3, 5, 20, 21, 7, NULL, 'Live-in', 'Full-time', 8000.00, 'Monthly', '2026-04-28', NULL, 'Active', NULL, '2026-04-28 12:23:19', NULL, NULL);

-- Dumping structure for table carelink.placement_renewal_intent
CREATE TABLE IF NOT EXISTS `placement_renewal_intent` (
  `application_id` int NOT NULL COMMENT 'job_applications.application_id',
  `parent_interested` tinyint(1) DEFAULT NULL COMMENT 'NULL undecided, 0 no, 1 yes',
  `helper_interested` tinyint(1) DEFAULT NULL COMMENT 'NULL undecided, 0 no, 1 yes',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Dumping data for table carelink.placement_renewal_intent: ~1 rows (approximately)
INSERT INTO `placement_renewal_intent` (`application_id`, `parent_interested`, `helper_interested`, `updated_at`) VALUES
	(3, 0, 1, '2026-05-06 14:49:51');

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
INSERT INTO `placement_reviews` (`review_id`, `placement_id`, `reviewer_id`, `reviewee_id`, `reviewer_type`, `rating`, `review_text`, `is_visible`, `created_at`) VALUES
	(1, 1, 17, 2, 'helper', 3.0, 'lol', 1, '2026-05-06 15:50:20');

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
INSERT INTO `ref_categories` (`category_id`, `category_name`, `icon`, `description`) VALUES
	(1, 'General Househelp', 'home', 'General household chores and maintenance'),
	(2, 'Yaya', 'child', 'Childcare and child supervision'),
	(3, 'Cook', 'restaurant', 'Food preparation and kitchen management'),
	(4, 'Gardening', 'leaf', 'Garden and outdoor maintenance'),
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table carelink.saved_jobs: ~1 rows (approximately)
INSERT INTO `saved_jobs` (`saved_id`, `helper_id`, `job_post_id`, `saved_at`) VALUES
	(1, 1, 2, '2026-03-25 01:30:58'),
	(2, 1, 3, '2026-04-07 02:52:02'),
	(3, 18, 6, '2026-04-28 10:26:24'),
	(4, 1, 11, '2026-06-08 04:43:11');

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
INSERT INTO `users` (`user_id`, `email`, `username`, `password`, `first_name`, `middle_name`, `last_name`, `user_type`, `status`, `profile_completed`, `created_at`, `updated_at`, `last_login`) VALUES
	(1, 'sean@gmail.com', 'sean3656', '$2y$10$ix2Ys48ZgJFPe5J9MiTUtO0Mq8r4LO4kZ.3KhXvL3Iqbfh1tjS6eG', 'Sean Howie', 'Genshin Impact', 'Eulogio', 'helper', 'approved', 1, '2026-03-02 01:44:36', '2026-06-05 16:43:52', NULL),
	(2, 'kirby@gmail.com', 'kirby1942', '$2y$10$/kaQADUGo.YF61535.m3RuLiZaJGjmQidyie6IpfMVO5yDk5IR0Lm', 'Kirby', 'Baguion', 'Calderon', 'parent', 'approved', 1, '2026-03-05 10:16:53', '2026-04-15 17:36:09', NULL),
	(3, 'jess@carelink.com', 'jess123', '$2y$10$ASsCdY8WMNQRxUK8.PU/FukYJhHabfbZgB1xLufF6TMzbsMONCywW', 'Jess', 'Baguion', 'Almene', 'admin', 'approved', 1, '2026-03-05 13:09:38', '2026-03-15 06:07:20', NULL),
	(4, 'gabriel@peso.com', 'gabriel1234', '$2y$10$AyQ.MzYEngRYjmxhNE3kNO1qkr8ikXYMGEfI2Khvlym5ctz1AZKh2', 'Gabriel', NULL, 'Suarez', 'peso', 'approved', 1, '2026-03-05 13:52:11', '2026-03-15 06:07:20', NULL),
	(5, 'jarid@carelink.com', 'jarid606', '$2y$10$ZRmzSar3WfZJg0Y6TPlEPeH8JNBCjLNIM.232lCmA86qYkXZMka7W', 'Jarid', '', 'Lumangtad', 'admin', 'approved', 1, '2026-03-06 13:46:25', NULL, NULL),
	(9, 'newparent@gmail.com', 'newparent9599', '$2y$10$l0CEbqL.9JP1ynumGJC6aO65VKuA92BXq7NVxTJl/RWNgyFnRebRi', 'New', '', 'Parent', 'parent', 'approved', 1, '2026-03-25 05:54:51', '2026-04-14 11:35:31', NULL),
	(14, 'sample@gmail.com', 'sample4618', '$2y$10$8Ls3IE7VDjrYwpTRUPEmjuHIpalENMEp9xM1Upb4EPgWvfI7VS2Py', 'sample', '', 'helper', 'helper', 'pending', 0, '2026-03-30 13:46:28', NULL, NULL),
	(15, 'helper1@gmail.com', 'helper19016', '$2y$10$eMMgV6wbyaAO3Lo3DSxlDOfHkLrqigeiHiZT.0Hcqp8xnX/HaCeym', 'Sample1', '', 'Helper1', 'helper', 'approved', 0, '2026-04-08 09:09:42', '2026-04-14 15:01:27', NULL),
	(16, 'parent1@gmail.com', 'parent16084', '$2y$10$xFfA2AlBRGST0a3e26FmXO.5p/3bvB.MD9rjVK1DqzuzNaSdGIP5K', 'parent1', '', 'parent1', 'parent', 'approved', 1, '2026-04-08 09:10:25', '2026-04-14 11:35:31', NULL),
	(17, 'kurt@gmail.com', 'kurt6302', '$2y$10$CMoHhF4Ixnq.z7.ykE2D1eQASL/SRuAKrfG/bjS6ppjzy.yZNbIUC', 'kurt', 'russel', 'ardines', 'helper', 'approved', 1, '2026-04-12 16:27:01', '2026-05-25 18:07:46', NULL),
	(18, 'george@gmail.com', 'george6296', '$2y$10$bpPC4cU6U329ZMi4togwjeE2Mzq2Eb.Jxs85lMTDKQwAZZaIqwgNi', 'George', 'Garciano', 'Pericano', 'helper', 'approved', 1, '2026-04-28 08:56:29', '2026-04-28 10:13:57', NULL),
	(19, 'pinky@gmail.com', 'pinky8210', '$2y$10$uj2wJuvyGsmv8NFhm1D7bOHWiE5phfsuntv027XeBgiYpX91BLhyK', 'Pinky', '', 'Pacabis', 'parent', 'approved', 1, '2026-04-28 09:18:35', '2026-04-28 10:18:10', NULL),
	(20, 'newparent1@gmail.com', 'newparent14152', '$2y$10$7XD/sCCTg/HRhOsiwE5lQezAqrXdFgrLI1XEHnNaUhWyOiJaMdGUO', 'New', '', 'Parent', 'parent', 'approved', 1, '2026-04-28 11:01:40', '2026-04-28 11:46:28', NULL),
	(21, 'newhelper1@gmail.com', 'newhelper18988', '$2y$10$4L05yVjiE4F2z4rt7j9CleR6knn47oVGr/U8jgDrGYmNbWpSg7KJ6', 'New', '', 'Helper', 'helper', 'approved', 1, '2026-04-28 11:02:35', '2026-04-28 11:43:35', NULL),
	(22, 'new@peso.com', 'peso1234', '$2y$10$3wzH6k/2TNG2i0ybUY2llO6q6PQvcwMr3W.JdbvSXbWNm7oRDkAnG', 'New', '', 'Peso', 'peso', 'approved', 1, '2026-04-28 11:07:31', NULL, NULL),
	(23, 'helper123@gmail.com', 'helper1237393', '$2y$10$xy2H9xVfHsaXNXi8NlRyRuL8fwzMOzm.v6AnVYtolEnL9UsCIWyem', 'User', '', 'Helper123', 'helper', 'pending', 0, '2026-05-11 06:48:14', NULL, NULL),
	(24, 'userhelper1234@gmail.com', 'userhelper12343156', '$2y$10$IJBjq/yaxLGLHOcBcQb/d.WbizkvjufkNIGUR3A4JrlqWSBe4yY0.', 'Users', '', 'Helper1234', 'helper', 'pending', 0, '2026-05-11 06:49:24', NULL, NULL),
	(25, 'userparent1234@gmail.com', 'userparent12347865', '$2y$10$SaMEee5UkjvjmH8FM4PB3OVqrf8SBa215ZIpm46deqLbH1o/bDhPK', 'Users', '', 'Parent1234', 'parent', 'pending', 0, '2026-05-11 06:52:26', NULL, NULL),
	(26, 'newhelper@gmail.com', 'newhelper5489', '$2y$10$waU9Spsex7cnwKqeeXUu.OmArALdRZh9.lt4Uf730B4.oeARHgGWK', 'New', '', 'Helper12', 'helper', 'approved', 1, '2026-05-11 06:58:56', '2026-05-11 07:50:03', NULL),
	(27, 'newparent12@gmail.com', 'newparent129452', '$2y$10$IjgiP7EN1K2Ac8neA2kfQ.5MaUkgMRFpvm6ThAkDlEIAYP0keJh3S', 'New', '', 'Parent12', 'parent', 'approved', 1, '2026-05-11 07:00:38', '2026-06-06 07:26:53', NULL);

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
INSERT INTO `user_documents` (`document_id`, `user_id`, `document_type`, `file_path`, `id_type`, `expiry_date`, `status`, `ai_verification_status`, `ai_confidence_score`, `rejection_reason`, `verified_by`, `verified_at`, `uploaded_at`, `updated_at`) VALUES
	(1, 1, 'Barangay Clearance', 'barangay_1_1773489962.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-04-14 10:20:27', '2026-03-14 12:06:02', '2026-04-14 10:20:27'),
	(2, 1, 'Valid ID', 'valid_id_1_1773489962.png', 'PhilSys', NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-04-14 10:20:23', '2026-03-14 12:06:02', '2026-04-14 10:20:23'),
	(3, 1, 'Police Clearance', 'police_1_1773489989.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-04-14 10:20:20', '2026-03-14 12:06:29', '2026-04-14 10:20:20'),
	(4, 1, 'TESDA NC2', 'tesda_1_1773489989.jpg', NULL, NULL, 'Rejected', 'Unchecked', NULL, 'Amat', NULL, NULL, '2026-03-14 12:06:29', '2026-03-30 05:42:03'),
	(7, 2, 'Valid ID', 'parent_validid_2_1773594913.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-03-15 17:17:06', '2026-03-15 17:15:13', '2026-03-15 17:17:06'),
	(8, 2, 'Barangay Clearance', 'parent_brgy_2_1773594913.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-03-15 17:17:03', '2026-03-15 17:15:13', '2026-03-15 17:17:03'),
	(9, 9, 'Valid ID', 'parent_validid_9_1774418179.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-03-25 05:57:07', '2026-03-25 05:56:19', '2026-03-25 05:57:07'),
	(10, 9, 'Barangay Clearance', 'parent_brgy_9_1774418179.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-03-25 05:57:10', '2026-03-25 05:56:19', '2026-03-25 05:57:10'),
	(11, 15, 'Barangay Clearance', 'barangay_15_1775639898.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-04-08 09:25:39', '2026-04-08 09:18:18', '2026-04-08 09:25:39'),
	(12, 15, 'Valid ID', 'valid_id_15_1775639898.png', 'PhilSys', NULL, 'Verified', 'Unchecked', NULL, NULL, NULL, '2026-04-08 09:25:43', '2026-04-08 09:18:18', '2026-04-08 09:25:43'),
	(13, 16, 'Valid ID', 'parent_validid_16_1775640087.png', NULL, NULL, 'Pending', 'Unchecked', NULL, NULL, NULL, NULL, '2026-04-08 09:21:27', NULL),
	(14, 16, 'Barangay Clearance', 'parent_brgy_16_1775640087.png', NULL, NULL, 'Rejected', 'Unchecked', NULL, 'invalid id', NULL, NULL, '2026-04-08 09:21:27', '2026-04-08 09:24:16'),
	(15, 17, 'Barangay Clearance', 'barangay_17_1776166659.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-14 14:37:22', '2026-04-14 11:37:39', '2026-04-14 14:37:22'),
	(16, 17, 'Valid ID', 'valid_id_17_1776166659.png', 'PhilSys', NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-14 14:37:24', '2026-04-14 11:37:39', '2026-04-14 14:37:24'),
	(17, 17, 'Police Clearance', 'police_17_1776166659.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-14 14:37:18', '2026-04-14 11:37:39', '2026-04-14 14:37:18'),
	(18, 17, 'TESDA NC2', 'tesda_17_1776166659.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-14 14:37:15', '2026-04-14 11:37:39', '2026-04-14 14:37:15'),
	(19, 18, 'Barangay Clearance', 'barangay_18_1777367343.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-28 09:10:14', '2026-04-28 09:09:03', '2026-04-28 09:10:14'),
	(20, 18, 'Valid ID', 'valid_id_18_1777367343.png', 'PhilSys (recommended)', NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-28 09:10:17', '2026-04-28 09:09:03', '2026-04-28 09:10:17'),
	(21, 18, 'Police Clearance', 'police_18_1777367343.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-28 09:10:21', '2026-04-28 09:09:03', '2026-04-28 09:10:21'),
	(22, 18, 'TESDA NC2', 'tesda_18_1777367343.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-28 09:10:23', '2026-04-28 09:09:03', '2026-04-28 09:10:23'),
	(23, 19, 'Valid ID', 'parent_validid_19_1777368203.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-28 10:18:07', '2026-04-28 09:23:23', '2026-04-28 10:18:07'),
	(24, 19, 'Barangay Clearance', 'parent_brgy_19_1777368203.jpg', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 4, '2026-04-28 10:18:04', '2026-04-28 09:23:23', '2026-04-28 10:18:04'),
	(25, 21, 'Barangay Clearance', 'barangay_21_1777375904.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-04-28 11:42:58', '2026-04-28 11:31:44', '2026-04-28 11:42:58'),
	(26, 21, 'Valid ID', 'valid_id_21_1777375904.png', 'PhilSys (recommended)', NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-04-28 11:43:02', '2026-04-28 11:31:44', '2026-04-28 11:43:02'),
	(27, 21, 'Police Clearance', 'police_21_1777375904.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-04-28 11:43:06', '2026-04-28 11:31:44', '2026-04-28 11:43:06'),
	(28, 21, 'TESDA NC2', 'tesda_21_1777375904.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-04-28 11:43:09', '2026-04-28 11:31:44', '2026-04-28 11:43:09'),
	(29, 20, 'Valid ID', 'parent_validid_20_1777376321.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-04-28 11:44:43', '2026-04-28 11:38:41', '2026-04-28 11:44:43'),
	(31, 20, 'Barangay Clearance', 'parent_brgy_20_1777376746.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-04-28 11:46:24', '2026-04-28 11:45:46', '2026-04-28 11:46:24'),
	(32, 27, 'Valid ID', 'parent_validid_27_1778483501.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-05-11 07:49:20', '2026-05-11 07:11:41', '2026-05-11 07:49:20'),
	(33, 27, 'Barangay Clearance', 'parent_brgy_27_1778483501.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-05-11 07:49:17', '2026-05-11 07:11:41', '2026-05-11 07:49:17'),
	(34, 26, 'Barangay Clearance', 'barangay_26_1778483773.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-05-11 07:49:42', '2026-05-11 07:16:13', '2026-05-11 07:49:42'),
	(35, 26, 'Valid ID', 'valid_id_26_1778483773.png', 'PhilSys (recommended)', NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-05-11 07:49:46', '2026-05-11 07:16:13', '2026-05-11 07:49:46'),
	(36, 26, 'Police Clearance', 'police_26_1778483773.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-05-11 07:49:52', '2026-05-11 07:16:13', '2026-05-11 07:49:52'),
	(37, 26, 'TESDA NC2', 'tesda_26_1778483773.png', NULL, NULL, 'Verified', 'Unchecked', NULL, NULL, 22, '2026-05-11 07:50:01', '2026-05-11 07:16:13', '2026-05-11 07:50:01');

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
