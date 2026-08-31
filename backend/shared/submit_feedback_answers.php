<?php
/**
 * shared/submit_feedback_answers.php — save answers to the persistent
 * feedback instrument (see get_feedback_status.php).
 *
 * POST JSON: { user_id, requester_id, user_type, answers: [
 *   { question_id, rating_value? (1-5), text_value? }
 * ] }
 *
 * Upserts per question (ON DUPLICATE KEY UPDATE) rather than rejecting a
 * resubmit — the frontend only ever sends unanswered questions, but a
 * network retry must not surface as an error.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/ownership_guard.php';
require_once __DIR__ . '/feedback_questions_table.php';

function sfa_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $user_id      = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;
    $user_type    = trim((string) ($input['user_type'] ?? ''));
    $answers      = is_array($input['answers'] ?? null) ? $input['answers'] : [];

    if ($user_id <= 0) sfa_out(false, 'user_id is required.');
    carelink_require_self($requester_id, $user_id, 'You are not allowed to submit feedback for this account.');
    if (!in_array($user_type, ['helper', 'parent', 'peso'], true)) {
        sfa_out(false, 'user_type must be helper, parent or peso.');
    }
    if (empty($answers)) sfa_out(false, 'No answers were submitted.');

    ensure_feedback_questions_table($conn);

    // Validate question ids belong to the real instrument before writing —
    // never trust question_id values verbatim from the client.
    $validIds = [];
    $qres = $conn->query("SELECT question_id, question_type FROM feedback_questions WHERE active = 1");
    while ($qres && $row = $qres->fetch_assoc()) {
        $validIds[(int) $row['question_id']] = $row['question_type'];
    }

    $stmt = $conn->prepare(
        "INSERT INTO feedback_answers (user_id, user_type, question_id, rating_value, text_value)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating_value = VALUES(rating_value), text_value = VALUES(text_value)"
    );
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);

    $saved = 0;
    foreach ($answers as $a) {
        $qid = isset($a['question_id']) ? (int) $a['question_id'] : 0;
        if ($qid <= 0 || !isset($validIds[$qid])) continue;

        $type = $validIds[$qid];
        $rating = null;
        $text   = null;
        if ($type === 'rating') {
            $n = isset($a['rating_value']) ? (int) $a['rating_value'] : 0;
            if ($n < 1 || $n > 5) continue; // skip unanswered rating rather than saving a bad value
            $rating = $n;
        } else {
            $t = trim((string) ($a['text_value'] ?? ''));
            if ($t === '') continue; // optional — skip rather than saving an empty row
            $text = mb_substr($t, 0, 2000);
        }

        $stmt->bind_param('isiis', $user_id, $user_type, $qid, $rating, $text);
        if ($stmt->execute()) $saved++;
    }
    $stmt->close();

    sfa_out(true, $saved > 0 ? 'Thank you — your feedback has been saved.' : 'No answers were saved.', ['saved' => $saved]);
} catch (Throwable $e) {
    error_log('submit_feedback_answers.php: ' . $e->getMessage());
    sfa_out(false, 'Could not save your feedback. Please try again.');
}
