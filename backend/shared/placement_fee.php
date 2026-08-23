<?php
/**
 * shared/placement_fee.php — Stream 3: Placement Success Fee.
 *
 * Charged to the EMPLOYER once, when a contract is fully signed and a placement
 * becomes active. Under RA 8042 and RA 10364 no fee may be charged to a job
 * seeker — so nothing here ever references the helper as payer, and the fee is
 * never deducted from the agreed salary. The helper is not shown this fee at
 * all; it is invisible on their side of the app.
 *
 * PESO TAKES NO SHARE. peso_share_amount is always 0.00 and platform_share_amount
 * always equals the gross. Under RA 8759 a PESO provides employment facilitation
 * free of charge, so there is no partnership revenue to accrue — see
 * PESO_REVENUE_SHARE in shared/paymongo.php.
 */

require_once __DIR__ . '/paymongo.php';
require_once __DIR__ . '/is_plus_subscriber.php';

if (!function_exists('carelink_create_placement_fee')) {

    /**
     * Create the pending fee row for a placement. Safe to call more than once —
     * placement_fees has a UNIQUE key on placement_id, because the contract
     * flow can retry and a duplicate here would be a duplicate real charge.
     *
     * @return int|null fee_id, or null if one already existed / creation failed.
     */
    function carelink_create_placement_fee(mysqli $conn, int $placement_id, int $parent_id): ?int
    {
        if ($placement_id <= 0 || $parent_id <= 0) return null;

        // CareLink Plus subscribers get the built-in loyalty discount.
        $gross = PRICE_PLACEMENT_FEE;
        if (carelink_is_plus_subscriber($conn, $parent_id)) {
            $gross = (int) round($gross * (1 - PLUS_PLACEMENT_DISCOUNT));
        }
        $split = carelink_split_placement_fee($gross);

        $grossPhp    = carelink_centavos_to_pesos($gross);
        $pesoPhp     = carelink_centavos_to_pesos($split['peso']);
        $platformPhp = carelink_centavos_to_pesos($split['platform']);

        $st = $conn->prepare(
            "INSERT IGNORE INTO placement_fees
                (placement_id, parent_id, gross_amount, peso_share_amount, platform_share_amount, status)
             VALUES (?, ?, ?, ?, ?, 'pending')"
        );
        // Missing table (migration not run) must not break the hire itself.
        if (!$st) {
            error_log('placement_fee: table missing? ' . $conn->error);
            return null;
        }
        $st->bind_param('iisss', $placement_id, $parent_id, $grossPhp, $pesoPhp, $platformPhp);
        $st->execute();
        $id = $st->affected_rows > 0 ? (int) $conn->insert_id : null;
        $st->close();

        return $id;
    }

    /**
     * Has the grace period lapsed with the fee still unpaid?
     *
     * Used to make Work Mode read-only after 7 days. This is a SERVICE
     * limit, not a legal one: the signed contract remains fully valid and the
     * employment relationship is unaffected. Nothing here touches the contract.
     */
    function carelink_placement_fee_overdue(mysqli $conn, int $placement_id): bool
    {
        $st = $conn->prepare(
            "SELECT status, created_at FROM placement_fees WHERE placement_id = ? LIMIT 1"
        );
        if (!$st) return false;
        $st->bind_param('i', $placement_id);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();

        if (!$row) return false;                       // no fee on file
        if ($row['status'] !== 'pending') return false; // paid, failed or refunded

        return strtotime((string) $row['created_at']) < strtotime('-7 days');
    }

    /**
     * Refund window: a placement that ends within 7 days of the fee being
     * created is refundable, per the brief.
     */
    function carelink_placement_fee_refundable(mysqli $conn, int $placement_id): bool
    {
        $st = $conn->prepare(
            "SELECT status, created_at FROM placement_fees WHERE placement_id = ? LIMIT 1"
        );
        if (!$st) return false;
        $st->bind_param('i', $placement_id);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();

        if (!$row || $row['status'] !== 'paid') return false;
        return strtotime((string) $row['created_at']) >= strtotime('-7 days');
    }
}
