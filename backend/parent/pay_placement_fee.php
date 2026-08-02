<?php
/**
 * parent/pay_placement_fee.php — Stream 3 payment + status.
 *
 * GET  ?parent_id=&requester_id=[&placement_id=]  -> outstanding fee(s)
 * POST { placement_id, parent_id, requester_id }  -> { checkout_url }
 *
 * Employers only. The fee is never deducted from the helper's salary and the
 * helper has no visibility of it. Settlement happens in webhooks/paymongo.php,
 * never here.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/paymongo.php';
require_once __DIR__ . '/../shared/placement_fee.php';

function fee_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $parent_id    = isset($_GET['parent_id']) ? (int) $_GET['parent_id'] : 0;
        $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;
        carelink_require_self($requester_id, $parent_id, 'You are not allowed to view these fees.');

        $st = $conn->prepare(
            "SELECT pf.fee_id, pf.placement_id, pf.gross_amount, pf.status, pf.created_at,
                    pf.paid_at, jp.title,
                    CONCAT(u.first_name,' ',u.last_name) AS helper_name
               FROM placement_fees pf
               JOIN placements p ON p.placement_id = pf.placement_id
               LEFT JOIN job_posts jp ON jp.job_post_id = p.job_post_id
               LEFT JOIN users u     ON u.user_id      = p.helper_id
              WHERE pf.parent_id = ?
              ORDER BY pf.created_at DESC"
        );
        if (!$st) fee_out(true, 'ok', ['fees' => []]); // table not migrated yet
        $st->bind_param('i', $parent_id);
        $st->execute();
        $res = $st->get_result();

        $fees = [];
        while ($r = $res->fetch_assoc()) {
            $r['fee_id']       = (int) $r['fee_id'];
            $r['placement_id'] = (int) $r['placement_id'];
            // Grace period is a service limit only — the contract stays valid.
            $r['overdue'] = $r['status'] === 'pending'
                && strtotime((string) $r['created_at']) < strtotime('-7 days');
            $fees[] = $r;
        }
        $st->close();
        fee_out(true, 'ok', ['fees' => $fees]);
    }

    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $placement_id = isset($input['placement_id']) ? (int) $input['placement_id'] : 0;
    $parent_id    = isset($input['parent_id']) ? (int) $input['parent_id'] : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;

    if ($placement_id <= 0 || $parent_id <= 0) fee_out(false, 'placement_id and parent_id are required.');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to pay this fee.');

    // The fee must exist, belong to this employer, and still be unpaid.
    $st = $conn->prepare(
        "SELECT fee_id, gross_amount, status FROM placement_fees
          WHERE placement_id = ? AND parent_id = ? LIMIT 1"
    );
    $st->bind_param('ii', $placement_id, $parent_id);
    $st->execute();
    $fee = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$fee) fee_out(false, 'No placement fee was found for your account.');
    if ($fee['status'] === 'paid') fee_out(true, 'This fee is already paid.', ['already_paid' => true]);

    if (!carelink_paymongo_configured()) fee_out(false, 'Payments are not set up on this server yet.');

    $base   = carelink_url_scheme() . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $return = trim((string) ($input['return_url'] ?? '')) ?: $base;
    $cents  = (int) round(((float) $fee['gross_amount']) * 100);

    $checkout = carelink_paymongo_checkout(
        'CareLink Placement Fee',
        $cents,
        ['kind' => 'placement_fee', 'placement_id' => $placement_id, 'parent_id' => $parent_id],
        $return,
        $return
    );
    if (!$checkout['ok']) fee_out(false, $checkout['error'] ?: 'Could not start the payment.');

    fee_out(true, 'Checkout ready.', [
        'checkout_url' => $checkout['url'],
        'amount_php'   => $fee['gross_amount'],
    ]);
} catch (Throwable $e) {
    error_log('pay_placement_fee.php: ' . $e->getMessage());
    fee_out(false, 'Could not start the payment. Please try again.');
}
