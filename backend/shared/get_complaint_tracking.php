<?php
/**
 * shared/get_complaint_tracking.php — the case tracker, for the two people in it.
 *
 * PESO asked that tracking be visible to the users, not just to the office. A
 * complainant who hears nothing assumes nothing is happening, and a respondent
 * who is never told what is alleged cannot answer it.
 *
 * ACCESS: only the complainant or the respondent of that specific case, proven
 * against the database — not taken from the request. Internal PESO notes are
 * filtered out (see carelink_complaint_timeline's $partyView), and the officer's
 * name is replaced with "PESO Ormoc" so neither party can go around the office.
 *
 * GET ?user_id=..            → that user's cases, with their trackers
 * GET ?user_id=..&complaint_id=..  → one case
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/complaint_tracking_tables.php';
require_once __DIR__ . '/ownership_guard.php';

function out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    ensure_complaint_tracking_tables($conn);

    $userId    = (int) ($_GET['user_id'] ?? 0);
    $requester = (int) ($_GET['requester_id'] ?? $userId);
    if ($userId <= 0) throw new Exception('user_id is required.');

    // Same chokepoint every other personal endpoint uses — prefers the session
    // token, falls back to the legacy id comparison. See shared/auth_tokens.php.
    carelink_require_self($requester, $userId, 'You can only view your own cases.');

    $one = (int) ($_GET['complaint_id'] ?? 0);

    $sql = "
        SELECT c.complaint_id, c.subject, c.category, c.status, c.escalation_stage,
               c.description, c.incident_at, c.incident_location,
               c.incident_barangay, c.incident_municipality, c.incident_province,
               c.created_at, c.resolved_at, c.complainant_id, c.respondent_id
        FROM complaints c
        WHERE (c.complainant_id = ? OR c.respondent_id = ?)"
        . ($one > 0 ? " AND c.complaint_id = ?" : "")
        . " ORDER BY c.created_at DESC LIMIT 50";

    $st = $conn->prepare($sql);
    if (!$st) throw new Exception('Prepare failed.');
    if ($one > 0) $st->bind_param('iii', $userId, $userId, $one);
    else          $st->bind_param('ii', $userId, $userId);
    $st->execute();
    $res = $st->get_result();

    $cases = [];
    while ($r = $res->fetch_assoc()) {
        $cid = (int) $r['complaint_id'];
        $isComplainant = (int) $r['complainant_id'] === $userId;

        $addrParts = array_filter([
            $r['incident_location'], $r['incident_barangay'],
            $r['incident_municipality'], $r['incident_province'],
        ]);

        $cases[] = [
            'complaint_id' => $cid,
            'reference'    => 'GRV-' . str_pad((string) $cid, 4, '0', STR_PAD_LEFT),
            // Which side of the case this viewer is on. The respondent sees the
            // allegation and the progress, never who reported them — that is
            // the office's to hold, not the accused's to act on.
            'your_role'    => $isComplainant ? 'complainant' : 'respondent',
            'subject'      => $r['subject'],
            'category'     => $r['category'],
            'status'       => $r['status'],
            'stage'        => $r['escalation_stage'],
            'description'  => $isComplainant ? $r['description'] : null,
            'incident_at'  => $r['incident_at'],
            'incident_address' => $addrParts ? implode(', ', $addrParts) : null,
            'created_at'   => $r['created_at'],
            'resolved_at'  => $r['resolved_at'],
            'timeline'     => carelink_complaint_timeline($conn, $cid, true),
        ];
    }
    $st->close();

    out(true, 'ok', ['cases' => $cases]);

} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
