<?php
/**
 * GET: peso_user_id
 * Lists complaints escalated to PESO (status = Escalated_PESO).
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

    $uid = isset($_GET['peso_user_id']) ? (int) $_GET['peso_user_id'] : 0;
    if ($uid <= 0) {
        out(false, 'peso_user_id required');
    }

    $chk = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = 'peso' LIMIT 1");
    $chk->bind_param('i', $uid);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) {
        $chk->close();
        out(false, 'Forbidden');
    }
    $chk->close();

    $sql = "
        SELECT c.complaint_id, c.application_id, c.placement_id, c.complainant_id, c.respondent_id,
               c.complainant_role, c.category, c.subject, c.description, c.status,
               c.admin_forward_note, c.forwarded_at, c.created_at,
               TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS complainant_name,
               TRIM(CONCAT(COALESCE(r.first_name, ''), ' ', COALESCE(r.last_name, ''))) AS respondent_name
        FROM complaints c
        INNER JOIN users u ON u.user_id = c.complainant_id
        LEFT JOIN users r ON r.user_id = c.respondent_id
        WHERE c.status = 'Escalated_PESO'
        ORDER BY c.forwarded_at DESC, c.created_at DESC
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
            'respondent_name' => trim((string) ($r['respondent_name'] ?? '')),
            'is_general' => $appId === null,
            'category' => $r['category'],
            'subject' => $r['subject'],
            'body' => (string) $r['description'],
            'status' => $r['status'],
            'severity' => 'elevated',
            'admin_notes' => $r['admin_forward_note'],
            'forwarded_at' => $r['forwarded_at'],
            'created_at' => $r['created_at'],
        ];
    }
    $res->free();

    out(true, 'ok', ['complaints' => $list]);
} catch (Exception $e) {
    out(false, $e->getMessage());
}
