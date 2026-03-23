<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(E_ALL);

include_once '../dbcon.php';

if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
    echo json_encode(["success" => false, "message" => "Missing user_id parameter"]);
    exit;
}

$user_id = intval($_GET['user_id']);

$stats = [
    "active_job_posts" => 0,
    "total_applicants" => 0,
    "active_placements" => 0,
    "saved_helpers" => 0
];

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // 1. Count Active Job Posts
    $jobs_sql = "SELECT COUNT(*) as count FROM job_posts WHERE parent_id = ? AND status = 'Open'";
    $jobs_stmt = $conn->prepare($jobs_sql);
    if ($jobs_stmt) {
        $jobs_stmt->bind_param("i", $user_id);
        $jobs_stmt->execute();
        $stats["active_job_posts"] = (int)$jobs_stmt->get_result()->fetch_assoc()['count'];
        $jobs_stmt->close();
    }

    // 2. Count Total Applicants (Join job_applications with the parent's job_posts)
    $apps_sql = "SELECT COUNT(ja.application_id) as count 
                 FROM job_applications ja 
                 INNER JOIN job_posts jp ON ja.job_post_id = jp.job_post_id 
                 WHERE jp.parent_id = ? AND ja.status != 'Withdrawn'";
    $apps_stmt = $conn->prepare($apps_sql);
    if ($apps_stmt) {
        $apps_stmt->bind_param("i", $user_id);
        $apps_stmt->execute();
        $stats["total_applicants"] = (int)$apps_stmt->get_result()->fetch_assoc()['count'];
        $apps_stmt->close();
    }

    // 3. Count Active Placements (Currently hired helpers)
    $place_sql = "SELECT COUNT(*) as count FROM placements WHERE parent_id = ? AND status = 'Active'";
    $place_stmt = $conn->prepare($place_sql);
    if ($place_stmt) {
        $place_stmt->bind_param("i", $user_id);
        $place_stmt->execute();
        $stats["active_placements"] = (int)$place_stmt->get_result()->fetch_assoc()['count'];
        $place_stmt->close();
    }

    // 4. Count Saved Helper Profiles (Bookmarks)
    $saved_sql = "SELECT COUNT(*) as count FROM saved_profiles WHERE parent_id = ?";
    $saved_stmt = $conn->prepare($saved_sql);
    if ($saved_stmt) {
        $saved_stmt->bind_param("i", $user_id);
        $saved_stmt->execute();
        $stats["saved_helpers"] = (int)$saved_stmt->get_result()->fetch_assoc()['count'];
        $saved_stmt->close();
    }

    echo json_encode([
        "success" => true,
        "stats" => $stats
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
?>