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
    // For general complaints (while browsing or before a hire) there is no
    // placement — the reporter names the person directly via respondent_id.
    $respondent_in = isset($input['respondent_id']) ? (int) $input['respondent_id'] : 0;
    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';
    $subject = isset($input['subject']) ? trim((string) $input['subject']) : '';
    $body = isset($input['body']) ? trim((string) $input['body']) : '';
    $category_raw = isset($input['category']) ? trim((string) $input['category']) : 'other';

    if ($user_id <= 0) {
        out(false, 'user_id required');
    }
    if ($application_id <= 0 && $respondent_in <= 0) {
        out(false, 'application_id or respondent_id required');
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

    // Resolve the respondent + optional placement. Two paths:
    //   1. Placement complaint (an active/past hire) — validated against the app.
    //   2. General complaint (browsing / pre-hire) — validated against the user.
    $respondent_id = 0;
    $placement_id  = null;   // nullable in DB
    $app_id_val    = null;   // nullable in DB
    $is_general    = false;

    if ($application_id > 0) {
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
        $app_id_val = $application_id;
    } else {
        // General complaint: the respondent must be a real helper/parent and not self.
        if ($respondent_in === $user_id) {
            out(false, "You can't file a complaint against yourself.");
        }
        $chk = $conn->prepare("SELECT user_type FROM users WHERE user_id = ? LIMIT 1");
        $chk->bind_param('i', $respondent_in);
        $chk->execute();
        $chkRow = $chk->get_result()->fetch_assoc();
        $chk->close();
        if (!$chkRow) {
            out(false, 'The person you are reporting could not be found.');
        }
        $rtype = (string) $chkRow['user_type'];
        if ($rtype !== 'helper' && $rtype !== 'parent') {
            out(false, 'You can only report a helper or an employer.');
        }
        $respondent_id = $respondent_in;
        $is_general = true;
    }

    $category_db = carelink_map_complaint_category($category_raw);

    // Single insert — placement_id / application_id are NULL for general complaints
    // (mysqli sends SQL NULL when the bound PHP variable is null).
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
        $app_id_val,
        $subject,
        $body,
        $category_db,
        $user_type,
    );

    if (!$st->execute()) {
        $st->close();
        throw new Exception('Could not save complaint');
    }
    $cid = (int) $conn->insert_id;
    $st->close();

    $roleLabel = $user_type === 'parent' ? 'Employer' : 'Helper';
    $context = $is_general ? 'a profile' : ('application #' . $application_id);
    $adminTitle = 'New CareLink complaint';
    $adminMsg = $roleLabel . ' reported an issue (' . $context . '): ' . $subject;

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
