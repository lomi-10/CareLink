-- =============================================================================
-- CareLink — DEMO SEED for user testing
--
-- Creates 6 PESO-verified employer households in Ormoc City and 15 approved,
-- Open job posts spanning every category, so a brand-new tester who fills in
-- their skills immediately sees real recommendations with real match scores —
-- computed by the actual algorithm, not faked.
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
-- Demo login (all 6 employers): password  CareLinkDemo2026!
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


-- ── 5. Check your work ───────────────────────────────────────────────────────
-- Expect: 6 employers, 6 households, 15 Open job posts.
SELECT
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@carelink-demo.test')                       AS demo_employers,
  (SELECT COUNT(*) FROM parent_household ph
     JOIN parent_profiles pp ON pp.profile_id = ph.profile_id
     JOIN users u ON u.user_id = pp.user_id
    WHERE u.email LIKE '%@carelink-demo.test')                                               AS demo_households,
  (SELECT COUNT(*) FROM job_posts jp
     JOIN users u ON u.user_id = jp.parent_id
    WHERE u.email LIKE '%@carelink-demo.test' AND jp.status = 'Open')                        AS open_demo_jobs;
