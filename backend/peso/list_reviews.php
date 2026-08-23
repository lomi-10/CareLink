<?php
/**
 * peso/list_reviews.php — every placement review on the platform.
 *
 * STAFF ONLY. Ratings are public on profiles; the written reviews are not, and
 * this is the only screen where they can be read. See peso/get_user_reviews.php
 * for the reasoning — a review the subject can read is not a candid review.
 *
 * GET ?staff_user_id=..&q=..&role=..&max_rating=..
 *   role       helper | parent   (filters by who is BEING reviewed)
 *   max_rating show only reviews at or below this rating — how an officer finds
 *              the complaints-in-waiting without reading everything.
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../admin/admin_auth.php';

try {
    if (!$conn) throw new Exception('Database connection failed');
    // Readable by PESO staff OR super admin — both are named in the privacy
    // rule, so both authenticate here rather than duplicating the query in an
    // admin-only copy that would drift.
    $adminId = isset($_GET["admin_user_id"]) ? (int) $_GET["admin_user_id"] : 0;
    if ($adminId > 0) {
        admin_require_staff($conn, $adminId);
    } else {
        peso_require_staff($conn);
    }

    $q         = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
    $role      = isset($_GET['role']) ? trim((string) $_GET['role']) : '';
    $maxRating = isset($_GET['max_rating']) ? (float) $_GET['max_rating'] : 0;

    $where = ['1=1'];
    if (in_array($role, ['helper', 'parent'], true)) {
        $where[] = "re.user_type = '" . $conn->real_escape_string($role) . "'";
    }
    if ($maxRating > 0) {
        $where[] = 'pr.rating <= ' . (float) $maxRating;
    }
    if ($q !== '') {
        $esc = $conn->real_escape_string($q);
        $where[] = "(CONCAT(COALESCE(ru.first_name,''),' ',COALESCE(ru.last_name,'')) LIKE '%$esc%'"
                 . " OR CONCAT(COALESCE(re.first_name,''),' ',COALESCE(re.last_name,'')) LIKE '%$esc%'"
                 . " OR pr.review_text LIKE '%$esc%')";
    }
    $whereSql = implode(' AND ', $where);

    $sql = "
        SELECT pr.review_id, pr.placement_id, pr.rating, pr.review_text, pr.created_at,
               pr.reviewer_id, pr.reviewee_id,
               TRIM(CONCAT(COALESCE(ru.first_name,''),' ',COALESCE(ru.last_name,''))) AS reviewer_name,
               ru.user_type AS reviewer_type,
               TRIM(CONCAT(COALESCE(re.first_name,''),' ',COALESCE(re.last_name,''))) AS reviewee_name,
               re.user_type AS reviewee_type,
               jp.title AS job_title
        FROM placement_reviews pr
        LEFT JOIN users ru ON ru.user_id = pr.reviewer_id
        LEFT JOIN users re ON re.user_id = pr.reviewee_id
        LEFT JOIN placements p ON p.placement_id = pr.placement_id
        LEFT JOIN job_posts jp ON jp.job_post_id = p.job_post_id
        WHERE $whereSql
        ORDER BY pr.created_at DESC
        LIMIT 200";

    $res = $conn->query($sql);
    if (!$res) throw new Exception('Query failed: ' . $conn->error);

    $roleName = fn($t) => $t === 'helper' ? 'Helper' : ($t === 'parent' ? 'Household Employer' : (string) $t);
    $rows = [];
    while ($r = $res->fetch_assoc()) {
        $rows[] = [
            'review_id'     => (int) $r['review_id'],
            'placement_id'  => $r['placement_id'] !== null ? (int) $r['placement_id'] : null,
            'rating'        => round((float) $r['rating'], 1),
            'review_text'   => trim((string) ($r['review_text'] ?? '')),
            'reviewer_id'   => (int) $r['reviewer_id'],
            'reviewer_name' => trim((string) $r['reviewer_name']) ?: 'Reviewer',
            'reviewer_role' => $roleName($r['reviewer_type']),
            'reviewee_id'   => (int) $r['reviewee_id'],
            'reviewee_name' => trim((string) $r['reviewee_name']) ?: 'User',
            'reviewee_role' => $roleName($r['reviewee_type']),
            'job_title'     => $r['job_title'],
            'created_at'    => $r['created_at'],
        ];
    }
    $res->free();

    // Headline numbers for the screen, over ALL reviews, not the filtered page.
    $sum = $conn->query(
        "SELECT COUNT(*) c, AVG(rating) a,
                SUM(rating <= 2) low,
                SUM(review_text IS NOT NULL AND TRIM(review_text) <> '') written
         FROM placement_reviews"
    );
    $s = $sum ? $sum->fetch_assoc() : null;

    echo json_encode([
        'success' => true,
        'reviews' => $rows,
        'summary' => [
            'total'   => (int) ($s['c'] ?? 0),
            'average' => $s && $s['a'] !== null ? round((float) $s['a'], 2) : null,
            'low'     => (int) ($s['low'] ?? 0),
            'written' => (int) ($s['written'] ?? 0),
        ],
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn) && $conn) $conn->close();
}
