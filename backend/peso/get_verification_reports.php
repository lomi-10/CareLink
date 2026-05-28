<?php
// carelink_api/peso/get_verification_reports.php
// Returns PESO verification audit trail – user, document, AND job verifications

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);

include_once '../dbcon.php';
include_once __DIR__ . '/peso_auth.php';

function sendResponse($success, $message, $data = null, $meta = null) {
    if (ob_get_level()) ob_clean();
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) $response['data'] = $data;
    if ($meta !== null) $response['meta'] = $meta;
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) throw new Exception("Database connection failed");

    peso_require_staff($conn);

    $limit  = isset($_GET['limit'])  ? max(1, min(500, intval($_GET['limit'])))  : 200;
    $offset = isset($_GET['offset']) ? max(0, intval($_GET['offset']))           : 0;

    $from = isset($_GET['from']) ? trim((string) $_GET['from']) : '';
    $to   = isset($_GET['to'])   ? trim((string) $_GET['to'])   : '';
    if ($from !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
        throw new Exception('Invalid from date (use YYYY-MM-DD)');
    }
    if ($to !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
        throw new Exception('Invalid to date (use YYYY-MM-DD)');
    }

    $dateSql = '';
    if ($from !== '') {
        $fromEsc = $conn->real_escape_string($from);
        $dateSql .= " AND lt.created_at >= '{$fromEsc} 00:00:00'";
    }
    if ($to !== '') {
        $toEsc = $conn->real_escape_string($to);
        $dateSql .= " AND lt.created_at <= '{$toEsc} 23:59:59'";
    }

    $baseWhere = "WHERE lt.module IN ('PESO Verification', 'PESO Job Verification') {$dateSql}";

    $total = 0;
    $cntRes = $conn->query("SELECT COUNT(*) AS c FROM log_trail lt {$baseWhere}");
    if ($cntRes && ($crow = $cntRes->fetch_assoc())) {
        $total = (int) $crow['c'];
    }

    $sql = "
        SELECT
            lt.log_id,
            lt.user_id                                                        AS verified_by,
            CONCAT(v.first_name, ' ', IFNULL(v.middle_name,''), ' ', v.last_name) AS verified_by_name,
            v.email                                                           AS verified_by_email,
            lt.action,
            lt.module,
            lt.record_id,
            lt.status,
            lt.created_at,

            -- ── Target user (VERIFY_USER_*) ────────────────────────────────
            tu.user_id                                                        AS target_user_id,
            CONCAT(tu.first_name,' ',IFNULL(tu.middle_name,''),' ',tu.last_name) AS target_user_name,
            tu.email                                                          AS target_user_email,
            tu.user_type                                                      AS target_user_type,
            COALESCE(hp.verification_status, pp.verification_status)         AS target_verification_status,

            -- ── Target document (VERIFY_DOCUMENT_*) ───────────────────────
            d.document_id                                                     AS target_document_id,
            d.document_type                                                   AS target_document_type,
            d.status                                                          AS target_document_status,
            du.user_id                                                        AS doc_owner_user_id,
            CONCAT(du.first_name,' ',IFNULL(du.middle_name,''),' ',du.last_name) AS doc_owner_name,
            du.email                                                          AS doc_owner_email,
            du.user_type                                                      AS doc_owner_type,

            -- ── Target job post (VERIFY_JOB_*) ────────────────────────────
            jp.job_post_id                                                    AS target_job_id,
            jp.title                                                          AS target_job_title,
            jp.status                                                         AS target_job_status,
            jp.rejection_reason                                               AS target_job_rejection_reason,
            ju.user_id                                                        AS job_owner_user_id,
            CONCAT(ju.first_name,' ',IFNULL(ju.middle_name,''),' ',ju.last_name) AS job_owner_name,
            ju.email                                                          AS job_owner_email

        FROM log_trail lt
        INNER JOIN users v ON v.user_id = lt.user_id

        -- User verification joins
        LEFT JOIN users tu
          ON (lt.action IN ('VERIFY_USER_APPROVE','VERIFY_USER_REJECT')
              AND tu.user_id = lt.record_id)
        LEFT JOIN helper_profiles hp
          ON (tu.user_type = 'helper' AND hp.user_id = tu.user_id)
        LEFT JOIN parent_profiles pp
          ON (tu.user_type = 'parent' AND pp.user_id = tu.user_id)

        -- Document verification joins
        LEFT JOIN user_documents d
          ON (lt.action IN ('VERIFY_DOCUMENT_APPROVE','VERIFY_DOCUMENT_REJECT')
              AND d.document_id = lt.record_id)
        LEFT JOIN users du ON du.user_id = d.user_id

        -- Job verification joins
        LEFT JOIN job_posts jp
          ON (lt.action IN ('VERIFY_JOB_APPROVE','VERIFY_JOB_REJECT')
              AND jp.job_post_id = lt.record_id)
        LEFT JOIN users ju ON ju.user_id = jp.parent_id

        {$baseWhere}
        ORDER BY lt.created_at DESC
        LIMIT ? OFFSET ?
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $res = $stmt->get_result();

    $rows = [];
    while ($r = $res->fetch_assoc()) {
        $r['log_id']              = intval($r['log_id']);
        $r['verified_by']         = intval($r['verified_by']);
        $r['record_id']           = $r['record_id'] !== null ? intval($r['record_id']) : null;
        $r['created_at']          = $r['created_at'] ? date('Y-m-d H:i:s', strtotime($r['created_at'])) : null;
        $r['target_user_id']      = $r['target_user_id']     !== null ? intval($r['target_user_id'])     : null;
        $r['target_document_id']  = $r['target_document_id'] !== null ? intval($r['target_document_id']) : null;
        $r['doc_owner_user_id']   = $r['doc_owner_user_id']  !== null ? intval($r['doc_owner_user_id'])  : null;
        $r['target_job_id']       = $r['target_job_id']      !== null ? intval($r['target_job_id'])      : null;
        $r['job_owner_user_id']   = $r['job_owner_user_id']  !== null ? intval($r['job_owner_user_id'])  : null;
        $rows[] = $r;
    }
    $stmt->close();

    sendResponse(true, "Reports retrieved", $rows, [
        'limit' => $limit,
        'offset' => $offset,
        'total' => $total,
    ]);

} catch (Exception $e) {
    sendResponse(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
?>
