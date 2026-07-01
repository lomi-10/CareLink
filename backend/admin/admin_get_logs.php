<?php
// carelink_api/admin/admin_get_logs.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include("../dbcon.php");
include(__DIR__ . "/admin_auth.php");

$admin_user_id = isset($_GET['admin_user_id']) ? (int) $_GET['admin_user_id'] : 0;
admin_require_staff($conn, $admin_user_id);

$sql = "SELECT l.log_id, l.action, l.status, l.ip_address, l.device_info,
        l.created_at as timestamp, u.username, u.user_type as role
        FROM log_trail l
        LEFT JOIN users u ON l.user_id = u.user_id
        ORDER BY l.created_at DESC";

$result = $conn->query($sql);
$logs = [];
if ($result) {
    while($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
}
echo json_encode($logs);
?>