<?php
// carelink_api/helper/scan_id.php
// Scans the helper's ALREADY-UPLOADED Valid ID with Gemini vision and returns
// details + legitimacy (template match) + clarity in one call. No popup, no
// credits. PESO's manual review stays the final decision.

ob_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

ini_set('display_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

include_once '../dbcon.php';
include_once __DIR__ . '/../shared/ownership_guard.php';
include_once __DIR__ . '/../shared/gemini_id.php';

function sendResponse($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $response = array("success" => $success, "message" => $message);
    if ($data !== null) { foreach ($data as $k => $v) { $response[$k] = $v; } }
    echo json_encode($response);
    exit();
}

try {
    if (!$conn) { throw new Exception("Database connection failed"); }

    $input = json_decode(file_get_contents("php://input"), true) ?? [];
    $document_id  = isset($input['document_id'])  ? intval($input['document_id'])  : 0;
    $user_id      = isset($input['user_id'])      ? intval($input['user_id'])      : 0;
    $requester_id = isset($input['requester_id']) ? intval($input['requester_id']) : 0;

    if (!$document_id || !$user_id) { throw new Exception("document_id and user_id are required"); }

    carelink_require_self($requester_id, $user_id, 'You are not allowed to scan this document.');

    $stmt = $conn->prepare("SELECT document_type, file_path, file_path_back, status, verified_by FROM user_documents WHERE document_id = ? AND user_id = ? LIMIT 1");
    $stmt->bind_param("ii", $document_id, $user_id);
    $stmt->execute();
    $doc = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$doc) { throw new Exception("Document not found."); }
    $documentType  = (string) $doc['document_type'];
    $currentStatus = (string) ($doc['status'] ?? 'Pending');
    $pesoActed     = !empty($doc['verified_by']); // PESO approved or rejected this doc

    // Resolve the uploaded file safely (same path-traversal guard as serve_document.php).
    $uploadDir = realpath(dirname(__DIR__) . '/uploads/documents');
    $fullPath  = realpath($uploadDir . '/' . $doc['file_path']);
    if ($uploadDir === false || $fullPath === false || strncmp($fullPath, $uploadDir, strlen($uploadDir)) !== 0 || !is_file($fullPath)) {
        throw new Exception("The uploaded file could not be found on the server.");
    }

    // Optional BACK image (two-sided docs like a Valid ID) — scanned together.
    $backFullPath = null;
    if (!empty($doc['file_path_back'])) {
        $cand = realpath($uploadDir . '/' . $doc['file_path_back']);
        if ($cand !== false && strncmp($cand, $uploadDir, strlen($uploadDir)) === 0 && is_file($cand)) {
            $backFullPath = $cand;
        }
    }

    $result = carelink_gemini_scan_document($fullPath, $documentType, null, $backFullPath);
    if (!$result['ok']) { throw new Exception($result['message'] ?? 'The document scan could not be completed.'); }

    $quality  = $result['quality_score'] ?? null;        // clarity 0-100
    $legit    = $result['legitimacy_score'];             // template/authenticity 0-100 or null
    $warnings = $result['warnings'] ?? [];

    // Decide the AI status from the LEGITIMACY score, not the raw verdict. Gemini
    // can return "Declined" on a genuine document with an unusual title (e.g. a
    // "Barangay Certification" instead of "Clearance") while still scoring it 90%
    // legit — that should not be a hard reject. So:
    //   legit >= 70  → Passed   (looks genuine)
    //   legit 45-69  → Flagged  (uncertain — PESO reviews)
    //   legit < 45   → Failed   (clear fake / wrong / random image)
    // Any tampering warnings downgrade a "Passed" to "Flagged" (still PESO-review).
    if ($legit === null) {
        $mapped = $result['mapped_status'];              // no score — fall back to verdict
    } elseif ($legit >= 70) {
        $mapped = empty($warnings) ? 'Passed' : 'Flagged';
    } elseif ($legit >= 45) {
        $mapped = 'Flagged';
    } else {
        $mapped = 'Failed';
    }

    $payload = [
        'fields'           => $result['fields'] ?? [],
        'warnings'         => $warnings,
        'legitimacy_score' => $legit,
        'document_guess'   => $result['document_guess'] ?? '',
        'is_expected'      => $result['is_expected'] ?? false,
    ];
    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE);

    // AI gate: only a clearly illegitimate document (Failed) is auto-rejected, so
    // a fake/random image cannot sit in PESO's queue. Documents PESO has already
    // acted on (verified_by set) are never touched. A genuine document that was
    // previously AI-rejected and now passes is automatically restored to Pending.
    $autoReject  = ($mapped === 'Failed')  && !$pesoActed && $currentStatus !== 'Verified';
    $autoRecover = ($mapped !== 'Failed')  && !$pesoActed && $currentStatus === 'Rejected';

    if ($autoReject) {
        $reason = "Our AI could not confirm this is a genuine {$documentType}. Please re-upload a clear, authentic document.";
        $upd = $conn->prepare("
            UPDATE user_documents
            SET ai_verification_status = ?, ai_confidence_score = ?, ai_extracted_data = ?, ai_checked_at = NOW(),
                status = 'Rejected', rejection_reason = ?
            WHERE document_id = ? AND user_id = ?
        ");
        $upd->bind_param("sdssii", $mapped, $quality, $payloadJson, $reason, $document_id, $user_id);
        $effectiveStatus = 'Rejected';
    } elseif ($autoRecover) {
        $upd = $conn->prepare("
            UPDATE user_documents
            SET ai_verification_status = ?, ai_confidence_score = ?, ai_extracted_data = ?, ai_checked_at = NOW(),
                status = 'Pending', rejection_reason = NULL
            WHERE document_id = ? AND user_id = ?
        ");
        $upd->bind_param("sdsii", $mapped, $quality, $payloadJson, $document_id, $user_id);
        $effectiveStatus = 'Pending';
    } else {
        // Store the AI result; leave PESO's status as-is.
        $upd = $conn->prepare("
            UPDATE user_documents
            SET ai_verification_status = ?, ai_confidence_score = ?, ai_extracted_data = ?, ai_checked_at = NOW()
            WHERE document_id = ? AND user_id = ?
        ");
        $upd->bind_param("sdsii", $mapped, $quality, $payloadJson, $document_id, $user_id);
        $effectiveStatus = $currentStatus;
    }
    $upd->execute();
    $upd->close();

    sendResponse(true, "Document scan complete.", [
        'ai_verification_status' => $mapped,
        'verdict'                => $result['status'] ?? '',
        'quality_score'          => $quality,
        'legitimacy_score'       => $result['legitimacy_score'] ?? null,
        'is_expected'            => $result['is_expected'] ?? false,
        'document_guess'         => $result['document_guess'] ?? '',
        'document_type'          => $documentType,
        'auto_rejected'          => $autoReject,
        'doc_status'             => $effectiveStatus,
        'fields'                 => $result['fields'] ?? [],
        'warnings'               => $result['warnings'] ?? [],
    ]);

} catch (Exception $e) {
    error_log("SCAN ID (gemini) ERROR: " . $e->getMessage());
    sendResponse(false, $e->getMessage());
}

if (isset($conn) && $conn) { $conn->close(); }
