<?php
// carelink_api/parent/get_applicant_profile.php

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: private, no-store, max-age=0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Your standard error settings
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

include_once '../dbcon.php';
include_once __DIR__ . '/../shared/ownership_guard.php';
include_once __DIR__ . '/../shared/file_security.php';

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
    $requester_id = isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0;
    $include_file_urls = !isset($_GET['include_file_urls']) || $_GET['include_file_urls'] !== '0';

    if (!$application_id || !$helper_id) {
        throw new Exception("Application ID and Helper ID are required");
    }

    error_log("=== GET APPLICANT PROFILE === App: $application_id, Helper: $helper_id");

    // Only the parent who actually owns this application's job post may view
    // the applicant's profile (salary expectations, contact info, etc.).
    $ownerStmt = $conn->prepare("
        SELECT jp.parent_id
        FROM job_applications ja
        INNER JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
        WHERE ja.application_id = ?
    ");
    $ownerStmt->bind_param("i", $application_id);
    $ownerStmt->execute();
    $ownerRow = $ownerStmt->get_result()->fetch_assoc();
    $ownerStmt->close();
    $parent_id = $ownerRow ? (int)$ownerRow['parent_id'] : 0;
    carelink_require_self($requester_id, $parent_id, "You are not allowed to view this applicant's profile.");
    if ($include_file_urls) {
        require_once __DIR__ . '/../shared/auth_tokens.php';
        if (carelink_authenticated_user_id($conn) !== $parent_id) {
            throw new Exception("A valid session is required to view shared document previews.");
        }
    }

    // 4. Converting SQL to mysqli style (Replacing :names with ?)
    $sql = "
        SELECT 
            ja.*,
            jp.start_date AS job_start_date,
            u.first_name, u.middle_name, u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as helper_name,
            hp.profile_image as helper_photo,
            u.phone as helper_contact_number,
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
        LEFT JOIN ref_jobs rj ON hj.job_id = rj.job_id
        LEFT JOIN ref_categories rc ON rj.category_id = rc.category_id
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
    $file_path_columns = $include_file_urls ? "ud.file_path, ud.file_path_back, " : "";
    $docs_stmt = $conn->prepare("
        SELECT ud.document_id, ud.document_type, {$file_path_columns}ud.status, ud.uploaded_at
        FROM application_document_shares ads
        INNER JOIN user_documents ud ON ud.document_id = ads.document_id
        WHERE ads.application_id = ?
        ORDER BY ud.document_type
    ");
    $docs_stmt->bind_param("i", $application_id);
    $docs_stmt->execute();
    $docs_result = $docs_stmt->get_result();
    while ($doc = $docs_result->fetch_assoc()) {
        $shared_document = [
            'document_id' => (int)$doc['document_id'],
            'document_type' => $doc['document_type'],
            'status' => $doc['status'],
            'uploaded_at' => $doc['uploaded_at'],
        ];
        if ($include_file_urls) {
            $document_id = (int)$doc['document_id'];
            if (!empty($doc['file_path'])) {
                $shared_document['file_url'] = carelink_signed_shared_document_url($application_id, $document_id, $parent_id);
                $shared_document['is_pdf'] = strtolower(pathinfo($doc['file_path'], PATHINFO_EXTENSION)) === 'pdf';
            }
            if (!empty($doc['file_path_back'])) {
                $shared_document['file_url_back'] = carelink_signed_shared_document_url($application_id, $document_id, $parent_id, 'back');
                $shared_document['is_pdf_back'] = strtolower(pathinfo($doc['file_path_back'], PATHINFO_EXTENSION)) === 'pdf';
            }
        }
        $shared_documents[] = $shared_document;
    }
    $docs_stmt->close();

    // 5c. Work history (past employers). The employer's phone number is only
    //     exposed when the helper allowed it as a reference (can_contact = 1) —
    //     otherwise the entry still shows, just without the contact number.
    $work_history = [];
    $wh_stmt = $conn->prepare("
        SELECT wh.employer_name, wh.position, wh.start_date, wh.end_date,
               wh.duties, wh.reason_for_leaving, wh.can_contact,
               CASE WHEN wh.can_contact = 1 THEN wh.employer_contact ELSE NULL END AS employer_contact
        FROM helper_work_history wh
        INNER JOIN helper_profiles hp ON hp.profile_id = wh.profile_id
        WHERE hp.user_id = ?
        ORDER BY (wh.end_date IS NULL) DESC, wh.start_date DESC
    ");
    $wh_stmt->bind_param("i", $helper_id);
    $wh_stmt->execute();
    $wh_result = $wh_stmt->get_result();
    while ($wh = $wh_result->fetch_assoc()) {
        $wh['can_contact'] = (int)$wh['can_contact'] === 1;
        $work_history[] = $wh;
    }
    $wh_stmt->close();

    // 5d. Count this as a profile view for the helper (parent looking at their profile)
    $view_stmt = $conn->prepare("UPDATE helper_profiles SET profile_views = profile_views + 1 WHERE user_id = ?");
    if ($view_stmt) {
        $view_stmt->bind_param("i", $helper_id);
        $view_stmt->execute();
        $view_stmt->close();
    }

    // 6. Sending response in your specific format
    sendResponse(true, "Applicant profile retrieved", [
        'applicant' => $applicant,
        'shared_documents' => $shared_documents,
        'work_history' => $work_history,
    ]);

} catch (Exception $e) {
    error_log("ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>