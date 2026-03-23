<?php
// carelink_api/dbcon.php
// Database connection for Laragon (MySQL)

// Error handling setup
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// Start output buffering
ob_start();

// Database configuration for Laragon
$host = 'localhost';        // Laragon default
$username = 'root';         // Laragon default
$password = '';             // Laragon default (empty)
$database = 'carelink';

// Create connection
$conn = mysqli_connect($host, $username, $password, $database);

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

error_log("Database connection successful at " . date('Y-m-d H:i:s'));

// Connection successful - ready to use
?>