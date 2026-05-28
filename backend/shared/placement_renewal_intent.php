<?php
/**
 * POST JSON: application_id, user_id, user_type (parent|helper), interested (bool)
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/placement_dispute_helpers.php';

function out_r($ok, $msg, $extra = [])
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

function row_tri(?array $row, string $key): ?bool
{
    if (!$row || !array_key_exists($key, $row)) {
        return null;
    }
    $v = $row[$key];
    if ($v === null) {
        return null;
    }

    return (int) $v === 1;
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        out_r(false, 'POST required');
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';
    if (!array_key_exists('interested', $input)) {
        out_r(false, 'interested boolean required');
    }
    $interested = !empty($input['interested']);
    if ($application_id <= 0 || $user_id <= 0) {
        out_r(false, 'application_id and user_id required');
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        out_r(false, 'user_type must be parent or helper');
    }

    $hire = carelink_load_application_parties($conn, $application_id);
    if (!$hire) {
        out_r(false, 'Placement not found');
    }
    if (!carelink_user_on_application($hire, $user_id, $user_type)) {
        out_r(false, 'Not authorized');
    }

    $status = strtolower(trim((string) ($hire['status'] ?? '')));
    $tldRaw = $hire['termination_last_day'] ?? null;
    $tld = null;
    if ($tldRaw !== null && $tldRaw !== '') {
        $tld = substr((string) $tldRaw, 0, 10);
    }
    $cedRaw = $hire['contract_employment_end_date'] ?? null;
    $contractEnd = null;
    if ($cedRaw !== null && $cedRaw !== '') {
        $contractEnd = substr(trim((string) $cedRaw), 0, 10);
    }
    if (!carelink_application_allows_renewal_intent($status, $tld, $contractEnd)) {
        out_r(false, 'Renewal intent is only available after employment has ended or the notice period has finished.');
    }

    $prevRow = null;
    $stPrev = $conn->prepare('SELECT parent_interested, helper_interested FROM placement_renewal_intent WHERE application_id = ? LIMIT 1');
    if ($stPrev) {
        $stPrev->bind_param('i', $application_id);
        $stPrev->execute();
        $resPrev = $stPrev->get_result();
        $prevRow = $resPrev ? $resPrev->fetch_assoc() : null;
        if ($resPrev) {
            $resPrev->free();
        }
        $stPrev->close();
    }

    $had_both_before = row_tri($prevRow, 'parent_interested') === true && row_tri($prevRow, 'helper_interested') === true;
    $my_prev = $user_type === 'parent' ? row_tri($prevRow, 'parent_interested') : row_tri($prevRow, 'helper_interested');
    $was_mine_true = $my_prev === true;

    $val = $interested ? 1 : 0;
    $col = $user_type === 'parent' ? 'parent_interested' : 'helper_interested';

    $ins = $conn->prepare('INSERT IGNORE INTO placement_renewal_intent (application_id) VALUES (?)');
    if (!$ins) {
        throw new Exception('Prepare insert failed: ' . $conn->error);
    }
    $ins->bind_param('i', $application_id);
    $ins->execute();
    $ins->close();

    $upd = $conn->prepare("UPDATE placement_renewal_intent SET `$col` = ?, updated_at = CURRENT_TIMESTAMP WHERE application_id = ?");
    if (!$upd) {
        throw new Exception('Prepare update failed');
    }
    $upd->bind_param('ii', $val, $application_id);
    $upd->execute();
    $upd->close();

    $st = $conn->prepare('SELECT parent_interested, helper_interested FROM placement_renewal_intent WHERE application_id = ? LIMIT 1');
    $st->bind_param('i', $application_id);
    $st->execute();
    $res = $st->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    if ($res) {
        $res->free();
    }
    $st->close();

    $pi = row_tri($row, 'parent_interested');
    $hi = row_tri($row, 'helper_interested');
    $both = $pi === true && $hi === true;

    require_once __DIR__ . '/create_notification.php';

    $parent_uid = (int) ($hire['parent_id'] ?? 0);
    $helper_uid = (int) ($hire['helper_id'] ?? 0);
    $job_title = trim((string) ($hire['job_title'] ?? ''));
    $job_bit = $job_title !== '' ? " ({$job_title})" : '';

    if ($both && !$had_both_before) {
        $match_title = 'You both want to renew';
        $match_msg = 'You are both open to renewing this placement. Open Messages to arrange a new contract.' . $job_bit;
        if ($parent_uid > 0) {
            carelink_create_notification($conn, $parent_uid, 'placement_renewal', $match_title, $match_msg, 'job_application', $application_id);
        }
        if ($helper_uid > 0) {
            carelink_create_notification($conn, $helper_uid, 'placement_renewal', $match_title, $match_msg, 'job_application', $application_id);
        }
    } elseif ($interested && !$was_mine_true) {
        if ($user_type === 'helper' && $parent_uid > 0) {
            carelink_create_notification(
                $conn,
                $parent_uid,
                'placement_renewal',
                'Helper interested in renewing',
                'Your helper indicated they may want to renew this placement.' . $job_bit,
                'job_application',
                $application_id
            );
        } elseif ($user_type === 'parent' && $helper_uid > 0) {
            carelink_create_notification(
                $conn,
                $helper_uid,
                'placement_renewal',
                'Employer open to renewing',
                'Your employer indicated they may want to renew this placement.' . $job_bit,
                'job_application',
                $application_id
            );
        }
    }

    out_r(true, 'Saved', [
        'parent_interested' => $pi,
        'helper_interested' => $hi,
        'both_interested' => $both,
    ]);
} catch (Exception $e) {
    out_r(false, $e->getMessage());
}
