<?php
/**
 * GET ?application_id=&user_id=&user_type=parent|helper
 * Printable HTML "termination record" (save as PDF from browser / app WebView).
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
error_reporting(0);
ini_set('log_errors', 1);
ini_set('error_log', sys_get_temp_dir() . '/carelink-error.log');

require_once __DIR__ . '/../../dbcon.php';
require_once __DIR__ . '/../lib/termination_helpers.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('GET required');
    }

    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';

    if ($application_id <= 0 || $user_id <= 0 || !in_array($user_type, ['parent', 'helper'], true)) {
        throw new Exception('Invalid parameters');
    }

    $st = $conn->prepare('
        SELECT ja.application_id, ja.status, ja.helper_id,
               ja.termination_reason, ja.termination_note, ja.termination_notice_date, ja.termination_last_day,
               ja.termination_initiated_by,
               jp.parent_id AS parent_id, jp.title AS job_title,
               pe.first_name AS pf, pe.last_name AS pl,
               he.first_name AS hf, he.last_name AS hl
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        INNER JOIN users pe ON pe.user_id = jp.parent_id
        INNER JOIN users he ON he.user_id = ja.helper_id
        WHERE ja.application_id = ?
        LIMIT 1
    ');
    $st->bind_param('i', $application_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row) {
        throw new Exception('Not found');
    }

    $parent_id = (int) $row['parent_id'];
    $helper_id = (int) $row['helper_id'];
    if ($user_type === 'parent' && $user_id !== $parent_id) {
        throw new Exception('Forbidden');
    }
    if ($user_type === 'helper' && $user_id !== $helper_id) {
        throw new Exception('Forbidden');
    }

    $status = trim((string) $row['status']);
    if (!in_array($status, ['termination_pending', 'terminated'], true)) {
        throw new Exception('Termination record is only available once notice has started');
    }

    $labels = carelink_termination_reason_labels();
    $reason = (string) ($row['termination_reason'] ?? '');
    $reason_label = $reason !== '' && isset($labels[$reason]) ? $labels[$reason] : htmlspecialchars($reason, ENT_QUOTES, 'UTF-8');
    $note = $row['termination_note'] ? htmlspecialchars((string) $row['termination_note'], ENT_QUOTES, 'UTF-8') : '—';
    $parent_name = htmlspecialchars(trim($row['pf'] . ' ' . $row['pl']), ENT_QUOTES, 'UTF-8');
    $helper_name = htmlspecialchars(trim($row['hf'] . ' ' . $row['hl']), ENT_QUOTES, 'UTF-8');
    $job_title = htmlspecialchars((string) $row['job_title'], ENT_QUOTES, 'UTF-8');
    $nid = htmlspecialchars((string) ($row['termination_notice_date'] ?? ''), ENT_QUOTES, 'UTF-8');
    $last = htmlspecialchars((string) ($row['termination_last_day'] ?? ''), ENT_QUOTES, 'UTF-8');
    $stLbl = htmlspecialchars($status, ENT_QUOTES, 'UTF-8');

    if (ob_get_level()) {
        ob_end_clean();
    }
    header('Content-Type: text/html; charset=UTF-8');
    header('Content-Disposition: inline; filename="termination-record-' . $application_id . '.html"');

    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Termination record</title>';
    echo '<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;padding:24px;max-width:720px;margin:0 auto;color:#111}';
    echo 'h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px;border:1px solid #ccc}.muted{color:#555}</style>';
    echo '</head><body>';
    echo '<h1>Employment termination record</h1>';
    echo '<p class="muted">CareLink · Application #' . (int) $application_id . '</p>';
    echo '<table><tbody>';
    echo '<tr><td><strong>Job</strong></td><td>' . $job_title . '</td></tr>';
    echo '<tr><td><strong>Employer</strong></td><td>' . $parent_name . '</td></tr>';
    echo '<tr><td><strong>Helper</strong></td><td>' . $helper_name . '</td></tr>';
    echo '<tr><td><strong>Status</strong></td><td>' . $stLbl . '</td></tr>';
    echo '<tr><td><strong>Notice date</strong></td><td>' . $nid . '</td></tr>';
    echo '<tr><td><strong>Last working day</strong></td><td>' . $last . '</td></tr>';
    echo '<tr><td><strong>Reason</strong></td><td>' . $reason_label . '</td></tr>';
    echo '<tr><td><strong>Note</strong></td><td>' . $note . '</td></tr>';
    echo '</tbody></table>';
    echo '<p class="muted" style="margin-top:24px;font-size:12px">Generated for the requesting party. Use your device print or save-as-PDF option.</p>';
    echo '</body></html>';
    exit();
} catch (Exception $e) {
    error_log('termination_record: ' . $e->getMessage());
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

if (isset($conn) && $conn) {
    $conn->close();
}
