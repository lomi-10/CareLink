<?php
/**
 * peso/revenue_dashboard.php — PESO's accumulated partnership share.
 *
 * GET ?staff_user_id=
 *
 * Reporting only. This endpoint moves no money and has no payout action,
 * because disbursement requires a signed MOA with PESO Ormoc City. Until then
 * the share simply accrues and is shown here with that status stated plainly.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

try {
    if (!$conn) throw new Exception('Database connection failed');
    peso_require_staff($conn);

    $totals = ['peso_share_paid' => '0.00', 'peso_share_pending' => '0.00', 'gross_paid' => '0.00', 'placements_charged' => 0];
    $monthly = [];

    $res = $conn->query(
        "SELECT
            COALESCE(SUM(CASE WHEN status='paid'    THEN peso_share_amount END),0) AS peso_paid,
            COALESCE(SUM(CASE WHEN status='pending' THEN peso_share_amount END),0) AS peso_pending,
            COALESCE(SUM(CASE WHEN status='paid'    THEN gross_amount END),0)      AS gross_paid,
            COALESCE(SUM(status='paid'),0)                                         AS charged
         FROM placement_fees"
    );
    // Missing table just means the migration hasn't run — report zeroes.
    if ($res && ($r = $res->fetch_assoc())) {
        $totals = [
            'peso_share_paid'    => number_format((float) $r['peso_paid'], 2, '.', ''),
            'peso_share_pending' => number_format((float) $r['peso_pending'], 2, '.', ''),
            'gross_paid'         => number_format((float) $r['gross_paid'], 2, '.', ''),
            'placements_charged' => (int) $r['charged'],
        ];
    }

    $res = $conn->query(
        "SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month,
                COUNT(*) AS placements,
                COALESCE(SUM(peso_share_amount),0) AS peso_share
           FROM placement_fees
          WHERE status = 'paid' AND paid_at IS NOT NULL
          GROUP BY month
          ORDER BY month DESC
          LIMIT 12"
    );
    while ($res && ($r = $res->fetch_assoc())) {
        $monthly[] = [
            'month'      => $r['month'],
            'placements' => (int) $r['placements'],
            'peso_share' => number_format((float) $r['peso_share'], 2, '.', ''),
        ];
    }

    echo json_encode([
        'success'    => true,
        'totals'     => $totals,
        'monthly'    => $monthly,
        'share_rate' => '30%',
        // Surfaced so the dashboard can never imply money is on its way.
        'moa_status' => 'not_signed',
        'payout_note'=> 'Accumulating only. No disbursement until a Memorandum of Agreement is signed with PESO Ormoc City.',
    ]);
} catch (Throwable $e) {
    error_log('revenue_dashboard.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Could not load the revenue summary.']);
}
