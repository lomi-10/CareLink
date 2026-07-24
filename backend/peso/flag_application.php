<?php
// carelink_api/peso/flag_application.php
//
// PESO flags a problematic application and "unsubmits" it — the exception-based
// safeguard the platform uses instead of PESO approving every application. The
// application is retracted from the active pipeline (status -> Withdrawn, which the
// rest of the app already treats as inactive and lets the helper re-apply later),
// a flag record with the reason is stored, and both the helper and the employer are
// notified so it's transparent, not silent.
//
// POST ?staff_user_id=..  { application_id, reason }
// Also supports { action:'clear', flag_id } to lift a flag.
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include __DIR__ . "/../dbcon.php";
include __DIR__ . "/peso_auth.php";
include_once __DIR__ . "/../shared/create_notification.php";
require_once __DIR__ . "/application_flags_table.php";

$staffId = peso_require_staff($conn);
$data = json_decode(file_get_contents("php://input"), true) ?: [];

function done(bool $ok, string $msg, array $extra = []): void {
    echo json_encode(array_merge(["success" => $ok, "message" => $msg], $extra));
    exit;
}
function audit(mysqli $conn, int $staffId, string $action, int $appId): void {
    $st = $conn->prepare("INSERT INTO log_trail (user_id, action, module, status, ip_address, device_info) VALUES (?, ?, 'Applications', 'Success', ?, ?)");
    $ip = $_SERVER['REMOTE_ADDR'] ?? ''; $dev = "PESO flag on application #$appId";
    // 4 bound params: user_id(i), action(s), ip_address(s), device_info(s).
    $st->bind_param("isss", $staffId, $action, $ip, $dev);
    $st->execute(); $st->close();
}

// ── Clear an existing flag ───────────────────────────────────────────────────
if (($data['action'] ?? '') === 'clear') {
    $flagId = (int) ($data['flag_id'] ?? 0);
    if ($flagId <= 0) done(false, "Missing flag id.");
    $st = $conn->prepare("UPDATE application_flags SET status='cleared', cleared_at=NOW() WHERE flag_id = ? AND status='active'");
    $st->bind_param("i", $flagId); $st->execute(); $ok = $st->affected_rows > 0; $st->close();
    done($ok, $ok ? "Flag cleared." : "Flag not found or already cleared.");
}

// ── Flag + unsubmit ──────────────────────────────────────────────────────────
$appId  = (int) ($data['application_id'] ?? 0);
$reason = trim((string) ($data['reason'] ?? ''));
if ($appId <= 0) done(false, "Missing application id.");
if ($reason === '') done(false, "Please give a reason so the helper understands.");
if (mb_strlen($reason) > 500) $reason = mb_substr($reason, 0, 500);

// Load the application + parties.
$st = $conn->prepare("
  SELECT ja.application_id, ja.status, ja.helper_id, jp.parent_id, jp.title
  FROM job_applications ja INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
  WHERE ja.application_id = ? LIMIT 1");
$st->bind_param("i", $appId);
$st->execute();
$app = $st->get_result()->fetch_assoc();
$st->close();
if (!$app) done(false, "Application not found.");

// Don't touch already-hired/terminated applications — flagging those is a
// placement/complaint concern, not an application one.
if (in_array($app['status'], ['hired', 'terminated', 'termination_pending'], true)) {
    done(false, "This application is already a placement — use Complaints for hired arrangements.");
}

$conn->begin_transaction();
try {
    // 1. Record the flag.
    $ins = $conn->prepare("INSERT INTO application_flags (application_id, flagged_by, reason) VALUES (?, ?, ?)");
    $ins->bind_param("iis", $appId, $staffId, $reason);
    $ins->execute(); $ins->close();

    // 2. Unsubmit — retract from the active pipeline.
    $upd = $conn->prepare("UPDATE job_applications SET status='Withdrawn', updated_at=NOW() WHERE application_id = ?");
    $upd->bind_param("i", $appId);
    $upd->execute(); $upd->close();

    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    done(false, "Could not flag the application. Please try again.");
}

// 3. Notify both parties (best-effort, outside the transaction).
$jobTitle = $app['title'] ?: 'a job';
createNotification($conn, (int) $app['helper_id'], 'application_flagged', 'Application withdrawn by PESO',
    "PESO withdrew your application for \"$jobTitle\". Reason: $reason. You may correct the issue and apply again.",
    'application', $appId);
createNotification($conn, (int) $app['parent_id'], 'application_flagged', 'An application was withdrawn by PESO',
    "PESO withdrew an application for your post \"$jobTitle\" after a review. Reason: $reason.",
    'application', $appId);

audit($conn, $staffId, "FLAG_UNSUBMIT_APPLICATION", $appId);
done(true, "Application flagged and unsubmitted. Both parties were notified.");
