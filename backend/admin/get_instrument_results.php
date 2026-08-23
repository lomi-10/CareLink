<?php
/**
 * admin/get_instrument_results.php — the Chapter 4 evaluation data.
 *
 * Returns the in-app instrument (feedback_questions / feedback_answers) as the
 * analysis a capstone actually reports: a weighted mean per ISO/IEC 25010
 * characteristic, a mean per item, the Likert distribution, and the verbatim
 * open-ended answers.
 *
 * The weighted mean is computed here rather than in a spreadsheet so the number
 * in the defense slides and the number in the app can never disagree.
 *
 * GET ?admin_user_id=..  (super admin only — contains respondent identities)
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/../shared/feedback_questions_table.php';

/** The standard 5-point Likert verbal interpretation used in PH capstones. */
function carelink_likert_label(float $m): string
{
    if ($m >= 4.21) return 'Strongly Agree';
    if ($m >= 3.41) return 'Agree';
    if ($m >= 2.61) return 'Neutral';
    if ($m >= 1.81) return 'Disagree';
    return 'Strongly Disagree';
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    admin_require_staff($conn, isset($_GET['admin_user_id']) ? (int) $_GET['admin_user_id'] : 0);
    ensure_feedback_questions_table($conn);

    $roleFilter = isset($_GET['role']) ? trim((string) $_GET['role']) : '';
    $where = in_array($roleFilter, ['helper', 'parent', 'peso'], true)
        ? " AND a.user_type = '" . $conn->real_escape_string($roleFilter) . "'" : '';

    // Per-item statistics.
    $items = [];
    $res = $conn->query(
        "SELECT q.question_id, q.code, q.question_text, q.question_type, q.applies_to,
                q.iso_characteristic, q.sort_order,
                COUNT(a.answer_id) AS n,
                AVG(a.rating_value) AS mean,
                SUM(a.rating_value = 5) AS c5, SUM(a.rating_value = 4) AS c4,
                SUM(a.rating_value = 3) AS c3, SUM(a.rating_value = 2) AS c2,
                SUM(a.rating_value = 1) AS c1
         FROM feedback_questions q
         LEFT JOIN feedback_answers a ON a.question_id = q.question_id{$where}
         WHERE q.active = 1 AND q.question_type = 'rating'
         GROUP BY q.question_id
         ORDER BY q.sort_order"
    );
    while ($res && ($r = $res->fetch_assoc())) {
        $n = (int) $r['n'];
        $mean = $n > 0 ? round((float) $r['mean'], 2) : null;
        $items[] = [
            'question_id' => (int) $r['question_id'],
            'code' => $r['code'],
            'question_text' => $r['question_text'],
            'applies_to' => $r['applies_to'],
            'iso_characteristic' => $r['iso_characteristic'],
            'n' => $n,
            'mean' => $mean,
            'interpretation' => $mean !== null ? carelink_likert_label($mean) : null,
            'distribution' => [
                '5' => (int) $r['c5'], '4' => (int) $r['c4'], '3' => (int) $r['c3'],
                '2' => (int) $r['c2'], '1' => (int) $r['c1'],
            ],
        ];
    }

    // Weighted mean per ISO characteristic — weighted by response count, so a
    // question answered by 30 people counts for more than one answered by 3.
    $byChar = [];
    foreach ($items as $it) {
        if ($it['mean'] === null || $it['n'] === 0) continue;
        $k = $it['iso_characteristic'];
        if (!isset($byChar[$k])) $byChar[$k] = ['sum' => 0.0, 'n' => 0, 'items' => 0];
        $byChar[$k]['sum'] += $it['mean'] * $it['n'];
        $byChar[$k]['n']   += $it['n'];
        $byChar[$k]['items']++;
    }
    $characteristics = [];
    $grandSum = 0.0; $grandN = 0;
    foreach ($byChar as $name => $v) {
        $m = $v['n'] > 0 ? round($v['sum'] / $v['n'], 2) : null;
        $grandSum += $v['sum']; $grandN += $v['n'];
        $characteristics[] = [
            'characteristic' => $name,
            'items' => $v['items'],
            'responses' => $v['n'],
            'weighted_mean' => $m,
            'interpretation' => $m !== null ? carelink_likert_label($m) : null,
        ];
    }
    usort($characteristics, fn($a, $b) => ($b['weighted_mean'] ?? 0) <=> ($a['weighted_mean'] ?? 0));
    $overall = $grandN > 0 ? round($grandSum / $grandN, 2) : null;

    // Open-ended answers, verbatim — these are what make Chapter 4 readable.
    $openEnded = [];
    $res = $conn->query(
        "SELECT q.code, q.question_text, a.answer_id, a.text_value, a.user_type, a.created_at,
                TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS respondent
         FROM feedback_answers a
         INNER JOIN feedback_questions q ON q.question_id = a.question_id
         LEFT JOIN users u ON u.user_id = a.user_id
         WHERE q.question_type = 'text' AND a.text_value IS NOT NULL AND TRIM(a.text_value) <> ''
         ORDER BY q.sort_order, a.created_at DESC"
    );
    while ($res && ($r = $res->fetch_assoc())) {
        $openEnded[] = [
            'answer_id' => (int) $r['answer_id'],
            'code' => $r['code'],
            'question_text' => $r['question_text'],
            'text' => $r['text_value'],
            'user_type' => $r['user_type'],
            'respondent' => trim((string) $r['respondent']) ?: 'Respondent',
            'created_at' => $r['created_at'],
        ];
    }

    // Respondents — the demographics table, and the unit you delete by.
    $respondents = [];
    $res = $conn->query(
        "SELECT a.user_id, a.user_type, COUNT(*) AS answered, MAX(a.created_at) AS last_answer,
                TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS name,
                u.email
         FROM feedback_answers a
         LEFT JOIN users u ON u.user_id = a.user_id
         GROUP BY a.user_id, a.user_type
         ORDER BY last_answer DESC"
    );
    while ($res && ($r = $res->fetch_assoc())) {
        $respondents[] = [
            'user_id' => (int) $r['user_id'],
            'name' => trim((string) $r['name']) ?: ('User #' . (int) $r['user_id']),
            'email' => $r['email'],
            'user_type' => $r['user_type'],
            'answered' => (int) $r['answered'],
            'last_answer' => $r['last_answer'],
        ];
    }

    echo json_encode([
        'success' => true,
        'scale' => ['5' => 'Strongly Agree', '4' => 'Agree', '3' => 'Neutral', '2' => 'Disagree', '1' => 'Strongly Disagree'],
        'overall_mean' => $overall,
        'overall_interpretation' => $overall !== null ? carelink_likert_label($overall) : null,
        'total_responses' => $grandN,
        'characteristics' => $characteristics,
        'items' => $items,
        'open_ended' => $openEnded,
        'respondents' => $respondents,
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}
