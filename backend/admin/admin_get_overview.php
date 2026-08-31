<?php
// carelink_api/admin/admin_get_overview.php
// Extra Super-Admin dashboard metrics: active contracts + per-PESO-staff
// performance (real data from verified_by columns).
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include("../dbcon.php");
include(__DIR__ . "/admin_auth.php");

$admin_user_id = isset($_GET['admin_user_id']) ? (int) $_GET['admin_user_id'] : 0;
admin_require_staff($conn, $admin_user_id);

$out = ['success' => true, 'active_contracts' => 0, 'peso_performance' => []];
// Active contracts.
//
// `contracts` has no `status` column — a contract's state lives on
// job_applications.status, and the pair of signature timestamps is what says
// whether it is in force. The old query asked contracts.status directly and was
// written as @$conn->query(...) in the belief that @ would swallow the failure.
// Since PHP 8.1 mysqli raises an EXCEPTION on error and @ does not suppress
// exceptions, so this fataled the whole endpoint and the admin dashboard
// returned nothing at all.
try {
    $r = $conn->query(
        "SELECT COUNT(*) AS c
           FROM job_applications ja
           INNER JOIN contracts c ON c.application_id = ja.application_id
          WHERE ja.employer_signed_at IS NOT NULL
            AND ja.helper_signed_at IS NOT NULL
            AND ja.status IN ('hired','Accepted','termination_pending')"
    );
    if ($r && ($row = $r->fetch_assoc())) $out['active_contracts'] = (int) $row['c'];
} catch (Throwable $e) {
    error_log('admin overview: active_contracts failed — ' . $e->getMessage());
}
if ($r && ($row = $r->fetch_assoc())) $out['active_contracts'] = (int) $row['c'];

// Per-PESO-staff performance — how much each PESO officer has verified.
$sql = "SELECT u.user_id,
               TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS name,
               (SELECT COUNT(*) FROM helper_profiles hp WHERE hp.verified_by = u.user_id) AS verified_helpers,
               (SELECT COUNT(*) FROM user_documents d   WHERE d.verified_by  = u.user_id) AS verified_docs,
               (SELECT COUNT(*) FROM job_posts jp        WHERE jp.verified_by = u.user_id) AS verified_jobs
        FROM users u
        WHERE u.user_type = 'peso'
        ORDER BY verified_helpers DESC, verified_docs DESC";
$res = null;
try { $res = $conn->query($sql); } catch (Throwable $e) { error_log('admin overview: peso_performance failed — ' . $e->getMessage()); }
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $out['peso_performance'][] = [
            'user_id'          => (int) $row['user_id'],
            'name'             => $row['name'] !== '' ? $row['name'] : 'PESO Officer',
            'verified_helpers' => (int) $row['verified_helpers'],
            'verified_docs'    => (int) $row['verified_docs'],
            'verified_jobs'    => (int) $row['verified_jobs'],
        ];
    }
}

echo json_encode($out);
