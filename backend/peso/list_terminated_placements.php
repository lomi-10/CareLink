<?php
/**
 * PESO: placements with termination notice or completed termination (both signatures present).
 */
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    peso_require_staff($conn);

    $sql = "
        SELECT
            ja.application_id,
            ja.job_post_id,
            ja.status,
            ja.termination_reason,
            ja.termination_notice_date,
            ja.termination_last_day,
            ja.employer_signed_at,
            ja.helper_signed_at,
            jp.title AS job_title,
            pe.first_name AS parent_first,
            pe.last_name AS parent_last,
            he.first_name AS helper_first,
            he.last_name AS helper_last
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        INNER JOIN users pe ON pe.user_id = jp.parent_id
        INNER JOIN users he ON he.user_id = ja.helper_id
        WHERE ja.status IN ('termination_pending', 'terminated')
          AND ja.employer_signed_at IS NOT NULL
          AND ja.helper_signed_at IS NOT NULL
        ORDER BY ja.termination_last_day DESC, ja.application_id DESC
    ";

    $res = $conn->query($sql);
    $rows = [];
    if ($res) {
        while ($r = $res->fetch_assoc()) {
            $rows[] = [
                'application_id' => (int) $r['application_id'],
                'job_post_id' => (int) $r['job_post_id'],
                'status' => $r['status'],
                'termination_reason' => $r['termination_reason'],
                'termination_notice_date' => $r['termination_notice_date'],
                'termination_last_day' => $r['termination_last_day'],
                'job_title' => $r['job_title'],
                'parent_name' => trim($r['parent_first'] . ' ' . $r['parent_last']),
                'helper_name' => trim($r['helper_first'] . ' ' . $r['helper_last']),
                'employer_signed_at' => $r['employer_signed_at'],
                'helper_signed_at' => $r['helper_signed_at'],
            ];
        }
    }

    echo json_encode(['success' => true, 'placements' => $rows]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
