<?php
// carelink_api/peso/get_job_details.php

ob_start();
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../shared/account_credentials.php';

function sendJson($ok, $msg, $data = null) {
    if (ob_get_level()) ob_clean();
    $r = ['success' => $ok, 'message' => $msg];
    if ($data !== null) $r['data'] = $data;
    echo json_encode($r);
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    if (!isset($_GET['job_post_id'])) throw new Exception('Job Post ID required');

    // This endpoint hands back the employer's verification documents as signed
    // URLs, so it is staff-only. It previously had no caller check at all —
    // anyone who guessed a job_post_id got the employer's full contact details.
    peso_require_staff($conn);

    $job_id = intval($_GET['job_post_id']);

    $sql = "
        SELECT
            j.*,
            CONCAT(u.first_name, ' ', u.last_name)   AS parent_name,
            u.email                                   AS parent_email,
            u.created_at                              AS parent_since,
            u.phone                                   AS parent_phone,
            u.user_type                               AS parent_user_type,
            pp.profile_image                          AS parent_photo,
            c.category_name,
            CONCAT(vu.first_name, ' ', vu.last_name)  AS verified_by_name,
            vu.email                                  AS verified_by_email
        FROM job_posts j
        JOIN  users u  ON j.parent_id   = u.user_id
        LEFT JOIN parent_profiles pp ON j.parent_id = pp.user_id
        LEFT JOIN ref_categories c  ON j.category_id  = c.category_id
        LEFT JOIN users vu ON j.verified_by = vu.user_id
        WHERE j.job_post_id = ?
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);
    $stmt->bind_param('i', $job_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $row['salary_offered'] = (float)$row['salary_offered'];

        // The employer's own standing travels with the posting. An officer
        // deciding whether a job goes live needs to know the household behind it
        // is who it claims to be — and if a document was altered after approval,
        // that has to be visible here, not two screens away.
        $creds = carelink_account_credentials(
            $conn,
            (int) $row['parent_id'],
            $row['parent_user_type'] ?? 'parent'
        );
        $row['employer_documents']   = $creds['documents'];
        $row['employer_verification'] = $creds['verification_status'];
        $row['employer_verified_at']  = $creds['verified_at'];
        $row['employer_flags']        = $creds['flags'];

        sendJson(true, 'Job found', $row);
    } else {
        throw new Exception('Job not found.');
    }

} catch (Exception $e) {
    sendJson(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
