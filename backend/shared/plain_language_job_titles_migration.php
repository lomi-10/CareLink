<?php
if (!function_exists('ensure_plain_language_job_titles')) {
    function ensure_plain_language_job_titles(mysqli $conn): void
    {
        $tableResult = $conn->query("SHOW TABLES LIKE 'ref_jobs'");
        if (!$tableResult || $tableResult->num_rows === 0) {
            throw new RuntimeException('Cannot simplify job role labels: ref_jobs table is missing.');
        }
        $tableResult->free();

        $changes = [
            1 => ['Housekeeper', 'Household cleaning', 'Cleaning and regular household chores'],
            2 => ['Household Manager', 'Household organization', 'Keeping household schedules, supplies, and daily tasks organized'],
            3 => ['Yaya / Nanny', 'Childcare', 'Primary care and supervision for children'],
            4 => ['Babysitter', 'Babysitting', 'Short-term or part-time child supervision'],
            5 => ['Infant Care Specialist', 'Baby care', 'Care for babies under one year old'],
            6 => ['Family Cook', 'Family cooking', 'Preparing daily meals for the household'],
            7 => ['Meal Prep Cook', 'Meal preparation', 'Preparing meals ahead of time'],
            8 => ['Gardener', 'Garden care', 'Plant care and garden maintenance'],
            9 => ['Landscape Aide', 'Lawn and yard care', 'Maintaining the lawn and outdoor spaces'],
            10 => ['Laundry Person', 'Laundry', 'Washing and caring for clothes and linens'],
            11 => ['Ironing Specialist', 'Ironing', 'Ironing and folding clothes'],
            12 => ['Elderly Caregiver', 'Care for an older adult', 'Helping an older adult with daily needs'],
            13 => ['Family Driver', 'Family driver', 'Driving family members for errands and activities'],
            14 => ['Errand Runner', 'Errands', 'Handling outside tasks like bills and grocery shopping'],
            15 => ['Pet Care Aide', 'Pet care', 'Feeding, walking, and grooming pets'],
            16 => ['All-Around Househelp', 'All-around household help', 'A mix of household tasks such as cleaning, laundry, and meal preparation'],
            17 => ['House Cleaner', 'Home cleaning', 'Cleaning rooms, bathrooms, and common areas'],
            18 => ['Live-in Kasambahay', 'Live-in household helper', 'Household work while living in the employer home'],
            19 => ['Live-out Kasambahay', 'Live-out household helper', 'Household work while living outside the employer home'],
            20 => ['Dishwasher / Kitchen Helper', 'Dishwashing and kitchen help', 'Washing dishes and helping keep the kitchen clean'],
            21 => ['Toddler Caregiver', 'Toddler care', 'Care and supervision for toddlers'],
            22 => ['Newborn Care Specialist', 'Newborn care', 'Care for newborn babies'],
            23 => ['After-School Nanny', 'After-school childcare', 'Care for children after school'],
            24 => ['Special-Needs Child Caregiver', 'Childcare for a child with special needs', 'Daily care for a child with additional support needs'],
            25 => ['Personal Chef', 'Special meal preparation', 'Preparing meals for particular needs or preferences'],
            26 => ['Baker / Pastry Cook', 'Baking', 'Baking bread, cakes, and other pastries'],
            27 => ['Kitchen Assistant', 'Kitchen help', 'Helping with food preparation and kitchen cleaning'],
            28 => ['Special Diet Cook', 'Cooking special meals', 'Preparing meals for special diets'],
            29 => ['Catering Helper', 'Cooking and serving', 'Helping prepare and serve food'],
            30 => ['Plant Caretaker', 'Plant care', 'Caring for household and garden plants'],
            31 => ['Lawn Maintenance Aide', 'Lawn care', 'Mowing and maintaining the lawn'],
            32 => ['Ornamental Plant Specialist', 'Flower and plant care', 'Caring for flowers and decorative plants'],
            33 => ['Vegetable Garden Tender', 'Vegetable garden care', 'Planting and caring for vegetables'],
            34 => ['Laundry & Ironing Helper', 'Laundry and ironing', 'Washing, drying, and ironing clothes'],
            35 => ['Dry Cleaning Aide', 'Dry cleaning', 'Handling clothes that need dry cleaning'],
            36 => ['Wash-and-Fold Attendant', 'Washing and folding clothes', 'Washing, drying, and folding clothes'],
            37 => ['Personal Assistant', 'Personal assistance', 'Helping with everyday personal tasks'],
            38 => ['Caregiver for PWD', 'Care for a person with disability', 'Helping a person with disability with daily needs'],
            39 => ['Pool Maintenance Aide', 'Pool cleaning', 'Cleaning and caring for a household pool'],
            40 => ['Massage Therapist', 'Massage', 'Providing massage at home'],
            41 => ['Grocery Shopper', 'Grocery shopping', 'Buying groceries for the household'],
            42 => ['House Sitter', 'House sitting', 'Looking after a home while the family is away'],
            43 => ['Security / Watchman', 'Home security', 'Watching over the home and reporting concerns'],
        ];

        $stmt = $conn->prepare(
            'UPDATE ref_jobs SET job_title = ?, description = ? WHERE job_id = ? AND job_title = ?'
        );
        if (!$stmt) {
            throw new RuntimeException('Could not prepare job title updates: ' . $conn->error);
        }

        foreach ($changes as $jobId => [$oldTitle, $title, $description]) {
            $stmt->bind_param('ssis', $title, $description, $jobId, $oldTitle);
            if (!$stmt->execute()) {
                $error = $stmt->error;
                $stmt->close();
                throw new RuntimeException("Could not update job role $jobId: $error");
            }
        }
        $stmt->close();
    }
}
?>
