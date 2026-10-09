<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';
require_once __DIR__ . '/../shared/announcements_table.php';

function announcement_response(bool $success, string $message, ?array $data = null): void
{
    echo json_encode(array_filter([
        'success' => $success,
        'message' => $message,
        'data' => $data,
    ], static fn($value) => $value !== null));
    exit();
}

function save_announcement_image(array $file): string
{
    if ($file['error'] !== UPLOAD_ERR_OK) {
        if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
            throw new InvalidArgumentException('The selected image exceeds the server upload limit.');
        }
        throw new InvalidArgumentException('The image upload did not complete. Please try again.');
    }
    if ($file['size'] <= 0) {
        throw new InvalidArgumentException('The selected image is empty.');
    }
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new InvalidArgumentException('The selected image is larger than 5 MB.');
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'image/bmp' => 'bmp',
        'image/x-ms-bmp' => 'bmp',
        'image/tiff' => 'tif',
        'image/avif' => 'avif',
        'image/heic' => 'heic',
        'image/heif' => 'heif',
        'image/heic-sequence' => 'heic',
        'image/heif-sequence' => 'heif',
        'image/vnd.microsoft.icon' => 'ico',
        'image/x-icon' => 'ico',
        'image/jp2' => 'jp2',
        'image/jpx' => 'jpx',
        'image/jpm' => 'jpm',
        'image/jxr' => 'jxr',
    ];
    if (!is_string($mime) || !isset($extensions[$mime])) {
        throw new InvalidArgumentException('This image format is not supported. Try JPG, PNG, GIF, WebP, BMP, TIFF, AVIF, HEIC, or HEIF.');
    }

    $uploadDir = dirname(__DIR__, 2) . '/uploads/announcements/';
    if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
        throw new RuntimeException('Could not create the announcement image directory.');
    }
    $filename = 'announcement_' . bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
        throw new RuntimeException('Could not save the announcement image.');
    }
    return 'uploads/announcements/' . $filename;
}

function remove_announcement_image(?string $relativePath): void
{
    if (!$relativePath || !preg_match('#^uploads/announcements/announcement_[a-f0-9]{32}\.(jpg|png|webp|gif|bmp|tif|avif|heic|heif|ico|jp2|jpx|jpm|jxr)$#', $relativePath)) {
        return;
    }
    $imageFile = dirname(__DIR__, 2) . '/' . $relativePath;
    if (is_file($imageFile) && !unlink($imageFile)) {
        error_log('Could not delete announcement image: ' . $imageFile);
    }
}

try {
    $staffId = peso_require_staff($conn);
    ensure_announcements_table($conn);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $result = $conn->query("
            SELECT announcement_id, title, body, image_path, created_at
            FROM announcements
            ORDER BY created_at DESC, announcement_id DESC
            LIMIT 20
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
        announcement_response(true, 'Announcements loaded.', ['announcements' => $items]);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        announcement_response(false, 'GET or POST is required.');
    }

    $action = trim((string) ($_POST['action'] ?? 'create'));
    if ($action === 'delete') {
        $announcementId = filter_var($_POST['announcement_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$announcementId || $announcementId <= 0) {
            http_response_code(400);
            announcement_response(false, 'A valid announcement_id is required.');
        }
        $find = $conn->prepare('SELECT image_path FROM announcements WHERE announcement_id = ?');
        if (!$find) {
            throw new RuntimeException('Could not prepare announcement lookup: ' . $conn->error);
        }
        $find->bind_param('i', $announcementId);
        $find->execute();
        $existing = $find->get_result()->fetch_assoc();
        $find->close();
        if (!$existing) {
            http_response_code(404);
            announcement_response(false, 'Announcement not found.');
        }
        $delete = $conn->prepare('DELETE FROM announcements WHERE announcement_id = ?');
        if (!$delete) {
            throw new RuntimeException('Could not prepare announcement deletion: ' . $conn->error);
        }
        $delete->bind_param('i', $announcementId);
        if (!$delete->execute()) {
            throw new RuntimeException('Could not delete announcement: ' . $delete->error);
        }
        $delete->close();
        remove_announcement_image($existing['image_path'] ?? null);
        announcement_response(true, 'Announcement deleted.');
    }

    if (!in_array($action, ['create', 'edit'], true)) {
        http_response_code(400);
        announcement_response(false, 'Unsupported announcement action.');
    }

    $announcementId = null;
    $oldImagePath = null;
    if ($action === 'edit') {
        $announcementId = filter_var($_POST['announcement_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$announcementId || $announcementId <= 0) {
            http_response_code(400);
            announcement_response(false, 'A valid announcement_id is required.');
        }
        $find = $conn->prepare('SELECT image_path FROM announcements WHERE announcement_id = ?');
        if (!$find) {
            throw new RuntimeException('Could not prepare announcement lookup: ' . $conn->error);
        }
        $find->bind_param('i', $announcementId);
        $find->execute();
        $existing = $find->get_result()->fetch_assoc();
        $find->close();
        if (!$existing) {
            http_response_code(404);
            announcement_response(false, 'Announcement not found.');
        }
        $oldImagePath = $existing['image_path'] ?? null;
    }

    $title = trim((string) ($_POST['title'] ?? ''));
    $body = trim((string) ($_POST['body'] ?? ''));
    if ($title === '' || mb_strlen($title) > 160) {
        http_response_code(400);
        announcement_response(false, 'Enter a title of 1 to 160 characters.');
    }
    if ($body === '' || mb_strlen($body) > 5000) {
        http_response_code(400);
        announcement_response(false, 'Enter announcement text of 1 to 5,000 characters.');
    }

    $imagePath = $oldImagePath;
    $removeImage = filter_var($_POST['remove_image'] ?? false, FILTER_VALIDATE_BOOLEAN);
    if ($removeImage) {
        $imagePath = null;
    }
    $newImagePath = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        $newImagePath = save_announcement_image($_FILES['image']);
        $imagePath = $newImagePath;
    }

    if ($action === 'edit') {
        $stmt = $conn->prepare('UPDATE announcements SET title = ?, body = ?, image_path = ? WHERE announcement_id = ?');
        if (!$stmt) {
            if ($newImagePath) remove_announcement_image($newImagePath);
            throw new RuntimeException('Could not prepare announcement update: ' . $conn->error);
        }
        $stmt->bind_param('sssi', $title, $body, $imagePath, $announcementId);
    } else {
        $stmt = $conn->prepare('INSERT INTO announcements (title, body, image_path, published_by) VALUES (?, ?, ?, ?)');
        if (!$stmt) {
            if ($newImagePath) remove_announcement_image($newImagePath);
            throw new RuntimeException('Could not prepare announcement: ' . $conn->error);
        }
        $stmt->bind_param('sssi', $title, $body, $imagePath, $staffId);
    }
    if (!$stmt) {
        throw new RuntimeException('Could not prepare announcement: ' . $conn->error);
    }
    if (!$stmt->execute()) {
        if ($newImagePath) remove_announcement_image($newImagePath);
        throw new RuntimeException('Could not publish announcement: ' . $stmt->error);
    }
    if ($action === 'create') {
        $announcementId = (int) $stmt->insert_id;
    }
    $stmt->close();
    if ($oldImagePath && $oldImagePath !== $imagePath) {
        remove_announcement_image($oldImagePath);
    }

    announcement_response(true, $action === 'edit' ? 'Announcement updated.' : 'Announcement published.', ['announcement_id' => $announcementId]);
} catch (Throwable $error) {
    error_log('manage_announcements.php: ' . $error->getMessage());
    if ($error instanceof InvalidArgumentException) {
        http_response_code(400);
        announcement_response(false, $error->getMessage());
    }
    if (http_response_code() < 400) {
        http_response_code(500);
    }
    announcement_response(false, 'Could not publish the announcement.');
}
