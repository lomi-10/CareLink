<?php
// carelink_api/parent/get_attendance_summary.php
// This-week (last 7 days) attendance across all of the parent's active placements.
// Note: attendance_logs has no "late" status, so we report Present / Absent / Leave.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

try {
    if (!$conn) throw new Exception('Database connection failed');
    $parent_id    = isset($_GET['parent_id'])    ? (int) $_GET['parent_id']    : 0;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;

    if (!$parent_id) throw new Exception('Parent ID is required');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to view this summary.');

    $stmt = $conn->prepare("SELECT al.status, COUNT(*) AS c
        FROM attendance_logs al
        JOIN job_applications ja ON ja.application_id = al.application_id
        JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE jp.parent_id = ? AND al.date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY al.status");
    $stmt->bind_param('i', $parent_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $counts = ['present' => 0, 'absent' => 0, 'leave' => 0, 'unpaid_leave' => 0, 'holiday' => 0];
    while ($r = $res->fetch_assoc()) { $counts[$r['status']] = (int) $r['c']; }
    $stmt->close();

    $present = $counts['present'];
    $absent  = $counts['absent'];
    $leave   = $counts['leave'] + $counts['unpaid_leave'];
    $total   = $present + $absent + $leave; // holidays excluded from the ratio
    $pct = function ($n) use ($total) { return $total > 0 ? (int) round($n / $total * 100) : 0; };

    echo json_encode(['success' => true, 'attendance' => [
        'present'     => $present,
        'absent'      => $absent,
        'leave'       => $leave,
        'total'       => $total,
        'present_pct' => $pct($present),
        'absent_pct'  => $pct($absent),
        'leave_pct'   => $pct($leave),
    ]]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
