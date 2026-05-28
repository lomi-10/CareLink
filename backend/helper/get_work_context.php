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



    $sql = "

        SELECT

            ja.application_id,

            ja.job_post_id,

            ja.status,

            ja.termination_notice_date,

            ja.termination_last_day,

            jp.parent_id,

            jp.title AS job_title,

            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS employer_name

        FROM job_applications ja

        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id

        INNER JOIN users u ON u.user_id = jp.parent_id AND u.user_type = 'parent'

        WHERE ja.helper_id = ?

          AND ja.status IN ('hired', 'Accepted', 'termination_pending')

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



    echo json_encode([

        'success' => true,

        'is_work_mode' => true,

        'placement_status' => $placement_status,

        'termination_notice_date' => $row['termination_notice_date'],

        'termination_last_day' => $row['termination_last_day'],

        'active_hire' => [

            'application_id' => (int) $row['application_id'],

            'job_post_id' => (int) $row['job_post_id'],

            'parent_id' => (int) $row['parent_id'],

            'job_title' => $row['job_title'],

            'employer_name' => trim((string) $row['employer_name']),

        ],

    ]);

} catch (Exception $e) {

    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

}



if (isset($conn) && $conn) {

    $conn->close();

}

