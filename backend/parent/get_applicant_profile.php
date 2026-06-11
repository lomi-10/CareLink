<?php
// carelink_api/parent/get_applicant_profile.php

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Your standard error settings
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

include_once '../dbcon.php';

// 2. Your response helper
function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $response = array("success" => $success, "message" => $message);
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

    // 3. Input validation (using your preferred GET method)
    $application_id = isset($_GET['application_id']) ? intval($_GET['application_id']) : null;
    $helper_id = isset($_GET['helper_id']) ? intval($_GET['helper_id']) : null;
    
    if (!$application_id || !$helper_id) {
        throw new Exception("Application ID and Helper ID are required");
    }
    
    error_log("=== GET APPLICANT PROFILE === App: $application_id, Helper: $helper_id");

    // 4. Converting SQL to mysqli style (Replacing :names with ?)
    $sql = "
        SELECT 
            ja.*,
            jp.start_date AS job_start_date,
            u.first_name, u.middle_name, u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as helper_name,
            hp.profile_image as helper_photo,
            hp.contact_number as helper_contact_number,
            hp.gender as helper_gender,
            TIMESTAMPDIFF(YEAR, hp.birth_date, CURDATE()) as helper_age,
            hp.experience_years as helper_experience_years,
            hp.employment_type as helper_employment_type,
            hp.expected_salary as helper_expected_salary,
            hp.rating_average as helper_rating_average,
            hp.rating_count as helper_rating_count,
            hp.municipality as helper_municipality,
            hp.province as helper_province,
            hp.bio as helper_bio,
            GROUP_CONCAT(DISTINCT rc.category_name) as helper_categories
        FROM job_applications ja
        INNER JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
        INNER JOIN users u ON ja.helper_id = u.user_id
        INNER JOIN helper_profiles hp ON u.user_id = hp.user_id
        LEFT JOIN helper_jobs hj ON hp.profile_id = hj.profile_id
        LEFT JOIN ref_categories rc ON hj.category_id = rc.category_id
        WHERE ja.application_id = ? AND ja.helper_id = ?
        GROUP BY ja.application_id
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $application_id, $helper_id); // "ii" means two integers
    $stmt->execute();
    $result = $stmt->get_result();
    $applicant = $result->fetch_assoc();
    $stmt->close();
    
    if (!$applicant) {
        throw new Exception("Applicant not found");
    }
    
    // 5. Data formatting (cleaning up the comma-separated string from SQL)
    $applicant['helper_categories'] = $applicant['helper_categories']
        ? explode(',', $applicant['helper_categories'])
        : [];

    // 5b. Documents the helper explicitly chose to share with this employer for this application
    //     (consent-based — never expose documents the helper has not shared for this application)
    $shared_documents = [];
    $doc_base_url = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/documents/";
    $docs_stmt = $conn->prepare("
        SELECT ud.document_id, ud.document_type, ud.file_path, ud.status, ud.uploaded_at
        FROM application_document_shares ads
        INNER JOIN user_documents ud ON ud.document_id = ads.document_id
        WHERE ads.application_id = ?
        ORDER BY ud.document_type
    ");
    $docs_stmt->bind_param("i", $application_id);
    $docs_stmt->execute();
    $docs_result = $docs_stmt->get_result();
    while ($doc = $docs_result->fetch_assoc()) {
        $doc['file_url'] = $doc['file_path'] ? ($doc_base_url . $doc['file_path']) : null;
        $shared_documents[] = $doc;
    }
    $docs_stmt->close();

    // 5c. Count this as a profile view for the helper (parent looking at their profile)
    $view_stmt = $conn->prepare("UPDATE helper_profiles SET profile_views = profile_views + 1 WHERE user_id = ?");
    if ($view_stmt) {
        $view_stmt->bind_param("i", $helper_id);
        $view_stmt->execute();
        $view_stmt->close();
    }

    // 6. Sending response in your specific format
    sendResponse(true, "Applicant profile retrieved", ['applicant' => $applicant, 'shared_documents' => $shared_documents]);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>