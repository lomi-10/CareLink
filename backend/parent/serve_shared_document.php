<?php
// Watermarked, application-scoped previews for documents shared with an employer.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: no-referrer");
header("Cache-Control: private, no-store, max-age=0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/file_security.php';

function denySharedDocument(int $status, string $message): void
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=UTF-8');
    echo $message;
    exit();
}

if (!$conn) {
    denySharedDocument(500, 'Document preview is temporarily unavailable.');
}

$applicationId = isset($_GET['application_id']) ? (int)$_GET['application_id'] : 0;
$documentId = isset($_GET['document_id']) ? (int)$_GET['document_id'] : 0;
$parentId = isset($_GET['parent_id']) ? (int)$_GET['parent_id'] : 0;
$side = isset($_GET['side']) && $_GET['side'] === 'back' ? 'back' : 'front';
$expires = isset($_GET['expires']) ? (int)$_GET['expires'] : 0;
$token = isset($_GET['token']) ? (string)$_GET['token'] : '';

if (!carelink_verify_shared_document_token($applicationId, $documentId, $parentId, $side, $expires, $token)) {
    denySharedDocument(403, 'This document preview has expired. Reopen it from the application.');
}

$stmt = $conn->prepare("
    SELECT ud.file_path, ud.file_path_back,
           CONCAT_WS(' ', employer.first_name, employer.last_name) AS employer_name
    FROM application_document_shares ads
    INNER JOIN job_applications ja ON ja.application_id = ads.application_id
    INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
    INNER JOIN user_documents ud ON ud.document_id = ads.document_id AND ud.user_id = ja.helper_id
    INNER JOIN users employer ON employer.user_id = jp.parent_id
    WHERE ads.application_id = ? AND ads.document_id = ? AND jp.parent_id = ?
    LIMIT 1
");
$stmt->bind_param('iii', $applicationId, $documentId, $parentId);
$stmt->execute();
$document = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$document) {
    denySharedDocument(404, 'This document is not shared for this application.');
}

$relativePath = $side === 'back' ? $document['file_path_back'] : $document['file_path'];
$uploadDirectory = realpath(dirname(__DIR__) . '/uploads/documents');
$filePath = $relativePath ? realpath($uploadDirectory . DIRECTORY_SEPARATOR . $relativePath) : false;

if ($uploadDirectory === false || $filePath === false
    || !str_starts_with($filePath, $uploadDirectory . DIRECTORY_SEPARATOR)
    || !is_file($filePath)) {
    denySharedDocument(404, 'Document file not found.');
}

if (filesize($filePath) > CARELINK_DOC_MAX_BYTES) {
    denySharedDocument(413, 'This document is too large to preview securely.');
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($filePath) ?: '';
$employerName = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', (string)$document['employer_name']);
$employerName = trim(substr(preg_replace('/[^A-Za-z0-9 ._-]/', '', $employerName ?: 'Employer') ?: 'Employer', 0, 32));
$watermark = sprintf('CARELINK %s (#%d) | VIEWED %s UTC', strtoupper($employerName), $parentId, gmdate('Y-m-d H:i'));

if ($mime === 'application/pdf') {
    $autoload = dirname(__DIR__) . '/vendor/autoload.php';
    $fpdfLibrary = dirname(__DIR__) . '/vendor/setasign/fpdf/fpdf.php';
    if (!is_file($autoload) || !is_file($fpdfLibrary)) {
        error_log('Shared document preview requires backend Composer dependencies.');
        denySharedDocument(503, 'Secure PDF previews are not configured on the server.');
    }

    require_once $autoload;
    require_once $fpdfLibrary;
    try {
        $pdf = new \setasign\Fpdi\Fpdi();
        $pdf->SetAutoPageBreak(false);
        $pageCount = $pdf->setSourceFile($filePath);
        if ($pageCount < 1 || $pageCount > 50) {
            denySharedDocument(413, 'This PDF is too large to preview securely.');
        }

        for ($pageNumber = 1; $pageNumber <= $pageCount; $pageNumber++) {
            $template = $pdf->importPage($pageNumber);
            $size = $pdf->getTemplateSize($template);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($template);
            $pdf->SetFont('Helvetica', 'B', 7);
            $pdf->SetTextColor(190, 112, 72);
            for ($y = 18; $y < $size['height']; $y += 42) {
                for ($x = 10; $x < $size['width'] - 70; $x += 95) {
                    $pdf->SetXY($x, $y);
                    $pdf->Cell(max(1, $size['width'] - $x), 5, $watermark, 0, 0, 'L');
                }
            }
        }

        $output = $pdf->Output('S');
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="carelink-shared-document.pdf"');
        header('Content-Length: ' . strlen($output));
        echo $output;
    } catch (Throwable $error) {
        error_log('Unable to generate watermarked PDF preview: ' . $error->getMessage());
        denySharedDocument(422, 'This PDF could not be prepared for secure viewing.');
    }
} elseif ($mime === 'image/jpeg' || $mime === 'image/png') {
    if (!extension_loaded('gd')) {
        error_log('Shared document image preview requires the PHP GD extension.');
        denySharedDocument(503, 'Secure image previews are not configured on the server.');
    }

    $dimensions = @getimagesize($filePath);
    if (!$dimensions || $dimensions[0] * $dimensions[1] > 25000000) {
        denySharedDocument(413, 'This image is too large to preview securely.');
    }

    $image = $mime === 'image/jpeg' ? @imagecreatefromjpeg($filePath) : @imagecreatefrompng($filePath);
    if (!$image) {
        denySharedDocument(422, 'This image could not be prepared for secure viewing.');
    }

    imagealphablending($image, true);
    imagesavealpha($image, true);
    $width = imagesx($image);
    $height = imagesy($image);
    $color = imagecolorallocatealpha($image, 172, 106, 65, 82);
    $stepX = max(280, imagefontwidth(5) * strlen($watermark) + 32);
    for ($y = 18; $y < $height; $y += 90) {
        for ($x = 18; $x < $width; $x += $stepX) {
            imagestring($image, 5, $x, $y, $watermark, $color);
        }
    }

    header('Content-Type: ' . $mime);
    header('Content-Disposition: inline; filename="carelink-shared-document.' . ($mime === 'image/png' ? 'png' : 'jpg') . '"');
    if ($mime === 'image/jpeg') {
        imagejpeg($image, null, 90);
    } else {
        imagepng($image, null, 6);
    }
    imagedestroy($image);
} else {
    denySharedDocument(415, 'This document format cannot be previewed securely.');
}

$conn->close();
