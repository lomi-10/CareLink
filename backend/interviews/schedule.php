<?php
// carelink_api/interviews/schedule.php
// Create or replace an interview schedule for an application; notify parent + helper; chat line

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once '../dbcon.php';

$input = json_decode(file_get_contents('php://input'), true);

$application_id   = isset($input['application_id'])  ? intval($input['application_id'])  : 0;
$interview_date   = $input['interview_date']  ?? null;
$interview_type   = $input['interview_type']  ?? 'In-person';
$location_or_link = isset($input['location_or_link']) ? trim((string)$input['location_or_link']) : '';
$notes            = isset($input['notes']) ? trim((string)$input['notes']) : '';
$scheduled_by     = isset($input['scheduled_by']) ? intval($input['scheduled_by']) : 0;

if (!$application_id || !$interview_date || !$scheduled_by) {
    echo json_encode(['success' => false, 'message' => 'application_id, interview_date, and scheduled_by required']);
    exit();
}
if (!in_array($interview_type, ['In-person', 'Video Call', 'Phone'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid interview_type']);
    exit();
}

try {
    $appRow = $conn->query(
        "SELECT ja.helper_id, ja.job_post_id, jp.title AS job_title, jp.parent_id
         FROM job_applications ja
         JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
         WHERE ja.application_id = " . (int)$application_id
    )->fetch_assoc();
    if (!$appRow) throw new Exception('Application not found');

    $parent_id = (int)$appRow['parent_id'];
    $helper_id = (int)$appRow['helper_id'];
    $job_post_id = (int)$appRow['job_post_id'];
    $job_title = $appRow['job_title'] ?? 'Position';

    if ($scheduled_by !== $parent_id) {
        throw new Exception('Only the parent who owns this job can schedule this interview');
    }

    $loc      = $location_or_link !== '' ? $location_or_link : '';
    $notesVal = $notes !== '' ? $notes : '';

    $conn->begin_transaction();

    $del = $conn->prepare("DELETE FROM interview_schedules WHERE application_id = ?");
    $del->bind_param("i", $application_id);
    $del->execute();
    $del->close();

    $stmt = $conn->prepare(
        "INSERT INTO interview_schedules
         (application_id, interview_date, interview_type, location_or_link, notes, status, parent_confirmed)
         VALUES (?, ?, ?, ?, ?, 'Scheduled', 1)"
    );
    if (!$stmt) throw new Exception($conn->error);
    $stmt->bind_param("issss", $application_id, $interview_date, $interview_type, $loc, $notesVal);
    $stmt->execute();
    $interview_id = $conn->insert_id;
    $stmt->close();

    $conn->query(
        "UPDATE job_applications SET status = 'Interview Scheduled', updated_at = NOW() WHERE application_id = " . (int)$application_id
    );

    $msgLine = 'Interview scheduled: ' . $interview_type . ' on ' . date('M j, Y g:i A', strtotime($interview_date));
    if ($loc) {
        $msgLine .= '. ' . ($interview_type === 'Phone' ? 'Phone: ' : ($interview_type === 'Video Call' ? 'Link: ' : 'Location: ')) . $loc;
    }
    $insMsg = $conn->prepare(
        "INSERT INTO messages (sender_id, receiver_id, job_post_id, message_text, message_type, image_url, sent_at)
         VALUES (?, ?, ?, ?, 'text', NULL, NOW())"
    );
    if ($insMsg) {
        $insMsg->bind_param("iiis", $parent_id, $helper_id, $job_post_id, $msgLine);
        $insMsg->execute();
        $insMsg->close();
    }

    $conn->commit();

    require_once '../shared/create_notification.php';
    $typeLabel = $interview_type;
    $dateLabel = date('M j, Y g:ia', strtotime($interview_date));

    createNotification($conn, $helper_id, 'interview_scheduled',
        'Interview Scheduled',
        "Your interview for \"$job_title\" is set: $typeLabel on $dateLabel.",
        'application', $application_id);

    createNotification($conn, $parent_id, 'interview_scheduled',
        'Interview confirmed',
        "You scheduled an interview with the applicant for \"$job_title\" ($typeLabel, $dateLabel).",
        'application', $application_id);

    echo json_encode([
        'success'      => true,
        'interview_id' => (int)$interview_id,
        'message'      => 'Interview scheduled successfully',
    ]);
} catch (Exception $e) {
    try { if (isset($conn)) $conn->rollback(); } catch (Throwable $t) {}
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
