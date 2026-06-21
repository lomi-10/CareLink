<?php
/**
 * resolve_complaint.php — PESO resolves or dismisses a complaint escalated to them.
 * POST JSON: complaint_id, peso_user_id, action ('Resolved'|'Dismissed'), notes?
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

function out(bool $ok, string $msg): void
{
    echo json_encode(['success' => $ok, 'message' => $msg]);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $complaintId = isset($input['complaint_id']) ? (int) $input['complaint_id'] : 0;
    $pesoUserId = isset($input['peso_user_id']) ? (int) $input['peso_user_id'] : 0;
    $action = isset($input['action']) ? trim((string) $input['action']) : '';
    $notes = isset($input['notes']) ? trim((string) $input['notes']) : null;

    if ($complaintId <= 0 || $pesoUserId <= 0 || !in_array($action, ['Resolved', 'Dismissed'], true)) {
        out(false, 'complaint_id, peso_user_id, and a valid action are required');
    }

    peso_validate_staff_actor($conn, $pesoUserId);

    $st = $conn->prepare("
        SELECT complaint_id FROM complaints WHERE complaint_id = ? AND status = 'Escalated_PESO' LIMIT 1
    ");
    $st->bind_param('i', $complaintId);
    $st->execute();
    if (!$st->get_result()->fetch_assoc()) {
        $st->close();
        out(false, 'Complaint not found or not currently escalated to PESO');
    }
    $st->close();

    $upd = $conn->prepare("
        UPDATE complaints
        SET status = ?, resolution_notes = ?, resolved_by = ?, resolved_at = NOW()
        WHERE complaint_id = ?
    ");
    $upd->bind_param('ssii', $action, $notes, $pesoUserId, $complaintId);
    if (!$upd->execute()) {
        $err = $upd->error;
        $upd->close();
        throw new Exception('Update failed: ' . $err);
    }
    $upd->close();

    peso_audit_verification($conn, $pesoUserId, $action === 'Resolved' ? 'complaint_resolved' : 'complaint_dismissed', 'complaints', $complaintId);

    out(true, 'Complaint ' . strtolower($action));
} catch (Exception $e) {
    out(false, $e->getMessage());
} finally {
    if (isset($conn) && $conn) {
        $conn->close();
    }
}
