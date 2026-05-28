<?php
// carelink_api/peso/get_user_details.php
// PESO retrieves full details of a user (helper or parent) for verification purposes

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

    if (!isset($_GET['user_id'])) {
        throw new Exception("User ID is required");
    }

    $user_id = intval($_GET['user_id']);
    if ($user_id <= 0) {
        throw new Exception("Invalid user ID");
    }

    // user_type is optional (e.g. deep links from notifications only have user_id)
    $user_type_filter = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';

    error_log("=== GET USER DETAILS === User ID: $user_id, Type filter: " . ($user_type_filter !== '' ? $user_type_filter : '(any)'));

    // ========================================================================
    // 1. Get user basic info
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
                    created_at
                FROM users 
                WHERE user_id = ?" . ($user_type_filter !== '' ? " AND user_type = ?" : "");
    
    $userStmt = $conn->prepare($userSql);
    if ($user_type_filter !== '') {
        $userStmt->bind_param("is", $user_id, $user_type_filter);
    } else {
        $userStmt->bind_param("i", $user_id);
    }
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    
    if ($userResult->num_rows === 0) {
        throw new Exception("User not found");
    }
    
    $user = $userResult->fetch_assoc();
    $userStmt->close();

    $user_type = isset($user['user_type']) ? $user['user_type'] : '';

    // ========================================================================
    // 2. Get profile based on user type
    // ========================================================================
    
    $profile = null;
    
    if ($user_type === 'helper') {
        $profileSql = "SELECT * FROM helper_profiles WHERE user_id = ?";
        $profileStmt = $conn->prepare($profileSql);
        $profileStmt->bind_param("i", $user_id);
        $profileStmt->execute();
        $profileResult = $profileStmt->get_result();
        
        if ($profileResult->num_rows > 0) {
            $profile = $profileResult->fetch_assoc();
            $profile['profile_id'] = intval($profile['profile_id']);
            $profile['experience_years'] = intval($profile['experience_years']);
            $profile['expected_salary'] = floatval($profile['expected_salary']);
            
            // Build profile image URL (avoid double-prefix if already absolute URL)
            if ($profile['profile_image']) {
                $img = (string) $profile['profile_image'];
                // Repair values saved as: base + full_url
                if (preg_match('#/uploads/profiles/(https?://)#i', $img)) {
                    $img = preg_replace('#^.*?/uploads/profiles/#i', '', $img);
                    $img = ltrim($img, '/');
                }
                if (stripos($img, 'http://') === 0 || stripos($img, 'https://') === 0) {
                    $profile['profile_image'] = $img;
                } else {
                    $base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
                    $profile['profile_image'] = $base_url . $img;
                }
            }
        }
        $profileStmt->close();
        
    } else if ($user_type === 'parent') {
        $profileSql = "SELECT * FROM parent_profiles WHERE user_id = ?";
        $profileStmt = $conn->prepare($profileSql);
        $profileStmt->bind_param("i", $user_id);
        $profileStmt->execute();
        $profileResult = $profileStmt->get_result();
        
        if ($profileResult->num_rows > 0) {
            $profile = $profileResult->fetch_assoc();
            $profile['profile_id'] = intval($profile['profile_id']);
            
            // Build profile image URL (avoid double-prefix if already absolute URL)
            if ($profile['profile_image']) {
                $img = (string) $profile['profile_image'];
                // Repair values saved as: base + full_url
                if (preg_match('#/uploads/profiles/(https?://)#i', $img)) {
                    $img = preg_replace('#^.*?/uploads/profiles/#i', '', $img);
                    $img = ltrim($img, '/');
                }
                if (stripos($img, 'http://') === 0 || stripos($img, 'https://') === 0) {
                    $profile['profile_image'] = $img;
                } else {
                    $base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/";
                    $profile['profile_image'] = $base_url . $img;
                }
            }
        }
        $profileStmt->close();
    }

    // ========================================================================
    // 2b. Extra details per user type
    // ========================================================================
    $helper_specialties = null;
    $parent_household = null;
    $parent_children = null;
    $parent_elderly = null;

    if ($user_type === 'helper' && $profile) {
        $profile_id = (int) $profile['profile_id'];

        // Helper jobs (specialties) + categories
        $jobs = array();
        $jobsSql = "SELECT rj.job_title, rc.category_name
                    FROM helper_jobs hj
                    INNER JOIN ref_jobs rj ON rj.job_id = hj.job_id
                    INNER JOIN ref_categories rc ON rc.category_id = rj.category_id
                    WHERE hj.profile_id = ?
                    ORDER BY rc.category_name ASC, rj.job_title ASC";
        $jobsStmt = $conn->prepare($jobsSql);
        if ($jobsStmt) {
            $jobsStmt->bind_param("i", $profile_id);
            $jobsStmt->execute();
            $res = $jobsStmt->get_result();
            while ($r = $res->fetch_assoc()) {
                $jobs[] = array(
                    'title' => $r['job_title'],
                    'category' => $r['category_name'],
                );
            }
            $jobsStmt->close();
        }

        // Helper skills
        $skills = array();
        $skillsSql = "SELECT rs.skill_name
                      FROM helper_skills hs
                      INNER JOIN ref_skills rs ON rs.skill_id = hs.skill_id
                      WHERE hs.profile_id = ?
                      ORDER BY rs.skill_name ASC";
        $skillsStmt = $conn->prepare($skillsSql);
        if ($skillsStmt) {
            $skillsStmt->bind_param("i", $profile_id);
            $skillsStmt->execute();
            $res = $skillsStmt->get_result();
            while ($r = $res->fetch_assoc()) { $skills[] = $r['skill_name']; }
            $skillsStmt->close();
        }

        // Helper languages
        $languages = array();
        $langSql = "SELECT rl.language_name
                    FROM helper_languages hl
                    INNER JOIN ref_languages rl ON rl.language_id = hl.language_id
                    WHERE hl.profile_id = ?
                    ORDER BY rl.language_name ASC";
        $langStmt = $conn->prepare($langSql);
        if ($langStmt) {
            $langStmt->bind_param("i", $profile_id);
            $langStmt->execute();
            $res = $langStmt->get_result();
            while ($r = $res->fetch_assoc()) { $languages[] = $r['language_name']; }
            $langStmt->close();
        }

        $helper_specialties = array(
            'jobs' => $jobs,
            'skills' => $skills,
            'languages' => $languages
        );
    }

    if ($user_type === 'parent' && $profile) {
        $profile_id = (int) $profile['profile_id'];

        // Household summary
        $householdSql = "SELECT household_id, household_size, household_type, has_children, has_elderly, has_pets, pet_details, created_at, updated_at
                         FROM parent_household
                         WHERE profile_id = ?
                         LIMIT 1";
        $hhStmt = $conn->prepare($householdSql);
        if ($hhStmt) {
            $hhStmt->bind_param("i", $profile_id);
            $hhStmt->execute();
            $hhRes = $hhStmt->get_result();
            $parent_household = $hhRes->num_rows > 0 ? $hhRes->fetch_assoc() : null;
            $hhStmt->close();
        }

        // Children details
        $children = array();
        $childrenSql = "SELECT child_id, age, gender, special_needs
                        FROM parent_children
                        WHERE profile_id = ?
                        ORDER BY child_id DESC";
        $chStmt = $conn->prepare($childrenSql);
        if ($chStmt) {
            $chStmt->bind_param("i", $profile_id);
            $chStmt->execute();
            $res = $chStmt->get_result();
            while ($r = $res->fetch_assoc()) { $children[] = $r; }
            $chStmt->close();
        }
        $parent_children = $children;

        // Elderly details
        $elderly = array();
        $elderlySql = "SELECT elderly_id, age, gender, `condition`, care_level
                       FROM parent_elderly
                       WHERE profile_id = ?
                       ORDER BY elderly_id DESC";
        $elStmt = $conn->prepare($elderlySql);
        if ($elStmt) {
            $elStmt->bind_param("i", $profile_id);
            $elStmt->execute();
            $res = $elStmt->get_result();
            while ($r = $res->fetch_assoc()) { $elderly[] = $r; }
            $elStmt->close();
        }
        $parent_elderly = $elderly;
    }

    // ========================================================================
    // 3. Get user documents
    // ========================================================================
    
    $documentsSql = "SELECT 
                        document_id,
                        document_type,
                        file_path,
                        id_type,
                        status,
                        rejection_reason,
                        uploaded_at,
                        verified_at
                    FROM user_documents
                    WHERE user_id = ?
                    ORDER BY FIELD(document_type, 'Barangay Clearance', 'Valid ID', 'Police Clearance', 'TESDA NC2')";
    
    $documentsStmt = $conn->prepare($documentsSql);
    $documentsStmt->bind_param("i", $user_id);
    $documentsStmt->execute();
    $documentsResult = $documentsStmt->get_result();
    
    $documents = array();
    $doc_base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/documents/";
    
    while ($row = $documentsResult->fetch_assoc()) {
        $row['document_id'] = intval($row['document_id']);
        $row['file_url'] = $doc_base_url . $row['file_path'];
        $row['uploaded_at'] = $row['uploaded_at'] ? date('Y-m-d H:i:s', strtotime($row['uploaded_at'])) : null;
        $row['verified_at'] = $row['verified_at'] ? date('Y-m-d H:i:s', strtotime($row['verified_at'])) : null;
        $documents[] = $row;
    }
    $documentsStmt->close();

    error_log("Found " . count($documents) . " documents for user $user_id");

    // ========================================================================
    // Return response
    // ========================================================================
    
    $responseData = array(
        'user' => $user,
        'profile' => $profile,
        'documents' => $documents,
        'helper_specialties' => $helper_specialties,
        'parent_household' => $parent_household,
        'parent_children' => $parent_children,
        'parent_elderly' => $parent_elderly
    );
    
    sendResponse(true, "User details retrieved successfully", $responseData);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>