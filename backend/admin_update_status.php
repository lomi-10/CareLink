<?php
// carelink_api/admin_update_status.php
// Super Admin approves / suspends a user account from the User Verification screen.
//
// Companion to admin_get_users.php — also referenced by the frontend but never
// created. Sets the ACCOUNT status (users.status). It deliberately does NOT touch
// helper_profiles.verification_status: PESO document verification is a separate
// gate owned by the PESO portal.
//
// POST JSON { target_user_id, new_status, admin_id } -> { success, message }.
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include("dbcon.php");

$data = json_decode(file_get_contents("php://input"), true) ?: [];
$target    = isset($data['target_user_id']) ? (int) $data['target_user_id'] : 0;
$newStatus = isset($data['new_status']) ? trim($data['new_status']) : '';
$adminId   = isset($data['admin_id']) ? (int) $data['admin_id'] : 0;

$allowed = ['approved', 'pending', 'suspended'];
if ($target <= 0 || !in_array($newStatus, $allowed, true)) {
    echo json_encode(["success" => false, "message" => "Invalid request."]);
    exit;
}

$stmt = $conn->prepare("UPDATE users SET status = ?, updated_at = NOW() WHERE user_id = ?");
$stmt->bind_param("si", $newStatus, $target);
$ok = $stmt->execute();

if ($ok) {
    // Audit trail so the Super Admin's actions are recorded like every other.
    $action = "ADMIN_SET_STATUS_" . strtoupper($newStatus);
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $device = "Admin action" . ($adminId ? " by user #$adminId" : "");
    $log = $conn->prepare("INSERT INTO log_trail (user_id, action, module, status, ip_address, device_info) VALUES (?, ?, 'User Management', 'Success', ?, ?)");
    $log->bind_param("isss", $target, $action, $ip, $device);
    $log->execute();
}

echo json_encode([
    "success" => (bool) $ok,
    "message" => $ok ? "User status updated to {$newStatus}." : "Update failed.",
]);
