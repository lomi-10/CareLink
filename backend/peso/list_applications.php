<?php
// carelink_api/peso/list_applications.php
//
// PESO oversight view of job applications across the platform. This is NOT an
// approval queue — PESO does not verify or approve applications (that would make
// them a bottleneck on every hire). It's an exception-based safeguard: PESO can
// SEE applications and, if one looks abusive or fraudulent, flag + unsubmit it
// (see flag_application.php). This endpoint just lists them.
//
// GET ?staff_user_id=..&filter=all|active|flagged&q=search
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include __DIR__ . "/../dbcon.php";
include __DIR__ . "/peso_auth.php";
require_once __DIR__ . "/application_flags_table.php"; // ensures application_flags exists

peso_require_staff($conn);

$filter = $_GET['filter'] ?? 'all';
$q      = trim((string) ($_GET['q'] ?? ''));

$sql = "
  SELECT
    ja.application_id, ja.status, ja.applied_at, ja.cover_letter,
    jp.job_post_id, jp.title AS job_title, rc.category_name,
    hp_u.user_id AS helper_id, TRIM(CONCAT(hp_u.first_name,' ',COALESCE(hp_u.last_name,''))) AS helper_name,
    hp_u.email AS helper_email, hpf.verification_status AS helper_verification,
    pa_u.user_id AS parent_id, TRIM(CONCAT(pa_u.first_name,' ',COALESCE(pa_u.last_name,''))) AS parent_name,
    f.reason AS flag_reason, f.created_at AS flagged_at, f.flagged_by
  FROM job_applications ja
  INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
  LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
  INNER JOIN users hp_u ON hp_u.user_id = ja.helper_id
  LEFT JOIN helper_profiles hpf ON hpf.user_id = ja.helper_id
  INNER JOIN users pa_u ON pa_u.user_id = jp.parent_id
  LEFT JOIN application_flags f ON f.application_id = ja.application_id AND f.status = 'active'
";

$where = [];
if ($filter === 'flagged') $where[] = "f.flag_id IS NOT NULL";
elseif ($filter === 'active') $where[] = "ja.status NOT IN ('Withdrawn','Rejected','auto_rejected','terminated')";

if ($q !== '') {
    $safe = $conn->real_escape_string($q);
    $where[] = "(hp_u.first_name LIKE '%$safe%' OR hp_u.last_name LIKE '%$safe%' OR jp.title LIKE '%$safe%' OR pa_u.first_name LIKE '%$safe%' OR pa_u.last_name LIKE '%$safe%')";
}
if ($where) $sql .= " WHERE " . implode(" AND ", $where);
$sql .= " ORDER BY (f.flag_id IS NOT NULL) DESC, ja.applied_at DESC";

$rows = [];
$res = $conn->query($sql);
if ($res) {
    while ($r = $res->fetch_assoc()) {
        $r['application_id'] = (int) $r['application_id'];
        $r['is_flagged'] = $r['flag_reason'] !== null;
        $rows[] = $r;
    }
}

// A small summary for the header cards.
$summary = ['total' => 0, 'flagged' => 0, 'active' => 0];
$sres = $conn->query("
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN ja.status NOT IN ('Withdrawn','Rejected','auto_rejected','terminated') THEN 1 ELSE 0 END) AS active,
    (SELECT COUNT(*) FROM application_flags WHERE status='active') AS flagged
  FROM job_applications ja");
if ($sres && $s = $sres->fetch_assoc()) {
    $summary = ['total' => (int) $s['total'], 'flagged' => (int) $s['flagged'], 'active' => (int) $s['active']];
}

echo json_encode(["success" => true, "applications" => $rows, "summary" => $summary]);
