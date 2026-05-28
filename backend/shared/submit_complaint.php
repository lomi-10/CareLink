<?php
/**
 * POST JSON: application_id, user_id, user_type (parent|helper), subject, body, category? (optional)
 * Inserts into `complaints` (matches current.sql). Notifies all super admins (user_type = admin).
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/placement_dispute_helpers.php';
require_once __DIR__ . '/create_notification.php';

function out($ok, $msg, $extra = [])
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        out(false, 'POST required');
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';
    $subject = isset($input['subject']) ? trim((string) $input['subject']) : '';
    $body = isset($input['body']) ? trim((string) $input['body']) : '';
    $category_raw = isset($input['category']) ? trim((string) $input['category']) : 'other';

    if ($application_id <= 0 || $user_id <= 0) {
        out(false, 'application_id and user_id required');
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        out(false, 'user_type must be parent or helper');
    }
    if ($subject === '' || strlen($subject) > 255) {
        out(false, 'subject required (max 255 characters)');
    }
    if ($body === '' || strlen($body) > 8000) {
        out(false, 'description required (max 8000 characters)');
    }

    $hire = carelink_load_application_parties($conn, $application_id);
    if (!$hire) {
        out(false, 'Placement not found');
    }
    if (!carelink_user_on_application($hire, $user_id, $user_type)) {
        out(false, 'You are not a party on this placement');
    }
    if (!carelink_application_allows_complaint((string) $hire['status'])) {
        out(false, 'Complaints are only allowed for active, ending, or past placements');
    }

    $helper_id = (int) $hire['helper_id'];
    $parent_id = (int) $hire['parent_id'];
    $respondent_id = $user_type === 'parent' ? $helper_id : $parent_id;

    $placement_id = carelink_placement_id_for_application($conn, $application_id);
    $category_db = carelink_map_complaint_category($category_raw);

    if ($placement_id === null) {
        $st = $conn->prepare('
            INSERT INTO complaints
              (complainant_id, respondent_id, placement_id, application_id, subject, description, category, status, complainant_role)
            VALUES (?, ?, NULL, ?, ?, ?, ?, \'Pending\', ?)
        ');
        if (!$st) {
            throw new Exception('Prepare failed');
        }
        $st->bind_param(
            'iiissss',
            $user_id,
            $respondent_id,
            $application_id,
            $subject,
            $body,
            $category_db,
            $user_type,
        );
    } else {
        $st = $conn->prepare('
            INSERT INTO complaints
              (complainant_id, respondent_id, placement_id, application_id, subject, description, category, status, complainant_role)
            VALUES (?, ?, ?, ?, ?, ?, ?, \'Pending\', ?)
        ');
        if (!$st) {
            throw new Exception('Prepare failed');
        }
        $st->bind_param(
            'iiiissss',
            $user_id,
            $respondent_id,
            $placement_id,
            $application_id,
            $subject,
            $body,
            $category_db,
            $user_type,
        );
    }

    if (!$st->execute()) {
        $st->close();
        throw new Exception('Could not save complaint');
    }
    $cid = (int) $conn->insert_id;
    $st->close();

    $roleLabel = $user_type === 'parent' ? 'Employer' : 'Helper';
    $adminTitle = 'New CareLink complaint';
    $adminMsg = $roleLabel . ' reported an issue (application #' . $application_id . '): ' . $subject;

    carelink_notify_users_by_type(
        $conn,
        'admin',
        'complaint_submitted',
        $adminTitle,
        $adminMsg,
        'complaint',
        $cid,
    );

    out(true, 'Complaint submitted. A super admin will review it.', ['complaint_id' => $cid]);
} catch (Exception $e) {
    out(false, $e->getMessage());
}
