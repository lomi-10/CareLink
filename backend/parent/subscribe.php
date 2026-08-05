<?php
/**
 * parent/subscribe.php — Stream 2: CareLink Plus (₱149/month).
 *
 * GET  ?parent_id=&requester_id=   -> current entitlement snapshot
 * POST { parent_id, requester_id } -> { checkout_url }
 *
 * Employers only — a helper account can never hold a subscription, and nothing
 * behind this paywall is safety-critical. Verification, matching, contracts,
 * digital signing, messaging, the shared placement record, document
 * pre-screening and CareBot all stay free for everyone.
 *
 * PayMongo has no hosted recurring-checkout primitive in the same shape as
 * one-off checkout, so a period is sold at a time: each payment extends
 * current_period_end by a month. That keeps the money model honest (a user is
 * only ever charged for a period they agreed to) and means a lapsed
 * subscription simply expires instead of silently re-billing.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/paymongo.php';
require_once __DIR__ . '/../shared/is_plus_subscriber.php';
require_once __DIR__ . '/../shared/subscriptions_table.php';
require_once __DIR__ . '/../shared/settle_plus.php';

function sub_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

/** Everything Plus unlocks — shown on the subscription screen. */
function sub_benefits(): array
{
    return [
        '3 featured job post boosts every month',
        'Priority position in the PESO review queue',
        'Unlimited open job posts (free accounts can have 3)',
        'Placement history beyond 6 months',
        'Export payroll to PDF or CSV',
        '20% off placement fees',
    ];
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    ensure_revenue_tables($conn);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $parent_id    = isset($_GET['parent_id']) ? (int) $_GET['parent_id'] : 0;
        $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;
        carelink_require_self($requester_id, $parent_id, 'You are not allowed to view this subscription.');

        $status = carelink_plus_status($conn, $parent_id);
        sub_out(true, 'ok', [
            'plus'      => $status,
            'price_php' => carelink_centavos_to_pesos(PRICE_PLUS_MONTHLY),
            'benefits'  => sub_benefits(),
            // Drives the sandbox banner: a tester should never be left guessing
            // whether they were really charged.
            'test_mode'  => str_starts_with((string) carelink_cfg('PAYMONGO_SECRET_KEY', ''), 'sk_test'),
            'configured' => carelink_paymongo_configured(),
        ]);
    }

    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $parent_id    = isset($input['parent_id']) ? (int) $input['parent_id'] : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;

    if ($parent_id <= 0) sub_out(false, 'parent_id is required.');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to subscribe for this account.');

    // Settle anything already paid but not yet granted BEFORE offering to charge
    // again. Without this, an employer whose webhook never landed is invisible to
    // the check below and gets sent to pay a second time for the same month.
    carelink_reconcile_plus($conn, $parent_id);

    // Guard against paying twice for an overlapping period.
    if (carelink_is_plus_subscriber($conn, $parent_id)) {
        $st = carelink_plus_status($conn, $parent_id);
        sub_out(true, 'You already have CareLink Plus until '
            . date('M j, Y', strtotime((string) $st['current_period_end'])) . '.', ['already_plus' => true]);
    }

    // Employers only.
    $chk = $conn->prepare("SELECT user_type FROM users WHERE user_id = ? LIMIT 1");
    $chk->bind_param('i', $parent_id);
    $chk->execute();
    $u = $chk->get_result()->fetch_assoc();
    $chk->close();
    if (!$u || $u['user_type'] !== 'parent') {
        sub_out(false, 'CareLink Plus is available to employer accounts only.');
    }

    if (!carelink_paymongo_configured()) sub_out(false, 'Payments are not set up on this server yet.');

    // Reuse an unpaid session instead of blocking or opening a second one.
    //
    // This replaces a time-based cooldown that was simply wrong: it fired on a
    // CANCELLED checkout too, so backing out of the payment page locked the
    // employer out of retrying for three minutes with an error implying they
    // had already paid. A PayMongo checkout session stays valid until it is
    // paid, so handing the same link back is both correct and better UX — the
    // employer lands exactly where they left off, and we never create two
    // sessions competing to charge for one month.
    $reuse = $conn->prepare(
        "SELECT checkout_url FROM payment_checkouts
          WHERE user_id = ? AND kind = 'subscription' AND status = 'pending'
            AND checkout_url IS NOT NULL
            AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
          ORDER BY checkout_id DESC LIMIT 1"
    );
    if ($reuse) {
        $reuse->bind_param('i', $parent_id);
        $reuse->execute();
        $open = $reuse->get_result()->fetch_assoc();
        $reuse->close();
        if ($open && !empty($open['checkout_url'])) {
            sub_out(true, 'Continuing your payment.', [
                'checkout_url' => $open['checkout_url'],
                'amount_php'   => carelink_centavos_to_pesos(PRICE_PLUS_MONTHLY),
                'resumed'      => true,
            ]);
        }
    }

    $base   = carelink_url_scheme() . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $return = trim((string) ($input['return_url'] ?? '')) ?: $base;

    $checkout = carelink_paymongo_checkout(
        'CareLink Plus — 1 month',
        PRICE_PLUS_MONTHLY,
        ['kind' => 'subscription', 'parent_id' => $parent_id],
        $return,
        $return
    );
    if (!$checkout['ok']) sub_out(false, $checkout['error'] ?: 'Could not start the payment.');

    // Recorded so it can be reconciled on return even if the webhook never lands.
    carelink_record_checkout($conn, (string) $checkout['id'], $parent_id, 'subscription', $checkout['url']);

    sub_out(true, 'Checkout ready.', [
        'checkout_url' => $checkout['url'],
        'amount_php'   => carelink_centavos_to_pesos(PRICE_PLUS_MONTHLY),
    ]);
} catch (Throwable $e) {
    error_log('subscribe.php: ' . $e->getMessage());
    sub_out(false, 'Could not start the subscription. Please try again.');
}
