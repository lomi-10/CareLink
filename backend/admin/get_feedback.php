<?php
/**
 * admin/get_feedback.php — all user feedback about CareLink itself.
 *
 * GET ?admin_user_id=[&role=helper|parent|peso][&context=demo_end|general]
 *
 * Reads system_feedback, which is fed by the in-app form. Deliberately NOT
 * placement_reviews — that is helpers and employers rating EACH OTHER, and it
 * feeds matching. This is people rating the SYSTEM, and it feeds the capstone's
 * Chapter 4 evaluation.
 *
 * Returns the raw responses plus per-question averages, so the admin screen can
 * show the numbers without recomputing them client-side.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/admin_auth.php';
require_once __DIR__ . '/../shared/system_feedback_table.php';

try {
    if (!$conn) throw new Exception('Database connection failed');
    admin_require_staff($conn, isset($_GET['admin_user_id']) ? (int) $_GET['admin_user_id'] : 0);

    // Created on demand elsewhere, so make sure it exists before selecting.
    ensure_system_feedback_table($conn);

    $role    = trim((string) ($_GET['role'] ?? ''));
    $context = trim((string) ($_GET['context'] ?? ''));

    $where  = '1=1';
    $types  = '';
    $params = [];
    if (in_array($role, ['helper', 'parent', 'peso'], true)) {
        $where .= ' AND f.user_type = ?';
        $types .= 's';
        $params[] = $role;
    }
    if ($context !== '') {
        $where .= ' AND f.context = ?';
        $types .= 's';
        $params[] = $context;
    }

    $sql = "SELECT f.feedback_id, f.user_id, f.user_type, f.overall_rating,
                   f.ease_of_use, f.trust, f.would_use,
                   f.liked_most, f.confusing_part, f.context, f.created_at,
                   CONCAT_WS(' ', u.first_name, u.last_name) AS name,
                   u.email
              FROM system_feedback f
              LEFT JOIN users u ON u.user_id = f.user_id
             WHERE $where
             ORDER BY f.created_at DESC
             LIMIT 300";

    $st = $conn->prepare($sql);
    if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
    if ($types !== '') $st->bind_param($types, ...$params);
    $st->execute();
    $res = $st->get_result();

    $items = [];
    while ($r = $res->fetch_assoc()) {
        $items[] = [
            'feedback_id'    => (int) $r['feedback_id'],
            'user_id'        => $r['user_id'] !== null ? (int) $r['user_id'] : null,
            // A deleted account leaves its feedback behind — the response is
            // still valid data even when the person is gone.
            'name'           => trim((string) ($r['name'] ?? '')) ?: 'Deleted account',
            'email'          => $r['email'],
            'user_type'      => $r['user_type'],
            'overall_rating' => (int) $r['overall_rating'],
            'ease_of_use'    => $r['ease_of_use'] !== null ? (int) $r['ease_of_use'] : null,
            'trust'          => $r['trust'] !== null ? (int) $r['trust'] : null,
            'would_use'      => $r['would_use'] !== null ? (int) $r['would_use'] : null,
            'liked_most'     => $r['liked_most'],
            'confusing_part' => $r['confusing_part'],
            'context'        => $r['context'],
            'created_at'     => $r['created_at'],
        ];
    }
    $st->close();

    // Averages over ALL rows, not just the current filter, so the headline
    // numbers stay stable while someone clicks between roles.
    $summary = ['total' => 0, 'overall' => null, 'ease_of_use' => null, 'trust' => null, 'would_use' => null];
    $agg = $conn->query(
        "SELECT COUNT(*) c,
                AVG(overall_rating) a_overall,
                AVG(ease_of_use)    a_ease,
                AVG(trust)          a_trust,
                AVG(would_use)      a_would
           FROM system_feedback"
    );
    if ($agg && ($a = $agg->fetch_assoc())) {
        $round = fn($v) => $v === null ? null : round((float) $v, 2);
        $summary = [
            'total'       => (int) $a['c'],
            'overall'     => $round($a['a_overall']),
            'ease_of_use' => $round($a['a_ease']),
            'trust'       => $round($a['a_trust']),
            'would_use'   => $round($a['a_would']),
        ];
    }

    // Same 5-point interpretation scale used in the Chapter 4 instrument, so the
    // screen and the written evaluation can never disagree.
    $byRole = [];
    $rq = $conn->query(
        "SELECT user_type, COUNT(*) c, AVG(overall_rating) a
           FROM system_feedback GROUP BY user_type"
    );
    while ($rq && ($r = $rq->fetch_assoc())) {
        $byRole[] = [
            'user_type' => $r['user_type'],
            'count'     => (int) $r['c'],
            'average'   => round((float) $r['a'], 2),
        ];
    }

    echo json_encode([
        'success'  => true,
        'feedback' => $items,
        'summary'  => $summary,
        'by_role'  => $byRole,
    ]);
} catch (Throwable $e) {
    error_log('get_feedback.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Could not load feedback.']);
}
