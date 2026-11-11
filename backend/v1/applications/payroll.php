<?php
/**
 * GET /api/v1/applications/payroll
 * ?application_id=&user_id=&user_type=parent|helper&year=&month= (year/month optional; defaults to current month)
 *
 * Read-only payroll CLARITY summary — no cash-out, no money movement. Estimates
 * contract pay from scheduled workdays and approved leave; it does not track
 * attendance or claim that scheduled work was performed. Final pay is set by
 * the employer.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/hire_access.php';
require_once __DIR__ . '/../lib/contract_rest_days.php';

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
    $authorizedHire = $user_type === 'parent'
        ? carelink_v1_assert_parent_hire($conn, $application_id, $user_id)
        : carelink_v1_assert_helper_hire($conn, $application_id, $user_id);
    if (!$authorizedHire) {
        json_out(['success' => false, 'message' => 'Forbidden'], 403);
    }

    // ── Contract + salary basis ─────────────────────────────────────────────
    $stmt = $conn->prepare(
        "SELECT c.confirmed_salary, c.payment_schedule, c.employment_start_date,
                c.employment_end_date, c.rest_day, c.rest_days, jp.salary_period
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

    // Normalize both the current multi-day JSON field and the legacy singular field.
    $restDays = [];
    $restDayCsv = carelink_contract_rest_days_csv(
        isset($row['rest_days']) && is_string($row['rest_days']) ? $row['rest_days'] : null,
        isset($row['rest_day']) && is_string($row['rest_day']) ? $row['rest_day'] : null
    );
    if ($restDayCsv !== null) {
        foreach (explode(',', $restDayCsv) as $day) {
            $day = strtolower(trim($day));
            if ($day !== '') $restDays[] = $day;
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

    // ── Approved leave this period ─────────────────────────────────────────
    $leaveUsed = 0;
    $paidLeaveUsed = 0;
    if ($effEnd >= $effStart) {
        $stmt = $conn->prepare(
            "SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN lr.paid_leave = 1 OR lr.paid_leave IS NULL THEN 1 ELSE 0 END) AS paid
             FROM leave_requests lr
             WHERE lr.application_id = ?
               AND lr.status = 'approved'
               AND lr.`date` BETWEEN ? AND ?"
        );
        $stmt->bind_param("iss", $application_id, $effStart, $effEnd);
        $stmt->execute();
        $leaveRow = $stmt->get_result()->fetch_assoc();
        $leaveUsed = (int) ($leaveRow['total'] ?? 0);
        $paidLeaveUsed = (int) ($leaveRow['paid'] ?? 0);
        $stmt->close();
    }

    // Count scheduled contract workdays, not days actually worked. With no
    // attendance records, unpaid approved leave is the only supported deduction.
    $countScheduledDays = static function (string $from, string $to) use ($restDays): int {
        $start = new DateTimeImmutable($from);
        $end = new DateTimeImmutable($to);
        $count = 0;
        for ($date = $start; $date <= $end; $date = $date->modify('+1 day')) {
            $weekday = strtolower($date->format('l'));
            $isRestDay = false;
            foreach ($restDays as $restDay) {
                if ($restDay === $weekday || $restDay === strtolower($date->format('D'))
                    || (strlen($restDay) >= 3 && str_starts_with($weekday, $restDay))) {
                    $isRestDay = true;
                    break;
                }
            }
            if (!$isRestDay) {
                $count++;
            }
        }
        return $count;
    };

    $daysScheduled = $effEnd >= $effStart ? $countScheduledDays($effStart, $effEnd) : 0;
    $monthScheduled = $countScheduledDays($periodFirst, $periodLast);
    $unpaidLeaveUsed = max(0, $leaveUsed - $paidLeaveUsed);
    $scheduledDaysPayable = max(0, $daysScheduled - $unpaidLeaveUsed);

    $period = strtolower($salaryPeriod);
    if (str_starts_with($period, 'day')) {
        $estimated = $salaryAmount * $scheduledDaysPayable;
    } elseif (str_starts_with($period, 'week')) {
        $weekdayNumbers = [
            'sunday' => 0, 'monday' => 1, 'tuesday' => 2, 'wednesday' => 3,
            'thursday' => 4, 'friday' => 5, 'saturday' => 6,
        ];
        $restWeekdays = [];
        foreach ($restDays as $restDay) {
            foreach ($weekdayNumbers as $name => $number) {
                if ($restDay === $name || $restDay === strtolower(substr($name, 0, 3))
                    || (strlen($restDay) >= 3 && str_starts_with($name, $restDay))) {
                    $restWeekdays[$number] = true;
                    break;
                }
            }
        }
        $scheduledDaysPerWeek = max(1, 7 - count($restWeekdays));
        $estimated = $salaryAmount * ($scheduledDaysPayable / $scheduledDaysPerWeek);
    } else {
        $estimated = $monthScheduled > 0
            ? $salaryAmount * ($scheduledDaysPayable / $monthScheduled)
            : 0.0;
    }
    $estimated = round($estimated, 2);

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
        'days_worked'      => null,
        'paid_leave_days'  => $paidLeaveUsed,
        'days_scheduled'   => $daysScheduled,
        'leave_used'       => $leaveUsed,
        'estimated_earned' => $estimated,
        'is_estimate'      => true,
        'attendance_tracking' => false,
        'next_payout'      => $paymentSchedule ?: 'End of the month',
    ]);

} catch (Exception $e) {
    json_out(['success' => false, 'message' => $e->getMessage()], 500);
}
?>
