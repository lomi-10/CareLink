<?php
// helper/withdraw_application.php
// Withdraw a job application

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

$application_id = isset($input['application_id']) ? intval($input['application_id']) : 0;

// Validation
if ($application_id === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Application ID is required'
    ]);
    exit;
}

try {
    // Check if application exists and can be withdrawn
    $check_stmt = $conn->prepare("
        SELECT 
            application_id, 
            status,
            helper_id
        FROM job_applications 
        WHERE application_id = ?
    ");
    $check_stmt->bind_param("i", $application_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    $application = $result->fetch_assoc();

    if (!$application) {
        echo json_encode([
            'success' => false,
            'message' => 'Application not found'
        ]);
        exit;
    }

    // Only allow withdrawing Pending or Reviewed applications
    if (!in_array($application['status'], ['Pending', 'Reviewed'])) {
        echo json_encode([
            'success' => false,
            'message' => 'This application cannot be withdrawn. Current status: ' . $application['status']
        ]);
        exit;
    }

    // Update application status to Withdrawn
    $update_stmt = $conn->prepare("
        UPDATE job_applications 
        SET status = 'Withdrawn',
            updated_at = NOW()
        WHERE application_id = ?
    ");
    
    $update_stmt->bind_param("i", $application_id);

    if ($update_stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Application withdrawn successfully'
        ]);

        // TODO: Send notification to parent that application was withdrawn
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