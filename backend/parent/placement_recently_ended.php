<?php
/**
 * GET ?parent_id=
 * Recently ended placements for dashboard renewal/review prompts:
 * terminated, stale termination notice, natural contract end (contracts.employment_end_date),
 * or completed placement row (placements.ended_at).
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

function out_e($ok, $msg, $placements = [])
{
    echo json_encode(['success' => $ok, 'message' => $msg, 'placements' => $placements]);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    $parent_id = isset($_GET['parent_id']) ? (int) $_GET['parent_id'] : 0;
    if ($parent_id <= 0) {
        out_e(false, 'parent_id required');
    }

    $sql = "
        SELECT
            ja.application_id,
            ja.job_post_id,
            ja.helper_id,
            ja.status,
            ja.termination_last_day,
            ja.updated_at AS application_updated_at,
            jp.title AS job_title,
            co.employment_end_date AS contract_end_date,
            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS helper_name,
            COALESCE(ja.termination_last_day, co.employment_end_date, p.ended_at, ja.updated_at) AS sort_ts
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id AND jp.parent_id = ?
        INNER JOIN users u ON u.user_id = ja.helper_id
        LEFT JOIN contracts co ON co.application_id = ja.application_id
        LEFT JOIN (
            SELECT application_id, MAX(placement_id) AS placement_id
            FROM placements
            WHERE application_id IS NOT NULL
            GROUP BY application_id
        ) latest ON latest.application_id = ja.application_id
        LEFT JOIN placements p ON p.placement_id = latest.placement_id
        WHERE (
            ja.updated_at >= DATE_SUB(NOW(), INTERVAL 730 DAY)
            OR (
              co.employment_end_date IS NOT NULL
              AND TRIM(co.employment_end_date) != ''
              AND co.employment_end_date >= DATE_SUB(CURDATE(), INTERVAL 730 DAY)
            )
            OR (
              p.ended_at IS NOT NULL
              AND p.ended_at >= DATE_SUB(NOW(), INTERVAL 730 DAY)
            )
          )
          AND (
            LOWER(TRIM(ja.status)) = 'terminated'
            OR (
              LOWER(TRIM(ja.status)) IN ('termination_pending', 'pending_termination')
              AND ja.termination_last_day IS NOT NULL
              AND TRIM(ja.termination_last_day) != ''
              AND ja.termination_last_day < CURDATE()
            )
            OR (
              LOWER(TRIM(ja.status)) IN ('hired', 'accepted')
              AND co.employment_end_date IS NOT NULL
              AND TRIM(co.employment_end_date) != ''
              AND co.employment_end_date < CURDATE()
            )
            OR (
              p.ended_at IS NOT NULL
              AND DATE(p.ended_at) < CURDATE()
            )
          )
        ORDER BY sort_ts DESC
        LIMIT 20
    ";

    $st = $conn->prepare($sql);
    if (!$st) {
        throw new Exception('Prepare failed');
    }
    $st->bind_param('i', $parent_id);
    $st->execute();
    $res = $st->get_result();
    $placements = [];
    while ($res && ($row = $res->fetch_assoc())) {
        $ended = $row['termination_last_day'] ?? null;
        if ($ended === null || trim((string) $ended) === '') {
            $ce = $row['contract_end_date'] ?? null;
            if ($ce !== null && trim((string) $ce) !== '') {
                $ended = substr((string) $ce, 0, 10);
            }
        }
        if ($ended === null || trim((string) $ended) === '') {
            $t = isset($row['sort_ts']) ? substr((string) $row['sort_ts'], 0, 10) : null;
            $ended = $t;
        }
        $placements[] = [
            'application_id' => (int) $row['application_id'],
            'job_post_id' => (int) $row['job_post_id'],
            'helper_id' => (int) $row['helper_id'],
            'helper_name' => trim((string) ($row['helper_name'] ?? '')) ?: 'Helper',
            'job_title' => $row['job_title'] ?? '',
            'ended_on' => $ended,
        ];
    }
    if ($res) {
        $res->free();
    }
    $st->close();

    out_e(true, 'OK', $placements);
} catch (Exception $e) {
    out_e(false, $e->getMessage());
}
