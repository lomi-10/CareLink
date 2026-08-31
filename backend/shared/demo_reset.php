<?php
/**
 * shared/demo_reset.php — clear one tester's activity with the DEMO employers,
 * so they can sign in again to a clean, real account.
 *
 * POST JSON: user_id, requester_id
 *
 * SAFETY — read before editing:
 * Every statement here is scoped by a subquery on the demo email domain:
 *
 *     parent_id IN (SELECT user_id FROM users WHERE email LIKE '%@carelink-demo.test')
 *
 * That means the endpoint is structurally incapable of touching a real
 * employer's data, even if it is called with a wrong or hostile user_id. Do NOT
 * "simplify" any statement by dropping that subquery. If the demo seed was never
 * run, the subquery is empty and every DELETE is a no-op.
 *
 * The tester's OWN account, profile and documents are deliberately kept — they
 * signed up for real, and only their interactions with fake employers are undone.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/ownership_guard.php';

const DEMO_EMAIL_PATTERN = '%@carelink-demo.test';

function dr_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

/** Run one scoped DELETE, returning how many rows went. */
function dr_exec(mysqli $conn, string $sql, string $types, array $params): int
{
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }
    $n = $stmt->affected_rows;
    $stmt->close();
    return $n;
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $user_id      = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;

    if ($user_id <= 0) {
        dr_out(false, 'user_id is required.');
    }
    carelink_require_self($requester_id, $user_id, 'You are not allowed to reset this account.');

    $d = DEMO_EMAIL_PATTERN;
    $removed = [];

    $conn->begin_transaction();

    // Order matters: rows that reference others go first, so nothing is orphaned
    // if a foreign key lacks ON DELETE CASCADE.

    // 1. Placements (FKs to applications/job_posts are SET NULL, so these would
    //    otherwise survive as orphans with a NULL application_id).
    $removed['placements'] = dr_exec(
        $conn,
        "DELETE FROM placements
          WHERE helper_id = ?
            AND parent_id IN (SELECT user_id FROM users WHERE email LIKE ?)",
        'is',
        [$user_id, $d]
    );

    // 2. Job invites from demo employers.
    $conn->query("CREATE TABLE IF NOT EXISTS job_invites (
        invite_id INT AUTO_INCREMENT PRIMARY KEY, message_id INT NOT NULL,
        job_post_id INT NOT NULL, parent_id INT NOT NULL, helper_id INT NOT NULL,
        status VARCHAR(12) NOT NULL DEFAULT 'pending', responded_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_invite (parent_id, helper_id, job_post_id),
        KEY idx_msg (message_id), KEY idx_helper (helper_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

    $removed['invites'] = dr_exec(
        $conn,
        "DELETE FROM job_invites
          WHERE helper_id = ?
            AND parent_id IN (SELECT user_id FROM users WHERE email LIKE ?)",
        'is',
        [$user_id, $d]
    );

    // 3. Applications to demo job posts. Cascades to interview_schedules,
    //    application_tasks, attendance_logs, placement_tasks and shared documents.
    $removed['applications'] = dr_exec(
        $conn,
        "DELETE FROM job_applications
          WHERE helper_id = ?
            AND job_post_id IN (
                SELECT jp.job_post_id FROM job_posts jp
                 WHERE jp.parent_id IN (SELECT user_id FROM users WHERE email LIKE ?)
            )",
        'is',
        [$user_id, $d]
    );

    // 4. Saved demo jobs.
    $removed['saved_jobs'] = dr_exec(
        $conn,
        "DELETE FROM saved_jobs
          WHERE helper_id = ?
            AND job_post_id IN (
                SELECT jp.job_post_id FROM job_posts jp
                 WHERE jp.parent_id IN (SELECT user_id FROM users WHERE email LIKE ?)
            )",
        'is',
        [$user_id, $d]
    );

    // 5. Chat with demo employers, in both directions.
    $removed['messages'] = dr_exec(
        $conn,
        "DELETE FROM messages
          WHERE (
                  (sender_id = ?   AND receiver_id IN (SELECT user_id FROM users WHERE email LIKE ?))
               OR (receiver_id = ? AND sender_id   IN (SELECT user_id FROM users WHERE email LIKE ?))
              )",
        'isis',
        [$user_id, $d, $user_id, $d]
    );

    // 6. Peer reviews exchanged with demo employers (these feed rating averages).
    $removed['reviews'] = dr_exec(
        $conn,
        "DELETE FROM placement_reviews
          WHERE (
                  (reviewer_id = ? AND reviewee_id IN (SELECT user_id FROM users WHERE email LIKE ?))
               OR (reviewee_id = ? AND reviewer_id IN (SELECT user_id FROM users WHERE email LIKE ?))
              )",
        'isis',
        [$user_id, $d, $user_id, $d]
    );

    // The helper's cached rating came from those reviews — recompute from what's
    // left rather than leaving a score with no reviews behind it.
    $rc = $conn->prepare(
        "UPDATE helper_profiles hp
            SET hp.rating_average = COALESCE((
                    SELECT AVG(pr.rating) FROM placement_reviews pr
                     WHERE pr.reviewee_id = ? AND pr.is_visible = 1), 0),
                hp.rating_count = COALESCE((
                    SELECT COUNT(*) FROM placement_reviews pr
                     WHERE pr.reviewee_id = ? AND pr.is_visible = 1), 0)
          WHERE hp.user_id = ?"
    );
    if ($rc) {
        $rc->bind_param('iii', $user_id, $user_id, $user_id);
        $rc->execute();
        $rc->close();
    }

    $conn->commit();

    dr_out(true, 'Your demo activity has been cleared.', ['removed' => $removed]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        @$conn->rollback();
    }
    error_log('demo_reset.php: ' . $e->getMessage());
    dr_out(false, 'Could not clear the demo data. Please try again.');
}
