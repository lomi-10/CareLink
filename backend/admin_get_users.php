<?php
// carelink_api/admin_get_users.php
// Lists users for the Super Admin "User Verification" screen.
//
// This endpoint was referenced by the frontend (app/admin/user_management.tsx and
// the admin dashboard's Total Users stat) but never existed on disk, so the screen
// always showed "Failed to fetch users." and the dashboard showed 0 users.
//
// Response: a JSON ARRAY of user rows shaped exactly as the screen renders them —
// { user_id, name, email, user_type, status, created_at, doc_count }.
// Optional ?status=pending filters to accounts awaiting approval.
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include("dbcon.php");

$status = isset($_GET['status']) ? trim($_GET['status']) : '';

$select = "SELECT u.user_id,
                  TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))) AS name,
                  u.email,
                  u.user_type,
                  u.status,
                  u.created_at,
                  (SELECT COUNT(*) FROM user_documents d WHERE d.user_id = u.user_id) AS doc_count
           FROM users u";

if ($status !== '') {
    $stmt = $conn->prepare($select . " WHERE u.status = ? ORDER BY u.created_at DESC");
    $stmt->bind_param("s", $status);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $result = $conn->query($select . " ORDER BY u.created_at DESC");
}

$users = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['doc_count'] = (int) $row['doc_count'];
        $users[] = $row;
    }
}

echo json_encode($users);
