
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `announcement_id` int unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`announcement_id`),
  KEY `idx_announcements_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `application_document_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Per-application helper consent: which verified documents are visible to that specific employer';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `application_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `auth_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `auth_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `clearance_checks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clearance_checks` (
  `check_id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL,
  `user_id` int NOT NULL,
  `reference_number` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_source` enum('extracted','manual') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'manual',
  `outcome` enum('verified_valid','no_record','could_not_verify') COLLATE utf8mb4_general_ci NOT NULL,
  `note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `checked_by` int NOT NULL,
  `checked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`check_id`),
  KEY `idx_doc` (`document_id`,`checked_at`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `complaint_actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `complaints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `category` enum('Misconduct','Fraud / Fake Profile','Non-Payment','Abandonment of Work','Harassment','Property Damage','Theft or Missing Property','Unsafe Working Conditions','Abuse or Mistreatment','Contract Dispute','Technical Issue','Other') COLLATE utf8mb4_general_ci DEFAULT 'Other',
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contract_signatures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `credential_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `helper_custom_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `helper_custom_jobs` (
  `profile_id` int NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `custom_value` text COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`profile_id`,`sort_order`),
  CONSTRAINT `fk_helper_custom_jobs_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `helper_custom_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `helper_custom_skills` (
  `profile_id` int NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `custom_value` text COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`profile_id`,`sort_order`),
  CONSTRAINT `fk_helper_custom_skills_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `helper_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `helper_jobs` (
  `hj_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `job_id` int NOT NULL COMMENT 'ref_jobs.job_id - specific role',
  PRIMARY KEY (`hj_id`),
  UNIQUE KEY `uk_profile_job` (`profile_id`,`job_id`),
  KEY `idx_job` (`job_id`),
  CONSTRAINT `fk_hjobs_job` FOREIGN KEY (`job_id`) REFERENCES `ref_jobs` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hjobs_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=292 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `helper_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `helper_languages` (
  `hl_id` int NOT NULL AUTO_INCREMENT,
  `profile_id` int NOT NULL,
  `language_id` int NOT NULL,
  PRIMARY KEY (`hl_id`),
  UNIQUE KEY `uk_profile_lang` (`profile_id`,`language_id`),
  KEY `idx_language` (`language_id`),
  CONSTRAINT `fk_hlang_language` FOREIGN KEY (`language_id`) REFERENCES `ref_languages` (`language_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hlang_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `helper_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `helper_profiles` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `gender` enum('Male','Female') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `civil_status` enum('Single','Married','Widowed','Separated') COLLATE utf8mb4_general_ci DEFAULT 'Single',
  `preferred_rest_day` varchar(3) COLLATE utf8mb4_general_ci DEFAULT NULL,
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
  `availability_status` enum('Available','Currently Employed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Available',
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_search` (`municipality`,`employment_type`,`work_schedule`),
  KEY `idx_verification` (`verification_status`),
  CONSTRAINT `fk_hprofile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `helper_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=148 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `helper_work_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `experience_review_status` enum('self_reported','peso_reviewed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'self_reported',
  `experience_reviewed_by` int DEFAULT NULL,
  `experience_reviewed_at` datetime DEFAULT NULL,
  `experience_review_method` enum('reference_call','document_review','in_person') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `experience_review_note` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `idx_profile` (`profile_id`),
  CONSTRAINT `fk_whistory_profile` FOREIGN KEY (`profile_id`) REFERENCES `helper_profiles` (`profile_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `interview_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `interview_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interview_notes` (
  `application_id` int NOT NULL,
  `parent_id` int NOT NULL,
  `answers` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `interview_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `interview_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_invites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_post_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_post_categories` (
  `job_post_id` int NOT NULL,
  `category_id` int NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`job_post_id`,`category_id`),
  KEY `idx_job_post_categories_category` (`category_id`),
  CONSTRAINT `fk_job_post_categories_post` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_post_custom_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_post_custom_skills` (
  `job_post_id` int NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `custom_skill` text COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`job_post_id`,`sort_order`),
  CONSTRAINT `fk_job_post_custom_skills_post` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_post_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_post_roles` (
  `job_post_id` int NOT NULL,
  `job_id` int NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`job_post_id`,`job_id`),
  KEY `idx_job_post_roles_job` (`job_id`),
  CONSTRAINT `fk_job_post_roles_post` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_post_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_post_skills` (
  `job_post_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`job_post_id`,`skill_id`),
  KEY `idx_job_post_skills_skill` (`skill_id`),
  CONSTRAINT `fk_job_post_skills_post` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_posts` (
  `job_post_id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL COMMENT 'users.user_id of parent',
  `category_id` int NOT NULL COMMENT 'ref_categories.category_id',
  `custom_category` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
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
  `slots` int unsigned NOT NULL DEFAULT '1' COMMENT 'Number of helpers hired through this post',
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
) ENGINE=InnoDB AUTO_INCREMENT=122 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_views`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `leave_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `paid_leave_source` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'statutory_sil, contract_sick, contract_vacation, or unpaid',
  PRIMARY KEY (`id`),
  KEY `idx_leave_app` (`application_id`),
  KEY `idx_leave_helper` (`helper_id`),
  KEY `idx_leave_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `log_trail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=462 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=295 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parent_children`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parent_elderly`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parent_household`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parent_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_verify_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_verify_attempts` (
  `user_id` int NOT NULL,
  `attempt_count` int NOT NULL DEFAULT '0',
  `last_attempt` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_password_verify_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payment_checkouts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payment_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payslip_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payslip_records` (
  `payslip_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `pay_period_start` date NOT NULL,
  `pay_period_end` date NOT NULL,
  `paid_at` date NOT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `deductions_json` json DEFAULT NULL,
  `deductions_total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Cash',
  `employer_note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','acknowledged','disputed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `helper_acknowledged_at` datetime DEFAULT NULL,
  `helper_disputed_at` datetime DEFAULT NULL,
  `helper_dispute_reason` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payslip_id`),
  KEY `idx_payslips_application_paid` (`application_id`,`paid_at`),
  CONSTRAINT `fk_payslips_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `peso_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `peso_user_moderation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `peso_user_moderation` (
  `moderation_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `staff_user_id` int NOT NULL,
  `action` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `reason` text COLLATE utf8mb4_general_ci NOT NULL,
  `previous_user_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `new_user_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `previous_verification_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `new_verification_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `closed_job_posts` int unsigned NOT NULL DEFAULT '0',
  `withdrawn_applications` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`moderation_id`),
  KEY `idx_moderation_user` (`user_id`,`created_at`),
  KEY `idx_moderation_staff` (`staff_user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `placement_experience_confirmations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `placement_experience_confirmations` (
  `placement_id` int NOT NULL,
  `helper_confirmed_at` datetime DEFAULT NULL,
  `parent_confirmed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`placement_id`),
  CONSTRAINT `fk_placement_experience_confirmation_placement` FOREIGN KEY (`placement_id`) REFERENCES `placements` (`placement_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `placement_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `placement_renewal_intent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `placement_renewal_intent` (
  `application_id` int NOT NULL COMMENT 'job_applications.application_id',
  `parent_interested` tinyint(1) DEFAULT NULL COMMENT 'NULL undecided, 0 no, 1 yes',
  `helper_interested` tinyint(1) DEFAULT NULL COMMENT 'NULL undecided, 0 no, 1 yes',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `placement_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `placements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ref_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ref_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'PESO Nature of Work',
  `icon` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Icon name for frontend',
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uk_category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ref_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ref_jobs` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `job_title` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`job_id`),
  KEY `idx_category` (`category_id`),
  CONSTRAINT `fk_rjobs_category` FOREIGN KEY (`category_id`) REFERENCES `ref_categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ref_languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ref_languages` (
  `language_id` int NOT NULL AUTO_INCREMENT,
  `language_name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`language_id`),
  UNIQUE KEY `uk_language` (`language_name`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ref_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ref_skills` (
  `skill_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`skill_id`),
  KEY `idx_job` (`job_id`),
  CONSTRAINT `fk_rskills_job` FOREIGN KEY (`job_id`) REFERENCES `ref_jobs` (`job_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `saved_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `saved_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `saved_searches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `single_upload_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci GENERATED ALWAYS AS ((case when (`document_type` = _utf8mb4'TESDA NC2') then NULL else `document_type` end)) STORED,
  PRIMARY KEY (`document_id`),
  UNIQUE KEY `uk_user_single_doctype` (`user_id`,`single_upload_type`) COMMENT 'Only one record per non-TESDA document type per user',
  KEY `idx_status` (`status`),
  KEY `idx_verified_by` (`verified_by`),
  CONSTRAINT `fk_udocs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_udocs_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=97 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_safety_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(11) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `account_verified_at` datetime DEFAULT NULL,
  `account_verification_channel` varchar(10) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'email',
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
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
