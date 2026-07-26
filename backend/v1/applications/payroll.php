<?php
/**
 * GET /api/v1/applications/payroll
 * ?application_id=&user_id=&user_type=parent|helper&year=&month= (year/month optional; defaults to current month)
 *
 * Read-only payroll CLARITY summary — no cash-out, no money movement. Shows the
 * agreed salary, days worked / leave used this period, and a best-effort estimate
 * of earnings so far. Final pay is always set by the employer; the estimate is
 * clearly flagged so nothing is presented as an authoritative amount owed.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../../shared/placement_settings_table.php';

function json_out($data, int $code = 200)
{
    http_response_code($code);
    echo json_encode($data);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $user_id        = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type      = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';

    if ($application_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent', 'helper'], true)) {
        json_out(['success' => false, 'message' => 'application_id, user_id, user_type required'], 400);
    }
    // Same access rule as attendance: only the placement's helper or employer.
    if (!carelink_v1_assert_can_view_attendance($conn, $application_id, $user_id, $user_type)) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    // ── Contract + salary basis ─────────────────────────────────────────────
    $stmt = $conn->prepare(
        "SELECT c.confirmed_salary, c.payment_schedule, c.employment_start_date,
                c.employment_end_date, c.rest_day, jp.salary_period
         FROM contracts c
         JOIN job_posts jp ON jp.job_post_id = c.job_post_id
         WHERE c.application_id = ?
         LIMIT 1"
    );
    $stmt->bind_param("i", $application_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) json_out(['success' => true, 'has_contract' => false]);

    $salaryAmount = $row['confirmed_salary'] !== null ? (float) $row['confirmed_salary'] : 0.0;
    $salaryPeriod = $row['salary_period'] ?: 'Monthly';
    $paymentSchedule = $row['payment_schedule'] ?: null;
    $empStart = $row['employment_start_date'] ?: null;
    $empEnd   = $row['employment_end_date'] ?: null;

    // Rest days (comma-separated weekday names on the contract, e.g. "Sunday").
    $restDays = [];
    if (!empty($row['rest_day'])) {
        foreach (explode(',', (string) $row['rest_day']) as $d) {
            $d = strtolower(trim($d));
            if ($d !== '') $restDays[$d] = true;
        }
    }

    // ── Period window (defaults to current calendar month) ──────────────────
    $today = date('Y-m-d');
    $year  = isset($_GET['year'])  ? (int) $_GET['year']  : (int) date('Y');
    $month = isset($_GET['month']) ? (int) $_GET['month'] : (int) date('n');
    if ($month < 1 || $month > 12) $month = (int) date('n');

    $periodFirst = sprintf('%04d-%02d-01', $year, $month);
    $periodLast  = date('Y-m-t', strtotime($periodFirst));

    // Effective span: clamp to employment dates and today.
    $effStart = ($empStart && $empStart > $periodFirst) ? $empStart : $periodFirst;
    $effEnd   = $periodLast;
    if ($today < $effEnd) $effEnd = $today;
    if ($empEnd && $empEnd < $effEnd) $effEnd = $empEnd;

    // ── Days worked (present) this period ───────────────────────────────────
    $daysWorked = 0;
    if ($effEnd >= $effStart) {
        $stmt = $conn->prepare(
            "SELECT COUNT(*) AS n FROM attendance_logs
             WHERE application_id = ? AND status = 'present' AND `date` BETWEEN ? AND ?"
        );
        $stmt->bind_param("iss", $application_id, $effStart, $effEnd);
        $stmt->execute();
        $daysWorked = (int) ($stmt->get_result()->fetch_assoc()['n'] ?? 0);
        $stmt->close();
    }

    // ── Leave used (approved) this period ───────────────────────────────────
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS n FROM leave_requests
         WHERE application_id = ? AND status = 'approved' AND `date` BETWEEN ? AND ?"
    );
    $stmt->bind_param("iss", $application_id, $periodFirst, $periodLast);
    $stmt->execute();
    $leaveUsed = (int) ($stmt->get_result()->fetch_assoc()['n'] ?? 0);
    $stmt->close();

    // ── Scheduled workdays so far (exclude rest days) ───────────────────────
    $daysScheduled = 0;
    if ($effEnd >= $effStart) {
        $cursor = strtotime($effStart);
        $end = strtotime($effEnd);
        while ($cursor <= $end) {
            $wd = strtolower(date('l', $cursor)); // "sunday"...
            if (!isset($restDays[$wd])) $daysScheduled++;
            $cursor = strtotime('+1 day', $cursor);
        }
    }

    // ── Earnings ────────────────────────────────────────────────────────────
    // When attendance tracking is OFF (the default), payroll is simply the flat
    // agreed contract salary — no proration, no dependence on check-ins. Only when
    // the employer has opted into attendance do we estimate from days worked.
    $trackingOn = get_attendance_tracking($conn, $application_id);
    $period = strtolower($salaryPeriod);
    if (!$trackingOn) {
        $estimated = round($salaryAmount, 2);
        $isEstimate = false;
    } elseif ($period === 'daily') {
        $estimated = round($salaryAmount * $daysWorked, 2);
        $isEstimate = false;
    } elseif ($period === 'weekly') {
        $estimated = round($salaryAmount * ($daysWorked / 6.0), 2);
        $isEstimate = true;
    } else { // Monthly (default)
        $estimated = round($daysScheduled > 0
            ? $salaryAmount * ($daysWorked / $daysScheduled)
            : $salaryAmount, 2);
        $isEstimate = true;
    }

    json_out([
        'success'          => true,
        'has_contract'     => true,
        'currency'         => 'PHP',
        'salary_amount'    => $salaryAmount,
        'salary_period'    => $salaryPeriod,
        'payment_schedule' => $paymentSchedule,
        'period_label'     => date('F Y', strtotime($periodFirst)),
        'period_start'     => $periodFirst,
        'period_end'       => $periodLast,
        'days_worked'      => $daysWorked,
        'days_scheduled'   => $daysScheduled,
        'leave_used'       => $leaveUsed,
        'estimated_earned'    => $estimated,
        'is_estimate'         => $isEstimate,
        'attendance_tracking' => $trackingOn,
        'next_payout'         => $paymentSchedule ?: 'End of the month',
    ]);

} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}
?>
