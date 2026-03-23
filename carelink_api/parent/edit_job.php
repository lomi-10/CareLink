<?php
// carelink_api/parent/edit_job.php
// FIXED: Converted to strictly use MySQLi instead of PDO

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Use your actual dbcon file here
require_once '../dbcon.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data) {
        throw new Exception('No data provided');
    }
    
    if (empty($data['job_post_id']) || empty($data['parent_id'])) {
        throw new Exception('Job Post ID and Parent ID are required');
    }
    
    // Convert Arrays to JSON Strings
    $category_ids = isset($data['category_ids']) && is_array($data['category_ids']) ? json_encode($data['category_ids']) : '[]';
    $job_ids = isset($data['job_ids']) && is_array($data['job_ids']) ? json_encode($data['job_ids']) : '[]';
    $skill_ids = isset($data['skill_ids']) && is_array($data['skill_ids']) ? json_encode($data['skill_ids']) : '[]';
    $days_off = isset($data['days_off']) && is_array($data['days_off']) ? json_encode($data['days_off']) : '[]';

    // Convert booleans to 1 or 0
    $provides_meals = !empty($data['provides_meals']) ? 1 : 0;
    $provides_accommodation = !empty($data['provides_accommodation']) ? 1 : 0;
    $provides_sss = !empty($data['provides_sss']) ? 1 : 0;
    $provides_philhealth = !empty($data['provides_philhealth']) ? 1 : 0;
    $provides_pagibig = !empty($data['provides_pagibig']) ? 1 : 0;
    $require_police_clearance = !empty($data['require_police_clearance']) ? 1 : 0;
    $prefer_tesda_nc2 = !empty($data['prefer_tesda_nc2']) ? 1 : 0;

    // Use ? for MySQLi prepared statements
    $sql = "UPDATE job_posts SET 
        category_ids = ?, job_ids = ?, skill_ids = ?, custom_category = ?, 
        custom_job_title = ?, custom_skill_title = ?, title = ?, description = ?, 
        employment_type = ?, work_schedule = ?, salary_offered = ?, salary_period = ?, 
        province = ?, municipality = ?, barangay = ?, min_age = ?, max_age = ?, 
        min_experience_years = ?, start_date = ?, work_hours = ?, days_off = ?, 
        contract_duration = ?, probation_period = ?, benefits = ?, provides_meals = ?, 
        provides_accommodation = ?, provides_sss = ?, provides_philhealth = ?, 
        provides_pagibig = ?, vacation_days = ?, sick_days = ?, preferred_religion = ?, 
        preferred_language_id = ?, require_police_clearance = ?, prefer_tesda_nc2 = ?, 
        updated_at = CURRENT_TIMESTAMP
        WHERE job_post_id = ? AND parent_id = ?";
        
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Query preparation failed: " . $conn->error);
    }
    
    // MySQLi bind_param requires a type string. 
    // s = string, i = integer
    // We have 37 parameters in total.
    $types = "sssssssssssssssiiissssssiiiiiiissiiss";
    
    $stmt->bind_param($types,
        $category_ids, 
        $job_ids, 
        $skill_ids, 
        $data['custom_category'], 
        $data['custom_job_title'],
        $data['custom_skill_title'], 
        $data['title'], 
        $data['description'], 
        $data['employment_type'],
        $data['work_schedule'], 
        $data['salary_offered'], 
        $data['salary_period'], 
        $data['province'],
        $data['municipality'], 
        $data['barangay'], 
        
        $data['min_age'], // i
        $data['max_age'], // i
        $data['min_experience_years'], // i
        
        $data['start_date'], 
        $data['work_hours'], 
        $days_off,
        $data['contract_duration'], 
        $data['probation_period'], 
        $data['benefits'],
        
        $provides_meals, // i
        $provides_accommodation, // i
        $provides_sss, // i
        $provides_philhealth, // i
        $provides_pagibig, // i
        $data['vacation_days'], // i
        $data['sick_days'], // i
        
        $data['preferred_religion'], 
        $data['preferred_language_id'], 
        
        $require_police_clearance, // i
        $prefer_tesda_nc2, // i
        
        $data['job_post_id'], 
        $data['parent_id']
    );

    $stmt->execute();
    
    // Check if any row was affected
    if ($stmt->affected_rows > 0 || $stmt->errno === 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Job updated successfully'
        ]);
    } else {
        throw new Exception('No changes made or job not found');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Update failed: ' . $e->getMessage()
    ]);
}
?>