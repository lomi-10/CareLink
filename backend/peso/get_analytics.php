<?php
/**
 * get_analytics.php — PESO market analytics (helpers supply + open jobs demand).
 *
 * Definitions (aligned with dashboard helper counts where applicable):
 * - total_helpers: COUNT(users) WHERE user_type = helper.
 * - top_categories / top_skills: DISTINCT helpers linked via helper_jobs / helper_skills (supply side).
 * - top_jobs: grouped OPEN/PENDING job_posts by title (demand — open role slots); helper_count field holds open posting count for UI compatibility.
 * - employment_types / work_schedules / experience_ranges / top_locations: from helper_profiles.
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
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    peso_require_staff($conn);

    $total_helpers = 0;
    $r = $conn->query("SELECT COUNT(*) AS c FROM users WHERE user_type = 'helper'");
    if ($r && ($row = $r->fetch_assoc())) {
        $total_helpers = (int) $row['c'];
    }

    $top_categories = [];
    $sql = "
        SELECT rc.category_id, rc.category_name, COUNT(DISTINCT hp.user_id) AS helper_count
        FROM helper_profiles hp
        INNER JOIN helper_jobs hj ON hj.profile_id = hp.profile_id
        INNER JOIN ref_jobs rj ON rj.job_id = hj.job_id
        INNER JOIN ref_categories rc ON rc.category_id = rj.category_id
        GROUP BY rc.category_id, rc.category_name
        ORDER BY helper_count DESC
        LIMIT 15
    ";
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $top_categories[] = [
                'category_id' => (int) $row['category_id'],
                'category_name' => $row['category_name'],
                'helper_count' => (int) $row['helper_count'],
            ];
        }
    }

    $top_jobs = [];
    $sql = "
        SELECT MIN(jp.job_post_id) AS job_id,
               jp.title AS job_title,
               COALESCE(rc.category_name, 'General') AS category_name,
               COUNT(*) AS open_roles_count
        FROM job_posts jp
        LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
        WHERE jp.status IN ('Open', 'Pending')
        GROUP BY jp.title, COALESCE(rc.category_name, 'General')
        ORDER BY open_roles_count DESC
        LIMIT 15
    ";
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $top_jobs[] = [
                'job_id' => (int) $row['job_id'],
                'job_title' => $row['job_title'],
                'category_name' => $row['category_name'],
                'helper_count' => (int) $row['open_roles_count'],
            ];
        }
    }

    $top_skills = [];
    $sql = "
        SELECT rs.skill_id, rs.skill_name,
               COUNT(DISTINCT hs.profile_id) AS helper_count,
               '' AS job_title
        FROM helper_skills hs
        INNER JOIN ref_skills rs ON rs.skill_id = hs.skill_id
        GROUP BY rs.skill_id, rs.skill_name
        ORDER BY helper_count DESC
        LIMIT 20
    ";
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $top_skills[] = [
                'skill_id' => (int) $row['skill_id'],
                'skill_name' => $row['skill_name'],
                'helper_count' => (int) $row['helper_count'],
                'job_title' => '',
            ];
        }
    }

    $avgSkills = 0.0;
    $uniqSkills = 0;
    $r = $conn->query('SELECT AVG(skill_cnt) AS a FROM (SELECT COUNT(*) AS skill_cnt FROM helper_skills GROUP BY profile_id) t');
    if ($r && ($row = $r->fetch_assoc()) && $row['a'] !== null) {
        $avgSkills = round((float) $row['a'], 2);
    }
    $r = $conn->query('SELECT COUNT(DISTINCT skill_id) AS c FROM helper_skills');
    if ($r && ($row = $r->fetch_assoc())) {
        $uniqSkills = (int) $row['c'];
    }

    $employment_types = [];
    $sql = "
        SELECT COALESCE(NULLIF(TRIM(employment_type), ''), 'Any') AS employment_type, COUNT(*) AS count
        FROM helper_profiles
        GROUP BY COALESCE(NULLIF(TRIM(employment_type), ''), 'Any')
        ORDER BY count DESC
    ";
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $employment_types[] = [
                'employment_type' => $row['employment_type'],
                'count' => (int) $row['count'],
            ];
        }
    }

    $work_schedules = [];
    $sql = "
        SELECT COALESCE(NULLIF(TRIM(work_schedule), ''), 'Any') AS work_schedule, COUNT(*) AS count
        FROM helper_profiles
        GROUP BY COALESCE(NULLIF(TRIM(work_schedule), ''), 'Any')
        ORDER BY count DESC
    ";
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $work_schedules[] = [
                'work_schedule' => $row['work_schedule'],
                'count' => (int) $row['count'],
            ];
        }
    }

    $buckets = ['0–2 yrs' => 0, '3–5 yrs' => 0, '6–10 yrs' => 0, '10+ yrs' => 0, 'Unknown' => 0];
    $rx = $conn->query('SELECT COALESCE(experience_years, -1) AS ey FROM helper_profiles');
    if ($rx) {
        while ($row = $rx->fetch_assoc()) {
            $ey = (int) $row['ey'];
            if ($ey < 0) {
                ++$buckets['Unknown'];
            } elseif ($ey <= 2) {
                ++$buckets['0–2 yrs'];
            } elseif ($ey <= 5) {
                ++$buckets['3–5 yrs'];
            } elseif ($ey <= 10) {
                ++$buckets['6–10 yrs'];
            } else {
                ++$buckets['10+ yrs'];
            }
        }
    }
    $experience_ranges = [];
    foreach ($buckets as $range => $count) {
        $experience_ranges[] = ['range' => $range, 'count' => $count];
    }

    $top_locations = [];
    $sql = "
        SELECT municipality, province, COUNT(*) AS helper_count
        FROM helper_profiles
        WHERE municipality IS NOT NULL AND TRIM(municipality) <> ''
        GROUP BY municipality, province
        ORDER BY helper_count DESC
        LIMIT 15
    ";
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $top_locations[] = [
                'municipality' => $row['municipality'],
                'province' => $row['province'],
                'helper_count' => (int) $row['helper_count'],
            ];
        }
    }

    $payload = [
        'total_helpers' => $total_helpers,
        'top_categories' => $top_categories,
        'top_jobs' => $top_jobs,
        'top_skills' => $top_skills,
        'skills_stats' => [
            'avg_skills_per_helper' => $avgSkills,
            'total_unique_skills' => $uniqSkills,
        ],
        'employment_types' => $employment_types,
        'work_schedules' => $work_schedules,
        'experience_ranges' => $experience_ranges,
        'top_locations' => $top_locations,
    ];

    out(true, 'OK', $payload);
} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
