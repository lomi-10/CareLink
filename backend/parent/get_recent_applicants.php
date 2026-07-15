<?php
// carelink_api/parent/get_recent_applicants.php
// Most recent applicants across ALL of this parent's job posts (dashboard widget).
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

try {
    if (!$conn) throw new Exception('Database connection failed');
    $parent_id    = isset($_GET['parent_id'])    ? (int) $_GET['parent_id']    : 0;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;
    $limit        = isset($_GET['limit']) ? max(1, min(20, (int) $_GET['limit'])) : 6;

    if (!$parent_id) throw new Exception('Parent ID is required');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to view these applicants.');

    $active = "ja.status NOT IN ('Withdrawn','Rejected','auto_rejected','terminated')";

    // Total active applicants (drives the "+N more" chip)
    $ct = $conn->prepare("SELECT COUNT(*) AS c
        FROM job_applications ja
        JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE jp.parent_id = ? AND $active");
    $ct->bind_param('i', $parent_id);
    $ct->execute();
    $total = (int) $ct->get_result()->fetch_assoc()['c'];
    $ct->close();

    $sql = "SELECT ja.application_id, ja.helper_id, ja.status, ja.applied_at,
                   u.first_name, u.last_name,
                   hp.profile_id, hp.profile_image, hp.verification_status,
                   jp.title AS job_title,
                   (SELECT rj.job_title FROM helper_jobs hj
                      JOIN ref_jobs rj ON rj.job_id = hj.job_id
                     WHERE hj.profile_id = hp.profile_id LIMIT 1) AS helper_role
            FROM job_applications ja
            JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
            JOIN users u ON u.user_id = ja.helper_id
            JOIN helper_profiles hp ON hp.user_id = ja.helper_id
            WHERE jp.parent_id = ? AND $active
            ORDER BY ja.applied_at DESC
            LIMIT " . $limit;
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $parent_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $applicants = [];
    while ($r = $res->fetch_assoc()) {
        $applicants[] = [
            'application_id' => (int) $r['application_id'],
            'helper_id'      => (int) $r['helper_id'],
            'full_name'      => trim($r['first_name'] . ' ' . $r['last_name']),
            'profile_image'  => $r['profile_image'],
            'role'           => $r['helper_role'] ?: $r['job_title'],
            'job_title'      => $r['job_title'],
            'status'         => $r['status'],
            'is_verified'    => ($r['verification_status'] === 'Verified'),
            'applied_at'     => $r['applied_at'],
        ];
    }
    $stmt->close();

    echo json_encode(['success' => true, 'applicants' => $applicants, 'total' => $total]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
