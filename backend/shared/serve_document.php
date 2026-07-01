<?php
/**
 * serve_document.php — the ONLY way a document's file bytes should reach a
 * browser/app now. Documents used to be saved straight under a publicly
 * web-accessible folder, so anyone with (or who guessed) the URL could open
 * them with zero login check. This script requires a signed, time-limited
 * token instead — see file_security.php for how that token is built/checked.
 *
 * GET: document_id, expires, token (all three come from the signed URL that
 *      get_documents.php now returns — nothing the frontend builds by hand).
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/file_security.php';

function deny(int $code, string $message): void
{
    http_response_code($code);
    header('Content-Type: text/plain');
    echo $message;
    exit();
}

if (!$conn) {
    deny(500, 'Database connection failed');
}

$documentId = isset($_GET['document_id']) ? (int) $_GET['document_id'] : 0;
$expires = isset($_GET['expires']) ? (int) $_GET['expires'] : 0;
$token = isset($_GET['token']) ? (string) $_GET['token'] : '';

if ($documentId <= 0 || $expires <= 0 || $token === '') {
    deny(400, 'Missing or invalid link parameters.');
}

if (!carelink_verify_document_token($documentId, $expires, $token)) {
    // Either the token doesn't match (URL was tampered with / guessed) or
    // it's past its expiry time. Either way, we don't say which — telling an
    // attacker "expired" vs "invalid" just helps them refine their guesses.
    deny(403, 'This document link is invalid or has expired. Please reopen it from the app.');
}

$stmt = $conn->prepare('SELECT file_path FROM user_documents WHERE document_id = ? LIMIT 1');
$stmt->bind_param('i', $documentId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    deny(404, 'Document not found.');
}

$uploadDir = realpath(dirname(__DIR__) . '/uploads/documents');
$filePath = realpath($uploadDir . '/' . $row['file_path']);

// realpath() resolves any ".." segments — if the result isn't still inside
// $uploadDir, something is wrong (e.g. a corrupted file_path) and we must
// not serve it. This is the standard guard against path traversal.
if ($filePath === false || $uploadDir === false || strncmp($filePath, $uploadDir, strlen($uploadDir)) !== 0) {
    deny(404, 'Document not found.');
}

if (!is_file($filePath)) {
    deny(404, 'Document not found.');
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($filePath) ?: 'application/octet-stream';

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($filePath));
header('Content-Disposition: inline; filename="' . basename($filePath) . '"');
// Sensitive personal documents: don't let browsers or proxies cache a copy.
header('Cache-Control: private, no-store, max-age=0');

readfile($filePath);

if (isset($conn) && $conn) {
    $conn->close();
}
