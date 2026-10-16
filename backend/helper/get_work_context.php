<?php

/**

 * GET ?helper_id=

 * Returns whether the helper has an active hired placement and summary for Work Mode.

 * Active during hired / Accepted / termination_pending (until cron sets terminated after last day).

 */



header('Content-Type: application/json; charset=UTF-8');

header('Access-Control-Allow-Origin: *');

header('Access-Control-Allow-Methods: GET, OPTIONS');

header('Access-Control-Allow-Headers: Content-Type, Authorization');



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    http_response_code(200);

    exit();

}



require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/placement_settings_table.php';
require_once __DIR__ . '/../shared/ownership_guard.php';



try {

    if (!$conn) {

        throw new Exception('Database connection failed');

    }



    $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;

    if ($helper_id <= 0) {

        throw new Exception('helper_id is required');

    }

    carelink_require_self($helper_id, $helper_id, 'You are not allowed to view this work context.');

    // ── Self-heal ended employment (no cron dependency) ─────────────────────
    // A termination whose last working day has passed becomes 'terminated', and
    // a contract whose employment_end_date has passed ends too. This guarantees
    // Work Mode turns off on time even if no scheduled job runs.
    $endTerm = $conn->prepare(
        "UPDATE job_applications SET status = 'terminated', updated_at = NOW()
         WHERE helper_id = ? AND status = 'termination_pending'
           AND termination_last_day IS NOT NULL AND termination_last_day < CURDATE()"
    );
    if ($endTerm) { $endTerm->bind_param('i', $helper_id); $endTerm->execute(); $endTerm->close(); }

    $endNatural = $conn->prepare(
        "UPDATE job_applications ja
         INNER JOIN contracts c ON c.application_id = ja.application_id
         SET ja.status = 'terminated',
             ja.termination_last_day = COALESCE(ja.termination_last_day, c.employment_end_date),
             ja.updated_at = NOW()
         WHERE ja.helper_id = ? AND ja.status IN ('hired','Accepted')
           AND c.employment_end_date IS NOT NULL AND c.employment_end_date < CURDATE()"
    );
    if ($endNatural) { $endNatural->bind_param('i', $helper_id); $endNatural->execute(); $endNatural->close(); }

    $sql = "

        SELECT

            ja.application_id,

            ja.job_post_id,

            ja.status,

            ja.termination_notice_date,

            ja.termination_last_day,

            jp.parent_id,

            jp.title AS job_title,

            jp.description AS job_description,

            pp.barangay AS work_barangay,

            pp.municipality AS work_municipality,

            pp.province AS work_province,

            pp.address AS work_address,

            c.work_hours AS contract_work_hours,

            c.rest_days AS contract_rest_days,

            c.rest_day AS legacy_contract_rest_day,

            c.confirmed_salary AS agreed_salary,

            jp.salary_period AS salary_period,

            c.payment_schedule,

            c.employment_start_date,

            c.employment_end_date,

            c.contract_duration,

            c.vacation_leave_days,

            c.sick_leave_days,

            c.overtime_rate,

            c.terms_notes,

            c.special_conditions,

            c.termination_conditions,

            c.other_benefits,

            c.debt_agreement,

            c.debt_amount,

            c.deployment_agreement,

            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS employer_name

        FROM job_applications ja

        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id

        INNER JOIN users u ON u.user_id = jp.parent_id AND u.user_type = 'parent'

        LEFT JOIN contracts c ON c.application_id = ja.application_id

        LEFT JOIN parent_profiles pp ON pp.user_id = jp.parent_id

        WHERE ja.helper_id = ?

          AND ja.status IN ('hired', 'Accepted', 'termination_pending')

          AND c.contract_id IS NOT NULL

          AND ja.employer_signed_at IS NOT NULL

          AND ja.helper_signed_at IS NOT NULL

        ORDER BY ja.updated_at DESC, ja.application_id DESC

        LIMIT 1

    ";



    $st = $conn->prepare($sql);

    if (!$st) {

        throw new Exception('Prepare failed');

    }

    $st->bind_param('i', $helper_id);

    $st->execute();

    $row = $st->get_result()->fetch_assoc();

    $st->close();



    if (!$row) {

        $endSt = $conn->prepare("
            SELECT
                ja.application_id,
                ja.job_post_id,
                jp.parent_id,
                jp.title AS job_title,
                ja.termination_last_day,
                TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS employer_name
            FROM job_applications ja
            INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
            INNER JOIN users u ON u.user_id = jp.parent_id AND u.user_type = 'parent'
            WHERE ja.helper_id = ?
              AND ja.status = 'terminated'
            ORDER BY ja.updated_at DESC, ja.application_id DESC
            LIMIT 1
        ");
        $ended = null;
        if ($endSt) {
            $endSt->bind_param('i', $helper_id);
            $endSt->execute();
            $er = $endSt->get_result()->fetch_assoc();
            $endSt->close();
            if ($er) {
                $ended = [
                    'application_id' => (int) $er['application_id'],
                    'job_post_id' => (int) $er['job_post_id'],
                    'parent_id' => (int) $er['parent_id'],
                    'job_title' => $er['job_title'],
                    'employer_name' => trim((string) $er['employer_name']),
                    'employment_ended_on' => $er['termination_last_day'],
                ];
            }
        }

        echo json_encode([

            'success' => true,

            'is_work_mode' => false,

            'active_hire' => null,

            'employment_ended' => $ended,

        ]);

        exit();

    }



    $placement_status = $row['status'] === 'termination_pending' ? 'termination_pending' : 'active';



    $workLocationParts = array_filter([

        trim((string) ($row['work_barangay'] ?? '')),

        trim((string) ($row['work_municipality'] ?? '')),

        trim((string) ($row['work_province'] ?? '')),

    ], fn ($part) => $part !== '');

    $workLocation = !empty($workLocationParts)

        ? implode(', ', $workLocationParts)

        : trim((string) ($row['work_address'] ?? ''));



    $restDays = [];

    if (!empty($row['contract_rest_days'])) {

        $decoded = json_decode((string) $row['contract_rest_days'], true);

        if (is_array($decoded)) {

            $restDays = $decoded;

        } else {

            $restDays = array_values(array_filter(array_map('trim', explode(',', (string) $row['contract_rest_days']))));

        }

    }

    if (count($restDays) === 0 && !empty($row['legacy_contract_rest_day'])) {

        $restDays = array_values(array_filter(array_map('trim', explode(',', (string) $row['legacy_contract_rest_day']))));

    }



    $employmentStartDate = !empty($row['employment_start_date']) ? (string) $row['employment_start_date'] : null;

    $todayYmd = date('Y-m-d');
    $startsInFuture = $employmentStartDate !== null && $employmentStartDate > $todayYmd;

    echo json_encode([

        'success' => true,

        'is_work_mode' => !$startsInFuture,

        'placement_status' => $placement_status,

        'termination_notice_date' => $row['termination_notice_date'],

        'termination_last_day' => $row['termination_last_day'],

        'active_hire' => [

            'application_id' => (int) $row['application_id'],

            'job_post_id' => (int) $row['job_post_id'],

            'parent_id' => (int) $row['parent_id'],

            'job_title' => $row['job_title'],

            'job_description' => $row['job_description'] !== null ? (string) $row['job_description'] : null,

            'employer_name' => trim((string) $row['employer_name']),

            'work_location' => $workLocation !== '' ? $workLocation : null,

            'work_hours' => $row['contract_work_hours'] !== null ? (string) $row['contract_work_hours'] : null,

            'rest_days' => $restDays,

            'salary_amount' => $row['agreed_salary'] !== null ? (float) $row['agreed_salary'] : null,

            'salary_period' => $row['salary_period'] !== null ? (string) $row['salary_period'] : null,

            'payment_schedule' => $row['payment_schedule'] !== null ? (string) $row['payment_schedule'] : null,

            'employment_start_date' => $employmentStartDate,

            'employment_end_date' => !empty($row['employment_end_date']) ? (string) $row['employment_end_date'] : null,

            'contract_duration' => $row['contract_duration'] !== null ? (string) $row['contract_duration'] : null,

            'vacation_leave_days' => $row['vacation_leave_days'] !== null ? (int) $row['vacation_leave_days'] : null,

            'sick_leave_days' => $row['sick_leave_days'] !== null ? (int) $row['sick_leave_days'] : null,

            'overtime_rate' => $row['overtime_rate'] !== null ? (string) $row['overtime_rate'] : null,

            'terms_notes' => $row['terms_notes'] !== null ? (string) $row['terms_notes'] : null,

            'special_conditions' => $row['special_conditions'] !== null ? (string) $row['special_conditions'] : null,

            'termination_conditions' => $row['termination_conditions'] !== null ? (string) $row['termination_conditions'] : null,

            'other_benefits' => $row['other_benefits'] !== null ? (string) $row['other_benefits'] : null,

            'debt_agreement' => $row['debt_agreement'] !== null ? (string) $row['debt_agreement'] : null,

            'debt_amount' => $row['debt_amount'] !== null ? (float) $row['debt_amount'] : null,

            'deployment_agreement' => $row['deployment_agreement'] !== null ? (string) $row['deployment_agreement'] : null,

            'attendance_tracking' => get_attendance_tracking($conn, (int) $row['application_id']),

        ],

    ]);

} catch (Exception $e) {

    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

}



if (isset($conn) && $conn) {

    $conn->close();

}
