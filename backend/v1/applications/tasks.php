<?php
/**
 * REST mirrors:
 *   GET    /api/v1/applications/{application_id}/tasks?scope=today|all
 *   POST   /api/v1/applications/{application_id}/tasks
 * Parent: list + create. Helper: list only.
 *
 * GET  ?application_id=&user_id=&user_type=parent|helper&scope=today|all
 *      scope=today — pending/overdue open work + completed today (helper daily view)
 *      scope=all   — full list (default for parent)
 *
 * POST JSON: application_id, user_id, user_type=parent, title,
 *            description?, due_date? (Y-m-d), requires_photo?, is_recurring?, recur_days? (array of weekday names)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/placement_task_table.php';
require_once __DIR__ . '/../lib/placement_task_helpers.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

/** @return array{0:bool,1:?array} [ok, row application join] */
function load_hire_row(mysqli $conn, int $application_id): array
{
    $st = $conn->prepare("
        SELECT ja.application_id, ja.helper_id, ja.status, jp.parent_id, jp.title AS job_title
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ?
        LIMIT 1
    ");
    $st->bind_param('i', $application_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) {
        return [false, null];
    }
    if (!in_array($row['status'], ['hired', 'Accepted'], true)) {
        return [false, null];
    }
    return [true, $row];
}

function assert_parent(mysqli $conn, int $application_id, int $parent_user_id): ?array
{
    [$ok, $row] = load_hire_row($conn, $application_id);
    if (!$ok || !$row) {
        return null;
    }
    if ((int) $row['parent_id'] !== $parent_user_id) {
        return null;
    }
    return $row;
}

function assert_helper(mysqli $conn, int $application_id, int $helper_user_id): ?array
{
    [$ok, $row] = load_hire_row($conn, $application_id);
    if (!$ok || !$row) {
        return null;
    }
    if ((int) $row['helper_id'] !== $helper_user_id) {
        return null;
    }
    return $row;
}

$t = CARELINK_PLACEMENT_TASKS_TABLE;

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
        $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
        $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';
        $scope = isset($_GET['scope']) ? trim((string) $_GET['scope']) : 'all';
        if (!in_array($scope, ['today', 'all'], true)) {
            $scope = 'all';
        }

        if ($application_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent', 'helper'], true)) {
            json_out(['success' => false, 'message' => 'application_id, user_id, user_type required'], 400);
        }
        if ($user_type === 'parent') {
            if (!assert_parent($conn, $application_id, $user_id)) {
                json_out(['success' => false, 'message' => 'Forbidden'], 403);
            }
        } else {
            if (!assert_helper($conn, $application_id, $user_id)) {
                json_out(['success' => false, 'message' => 'Forbidden'], 403);
            }
            if ($scope === 'all') {
                $scope = 'today';
            }
        }

        if ($scope === 'today') {
            $sql = "
                SELECT id, application_id, created_by, title, description, due_date, requires_photo,
                       is_recurring, recur_days, status, completed_at, photo_url, created_at, updated_at
                FROM `{$t}`
                WHERE application_id = ?
                  AND (
                    (status IN ('pending', 'skipped') AND (due_date IS NULL OR due_date <= CURDATE()))
                    OR (status = 'done' AND DATE(completed_at) = CURDATE())
                  )
                ORDER BY FIELD(status, 'pending', 'skipped', 'done'),
                         due_date IS NULL, due_date ASC, id ASC
            ";
        } else {
            $sql = "
                SELECT id, application_id, created_by, title, description, due_date, requires_photo,
                       is_recurring, recur_days, status, completed_at, photo_url, created_at, updated_at
                FROM `{$t}`
                WHERE application_id = ?
                ORDER BY FIELD(status, 'pending', 'skipped', 'done'),
                         due_date IS NULL, due_date ASC, id ASC
            ";
        }

        $st = $conn->prepare($sql);
        $st->bind_param('i', $application_id);
        $st->execute();
        $res = $st->get_result();
        $tasks = [];
        while ($r = $res->fetch_assoc()) {
            $tasks[] = carelink_placement_task_row_to_api($r);
        }
        $st->close();
        json_out(['success' => true, 'data' => $tasks]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
        $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
        $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';
        $title = isset($input['title']) ? trim((string) $input['title']) : '';
        $description = isset($input['description']) ? trim((string) $input['description']) : null;
        if ($description === '') {
            $description = null;
        }
        $due_raw = isset($input['due_date']) ? trim((string) $input['due_date']) : '';
        $due_date = ($due_raw !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $due_raw)) ? $due_raw : null;
        $is_recurring = !empty($input['is_recurring']);
        $requires_photo = !empty($input['requires_photo']);
        $recur_days = $input['recur_days'] ?? null;
        $recur_json = null;
        if (is_array($recur_days) && count($recur_days) > 0) {
            $recur_json = json_encode(array_values($recur_days));
        }

        if ($application_id <= 0 || $user_id <= 0 || $user_type !== 'parent' || $title === '') {
            json_out(['success' => false, 'message' => 'application_id, user_id, user_type=parent, title required'], 400);
        }
        if (!assert_parent($conn, $application_id, $user_id)) {
            json_out(['success' => false, 'message' => 'Only the employer can create tasks for this hire'], 403);
        }

        $ir = $is_recurring ? 1 : 0;
        $rp = $requires_photo ? 1 : 0;

        $st = $conn->prepare("
            INSERT INTO `{$t}` (
                application_id, created_by, title, description, due_date, requires_photo,
                is_recurring, recur_days, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ");
        $st->bind_param(
            'iisssiis',
            $application_id,
            $user_id,
            $title,
            $description,
            $due_date,
            $rp,
            $ir,
            $recur_json
        );
        $st->execute();
        $id = (int) $conn->insert_id;
        $st->close();
        json_out(['success' => true, 'data' => ['id' => $id]], 201);
    }

    json_out(['success' => false, 'message' => 'Method not allowed'], 405);
} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}

if (isset($conn) && $conn) {
    $conn->close();
}
