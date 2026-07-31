<?php
/**
 * shared/submit_feedback.php — record a user's feedback about CareLink itself.
 *
 * POST JSON: user_id, requester_id, user_type (helper|parent|peso),
 *            overall_rating (1-5), ease_of_use?, trust?, would_use? (1-5),
 *            liked_most?, confusing_part?, context? (default 'general')
 *
 * NOT the same as submit_placement_review.php — that rates the other PERSON and
 * feeds matching. This rates the SYSTEM and feeds the Chapter 4 evaluation.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/ownership_guard.php';
require_once __DIR__ . '/system_feedback_table.php';

function fb_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

/** Clamp an optional 1-5 Likert answer, or null when not answered. */
function fb_likert($v): ?int
{
    if ($v === null || $v === '') return null;
    $n = (int) $v;
    return ($n >= 1 && $n <= 5) ? $n : null;
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $user_id      = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;
    $user_type    = trim((string) ($input['user_type'] ?? ''));
    $overall      = isset($input['overall_rating']) ? (int) $input['overall_rating'] : 0;

    if ($user_id <= 0) {
        fb_out(false, 'user_id is required.');
    }
    carelink_require_self($requester_id, $user_id, 'You are not allowed to submit feedback for this account.');

    if (!in_array($user_type, ['helper', 'parent', 'peso'], true)) {
        fb_out(false, 'user_type must be helper, parent or peso.');
    }
    if ($overall < 1 || $overall > 5) {
        fb_out(false, 'Please choose a star rating.');
    }

    // Free text is trimmed and capped rather than rejected — a tester mid-session
    // should never lose their answer to a validation error.
    $liked     = mb_substr(trim((string) ($input['liked_most'] ?? '')), 0, 2000);
    $confusing = mb_substr(trim((string) ($input['confusing_part'] ?? '')), 0, 2000);
    $context   = mb_substr(trim((string) ($input['context'] ?? 'general')), 0, 32) ?: 'general';

    $ease  = fb_likert($input['ease_of_use'] ?? null);
    $trust = fb_likert($input['trust'] ?? null);
    $would = fb_likert($input['would_use'] ?? null);

    ensure_system_feedback_table($conn);

    $stmt = $conn->prepare(
        "INSERT INTO system_feedback
            (user_id, user_type, overall_rating, ease_of_use, trust, would_use,
             liked_most, confusing_part, context)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    if (!$stmt) {
        throw new Exception('Could not prepare statement: ' . $conn->error);
    }
    $stmt->bind_param(
        'isiiiisss',
        $user_id, $user_type, $overall, $ease, $trust, $would,
        $liked, $confusing, $context
    );
    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }
    $stmt->close();

    fb_out(true, 'Thank you — your feedback has been recorded.');
} catch (Throwable $e) {
    error_log('submit_feedback.php: ' . $e->getMessage());
    fb_out(false, 'Could not save your feedback. Please try again.');
}
