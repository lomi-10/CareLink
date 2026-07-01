<?php
// carelink_api/messages/upload_image.php
// Handles image uploads for chat messages

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
require_once __DIR__ . '/../shared/ownership_guard.php';

$user_id      = isset($_POST['user_id'])      ? intval($_POST['user_id'])      : 0;
$requester_id = isset($_POST['requester_id']) ? intval($_POST['requester_id']) : 0;
if (!$user_id) {
    echo json_encode(['success' => false, 'message' => 'user_id required']);
    exit();
}

try {
    carelink_require_self($requester_id, $user_id, 'You are not allowed to upload an image for this account.');
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit();
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'No valid image uploaded']);
    exit();
}

$allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $_FILES['image']['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, $allowed_types)) {
    echo json_encode(['success' => false, 'message' => 'Only JPEG, PNG, GIF, and WebP images are allowed']);
    exit();
}

$max_size = 5 * 1024 * 1024; // 5 MB
if ($_FILES['image']['size'] > $max_size) {
    echo json_encode(['success' => false, 'message' => 'Image must be under 5 MB']);
    exit();
}

$ext      = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION) ?: 'jpg';
$filename = 'msg_' . $user_id . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($ext);
$upload_dir = __DIR__ . '/../../uploads/messages/';
if (!is_dir($upload_dir)) mkdir($upload_dir, 0775, true);

$dest = $upload_dir . $filename;
if (!move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
    echo json_encode(['success' => false, 'message' => 'Failed to save image']);
    exit();
}

// Build a relative URL (will be prefixed on get_messages.php)
$relative = 'uploads/messages/' . $filename;

echo json_encode(['success' => true, 'image_url' => $relative]);
?>
