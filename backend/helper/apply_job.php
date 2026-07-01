<?php
// helper/apply_job.php
// Submit job application

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$job_post_id = isset($input['job_post_id']) ? intval($input['job_post_id']) : 0;
$helper_id = isset($input['helper_id']) ? intval($input['helper_id']) : 0;
$cover_letter = isset($input['cover_letter']) ? trim($input['cover_letter']) : '';
$requester_id = isset($input['requester_id']) ? intval($input['requester_id']) : 0;

try {
    carelink_require_self($requester_id, $helper_id, 'You are not allowed to apply on behalf of this helper account.');
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}

// Documents the helper explicitly chose to share with this employer (consent is per-application)
$shared_document_ids = [];
if (isset($input['shared_document_ids']) && is_array($input['shared_document_ids'])) {
    $shared_document_ids = array_values(array_unique(array_map('intval', $input['shared_document_ids'])));
}

// Replaces this application's shared-document list with the helper's current selection.
// Uses raw SQL with intval()-safe integers — no prepared statement complexity.
function syncSharedDocuments($conn, $application_id, $helper_id, $document_ids) {
    $app_id     = intval($application_id);
    $helper_id  = intval($helper_id);

    // Clear existing shares for this application
    $conn->query("DELETE FROM application_document_shares WHERE application_id = $app_id");

    if (empty($document_ids)) return 0;

    // Collect only valid positive integers
    $safe_ids = array_values(array_filter(array_map('intval', $document_ids), fn($id) => $id > 0));
    if (empty($safe_ids)) return 0;

    // Fetch which of those IDs actually belong to this helper and are Verified
    $id_list = implode(',', $safe_ids);
    $res = $conn->query(
        "SELECT document_id FROM user_documents
         WHERE document_id IN ($id_list) AND user_id = $helper_id AND status = 'Verified'"
    );

    $verified = [];
    if ($res) {
        while ($row = $res->fetch_assoc()) $verified[] = intval($row['document_id']);
    }

    error_log("[syncSharedDocuments] app=$app_id helper=$helper_id requested=" . count($safe_ids) . " verified=" . count($verified));

    if (empty($verified)) return 0;

    // Bulk-insert all verified IDs in one query
    $values = implode(',', array_map(fn($did) => "($app_id, $did)", $verified));
    $conn->query("INSERT IGNORE INTO application_document_shares (application_id, document_id) VALUES $values");

    $inserted = $conn->affected_rows;
    error_log("[syncSharedDocuments] inserted=$inserted err=" . $conn->error);
    return $inserted;
}

// Validation
if ($job_post_id === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Job post ID is required'
    ]);
    exit;
}

if ($helper_id === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Helper ID is required'
    ]);
    exit;
}

if (empty($cover_letter)) {
    echo json_encode([
        'success' => false,
        'message' => 'Cover letter is required'
    ]);
    exit;
}

if (strlen($cover_letter) < 50) {
    echo json_encode([
        'success' => false,
        'message' => 'Cover letter must be at least 50 characters'
    ]);
    exit;
}

if (strlen($cover_letter) > 1000) {
    echo json_encode([
        'success' => false,
        'message' => 'Cover letter must not exceed 1000 characters'
    ]);
    exit;
}

try {
    // Check if job exists and is open
    $job_stmt = $conn->prepare("
        SELECT job_post_id, status, expires_at 
        FROM job_posts 
        WHERE job_post_id = ?
    ");
    $job_stmt->bind_param("i", $job_post_id);
    $job_stmt->execute();
    $job_result = $job_stmt->get_result();
    $job = $job_result->fetch_assoc();

    if (!$job) {
        echo json_encode([
            'success' => false,
            'message' => 'Job posting not found'
        ]);
        exit;
    }

    if ($job['status'] !== 'Open') {
        echo json_encode([
            'success' => false,
            'message' => 'This job posting is no longer accepting applications'
        ]);
        exit;
    }

    if ($job['expires_at'] && strtotime($job['expires_at']) < time()) {
        echo json_encode([
            'success' => false,
            'message' => 'This job posting has expired'
        ]);
        exit;
    }

    // Check if already applied
    $check_stmt = $conn->prepare("
        SELECT application_id 
        FROM job_applications 
        WHERE job_post_id = ? AND helper_id = ?
    ");
    $check_stmt->bind_param("ii", $job_post_id, $helper_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows > 0) {
        $existing_application = $check_result->fetch_assoc();

        if($existing_application['status'] === 'Withdrawn') {
            echo json_encode([
                'success' => false,
                'message' => 'You have already applied to this job'
            ]);
            exit;
        }

        $update_stmt = $conn->prepare("
            UPDATE job_applications 
            SET status = 'Pending', cover_letter = ?, applied_at = NOW()
            WHERE application_id = ?
        ");
        $update_stmt->bind_param("si", $cover_letter, $existing_application['application_id']);
        if($update_stmt->execute()) {
            syncSharedDocuments($conn, (int)$existing_application['application_id'], $helper_id, $shared_document_ids);

            // Notify the parent about re-application
            require_once '../shared/create_notification.php';
            $jobRow = $conn->query("SELECT title, parent_id FROM job_posts WHERE job_post_id = $job_post_id")->fetch_assoc();
            $helperRow = $conn->query("SELECT CONCAT(first_name,' ',last_name) AS full_name FROM users WHERE user_id = $helper_id")->fetch_assoc();
            if ($jobRow && $helperRow) {
                createNotification(
                    $conn,
                    (int)$jobRow['parent_id'],
                    'application_received',
                    'Application Resubmitted',
                    $helperRow['full_name'] . ' has resubmitted their application for: ' . $jobRow['title'],
                    'application',
                    (int)$existing_application['application_id']
                );
            }

            echo json_encode([
                'success' => true,
                'message' => 'Your previous application was withdrawn. It has now been resubmitted.',
                'application_id' => $existing_application['application_id']
            ]);
            exit;
        } else {
            throw new Exception($conn->error);
        }
    }

    // Check if helper is verified
    $helper_stmt = $conn->prepare("
        SELECT status 
        FROM users 
        WHERE user_id = ?
    ");
    $helper_stmt->bind_param("i", $helper_id);
    $helper_stmt->execute();
    $helper_result = $helper_stmt->get_result();
    $helper = $helper_result->fetch_assoc();

    if (!$helper) {
        echo json_encode([
            'success' => false,
            'message' => 'Helper account not found'
        ]);
        exit;
    }

    //Note: We allow unverified helpers to apply, but parent can filter by verification
    // If you want to require verification, uncomment:
    if ($helper['status'] !== 'approved') {
      echo json_encode([
        'success' => false,
        'message' => 'Your account must be verified before applying to jobs'
      ]);
      exit;
    }

    // Insert application
    $insert_stmt = $conn->prepare("
        INSERT INTO job_applications (
            job_post_id,
            helper_id,
            cover_letter,
            status,
            applied_at
        ) VALUES (?, ?, ?, 'Pending', NOW())
    ");
    
    $insert_stmt->bind_param("iis", 
        $job_post_id,
        $helper_id,
        $cover_letter
    );

    if ($insert_stmt->execute()) {
        $application_id = $conn->insert_id;

        $sharedCount = syncSharedDocuments($conn, $application_id, $helper_id, $shared_document_ids);

        echo json_encode([
            'success' => true,
            'message' => 'Application submitted successfully',
            'application_id' => $application_id,
            'shared_doc_count' => $sharedCount
        ]);

        // Notify the parent that a helper applied
        require_once '../shared/create_notification.php';
        $jobRow = $conn->query("SELECT title, parent_id FROM job_posts WHERE job_post_id = $job_post_id")->fetch_assoc();
        $helperRow = $conn->query("SELECT CONCAT(first_name,' ',last_name) AS full_name FROM users WHERE user_id = $helper_id")->fetch_assoc();
        if ($jobRow && $helperRow) {
            createNotification(
                $conn,
                (int)$jobRow['parent_id'],
                'application_received',
                'New Application Received',
                $helperRow['full_name'] . ' applied for your job: ' . $jobRow['title'],
                'application',
                $application_id
            );
        }
    } else {
        throw new Exception($conn->error);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>