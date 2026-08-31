<?php
/**
 * peso/get_interview_detail.php — one interview, in full, for the PESO oversight pane.
 *
 * Returns both parties, the job, the two-sided confirmation state, a derived
 * timeline for the progress tracker, and PESO's private review history.
 *
 * STAFF ONLY. The private_notes in the review history are an officer's candid
 * assessment of the people involved — this endpoint must never be reachable by
 * a helper or an employer.
 *
 * GET ?interview_id=..&staff_user_id=..
 */
header('Access-Control-Allow-Origin: *');
// Authorization is allowed because lib/authFetch.ts attaches a bearer token to
// every API_URL request; without it the browser preflight is refused and the
// request never reaches PHP.
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../shared/interview_reviews_table.php';
require_once __DIR__ . '/../shared/interview_feedback_table.php';

function out(bool $ok, string $msg, ?array $data = null): void
{
    $r = ['success' => $ok, 'message' => $msg];
    if ($data !== null) $r = array_merge($r, $data);
    echo json_encode($r);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    peso_require_staff($conn);

    $id = (int) ($_GET['interview_id'] ?? 0);
    if ($id <= 0) throw new Exception('Missing interview id.');

    $sql = "
        SELECT isch.interview_id, isch.application_id, isch.interview_date, isch.interview_type,
               isch.location_or_link, isch.notes, isch.status, isch.result,
               isch.parent_confirmed, isch.helper_confirmed, isch.created_at, isch.updated_at,
               ja.status AS application_status, ja.applied_at,
               jp.job_post_id, jp.title AS job_title, jp.salary_offered, jp.salary_period,
               hu.user_id AS helper_id, hu.email AS helper_email, hu.phone AS helper_phone,
               TRIM(CONCAT(hu.first_name, ' ', COALESCE(hu.last_name, ''))) AS helper_name,
               hp.profile_image AS helper_photo, hp.verification_status AS helper_verification,
               hp.municipality AS helper_municipality, hp.province AS helper_province,
               pu.user_id AS employer_id, pu.email AS employer_email, pu.phone AS employer_phone,
               TRIM(CONCAT(pu.first_name, ' ', COALESCE(pu.last_name, ''))) AS employer_name,
               pp.profile_image AS employer_photo, pp.verification_status AS employer_verification,
               pp.municipality AS employer_municipality, pp.province AS employer_province
        FROM interview_schedules isch
        INNER JOIN job_applications ja ON ja.application_id = isch.application_id
        INNER JOIN job_posts jp        ON jp.job_post_id    = ja.job_post_id
        INNER JOIN users hu            ON hu.user_id        = ja.helper_id
        LEFT  JOIN helper_profiles hp  ON hp.user_id        = ja.helper_id
        INNER JOIN users pu            ON pu.user_id        = jp.parent_id
        LEFT  JOIN parent_profiles pp  ON pp.user_id        = jp.parent_id
        WHERE isch.interview_id = ?
        LIMIT 1";

    $st = $conn->prepare($sql);
    if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
    $st->bind_param('i', $id);
    $st->execute();
    $r = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$r) throw new Exception('Interview not found.');

    $parentOk = (int) $r['parent_confirmed'] === 1;
    $helperOk = (int) $r['helper_confirmed'] === 1;
    $bothOk   = $parentOk && $helperOk;
    $result   = $r['result'] ?: 'Pending';
    $status   = $r['status'];
    $when     = strtotime((string) $r['interview_date']);
    $past     = $when > 0 && $when < time();
    $cancelled = $status === 'Cancelled';

    // ── The progress tracker ─────────────────────────────────────────────────
    // Four stages, derived rather than stored, so the tracker can never drift
    // out of sync with the row it describes. 'blocked' is its own state — a
    // cancelled interview must not render as merely "not done yet".
    $stageState = function (bool $done, bool $active) use ($cancelled) {
        if ($cancelled) return $done ? 'done' : 'blocked';
        return $done ? 'done' : ($active ? 'active' : 'todo');
    };

    $stages = [
        [
            'key' => 'scheduled',
            'label' => 'Interview scheduled',
            'detail' => $r['created_at'] ? date('M j, Y g:i A', strtotime($r['created_at'])) : null,
            'state' => $cancelled ? 'done' : 'done',
        ],
        [
            'key' => 'confirmed',
            'label' => 'Both parties confirmed',
            'detail' => $bothOk
                ? 'Employer and helper both confirmed'
                : ($parentOk && !$helperOk ? 'Waiting on the helper'
                    : (!$parentOk && $helperOk ? 'Waiting on the employer' : 'Waiting on both')),
            'state' => $stageState($bothOk, !$bothOk),
        ],
        [
            'key' => 'held',
            'label' => 'Interview took place',
            'detail' => $when > 0 ? date('M j, Y g:i A', $when) : null,
            'state' => $stageState($status === 'Completed' || $result !== 'Pending', $bothOk && $past),
        ],
        [
            'key' => 'outcome',
            'label' => 'Outcome recorded',
            'detail' => $result !== 'Pending' ? $result : 'Not yet recorded',
            'state' => $stageState($result !== 'Pending', $past && $result === 'Pending'),
        ],
    ];

    // What the officer should do next, said in one line rather than left to be
    // inferred from four stage chips.
    $nextAction = $cancelled ? 'This interview was cancelled. No outcome is needed.'
        : ($result !== 'Pending' ? 'Outcome recorded. Nothing further is needed.'
        : (!$bothOk ? 'Waiting on confirmation. Follow up if the date is close.'
        : ($past ? 'The interview date has passed — record the outcome to notify both parties.'
        : 'Confirmed and upcoming. Nothing to do yet.')));

    // Ask both parties how it went, if the date has passed and they have not been
    // asked yet. Fired here because the project has no scheduler — PESO opening
    // the case is a reliable moment for the prompt to go out.
    carelink_request_interview_feedback($conn, $id);
    $partyFeedback = carelink_interview_feedback($conn, $id);
    $reviews = carelink_interview_reviews($conn, $id);

    out(true, 'OK', [
        'interview' => [
            'interview_id'     => (int) $r['interview_id'],
            'code'             => 'INT-' . (int) $r['interview_id'],
            'application_id'   => (int) $r['application_id'],
            'application_status' => $r['application_status'],
            'interview_date'   => $r['interview_date'],
            'interview_type'   => $r['interview_type'],
            'location_or_link' => $r['location_or_link'],
            'notes'            => $r['notes'],
            'status'           => $status,
            'result'           => $result,
            'parent_confirmed' => $parentOk,
            'helper_confirmed' => $helperOk,
            'is_past'          => $past,
            'created_at'       => $r['created_at'],
            'updated_at'       => $r['updated_at'],
        ],
        'job' => [
            'job_post_id'    => (int) $r['job_post_id'],
            'title'          => $r['job_title'],
            'salary_offered' => (float) $r['salary_offered'],
            'salary_period'  => $r['salary_period'],
        ],
        'helper' => [
            'user_id'             => (int) $r['helper_id'],
            'name'                => $r['helper_name'],
            'email'               => $r['helper_email'],
            'phone'               => $r['helper_phone'],
            'photo'               => $r['helper_photo'],
            'verification_status' => $r['helper_verification'],
            'location'            => trim(implode(', ', array_filter([$r['helper_municipality'], $r['helper_province']]))),
            'confirmed'           => $helperOk,
        ],
        'employer' => [
            'user_id'             => (int) $r['employer_id'],
            'name'                => $r['employer_name'],
            'email'               => $r['employer_email'],
            'phone'               => $r['employer_phone'],
            'photo'               => $r['employer_photo'],
            'verification_status' => $r['employer_verification'],
            'location'            => trim(implode(', ', array_filter([$r['employer_municipality'], $r['employer_province']]))),
            'confirmed'           => $parentOk,
        ],
        'stages'      => $stages,
        'next_action' => $nextAction,
        'reviews'     => $reviews,
        // What the two people who were actually there said. Comments are
        // staff-only; neither party ever sees the other's.
        'party_feedback' => $partyFeedback,
    ]);

} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
