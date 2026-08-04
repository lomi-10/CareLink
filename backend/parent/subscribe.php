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
    ensure_subscriptions_table($conn);

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

    // Cooldown independent of the webhook: `already_plus` above only engages
    // once a payment has actually settled, which takes a moment (and fails
    // silently if the webhook can't reach this server). Without this, a user
    // whose first payment hasn't settled yet could open a new checkout every
    // tap — this caps it to one attempt per 3 minutes per account instead.
    $cooldownFile = sys_get_temp_dir() . '/carelink_sub_attempt_' . $parent_id . '.txt';
    if (is_file($cooldownFile) && (time() - (int) @filemtime($cooldownFile)) < 180) {
        sub_out(false, 'A CareLink Plus payment was just started for this account. Check your email for the PayMongo receipt, or wait a few minutes and try again.');
    }
    @file_put_contents($cooldownFile, (string) time());

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

    sub_out(true, 'Checkout ready.', [
        'checkout_url' => $checkout['url'],
        'amount_php'   => carelink_centavos_to_pesos(PRICE_PLUS_MONTHLY),
    ]);
} catch (Throwable $e) {
    error_log('subscribe.php: ' . $e->getMessage());
    sub_out(false, 'Could not start the subscription. Please try again.');
}
