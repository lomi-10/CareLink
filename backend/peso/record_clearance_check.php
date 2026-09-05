<?php
/**
 * peso/record_clearance_check.php — record what a PESO officer saw on the
 * issuing agency's public verification portal.
 *
 * POST { document_id, staff_user_id, outcome, reference_number?, reference_source?, note? }
 *
 * NOTHING HERE TOUCHES THE NBI OR PNP. This endpoint makes no outbound request
 * of any kind. The officer opens the agency's own page in their browser, reads
 * the result, and reports it; CareLink stores the report. Scraping or
 * automating those portals would be both fragile and not ours to do.
 *
 * It also does not approve, reject, or otherwise change the document's status.
 * The existing Approve / Reject actions in verify_document.php remain the only
 * things that move a document between states — a portal check is evidence the
 * officer weighs when using them, not a substitute for the decision.
 */

ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);

include_once '../dbcon.php';
include_once __DIR__ . '/peso_auth.php';
include_once __DIR__ . '/../shared/clearance_checks_table.php';

function clearance_out(bool $ok, string $message, array $extra = []): void
{
    if (ob_get_level()) ob_clean();
    echo json_encode(array_merge(['success' => $ok, 'message' => $message], $extra));
    exit();
}

/** Only these two are issued by an agency with a public portal to check against. */
const CLEARANCE_TYPES = ['NBI Clearance', 'Police Clearance'];

const VALID_OUTCOMES = ['verified_valid', 'no_record', 'could_not_verify'];

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    $document_id   = isset($data['document_id']) ? (int) $data['document_id'] : 0;
    $staff_user_id = isset($data['staff_user_id']) ? (int) $data['staff_user_id'] : 0;
    $outcome       = isset($data['outcome']) ? trim((string) $data['outcome']) : '';
    $reference     = isset($data['reference_number']) ? trim((string) $data['reference_number']) : '';
    $source        = isset($data['reference_source']) ? trim((string) $data['reference_source']) : 'manual';
    $note          = isset($data['note']) ? trim((string) $data['note']) : '';

    if ($document_id <= 0) {
        clearance_out(false, 'document_id is required.');
    }
    if (!in_array($outcome, VALID_OUTCOMES, true)) {
        clearance_out(false, 'Outcome must be one of: ' . implode(', ', VALID_OUTCOMES) . '.');
    }
    if (!in_array($source, ['extracted', 'manual'], true)) {
        $source = 'manual';
    }

    // Staff only, and the actor is the officer whose name will sit on the record.
    peso_validate_staff_actor($conn, $staff_user_id);

    // The document must exist AND be a clearance. Recording a portal check
    // against a Barangay Clearance or a TESDA certificate would be meaningless:
    // neither agency has a portal this workflow applies to.
    $st = $conn->prepare('SELECT document_id, user_id, document_type FROM user_documents WHERE document_id = ? LIMIT 1');
    $st->bind_param('i', $document_id);
    $st->execute();
    $doc = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$doc) {
        clearance_out(false, 'That document no longer exists.');
    }
    if (!in_array($doc['document_type'], CLEARANCE_TYPES, true)) {
        clearance_out(false, 'Portal verification applies only to an NBI Clearance or a Police Clearance.');
    }

    // "Verified valid" without a reference number is not a check anybody could
    // repeat. The other two outcomes may legitimately have none — that is often
    // exactly why they could not be verified.
    if ($outcome === 'verified_valid' && $reference === '') {
        clearance_out(false, 'Enter the clearance reference number you checked before recording it as verified.');
    }

    if (mb_strlen($reference) > 120) $reference = mb_substr($reference, 0, 120);
    if (mb_strlen($note) > 500)      $note = mb_substr($note, 0, 500);

    ensure_clearance_checks_table($conn);

    $owner_id = (int) $doc['user_id'];
    $refParam = $reference !== '' ? $reference : null;
    $noteParam = $note !== '' ? $note : null;

    $ins = $conn->prepare(
        'INSERT INTO clearance_checks
            (document_id, user_id, reference_number, reference_source, outcome, note, checked_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->bind_param('iissssi', $document_id, $owner_id, $refParam, $source, $outcome, $noteParam, $staff_user_id);
    $ins->execute();
    $ins->close();

    // Recorded, so the decision has an owner — the same reasoning as the
    // override log in verify_user.php.
    error_log(sprintf(
        'CLEARANCE_CHECK: peso_user=%d document=%d type=%s outcome=%s',
        $staff_user_id, $document_id, $doc['document_type'], $outcome
    ));

    $latest = carelink_latest_clearance_checks($conn, [$document_id]);

    clearance_out(true, 'Verification recorded.', [
        'clearance_check' => $latest[$document_id] ?? null,
    ]);
} catch (Throwable $e) {
    error_log('record_clearance_check.php: ' . $e->getMessage());
    clearance_out(false, $e->getMessage() ?: 'Could not record the verification.');
}
