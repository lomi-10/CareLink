<?php
/**
 * parent/cancel_subscription.php — stop CareLink Plus renewing.
 *
 * POST { parent_id, requester_id }
 *
 * Cancelling does NOT revoke access immediately: the employer paid through
 * current_period_end and keeps every benefit until then. That's why
 * is_plus_subscriber.php treats 'cancelled' as still entitled while the period
 * runs, and only the period end actually gates access.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';
require_once __DIR__ . '/../shared/is_plus_subscriber.php';

try {
    if (!$conn) throw new Exception('Database connection failed');

    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $parent_id    = isset($input['parent_id']) ? (int) $input['parent_id'] : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;

    if ($parent_id <= 0) {
        echo json_encode(['success' => false, 'message' => 'parent_id is required.']);
        exit();
    }
    carelink_require_self($requester_id, $parent_id, 'You are not allowed to change this subscription.');

    $st = $conn->prepare(
        "UPDATE subscriptions
            SET status = 'cancelled', cancelled_at = NOW()
          WHERE user_id = ? AND status = 'active'"
    );
    if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
    $st->bind_param('i', $parent_id);
    $st->execute();
    $changed = $st->affected_rows;
    $st->close();

    if ($changed === 0) {
        echo json_encode(['success' => false, 'message' => 'You do not have an active subscription to cancel.']);
        exit();
    }

    $status = carelink_plus_status($conn, $parent_id);
    echo json_encode([
        'success' => true,
        'message' => 'Your subscription will not renew. You keep CareLink Plus until '
            . date('M j, Y', strtotime((string) $status['current_period_end'])) . '.',
        'plus'    => $status,
    ]);
} catch (Throwable $e) {
    error_log('cancel_subscription.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Could not cancel the subscription. Please try again.']);
}
