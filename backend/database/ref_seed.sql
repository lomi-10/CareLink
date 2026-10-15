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
('1','1','Household cleaning','Cleaning and regular household chores'),
('2','1','Household organization','Keeping household schedules, supplies, and daily tasks organized'),
('3','2','Childcare','Primary care and supervision for children'),
('4','2','Babysitting','Short-term or part-time child supervision'),
('5','2','Baby care','Care for babies under one year old'),
('6','3','Family cooking','Preparing daily meals for the household'),
('7','3','Meal preparation','Preparing meals ahead of time'),
('8','4','Garden care','Plant care and garden maintenance'),
('9','4','Lawn and yard care','Maintaining the lawn and outdoor spaces'),
('10','5','Laundry','Washing and caring for clothes and linens'),
('11','5','Ironing','Ironing and folding clothes'),
('12','6','Care for an older adult','Helping an older adult with daily needs'),
('13','6','Family driver','Driving family members for errands and activities'),
('14','6','Errands','Handling outside tasks like bills and grocery shopping'),
('15','6','Pet care','Feeding, walking, and grooming pets'),
('16','1','All-around household help','A mix of household tasks such as cleaning, laundry, and meal preparation'),
('17','1','Home cleaning','Cleaning rooms, bathrooms, and common areas'),
('18','1','Live-in household helper','Household work while living in the employer home'),
('19','1','Live-out household helper','Household work while living outside the employer home'),
('20','1','Dishwashing and kitchen help','Washing dishes and helping keep the kitchen clean'),
('21','2','Toddler care','Care and supervision for toddlers'),
('22','2','Newborn care','Care for newborn babies'),
('23','2','After-school childcare','Care for children after school'),
('24','2','Childcare for a child with special needs','Daily care for a child with additional support needs'),
('25','3','Special meal preparation','Preparing meals for particular needs or preferences'),
('26','3','Baking','Baking bread, cakes, and other pastries'),
('27','3','Kitchen help','Helping with food preparation and kitchen cleaning'),
('28','3','Cooking special meals','Preparing meals for special diets'),
('29','3','Cooking and serving','Helping prepare and serve food'),
('30','4','Plant care','Caring for household and garden plants'),
('31','4','Lawn care','Mowing and maintaining the lawn'),
('32','4','Flower and plant care','Caring for flowers and decorative plants'),
('33','4','Vegetable garden care','Planting and caring for vegetables'),
('34','5','Laundry and ironing','Washing, drying, and ironing clothes'),
('35','5','Dry cleaning','Handling clothes that need dry cleaning'),
('36','5','Washing and folding clothes','Washing, drying, and folding clothes'),
('37','6','Personal assistance','Helping with everyday personal tasks'),
('38','6','Care for a person with disability','Helping a person with disability with daily needs'),
('39','6','Pool cleaning','Cleaning and caring for a household pool'),
('40','6','Massage','Providing massage at home'),
('41','6','Grocery shopping','Buying groceries for the household'),
('42','6','House sitting','Looking after a home while the family is away'),
('43','6','Home security','Watching over the home and reporting concerns');

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
