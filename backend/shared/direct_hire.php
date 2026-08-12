<?php
/**
 * shared/direct_hire.php — delivery rules for private direct-hire offers.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE:
 * a helper must never see the terms of an offer PESO has not approved.
 *
 * That is not a nicety. PESO review is what catches a sub-minimum salary, an
 * illegal rest-day arrangement, or duties outside the Kasambahay Law. If the
 * offer reaches the helper first, they have already read — and may have
 * emotionally accepted — terms the law does not permit. Showing unvetted terms
 * to a kasambahay is precisely the harm the review step exists to prevent.
 *
 * So a direct-hire offer has three stages:
 *   1. created   — job post is 'Pending', invite is 'peso_review'.
 *                  Only the EMPLOYER is told. Nothing reaches the helper.
 *   2. approved  — PESO sets the post 'Open'. Only NOW is the offer delivered
 *                  into the chat and the helper notified.
 *   3. rejected  — invite is cancelled. Only the employer is told, and the
 *                  helper never learns the offer existed.
 *
 * Delivery lives here rather than in the PESO endpoint so there is exactly one
 * place that can put an offer in front of a helper.
 */

require_once __DIR__ . '/create_notification.php';
require_once __DIR__ . '/job_invites_table.php';

/** Invite is waiting on PESO. Fits job_invites.status VARCHAR(12). */
const DIRECT_HIRE_AWAITING = 'peso_review';

if (!function_exists('carelink_deliver_direct_hire_offer')) {

    /**
     * PESO approved the post — now put the offer in front of the helper.
     *
     * Safe to call for any job post: it does nothing unless the post is a
     * direct-hire one with an invite still awaiting review, so the PESO
     * endpoint can call it unconditionally.
     *
     * @return bool true if an offer was actually delivered.
     */
    function carelink_deliver_direct_hire_offer(mysqli $conn, int $job_post_id): bool
    {
        if ($job_post_id <= 0) return false;
        ensure_job_invites_table($conn);

        $st = $conn->prepare(
            "SELECT ji.invite_id, ji.parent_id, ji.helper_id,
                    jp.title, jp.salary_offered, jp.salary_period,
                    jp.employment_type, jp.work_schedule, jp.start_date, jp.visibility
               FROM job_invites ji
               JOIN job_posts jp ON jp.job_post_id = ji.job_post_id
              WHERE ji.job_post_id = ? AND ji.status = ?
              LIMIT 1"
        );
        if (!$st) return false;
        $awaiting = DIRECT_HIRE_AWAITING;
        $st->bind_param('is', $job_post_id, $awaiting);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();

        if (!$row || $row['visibility'] !== 'direct_hire') return false;

        $parent_id = (int) $row['parent_id'];
        $helper_id = (int) $row['helper_id'];
        $title     = (string) $row['title'];

        $employer = '';
        $nq = $conn->prepare("SELECT CONCAT_WS(' ', first_name, last_name) AS n FROM users WHERE user_id = ?");
        if ($nq) {
            $nq->bind_param('i', $parent_id);
            $nq->execute();
            $employer = trim((string) ($nq->get_result()->fetch_assoc()['n'] ?? ''));
            $nq->close();
        }

        $salaryLabel = '₱' . number_format((float) $row['salary_offered'], 2) . ' ' . $row['salary_period'];
        $text = "Direct hire offer: \"{$title}\"\n"
              . "{$salaryLabel} · {$row['employment_type']} · {$row['work_schedule']}\n"
              . (!empty($row['start_date']) ? "Proposed start: {$row['start_date']}\n" : '')
              . "\nPESO has reviewed and approved these terms. If you accept, a "
              . "DOLE-compliant contract is generated for you both to sign. "
              . "You are free to decline — nothing is agreed until you sign.";

        $msg = $conn->prepare(
            "INSERT INTO messages (sender_id, receiver_id, message_text, job_post_id, message_type, sent_at)
             VALUES (?, ?, ?, ?, 'job_invite', NOW())"
        );
        if (!$msg) return false;
        $msg->bind_param('iisi', $parent_id, $helper_id, $text, $job_post_id);
        if (!$msg->execute()) { $msg->close(); return false; }
        $message_id = $conn->insert_id;
        $msg->close();

        // Flip to 'pending' — only now can the helper accept or decline.
        $up = $conn->prepare(
            "UPDATE job_invites SET message_id = ?, status = 'pending' WHERE invite_id = ?"
        );
        if ($up) {
            $up->bind_param('ii', $message_id, $row['invite_id']);
            $up->execute();
            $up->close();
        }

        createNotification(
            $conn, $helper_id, 'job_invite', 'Direct hire offer',
            ($employer !== '' ? $employer : 'An employer') . " sent you a direct hire offer for \"{$title}\". "
            . 'PESO has approved the terms.',
            'job', $job_post_id
        );

        return true;
    }

    /**
     * PESO rejected the post — cancel the offer.
     *
     * The helper is deliberately NOT notified: they never saw this offer, so
     * telling them it was withdrawn would only expose terms PESO just refused.
     */
    function carelink_cancel_direct_hire_offer(mysqli $conn, int $job_post_id): void
    {
        if ($job_post_id <= 0) return;
        ensure_job_invites_table($conn);

        $st = $conn->prepare(
            "UPDATE job_invites SET status = 'cancelled', responded_at = NOW()
              WHERE job_post_id = ? AND status = ?"
        );
        if (!$st) return;
        $awaiting = DIRECT_HIRE_AWAITING;
        $st->bind_param('is', $job_post_id, $awaiting);
        $st->execute();
        $st->close();
    }
}
