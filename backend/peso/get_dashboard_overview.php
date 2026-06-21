<?php
/**
 * get_dashboard_overview.php — single-call data source for the PESO dashboard redesign.
 * GET: staff_user_id (PESO staff auth, see peso_auth.php)
 *
 * Returns:
 *   stats: headline counters for the 6 dashboard cards
 *   verification_queue: small preview (5 each) of pending helpers/employers
 *   recent_activities: merged feed of applications/job approvals/interviews/contracts
 *   monthly_overview: weekly placement counts for the last 6 weeks (line chart)
 *   top_categories: % share of open/filled job posts by category (donut chart)
 *
 * Notes on judgment calls (no existing convention to follow):
 * - "missed" interview = status 'Cancelled' scheduled for today (interview_schedules has no
 *   explicit no-show flag wired up anywhere in the app yet).
 * - "contracts_expiring_soon" = hired applications whose contract.employment_end_date falls
 *   within the next 30 days.
 * - "success_rate_pct" = placements_this_month / applications_this_month, both computed below.
 * - "top_categories" reflects job POST demand (open/filled), not helper supply.
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

function scalar(mysqli $conn, string $sql): int
{
    $res = $conn->query($sql);
    if (!$res) {
        return 0;
    }
    $row = $res->fetch_assoc();
    return $row ? (int) array_values($row)[0] : 0;
}

function buildProfileImageUrl(?string $img): ?string
{
    if (!$img) {
        return null;
    }
    if (stripos($img, 'http://') === 0 || stripos($img, 'https://') === 0) {
        return $img;
    }
    return 'http://' . $_SERVER['HTTP_HOST'] . '/carelink_api/uploads/profiles/' . $img;
}

function timeAgoLabel(string $datetime): string
{
    $diff = time() - strtotime($datetime);
    if ($diff < 60) {
        return 'Just now';
    }
    if ($diff < 3600) {
        $m = (int) floor($diff / 60);
        return $m . 'm ago';
    }
    if ($diff < 86400) {
        $h = (int) floor($diff / 3600);
        return $h . 'h ago';
    }
    $d = (int) floor($diff / 86400);
    return $d . 'd ago';
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    peso_require_staff($conn);

    // ── Headline stats ──────────────────────────────────────────────────────
    $helpersWaiting = scalar($conn, "SELECT COUNT(*) c FROM helper_profiles WHERE verification_status = 'Pending'");
    $jobsAwaiting = scalar($conn, "SELECT COUNT(*) c FROM job_posts WHERE status = 'Pending'");

    $interviewsToday = ['scheduled' => 0, 'completed' => 0, 'missed' => 0];
    $res = $conn->query("
        SELECT status, COUNT(*) c FROM interview_schedules
        WHERE DATE(interview_date) = CURDATE()
        GROUP BY status
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $c = (int) $row['c'];
            if (in_array($row['status'], ['Scheduled', 'Confirmed'], true)) {
                $interviewsToday['scheduled'] += $c;
            } elseif ($row['status'] === 'Completed') {
                $interviewsToday['completed'] += $c;
            } elseif ($row['status'] === 'Cancelled') {
                $interviewsToday['missed'] += $c;
            }
        }
    }

    $activeContracts = scalar($conn, "
        SELECT COUNT(*) c FROM job_applications ja
        INNER JOIN contracts c2 ON c2.application_id = ja.application_id
        WHERE ja.status = 'hired'
    ");
    $contractsExpiringSoon = scalar($conn, "
        SELECT COUNT(*) c FROM job_applications ja
        INNER JOIN contracts c2 ON c2.application_id = ja.application_id
        WHERE ja.status = 'hired'
          AND c2.employment_end_date IS NOT NULL
          AND c2.employment_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    ");

    $openComplaints = scalar($conn, "SELECT COUNT(*) c FROM complaints WHERE status = 'Escalated_PESO'");

    $applicationsThisMonth = scalar($conn, "
        SELECT COUNT(*) c FROM job_applications
        WHERE MONTH(applied_at) = MONTH(CURDATE()) AND YEAR(applied_at) = YEAR(CURDATE())
    ");
    $placementsThisMonth = scalar($conn, "
        SELECT COUNT(*) c FROM job_applications
        WHERE status = 'hired'
          AND helper_signed_at IS NOT NULL
          AND MONTH(helper_signed_at) = MONTH(CURDATE()) AND YEAR(helper_signed_at) = YEAR(CURDATE())
    ");
    $successRatePct = $applicationsThisMonth > 0
        ? round(($placementsThisMonth / $applicationsThisMonth) * 100)
        : 0;
    $interviewsThisMonth = scalar($conn, "
        SELECT COUNT(*) c FROM interview_schedules
        WHERE MONTH(interview_date) = MONTH(CURDATE()) AND YEAR(interview_date) = YEAR(CURDATE())
    ");

    $stats = [
        'helpers_waiting' => $helpersWaiting,
        'jobs_awaiting_approval' => $jobsAwaiting,
        'interviews_today' => $interviewsToday,
        'active_contracts' => $activeContracts,
        'contracts_expiring_soon' => $contractsExpiringSoon,
        'open_complaints' => $openComplaints,
        'success_rate_pct' => $successRatePct,
        'placements_this_month' => $placementsThisMonth,
        'applications_this_month' => $applicationsThisMonth,
        'interviews_this_month' => $interviewsThisMonth,
    ];

    // ── Verification queue preview (5 each) ─────────────────────────────────
    $helpersQueue = [];
    $res = $conn->query("
        SELECT u.user_id, CONCAT(u.first_name, ' ', u.last_name) AS name,
               h.profile_image, h.created_at,
               EXISTS(SELECT 1 FROM user_documents d WHERE d.user_id = u.user_id AND d.status = 'Pending') AS has_docs,
               EXISTS(
                   SELECT 1 FROM interview_schedules isch
                   INNER JOIN job_applications ja ON ja.application_id = isch.application_id
                   WHERE ja.helper_id = u.user_id AND isch.status IN ('Scheduled', 'Confirmed')
               ) AS has_interview
        FROM users u
        INNER JOIN helper_profiles h ON h.user_id = u.user_id
        WHERE h.verification_status = 'Pending'
        ORDER BY h.created_at DESC
        LIMIT 5
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $tags = [];
            if ((int) $row['has_docs'] === 1) {
                $tags[] = 'Documents';
            }
            if ((int) $row['has_interview'] === 1) {
                $tags[] = 'For Interview';
            }
            $helpersQueue[] = [
                'user_id' => (int) $row['user_id'],
                'code' => sprintf('HLP-%04d', (int) $row['user_id']),
                'name' => trim($row['name']),
                'profile_image' => buildProfileImageUrl($row['profile_image']),
                'tags' => $tags,
                'submitted_label' => timeAgoLabel($row['created_at']),
            ];
        }
    }
    $helpersWaitingTotal = $helpersWaiting;

    $employersQueue = [];
    $res = $conn->query("
        SELECT u.user_id, CONCAT(u.first_name, ' ', u.last_name) AS name,
               p.profile_image, p.created_at,
               EXISTS(SELECT 1 FROM user_documents d WHERE d.user_id = u.user_id AND d.status = 'Pending') AS has_docs
        FROM users u
        INNER JOIN parent_profiles p ON p.user_id = u.user_id
        WHERE p.verification_status = 'Pending'
        ORDER BY p.created_at DESC
        LIMIT 5
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $tags = [];
            if ((int) $row['has_docs'] === 1) {
                $tags[] = 'Documents';
            }
            $employersQueue[] = [
                'user_id' => (int) $row['user_id'],
                'code' => sprintf('EMP-%04d', (int) $row['user_id']),
                'name' => trim($row['name']),
                'profile_image' => buildProfileImageUrl($row['profile_image']),
                'tags' => $tags,
                'submitted_label' => timeAgoLabel($row['created_at']),
            ];
        }
    }
    $employersWaitingTotal = scalar($conn, "SELECT COUNT(*) c FROM parent_profiles WHERE verification_status = 'Pending'");

    // ── Recent activity feed (merged, most recent 8) ────────────────────────
    $activities = [];

    $res = $conn->query("
        SELECT ja.applied_at AS ts, CONCAT(u.first_name, ' ', u.last_name) AS actor, jp.title AS detail
        FROM job_applications ja
        INNER JOIN users u ON u.user_id = ja.helper_id
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        ORDER BY ja.applied_at DESC LIMIT 8
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $activities[] = [
                'type' => 'application',
                'title' => 'New helper application submitted',
                'subtitle' => trim($row['actor']) . ' • ' . $row['detail'],
                'ts' => $row['ts'],
            ];
        }
    }

    $res = $conn->query("
        SELECT jp.verified_at AS ts, jp.title AS detail, jp.municipality AS loc
        FROM job_posts jp
        WHERE jp.verified_at IS NOT NULL
        ORDER BY jp.verified_at DESC LIMIT 8
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $activities[] = [
                'type' => 'job_approved',
                'title' => 'Job post approved',
                'subtitle' => trim($row['detail']) . ' • ' . trim((string) $row['loc']),
                'ts' => $row['ts'],
            ];
        }
    }

    $res = $conn->query("
        SELECT isch.updated_at AS ts, CONCAT(u.first_name, ' ', u.last_name) AS actor, isch.interview_id AS iid
        FROM interview_schedules isch
        INNER JOIN job_applications ja ON ja.application_id = isch.application_id
        INNER JOIN users u ON u.user_id = ja.helper_id
        WHERE isch.status = 'Completed' AND isch.updated_at IS NOT NULL
        ORDER BY isch.updated_at DESC LIMIT 8
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $activities[] = [
                'type' => 'interview_completed',
                'title' => 'Interview completed',
                'subtitle' => trim($row['actor']) . ' • Interview ID: INT-' . (int) $row['iid'],
                'ts' => $row['ts'],
            ];
        }
    }

    $res = $conn->query("
        SELECT c.created_at AS ts,
               CONCAT(eu.first_name, ' ', eu.last_name) AS employer,
               CONCAT(hu.first_name, ' ', hu.last_name) AS helper
        FROM contracts c
        INNER JOIN users eu ON eu.user_id = c.employer_id
        INNER JOIN users hu ON hu.user_id = c.helper_id
        ORDER BY c.created_at DESC LIMIT 8
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $activities[] = [
                'type' => 'contract_signed',
                'title' => 'Contract signed',
                'subtitle' => 'Employer: ' . trim($row['employer']) . ' • Helper: ' . trim($row['helper']),
                'ts' => $row['ts'],
            ];
        }
    }

    usort($activities, fn ($a, $b) => strtotime($b['ts']) <=> strtotime($a['ts']));
    $activities = array_slice($activities, 0, 8);
    foreach ($activities as &$a) {
        $a['ts_label'] = timeAgoLabel($a['ts']);
    }
    unset($a);

    // ── Monthly overview: weekly placements for the last 6 weeks ────────────
    $monthlyOverview = [];
    $res = $conn->query("
        SELECT MIN(DATE(helper_signed_at)) AS week_start, COUNT(*) AS placements
        FROM job_applications
        WHERE status = 'hired'
          AND helper_signed_at IS NOT NULL
          AND helper_signed_at >= DATE_SUB(CURDATE(), INTERVAL 6 WEEK)
        GROUP BY YEARWEEK(helper_signed_at, 1)
        ORDER BY week_start ASC
    ");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $monthlyOverview[] = [
                'week_label' => date('M j', strtotime($row['week_start'])),
                'placements' => (int) $row['placements'],
            ];
        }
    }

    // ── Top job categories (% share of open/filled job posts) ──────────────
    $topCategories = [];
    $totalCategorized = scalar($conn, "
        SELECT COUNT(*) c FROM job_posts WHERE status IN ('Open', 'Filled')
    ");
    $res = $conn->query("
        SELECT rc.category_name, COUNT(*) AS cnt
        FROM job_posts jp
        INNER JOIN ref_categories rc ON rc.category_id = jp.category_id
        WHERE jp.status IN ('Open', 'Filled')
        GROUP BY rc.category_id, rc.category_name
        ORDER BY cnt DESC
        LIMIT 5
    ");
    if ($res && $totalCategorized > 0) {
        while ($row = $res->fetch_assoc()) {
            $topCategories[] = [
                'category_name' => $row['category_name'],
                'pct' => round(((int) $row['cnt'] / $totalCategorized) * 100),
            ];
        }
    }

    out(true, 'OK', [
        'stats' => $stats,
        'verification_queue' => [
            'helpers' => $helpersQueue,
            'helpers_total' => $helpersWaitingTotal,
            'employers' => $employersQueue,
            'employers_total' => $employersWaitingTotal,
        ],
        'recent_activities' => $activities,
        'monthly_overview' => $monthlyOverview,
        'top_categories' => $topCategories,
    ]);
} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
