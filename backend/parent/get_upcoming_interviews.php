<?php
// carelink_api/parent/get_upcoming_interviews.php
// Upcoming (today onward) interviews across all of this parent's applications.
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

try {
    if (!$conn) throw new Exception('Database connection failed');
    $parent_id    = isset($_GET['parent_id'])    ? (int) $_GET['parent_id']    : 0;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;
    $limit        = isset($_GET['limit']) ? max(1, min(20, (int) $_GET['limit'])) : 5;

    if (!$parent_id) throw new Exception('Parent ID is required');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to view these interviews.');

    $sql = "SELECT i.interview_id, i.application_id, i.interview_date, i.interview_type,
                   i.location_or_link, i.status, i.helper_confirmed,
                   u.first_name, u.last_name, hp.profile_image,
                   jp.title AS job_title
            FROM interview_schedules i
            JOIN job_applications ja ON ja.application_id = i.application_id
            JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
            JOIN users u ON u.user_id = ja.helper_id
            JOIN helper_profiles hp ON hp.user_id = ja.helper_id
            WHERE jp.parent_id = ?
              AND i.status IN ('Scheduled','Confirmed','Rescheduled')
              AND DATE(i.interview_date) >= CURDATE()
            ORDER BY i.interview_date ASC
            LIMIT " . $limit;
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $parent_id);
    $stmt->execute();
    $res = $stmt->get_result();

    $today = date('Y-m-d');
    $interviews = [];
    while ($r = $res->fetch_assoc()) {
        $interviews[] = [
            'interview_id'     => (int) $r['interview_id'],
            'application_id'   => (int) $r['application_id'],
            'full_name'        => trim($r['first_name'] . ' ' . $r['last_name']),
            'profile_image'    => $r['profile_image'],
            'job_title'        => $r['job_title'],
            'interview_date'   => $r['interview_date'],
            'interview_type'   => $r['interview_type'],
            'location_or_link' => $r['location_or_link'],
            'status'           => $r['status'],
            'helper_confirmed' => (bool) $r['helper_confirmed'],
            'is_today'         => (substr((string) $r['interview_date'], 0, 10) === $today),
        ];
    }
    $stmt->close();

    echo json_encode(['success' => true, 'interviews' => $interviews]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
