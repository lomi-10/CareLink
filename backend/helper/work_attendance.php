<?php
/**
 * GET ?helper_id=&application_id=&action=week — week dots Mon–Sun for current week
 * POST JSON: helper_id, application_id, action check_in | check_out
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';

function assert_hired(mysqli $conn, int $application_id, int $helper_id): void
{
    $st = $conn->prepare("
        SELECT 1 FROM job_applications
        WHERE application_id = ? AND helper_id = ? AND status IN ('hired', 'Accepted')
        LIMIT 1
    ");
    $st->bind_param('ii', $application_id, $helper_id);
    $st->execute();
    $ok = $st->get_result()->fetch_row();
    $st->close();
    if (!$ok) {
        throw new Exception('Not authorized or application is not an active hire');
    }
}

/** Monday Y-m-d of week containing $dateStr */
function week_monday(string $dateStr): string
{
    $t = strtotime($dateStr);
    $dow = (int) date('N', $t);
    $mon = strtotime('-' . ($dow - 1) . ' days', $t);
    return date('Y-m-d', $mon);
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;
        $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
        $action = isset($_GET['action']) ? trim((string) $_GET['action']) : '';
        if ($helper_id <= 0 || $application_id <= 0 || $action !== 'week') {
            throw new Exception('helper_id, application_id, and action=week required');
        }
        assert_hired($conn, $application_id, $helper_id);

        $today = date('Y-m-d');
        $weekStartParam = isset($_GET['week_start']) ? trim((string) $_GET['week_start']) : '';
        if ($weekStartParam !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekStartParam)) {
            $monday = week_monday($weekStartParam);
        } else {
            $monday = week_monday($today);
        }
        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $d = date('Y-m-d', strtotime($monday . ' +' . $i . ' days'));
            $days[] = [
                'date' => $d,
                'weekday' => date('D', strtotime($d)),
                'checked_in' => false,
                'check_in_at' => null,
                'check_out_at' => null,
            ];
        }

        $st = $conn->prepare("
            SELECT work_date, check_in_at, check_out_at
            FROM helper_work_attendance
            WHERE application_id = ? AND helper_id = ? AND work_date >= ? AND work_date <= ?
        ");
        $sunday = date('Y-m-d', strtotime($monday . ' +6 days'));
        $st->bind_param('iiss', $application_id, $helper_id, $monday, $sunday);
        $st->execute();
        $res = $st->get_result();
        $byDate = [];
        while ($r = $res->fetch_assoc()) {
            $byDate[$r['work_date']] = $r;
        }
        $st->close();

        foreach ($days as &$day) {
            $d = $day['date'];
            if (isset($byDate[$d]) && $byDate[$d]['check_in_at']) {
                $day['checked_in'] = true;
                $day['check_in_at'] = $byDate[$d]['check_in_at'];
                $day['check_out_at'] = $byDate[$d]['check_out_at'];
            }
        }
        unset($day);

        $todayRow = $byDate[$today] ?? null;
        $today_status = [
            'date' => $today,
            'checked_in' => $todayRow && $todayRow['check_in_at'],
            'checked_out' => $todayRow && $todayRow['check_out_at'],
            'check_in_at' => $todayRow['check_in_at'] ?? null,
            'check_out_at' => $todayRow['check_out_at'] ?? null,
        ];

        echo json_encode([
            'success' => true,
            'week_start' => $monday,
            'days' => $days,
            'today' => $today_status,
        ]);
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $helper_id = isset($input['helper_id']) ? (int) $input['helper_id'] : 0;
        $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
        $action = isset($input['action']) ? trim((string) $input['action']) : '';

        if ($helper_id <= 0 || $application_id <= 0) {
            throw new Exception('helper_id and application_id required');
        }
        assert_hired($conn, $application_id, $helper_id);

        $work_date = date('Y-m-d');
        $now = date('Y-m-d H:i:s');

        if ($action === 'check_in') {
            $st = $conn->prepare("
                SELECT attendance_id, check_in_at, check_out_at FROM helper_work_attendance
                WHERE application_id = ? AND helper_id = ? AND work_date = ?
                LIMIT 1
            ");
            $st->bind_param('iis', $application_id, $helper_id, $work_date);
            $st->execute();
            $row = $st->get_result()->fetch_assoc();
            $st->close();

            if ($row && $row['check_in_at']) {
                throw new Exception('Already checked in today');
            }

            if (!$row) {
                $ins = $conn->prepare("
                    INSERT INTO helper_work_attendance (application_id, helper_id, work_date, check_in_at, check_out_at)
                    VALUES (?, ?, ?, ?, NULL)
                ");
                $ins->bind_param('iiss', $application_id, $helper_id, $work_date, $now);
                $ins->execute();
                $ins->close();
            } else {
                $upd = $conn->prepare("
                    UPDATE helper_work_attendance SET check_in_at = ? WHERE attendance_id = ?
                ");
                $aid = (int) $row['attendance_id'];
                $upd->bind_param('si', $now, $aid);
                $upd->execute();
                $upd->close();
            }

            echo json_encode(['success' => true, 'check_in_at' => $now]);
            exit();
        }

        if ($action === 'check_out') {
            $st = $conn->prepare("
                SELECT attendance_id, check_in_at, check_out_at FROM helper_work_attendance
                WHERE application_id = ? AND helper_id = ? AND work_date = ?
                LIMIT 1
            ");
            $st->bind_param('iis', $application_id, $helper_id, $work_date);
            $st->execute();
            $row = $st->get_result()->fetch_assoc();
            $st->close();

            if (!$row || !$row['check_in_at']) {
                throw new Exception('Check in first');
            }
            if ($row['check_out_at']) {
                throw new Exception('Already checked out today');
            }

            $aid = (int) $row['attendance_id'];
            $upd = $conn->prepare("UPDATE helper_work_attendance SET check_out_at = ? WHERE attendance_id = ?");
            $upd->bind_param('si', $now, $aid);
            $upd->execute();
            $upd->close();

            echo json_encode(['success' => true, 'check_out_at' => $now]);
            exit();
        }

        throw new Exception('Invalid action');
    }

    throw new Exception('Method not allowed');
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
