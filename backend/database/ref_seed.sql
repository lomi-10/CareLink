-- CareLink reference data seed (categories, jobs, skills, languages)
-- Safe to import into an empty/deployed DB and re-run. No personal data.
SET FOREIGN_KEY_CHECKS=0;

-- ref_categories
DELETE FROM `ref_categories`;
INSERT INTO `ref_categories` (`category_id`,`category_name`,`icon`,`description`) VALUES
('1','General Househelp','home','General household chores and maintenance'),
('2','Yaya','child','Childcare and child supervision'),
('3','Cook','restaurant','Food preparation and kitchen management'),
('4','Gardening','leaf','Garden and outdoor maintenance'),
('5','Laundry Person','shirt','Laundry, ironing, and clothing care'),
('6','Others','ellipsis','Other domestic services not listed above');

-- ref_jobs
DELETE FROM `ref_jobs`;
INSERT INTO `ref_jobs` (`job_id`,`category_id`,`job_title`,`description`) VALUES
('1','1','Housekeeper','General cleaning and home maintenance'),
('2','1','Household Manager','Managing the overall household operations'),
('3','2','Yaya / Nanny','Primary childcare provider'),
('4','2','Babysitter','Occasional or part-time child supervision'),
('5','2','Infant Care Specialist','Specialized care for newborns 0-12 months'),
('6','3','Family Cook','Preparing daily meals for the household'),
('7','3','Meal Prep Cook','Batch cooking and meal planning'),
('8','4','Gardener','Plant care and garden maintenance'),
('9','4','Landscape Aide','Maintaining lawn and outdoor spaces'),
('10','5','Laundry Person','Washing and caring for clothes and linens'),
('11','5','Ironing Specialist','Pressing and folding garments'),
('12','6','Elderly Caregiver','Assisting senior citizens with daily needs'),
('13','6','Family Driver','Driving family members for errands and activities'),
('14','6','Errand Runner','Handling outside tasks like bills, grocery, etc.'),
('15','6','Pet Care Aide','Feeding, walking, and grooming pets'),
('16','1','All-Around Househelp',NULL),
('17','1','House Cleaner',NULL),
('18','1','Live-in Kasambahay',NULL),
('19','1','Live-out Kasambahay',NULL),
('20','1','Dishwasher / Kitchen Helper',NULL),
('21','2','Toddler Caregiver',NULL),
('22','2','Newborn Care Specialist',NULL),
('23','2','After-School Nanny',NULL),
('24','2','Special-Needs Child Caregiver',NULL),
('25','3','Personal Chef',NULL),
('26','3','Baker / Pastry Cook',NULL),
('27','3','Kitchen Assistant',NULL),
('28','3','Special Diet Cook',NULL),
('29','3','Catering Helper',NULL),
('30','4','Plant Caretaker',NULL),
('31','4','Lawn Maintenance Aide',NULL),
('32','4','Ornamental Plant Specialist',NULL),
('33','4','Vegetable Garden Tender',NULL),
('34','5','Laundry & Ironing Helper',NULL),
('35','5','Dry Cleaning Aide',NULL),
('36','5','Wash-and-Fold Attendant',NULL),
('37','6','Personal Assistant',NULL),
('38','6','Caregiver for PWD',NULL),
('39','6','Pool Maintenance Aide',NULL),
('40','6','Massage Therapist',NULL),
('41','6','Grocery Shopper',NULL),
('42','6','House Sitter',NULL),
('43','6','Security / Watchman',NULL);

-- ref_skills
DELETE FROM `ref_skills`;
INSERT INTO `ref_skills` (`skill_id`,`job_id`,`skill_name`,`description`) VALUES
('1','1','Sweeping & Mopping','Regular floor cleaning'),
('2','1','Deep Cleaning','Thorough cleaning of rooms and bathrooms'),
('3','1','Organizing & Tidying','Keeping the home neat and orderly'),
('4','1','Marketing / Grocery','Buying supplies within a given budget'),
('5','3','Toddler Care (1-5 yrs)','Supervision and activities for young children'),
('6','3','School-Age Child Care','After-school care for children 6-12'),
('7','3','Child with Special Needs','Care for children with autism, ADHD, or disability'),
('8','3','Homework Assistance','Helping children with school assignments'),
('9','5','Newborn Care (0-12 mos)','Bathing, feeding, and soothing newborns'),
('10','5','Breastfeeding Support','Assisting nursing mothers'),
('11','6','Filipino Cuisine','Preparing traditional Filipino dishes'),
('12','6','Special Diet Cooking','Diabetic, low-sodium, or allergen-free meals'),
('13','6','Baking','Baking breads, cakes, and pastries'),
('14','8','Plant Watering & Pruning','Basic plant maintenance'),
('15','8','Vegetable Garden','Growing and maintaining vegetable plots'),
('16','10','Hand Washing','Manual laundry washing'),
('17','10','Machine Operation','Using washing machines and dryers'),
('18','10','Ironing & Folding','Pressing and proper folding of clothes'),
('19','12','Medication Reminders','Tracking and reminding patients to take medicine'),
('20','12','Bedridden Patient Care','Turning, sponge baths, and hygiene for bed patients'),
('21','12','Dementia / Alzheimer Care','Patience-based care and safety supervision');

-- ref_languages
DELETE FROM `ref_languages`;
INSERT INTO `ref_languages` (`language_id`,`language_name`) VALUES
('1','Tagalog'),
('2','Cebuano'),
('3','English'),
('4','Ilocano'),
('5','Hiligaynon / Ilonggo'),
('6','Waray'),
('7','Kapampangan'),
('8','Bicolano'),
('9','Pangasinan'),
('10','Other');

SET FOREIGN_KEY_CHECKS=1;
