<?php

/**

 * GET ?helper_id=

 * Returns whether the helper has an active hired placement and summary for Work Mode.

 * Active during hired / Accepted / termination_pending (until cron sets terminated after last day).

 */



header('Content-Type: application/json; charset=UTF-8');

header('Access-Control-Allow-Origin: *');

header('Access-Control-Allow-Methods: GET, OPTIONS');

header('Access-Control-Allow-Headers: Content-Type');



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    http_response_code(200);

    exit();

}



require_once __DIR__ . '/../dbcon.php';



try {

    if (!$conn) {

        throw new Exception('Database connection failed');

    }



    $helper_id = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;

    if ($helper_id <= 0) {

        throw new Exception('helper_id is required');

    }

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

            pp.barangay AS work_barangay,

            pp.municipality AS work_municipality,

            pp.province AS work_province,

            pp.address AS work_address,

            c.work_hours AS contract_work_hours,

            c.rest_days AS contract_rest_days,

            c.employment_start_date,

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

        }

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

            'employer_name' => trim((string) $row['employer_name']),

            'work_location' => $workLocation !== '' ? $workLocation : null,

            'work_hours' => $row['contract_work_hours'] !== null ? (string) $row['contract_work_hours'] : null,

            'rest_days' => $restDays,

            'employment_start_date' => $employmentStartDate,

        ],

    ]);

} catch (Exception $e) {

    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

}



if (isset($conn) && $conn) {

    $conn->close();

}

