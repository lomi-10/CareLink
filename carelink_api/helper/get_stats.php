<?php
// carelink_api/helper/get_stats.php

/* =================================================================================
   🚨 REQUIRED DATABASE UPDATES 🚨
   Run these SQL queries in your phpMyAdmin/HeidiSQL before using this endpoint!

   1. CREATE THE MISSING 'saved_jobs' TABLE:
   CREATE TABLE IF NOT EXISTS `saved_jobs` (
      `save_id` int NOT NULL AUTO_INCREMENT,
      `helper_id` int NOT NULL,
      `job_post_id` int NOT NULL,
      `saved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`save_id`),
      UNIQUE KEY `uk_helper_job` (`helper_id`,`job_post_id`),
      KEY `idx_job` (`job_post_id`),
      CONSTRAINT `fk_sjobs_helper` FOREIGN KEY (`helper_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
      CONSTRAINT `fk_sjobs_job` FOREIGN KEY (`job_post_id`) REFERENCES `job_posts` (`job_post_id`) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

   2. ADD 'profile_views' COLUMN TO 'helper_profiles':
   ALTER TABLE `helper_profiles` ADD COLUMN `profile_views` int DEFAULT 0 AFTER `rating_count`;
================================================================================= 

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
    "applications" => 0,
    "saved_jobs" => 0,
    "profile_views" => 0
];

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // 1. Get total Job Applications for this helper
    $app_sql = "SELECT COUNT(*) as count FROM job_applications WHERE helper_id = ?";
    $app_stmt = $conn->prepare($app_sql);
    if ($app_stmt) {
        $app_stmt->bind_param("i", $user_id);
        $app_stmt->execute();
        $app_result = $app_stmt->get_result();
        if ($row = $app_result->fetch_assoc()) {
            $stats["applications"] = (int)$row['count'];
        }
        $app_stmt->close();
    }

    // 2. Get total Saved Jobs for this helper
    // (This will safely return 0 if the table exists but is empty)
    $saved_sql = "SELECT COUNT(*) as count FROM saved_jobs WHERE helper_id = ?";
    $saved_stmt = $conn->prepare($saved_sql);
    if ($saved_stmt) {
        $saved_stmt->bind_param("i", $user_id);
        if ($saved_stmt->execute()) { // Safely execute in case table isn't created yet
            $saved_result = $saved_stmt->get_result();
            if ($row = $saved_result->fetch_assoc()) {
                $stats["saved_jobs"] = (int)$row['count'];
            }
        }
        $saved_stmt->close();
    }

    // 3. Get total Profile Views
    $views_sql = "SELECT profile_views FROM helper_profiles WHERE user_id = ?";
    $views_stmt = $conn->prepare($views_sql);
    if ($views_stmt) {
        $views_stmt->bind_param("i", $user_id);
        if ($views_stmt->execute()) { // Safely execute in case column isn't created yet
            $views_result = $views_stmt->get_result();
            if ($row = $views_result->fetch_assoc()) {
                // Check if the column exists in the fetched row to avoid warnings
                if (isset($row['profile_views'])) {
                    $stats["profile_views"] = (int)$row['profile_views'];
                }
            }
        }
        $views_stmt->close();
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
    */

// carelink_api/helper/get_stats.php

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

// Initialize stats array based strictly on your React Native hook expectations
$stats = [
    "applications" => 0,
    "saved_jobs" => 0,     // Returns 0 (Feature not yet in DB)
    "profile_views" => 0   // Returns 0 (Feature not yet in DB)
];

try {
    if (!$conn) {
        throw new Exception("Database connection failed");
    }

    // 1. Get total Job Applications using your existing 'job_applications' table
    $app_sql = "SELECT COUNT(*) as count FROM job_applications WHERE helper_id = ?";
    $app_stmt = $conn->prepare($app_sql);
    
    if ($app_stmt) {
        $app_stmt->bind_param("i", $user_id);
        $app_stmt->execute();
        $app_result = $app_stmt->get_result();
        
        if ($row = $app_result->fetch_assoc()) {
            $stats["applications"] = (int)$row['count'];
        }
        $app_stmt->close();
    }

    // 2 & 3. saved_jobs and profile_views remain 0 automatically based on the array initialization above.

    // Return the successful JSON response
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