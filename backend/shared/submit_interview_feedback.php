<?php
/**
 * shared/submit_interview_feedback.php
 *
 * A helper or an employer rates the interview they attended.
 *
 * WHO SEES WHAT:
 *   rating  — PESO tallies it; it does not appear on the other party's profile.
 *   comment — PESO and super admin ONLY. The other party never sees it, on any
 *             screen or in any notification. That is the whole reason people
 *             answer honestly, and for a kasambahay reporting an employer it is
 *             the difference between a candid answer and a safe one.
 *
 * POST { interview_id, user_id, rating, comment?, other_attended? }
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/interview_feedback_table.php';
require_once __DIR__ . '/ownership_guard.php';

function out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $interviewId = (int) ($in['interview_id'] ?? 0);
    $userId      = (int) ($in['user_id'] ?? 0);
    $requester   = (int) ($in['requester_id'] ?? $userId);
    $rating      = (int) ($in['rating'] ?? 0);
    $comment     = trim((string) ($in['comment'] ?? ''));
    $otherAttended = array_key_exists('other_attended', $in) ? (!empty($in['other_attended']) ? 1 : 0) : null;

    if ($interviewId <= 0 || $userId <= 0) throw new Exception('interview_id and user_id are required.');
    if ($rating < 1 || $rating > 5) throw new Exception('Please give a rating from 1 to 5.');

    carelink_require_self($requester, $userId, 'You can only submit your own feedback.');
    ensure_interview_feedback_table($conn);

    // The role is resolved from the interview itself, so a request cannot claim
    // to be the other party.
    $st = $conn->prepare(
        "SELECT ja.helper_id, jp.parent_id
         FROM interview_schedules isch
         INNER JOIN job_applications ja ON ja.application_id = isch.application_id
         INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
         WHERE isch.interview_id = ? LIMIT 1"
    );
    $st->bind_param('i', $interviewId);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) throw new Exception('Interview not found.');

    $role = null;
    if ((int) $row['helper_id'] === $userId) $role = 'helper';
    elseif ((int) $row['parent_id'] === $userId) $role = 'employer';
    if ($role === null) throw new Exception('You were not part of this interview.');

    $ins = $conn->prepare(
        'INSERT INTO interview_feedback (interview_id, user_id, role, rating, comment, other_attended)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment),
                                 other_attended = VALUES(other_attended), created_at = NOW()'
    );
    $commentOrNull = $comment !== '' ? $comment : null;
    $ins->bind_param('iisisi', $interviewId, $userId, $role, $rating, $commentOrNull, $otherAttended);
    $ins->execute();
    $ins->close();

    out(true, 'Thank you. Your feedback goes to PESO only — the other party will not see it.');

} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
