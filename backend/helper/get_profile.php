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
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

include_once '../dbcon.php';
include_once __DIR__ . '/../shared/ownership_guard.php';
include_once __DIR__ . '/../shared/file_security.php';

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
    $requester_id = isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0;
    carelink_require_self($requester_id, $user_id, 'You are not allowed to view this profile.');
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
                    verification_status,
                    rating_average,
                    rating_count,
                    custom_jobs,
                    custom_skills,
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
        // Decode free-text custom roles/skills (stored as JSON text) into arrays.
        $profile['custom_jobs']   = $profile['custom_jobs']   ? (json_decode($profile['custom_jobs'], true)   ?: array()) : array();
        $profile['custom_skills'] = $profile['custom_skills'] ? (json_decode($profile['custom_skills'], true) ?: array()) : array();
        
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
    // QUERY 10: User's uploaded documents
    // ========================================================================

    $documentsSql = "SELECT
                        ud.document_id,
                        ud.document_type,
                        ud.file_path,
                        ud.file_path_back,
                        ud.id_type,
                        ud.status,
                        ud.expiry_date,
                        ud.rejection_reason,
                        ud.verified_by,
                        ud.verified_at,
                        ud.ai_verification_status,
                        ud.ai_confidence_score,
                        ud.ai_extracted_data,
                        ud.ai_checked_at,
                        ud.uploaded_at,
                        CONCAT(v.first_name, ' ', IFNULL(v.last_name, '')) AS verified_by_name
                    FROM user_documents ud
                    LEFT JOIN users v ON v.user_id = ud.verified_by
                    WHERE ud.user_id = ?
                    ORDER BY FIELD(ud.document_type, 'Barangay Clearance', 'Valid ID', 'Police Clearance', 'TESDA NC2')";

    $documentsStmt = $conn->prepare($documentsSql);
    $documentsStmt->bind_param("i", $user_id);
    $documentsStmt->execute();
    $documentsResult = $documentsStmt->get_result();

    $documents = array();

    while ($row = $documentsResult->fetch_assoc()) {
        $row['document_id'] = intval($row['document_id']);
        $row['file_url'] = $row['file_path'] ? carelink_signed_document_url($row['document_id']) : null;
        $row['file_url_back'] = !empty($row['file_path_back']) ? carelink_signed_document_url($row['document_id'], 'back') : null;
        $row['uploaded_at'] = $row['uploaded_at'] ? date('Y-m-d H:i:s', strtotime($row['uploaded_at'])) : null;
        $row['expiry_date'] = $row['expiry_date'] ? date('Y-m-d', strtotime($row['expiry_date'])) : null;
        $row['verified_at'] = $row['verified_at'] ? date('Y-m-d H:i:s', strtotime($row['verified_at'])) : null;
        $row['verified_by'] = trim((string)$row['verified_by_name']) !== '' ? trim($row['verified_by_name']) : null;
        $row['ai_extracted_data'] = $row['ai_extracted_data'] ? json_decode($row['ai_extracted_data'], true) : null;
        $row['ai_checked_at'] = $row['ai_checked_at'] ? date('Y-m-d H:i:s', strtotime($row['ai_checked_at'])) : null;
        unset($row['verified_by_name']);
        $documents[] = $row;
    }
    $documentsStmt->close();

    error_log("Found " . count($documents) . " documents");

    // ========================================================================
    // QUERY 10: Work history (past employers / references)
    // ========================================================================
    $work_history = array();
    if ($profile_id !== null) {
        $whSql = "SELECT history_id, employer_name, employer_contact, position,
                         start_date, end_date, duties, reason_for_leaving, can_contact
                  FROM helper_work_history
                  WHERE profile_id = ?
                  ORDER BY (end_date IS NULL) DESC, start_date DESC";
        $whStmt = $conn->prepare($whSql);
        $whStmt->bind_param("i", $profile_id);
        $whStmt->execute();
        $whResult = $whStmt->get_result();
        while ($row = $whResult->fetch_assoc()) {
            $row['can_contact'] = (int)$row['can_contact'] === 1;
            $work_history[] = $row;
        }
        $whStmt->close();
    }

    // ========================================================================
    // Calculate profile completeness
    // ========================================================================

    // Weighted out of 100. The ESSENTIALS a helper needs to be PESO-verifiable
    // (identity, address, work, documents, photo) sum to 90; optional polish
    // fields make up the final 10. So a properly set-up profile reads 90% — the
    // threshold we ask helpers to reach before verification — and 100% when fully
    // fleshed out.
    $completeness = 0;
    if ($profile !== null) {
        $completed = 0;

        // Personal identity + address (36)
        $core = ['contact_number' => 7, 'birth_date' => 7, 'gender' => 6, 'province' => 5, 'municipality' => 5, 'barangay' => 6];
        foreach ($core as $f => $w) if (!empty($profile[$f])) $completed += $w;

        // Profile photo (8)
        if (!empty($profile['profile_image'])) $completed += 8;

        // Work & skills (18)
        if (count($selected_jobs) > 0)      $completed += 8;
        if (count($selected_skills) > 0)    $completed += 6;
        if (count($selected_languages) > 0) $completed += 4;

        // Required documents (28)
        $uploadedDocTypes = array_column($documents, 'document_type');
        if (in_array('Valid ID', $uploadedDocTypes, true))           $completed += 14;
        if (in_array('Barangay Clearance', $uploadedDocTypes, true)) $completed += 14;

        // Optional polish — the final 10
        $optional = ['bio' => 4, 'education_level' => 3, 'religion' => 2, 'landmark' => 1];
        foreach ($optional as $f => $w) if (!empty($profile[$f])) $completed += $w;

        $completeness = min(100, $completed);
    }

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
        'work_history' => $work_history,
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