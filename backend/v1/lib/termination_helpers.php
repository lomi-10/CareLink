<?php
/**
 * Contract termination: reason labels, date computation, final-pay helper text.
 */

/** @return string[] */
function carelink_termination_reason_codes(): array
{
    return [
        'moving_away',
        'family_emergency',
        'found_other_work',
        'misconduct',
        'unsafe_conditions',
        'abuse_or_mistreatment',
        'end_of_term',
        'mutual_agreement',
        'other',
    ];
}

/** @return array<string,string> */
function carelink_termination_reason_labels(): array
{
    return [
        'moving_away' => 'Moving away',
        'family_emergency' => 'Family emergency',
        'found_other_work' => 'Found other work',
        'misconduct' => 'Misconduct',
        'unsafe_conditions' => 'Unsafe working conditions',
        'abuse_or_mistreatment' => 'Abuse or mistreatment',
        'end_of_term' => 'End of term',
        'mutual_agreement' => 'Mutual agreement',
        'other' => 'Other',
    ];
}

/**
 * @return array{notice_date:string,last_day:string}
 */
function carelink_termination_compute_dates(bool $is_mutual_agreement): array
{
    $notice = date('Y-m-d');
    if ($is_mutual_agreement) {
        return ['notice_date' => $notice, 'last_day' => $notice];
    }
    $dt = new DateTime($notice);
    $dt->add(new DateInterval('P5D'));

    return ['notice_date' => $notice, 'last_day' => $dt->format('Y-m-d')];
}

/**
 * Display-only estimate: monthly salary × (calendar days worked in month of last_day / days in month).
 * Bi-weekly/weekly fall back to monthly-style using last day month.
 *
 * @return array{amount:float|null,currency:string,note:string,salary_period:?string}
 */
function carelink_termination_final_pay_estimate(mysqli $conn, int $application_id, ?string $termination_last_day): array
{
    $out = [
        'amount' => null,
        'currency' => 'PHP',
        'note' => 'Estimate for the pay period containing the last working day.',
        'salary_period' => null,
    ];
    if ($termination_last_day === null || $termination_last_day === '') {
        $out['note'] = 'Set a last working day to estimate final pay.';

        return $out;
    }
    $st = $conn->prepare('
        SELECT jp.salary_offered, jp.salary_period
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ?
        LIMIT 1
    ');
    if (!$st) {
        return $out;
    }
    $st->bind_param('i', $application_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$row) {
        return $out;
    }
    $salary = $row['salary_offered'] !== null ? (float) $row['salary_offered'] : null;
    $period = $row['salary_period'] !== null ? strtolower(trim((string) $row['salary_period'])) : '';
    $out['salary_period'] = $row['salary_period'];
    if ($salary === null || $salary <= 0) {
        $out['note'] = 'No salary amount on file for this job.';

        return $out;
    }

    try {
        $end = new DateTime($termination_last_day);
    } catch (Exception $e) {
        return $out;
    }
    $daysInMonth = (int) $end->format('t');
    $dayNum = (int) $end->format('j');
    if ($daysInMonth <= 0) {
        return $out;
    }

    $frac = $dayNum / $daysInMonth;
    if (strpos($period, 'week') !== false) {
        $out['note'] = 'Weekly rate approximated from calendar month proration for display.';
    } elseif (strpos($period, 'bi') !== false || strpos($period, '2 week') !== false) {
        $out['note'] = 'Bi-weekly rate approximated from calendar month proration for display.';
    }

    $out['amount'] = round($salary * $frac, 2);

    return $out;
}

/** Notify every approved PESO desk user (and admins who use the same inbox). */
function carelink_notify_all_peso_users_contract_terminated(
    mysqli $conn,
    int $application_id,
    string $job_title,
    string $parent_name,
    string $helper_name,
    string $last_day
): void {
    require_once __DIR__ . '/../../shared/create_notification.php';
    $msg = "Placement \"{$job_title}\" ({$parent_name} / {$helper_name}): contract ending; last working day {$last_day}.";
    $res = $conn->query(
        "SELECT user_id FROM users WHERE user_type IN ('peso', 'admin') AND (status IS NULL OR status = 'approved')"
    );
    if (!$res) {
        return;
    }
    while ($r = $res->fetch_assoc()) {
        $uid = (int) ($r['user_id'] ?? 0);
        if ($uid <= 0) {
            continue;
        }
        carelink_create_notification(
            $conn,
            $uid,
            'contract_terminated',
            'Contract termination',
            $msg,
            'application',
            $application_id
        );
    }
}
