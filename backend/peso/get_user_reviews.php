<?php
/**
 * peso/get_user_reviews.php — the written reviews about one account.
 *
 * STAFF ONLY, AND THAT IS THE POINT. PESO decided (Aug 2026) that ratings are
 * public and written reviews are not: a helper and an employer each see the
 * other's star rating, but neither ever reads what the other wrote. Only PESO
 * and super admin do.
 *
 * The reasoning is worth keeping: a review the subject can read is not a candid
 * review. A kasambahay writing honestly about a household they may still be
 * living in needs to know the household will not read it — otherwise the
 * feedback is either useless or dangerous.
 *
 * GET ?user_id=..&staff_user_id=..
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

function out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    peso_require_staff($conn);

    $userId = (int) ($_GET['user_id'] ?? 0);
    if ($userId <= 0) throw new Exception('user_id is required.');

    $st = $conn->prepare(
        "SELECT pr.review_id, pr.placement_id, pr.rating, pr.review_text, pr.reviewer_type, pr.created_at,
                pr.reviewer_id,
                TRIM(CONCAT(COALESCE(ru.first_name,''),' ',COALESCE(ru.last_name,''))) AS reviewer_name,
                ru.user_type AS reviewer_user_type,
                jp.title AS job_title
         FROM placement_reviews pr
         LEFT JOIN users ru ON ru.user_id = pr.reviewer_id
         LEFT JOIN placements p ON p.placement_id = pr.placement_id
         LEFT JOIN job_posts jp ON jp.job_post_id = p.job_post_id
         WHERE pr.reviewee_id = ?
         ORDER BY pr.created_at DESC
         LIMIT 100"
    );
    if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
    $st->bind_param('i', $userId);
    $st->execute();
    $res = $st->get_result();

    $rows = [];
    $sum = 0.0; $n = 0;
    while ($r = $res->fetch_assoc()) {
        $rating = (float) $r['rating'];
        $sum += $rating; $n++;
        $rows[] = [
            'review_id'   => (int) $r['review_id'],
            'placement_id'=> $r['placement_id'] !== null ? (int) $r['placement_id'] : null,
            'rating'      => round($rating, 1),
            'review_text' => trim((string) ($r['review_text'] ?? '')),
            'reviewer_name' => trim((string) $r['reviewer_name']) ?: 'Reviewer',
            'reviewer_role' => $r['reviewer_user_type'] === 'helper' ? 'Helper'
                : ($r['reviewer_user_type'] === 'parent' ? 'Household Employer' : (string) $r['reviewer_type']),
            'job_title'   => $r['job_title'],
            'created_at'  => $r['created_at'],
        ];
    }
    $st->close();

    out(true, 'ok', [
        'reviews' => $rows,
        'average' => $n > 0 ? round($sum / $n, 2) : null,
        'count'   => $n,
    ]);

} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
