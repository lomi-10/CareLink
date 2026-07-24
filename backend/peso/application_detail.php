<?php
// carelink_api/peso/application_detail.php
//
// Full case-review view of a single application for a PESO officer: who the helper
// is, who the employer is, the job terms, the documents shared, the cover letter,
// any active flag, and — most importantly for oversight — computed RISK SIGNALS a
// PESO officer should check before deciding whether to intervene.
//
// GET ?application_id=..&staff_user_id=..
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include __DIR__ . "/../dbcon.php";
include __DIR__ . "/peso_auth.php";
require_once __DIR__ . "/../shared/job_title.php";
require_once __DIR__ . "/application_flags_table.php";

peso_require_staff($conn);
$appId = (int) ($_GET['application_id'] ?? 0);
if ($appId <= 0) { echo json_encode(["success" => false, "message" => "Missing application id."]); exit; }

// ── Core row: application + job + helper + employer ──────────────────────────
$sql = "
  SELECT
    ja.application_id, ja.status, ja.applied_at, ja.reviewed_at, ja.cover_letter,
    jp.job_post_id, jp.title AS job_title, jp.category_id, jp.job_ids, jp.skill_ids,
    jp.salary_offered, jp.salary_period, jp.employment_type, jp.work_schedule,
    jp.min_experience_years, jp.municipality AS job_municipality, jp.province AS job_province,
    rc.category_name,
    h.user_id AS helper_id, h.email AS helper_email, h.status AS helper_account_status,
    TRIM(CONCAT(h.first_name,' ',COALESCE(h.last_name,''))) AS helper_name,
    hp.gender, hp.birth_date, hp.municipality AS helper_municipality, hp.province AS helper_province,
    hp.experience_years, hp.expected_salary, hp.salary_period AS helper_salary_period,
    hp.rating_average, hp.rating_count, hp.verification_status, hp.profile_image AS helper_photo,
    p.user_id AS parent_id, p.status AS parent_account_status,
    TRIM(CONCAT(p.first_name,' ',COALESCE(p.last_name,''))) AS parent_name,
    pp.municipality AS parent_municipality, pp.province AS parent_province, pp.verification_status AS parent_verification
  FROM job_applications ja
  INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
  LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
  INNER JOIN users h ON h.user_id = ja.helper_id
  LEFT JOIN helper_profiles hp ON hp.user_id = ja.helper_id
  INNER JOIN users p ON p.user_id = jp.parent_id
  LEFT JOIN parent_profiles pp ON pp.user_id = jp.parent_id
  WHERE ja.application_id = ? LIMIT 1";
$st = $conn->prepare($sql);
$st->bind_param("i", $appId);
$st->execute();
$r = $st->get_result()->fetch_assoc();
$st->close();
if (!$r) { echo json_encode(["success" => false, "message" => "Application not found."]); exit; }

// Roles + skills (names) for this job.
$roles = carelink_role_names_for_job_ids($conn, $r['job_ids']);
$skillNames = [];
$skillIds = json_decode($r['skill_ids'] ?? '[]', true) ?: [];
$safe = implode(',', array_filter(array_map('intval', $skillIds), fn($n) => $n > 0));
if ($safe !== '') { $sr = $conn->query("SELECT skill_name FROM ref_skills WHERE skill_id IN ($safe)"); while ($sr && $x = $sr->fetch_assoc()) $skillNames[] = $x['skill_name']; }

// Helper age from birth date.
$age = null;
if (!empty($r['birth_date'])) {
    $bd = date_create($r['birth_date']);
    if ($bd) $age = (int) $bd->diff(date_create('today'))->y;
}

// Documents the helper VERIFIED (count) and which they SHARED with this employer.
$verifiedDocs = (int) ($conn->query("SELECT COUNT(*) c FROM user_documents WHERE user_id = {$r['helper_id']} AND status = 'Verified'")->fetch_assoc()['c'] ?? 0);
$shared = [];
$sd = $conn->query("SELECT ud.document_type, ud.status FROM application_document_shares ads INNER JOIN user_documents ud ON ud.document_id = ads.document_id WHERE ads.application_id = $appId");
while ($sd && $x = $sd->fetch_assoc()) $shared[] = $x;

// Employer's footprint: active posts + complaints filed against them.
$activePosts = (int) ($conn->query("SELECT COUNT(*) c FROM job_posts WHERE parent_id = {$r['parent_id']} AND status IN ('Open','Pending')")->fetch_assoc()['c'] ?? 0);
$complaintsAgainst = (int) ($conn->query("SELECT COUNT(*) c FROM complaints WHERE respondent_id = {$r['parent_id']}")->fetch_assoc()['c'] ?? 0);

// Active flag on this application.
$flag = $conn->query("SELECT reason, created_at FROM application_flags WHERE application_id = $appId AND status = 'active' ORDER BY flag_id DESC LIMIT 1")->fetch_assoc() ?: null;

// ── Risk signals — the point of the whole screen ─────────────────────────────
$signals = [];
$sig = function ($level, $text) use (&$signals) { $signals[] = ['level' => $level, 'text' => $text]; };

$jobMonthly = ($r['salary_period'] === 'Daily') ? (float) $r['salary_offered'] * 26 : (float) $r['salary_offered'];
if ($jobMonthly > 0 && $jobMonthly < 7000) $sig('high', 'Offered salary (₱' . number_format($jobMonthly) . '/mo) is below the ₱7,000 platform minimum.');
if ($age !== null && $age < 18) $sig('high', "Applicant is a minor (age {$age}) — RA 10361 protections and parental consent apply.");
if ($age !== null && $age >= 15 && $age <= 17) $sig('high', 'Applicant is 15–17: employment of minors as kasambahay is tightly restricted.');
if (($r['verification_status'] ?? '') !== 'Verified') $sig('warn', 'Helper is not PESO-verified yet.');
if (strtolower((string) $r['parent_account_status']) !== 'approved') $sig('warn', 'Employer account is not approved.');
if ($complaintsAgainst > 0) $sig('warn', "This employer has {$complaintsAgainst} complaint(s) on record.");
if ($flag) $sig('info', 'This application is already flagged.');
if (empty($signals)) $sig('ok', 'No automatic risk signals detected on this application.');

echo json_encode([
    "success" => true,
    "application" => [
        "application_id" => (int) $r['application_id'],
        "status" => $r['status'],
        "applied_at" => $r['applied_at'],
        "reviewed_at" => $r['reviewed_at'],
        "cover_letter" => $r['cover_letter'],
    ],
    "job" => [
        "title" => $r['job_title'],
        "category_name" => $r['category_name'],
        "roles" => $roles,
        "skills" => $skillNames,
        "salary_offered" => (float) $r['salary_offered'],
        "salary_period" => $r['salary_period'],
        "salary_monthly" => $jobMonthly,
        "employment_type" => $r['employment_type'],
        "work_schedule" => $r['work_schedule'],
        "min_experience_years" => (int) $r['min_experience_years'],
        "location" => trim(implode(', ', array_filter([$r['job_municipality'], $r['job_province']]))),
    ],
    "helper" => [
        "user_id" => (int) $r['helper_id'],
        "name" => $r['helper_name'],
        "email" => $r['helper_email'],
        "photo" => $r['helper_photo'],
        "verification_status" => $r['verification_status'],
        "age" => $age,
        "gender" => $r['gender'],
        "location" => trim(implode(', ', array_filter([$r['helper_municipality'], $r['helper_province']]))),
        "experience_years" => (int) $r['experience_years'],
        "expected_salary" => $r['expected_salary'] !== null ? (float) $r['expected_salary'] : null,
        "rating_average" => (float) $r['rating_average'],
        "rating_count" => (int) $r['rating_count'],
        "verified_documents" => $verifiedDocs,
    ],
    "employer" => [
        "user_id" => (int) $r['parent_id'],
        "name" => $r['parent_name'],
        "account_status" => $r['parent_account_status'],
        "verification_status" => $r['parent_verification'],
        "location" => trim(implode(', ', array_filter([$r['parent_municipality'], $r['parent_province']]))),
        "active_posts" => $activePosts,
        "complaints_against" => $complaintsAgainst,
    ],
    "shared_documents" => $shared,
    "flag" => $flag,
    "risk_signals" => $signals,
]);
