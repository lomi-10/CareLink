<?php
// carelink_api/admin/admin_get_overview.php
// Extra Super-Admin dashboard metrics: active contracts + per-PESO-staff
// performance (real data from verified_by columns).
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include("../dbcon.php");
include(__DIR__ . "/admin_auth.php");

$admin_user_id = isset($_GET['admin_user_id']) ? (int) $_GET['admin_user_id'] : 0;
admin_require_staff($conn, $admin_user_id);

$out = ['success' => true, 'active_contracts' => 0, 'peso_performance' => []];

// Active contracts (safe if table is empty)
$r = @$conn->query("SELECT COUNT(*) AS c FROM contracts WHERE status = 'Active'");
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
$res = @$conn->query($sql);
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
