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
/**
 * One broken panel must not blank the dashboard.
 *
 * Since PHP 8.1, mysqli reports errors as exceptions by default, so a single bad
 * query escaped to the outer catch, returned success:false, and left the ENTIRE
 * Reports screen empty — including every panel whose own SQL was fine. That is
 * exactly what happened when the helper-specialty join referenced
 * helper_jobs.category_id, a column that does not exist (categories reach
 * helper_jobs through ref_jobs). Failures are now contained and logged per query.
 */
function scalar(mysqli $conn, string $sql): float
{
    try {
        $res = $conn->query($sql);
        if (!$res) return 0;
        $row = $res->fetch_assoc();
        return $row ? (float) array_values($row)[0] : 0;
    } catch (Throwable $e) {
        error_log('reports scalar failed: ' . $e->getMessage() . ' | ' . $sql);
        return 0;
    }
}
function rows(mysqli $conn, string $sql): array
{
    $out = [];
    try {
        $res = $conn->query($sql);
        if ($res) while ($r = $res->fetch_assoc()) $out[] = $r;
    } catch (Throwable $e) {
        error_log('reports rows failed: ' . $e->getMessage() . ' | ' . $sql);
    }
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
    $avgSalaryPrev = round(scalar($conn, "SELECT AVG(salary_offered) FROM job_posts WHERE salary_offered > 0 AND posted_at < DATE_FORMAT(CURDATE(),'%Y-%m-01')"));

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

    // ── Gender demographics ─────────────────────────────────────────────────
    // Bucketed in SQL rather than trusted raw: helper_profiles.gender is free
    // enough that 'male', 'Male' and '' all occur, and three buckets that don't
    // sum to the helper total make every percentage below it wrong.
    $genderBucket = "CASE
        WHEN LOWER(TRIM(COALESCE(hp.gender,''))) IN ('male','m') THEN 'Male'
        WHEN LOWER(TRIM(COALESCE(hp.gender,''))) IN ('female','f') THEN 'Female'
        ELSE 'Not stated' END";

    $genderRows = rows($conn, "
        SELECT {$genderBucket} AS g, COUNT(*) AS c
        FROM helper_profiles hp
        INNER JOIN users u ON u.user_id = hp.user_id AND u.user_type = 'helper'
        GROUP BY g");

    // Complaints RAISED AGAINST a helper, split by that helper's gender.
    $genderComplaintRows = rows($conn, "
        SELECT {$genderBucket} AS g, COUNT(*) AS c
        FROM complaints cp
        INNER JOIN helper_profiles hp ON hp.user_id = cp.respondent_id
        GROUP BY g");

    $genderPlacementRows = rows($conn, "
        SELECT {$genderBucket} AS g, COUNT(*) AS c
        FROM placements p
        INNER JOIN helper_profiles hp ON hp.user_id = p.helper_id
        GROUP BY g");

    $shape = function (array $rs) {
        $out = ['Male' => 0, 'Female' => 0, 'Not stated' => 0];
        foreach ($rs as $r) $out[$r['g']] = (int) $r['c'];
        return $out;
    };
    $genderCounts     = $shape($genderRows);
    $genderComplaints = $shape($genderComplaintRows);
    $genderPlacements = $shape($genderPlacementRows);

    // A raw complaint count follows headcount, so it says nothing on its own.
    // The rate per 100 helpers is what makes "more prone" a real comparison.
    $complaintRate = [];
    foreach (['Male', 'Female', 'Not stated'] as $g) {
        $n = $genderCounts[$g];
        $complaintRate[$g] = $n > 0 ? round(($genderComplaints[$g] / $n) * 100, 1) : 0.0;
    }

    // ── Who gets reported: helpers or employers ─────────────────────────────
    $partyRows = rows($conn, "
        SELECT u.user_type AS t, COUNT(*) AS c
        FROM complaints cp
        INNER JOIN users u ON u.user_id = cp.respondent_id
        GROUP BY u.user_type");
    $againstHelper = 0; $againstEmployer = 0;
    foreach ($partyRows as $r) {
        if ($r['t'] === 'helper') $againstHelper = (int) $r['c'];
        elseif ($r['t'] === 'parent') $againstEmployer = (int) $r['c'];
    }

    $filedRows = rows($conn, "
        SELECT u.user_type AS t, COUNT(*) AS c
        FROM complaints cp
        INNER JOIN users u ON u.user_id = cp.complainant_id
        GROUP BY u.user_type");
    $filedByHelper = 0; $filedByEmployer = 0;
    foreach ($filedRows as $r) {
        if ($r['t'] === 'helper') $filedByHelper = (int) $r['c'];
        elseif ($r['t'] === 'parent') $filedByEmployer = (int) $r['c'];
    }

    // ── Category leaders ────────────────────────────────────────────────────
    $catJobs = rows($conn, "
        SELECT COALESCE(rc.category_name, 'Uncategorised') AS name, COUNT(*) AS c
        FROM job_posts jp
        LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
        GROUP BY name ORDER BY c DESC LIMIT 8");

    $catPlacements = rows($conn, "
        SELECT COALESCE(rc.category_name, 'Uncategorised') AS name, COUNT(*) AS c
        FROM placements p
        INNER JOIN job_posts jp ON jp.job_post_id = p.job_post_id
        LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
        GROUP BY name ORDER BY c DESC LIMIT 8");

    // Helper specialty comes from the roles a helper picked, mapped up to their
    // category — there is no helper_categories table, so DISTINCT keeps a helper
    // who chose three roles in one category from counting three times.
    $catSpecialty = rows($conn, "
        SELECT name, COUNT(*) AS c FROM (
            SELECT DISTINCT hp.user_id, COALESCE(rc.category_name,'Uncategorised') AS name
            FROM helper_profiles hp
            INNER JOIN helper_jobs hj ON hj.profile_id = hp.profile_id
            INNER JOIN ref_jobs rj ON rj.job_id = hj.job_id
            LEFT JOIN ref_categories rc ON rc.category_id = rj.category_id
        ) t GROUP BY name ORDER BY c DESC LIMIT 8");
    // ── Geography: inside Ormoc vs beyond ───────────────────────────────────
    // Routed through rows() so it fails soft like every other panel.
    $geo = function (string $table) use ($conn) {
        $rs = rows($conn, "
            SELECT
              SUM(CASE WHEN LOWER(COALESCE(municipality,'')) LIKE '%ormoc%' THEN 1 ELSE 0 END) AS inside,
              SUM(CASE WHEN COALESCE(TRIM(municipality),'') <> '' AND LOWER(municipality) NOT LIKE '%ormoc%' THEN 1 ELSE 0 END) AS outside,
              SUM(CASE WHEN COALESCE(TRIM(municipality),'') = '' THEN 1 ELSE 0 END) AS unknown
            FROM {$table}");
        $x = $rs[0] ?? null;
        return [
            'inside'  => (int) ($x['inside'] ?? 0),
            'outside' => (int) ($x['outside'] ?? 0),
            'unknown' => (int) ($x['unknown'] ?? 0),
        ];
    };
    $geoHelpers   = $geo('helper_profiles');
    $geoEmployers = $geo('parent_profiles');

    // Where "beyond Ormoc" actually is, so the number is actionable.
    $topOutside = rows($conn, "
        SELECT municipality AS name, province, COUNT(*) AS c FROM (
            SELECT municipality, province FROM helper_profiles
            UNION ALL
            SELECT municipality, province FROM parent_profiles
        ) t
        WHERE COALESCE(TRIM(municipality),'') <> '' AND LOWER(municipality) NOT LIKE '%ormoc%'
        GROUP BY municipality, province ORDER BY c DESC LIMIT 6");

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
        // Gender, complaint-proneness, category leaders and geography — the
        // questions PESO asked for in the Aug 2026 review.
        'gender' => [
            'helpers'        => $genderCounts,
            'complaints'     => $genderComplaints,
            'placements'     => $genderPlacements,
            // Complaints per 100 helpers of that gender. A raw count tracks
            // headcount; only the rate answers "which is more prone".
            'complaint_rate' => $complaintRate,
        ],
        'complaint_parties' => [
            'against_helper'    => $againstHelper,
            'against_employer'  => $againstEmployer,
            'filed_by_helper'   => $filedByHelper,
            'filed_by_employer' => $filedByEmployer,
        ],
        'top_categories' => [
            'job_posts'  => array_map(fn($r) => ['name' => $r['name'], 'count' => (int) $r['c']], $catJobs),
            'placements' => array_map(fn($r) => ['name' => $r['name'], 'count' => (int) $r['c']], $catPlacements),
            'specialty'  => array_map(fn($r) => ['name' => $r['name'], 'count' => (int) $r['c']], $catSpecialty),
        ],
        'geography' => [
            'helpers'     => $geoHelpers,
            'employers'   => $geoEmployers,
            'top_outside' => array_map(fn($r) => [
                'name' => $r['name'], 'province' => $r['province'], 'count' => (int) $r['c'],
            ], $topOutside),
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
