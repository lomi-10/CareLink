<?php
/**
 * get_reports_analytics.php — single-call data source for the PESO
 * "Reports & Analytics" dashboard redesign.
 * GET: staff_user_id (PESO staff auth)
 *
 * Returns headline cards, employment/placement metrics, RA 10361 compliance,
 * dispute/incident breakdowns, and a recent-activity feed — all from live data.
 */
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

function out(bool $ok, string $msg, ?array $data = null): void
{
    $r = ['success' => $ok, 'message' => $msg];
    if ($data !== null) $r['data'] = $data;
    echo json_encode($r);
    exit();
}
function scalar(mysqli $conn, string $sql): float
{
    $res = $conn->query($sql);
    if (!$res) return 0;
    $row = $res->fetch_assoc();
    return $row ? (float) array_values($row)[0] : 0;
}
function rows(mysqli $conn, string $sql): array
{
    $res = $conn->query($sql);
    $out = [];
    if ($res) while ($r = $res->fetch_assoc()) $out[] = $r;
    return $out;
}
function pctDelta(float $now, float $prev): int
{
    if ($prev <= 0) return $now > 0 ? 100 : 0;
    return (int) round((($now - $prev) / $prev) * 100);
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    peso_require_staff($conn);

    // ── Headline cards ──────────────────────────────────────────────────────
    $totalPlacements = (int) scalar($conn, "SELECT COUNT(*) FROM placements");
    $placeThisMonth  = (int) scalar($conn, "SELECT COUNT(*) FROM placements WHERE created_at >= DATE_FORMAT(CURDATE(),'%Y-%m-01')");
    $placeLastMonth  = (int) scalar($conn, "SELECT COUNT(*) FROM placements WHERE created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH,'%Y-%m-01') AND created_at < DATE_FORMAT(CURDATE(),'%Y-%m-01')");

    $pendHelpers  = (int) scalar($conn, "SELECT COUNT(*) FROM helper_profiles WHERE verification_status = 'Pending'");
    $pendEmployers = (int) scalar($conn, "SELECT COUNT(*) FROM parent_profiles WHERE verification_status = 'Pending'");
    $pendJobs     = (int) scalar($conn, "SELECT COUNT(*) FROM job_posts WHERE status = 'Pending'");

    $totalHelpers = (int) scalar($conn, "SELECT COUNT(*) FROM users WHERE user_type = 'helper'");
    $totalEmployers = (int) scalar($conn, "SELECT COUNT(*) FROM users WHERE user_type = 'parent'");

    $activeContracts = (int) scalar($conn, "
        SELECT COUNT(*) FROM job_applications ja
        INNER JOIN contracts c ON c.application_id = ja.application_id
        WHERE ja.status IN ('hired','accepted','termination_pending')");

    $activeGrievances = (int) scalar($conn, "SELECT COUNT(*) FROM complaints WHERE status IN ('Pending','Under Review','Escalated_PESO')");
    $grievLastMonth   = (int) scalar($conn, "SELECT COUNT(*) FROM complaints WHERE created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH,'%Y-%m-01') AND created_at < DATE_FORMAT(CURDATE(),'%Y-%m-01')");
    $grievThisMonth   = (int) scalar($conn, "SELECT COUNT(*) FROM complaints WHERE created_at >= DATE_FORMAT(CURDATE(),'%Y-%m-01')");

    // ── Placements over time (last 6 weeks) ─────────────────────────────────
    $placementsOverTime = [];
    for ($i = 5; $i >= 0; $i--) {
        $c = (int) scalar($conn, "SELECT COUNT(*) FROM placements WHERE created_at >= CURDATE() - INTERVAL " . (($i + 1) * 7) . " DAY AND created_at < CURDATE() - INTERVAL " . ($i * 7) . " DAY");
        $placementsOverTime[] = ['label' => 'W-' . $i, 'count' => $c];
    }

    // ── RA 10361 compliance ─────────────────────────────────────────────────
    $avgSalary = round(scalar($conn, "SELECT AVG(salary_offered) FROM job_posts WHERE salary_offered > 0"));
    $avgSalaryPrev = round(scalar($conn, "SELECT AVG(salary_offered) FROM job_posts WHERE salary_offered > 0 AND created_at < DATE_FORMAT(CURDATE(),'%Y-%m-01')"));

    $benCompliant = (int) scalar($conn, "SELECT COUNT(*) FROM job_posts WHERE provides_sss=1 AND provides_philhealth=1 AND provides_pagibig=1");
    $benPartial   = (int) scalar($conn, "SELECT COUNT(*) FROM job_posts WHERE (provides_sss + provides_philhealth + provides_pagibig) BETWEEN 1 AND 2");
    $benNon       = (int) scalar($conn, "SELECT COUNT(*) FROM job_posts WHERE (provides_sss + provides_philhealth + provides_pagibig) = 0");

    // Contract status: pending = a party hasn't signed; expired = end date passed; else active.
    $ctPending = (int) scalar($conn, "
        SELECT COUNT(*) FROM job_applications ja
        INNER JOIN contracts c ON c.application_id = ja.application_id
        WHERE (ja.employer_signed_at IS NULL OR ja.helper_signed_at IS NULL)");
    $ctExpired = (int) scalar($conn, "
        SELECT COUNT(*) FROM job_applications ja
        INNER JOIN contracts c ON c.application_id = ja.application_id
        WHERE ja.employer_signed_at IS NOT NULL AND ja.helper_signed_at IS NOT NULL
          AND c.employment_end_date IS NOT NULL AND c.employment_end_date < CURDATE()");
    $ctActive = max(0, $activeContracts - $ctPending - $ctExpired);

    // ── Dispute & incident ──────────────────────────────────────────────────
    $grievByType = rows($conn, "
        SELECT category, COUNT(*) AS c FROM complaints
        WHERE status IN ('Pending','Under Review','Escalated_PESO')
        GROUP BY category ORDER BY c DESC");

    $termReasons = rows($conn, "
        SELECT termination_reason AS reason, COUNT(*) AS c FROM job_applications
        WHERE termination_reason IS NOT NULL AND termination_reason <> ''
        GROUP BY termination_reason ORDER BY c DESC");

    // ── Recent activity (merged, best-effort) ───────────────────────────────
    $activities = rows($conn, "
        SELECT * FROM (
          SELECT j.verified_at AS ts,
                 COALESCE(vu.first_name,'PESO') AS actor,
                 'Job Approved' AS action,
                 CONCAT('Approved job post: ', j.title) AS details
          FROM job_posts j LEFT JOIN users vu ON vu.user_id = j.verified_by
          WHERE j.status = 'Open' AND j.verified_at IS NOT NULL

          UNION ALL
          SELECT hp.verified_at AS ts,
                 COALESCE(vu.first_name,'PESO') AS actor,
                 'Verified User' AS action,
                 CONCAT('Verified helper profile of ', u.first_name, ' ', u.last_name) AS details
          FROM helper_profiles hp
          JOIN users u ON u.user_id = hp.user_id
          LEFT JOIN users vu ON vu.user_id = hp.verified_by
          WHERE hp.verification_status = 'Verified' AND hp.verified_at IS NOT NULL

          UNION ALL
          SELECT c.updated_at AS ts,
                 'PESO' AS actor,
                 'Resolved Grievance' AS action,
                 CONCAT('Resolved complaint #GRV-', LPAD(c.complaint_id, 3, '0')) AS details
          FROM complaints c WHERE c.status IN ('Resolved','Dismissed')
        ) feed
        WHERE ts IS NOT NULL
        ORDER BY ts DESC
        LIMIT 8");

    out(true, 'ok', [
        'cards' => [
            'total_placements' => $totalPlacements,
            'placements_delta' => pctDelta($placeThisMonth, $placeLastMonth),
            'pending_verifications' => ['total' => $pendHelpers + $pendEmployers + $pendJobs, 'helper' => $pendHelpers, 'employer' => $pendEmployers + $pendJobs],
            'registered_users' => ['total' => $totalHelpers + $totalEmployers, 'employers' => $totalEmployers, 'helpers' => $totalHelpers],
            'active_contracts' => $activeContracts,
            'active_grievances' => $activeGrievances,
            'grievances_delta' => pctDelta($grievThisMonth, $grievLastMonth),
        ],
        'placements_over_time' => $placementsOverTime,
        'demographics' => ['employers' => $totalEmployers, 'helpers' => $totalHelpers],
        'verification_queue' => ['helper' => $pendHelpers, 'employer' => $pendEmployers + $pendJobs],
        'compliance' => [
            'avg_salary' => (int) $avgSalary,
            'avg_salary_delta' => pctDelta($avgSalary, $avgSalaryPrev),
            'min_wage' => 6500,
            'benefits' => ['compliant' => $benCompliant, 'partial' => $benPartial, 'noncompliant' => $benNon],
            'contract_status' => ['active' => $ctActive, 'pending' => $ctPending, 'expired' => $ctExpired],
        ],
        'grievances_by_type' => array_map(fn($r) => ['type' => $r['category'], 'count' => (int) $r['c']], $grievByType),
        'termination_reasons' => array_map(fn($r) => ['reason' => $r['reason'], 'count' => (int) $r['c']], $termReasons),
        'recent_activities' => array_map(fn($r) => [
            'ts' => $r['ts'], 'actor' => $r['actor'], 'action' => $r['action'], 'details' => $r['details'],
        ], $activities),
    ]);
} catch (Exception $e) {
    out(false, $e->getMessage());
}
