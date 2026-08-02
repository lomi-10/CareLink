<?php
/**
 * parent/boost_job_post.php — Stream 1: Featured Job Post Placement.
 *
 * POST JSON: { job_post_id, parent_id, requester_id, return_url? }
 * -> { success, checkout_url }  (or { success:true, already_featured:true })
 *
 * A boost buys SORT ORDER for 7 days and nothing else:
 *   • it does not change match_score (see shared/job_match.php — untouched);
 *   • it does not skip PESO review — a post must already be 'Open', which only
 *     happens after PESO approves it;
 *   • helpers always see a "Boosted" tag, so a paid position is never disguised
 *     as an organic one.
 *
 * The boost is applied by the WEBHOOK, not here. Returning from checkout is not
 * proof of payment; only payment.paid is.
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
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/paymongo.php';
require_once __DIR__ . '/../shared/is_plus_subscriber.php';

function boost_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $job_post_id  = isset($input['job_post_id'])  ? (int) $input['job_post_id']  : 0;
    $parent_id    = isset($input['parent_id'])    ? (int) $input['parent_id']    : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;

    if ($job_post_id <= 0 || $parent_id <= 0) {
        boost_out(false, 'job_post_id and parent_id are required.');
    }
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to boost this job post.');

    // The post must exist, belong to this employer, and already be live.
    $st = $conn->prepare(
        "SELECT job_post_id, title, status, featured_until
           FROM job_posts
          WHERE job_post_id = ? AND parent_id = ?
          LIMIT 1"
    );
    $st->bind_param('ii', $job_post_id, $parent_id);
    $st->execute();
    $job = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$job) {
        boost_out(false, 'That job post was not found on your account.');
    }

    // Compliance: boosting must never be a way around verification.
    if ($job['status'] !== 'Open') {
        boost_out(false, $job['status'] === 'Pending'
            ? 'This post is still being reviewed by PESO. You can boost it once it is approved.'
            : 'Only open job posts can be boosted.');
    }

    if (!empty($job['featured_until']) && strtotime($job['featured_until']) > time()) {
        boost_out(true, 'This post is already boosted until '
            . date('M j, Y', strtotime($job['featured_until'])) . '.', ['already_featured' => true]);
    }

    // CareLink Plus includes 3 boosts a month — spend a credit instead of charging.
    if (carelink_spend_featured_credit($conn, $parent_id)) {
        $until = date('Y-m-d H:i:s', strtotime('+' . BOOST_DURATION_DAYS . ' days'));
        $up = $conn->prepare(
            "UPDATE job_posts SET featured_until = ?, featured_boost_paid_at = NOW() WHERE job_post_id = ?"
        );
        $up->bind_param('si', $until, $job_post_id);
        $up->execute();
        $up->close();
        boost_out(true, 'Boosted for ' . BOOST_DURATION_DAYS . ' days using one of your CareLink Plus credits.', [
            'used_credit'    => true,
            'featured_until' => $until,
        ]);
    }

    if (!carelink_paymongo_configured()) {
        boost_out(false, 'Payments are not set up on this server yet.');
    }

    $base   = carelink_url_scheme() . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $return = trim((string) ($input['return_url'] ?? '')) ?: $base;

    $checkout = carelink_paymongo_checkout(
        'Featured Job Post — ' . $job['title'],
        PRICE_FEATURED_BOOST,
        // Echoed back on the webhook; this is how the payment finds its row.
        ['kind' => 'boost', 'job_post_id' => $job_post_id, 'parent_id' => $parent_id],
        $return,
        $return
    );

    if (!$checkout['ok']) {
        boost_out(false, $checkout['error'] ?: 'Could not start the payment.');
    }

    boost_out(true, 'Checkout ready.', [
        'checkout_url' => $checkout['url'],
        'amount_php'   => carelink_centavos_to_pesos(PRICE_FEATURED_BOOST),
    ]);
} catch (Throwable $e) {
    error_log('boost_job_post.php: ' . $e->getMessage());
    boost_out(false, 'Could not start the boost. Please try again.');
}
