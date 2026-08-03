<?php
/**
 * peso/demo_actions.php — drives the MOCK EMPLOYER side of a user-test session
 * from inside the PESO portal, so the researcher only ever wears one hat.
 *
 * GET  ?staff_user_id=&helper_id=      -> a HELPER tester's current demo state
 * GET  ?staff_user_id=&parent_id=      -> an EMPLOYER tester's current demo state
 * POST ?staff_user_id=  {action, ...}  -> perform one mock action
 *
 * Both sides of the marketplace can be driven, because either role can be the
 * tester:
 *   helper tester  -> the panel plays the mock EMPLOYER (invite, shortlist,
 *                     interview, contract)
 *   employer tester -> the panel plays mock HELPERS (apply to their job posts)
 *
 * Actions: invite · shortlist · interview · apply
 * (The contract step is the real parent/hire_helper.php, called by the panel —
 *  it owns ~300 lines of contract generation that must not be duplicated here.)
 *
 * SAFETY — two independent gates on every request:
 *   1. peso_require_staff() — caller must be an approved PESO account.
 *   2. Every target employer is re-checked against the demo email domain, so
 *      this endpoint can never act on behalf of a real household.
 * Do not relax either one.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../shared/create_notification.php';

const DEMO_EMAIL = '%@carelink-demo.test';

function da_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

/** Throws unless this job post belongs to a seeded demo employer. */
function da_demo_job(mysqli $conn, int $job_post_id): array
{
    $pattern = DEMO_EMAIL;
    $st = $conn->prepare(
        "SELECT jp.job_post_id, jp.title, jp.parent_id,
                CONCAT(u.first_name,' ',u.last_name) AS parent_name
           FROM job_posts jp
           JOIN users u ON u.user_id = jp.parent_id
          WHERE jp.job_post_id = ? AND u.email LIKE ?
          LIMIT 1"
    );
    $st->bind_param('is', $job_post_id, $pattern);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) {
        throw new Exception('That job post is not one of the demo employers. Run demo_seed.sql first.');
    }
    return $row;
}

/** Throws unless this application is against a demo employer's post. */
function da_demo_application(mysqli $conn, int $application_id): array
{
    $pattern = DEMO_EMAIL;
    $st = $conn->prepare(
        "SELECT ja.application_id, ja.helper_id, ja.status, ja.job_post_id,
                jp.parent_id, jp.title,
                CONCAT(u.first_name,' ',u.last_name) AS parent_name
           FROM job_applications ja
           JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
           JOIN users u      ON u.user_id      = jp.parent_id
          WHERE ja.application_id = ? AND u.email LIKE ?
          LIMIT 1"
    );
    $st->bind_param('is', $application_id, $pattern);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) {
        throw new Exception('That application is not against a demo employer.');
    }
    return $row;
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    peso_require_staff($conn);

    // ── GET: the tester's current state, so the panel can offer the right step ──
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;
        $parent_id = isset($_GET['parent_id']) ? (int) $_GET['parent_id'] : 0;
        $pattern   = DEMO_EMAIL;

        // ── EMPLOYER TESTER: their own job posts, and which demo helpers have
        //    already applied to each, so the panel can offer the next applicant.
        if ($parent_id > 0) {
            $posts = [];
            $st = $conn->prepare(
                "SELECT jp.job_post_id, jp.title, jp.status, rc.category_name,
                        (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_post_id = jp.job_post_id) AS applicants
                   FROM job_posts jp
                   LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
                  WHERE jp.parent_id = ?
                  ORDER BY jp.posted_at DESC"
            );
            $st->bind_param('i', $parent_id);
            $st->execute();
            $r = $st->get_result();
            while ($row = $r->fetch_assoc()) {
                $row['job_post_id'] = (int) $row['job_post_id'];
                $row['applicants']  = (int) $row['applicants'];
                $posts[] = $row;
            }
            $st->close();

            // The demo helpers available to apply on the panel's behalf.
            $helpers = [];
            $st = $conn->prepare(
                "SELECT u.user_id, CONCAT(u.first_name,' ',u.last_name) AS name,
                        hp.experience_years, hp.expected_salary, hp.employment_type,
                        GROUP_CONCAT(DISTINCT rc.category_name ORDER BY rc.category_name SEPARATOR ', ') AS categories
                   FROM users u
                   JOIN helper_profiles hp ON hp.user_id = u.user_id
                   LEFT JOIN helper_jobs hj ON hj.profile_id = hp.profile_id
                   LEFT JOIN ref_jobs rj    ON rj.job_id = hj.job_id
                   LEFT JOIN ref_categories rc ON rc.category_id = rj.category_id
                  WHERE u.email LIKE ? AND u.user_type = 'helper'
                  GROUP BY u.user_id
                  ORDER BY hp.experience_years DESC"
            );
            $st->bind_param('s', $pattern);
            $st->execute();
            $r = $st->get_result();
            while ($row = $r->fetch_assoc()) {
                $row['user_id']           = (int) $row['user_id'];
                $row['experience_years']  = (int) $row['experience_years'];
                $helpers[] = $row;
            }
            $st->close();

            // Which demo helpers have already applied to which of this
            // employer's posts, so the panel doesn't offer a duplicate.
            $applied = [];
            $st = $conn->prepare(
                "SELECT ja.job_post_id, ja.helper_id, ja.status
                   FROM job_applications ja
                   JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
                   JOIN users u      ON u.user_id = ja.helper_id
                  WHERE jp.parent_id = ? AND u.email LIKE ?"
            );
            $st->bind_param('is', $parent_id, $pattern);
            $st->execute();
            $r = $st->get_result();
            while ($row = $r->fetch_assoc()) {
                $applied[] = [
                    'job_post_id' => (int) $row['job_post_id'],
                    'helper_id'   => (int) $row['helper_id'],
                    'status'      => $row['status'],
                ];
            }
            $st->close();

            da_out(true, 'ok', ['posts' => $posts, 'demo_helpers' => $helpers, 'applied' => $applied]);
        }

        $jobs = [];
        $st = $conn->prepare(
            "SELECT jp.job_post_id, jp.title, jp.parent_id, rc.category_name,
                    CONCAT(u.first_name,' ',u.last_name) AS parent_name
               FROM job_posts jp
               JOIN users u ON u.user_id = jp.parent_id
               LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
              WHERE u.email LIKE ? AND jp.status = 'Open'
              ORDER BY rc.category_name, jp.job_post_id"
        );
        $st->bind_param('s', $pattern);
        $st->execute();
        $r = $st->get_result();
        while ($row = $r->fetch_assoc()) {
            $row['job_post_id'] = (int) $row['job_post_id'];
            $row['parent_id']   = (int) $row['parent_id'];
            $jobs[] = $row;
        }
        $st->close();

        $apps = [];
        if ($helper_id > 0) {
            $st = $conn->prepare(
                "SELECT ja.application_id, ja.status, ja.applied_at,
                        jp.job_post_id, jp.title, jp.parent_id,
                        CONCAT(u.first_name,' ',u.last_name) AS parent_name,
                        (SELECT COUNT(*) FROM interview_schedules isch
                          WHERE isch.application_id = ja.application_id) AS interview_count
                   FROM job_applications ja
                   JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
                   JOIN users u      ON u.user_id      = jp.parent_id
                  WHERE ja.helper_id = ? AND u.email LIKE ?
                  ORDER BY ja.applied_at DESC"
            );
            $st->bind_param('is', $helper_id, $pattern);
            $st->execute();
            $r = $st->get_result();
            while ($row = $r->fetch_assoc()) {
                $row['application_id']  = (int) $row['application_id'];
                $row['job_post_id']     = (int) $row['job_post_id'];
                $row['parent_id']       = (int) $row['parent_id'];
                $row['interview_count'] = (int) $row['interview_count'];
                $apps[] = $row;
            }
            $st->close();
        }

        $invites = [];
        if ($helper_id > 0) {
            $st = $conn->prepare(
                "SELECT ji.invite_id, ji.job_post_id, ji.status, jp.title
                   FROM job_invites ji
                   JOIN job_posts jp ON jp.job_post_id = ji.job_post_id
                   JOIN users u      ON u.user_id      = ji.parent_id
                  WHERE ji.helper_id = ? AND u.email LIKE ?"
            );
            $st->bind_param('is', $helper_id, $pattern);
            $st->execute();
            $r = $st->get_result();
            while ($row = $r->fetch_assoc()) { $invites[] = $row; }
            $st->close();
        }

        da_out(true, 'ok', ['jobs' => $jobs, 'applications' => $apps, 'invites' => $invites]);
    }

    // ── POST: perform one action ────────────────────────────────────────────
    $input  = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = trim((string) ($input['action'] ?? ''));

    if ($action === 'invite') {
        $helper_id   = (int) ($input['helper_id'] ?? 0);
        $job_post_id = (int) ($input['job_post_id'] ?? 0);
        if ($helper_id <= 0 || $job_post_id <= 0) {
            da_out(false, 'helper_id and job_post_id are required.');
        }
        $job = da_demo_job($conn, $job_post_id);

        $dupe = $conn->prepare("SELECT invite_id FROM job_invites WHERE parent_id = ? AND helper_id = ? AND job_post_id = ? LIMIT 1");
        $dupe->bind_param('iii', $job['parent_id'], $helper_id, $job_post_id);
        $dupe->execute();
        $already = $dupe->get_result()->fetch_assoc();
        $dupe->close();
        if ($already) {
            da_out(false, 'This helper has already been invited to that job.');
        }

        $text = "Hi! I'd like to invite you to apply for my job posting: \"{$job['title']}\". "
              . "Please check the job listing and apply if you're interested. Looking forward to hearing from you!";

        $st = $conn->prepare(
            "INSERT INTO messages (sender_id, receiver_id, message_text, job_post_id, message_type, sent_at)
             VALUES (?, ?, ?, ?, 'job_invite', NOW())"
        );
        $st->bind_param('iisi', $job['parent_id'], $helper_id, $text, $job_post_id);
        $st->execute();
        $message_id = $conn->insert_id;
        $st->close();

        $st = $conn->prepare(
            "INSERT INTO job_invites (message_id, job_post_id, parent_id, helper_id, status)
             VALUES (?, ?, ?, ?, 'pending')"
        );
        $st->bind_param('iiii', $message_id, $job_post_id, $job['parent_id'], $helper_id);
        $st->execute();
        $st->close();

        createNotification(
            $conn, $helper_id, 'job_invite', 'Job Invitation',
            "{$job['parent_name']} invited you to apply for \"{$job['title']}\"",
            'job', $job_post_id
        );

        da_out(true, "Invitation sent from {$job['parent_name']}.");
    }

    // EMPLOYER TESTER: a mock helper applies to one of their posts, so they have
    // someone real to review. Mirrors helper/apply_job.php's insert — the same
    // row shape, so every downstream screen and the matcher treat it normally.
    if ($action === 'apply') {
        $helper_id   = (int) ($input['helper_id'] ?? 0);
        $job_post_id = (int) ($input['job_post_id'] ?? 0);
        if ($helper_id <= 0 || $job_post_id <= 0) {
            da_out(false, 'helper_id and job_post_id are required.');
        }

        // The APPLICANT must be a demo helper — this endpoint may never make a
        // real person appear to have applied to something.
        $pattern = DEMO_EMAIL;
        $chk = $conn->prepare("SELECT user_id, CONCAT(first_name,' ',last_name) AS name FROM users WHERE user_id = ? AND user_type = 'helper' AND email LIKE ? LIMIT 1");
        $chk->bind_param('is', $helper_id, $pattern);
        $chk->execute();
        $helper = $chk->get_result()->fetch_assoc();
        $chk->close();
        if (!$helper) {
            da_out(false, 'That helper is not one of the demo accounts.');
        }

        $jobStmt = $conn->prepare("SELECT job_post_id, title, status, parent_id FROM job_posts WHERE job_post_id = ? LIMIT 1");
        $jobStmt->bind_param('i', $job_post_id);
        $jobStmt->execute();
        $job = $jobStmt->get_result()->fetch_assoc();
        $jobStmt->close();
        if (!$job) da_out(false, 'Job post not found.');
        if ($job['status'] !== 'Open') {
            da_out(false, 'That post is not Open yet — approve it in Job Verification first.');
        }

        $dupe = $conn->prepare("SELECT application_id FROM job_applications WHERE job_post_id = ? AND helper_id = ? LIMIT 1");
        $dupe->bind_param('ii', $job_post_id, $helper_id);
        $dupe->execute();
        $already = $dupe->get_result()->fetch_assoc();
        $dupe->close();
        if ($already) da_out(false, 'That helper has already applied to this job.');

        $letter = "Good day! I am very interested in your \"{$job['title']}\" posting. "
                . "I believe my experience fits what you are looking for, and I would be grateful "
                . "for the chance to discuss it with you. Thank you for considering my application.";

        $st = $conn->prepare(
            "INSERT INTO job_applications (job_post_id, helper_id, cover_letter, status, applied_at)
             VALUES (?, ?, ?, 'Pending', NOW())"
        );
        $st->bind_param('iis', $job_post_id, $helper_id, $letter);
        $st->execute();
        $application_id = (int) $conn->insert_id;
        $st->close();

        createNotification(
            $conn, (int) $job['parent_id'], 'application_received', 'New Application Received',
            $helper['name'] . ' applied for your job: ' . $job['title'],
            'application', $application_id
        );

        da_out(true, $helper['name'] . ' applied to "' . $job['title'] . '".');
    }

    if ($action === 'shortlist') {
        $application_id = (int) ($input['application_id'] ?? 0);
        if ($application_id <= 0) da_out(false, 'application_id is required.');
        $app = da_demo_application($conn, $application_id);

        $st = $conn->prepare("UPDATE job_applications SET status = 'Shortlisted', updated_at = NOW() WHERE application_id = ?");
        $st->bind_param('i', $application_id);
        $st->execute();
        $st->close();

        createNotification(
            $conn, (int) $app['helper_id'], 'status_changed', 'You were shortlisted!',
            "{$app['parent_name']} shortlisted you for \"{$app['title']}\".",
            'application', $application_id
        );

        da_out(true, 'Application shortlisted.');
    }

    if ($action === 'interview') {
        $application_id = (int) ($input['application_id'] ?? 0);
        if ($application_id <= 0) da_out(false, 'application_id is required.');
        $app = da_demo_application($conn, $application_id);

        // Default to tomorrow mid-morning so the tester sees a realistic, future
        // slot without the operator having to type a date.
        $when = trim((string) ($input['interview_date'] ?? ''));
        if ($when === '') {
            $when = date('Y-m-d H:i:s', strtotime('tomorrow 10:00'));
        }
        $type = trim((string) ($input['interview_type'] ?? 'Video Call'));
        $link = trim((string) ($input['location_or_link'] ?? ''));
        if ($link === '' && $type === 'Video Call') {
            $link = 'https://meet.jit.si/carelink-demo-' . $application_id;
        }
        $notes = 'Demo interview created from the PESO test panel.';

        $del = $conn->prepare("DELETE FROM interview_schedules WHERE application_id = ?");
        $del->bind_param('i', $application_id);
        $del->execute();
        $del->close();

        $st = $conn->prepare(
            "INSERT INTO interview_schedules
                (application_id, interview_date, interview_type, location_or_link, notes, status, parent_confirmed)
             VALUES (?, ?, ?, ?, ?, 'Scheduled', 1)"
        );
        $st->bind_param('issss', $application_id, $when, $type, $link, $notes);
        $st->execute();
        $st->close();

        $conn->query("UPDATE job_applications SET status = 'Interview Scheduled', updated_at = NOW() WHERE application_id = " . (int) $application_id);

        createNotification(
            $conn, (int) $app['helper_id'], 'interview_scheduled', 'Interview scheduled',
            "{$app['parent_name']} scheduled an interview for \"{$app['title']}\".",
            'application', $application_id
        );

        da_out(true, 'Interview scheduled for ' . date('M j, g:i A', strtotime($when)) . '.');
    }

    da_out(false, 'Unknown action.');
} catch (Throwable $e) {
    error_log('demo_actions.php: ' . $e->getMessage());
    da_out(false, $e->getMessage());
}
