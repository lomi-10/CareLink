<?php
/**
 * parent/create_direct_hire_offer.php — offer a job to ONE specific helper.
 *
 * POST {
 *   parent_id, requester_id, helper_id,
 *   title, category_id, salary, salary_period, employment_type, work_schedule,
 *   description?, start_date?, benefits?, job_ids?[], skill_ids?[]
 * }
 * -> { success, job_post_id, message_id }
 *
 * WHY THIS EXISTS
 * An employer who already knows who they want had to publish a public job post
 * and wait for applicants — bureaucracy when both sides are already agreed, and
 * testers said so.
 *
 * WHAT IT DOES NOT SKIP
 * A job post is not paperwork for CareLink's benefit: it is what forces the
 * employer to state salary, arrangement and duties BEFORE the helper commits.
 * Without it the helper accepts blind, which is the situation RA 10361 exists
 * to prevent. So this creates a REAL job post — same fields, same PESO review,
 * same contract, same signatures, same placement record. The only thing it
 * changes is that the post is private to the invited helper instead of listed
 * in search (job_posts.visibility = 'direct_hire').
 *
 * It is therefore faster than the public route (no waiting for applicants),
 * not lighter.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/create_notification.php';
require_once __DIR__ . '/../shared/job_invites_table.php';
require_once __DIR__ . '/../shared/direct_hire.php';

/** CareLink's fair-pay floor, above the regional kasambahay minimum. */
const DIRECT_HIRE_MIN_MONTHLY = 7000;

function dh_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $in           = json_decode(file_get_contents('php://input'), true) ?? [];
    $parent_id    = (int) ($in['parent_id'] ?? 0);
    $requester_id = (int) ($in['requester_id'] ?? 0);
    $helper_id    = (int) ($in['helper_id'] ?? 0);

    if ($parent_id <= 0 || $helper_id <= 0) dh_out(false, 'parent_id and helper_id are required.');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to send offers for this employer account.');
    if ($parent_id === $helper_id) dh_out(false, 'You cannot send an offer to yourself.');

    // ── The terms the helper is being asked to accept ────────────────────────
    $title           = trim((string) ($in['title'] ?? ''));
    $category_id     = (int) ($in['category_id'] ?? 0);
    $salary          = (float) ($in['salary'] ?? 0);
    $salary_period   = trim((string) ($in['salary_period'] ?? 'Monthly'));
    $employment_type = trim((string) ($in['employment_type'] ?? ''));
    $work_schedule   = trim((string) ($in['work_schedule'] ?? ''));
    $description     = trim((string) ($in['description'] ?? ''));
    $start_date      = trim((string) ($in['start_date'] ?? '')) ?: null;

    // These are required for the same reason they are required on a public
    // post — they are the terms being agreed to, not metadata.
    if ($title === '')           dh_out(false, 'Please give the job a title.');
    if ($category_id <= 0)       dh_out(false, 'Please choose a work category.');
    if ($employment_type === '') dh_out(false, 'Please choose stay-in or stay-out.');
    if ($work_schedule === '')   dh_out(false, 'Please choose full-time or part-time.');
    if ($salary <= 0)            dh_out(false, 'Please state the salary you are offering.');
    if (strcasecmp($salary_period, 'Monthly') === 0 && $salary < DIRECT_HIRE_MIN_MONTHLY) {
        dh_out(false, 'The monthly salary must be at least ₱' . number_format(DIRECT_HIRE_MIN_MONTHLY) . '.');
    }

    // ── Both parties must be who they claim to be ────────────────────────────
    $chk = $conn->prepare("SELECT user_id, user_type FROM users WHERE user_id IN (?, ?)");
    $chk->bind_param('ii', $parent_id, $helper_id);
    $chk->execute();
    $roles = [];
    $res = $chk->get_result();
    while ($r = $res->fetch_assoc()) $roles[(int) $r['user_id']] = $r['user_type'];
    $chk->close();

    if (($roles[$parent_id] ?? '') !== 'parent') dh_out(false, 'Only employer accounts can send hire offers.');
    if (($roles[$helper_id] ?? '') !== 'helper') dh_out(false, 'That account is not a helper.');

    // Hiring is the strongest action on the platform, so both sides must be
    // PESO-verified before an offer can even be created. Without this a pending
    // employer could put a private offer in a helper's inbox.
    require_once __DIR__ . '/../shared/verification_guard.php';
    if (!carelink_is_verified($conn, $parent_id)) {
        dh_out(false, 'Your account is still being verified by PESO. You can send hire offers once you are verified.');
    }
    if (!carelink_is_verified($conn, $helper_id)) {
        dh_out(false, 'This helper is still awaiting PESO verification, so they cannot receive a hire offer yet.');
    }

    // A helper already in an active placement is not available to be hired.
    $busy = $conn->prepare(
        "SELECT 1 FROM job_applications
          WHERE helper_id = ? AND status IN ('hired','Accepted','termination_pending')
          LIMIT 1"
    );
    $busy->bind_param('i', $helper_id);
    $busy->execute();
    $isBusy = (bool) $busy->get_result()->fetch_assoc();
    $busy->close();
    if ($isBusy) dh_out(false, 'This helper is currently employed and is not available for a new offer.');

    ensure_job_invites_table($conn);

    // Don't let an employer stack duplicate pending offers on one helper.
    $dupe = $conn->prepare(
        "SELECT ji.invite_id FROM job_invites ji
           JOIN job_posts jp ON jp.job_post_id = ji.job_post_id
          WHERE ji.parent_id = ? AND ji.helper_id = ?
            AND ji.status = 'pending' AND jp.visibility = 'direct_hire'
          LIMIT 1"
    );
    $dupe->bind_param('ii', $parent_id, $helper_id);
    $dupe->execute();
    $hasPending = (bool) $dupe->get_result()->fetch_assoc();
    $dupe->close();
    if ($hasPending) dh_out(false, 'You already have a pending direct hire offer with this helper.');

    $conn->begin_transaction();
    try {
        // Status 'Pending' — a direct hire offer goes through PESO review just
        // like a public post. That is the non-negotiable part.
        // Roles and skills are JSON columns on job_posts (job_ids / skill_ids),
        // matching how parent/post_job.php stores a public post — same shape, so
        // everything downstream reads a direct-hire post identically.
        $job_ids_json   = json_encode(array_values(array_filter(
            array_map('intval', (array) ($in['job_ids'] ?? [])), fn($v) => $v > 0)));
        $skill_ids_json = json_encode(array_values(array_filter(
            array_map('intval', (array) ($in['skill_ids'] ?? [])), fn($v) => $v > 0)));

        // description is NOT NULL on job_posts — fall back to the terms rather
        // than failing the insert on an employer who left it blank.
        if ($description === '') {
            $description = "Direct hire offer for {$title}. "
                . "{$employment_type}, {$work_schedule}. Terms as agreed with the helper.";
        }

        $ins = $conn->prepare(
            "INSERT INTO job_posts
                (parent_id, category_id, job_ids, title, description,
                 employment_type, work_schedule, salary_offered, salary_period,
                 skill_ids, start_date, status, visibility, posted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'direct_hire', NOW())"
        );
        if (!$ins) throw new Exception('Prepare failed: ' . $conn->error);
        $ins->bind_param(
            'iisssssdsss',
            $parent_id, $category_id, $job_ids_json, $title, $description,
            $employment_type, $work_schedule, $salary, $salary_period,
            $skill_ids_json, $start_date
        );
        if (!$ins->execute()) throw new Exception('Could not create the offer: ' . $ins->error);
        $job_post_id = $conn->insert_id;
        $ins->close();

        // The invite is recorded but NOT delivered. The helper is told nothing
        // until PESO approves the terms — see shared/direct_hire.php for why.
        // message_id is 0 until delivery fills it in.
        $inv = $conn->prepare(
            "INSERT INTO job_invites (message_id, job_post_id, parent_id, helper_id, status)
             VALUES (0, ?, ?, ?, ?)"
        );
        if (!$inv) throw new Exception('Prepare failed: ' . $conn->error);
        $awaiting = DIRECT_HIRE_AWAITING;
        $inv->bind_param('iiis', $job_post_id, $parent_id, $helper_id, $awaiting);
        $inv->execute();
        $inv->close();

        $conn->commit();

        // Only the EMPLOYER hears about it at this stage.
        createNotification(
            $conn, $parent_id, 'job_verified', 'Offer sent for PESO review',
            "Your direct hire offer for \"{$title}\" is with PESO. Once they approve the terms, "
            . 'it goes straight to the helper and you will be notified.',
            'job', $job_post_id
        );

        dh_out(true, 'Offer sent to PESO for review. The helper will receive it once the terms are approved.', [
            'job_post_id' => $job_post_id,
            'awaiting_peso' => true,
        ]);
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }
} catch (Throwable $e) {
    error_log('create_direct_hire_offer.php: ' . $e->getMessage());
    dh_out(false, 'Could not send the offer. Please try again.');
}
