<?php
// carelink_api/dbcon.php
// Database connection - works for both Laragon (local) and production (Railway)

// Error handling setup
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

// Start output buffering
ob_start();

// Portable config: real env vars (Railway/VPS) first, else backend/config.local.php.
require_once __DIR__ . '/load_config.php';

$host = carelink_cfg('DB_HOST', 'localhost');
$username = carelink_cfg('DB_USERNAME', 'root');
$password = carelink_cfg('DB_PASSWORD', '');
$database = carelink_cfg('DB_DATABASE', 'carelink');
$port = (int) carelink_cfg('DB_PORT', 3306);

// Create connection
$conn = mysqli_connect($host, $username, $password, $database, $port);

// Check connection
if (!$conn) {
    error_log("Database Connection Failed: " . mysqli_connect_error());
    
    // Return JSON error for API calls
    ob_clean();
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed. Please contact administrator.',
        'error_code' => 'DB_CONNECTION_ERROR'
    ]);
    exit;
}

// Set charset to UTF-8
mysqli_set_charset($conn, 'utf8mb4');

// Timezone (Philippines)
date_default_timezone_set('Asia/Manila');

// PHP alone is not enough: NOW() / CURRENT_TIMESTAMP are evaluated by MySQL, which
// uses the DATABASE SERVER's timezone. Locally that's already Manila, but shared
// hosts (Hostinger) run MySQL in UTC — so every NOW() landed 8 hours behind and the
// UI rendered brand-new rows as "8h ago". Pin the SESSION timezone to +08:00 so
// MySQL and PHP agree. A numeric offset is used rather than 'Asia/Manila' because
// named zones require MySQL's timezone tables, which shared hosts often omit.
// The Philippines has no DST, so a fixed +08:00 is correct year-round.
mysqli_query($conn, "SET time_zone = '+08:00'");

error_log("Database connection successful at " . date('Y-m-d H:i:s'));

// Connection OK. Do not add a closing PHP tag at end of file (prevents stray bytes before JSON).
