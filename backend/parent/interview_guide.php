<?php
// carelink_api/parent/interview_guide.php
//
// Stores the answers a parent records while interviewing a helper (using the guide
// in the Interview tab), so those answers can pre-fill the employment contract when
// they hire. Exactly ONE saved set of answers per application (upsert).
//
// GET  ?application_id=..&requester_id=..           -> { success, answers|null }
// POST { application_id, requester_id, answers{} }  -> { success }
//
// The answers table is auto-created with CREATE TABLE IF NOT EXISTS (no migration).

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

include __DIR__ . "/../dbcon.php";
include_once __DIR__ . "/../shared/ownership_guard.php";

$conn->query("
    CREATE TABLE IF NOT EXISTS interview_notes (
        application_id INT PRIMARY KEY,
        parent_id INT NOT NULL,
        answers TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

function done(bool $ok, string $msg = '', array $extra = []): void {
    echo json_encode(array_merge(["success" => $ok, "message" => $msg], $extra));
    exit;
}

/** Confirm the requester owns the job post behind this application. */
function guide_owner_check(mysqli $conn, int $appId, int $requesterId): void {
    $st = $conn->prepare("
        SELECT jp.parent_id FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        WHERE ja.application_id = ? LIMIT 1");
    $st->bind_param("i", $appId);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();
    carelink_require_self($requesterId, $row ? (int) $row['parent_id'] : 0, 'You are not allowed to view or edit this interview guide.');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $appId       = (int) ($_GET['application_id'] ?? 0);
    $requesterId = (int) ($_GET['requester_id'] ?? 0);
    if ($appId <= 0) done(false, "Missing application id.");
    guide_owner_check($conn, $appId, $requesterId);

    $st = $conn->prepare("SELECT answers FROM interview_notes WHERE application_id = ?");
    $st->bind_param("i", $appId);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    $answers = $row ? json_decode($row['answers'], true) : null;
    done(true, "ok", ["answers" => $answers]);
}

// POST
$data        = json_decode(file_get_contents("php://input"), true) ?: [];
$appId       = (int) ($data['application_id'] ?? 0);
$requesterId = (int) ($data['requester_id'] ?? 0);
$answers     = $data['answers'] ?? null;
if ($appId <= 0) done(false, "Missing application id.");
if (!is_array($answers)) done(false, "Missing answers.");
guide_owner_check($conn, $appId, $requesterId);

// Cap each field so the free-text can't grow unbounded.
$clean = [];
foreach ($answers as $k => $v) {
    $clean[(string) $k] = mb_substr(trim((string) $v), 0, 800);
}
$json = json_encode($clean);

$st = $conn->prepare("
    INSERT INTO interview_notes (application_id, parent_id, answers) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), answers = VALUES(answers)");
$st->bind_param("iis", $appId, $requesterId, $json);
$ok = $st->execute();
$st->close();

done($ok, $ok ? "Interview notes saved." : "Could not save.");
