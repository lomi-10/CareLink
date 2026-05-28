<?php
/**
 * GET ?user_id=&user_type=parent|helper
 * Pending placement reviews: terminated applications where user has not reviewed yet.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';

function out_pending($ok, $msg, $pending = [])
{
    echo json_encode(['success' => $ok, 'message' => $msg, 'pending' => $pending]);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';
    if ($user_id <= 0) {
        out_pending(false, 'user_id required');
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        out_pending(false, 'user_type must be parent or helper');
    }

    $counterpartyExpr = $user_type === 'parent'
        ? "TRIM(CONCAT(COALESCE(hu.first_name, ''), ' ', COALESCE(hu.last_name, '')))"
        : "TRIM(CONCAT(COALESCE(pu.first_name, ''), ' ', COALESCE(pu.last_name, '')))";

    $partyWhere = $user_type === 'parent' ? 'jp.parent_id = ?' : 'ja.helper_id = ?';

    $sql = "
        SELECT ja.application_id,
               jp.title AS job_title,
               $counterpartyExpr AS counterparty_name
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        LEFT JOIN contracts co ON co.application_id = ja.application_id
        INNER JOIN (
            SELECT application_id, MAX(placement_id) AS placement_id
            FROM placements
            WHERE application_id IS NOT NULL
            GROUP BY application_id
        ) latest ON latest.application_id = ja.application_id
        INNER JOIN placements p ON p.placement_id = latest.placement_id
        LEFT JOIN users hu ON hu.user_id = ja.helper_id
        LEFT JOIN users pu ON pu.user_id = jp.parent_id
        WHERE (
              LOWER(TRIM(ja.status)) = 'terminated'
              OR (
                LOWER(TRIM(ja.status)) IN ('termination_pending', 'pending_termination')
                AND ja.termination_last_day IS NOT NULL
                AND TRIM(ja.termination_last_day) != ''
                AND ja.termination_last_day != '0000-00-00'
                AND ja.termination_last_day < CURDATE()
              )
              OR (
                LOWER(TRIM(ja.status)) IN ('hired', 'accepted')
                AND co.employment_end_date IS NOT NULL
                AND TRIM(co.employment_end_date) != ''
                AND co.employment_end_date != '0000-00-00'
                AND co.employment_end_date < CURDATE()
              )
              OR (
                p.ended_at IS NOT NULL
                AND DATE(p.ended_at) < CURDATE()
              )
            )
          AND $partyWhere
          AND NOT EXISTS (
              SELECT 1 FROM placement_reviews pr
              WHERE pr.placement_id = p.placement_id AND pr.reviewer_id = ?
          )
        ORDER BY ja.updated_at DESC
        LIMIT 20
    ";

    $st = $conn->prepare($sql);
    if (!$st) {
        throw new Exception('Prepare failed');
    }
    $st->bind_param('ii', $user_id, $user_id);
    $st->execute();
    $res = $st->get_result();
    $pending = [];
    while ($res && ($row = $res->fetch_assoc())) {
        $pending[] = [
            'application_id' => (int) $row['application_id'],
            'job_title' => $row['job_title'] ?? '',
            'counterparty_name' => trim((string) ($row['counterparty_name'] ?? '')) ?: 'Counterparty',
        ];
    }
    if ($res) {
        $res->free();
    }
    $st->close();

    out_pending(true, 'OK', $pending);
} catch (Exception $e) {
    out_pending(false, $e->getMessage());
}
