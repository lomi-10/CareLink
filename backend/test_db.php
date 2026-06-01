<?php
// Temporarily enable error reporting to debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/dbcon.php';

// Let's test env vars first
echo "<h2>Environment Variables:</h2>";
echo "DB_HOST: " . (getenv('DB_HOST') ?: 'NOT SET') . "<br>";
echo "DB_PORT: " . (getenv('DB_PORT') ?: 'NOT SET') . "<br>";
echo "DB_USERNAME: " . (getenv('DB_USERNAME') ?: 'NOT SET') . "<br>";
echo "DB_PASSWORD: " . (getenv('DB_PASSWORD') ? 'SET (length=' . strlen(getenv('DB_PASSWORD')) . ')' : 'NOT SET') . "<br>";
echo "DB_DATABASE: " . (getenv('DB_DATABASE') ?: 'NOT SET') . "<br>";

echo "<hr><h2>Database Connection Test:</h2>";

// Run a simple query
$result = mysqli_query($conn, "SHOW TABLES;");

if (!$result) {
    echo json_encode([
        'success' => false,
        'message' => 'Query failed: ' . mysqli_error($conn)
    ]);
    exit;
}

$tables = [];
while ($row = mysqli_fetch_row($result)) {
    $tables[] = $row[0];
}

echo json_encode([
    'success' => true,
    'message' => 'Connected to Railway DB successfully!',
    'tables' => $tables
]);
