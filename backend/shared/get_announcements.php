<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/announcements_table.php';

function announcements_response(bool $success, string $message, ?array $data = null): void
{
    echo json_encode(array_filter([
        'success' => $success,
        'message' => $message,
        'data' => $data,
    ], static fn($value) => $value !== null));
    exit();
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        announcements_response(false, 'GET is required.');
    }
    $userId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
    if (!$userId || $userId <= 0) {
        http_response_code(400);
        announcements_response(false, 'A valid user_id is required.');
    }
    $userStmt = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type IN ('helper', 'parent') LIMIT 1");
    if (!$userStmt) {
        throw new RuntimeException('Could not prepare account validation: ' . $conn->error);
    }
    $userStmt->bind_param('i', $userId);
    $userStmt->execute();
    $userExists = $userStmt->get_result()->num_rows > 0;
    $userStmt->close();
    if (!$userExists) {
        http_response_code(403);
        announcements_response(false, 'Only helper and employer accounts can view announcements.');
    }

    ensure_announcements_table($conn);
    $result = $conn->query("
        SELECT announcement_id, title, body, image_path, created_at
        FROM announcements
        ORDER BY created_at DESC, announcement_id DESC
        LIMIT 5
    ");
    if (!$result) {
        throw new RuntimeException('Could not load announcements: ' . $conn->error);
    }
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = [
            'announcement_id' => (int) $row['announcement_id'],
            'title' => $row['title'],
            'body' => $row['body'],
            'image_path' => $row['image_path'],
            'created_at' => $row['created_at'],
        ];
    }
    announcements_response(true, 'Announcements loaded.', ['announcements' => $items]);
} catch (Throwable $error) {
    error_log('get_announcements.php: ' . $error->getMessage());
    http_response_code(500);
    announcements_response(false, 'Could not load announcements.');
}
