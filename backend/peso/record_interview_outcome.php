<?php
/**
 * peso/record_interview_outcome.php
 *
 * A PESO officer records how an interview went and BOTH parties are notified
 * automatically. Requested by PESO (Aug 2026): previously an interview sat at
 * result = 'Pending' forever and neither side was ever told anything.
 *
 * TWO AUDIENCES, DELIBERATELY DIFFERENT:
 *
 *   • The notifications are neutral and factual. A "Fail" is phrased as the
 *     employer moving on, not as a judgement of the helper — a kasambahay
 *     reading "you failed your interview" in a push notification is a real
 *     harm, and PESO's own assessment is not the helper's to receive.
 *
 *   • `private_notes` is PESO-EYES-ONLY and is never included in either
 *     notification, in any message row, or in any helper/employer endpoint.
 *     See shared/interview_reviews_table.php.
 *
 * POST { interview_id, result, no_show_party?, private_notes?, staff_user_id }
 */
ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
// Authorization is listed because lib/authFetch.ts attaches a bearer token to
// every API_URL request. Without it here, the browser preflight for this POST
// is refused and the request never reaches PHP.
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../shared/interview_reviews_table.php';

function respond($ok, $msg, $data = null) {
    if (ob_get_level()) ob_clean();
    $r = ['success' => $ok, 'message' => $msg];
    if ($data !== null) $r['data'] = $data;
    echo json_encode($r);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $data = json_decode(file_get_contents('php://input'), true) ?: [];

    $interview_id = (int) ($data['interview_id'] ?? 0);
    $result       = trim((string) ($data['result'] ?? ''));
    $noShowParty  = isset($data['no_show_party']) ? trim((string) $data['no_show_party']) : null;
    $notes        = isset($data['private_notes']) ? trim((string) $data['private_notes']) : '';
    $staff_id     = (int) ($data['staff_user_id'] ?? 0);

    if ($interview_id <= 0) throw new Exception('Interview id is required.');
    if (!in_array($result, ['Pass', 'Fail', 'No Show'], true)) {
        throw new Exception('Result must be Pass, Fail or No Show.');
    }
    if ($result === 'No Show' && !in_array($noShowParty, ['helper', 'employer', 'both'], true)) {
        throw new Exception('Say who did not appear: helper, employer or both.');
    }
    if ($result !== 'No Show') $noShowParty = null;

    peso_validate_staff_actor($conn, $staff_id);
    ensure_interview_reviews_table($conn);

    // Both parties and the job, resolved from the interview itself so a
    // mismatched id in the request can never notify the wrong people.
    $st = $conn->prepare(
        "SELECT isch.status, isch.result AS current_result, isch.application_id,
                jp.title AS job_title,
                ja.helper_id, jp.parent_id,
                TRIM(CONCAT(hu.first_name,' ',COALESCE(hu.last_name,''))) AS helper_name,
                TRIM(CONCAT(pu.first_name,' ',COALESCE(pu.last_name,''))) AS employer_name
         FROM interview_schedules isch
         INNER JOIN job_applications ja ON ja.application_id = isch.application_id
         INNER JOIN job_posts jp        ON jp.job_post_id    = ja.job_post_id
         INNER JOIN users hu            ON hu.user_id        = ja.helper_id
         INNER JOIN users pu            ON pu.user_id        = jp.parent_id
         WHERE isch.interview_id = ? LIMIT 1"
    );
    if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
    $st->bind_param('i', $interview_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) throw new Exception('Interview not found.');

    if ($row['status'] === 'Cancelled') {
        throw new Exception('This interview was cancelled — there is no outcome to record.');
    }

    $helperId   = (int) $row['helper_id'];
    $employerId = (int) $row['parent_id'];
    $jobTitle   = (string) $row['job_title'];
    $appId      = (int) $row['application_id'];

    $conn->begin_transaction();

    try {
        $upd = $conn->prepare(
            "UPDATE interview_schedules
             SET result = ?, status = 'Completed', updated_at = NOW()
             WHERE interview_id = ?"
        );
        $upd->bind_param('si', $result, $interview_id);
        $upd->execute();
        $upd->close();

        $ins = $conn->prepare(
            'INSERT INTO interview_reviews (interview_id, reviewed_by, result, no_show_party, private_notes, notified_at)
             VALUES (?, ?, ?, ?, ?, NOW())'
        );
        $notesOrNull = $notes !== '' ? $notes : null;
        $ins->bind_param('iisss', $interview_id, $staff_id, $result, $noShowParty, $notesOrNull);
        $ins->execute();
        $review_id = (int) $ins->insert_id;
        $ins->close();

        peso_audit_verification($conn, $staff_id, 'INTERVIEW_OUTCOME_' . strtoupper(str_replace(' ', '_', $result)), 'Interviews', $interview_id);

        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }

    // ── Notify both sides ────────────────────────────────────────────────────
    // Outside the transaction: a notification that fails to send must not undo
    // a recorded outcome. The officer can re-record; a rolled-back review would
    // silently lose their assessment.
    require_once __DIR__ . '/../shared/create_notification.php';

    if ($result === 'Pass') {
        $helperTitle = 'Your interview went well 🎉';
        $helperBody  = "Your interview for \"{$jobTitle}\" was recorded as successful. Watch for the employer's next step.";
        $empTitle    = 'Interview marked successful';
        $empBody     = "The interview with {$row['helper_name']} for \"{$jobTitle}\" was recorded as successful by PESO.";
    } elseif ($result === 'Fail') {
        // Phrased as an outcome, not a verdict on the person.
        $helperTitle = 'Interview update';
        $helperBody  = "Your interview for \"{$jobTitle}\" has been reviewed and this employer is not moving forward. This does not affect your PESO verification — keep applying.";
        $empTitle    = 'Interview outcome recorded';
        $empBody     = "The interview with {$row['helper_name']} for \"{$jobTitle}\" was recorded as unsuccessful.";
    } else {
        $who = $noShowParty === 'both' ? 'Neither party'
            : ($noShowParty === 'helper' ? $row['helper_name'] : $row['employer_name']);
        $helperTitle = 'Interview recorded as a no-show';
        $helperBody  = "{$who} did not attend the interview for \"{$jobTitle}\". Contact PESO if this is wrong.";
        $empTitle    = 'Interview recorded as a no-show';
        $empBody     = "{$who} did not attend the interview for \"{$jobTitle}\". Contact PESO if this is wrong.";
    }

    createNotification($conn, $helperId, 'interview_result', $helperTitle, $helperBody, 'application', $appId);
    createNotification($conn, $employerId, 'interview_result', $empTitle, $empBody, 'application', $appId);

    respond(true, 'Outcome recorded. Both the helper and the employer have been notified.', [
        'review_id' => $review_id,
        'result'    => $result,
        'notified'  => ['helper' => $helperId, 'employer' => $employerId],
    ]);

} catch (Exception $e) {
    error_log('ERROR in record_interview_outcome.php: ' . $e->getMessage());
    respond(false, $e->getMessage());
}

if (isset($conn) && $conn) $conn->close();
