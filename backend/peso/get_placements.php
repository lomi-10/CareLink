<?php
/**
 * get_placements.php — unified PESO placements list (active hires + termination
 * notice/completed), merging the same data list_signed_contracts.php and
 * list_terminated_placements.php already expose, with a single `lifecycle_status`
 * field so the frontend can filter Active / Terminating / Terminated in one screen.
 * GET: staff_user_id (PESO staff auth), status? (Active|Terminating|Terminated|All)
 */
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

function out(bool $ok, string $msg, ?array $data = null): void
{
    $r = ['success' => $ok, 'message' => $msg];
    if ($data !== null) {
        $r['data'] = $data;
    }
    echo json_encode($r);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    peso_require_staff($conn);

    $statusFilter = isset($_GET['status']) ? trim((string) $_GET['status']) : 'All';

    $sql = "
        SELECT
            ja.application_id, ja.job_post_id, ja.status,
            ja.employer_signed_at, ja.helper_signed_at,
            ja.termination_reason, ja.termination_notice_date, ja.termination_last_day,
            jp.title AS job_title,
            pe.user_id AS parent_id, pe.first_name AS parent_first, pe.last_name AS parent_last,
            he.user_id AS helper_id, he.first_name AS helper_first, he.last_name AS helper_last,
            c.employment_start_date, c.employment_end_date
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        INNER JOIN users pe ON pe.user_id = jp.parent_id
        INNER JOIN users he ON he.user_id = ja.helper_id
        LEFT JOIN contracts c ON c.application_id = ja.application_id
        WHERE ja.status IN ('hired', 'termination_pending', 'terminated')
          AND ja.employer_signed_at IS NOT NULL
          AND ja.helper_signed_at IS NOT NULL
        ORDER BY ja.helper_signed_at DESC, ja.application_id DESC
    ";
    $res = $conn->query($sql);
    if (!$res) {
        throw new Exception('Query failed: ' . $conn->error);
    }

    $rows = [];
    while ($r = $res->fetch_assoc()) {
        $lifecycle = match ($r['status']) {
            'hired' => 'Active',
            'termination_pending' => 'Terminating',
            'terminated' => 'Terminated',
            default => 'Active',
        };

        if ($statusFilter !== 'All' && $lifecycle !== $statusFilter) {
            continue;
        }

        $rows[] = [
            'application_id' => (int) $r['application_id'],
            'job_post_id' => (int) $r['job_post_id'],
            'job_title' => $r['job_title'],
            'lifecycle_status' => $lifecycle,
            'parent_id' => (int) $r['parent_id'],
            'parent_name' => trim($r['parent_first'] . ' ' . $r['parent_last']),
            'helper_id' => (int) $r['helper_id'],
            'helper_name' => trim($r['helper_first'] . ' ' . $r['helper_last']),
            'employment_start_date' => $r['employment_start_date'],
            'employment_end_date' => $r['employment_end_date'],
            'termination_reason' => $r['termination_reason'],
            'termination_notice_date' => $r['termination_notice_date'],
            'termination_last_day' => $r['termination_last_day'],
        ];
    }
    $res->free();

    out(true, 'OK', ['placements' => $rows]);
} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
