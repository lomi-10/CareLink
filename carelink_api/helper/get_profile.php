<?php
// carelink_api/helper/get_profile.php
// Retrieves the profile information for the helper, including their profile image and document status summary

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    
    $response = array(
        "success" => $success,
        "message" => $message
    );
    
    if ($data !== null) {
        foreach ($data as $key => $value) {
            $response[$key] = $value;
        }
    }
    
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
        throw new Exception("User ID is required");
    }
    
    $user_id = intval($_GET['user_id']);
    error_log("=== GET HELPER PROFILE === User ID: $user_id");

    // ========================================================================
    // QUERY 1: User basic info
    // ========================================================================
    
    $userSql = "SELECT 
                    user_id,
                    email,
                    username,
                    first_name,
                    middle_name,
                    last_name,
                    user_type,
                    status,
                    profile_completed 
                FROM users 
                WHERE user_id = ? AND user_type = 'helper'";
    
    $userStmt = $conn->prepare($userSql);
    $userStmt->bind_param("i", $user_id);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    if ($userResult->num_rows === 0) {
        throw new Exception("User not found or not a helper");
    }
    
    $user = $userResult->fetch_assoc();
    $userStmt->close();

    // ========================================================================
    // QUERY 2: Helper profile
    // ========================================================================
    
    $profileSql = "SELECT 
                    profile_id,
                    contact_number,
                    profile_image,
                    birth_date,
                    gender,
                    civil_status,
                    religion,
                    province,
                    municipality,
                    barangay,
                    address,
                    landmark,
                    bio,
                    education_level,
                    experience_years,
                    employment_type,
                    work_schedule,
                    expected_salary,
                    salary_period,
                    availability_status,
                    verification_status,
                    rating_average,
                    rating_count,
                    created_at,
                    updated_at
                FROM helper_profiles
                WHERE user_id = ?";
    
    $profileStmt = $conn->prepare($profileSql);
    $profileStmt->bind_param("i", $user_id);
    $profileStmt->execute();
    $profileResult = $profileStmt->get_result();
    
    $profile = null;
    $profile_id = null;
    
    if ($profileResult->num_rows > 0) {
        $profile = $profileResult->fetch_assoc();
        $profile_id = intval($profile['profile_id']);
        
        // Convert data types
        $profile['profile_id'] = $profile_id;
        $profile['experience_years'] = intval($profile['experience_years']);
        $profile['expected_salary'] = floatval($profile['expected_salary']);
        $profile['rating_average'] = floatval($profile['rating_average']);
        $profile['rating_count'] = intval($profile['rating_count']);
    }
    
    $profileStmt->close();

    // ========================================================================
    // QUERY 3: Available categories (PESO's 6 nature of work)
    // ========================================================================
    
    $categoriesSql = "SELECT 
                        category_id,
                        category_name,
                        icon,
                        description
                    FROM ref_categories
                    ORDER BY category_id";
    
    $categoriesResult = $conn->query($categoriesSql);
    $available_categories = array();
    
    while ($row = $categoriesResult->fetch_assoc()) {
        $row['category_id'] = intval($row['category_id']);
        $available_categories[] = $row;
    }

    // ========================================================================
    // QUERY 4: Available jobs (for selection)
    // ========================================================================
    
    $jobsSql = "SELECT 
                    j.job_id,
                    j.category_id,
                    j.job_title,
                    j.description,
                    c.category_name
                FROM ref_jobs j
                INNER JOIN ref_categories c ON j.category_id = c.category_id
                ORDER BY c.category_id, j.job_id";
    
    $jobsResult = $conn->query($jobsSql);
    $available_jobs = array();
    
    while ($row = $jobsResult->fetch_assoc()) {
        $row['job_id'] = intval($row['job_id']);
        $row['category_id'] = intval($row['category_id']);
        $available_jobs[] = $row;
    }

    // ========================================================================
    // QUERY 5: Helper's selected jobs
    // ========================================================================
    
    $selected_jobs = array();
    
    if ($profile_id !== null) {
        $helperJobsSql = "SELECT job_id FROM helper_jobs WHERE profile_id = ?";
        $helperJobsStmt = $conn->prepare($helperJobsSql);
        $helperJobsStmt->bind_param("i", $profile_id);
        $helperJobsStmt->execute();
        $helperJobsResult = $helperJobsStmt->get_result();
        
        while ($row = $helperJobsResult->fetch_assoc()) {
            $selected_jobs[] = intval($row['job_id']);
        }
        
        $helperJobsStmt->close();
    }

    // ========================================================================
    // QUERY 6: Available skills (for selection)
    // ========================================================================
    
    $skillsSql = "SELECT 
                    s.skill_id,
                    s.job_id,
                    j.category_id,
                    s.skill_name,
                    s.description,
                    j.job_title,
                    c.category_name
                FROM ref_skills s
                INNER JOIN ref_jobs j ON s.job_id = j.job_id
                INNER JOIN ref_categories c ON j.category_id = c.category_id
                ORDER BY c.category_id, j.job_id, s.skill_id";
    
    $skillsResult = $conn->query($skillsSql);
    $available_skills = array();
    
    while ($row = $skillsResult->fetch_assoc()) {
        $row['skill_id'] = intval($row['skill_id']);
        $row['job_id'] = intval($row['job_id']);
        $row['category_id'] = intval($row['category_id']);
        $available_skills[] = $row;
    }

    // ========================================================================
    // QUERY 7: Helper's selected skills
    // ========================================================================
    
    $selected_skills = array();
    
    if ($profile_id !== null) {
        $helperSkillsSql = "SELECT 
                                skill_id,
                                proficiency_level,
                                years_experience
                            FROM helper_skills 
                            WHERE profile_id = ?";
        
        $helperSkillsStmt = $conn->prepare($helperSkillsSql);
        $helperSkillsStmt->bind_param("i", $profile_id);
        $helperSkillsStmt->execute();
        $helperSkillsResult = $helperSkillsStmt->get_result();
        
        while ($row = $helperSkillsResult->fetch_assoc()) {
            $selected_skills[] = intval($row['skill_id']);
        }
        
        $helperSkillsStmt->close();
    }

    // ========================================================================
    // QUERY 8: Available languages (for selection)
    // ========================================================================
    
    $langsSql = "SELECT language_id, language_name FROM ref_languages ORDER BY language_id";
    $langsResult = $conn->query($langsSql);
    $available_languages = array();
    
    while ($row = $langsResult->fetch_assoc()) {
        $row['language_id'] = intval($row['language_id']);
        $available_languages[] = $row;
    }

    // ========================================================================
    // QUERY 9: Helper's selected languages
    // ========================================================================
    
    $selected_languages = array();
    
    if ($profile_id !== null) {
        $helperLangsSql = "SELECT language_id FROM helper_languages WHERE profile_id = ?";
        $helperLangsStmt = $conn->prepare($helperLangsSql);
        $helperLangsStmt->bind_param("i", $profile_id);
        $helperLangsStmt->execute();
        $helperLangsResult = $helperLangsStmt->get_result();
        
        while ($row = $helperLangsResult->fetch_assoc()) {
            $selected_languages[] = intval($row['language_id']);
        }
        
        $helperLangsStmt->close();
    }

    // ========================================================================
    // Calculate profile completeness
    // ========================================================================
    
    $completeness = 0;
    if ($profile !== null) {
        $total = 0;
        $completed = 0;
        
        // Required fields (50 points)
        $requiredFields = ['contact_number', 'birth_date', 'gender', 'province', 'municipality', 'barangay'];
        foreach ($requiredFields as $field) {
            $total += 8;
            if (!empty($profile[$field])) $completed += 8;
        }
        
        // Optional profile fields (20 points)
        $optionalFields = ['bio', 'education_level', 'religion', 'landmark'];
        foreach ($optionalFields as $field) {
            $total += 5;
            if (!empty($profile[$field])) $completed += 5;
        }
        
        // Profile image (10 points)
        $total += 10;
        if (!empty($profile['profile_image'])) $completed += 10;
        
        // Jobs (10 points)
        $total += 10;
        if (count($selected_jobs) > 0) $completed += 10;
        
        // Skills (10 points)
        $total += 10;
        if (count($selected_skills) > 0) $completed += 10;
        
        // Languages (10 points)
        $total += 10;
        if (count($selected_languages) > 0) $completed += 10;
        
        $completeness = $total > 0 ? round(($completed / $total) * 100) : 0;
    }

    // ========================================================================
    // QUERY 10: User's uploaded documents
    // ========================================================================
    
    $documentsSql = "SELECT 
                        document_id,
                        document_type,
                        file_path,
                        id_type,
                        status,
                        uploaded_at
                    FROM user_documents
                    WHERE user_id = ?
                    ORDER BY FIELD(document_type, 'Barangay Clearance', 'Valid ID', 'Police Clearance', 'TESDA NC2')";
    
    $documentsStmt = $conn->prepare($documentsSql);
    $documentsStmt->bind_param("i", $user_id);
    $documentsStmt->execute();
    $documentsResult = $documentsStmt->get_result();
    
    $documents = array();
    $base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/documents/";
    
    while ($row = $documentsResult->fetch_assoc()) {
        $row['document_id'] = intval($row['document_id']);
        $row['file_url'] = $base_url . $row['file_path'];
        $row['uploaded_at'] = $row['uploaded_at'] ? date('Y-m-d H:i:s', strtotime($row['uploaded_at'])) : null;
        $documents[] = $row;
    }
    $documentsStmt->close();
    
    error_log("Found " . count($documents) . " documents");

    // ========================================================================
    // Send response
    // ========================================================================
    
    error_log("✅ Profile retrieved successfully");
    
    sendResponse(true, "Profile retrieved successfully", array(
        'user' => $user,
        'profile' => $profile,
        'available_categories' => $available_categories,
        'available_jobs' => $available_jobs,
        'selected_jobs' => $selected_jobs,
        'available_skills' => $available_skills,
        'selected_skills' => $selected_skills,
        'available_languages' => $available_languages,
        'selected_languages' => $selected_languages,
        'documents' => $documents,
        'profile_completeness' => $completeness
    ));

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>