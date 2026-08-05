<?php
/**
 * webhooks/paymongo.php — the ONLY place a payment is treated as settled.
 *
 * Endpoint to register with PayMongo:
 *   https://<your-api-domain>/carelink_api/webhooks/paymongo.php
 *
 * Three rules this file exists to enforce:
 *   1. Verify the signature first. An unverified webhook never moves money.
 *   2. Be idempotent. PayMongo retries; payment_events has a UNIQUE key on the
 *      event id, so a replay is recorded once and applied once.
 *   3. Log sanitised data only — event ids and amounts, never payment methods.
 */

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/paymongo.php';
require_once __DIR__ . '/../shared/create_notification.php';
require_once __DIR__ . '/../shared/settle_plus.php';

if ($conn) { ensure_revenue_tables($conn); }

header('Content-Type: application/json; charset=UTF-8');

// Webhooks are POST-only; anything else is a misconfiguration or a probe.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

$raw = file_get_contents('php://input');
$sig = $_SERVER['HTTP_PAYMONGO_SIGNATURE'] ?? '';

if (!carelink_paymongo_verify_webhook($raw, $sig)) {
    // 401 tells PayMongo to retry; it also means a forged call changes nothing.
    error_log('PayMongo webhook: signature verification FAILED.');
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid signature']);
    exit();
}

$body     = json_decode($raw, true) ?: [];
$eventId  = (string) ($body['data']['id'] ?? '');
$type     = (string) ($body['data']['attributes']['type'] ?? '');
$resource = $body['data']['attributes']['data']['attributes'] ?? [];
$meta     = $resource['metadata'] ?? [];
$kind     = (string) ($meta['kind'] ?? '');

if ($eventId === '' || $type === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Malformed event']);
    exit();
}

/**
 * Record the event; false means we've already processed this exact id.
 *
 * A prepare() failure used to return false here, which the caller read as
 * "duplicate" — so on any database where payment_events did not exist, every
 * webhook replied 200 "Duplicate event ignored" and granted nothing, while
 * PayMongo saw success and never retried. Payments were taken and silently
 * dropped. It now throws instead, so the handler 500s, PayMongo retries, and
 * the failure is visible in the error log rather than invisible everywhere.
 */
function wh_claim_event(mysqli $conn, string $eventId, string $type, string $refType, ?int $refId, string $summary): bool
{
    $st = $conn->prepare(
        "INSERT IGNORE INTO payment_events
            (paymongo_event_id, event_type, reference_type, reference_id, payload_summary)
         VALUES (?, ?, ?, ?, ?)"
    );
    if (!$st) throw new Exception('payment_events unavailable: ' . $conn->error);
    $st->bind_param('sssis', $eventId, $type, $refType, $refId, $summary);
    $st->execute();
    $claimed = $st->affected_rows > 0;
    $st->close();
    return $claimed;
}

try {
    if (!$conn) throw new Exception('Database connection failed');

    $amount  = (int) ($resource['amount'] ?? 0);
    $summary = sprintf('type=%s kind=%s amount=%s', $type, $kind ?: 'n/a', carelink_centavos_to_pesos($amount));
    $refId   = isset($meta['job_post_id']) ? (int) $meta['job_post_id']
             : (isset($meta['placement_id']) ? (int) $meta['placement_id'] : null);

    if (!wh_claim_event($conn, $eventId, $type, $kind ?: 'unknown', $refId, $summary)) {
        // Already handled — acknowledge so PayMongo stops retrying.
        echo json_encode(['success' => true, 'message' => 'Duplicate event ignored']);
        exit();
    }

    if ($type === 'payment.paid' || $type === 'checkout_session.payment.paid') {

        // ── Stream 1: featured job post ──
        if ($kind === 'boost') {
            $jobId    = (int) ($meta['job_post_id'] ?? 0);
            $parentId = (int) ($meta['parent_id'] ?? 0);
            if ($jobId > 0) {
                $until = date('Y-m-d H:i:s', strtotime('+' . BOOST_DURATION_DAYS . ' days'));
                $st = $conn->prepare(
                    "UPDATE job_posts
                        SET featured_until = ?, featured_boost_paid_at = NOW()
                      WHERE job_post_id = ? AND status = 'Open'"
                );
                $st->bind_param('si', $until, $jobId);
                $st->execute();
                $st->close();

                if ($parentId > 0) {
                    createNotification(
                        $conn, $parentId, 'payment', 'Job post boosted',
                        'Your job post is now featured at the top of search results for '
                        . BOOST_DURATION_DAYS . ' days.',
                        'job', $jobId
                    );
                }
            }
        }

        // ── Stream 2: CareLink Plus ──
        // One month is sold at a time, so a payment either starts a
        // subscription or extends the existing period by a month. Extending
        // from current_period_end (not NOW) means a renewal paid early never
        // costs the employer the days they already bought.
        if ($kind === 'subscription') {
            $parentId = (int) ($meta['parent_id'] ?? 0);
            // Granting now lives in shared/settle_plus.php, because the app can
            // also settle a payment by asking PayMongo directly when the user
            // returns from checkout. Both paths share one guard (the checkout
            // session row), so a payment grants exactly one month whichever
            // path gets there first — or if both do.
            $sessionId = (string) ($body['data']['attributes']['data']['id'] ?? '');
            carelink_settle_plus($conn, $sessionId, $parentId);
        }

        // ── Stream 3: placement success fee ──
        if ($kind === 'placement_fee') {
            $placementId = (int) ($meta['placement_id'] ?? 0);
            $paymentId   = (string) ($body['data']['attributes']['data']['id'] ?? '');
            if ($placementId > 0) {
                $st = $conn->prepare(
                    "UPDATE placement_fees
                        SET status = 'paid', paid_at = NOW(), paymongo_payment_id = ?
                      WHERE placement_id = ? AND status <> 'paid'"
                );
                $st->bind_param('si', $paymentId, $placementId);
                $st->execute();
                $st->close();
            }
        }
    }

    if ($type === 'payment.failed') {
        if ($kind === 'placement_fee') {
            $placementId = (int) ($meta['placement_id'] ?? 0);
            if ($placementId > 0) {
                $conn->query("UPDATE placement_fees SET status = 'failed' WHERE placement_id = " . $placementId . " AND status = 'pending'");
            }
        }
        $parentId = (int) ($meta['parent_id'] ?? 0);
        if ($parentId > 0) {
            createNotification(
                $conn, $parentId, 'payment', 'Payment failed',
                'Your payment did not go through. You can try again from the app.',
                null, null
            );
        }
    }

    if ($type === 'subscription.cancelled' || $type === 'subscription.past_due') {
        $subId  = (string) ($body['data']['attributes']['data']['id'] ?? '');
        $status = $type === 'subscription.cancelled' ? 'cancelled' : 'past_due';
        if ($subId !== '') {
            $st = $conn->prepare("UPDATE subscriptions SET status = ?, cancelled_at = IF(? = 'cancelled', NOW(), cancelled_at) WHERE paymongo_subscription_id = ?");
            $st->bind_param('sss', $status, $status, $subId);
            $st->execute();
            $st->close();
        }
    }

    echo json_encode(['success' => true, 'message' => 'ok']);
} catch (Throwable $e) {
    error_log('paymongo webhook: ' . $e->getMessage());
    // 500 so PayMongo retries a genuinely failed handler.
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Handler error']);
}
