<?php
declare(strict_types=1);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/announcements_table.php';

$filename = trim((string) ($_GET['filename'] ?? ''));
if (!preg_match('/^announcement_[a-f0-9]{32}\.(jpg|png|webp|gif|bmp|tif|avif|heic|heif|ico|jp2|jpx|jpm|jxr)$/', $filename)) {
    http_response_code(400);
    exit();
}

try {
    ensure_announcements_table($conn);
    $stmt = $conn->prepare('SELECT 1 FROM announcements WHERE image_path = ? LIMIT 1');
    if (!$stmt) {
        throw new RuntimeException('Could not prepare announcement image lookup: ' . $conn->error);
    }
    $relativePath = 'uploads/announcements/' . $filename;
    $stmt->bind_param('s', $relativePath);
    if (!$stmt->execute()) {
        throw new RuntimeException('Could not check announcement image: ' . $stmt->error);
    }
    $isPublished = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    if (!$isPublished) {
        http_response_code(404);
        exit();
    }

    $imagePaths = [
        dirname(__DIR__) . '/uploads/announcements/' . $filename,
        dirname(__DIR__, 2) . '/uploads/announcements/' . $filename,
    ];
    $imageFile = null;
    foreach ($imagePaths as $candidate) {
        if (is_file($candidate)) {
            $imageFile = $candidate;
            break;
        }
    }
    if ($imageFile === null) {
        http_response_code(404);
        exit();
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($imageFile);
    if (!is_string($mime) || !str_starts_with($mime, 'image/')) {
        http_response_code(415);
        exit();
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string) filesize($imageFile));
    header('Cache-Control: public, max-age=3600');
    header('X-Content-Type-Options: nosniff');
    readfile($imageFile);
} catch (Throwable $error) {
    error_log('announcement_image.php: ' . $error->getMessage());
    http_response_code(500);
}
