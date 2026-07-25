<?php
// carelink_api/parent/get_invitable_jobs.php
// Smart helper→job matching for the "Invite to Apply" flow. Returns the parent's
// OPEN job posts, each annotated with whether THIS helper has already applied or
// already been invited — so the UI can hide/disable jobs there's no point inviting
// them to (and tell the parent when the helper has already covered all of them).

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);
ob_start();
require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/job_invites_table.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    echo json_encode(['success' => $success, 'message' => $message] + ($data ?? []));
    exit;
}

try {
    $parent_id    = isset($_GET['parent_id'])    ? intval($_GET['parent_id'])    : 0;
    $helper_id    = isset($_GET['helper_id'])    ? intval($_GET['helper_id'])    : 0;
    $requester_id = isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0;

    if (!$parent_id || !$helper_id) throw new Exception('parent_id and helper_id are required');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to view these job posts.');

    ensure_job_invites_table($conn);

    $stmt = $conn->prepare(
        "SELECT jp.job_post_id,
                jp.title,
                COALESCE(NULLIF(jp.custom_category, ''), rc.category_name) AS category_name,
                jp.salary_offered,
                jp.salary_period,
                jp.status,
                (SELECT COUNT(*) FROM job_applications ja
                   WHERE ja.job_post_id = jp.job_post_id AND ja.helper_id = ?) AS applied_count,
                (SELECT COUNT(*) FROM job_invites ji
                   WHERE ji.job_post_id = jp.job_post_id AND ji.helper_id = ?) AS invited_count
         FROM job_posts jp
         LEFT JOIN ref_categories rc ON jp.category_id = rc.category_id
         WHERE jp.parent_id = ? AND jp.status = 'Open'
         ORDER BY jp.posted_at DESC"
    );
    $stmt->bind_param("iii", $helper_id, $helper_id, $parent_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $jobs = [];
    $invitableCount = 0;
    while ($row = $res->fetch_assoc()) {
        $alreadyApplied = intval($row['applied_count']) > 0;
        $alreadyInvited = intval($row['invited_count']) > 0;
        $canInvite = !$alreadyApplied && !$alreadyInvited;
        if ($canInvite) $invitableCount++;
        $jobs[] = [
            'job_post_id'     => (int)$row['job_post_id'],
            'title'           => $row['title'],
            'category_name'   => $row['category_name'],
            'salary_offered'  => (float)$row['salary_offered'],
            'salary_period'   => $row['salary_period'],
            'status'          => $row['status'],
            'already_applied' => $alreadyApplied,
            'already_invited' => $alreadyInvited,
            'can_invite'      => $canInvite,
        ];
    }
    $stmt->close();

    sendResponse(true, 'ok', [
        'jobs'            => $jobs,
        'open_count'      => count($jobs),
        'invitable_count' => $invitableCount,
    ]);

} catch (Exception $e) {
    sendResponse(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
