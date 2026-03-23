<?php
// carelink_api/helper/update_profile.php
// Updates a helper's profile information, including personal details, work preferences, and profile image

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Invalid request method. POST required.");
    }

    if (!isset($_POST['user_id']) || empty($_POST['user_id'])) {
        throw new Exception("User ID is required");
    }

    $user_id = intval($_POST['user_id']);
    error_log("=== UPDATE HELPER PROFILE === User ID: $user_id");

    // ========================================================================
    // COLLECT DATA - USERS TABLE (name, username)
    // ========================================================================
    
    $first_name = isset($_POST['first_name']) ? trim($_POST['first_name']) : '';
    $middle_name = isset($_POST['middle_name']) ? trim($_POST['middle_name']) : '';
    $last_name = isset($_POST['last_name']) ? trim($_POST['last_name']) : '';
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';

    // ========================================================================
    // COLLECT DATA - HELPER_PROFILES TABLE
    // ========================================================================
    
    // Required fields
    $contact_number = isset($_POST['contact_number']) ? trim($_POST['contact_number']) : '';
    $birth_date = isset($_POST['birth_date']) ? trim($_POST['birth_date']) : '';
    $gender = isset($_POST['gender']) ? $_POST['gender'] : 'Female';
    $province = isset($_POST['province']) ? trim($_POST['province']) : '';
    $municipality = isset($_POST['municipality']) ? trim($_POST['municipality']) : '';
    $barangay = isset($_POST['barangay']) ? trim($_POST['barangay']) : '';
    $address = isset($_POST['address']) ? trim($_POST['address']) : '';
    
    // Optional fields
    $civil_status = isset($_POST['civil_status']) ? $_POST['civil_status'] : 'Single';
    $religion = isset($_POST['religion']) ? trim($_POST['religion']) : NULL;
    $landmark = isset($_POST['landmark']) ? trim($_POST['landmark']) : NULL;
    $bio = isset($_POST['bio']) ? trim($_POST['bio']) : NULL;
    $education_level = isset($_POST['education_level']) ? $_POST['education_level'] : NULL;
    $experience_years = isset($_POST['experience_years']) ? intval($_POST['experience_years']) : 0;
    
    // Work preferences (SEPARATE COLUMNS!)
    $employment_type = isset($_POST['employment_type']) ? $_POST['employment_type'] : 'Any';
    $work_schedule = isset($_POST['work_schedule']) ? $_POST['work_schedule'] : 'Full-time';
    $expected_salary = isset($_POST['expected_salary']) ? floatval($_POST['expected_salary']) : 6000.00;
    $salary_period = isset($_POST['salary_period']) ? $_POST['salary_period'] : 'Monthly';
    $availability_status = isset($_POST['availability_status']) ? $_POST['availability_status'] : 'Available';
    
    // Validate required fields
    if (empty($first_name) || empty($last_name)) {
        throw new Exception("First name and last name are required");
    }
    
    if (empty($contact_number)) {
        throw new Exception("Contact number is required");
    }
    
    if (empty($birth_date)) {
        throw new Exception("Birth date is required");
    }
    
    if (empty($province) || empty($municipality) || empty($barangay)) {
        throw new Exception("Complete address (province, municipality, barangay) is required");
    }
    
    if ($expected_salary < 6000) {
        throw new Exception("Salary must be at least ₱6,000 (PESO minimum wage)");
    }
    
    error_log("Data validated successfully");

    // ========================================================================
    // COLLECT JUNCTION TABLE DATA (JSON arrays from frontend)
    // ========================================================================
    
    $skill_ids = array();
    if (isset($_POST['skill_ids']) && !empty($_POST['skill_ids'])) {
        $skill_ids = json_decode($_POST['skill_ids'], true);
        if (!is_array($skill_ids)) $skill_ids = array();
    }
    
    $language_ids = array();
    if (isset($_POST['language_ids']) && !empty($_POST['language_ids'])) {
        $language_ids = json_decode($_POST['language_ids'], true);
        if (!is_array($language_ids)) $language_ids = array();
    }
    
    $job_ids = array();
    if (isset($_POST['job_ids']) && !empty($_POST['job_ids'])) {
        $job_ids = json_decode($_POST['job_ids'], true);
        if (!is_array($job_ids)) $job_ids = array();
    }
    
    error_log("Skills: " . count($skill_ids) . ", Languages: " . count($language_ids) . ", Jobs: " . count($job_ids));

    // ========================================================================
    // HANDLE PROFILE IMAGE UPLOAD (BULLETPROOF FOR WEB & MOBILE)
    // ========================================================================
    
    $profile_image_url = null;
    
    if (isset($_FILES['profile_image'])) {
        if ($_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = dirname(__DIR__) . "/uploads/profiles/";
            
            // 1. Use 0777 to forcefully bypass any local permission errors
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // 2. Mobile RN sometimes sends weird MIME types. Check EXTENSION instead of TYPE.
            $fileName = $_FILES['profile_image']['name'];
            $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

            // default to jpg
            if (empty($fileExt)) {
                $fileExt = 'jpg';
            }
            
            $allowedExts = array('jpeg', 'jpg', 'png', 'gif');
            
            if (in_array($fileExt, $allowedExts)) {
                $newFileName = "helper_" . $user_id . "_" . time() . "." . $fileExt;
                $targetFilePath = $uploadDir . $newFileName;

                if (move_uploaded_file($_FILES['profile_image']['tmp_name'], $targetFilePath)) {
                    $profile_image_url = "http://" . $_SERVER['SERVER_NAME'] . "/carelink_api/uploads/profiles/" . $newFileName;
                    error_log("✅ Image uploaded: $profile_image_url");
                } else {
                    error_log("❌ Move failed. Check folder permissions for: $uploadDir");
                }
            } else {
                error_log("❌ Invalid file extension: $fileExt");
            }
        } else {
            // 3. This will instantly tell your error.log if php.ini limits are blocking the mobile upload
            error_log("❌ Upload failed with error code: " . $_FILES['profile_image']['error']);
        }
    }

    // ========================================================================
    // START TRANSACTION (Critical for data integrity!)
    // ========================================================================
    
    $conn->begin_transaction();

    try {
        // ====================================================================
        // STEP 1: Check if profile exists
        // ====================================================================
        
        $checkSql = "SELECT profile_id FROM helper_profiles WHERE user_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("i", $user_id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        $profile_id = null;
        $profileExists = false;
        
        if ($checkResult->num_rows > 0) {
            $row = $checkResult->fetch_assoc();
            $profile_id = intval($row['profile_id']);
            $profileExists = true;
        }
        $checkStmt->close();

        // ====================================================================
        // STEP 2: Update users table (name, username)
        // ====================================================================
        
        $updateUserSql = "UPDATE users SET 
                            first_name = ?,
                            middle_name = ?,
                            last_name = ?,
                            username = ?,
                            updated_at = NOW()
                          WHERE user_id = ?";
        
        $updateUserStmt = $conn->prepare($updateUserSql);
        if (!$updateUserStmt) {
            throw new Exception("Failed to prepare user update: " . $conn->error);
        }
        
        $updateUserStmt->bind_param("ssssi", $first_name, $middle_name, $last_name, $username, $user_id);
        
        if (!$updateUserStmt->execute()) {
            throw new Exception("Failed to update user info: " . $updateUserStmt->error);
        }
        $updateUserStmt->close();
        
        error_log("✅ User info updated");

        // ====================================================================
        // STEP 3: Create or Update profile
        // ====================================================================
        
        if ($profileExists) {
            // UPDATE existing profile
            $updateFields = array(
                "contact_number = ?",
                "birth_date = ?",
                "gender = ?",
                "civil_status = ?",
                "religion = ?",
                "province = ?",
                "municipality = ?",
                "barangay = ?",
                "address = ?",
                "landmark = ?",
                "bio = ?",
                "education_level = ?",
                "experience_years = ?",
                "employment_type = ?",
                "work_schedule = ?",
                "expected_salary = ?",
                "salary_period = ?",
                "availability_status = ?",
                "updated_at = NOW()"
            );
            
            // Build params array
            $types = "ssssssssssssissdss";
            $params = array(
                $contact_number,      // s
                $birth_date,          // s
                $gender,              // s
                $civil_status,        // s
                $religion,            // s
                $province,            // s
                $municipality,        // s
                $barangay,            // s
                $address,             // s
                $landmark,            // s
                $bio,                 // s
                $education_level,     // s
                $experience_years,    // i
                $employment_type,     // s
                $work_schedule,       // s
                $expected_salary,     // d (decimal)
                $salary_period,       // s
                $availability_status  // s
            );
            
            // Add profile_image if uploaded
            if ($profile_image_url !== null) {
                $updateFields[] = "profile_image = ?";
                $types .= "s";
                $params[] = $profile_image_url;
            }
            
            // Add profile_id for WHERE clause
            $types .= "i";
            $params[] = $profile_id;
            
            $updateSql = "UPDATE helper_profiles SET " . implode(", ", $updateFields) . " WHERE profile_id = ?";
            
            $updateStmt = $conn->prepare($updateSql);
            if (!$updateStmt) {
                throw new Exception("Failed to prepare update: " . $conn->error);
            }
            
            // Bind parameters dynamically
            $bindRefs = array($types);
            for ($i = 0; $i < count($params); $i++) {
                $bindRefs[] = &$params[$i];
            }
            call_user_func_array(array($updateStmt, 'bind_param'), $bindRefs);
            
            if (!$updateStmt->execute()) {
                throw new Exception("Failed to update profile: " . $updateStmt->error);
            }
            $updateStmt->close();
            
            error_log("✅ Profile updated: ID $profile_id");
            
        } else {
            // CREATE new profile
            $insertSql = "INSERT INTO helper_profiles (
                user_id, contact_number, birth_date, gender, civil_status, religion,
                province, municipality, barangay, address, landmark, bio,
                education_level, experience_years, employment_type, work_schedule,
                expected_salary, salary_period, availability_status, profile_image, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            
            $insertStmt = $conn->prepare($insertSql);
            if (!$insertStmt) {
                throw new Exception("Failed to prepare insert: " . $conn->error);
            }
            
            $insertStmt->bind_param(
                "isssssssssssisssdss",
                $user_id, $contact_number, $birth_date, $gender, $civil_status, $religion,
                $province, $municipality, $barangay, $address, $landmark, $bio,
                $education_level, $experience_years, $employment_type, $work_schedule,
                $expected_salary, $salary_period, $availability_status, $profile_image_url
            );
            
            if (!$insertStmt->execute()) {
                throw new Exception("Failed to create profile: " . $insertStmt->error);
            }
            
            $profile_id = $conn->insert_id;
            $insertStmt->close();
            
            error_log("✅ Profile created: ID $profile_id");
        }

        // ====================================================================
        // STEP 4: Update helper_skills (junction table)
        // ====================================================================
        
        // Delete existing skills
        $deleteSkillsSql = "DELETE FROM helper_skills WHERE profile_id = ?";
        $deleteSkillsStmt = $conn->prepare($deleteSkillsSql);
        $deleteSkillsStmt->bind_param("i", $profile_id);
        $deleteSkillsStmt->execute();
        $deleteSkillsStmt->close();
        
        // Insert new skills
        if (count($skill_ids) > 0) {
            $insertSkillSql = "INSERT INTO helper_skills (profile_id, skill_id, proficiency_level, years_experience) 
                              VALUES (?, ?, 'Intermediate', 0)";
            $insertSkillStmt = $conn->prepare($insertSkillSql);
            
            foreach ($skill_ids as $skill_id) {
                $skill_id = intval($skill_id);
                $insertSkillStmt->bind_param("ii", $profile_id, $skill_id);
                $insertSkillStmt->execute();
            }
            
            $insertSkillStmt->close();
            error_log("✅ Inserted " . count($skill_ids) . " skills");
        }

        // ====================================================================
        // STEP 5: Update helper_languages (junction table)
        // ====================================================================
        
        // Delete existing languages
        $deleteLangsSql = "DELETE FROM helper_languages WHERE profile_id = ?";
        $deleteLangsStmt = $conn->prepare($deleteLangsSql);
        $deleteLangsStmt->bind_param("i", $profile_id);
        $deleteLangsStmt->execute();
        $deleteLangsStmt->close();
        
        // Insert new languages
        if (count($language_ids) > 0) {
            $insertLangSql = "INSERT INTO helper_languages (profile_id, language_id) VALUES (?, ?)";
            $insertLangStmt = $conn->prepare($insertLangSql);
            
            foreach ($language_ids as $language_id) {
                $language_id = intval($language_id);
                $insertLangStmt->bind_param("ii", $profile_id, $language_id);
                $insertLangStmt->execute();
            }
            
            $insertLangStmt->close();
            error_log("✅ Inserted " . count($language_ids) . " languages");
        }

        // ====================================================================
        // STEP 6: Update helper_jobs (junction table)
        // ====================================================================
        
        // Delete existing jobs
        $deleteJobsSql = "DELETE FROM helper_jobs WHERE profile_id = ?";
        $deleteJobsStmt = $conn->prepare($deleteJobsSql);
        $deleteJobsStmt->bind_param("i", $profile_id);
        $deleteJobsStmt->execute();
        $deleteJobsStmt->close();
        
        // Insert new jobs
        if (count($job_ids) > 0) {
            $insertJobSql = "INSERT INTO helper_jobs (profile_id, job_id) VALUES (?, ?)";
            $insertJobStmt = $conn->prepare($insertJobSql);
            
            foreach ($job_ids as $job_id) {
                $job_id = intval($job_id);
                $insertJobStmt->bind_param("ii", $profile_id, $job_id);
                $insertJobStmt->execute();
            }
            
            $insertJobStmt->close();
            error_log("✅ Inserted " . count($job_ids) . " jobs");
        }

        // ====================================================================
        // COMMIT TRANSACTION
        // ====================================================================
        
        $conn->commit();
        error_log("=== TRANSACTION COMMITTED ===");
        
        sendResponse(true, "Profile updated successfully!", array(
            'profile_id' => $profile_id,
            'profile_image' => $profile_image_url,
            'skills_count' => count($skill_ids),
            'languages_count' => count($language_ids),
            'jobs_count' => count($job_ids)
        ));

    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        throw $e;
    }

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    error_log("Stack: " . $e->getTraceAsString());
    
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>