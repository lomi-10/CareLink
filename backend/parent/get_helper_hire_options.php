<?php
/**
 * GET ?parent_id=&helper_id=
 * Returns active applications (Pending, Reviewed, Shortlisted, Interview Scheduled) for this helper with this employer.
 * needs_selection = true when at least two applications are shortlisted.
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/job_invites_table.php';
require_once __DIR__ . '/../shared/wage_floor.php';
require_once __DIR__ . '/../shared/helper_safeguards.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $parent_id = isset($_GET['parent_id']) ? (int) $_GET['parent_id'] : 0;
    $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;

    if ($parent_id <= 0 || $helper_id <= 0) {
        throw new Exception('parent_id and helper_id are required');
    }
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to view hire options for this employer account.');
    ensure_job_invites_table($conn);
    $relationship = $conn->prepare("
        SELECT 1
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE jp.parent_id = ? AND ja.helper_id = ?
        UNION ALL
        SELECT 1 FROM job_invites WHERE parent_id = ? AND helper_id = ?
        LIMIT 1
    ");
    if (!$relationship) {
        throw new Exception('Unable to verify the hiring relationship: ' . $conn->error);
    }
    $relationship->bind_param('iiii', $parent_id, $helper_id, $parent_id, $helper_id);
    if (!$relationship->execute()) {
        throw new Exception('Unable to verify the hiring relationship: ' . $relationship->error);
    }
    $hasRelationship = (bool) $relationship->get_result()->fetch_assoc();
    $relationship->close();
    if (!$hasRelationship) {
        throw new Exception('A current application or invitation is required to view hire options.');
    }
    carelink_require_adult_helper($conn, $helper_id);
    carelink_ensure_helper_safeguards_schema($conn);

    $sql = "
        SELECT
            ja.application_id,
            ja.job_post_id,
            ja.status,
            ja.applied_at,
            jp.title AS job_title,
            jp.start_date AS job_start_date,
            jp.salary_offered,
            jp.salary_min,
            jp.salary_max,
            jp.salary_period,
            jp.employment_type,
            jp.work_schedule,
            jp.work_hours,
            jp.days_off,
            jp.contract_duration,
            jp.benefits
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE jp.parent_id = ?
          AND ja.helper_id = ?
          AND ja.status IN ('Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled')
        ORDER BY ja.applied_at DESC
    ";

    $st = $conn->prepare($sql);
    if (!$st) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    $st->bind_param('ii', $parent_id, $helper_id);
    $st->execute();
    $res = $st->get_result();
    $applications = [];
    while ($row = $res->fetch_assoc()) {
        $salaryMin = (float) ($row['salary_min'] ?? 0);
        if ($salaryMin <= 0) {
            $salaryMin = (float) ($row['salary_offered'] ?? 0);
        }
        $applications[] = [
            'application_id' => (int) $row['application_id'],
            'job_post_id' => (int) $row['job_post_id'],
            'job_title' => $row['job_title'],
            'status' => $row['status'],
            'applied_at' => $row['applied_at'],
            'job_start_date' => $row['job_start_date'],
            'salary_offered' => $row['salary_offered'] !== null ? (float) $row['salary_offered'] : null,
            'salary_min' => $row['salary_min'] !== null ? (float) $row['salary_min'] : null,
            'salary_max' => $row['salary_max'] !== null ? (float) $row['salary_max'] : null,
            'minimum_contract_salary' => max(CARELINK_WAGE_FLOOR, $salaryMin),
            'salary_period' => $row['salary_period'],
            'employment_type' => $row['employment_type'],
            'work_schedule' => $row['work_schedule'],
            'work_hours' => $row['work_hours'],
            'days_off' => $row['days_off'],
            'contract_duration' => $row['contract_duration'],
            'benefits' => $row['benefits'],
        ];
    }
    $st->close();

    $shortlistedCount = 0;
    foreach ($applications as $application) {
        if ($application['status'] === 'Shortlisted') {
            $shortlistedCount++;
        }
    }

    $activeContractStmt = $conn->prepare("
        SELECT ja.application_id, ja.job_post_id, ja.status, jp.title AS job_title
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE jp.parent_id = ?
          AND ja.helper_id = ?
          AND ja.status IN ('contract_pending', 'hired', 'Accepted')
        ORDER BY CASE WHEN ja.status = 'contract_pending' THEN 0 ELSE 1 END
        LIMIT 1
    ");
    if (!$activeContractStmt) {
        throw new Exception('Unable to check for an existing contract: ' . $conn->error);
    }
    $activeContractStmt->bind_param('ii', $parent_id, $helper_id);
    if (!$activeContractStmt->execute()) {
        throw new Exception('Unable to check for an existing contract: ' . $activeContractStmt->error);
    }
    $activeContractRow = $activeContractStmt->get_result()->fetch_assoc();
    $activeContractStmt->close();
    $activeContract = $activeContractRow ? [
        'application_id' => (int) $activeContractRow['application_id'],
        'job_post_id' => (int) $activeContractRow['job_post_id'],
        'job_title' => $activeContractRow['job_title'],
        'status' => $activeContractRow['status'],
    ] : null;

    $hn = $conn->prepare('SELECT first_name, last_name FROM users WHERE user_id = ? LIMIT 1');
    $hn->bind_param('i', $helper_id);
    $hn->execute();
    $hr = $hn->get_result()->fetch_assoc();
    $hn->close();
    $helper_name = $hr ? trim($hr['first_name'] . ' ' . $hr['last_name']) : 'This helper';
    $restDayStmt = $conn->prepare('SELECT preferred_rest_day FROM helper_profiles WHERE user_id = ? LIMIT 1');
    if (!$restDayStmt) {
        throw new Exception('Unable to load helper rest-day request: ' . $conn->error);
    }
    $restDayStmt->bind_param('i', $helper_id);
    if (!$restDayStmt->execute()) {
        throw new Exception('Unable to load helper rest-day request: ' . $restDayStmt->error);
    }
    $helperRestDay = $restDayStmt->get_result()->fetch_assoc()['preferred_rest_day'] ?? null;
    $restDayStmt->close();

    echo json_encode([
        'success' => true,
        'needs_selection' => $shortlistedCount >= 2,
        'helper_name' => $helper_name,
        'helper_preferred_rest_day' => $helperRestDay,
        'applications' => $applications,
        'active_contract' => $activeContract,
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
