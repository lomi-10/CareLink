-- ===========================================================================
-- CareLink — wipe the live database and seed four test accounts
-- ===========================================================================
--
-- WHAT THIS DOES
--   Deletes EVERY account and everything attached to them: profiles, job
--   posts, applications, contracts, placements, complaints, messages,
--   notifications, uploaded-document records, evaluation answers, audit log.
--   Then creates four known accounts you can log into from Postman.
--
--   THIS CANNOT BE UNDONE. Export a backup first:
--     Hostinger hPanel > Databases > phpMyAdmin > Export > Go
--   Keep that .sql file somewhere off the server.
--
-- WHAT IT KEEPS
--   ref_categories, ref_jobs, ref_skills, ref_languages — the job and skill
--     reference data your dropdowns are built from. Wiping it would empty
--     every category picker in the app.
--   feedback_questions  — the ISO/IEC 25010 evaluation instrument.
--   placement_settings  — fee configuration.
--
-- WHAT IT CANNOT REACH
--   Files already in backend/uploads/. The rows pointing at them are deleted,
--   so those files become orphans taking up disk. Clear them yourself in
--   Hostinger's File Manager if you want the space back.
--
-- HOW TO RUN
--   phpMyAdmin > click your CareLink database in the left sidebar > SQL tab >
--   paste this whole file > Go. Do not add a USE statement; clicking the
--   database already selected it.
--
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- STEP 1 — Empty every table holding user data
-- ---------------------------------------------------------------------------
-- FOREIGN_KEY_CHECKS goes off because peso_reports and placements reference
-- users with ON DELETE NO ACTION: with checks on, MySQL refuses to empty the
-- users table at all and answers "Cannot delete or update a parent row".
-- TRUNCATE also resets AUTO_INCREMENT, which is what lets the accounts in
-- Step 2 land on ids 1 to 4 predictably.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE application_document_shares;
TRUNCATE TABLE application_flags;
TRUNCATE TABLE application_tasks;
TRUNCATE TABLE attendance_logs;
TRUNCATE TABLE auth_codes;
TRUNCATE TABLE auth_tokens;
TRUNCATE TABLE complaint_actions;
TRUNCATE TABLE complaints;
TRUNCATE TABLE contract_signatures;
TRUNCATE TABLE contracts;
TRUNCATE TABLE credential_flags;
TRUNCATE TABLE feedback_answers;
TRUNCATE TABLE helper_jobs;
TRUNCATE TABLE helper_languages;
TRUNCATE TABLE helper_profiles;
TRUNCATE TABLE helper_skills;
TRUNCATE TABLE helper_work_history;
TRUNCATE TABLE interview_feedback;
TRUNCATE TABLE interview_notes;
TRUNCATE TABLE interview_reviews;
TRUNCATE TABLE interview_schedules;
TRUNCATE TABLE job_applications;
TRUNCATE TABLE job_invites;
TRUNCATE TABLE job_posts;
TRUNCATE TABLE job_views;
TRUNCATE TABLE leave_requests;
TRUNCATE TABLE log_trail;
TRUNCATE TABLE messages;
TRUNCATE TABLE notifications;
TRUNCATE TABLE parent_children;
TRUNCATE TABLE parent_elderly;
TRUNCATE TABLE parent_household;
TRUNCATE TABLE parent_profiles;
TRUNCATE TABLE password_verify_attempts;
TRUNCATE TABLE payment_checkouts;
TRUNCATE TABLE payment_events;
TRUNCATE TABLE peso_reports;
TRUNCATE TABLE placement_fees;
TRUNCATE TABLE placement_renewal_intent;
TRUNCATE TABLE placement_reviews;
TRUNCATE TABLE placement_tasks;
TRUNCATE TABLE placements;
TRUNCATE TABLE saved_jobs;
TRUNCATE TABLE saved_profiles;
TRUNCATE TABLE saved_searches;
TRUNCATE TABLE subscriptions;
TRUNCATE TABLE system_feedback;
TRUNCATE TABLE task_checklist_items;
TRUNCATE TABLE user_documents;
TRUNCATE TABLE user_safety_flags;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;


-- ---------------------------------------------------------------------------
-- STEP 2 — Create the four test accounts
-- ---------------------------------------------------------------------------
-- Password for all four: CareLink!2026
--
-- Those $2y$10$... strings are bcrypt hashes of that password, generated with
-- PHP's password_hash(..., PASSWORD_BCRYPT) — the same function signup.php
-- uses, so login.php's password_verify() accepts them. They are not the
-- password itself and cannot be read backwards into it. Copy them EXACTLY;
-- one changed character and the account simply will not log in.
--
-- Two columns matter more than they look:
--
--   email_verified_at  auth/login.php refuses any account where this is NULL
--                      with "Please verify your email to continue" — before it
--                      even checks the password. NOW() marks them verified so
--                      no 6-digit email code is needed.
--
--   status             Must be exactly 'approved'. Every staff guard in the
--                      backend tests for that literal string; 'active' looks
--                      right and leaves the account completely inert.

INSERT INTO users
  (user_id, email, phone, email_verified_at, username, password,
   first_name, middle_name, last_name, user_type, status,
   profile_completed, created_at, privacy_consent_at)
VALUES
  -- 1. PESO officer — verifies users and jobs, runs reports
  (1, 'peso@carelink.test', '09171000001', NOW(), 'peso_officer',
   '$2y$10$PU9iSLFay9CzvD1TJWJR/u8A8GeIUxhr7Ca6AlH/x/VyDx2XAuNOC',
   'PESO', NULL, 'Officer', 'peso', 'approved', 1, NOW(), NOW()),

  -- 2. Super admin — creates PESO accounts, sees system evaluation results
  (2, 'admin@carelink.test', '09171000002', NOW(), 'super_admin',
   '$2y$10$fcV43YJeisb016fuX3cRiOUCZgdCR2toCS4rH50nN7aBADo27Lyxu',
   'Super', NULL, 'Admin', 'admin', 'approved', 1, NOW(), NOW()),

  -- 3. Helper (kasambahay)
  (3, 'helper@carelink.test', '09171000003', NOW(), 'test_helper',
   '$2y$10$uVr7lJwP.fo2qZpL3av2Zece0b0aRvXI2jbcyfDy.i5iwevYBfT42',
   'Maria', NULL, 'Santos', 'helper', 'approved', 1, NOW(), NOW()),

  -- 4. Household employer
  (4, 'employer@carelink.test', '09171000004', NOW(), 'test_employer',
   '$2y$10$.0zT/sUKBnW127dRI3HvuO8wFOHRDkTebNgG7kx5VKHHfj.MjVGxG',
   'Juan', NULL, 'Dela Cruz', 'parent', 'approved', 1, NOW(), NOW());


-- Helper profile.
--
-- Filled in rather than left blank on purpose: birth_date, gender and
-- education_level are what the System Evaluation screen auto-answers from,
-- and an empty profile makes the helper's Part I demographics fall back to
-- being asked by hand. Ormoc so the "within Ormoc vs beyond" report has
-- something on the inside of the line.
--
-- verification_status is 'Verified' for BOTH test accounts, and it has to be.
--
-- post_job.php, apply_job.php, invite_helper.php, send_message.php and
-- create_direct_hire_offer.php all refuse an unverified account, and they
-- refuse it BEFORE checking anything else — correctly, since authorisation
-- comes before business rules. Seeding these as 'Pending' therefore blocks
-- almost every API test behind "Your account is still being verified", and
-- the RA 10361 scope gate never even runs.
--
-- To demo the PESO approval queue instead, put ONE of them back afterwards:
--   UPDATE helper_profiles SET verification_status = 'Pending' WHERE user_id = 3;

-- Neither profile table carries a phone number any more — that column was
-- dropped and the number lives on users.phone alone, set in Step 2.

INSERT INTO helper_profiles
  (user_id, birth_date, gender, civil_status, religion,
   province, municipality, barangay, latitude, longitude, address,
   bio, education_level, experience_years, employment_type, work_schedule,
   expected_salary, salary_period, verification_status)
VALUES
  (3, '1996-04-12', 'Female', 'Single', 'Roman Catholic',
   'Leyte', 'Ormoc', 'Cogon', 11.0064000, 124.6075000, 'Cogon, Ormoc, Leyte',
   'Test helper account for API testing.', 'High School Grad', 3,
   'Stay-out', 'Full-time', 6000.00, 'Monthly', 'Verified');


-- Household employer profile. province is NOT NULL and defaults to 'Leyte',
-- so it is set explicitly rather than relied upon.

INSERT INTO parent_profiles
  (user_id, province, municipality, barangay,
   latitude, longitude, address, bio, religion, verification_status)
VALUES
  (4, 'Leyte', 'Ormoc', 'Punta',
   11.0092018, 124.6003072, 'Punta, Ormoc, Leyte',
   'Test household employer account for API testing.', 'Roman Catholic', 'Verified');



-- ---------------------------------------------------------------------------
-- STEP 2b. Sample records, so the API test run is fully green and repeatable
-- ---------------------------------------------------------------------------
-- Three PESO read endpoints fetch a specific record: a job post, an interview
-- and a complaint. On a database with none of those they answer "not found" —
-- correct behaviour, but it fails the test run for want of data rather than
-- for any defect.
--
-- These four rows give each of them something real to read, on FIXED ids
-- (job_post_id 1, application_id 1, interview_id 1, complaint_id 1) that the
-- Postman environment already points at. A fresh import therefore produces the
-- same green run every time, which is what you want when re-running it in
-- front of a panel.
--
-- They are demonstration fixtures between the two test accounts. Delete them
-- before real users arrive:
--   DELETE FROM complaints          WHERE complaint_id = 1;
--   DELETE FROM interview_schedules WHERE interview_id = 1;
--   DELETE FROM job_applications    WHERE application_id = 1;
--   DELETE FROM job_posts           WHERE job_post_id = 1;

-- A verified, open job post by the employer (user 4).
-- status 'Open' and verified_by 1 means PESO has already approved it, which is
-- what makes it visible and what get_job_details.php expects to describe.
INSERT INTO job_posts
  (job_post_id, parent_id, category_id, title, description,
   employment_type, work_schedule, salary_offered, salary_min, salary_max,
   salary_period, province, municipality, barangay, latitude, longitude,
   status, visibility, posted_at, verified_by, verified_at,
   work_hours, contract_duration, provides_meals, provides_sss,
   provides_philhealth, provides_pagibig, vacation_days)
VALUES
  (1, 4, 1, 'General Househelp for a family of four',
   'Daily household upkeep for a family of four in Ormoc City: cleaning, laundry, marketing and simple meal preparation. Recurring household employment under RA 10361. Rest day every Sunday, and the 13th month pay and SSS, PhilHealth and Pag-IBIG contributions required by the Batas Kasambahay are provided.',
   'Stay-out', 'Full-time', 8000.00, 8000.00, 9000.00,
   'Monthly', 'Leyte', 'Ormoc', 'Cogon', 11.0064000, 124.6075000,
   'Open', 'public', NOW(), 1, NOW(),
   '8 hours', '1 year', 1, 1,
   1, 1, 5);

-- The helper (user 3) applied to it, and has been moved to interview stage.
INSERT INTO job_applications
  (application_id, job_post_id, helper_id, cover_letter, status, applied_at, reviewed_at)
VALUES
  (1, 1, 3,
   'Good day po. I have three years of experience in general househelp and laundry, and I live in Ormoc. I am available to start immediately.',
   'Interview Scheduled', NOW(), NOW());

-- A scheduled interview on that application. Both sides confirmed, result
-- still Pending, which is the state the PESO interview tracker is built to show.
INSERT INTO interview_schedules
  (interview_id, application_id, interview_date, interview_type,
   location_or_link, parent_confirmed, helper_confirmed, status, result, created_at)
VALUES
  (1, 1, DATE_ADD(NOW(), INTERVAL 3 DAY), 'In-person',
   'PESO Office, Ormoc City Hall', 1, 1, 'Confirmed', 'Pending', NOW());

-- An open complaint, helper against employer, at the PESO escalation stage.
-- Left unresolved on purpose: the collection's "safety flag on an unresolved
-- case must be refused" test needs a case that is genuinely still open.
INSERT INTO complaints
  (complaint_id, complainant_id, complainant_role, respondent_id,
   subject, description, incident_at, incident_location,
   incident_barangay, incident_municipality, incident_province,
   category, status, escalation_stage, created_at)
VALUES
  (1, 3, 'helper', 4,
   'Salary paid late for two consecutive months',
   'Sample record for API testing. The agreed salary was not paid on the agreed date in two consecutive months, and the delay was about two weeks each time. Raised here so the complaint tracker has a case to display.',
   DATE_SUB(NOW(), INTERVAL 10 DAY), 'Employer residence, Cogon, Ormoc City',
   'Cogon', 'Ormoc', 'Leyte',
   'Non-Payment', 'Under Review', 'peso', DATE_SUB(NOW(), INTERVAL 9 DAY));


-- ---------------------------------------------------------------------------
-- STEP 3 — Confirm it worked
-- ---------------------------------------------------------------------------
-- Expect exactly four rows, all status 'approved', all with a verified_at
-- timestamp. Anything else and the accounts will not log in.

SELECT user_id, email, user_type, status, email_verified_at
FROM users
ORDER BY user_id;
