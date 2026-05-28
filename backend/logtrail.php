<?php
/**
 * GET ?user_id=N
 * Returns a JSON array of activity rows: [ { "action": string, "timestamp": string }, ... ]
 * Used by parent Settings "Activity log". Extend with a DB table when auditing is wired.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$userId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id is required']);
    exit;
}

// No activity_audit table wired yet — return empty list so the client stays quiet.
echo json_encode([]);
