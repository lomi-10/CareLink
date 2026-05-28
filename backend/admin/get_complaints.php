<?php
/**
 * GET: admin_user_id
 * Lists rows from `complaints` for the super admin dashboard.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
require_once __DIR__ . '/../dbcon.php';

function out($ok, $msg, $extra = [])
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $admin_id = isset($_GET['admin_user_id']) ? (int) $_GET['admin_user_id'] : 0;
    if ($admin_id <= 0) {
        out(false, 'admin_user_id required');
    }

    $chk = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'admin' LIMIT 1");
    $chk->bind_param('i', $admin_id);
    $chk->execute();
    $ok = $chk->get_result()->fetch_assoc();
    $chk->close();
    if (!$ok) {
        out(false, 'Forbidden');
    }

    $sql = "
        SELECT c.complaint_id, c.application_id, c.placement_id, c.complainant_id, c.respondent_id,
               c.complainant_role, c.category, c.subject, c.description, c.status,
               c.forwarded_by_admin_id, c.forwarded_at, c.admin_forward_note, c.created_at,
               TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS complainant_name
        FROM complaints c
        INNER JOIN users u ON u.user_id = c.complainant_id
        ORDER BY c.created_at DESC
        LIMIT 200
    ";
    $res = $conn->query($sql);
    if (!$res) {
        throw new Exception('Query failed');
    }
    $list = [];
    while ($r = $res->fetch_assoc()) {
        $appId = $r['application_id'];
        $list[] = [
            'complaint_id' => (int) $r['complaint_id'],
            'application_id' => $appId !== null ? (int) $appId : null,
            'placement_id' => $r['placement_id'] !== null ? (int) $r['placement_id'] : null,
            'complainant_user_id' => (int) $r['complainant_id'],
            'respondent_id' => $r['respondent_id'] !== null ? (int) $r['respondent_id'] : null,
            'complainant_role' => $r['complainant_role'],
            'complainant_name' => trim((string) $r['complainant_name']),
            'category' => $r['category'],
            'subject' => $r['subject'],
            'body' => (string) $r['description'],
            'status' => $r['status'],
            'severity' => $r['status'] === 'Escalated_PESO' ? 'elevated' : 'standard',
            'admin_notes' => $r['admin_forward_note'],
            'forwarded_by_admin_id' => $r['forwarded_by_admin_id'] !== null ? (int) $r['forwarded_by_admin_id'] : null,
            'forwarded_at' => $r['forwarded_at'],
            'created_at' => $r['created_at'],
        ];
    }
    $res->free();

    out(true, 'ok', ['complaints' => $list]);
} catch (Exception $e) {
    out(false, $e->getMessage());
}
