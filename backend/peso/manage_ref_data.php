<?php
// carelink_api/peso/manage_ref_data.php
//
// Lets PESO staff manage the reference taxonomy — categories -> job roles ->
// skills — without a developer editing the database. (Adviser's request: PESO
// should be able to add/rename the work categories, roles and skills the whole
// platform picks from.)
//
// GET  ?staff_user_id=..            -> { success, categories[], jobs[], skills[] }
// POST { staff_user_id, action, type, ... }
//        action = create | update | delete
//        type   = category | job | skill
//
// SAFETY: deletion is reference-guarded. A category/role/skill that is already
// used by a job post or a helper profile cannot be hard-deleted (that would
// corrupt those records and the match scoring). The endpoint refuses and explains
// why, so PESO can rename freely but only remove things nothing depends on.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

include __DIR__ . "/../dbcon.php";
include __DIR__ . "/peso_auth.php";
require_once __DIR__ . "/../shared/job_title.php"; // carelink_normalize_job_ids

$staffId = peso_require_staff($conn); // exits with 401 JSON if not PESO staff

/** Count rows for a prepared single-int-param query. */
function ref_count(mysqli $conn, string $sql, int $id): int {
    $st = $conn->prepare($sql);
    $st->bind_param("i", $id);
    $st->execute();
    $st->bind_result($n);
    $st->fetch();
    $st->close();
    return (int) $n;
}

/** How many active/pending job posts reference this job_id or skill_id inside their JSON arrays. */
function ref_in_job_posts(mysqli $conn, string $column, int $id): int {
    $res = $conn->query("SELECT `$column` FROM job_posts");
    $count = 0;
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            if (in_array($id, carelink_normalize_job_ids($row[$column]), true)) $count++;
        }
    }
    return $count;
}

function respond(bool $ok, string $msg, array $extra = []): void {
    echo json_encode(array_merge(["success" => $ok, "message" => $msg], $extra));
    exit;
}

function audit(mysqli $conn, int $staffId, string $action): void {
    $st = $conn->prepare("INSERT INTO log_trail (user_id, action, module, status, ip_address, device_info) VALUES (?, ?, 'Reference Data', 'Success', ?, 'PESO ref-data manager')");
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $st->bind_param("iss", $staffId, $action, $ip);
    $st->execute();
    $st->close();
}

// ── GET: the whole taxonomy tree ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $categories = [];
    $r = $conn->query("SELECT category_id, category_name, icon, description FROM ref_categories ORDER BY category_name");
    while ($r && $row = $r->fetch_assoc()) $categories[] = $row;

    $jobs = [];
    $r = $conn->query("SELECT job_id, category_id, job_title, description FROM ref_jobs ORDER BY job_title");
    while ($r && $row = $r->fetch_assoc()) $jobs[] = $row;

    $skills = [];
    $r = $conn->query("SELECT skill_id, job_id, skill_name, description FROM ref_skills ORDER BY skill_name");
    while ($r && $row = $r->fetch_assoc()) $skills[] = $row;

    respond(true, "ok", compact("categories", "jobs", "skills"));
}

// ── POST: create / update / delete ───────────────────────────────────────────
$data   = json_decode(file_get_contents("php://input"), true) ?: [];
$action = $data['action'] ?? '';
$type   = $data['type'] ?? '';
$name   = trim((string) ($data['name'] ?? ''));
$desc   = trim((string) ($data['description'] ?? ''));
$icon   = trim((string) ($data['icon'] ?? ''));
$id     = (int) ($data['id'] ?? 0);
$parent = (int) ($data['parent_id'] ?? 0); // category_id for a job, job_id for a skill

if (!in_array($type, ['category', 'job', 'skill'], true)) respond(false, "Unknown type.");

// Map each type to its table + columns so the three cases share one code path.
$T = [
    'category' => ['table' => 'ref_categories', 'idCol' => 'category_id', 'nameCol' => 'category_name', 'label' => 'Category'],
    'job'      => ['table' => 'ref_jobs',       'idCol' => 'job_id',      'nameCol' => 'job_title',     'label' => 'Job role', 'parentCol' => 'category_id', 'parentTable' => 'ref_categories', 'parentIdCol' => 'category_id'],
    'skill'    => ['table' => 'ref_skills',     'idCol' => 'skill_id',    'nameCol' => 'skill_name',    'label' => 'Skill', 'parentCol' => 'job_id', 'parentTable' => 'ref_jobs', 'parentIdCol' => 'job_id'],
][$type];

if ($action === 'create' || $action === 'update') {
    if ($name === '') respond(false, "A name is required.");
    if (mb_strlen($name) > 100) $name = mb_substr($name, 0, 100);

    // For jobs/skills, verify the parent exists.
    if ($type !== 'category' && $action === 'create') {
        if ($parent <= 0) respond(false, "Please choose a parent " . ($type === 'job' ? 'category' : 'role') . ".");
        if (ref_count($conn, "SELECT COUNT(*) FROM {$T['parentTable']} WHERE {$T['parentIdCol']} = ?", $parent) === 0) {
            respond(false, "That parent no longer exists.");
        }
    }
}

if ($action === 'create') {
    if ($type === 'category') {
        // category_name is UNIQUE — give a friendly message instead of a SQL error.
        $dup = $conn->prepare("SELECT COUNT(*) FROM ref_categories WHERE LOWER(category_name) = LOWER(?)");
        $dup->bind_param("s", $name); $dup->execute(); $dup->bind_result($dn); $dup->fetch(); $dup->close();
        if ($dn > 0) respond(false, "A category called \"$name\" already exists.");
        $st = $conn->prepare("INSERT INTO ref_categories (category_name, icon, description) VALUES (?, ?, ?)");
        $iconVal = $icon !== '' ? $icon : null; $descVal = $desc !== '' ? $desc : null;
        $st->bind_param("sss", $name, $iconVal, $descVal);
    } elseif ($type === 'job') {
        $st = $conn->prepare("INSERT INTO ref_jobs (category_id, job_title, description) VALUES (?, ?, ?)");
        $descVal = $desc !== '' ? $desc : null;
        $st->bind_param("iss", $parent, $name, $descVal);
    } else {
        $st = $conn->prepare("INSERT INTO ref_skills (job_id, skill_name, description) VALUES (?, ?, ?)");
        $descVal = $desc !== '' ? $desc : null;
        $st->bind_param("iss", $parent, $name, $descVal);
    }
    if ($st->execute()) {
        $newId = $st->insert_id; $st->close();
        audit($conn, $staffId, "CREATE_" . strtoupper($type) . " #$newId");
        respond(true, "{$T['label']} added.", ["id" => $newId]);
    }
    respond(false, "Could not add: " . $conn->error);
}

if ($action === 'update') {
    if ($id <= 0) respond(false, "Missing id.");
    if ($type === 'category') {
        $dup = $conn->prepare("SELECT COUNT(*) FROM ref_categories WHERE LOWER(category_name) = LOWER(?) AND category_id <> ?");
        $dup->bind_param("si", $name, $id); $dup->execute(); $dup->bind_result($dn); $dup->fetch(); $dup->close();
        if ($dn > 0) respond(false, "Another category is already called \"$name\".");
        $st = $conn->prepare("UPDATE ref_categories SET category_name = ?, icon = ?, description = ? WHERE category_id = ?");
        $iconVal = $icon !== '' ? $icon : null; $descVal = $desc !== '' ? $desc : null;
        $st->bind_param("sssi", $name, $iconVal, $descVal, $id);
    } elseif ($type === 'job') {
        $st = $conn->prepare("UPDATE ref_jobs SET job_title = ?, description = ? WHERE job_id = ?");
        $descVal = $desc !== '' ? $desc : null;
        $st->bind_param("ssi", $name, $descVal, $id);
    } else {
        $st = $conn->prepare("UPDATE ref_skills SET skill_name = ?, description = ? WHERE skill_id = ?");
        $descVal = $desc !== '' ? $desc : null;
        $st->bind_param("ssi", $name, $descVal, $id);
    }
    if ($st->execute()) {
        $st->close();
        audit($conn, $staffId, "UPDATE_" . strtoupper($type) . " #$id");
        respond(true, "{$T['label']} updated.");
    }
    respond(false, "Could not update: " . $conn->error);
}

if ($action === 'delete') {
    if ($id <= 0) respond(false, "Missing id.");

    // Reference guard — refuse to delete anything still in use.
    if ($type === 'category') {
        $jobs = ref_count($conn, "SELECT COUNT(*) FROM ref_jobs WHERE category_id = ?", $id);
        if ($jobs > 0) respond(false, "This category has $jobs job role(s). Remove or move them first.");
        $posts = ref_count($conn, "SELECT COUNT(*) FROM job_posts WHERE category_id = ?", $id);
        if ($posts > 0) respond(false, "This category is used by $posts job post(s), so it can't be deleted.");
    } elseif ($type === 'job') {
        $skills = ref_count($conn, "SELECT COUNT(*) FROM ref_skills WHERE job_id = ?", $id);
        if ($skills > 0) respond(false, "This role has $skills skill(s). Remove them first.");
        $helpers = ref_count($conn, "SELECT COUNT(*) FROM helper_jobs WHERE job_id = ?", $id);
        if ($helpers > 0) respond(false, "This role is on $helpers helper profile(s), so it can't be deleted.");
        $posts = ref_in_job_posts($conn, 'job_ids', $id);
        if ($posts > 0) respond(false, "This role is used by $posts job post(s), so it can't be deleted.");
    } else {
        $helpers = ref_count($conn, "SELECT COUNT(*) FROM helper_skills WHERE skill_id = ?", $id);
        if ($helpers > 0) respond(false, "This skill is on $helpers helper profile(s), so it can't be deleted.");
        $posts = ref_in_job_posts($conn, 'skill_ids', $id);
        if ($posts > 0) respond(false, "This skill is used by $posts job post(s), so it can't be deleted.");
    }

    $st = $conn->prepare("DELETE FROM {$T['table']} WHERE {$T['idCol']} = ?");
    $st->bind_param("i", $id);
    if ($st->execute()) {
        $st->close();
        audit($conn, $staffId, "DELETE_" . strtoupper($type) . " #$id");
        respond(true, "{$T['label']} deleted.");
    }
    respond(false, "Could not delete: " . $conn->error);
}

respond(false, "Unknown action.");
