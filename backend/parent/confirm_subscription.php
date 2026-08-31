<?php
/**
 * parent/confirm_subscription.php — reconcile a CareLink Plus payment by
 * asking PayMongo, instead of waiting to be told.
 *
 * POST { parent_id, requester_id } -> { success, settled, plus }
 *
 * Called when the employer returns to the app from checkout. It looks up the
 * checkout sessions we opened for them, asks PayMongo whether any were paid,
 * and settles through the same shared path the webhook uses.
 *
 * This exists because a webhook has to be registered, reachable over the public
 * internet, and correctly signed before it does anything — and when any of
 * those is false the employer has paid and received nothing, with no way to
 * recover from inside the app. Asking directly removes that dependency for the
 * one case that matters most: the user is right there, waiting.
 *
 * The webhook still runs and is still authoritative for the case where the
 * employer pays and never comes back.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/paymongo.php';
require_once __DIR__ . '/../shared/is_plus_subscriber.php';
require_once __DIR__ . '/../shared/settle_plus.php';

function cs_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) throw new Exception('Database connection failed');
    ensure_revenue_tables($conn);

    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $parent_id    = isset($input['parent_id']) ? (int) $input['parent_id'] : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;

    if ($parent_id <= 0) cs_out(false, 'parent_id is required.');
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to confirm this subscription.');

    $settled = carelink_reconcile_plus($conn, $parent_id);
    $plus    = carelink_plus_status($conn, $parent_id);
    cs_out(true, $settled ? 'Your CareLink Plus subscription is now active.' : 'ok', [
        'settled' => $settled,
        'plus'    => $plus,
    ]);
} catch (Throwable $e) {
    error_log('confirm_subscription.php: ' . $e->getMessage());
    cs_out(false, 'Could not confirm the subscription.');
}
