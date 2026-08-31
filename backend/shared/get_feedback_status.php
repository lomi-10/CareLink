<?php
/**
 * shared/get_feedback_status.php — which feedback questions (if any) a user
 * still hasn't answered.
 *
 * GET ?user_id=&requester_id=&user_type=(helper|parent|peso)
 * -> { success, questions: [...unanswered, in order], answered_count, total_count }
 *
 * An empty `questions` array with answered_count === total_count means the
 * user has answered everything currently in the instrument — the frontend
 * shows "No questions available right now" instead of an empty form.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/ownership_guard.php';
require_once __DIR__ . '/feedback_questions_table.php';

function gfs_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $user_id      = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;
    $user_type    = trim((string) ($_GET['user_type'] ?? ''));

    if ($user_id <= 0) gfs_out(false, 'user_id is required.');
    carelink_require_self($requester_id, $user_id, 'You are not allowed to view this.');
    if (!in_array($user_type, ['helper', 'parent', 'peso'], true)) {
        gfs_out(false, 'user_type must be helper, parent or peso.');
    }

    ensure_feedback_questions_table($conn);

    $stmt = $conn->prepare(
        "SELECT q.question_id, q.code, q.question_text, q.question_type
           FROM feedback_questions q
          WHERE q.active = 1 AND (q.applies_to = 'all' OR q.applies_to = ?)
            AND NOT EXISTS (
                SELECT 1 FROM feedback_answers a
                 WHERE a.user_id = ? AND a.question_id = q.question_id
            )
          ORDER BY q.sort_order ASC"
    );
    $stmt->bind_param('si', $user_type, $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $questions = [];
    while ($row = $res->fetch_assoc()) {
        $questions[] = [
            'question_id'   => (int) $row['question_id'],
            'code'          => $row['code'],
            'question_text' => $row['question_text'],
            'question_type' => $row['question_type'],
        ];
    }
    $stmt->close();

    $total = (int) ($conn->query(
        "SELECT COUNT(*) c FROM feedback_questions WHERE active = 1 AND (applies_to = 'all' OR applies_to = '"
        . $conn->real_escape_string($user_type) . "')"
    )->fetch_assoc()['c'] ?? 0);

    gfs_out(true, 'ok', [
        'questions'       => $questions,
        'answered_count'  => $total - count($questions),
        'total_count'     => $total,
    ]);
} catch (Throwable $e) {
    error_log('get_feedback_status.php: ' . $e->getMessage());
    gfs_out(false, 'Could not load feedback questions.');
}
