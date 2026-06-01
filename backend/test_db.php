<?php
require_once __DIR__ . '/dbcon.php';

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
