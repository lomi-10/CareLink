<?php
// helper/apply_job.php
// Submit job application

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../dbcon.php';

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$job_post_id = isset($input['job_post_id']) ? intval($input['job_post_id']) : 0;
$helper_id = isset($input['helper_id']) ? intval($input['helper_id']) : 0;
$cover_letter = isset($input['cover_letter']) ? trim($input['cover_letter']) : '';

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
        echo json_encode([
            'success' => false,
            'message' => 'You have already applied to this job'
        ]);
        exit;
    }

    // Check if helper is verified
    $helper_stmt = $conn->prepare("
        SELECT verification_status 
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
    if ($helper['verification_status'] !== 'Verified') {
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

        echo json_encode([
            'success' => true,
            'message' => 'Application submitted successfully',
            'application_id' => $application_id
        ]);

        // TODO: Send notification to parent
        // TODO: Send email confirmation to helper
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