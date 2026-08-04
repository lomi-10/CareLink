-- =============================================================================
-- CareLink — DEMO SEED for user testing
--
-- Creates BOTH sides of the marketplace so either role can be tested:
--   • 6 PESO-verified employer households + 15 approved job posts
--     -> a helper tester immediately sees real jobs with real match scores
--   • 8 PESO-verified helpers with roles, skills, languages and documents
--     -> an employer tester immediately sees real candidates to browse and invite
--
-- Scores are computed by the actual algorithm, not faked. The helpers are spread
-- across every category and a range of experience and expected salary, so the
-- match percentages a tester sees actually vary and mean something.
--
-- RUN: phpMyAdmin -> your DB -> SQL tab -> paste -> Go.
-- Requires migration_2026_07_17.sql and migration_2026_07_19_verified_field_change.sql
-- to have been run first (users.email_verified_at must exist).
--
-- SAFE TO RE-RUN: every insert is keyed on a @carelink-demo.test email, and the
-- script deletes any previous demo rows first. It never touches real accounts.
--
-- TO REMOVE AFTERWARDS: run just the DELETE block at the top, on its own.
--
-- Demo login (all demo accounts): password  CareLinkDemo2026!
-- ^ DELETE THESE ACCOUNTS AFTER TESTING. Do not leave shared-password accounts
--   on a live site.
-- =============================================================================


-- ── 1. Clean out any previous demo data ──────────────────────────────────────
-- ON DELETE CASCADE on job_posts/parent_profiles clears the children for us.
DELETE FROM users WHERE email LIKE '%@carelink-demo.test';


-- ── 2. Employer accounts ─────────────────────────────────────────────────────
-- status='approved' + email_verified_at set + profile_completed=1 so they behave
-- exactly like a real verified employer.
INSERT INTO users (email, username, password, first_name, last_name, user_type, status, profile_completed, email_verified_at, created_at) VALUES
('reyes@carelink-demo.test',    'demo_reyes',    '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Marites', 'Reyes',    'parent', 'approved', 1, NOW(), NOW() - INTERVAL 40 DAY),
('delacruz@carelink-demo.test', 'demo_delacruz', '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Ramon',   'Dela Cruz','parent', 'approved', 1, NOW(), NOW() - INTERVAL 35 DAY),
('santos@carelink-demo.test',   'demo_santos',   '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Liza',    'Santos',   'parent', 'approved', 1, NOW(), NOW() - INTERVAL 30 DAY),
('bautista@carelink-demo.test', 'demo_bautista', '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Ernesto', 'Bautista', 'parent', 'approved', 1, NOW(), NOW() - INTERVAL 25 DAY),
('villanueva@carelink-demo.test','demo_villanueva','$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK','Grace',  'Villanueva','parent','approved', 1, NOW(), NOW() - INTERVAL 18 DAY),
('lim@carelink-demo.test',      'demo_lim',      '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Andrew',  'Lim',      'parent', 'approved', 1, NOW(), NOW() - INTERVAL 12 DAY);


-- ── 3. Employer profiles ─────────────────────────────────────────────────────
-- Spread around Ormoc City so the 10-point distance weight produces a real
-- spread instead of every job scoring identically.
INSERT INTO parent_profiles (user_id, contact_number, province, municipality, barangay, latitude, longitude, address, bio, verification_status, verified_at)
SELECT u.user_id, v.contact, 'Leyte', 'Ormoc City', v.brgy, v.lat, v.lng,
       CONCAT(v.brgy, ', Ormoc City, Leyte'), v.bio, 'Verified', NOW()
FROM users u
JOIN (
  SELECT 'reyes@carelink-demo.test'     AS email, '09171000001' AS contact, 'Cogon'        AS brgy, 11.0064 AS lat, 124.6075 AS lng, 'We are a family of four with two school-age kids. We value honesty and a calm, tidy home.' AS bio UNION ALL
  SELECT 'delacruz@carelink-demo.test',        '09171000002', 'Can-adieng',   11.0121, 124.6142, 'Retired couple living quietly. We mainly need help with cooking and keeping the house in order.' UNION ALL
  SELECT 'santos@carelink-demo.test',          '09171000003', 'Linao',        11.0198, 124.5987, 'Working parents with a 1-year-old and a toddler. Looking for someone patient and warm with children.' UNION ALL
  SELECT 'bautista@carelink-demo.test',        '09171000004', 'Alegria',      10.9932, 124.6203, 'We keep a large garden and a few fruit trees. Weekend help is welcome too.' UNION ALL
  SELECT 'villanueva@carelink-demo.test',      '09171000005', 'Punta',        11.0256, 124.6011, 'Busy household of five. Laundry and ironing pile up quickly — we need a reliable pair of hands.' UNION ALL
  SELECT 'lim@carelink-demo.test',             '09171000006', 'Bantigue',     11.0089, 124.6288, 'Small family with an elderly grandmother at home. Kindness matters more than experience to us.'
) v ON v.email = u.email;

INSERT INTO parent_household (profile_id, household_size, household_type, has_children, has_elderly, has_pets, pet_details)
SELECT pp.profile_id, v.size, v.htype, v.kids, v.elderly, v.pets, v.petd
FROM parent_profiles pp
JOIN users u ON u.user_id = pp.user_id
JOIN (
  SELECT 'reyes@carelink-demo.test'     AS email, 4 AS size, 'house'        AS htype, 1 AS kids, 0 AS elderly, 1 AS pets, '1 dog'        AS petd UNION ALL
  SELECT 'delacruz@carelink-demo.test',        2, 'house',        0, 1, 0, NULL UNION ALL
  SELECT 'santos@carelink-demo.test',          4, 'townhouse',    1, 0, 0, NULL UNION ALL
  SELECT 'bautista@carelink-demo.test',        3, 'house',        0, 0, 1, '2 dogs'  UNION ALL
  SELECT 'villanueva@carelink-demo.test',      5, 'house',        1, 0, 0, NULL UNION ALL
  SELECT 'lim@carelink-demo.test',             4, 'apartment',    1, 1, 1, '1 cat'
) v ON v.email = u.email;


-- ── 4. Job posts ─────────────────────────────────────────────────────────────
-- status='Open' = already PESO-approved, so helpers see them immediately.
-- job_ids / skill_ids are real ref_jobs / ref_skills ids — the matcher reads
-- these directly, and a helper's CATEGORIES are derived from their job roles,
-- so these must be valid or matching silently scores zero.
INSERT INTO job_posts
  (parent_id, category_id, job_ids, skill_ids, title, description,
   employment_type, work_schedule, salary_offered, salary_period,
   province, municipality, barangay, latitude, longitude,
   min_age, max_age, min_experience_years, work_hours, days_off, contract_duration,
   provides_meals, provides_accommodation, provides_sss, provides_philhealth, provides_pagibig,
   vacation_days, sick_days, status, posted_at, verified_at) 
SELECT u.user_id, v.cat, v.jobs, v.skills, v.title, v.descr,
       v.etype, v.sched, v.salary, 'Monthly',
       'Leyte', 'Ormoc City', pp.barangay, pp.latitude, pp.longitude,
       v.min_age, v.max_age, v.min_exp, v.hours, v.days_off, v.duration,
       v.meals, v.accom, 1, 1, 1,
       5, 5, 'Open', NOW() - INTERVAL v.age_days DAY, NOW() - INTERVAL v.age_days DAY
FROM users u
JOIN parent_profiles pp ON pp.user_id = u.user_id
JOIN (
  -- General Househelp (category 1)
  SELECT 'reyes@carelink-demo.test' AS email, 1 AS cat, '[1,17]' AS jobs, '[1,2,3]' AS skills,
         'General Househelp' AS title,
         'We need a reliable housekeeper for general cleaning, laundry and keeping the home orderly. Our two kids are in school most of the day, so mornings are quiet.' AS descr,
         'Stay-out' AS etype, 'Full-time' AS sched, 9000 AS salary, 21 AS min_age, 50 AS max_age, 1 AS min_exp,
         '8:00 AM - 5:00 PM' AS hours, '["Sunday"]' AS days_off, '1 year' AS duration, 1 AS meals, 0 AS accom, 2 AS age_days
  UNION ALL SELECT 'reyes@carelink-demo.test', 1, '[16,20]', '[1,3]',
         'All-Around Househelp',
         'Looking for an all-around helper who can handle cleaning, dishes and light cooking. Friendly household, clear routine, no heavy lifting.',
         'Stay-in', 'Full-time', 11000, 22, 45, 2, '7:00 AM - 6:00 PM', '["Sunday"]', 'Indefinite', 1, 1, 9
  UNION ALL SELECT 'lim@carelink-demo.test', 1, '[1,19]', '[1,2]',
         'House Cleaner',
         'Twice-weekly cleaning for a small apartment. Ideal for someone who prefers part-time work with a predictable schedule.',
         'Stay-out', 'Part-time', 7500, 20, 55, 0, '9:00 AM - 2:00 PM', '["Saturday","Sunday"]', '6 months', 0, 0, 5

  -- Yaya (category 2)
  UNION ALL SELECT 'santos@carelink-demo.test', 2, '[3,21]', NULL,
         'Yaya / Nanny',
         'Caring for a 1-year-old and a 3-year-old while both parents work. Patience and warmth matter most to us. No cooking or heavy cleaning expected.',
         'Stay-in', 'Full-time', 12000, 22, 45, 2, '6:00 AM - 6:00 PM', '["Sunday"]', 'Indefinite', 1, 1, 1
  UNION ALL SELECT 'santos@carelink-demo.test', 2, '[5,22]', NULL,
         'Infant Care Specialist',
         'Specialised newborn care for our youngest. Experience with infants is essential; we are happy to work around your preferred hours.',
         'Stay-out', 'Full-time', 13500, 25, 50, 3, '7:00 AM - 5:00 PM', '["Sunday"]', '1 year', 1, 0, 4
  UNION ALL SELECT 'lim@carelink-demo.test', 2, '[4,23]', NULL,
         'After-School Nanny',
         'Meet our 7-year-old after school, help with homework and prepare a light snack until we get home. Great fit for someone studying part-time.',
         'Stay-out', 'Part-time', 7000, 20, 45, 0, '3:00 PM - 7:00 PM', '["Saturday","Sunday"]', '6 months', 0, 0, 8

  -- Cook (category 3)
  UNION ALL SELECT 'delacruz@carelink-demo.test', 3, '[6]', NULL,
         'Family Cook',
         'Preparing lunch and dinner for two. We eat simply — home-style Filipino cooking, low salt. Marketing budget provided.',
         'Stay-out', 'Full-time', 10000, 25, 60, 2, '9:00 AM - 6:00 PM', '["Sunday"]', 'Indefinite', 1, 0, 3
  UNION ALL SELECT 'delacruz@carelink-demo.test', 3, '[28]', NULL,
         'Special Diet Cook',
         'We both need low-sodium, diabetic-friendly meals. Someone comfortable following a doctor-recommended meal plan would suit us well.',
         'Stay-out', 'Part-time', 9500, 25, 60, 3, '8:00 AM - 1:00 PM', '["Saturday","Sunday"]', '1 year', 1, 0, 11
  UNION ALL SELECT 'reyes@carelink-demo.test', 3, '[7,27]', NULL,
         'Meal Prep Cook',
         'Batch-cook for the week every Saturday plus tidy the kitchen afterwards. One long day rather than daily visits.',
         'Stay-out', 'Part-time', 8000, 21, 55, 1, '7:00 AM - 3:00 PM', '["Sunday","Monday"]', '6 months', 1, 0, 14

  -- Gardening (category 4)
  UNION ALL SELECT 'bautista@carelink-demo.test', 4, '[8,30]', NULL,
         'Gardener',
         'Maintaining our garden, fruit trees and lawn. Physically active outdoor work; tools and equipment are all provided.',
         'Stay-out', 'Full-time', 9000, 21, 55, 1, '6:00 AM - 3:00 PM', '["Sunday"]', '1 year', 1, 0, 6
  UNION ALL SELECT 'bautista@carelink-demo.test', 4, '[31,33]', NULL,
         'Lawn & Vegetable Garden Aide',
         'Weekend help with mowing, trimming and tending our vegetable plot. Perfect as extra income alongside other work.',
         'Stay-out', 'Part-time', 7200, 18, 60, 0, '7:00 AM - 12:00 NN', '["Monday","Tuesday","Wednesday","Thursday","Friday"]', '6 months', 0, 0, 16

  -- Laundry (category 5)
  UNION ALL SELECT 'villanueva@carelink-demo.test', 5, '[10,11]', NULL,
         'Laundry Person',
         'Washing, drying and ironing for a household of five. We have a washing machine; you would handle sorting, folding and ironing.',
         'Stay-out', 'Full-time', 8500, 20, 55, 1, '8:00 AM - 4:00 PM', '["Sunday"]', 'Indefinite', 1, 0, 3
  UNION ALL SELECT 'villanueva@carelink-demo.test', 5, '[11]', NULL,
         'Ironing Specialist',
         'Ironing only, three mornings a week. Office clothes and school uniforms — someone careful with fabrics would be ideal.',
         'Stay-out', 'Part-time', 7000, 20, 60, 0, '8:00 AM - 12:00 NN', '["Saturday","Sunday"]', '6 months', 0, 0, 10

  -- Others (category 6)
  UNION ALL SELECT 'lim@carelink-demo.test', 6, '[12]', NULL,
         'Elderly Caregiver',
         'Daytime companionship and care for our grandmother — meals, medication reminders and light housekeeping. She is mobile and independent.',
         'Stay-out', 'Full-time', 11000, 25, 55, 2, '7:00 AM - 5:00 PM', '["Sunday"]', 'Indefinite', 1, 0, 7
  UNION ALL SELECT 'bautista@carelink-demo.test', 6, '[14,15]', NULL,
         'Errand Runner & Pet Care Aide',
         'Grocery runs, bills, and walking our two dogs. Flexible hours as long as the errands get done.',
         'Stay-out', 'Part-time', 7500, 18, 50, 0, 'Flexible', '["Sunday"]', '6 months', 0, 0, 20
) v ON v.email = u.email;


-- ── 5. Helper accounts ───────────────────────────────────────────────────────
-- PESO-verified so an employer tester can find them straight away. Spread across
-- experience, expected salary and arrangement so match percentages actually vary
-- instead of every candidate scoring the same.
INSERT INTO users (email, username, password, first_name, last_name, user_type, status, profile_completed, email_verified_at, created_at) VALUES
('rosa@carelink-demo.test',    'demo_rosa',    '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Rosa',    'Manalo',   'helper', 'approved', 1, NOW(), NOW() - INTERVAL 60 DAY),
('nena@carelink-demo.test',    'demo_nena',    '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Nena',    'Bacala',   'helper', 'approved', 1, NOW(), NOW() - INTERVAL 55 DAY),
('luzviminda@carelink-demo.test','demo_luz',   '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Luzviminda','Ocampo', 'helper', 'approved', 1, NOW(), NOW() - INTERVAL 50 DAY),
('carmen@carelink-demo.test',  'demo_carmen',  '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Carmen',  'Duran',    'helper', 'approved', 1, NOW(), NOW() - INTERVAL 44 DAY),
('teresita@carelink-demo.test','demo_teresita','$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Teresita','Rabaya',   'helper', 'approved', 1, NOW(), NOW() - INTERVAL 38 DAY),
('jomar@carelink-demo.test',   'demo_jomar',   '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Jomar',   'Pelayo',   'helper', 'approved', 1, NOW(), NOW() - INTERVAL 30 DAY),
('elena@carelink-demo.test',   'demo_elena',   '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Elena',   'Sarmiento','helper', 'approved', 1, NOW(), NOW() - INTERVAL 22 DAY),
('marilou@carelink-demo.test', 'demo_marilou', '$2y$10$9yQqmtZ8vx.sedJ2C2OAp.v4MBks7CX0apSR9BiOlnf5n29qLVZOK', 'Marilou', 'Genson',   'helper', 'approved', 1, NOW(), NOW() - INTERVAL 12 DAY);

INSERT INTO helper_profiles
  (user_id, contact_number, birth_date, gender, civil_status, religion,
   province, municipality, barangay, latitude, longitude, address, bio,
   education_level, experience_years, employment_type, work_schedule,
   expected_salary, salary_period, verification_status, verified_at)
SELECT u.user_id, v.contact, v.bday, v.sex, v.civil, v.religion,
       'Leyte', 'Ormoc City', v.brgy, v.lat, v.lng,
       CONCAT(v.brgy, ', Ormoc City, Leyte'), v.bio,
       v.educ, v.years, v.etype, v.sched, v.salary, 'Monthly', 'Verified', NOW()
FROM users u
JOIN (
  SELECT 'rosa@carelink-demo.test' AS email, '09181000001' AS contact, DATE '1985-03-14' AS bday, 'Female' AS sex, 'Married' AS civil, 'Roman Catholic' AS religion,
         'Cogon' AS brgy, 11.0071 AS lat, 124.6081 AS lng, 'High School Grad' AS educ, 12 AS years, 'Stay-in' AS etype, 'Full-time' AS sched, 10000 AS salary,
         'I have worked as an all-around kasambahay for twelve years, mostly with families who have young children. I am used to running a household on my own and I take pride in a clean, orderly home.' AS bio UNION ALL
  SELECT 'nena@carelink-demo.test',       '09181000002', DATE '1992-07-02', 'Female', 'Single',  'Roman Catholic',
         'Linao',      11.0192, 124.5993, 'College Undergrad', 6,  'Stay-out', 'Full-time', 9000,
         'Six years caring for babies and toddlers. I am patient and I enjoy teaching little ones through play. I completed a short first-aid course last year.' UNION ALL
  SELECT 'luzviminda@carelink-demo.test', '09181000003', DATE '1978-11-20', 'Female', 'Widowed', 'Iglesia ni Cristo',
         'Can-adieng', 11.0128, 124.6137, 'High School Grad',  20, 'Stay-out', 'Full-time', 11000,
         'Twenty years of cooking for households, including families needing low-salt and diabetic meals. I plan menus, do the marketing and keep the kitchen spotless.' UNION ALL
  SELECT 'carmen@carelink-demo.test',     '09181000004', DATE '1995-01-09', 'Female', 'Single',  'Roman Catholic',
         'Punta',      11.0248, 124.6019, 'Vocational',        3,  'Stay-out', 'Part-time', 7500,
         'I specialise in laundry and ironing and I am careful with delicate fabrics and uniforms. Available mornings.' UNION ALL
  SELECT 'teresita@carelink-demo.test',   '09181000005', DATE '1968-05-30', 'Female', 'Married', 'Roman Catholic',
         'Bantigue',   11.0094, 124.6272, 'Elementary',        25, 'Stay-in',  'Full-time', 12000,
         'I have cared for elderly lolos and lolas for most of my working life. I am gentle, I keep to medicine schedules, and I am good company for someone who is often alone.' UNION ALL
  SELECT 'jomar@carelink-demo.test',      '09181000006', DATE '1990-09-17', 'Male',   'Married', 'Roman Catholic',
         'Alegria',    10.9941, 124.6188, 'High School Grad',  8,  'Stay-out', 'Full-time', 9500,
         'Gardener and all-around outdoor helper. I handle lawns, fruit trees and vegetable plots, and I can do small repairs and errands around the property.' UNION ALL
  SELECT 'elena@carelink-demo.test',      '09181000007', DATE '1999-04-25', 'Female', 'Single',  'Born Again Christian',
         'Cogon',      11.0065, 124.6077, 'College Undergrad', 1,  'Stay-out', 'Part-time', 7000,
         'I am still building experience but I learn quickly and I am honest and hardworking. I can help with cleaning, laundry and after-school childcare.' UNION ALL
  SELECT 'marilou@carelink-demo.test',    '09181000008', DATE '1983-12-11', 'Female', 'Separated','Roman Catholic',
         'Linao',      11.0186, 124.5988, 'High School Grad',  15, 'Stay-in',  'Full-time', 10500,
         'All-around househelp with fifteen years of experience. Cleaning, laundry, cooking and childcare — I can take on a whole household and I stay long term.'
) v ON v.email = u.email;

-- Job roles. These drive the 25-point category weight AND the roles weight, so a
-- demo helper with none would score near zero and look broken to a tester.
INSERT INTO helper_jobs (profile_id, job_id)
SELECT hp.profile_id, v.job_id
FROM helper_profiles hp
JOIN users u ON u.user_id = hp.user_id
JOIN (
  SELECT 'rosa@carelink-demo.test' AS email, 1 AS job_id UNION ALL SELECT 'rosa@carelink-demo.test', 16 UNION ALL SELECT 'rosa@carelink-demo.test', 17 UNION ALL SELECT 'rosa@carelink-demo.test', 3
  UNION ALL SELECT 'nena@carelink-demo.test', 3 UNION ALL SELECT 'nena@carelink-demo.test', 4 UNION ALL SELECT 'nena@carelink-demo.test', 21 UNION ALL SELECT 'nena@carelink-demo.test', 23
  UNION ALL SELECT 'luzviminda@carelink-demo.test', 6 UNION ALL SELECT 'luzviminda@carelink-demo.test', 7 UNION ALL SELECT 'luzviminda@carelink-demo.test', 28 UNION ALL SELECT 'luzviminda@carelink-demo.test', 25
  UNION ALL SELECT 'carmen@carelink-demo.test', 10 UNION ALL SELECT 'carmen@carelink-demo.test', 11
  UNION ALL SELECT 'teresita@carelink-demo.test', 12 UNION ALL SELECT 'teresita@carelink-demo.test', 1
  UNION ALL SELECT 'jomar@carelink-demo.test', 8 UNION ALL SELECT 'jomar@carelink-demo.test', 9 UNION ALL SELECT 'jomar@carelink-demo.test', 31 UNION ALL SELECT 'jomar@carelink-demo.test', 14
  UNION ALL SELECT 'elena@carelink-demo.test', 17 UNION ALL SELECT 'elena@carelink-demo.test', 23 UNION ALL SELECT 'elena@carelink-demo.test', 10
  UNION ALL SELECT 'marilou@carelink-demo.test', 1 UNION ALL SELECT 'marilou@carelink-demo.test', 16 UNION ALL SELECT 'marilou@carelink-demo.test', 6 UNION ALL SELECT 'marilou@carelink-demo.test', 10
) v ON v.email = u.email;

-- Skills: every skill belonging to the roles each helper picked. Real ref_skills
-- ids, so the skills weight scores against actual job requirements.
INSERT INTO helper_skills (profile_id, skill_id, proficiency_level, years_experience)
SELECT hp.profile_id, rs.skill_id, 'Advanced', hp.experience_years
FROM helper_profiles hp
JOIN users u  ON u.user_id = hp.user_id
JOIN helper_jobs hj ON hj.profile_id = hp.profile_id
JOIN ref_skills rs  ON rs.job_id = hj.job_id
WHERE u.email LIKE '%@carelink-demo.test'
GROUP BY hp.profile_id, rs.skill_id, hp.experience_years;

-- Languages: whatever the reference table actually holds, capped at three.
INSERT INTO helper_languages (profile_id, language_id)
SELECT hp.profile_id, rl.language_id
FROM helper_profiles hp
JOIN users u ON u.user_id = hp.user_id
JOIN (SELECT language_id FROM ref_languages ORDER BY language_id LIMIT 3) rl
WHERE u.email LIKE '%@carelink-demo.test';

-- Verified documents, so these helpers look genuinely PESO-cleared to an
-- employer. file_path is a placeholder — nothing renders it in browse.
INSERT INTO user_documents (user_id, document_type, file_path, status, uploaded_at, verified_at)
SELECT u.user_id, d.doc_type, CONCAT('demo-', u.user_id, '-', d.slug, '.jpg'), 'Verified', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 18 DAY
FROM users u
JOIN (
  SELECT 'Valid ID' AS doc_type, 'id' AS slug UNION ALL
  SELECT 'Barangay Clearance', 'brgy'
) d
WHERE u.email LIKE '%@carelink-demo.test' AND u.user_type = 'helper';


-- ── 6. Check your work ───────────────────────────────────────────────────────
-- Expect: 6 employers, 6 households, 15 Open job posts, 8 verified helpers,
-- and every helper holding roles + skills.
SELECT
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@carelink-demo.test' AND user_type = 'parent') AS demo_employers,
  (SELECT COUNT(*) FROM parent_household ph
     JOIN parent_profiles pp ON pp.profile_id = ph.profile_id
     JOIN users u ON u.user_id = pp.user_id
    WHERE u.email LIKE '%@carelink-demo.test')                                                  AS demo_households,
  (SELECT COUNT(*) FROM job_posts jp
     JOIN users u ON u.user_id = jp.parent_id
    WHERE u.email LIKE '%@carelink-demo.test' AND jp.status = 'Open')                           AS open_demo_jobs,
  (SELECT COUNT(*) FROM helper_profiles hp
     JOIN users u ON u.user_id = hp.user_id
    WHERE u.email LIKE '%@carelink-demo.test' AND hp.verification_status = 'Verified')          AS verified_helpers,
  (SELECT COUNT(*) FROM helper_jobs hj
     JOIN helper_profiles hp ON hp.profile_id = hj.profile_id
     JOIN users u ON u.user_id = hp.user_id
    WHERE u.email LIKE '%@carelink-demo.test')                                                  AS helper_role_rows,
  (SELECT COUNT(*) FROM helper_skills hs
     JOIN helper_profiles hp ON hp.profile_id = hs.profile_id
     JOIN users u ON u.user_id = hp.user_id
    WHERE u.email LIKE '%@carelink-demo.test')                                                  AS helper_skill_rows;
