<?php
/**
 * shared/wage_floor.php — the minimum monthly salary CareLink will accept.
 *
 * WHY THIS FILE EXISTS
 *
 * The figure used to be written out by hand in seven places: post_job.php,
 * edit_job.php, hire_helper.php, edit_contract.php, create_direct_hire_offer.php,
 * peso/application_detail.php and the chatbot's knowledge block. They agreed
 * only by luck, and two of them described the number wrongly (see below). One
 * constant means a wage order revision is a one-line change instead of a
 * seven-file hunt with a chance of missing one.
 *
 * THE NUMBER
 *
 * ₱6,400/month, confirmed by PESO Ormoc as the applicable kasambahay minimum.
 * It comes from the REGIONAL WAGE BOARD, not from RA 10361 itself: Wage Order
 * No. VIII-DW-06 sets ₱6,400 for chartered cities and 1st-class municipalities
 * in Region VIII, and ₱5,800 elsewhere. RA 10361 Sec. 24 establishes that these
 * minimums exist and are set regionally; it names no peso amount.
 *
 * CareLink applies the ₱6,400 tier everywhere rather than varying by the job's
 * municipality. Ormoc City is chartered, so it is the correct tier for the
 * service area, and applying the higher tier uniformly can only ever protect a
 * helper — never underpay one — if a post is placed outside the city.
 *
 * WAGE ORDERS ARE SUPERSEDED PERIODICALLY. Confirm the current one with PESO
 * before a release; if it changes, edit CARELINK_WAGE_FLOOR and nothing else.
 *
 * THE TWO WRONG DESCRIPTIONS THIS REPLACES
 *
 *   edit_contract.php said "at least ₱7,000 (RA 10361)". RA 10361 sets no such
 *   figure, so this cited a statute for a number it does not contain.
 *
 *   chatbot_api.php listed "Minimum wage: ₱7,000/month" under a heading reading
 *   "KASAMBAHAY LAW QUICK FACTS (RA 10361)" — stating CareLink's own platform
 *   preference to users as though it were the law.
 *
 * A wrong citation is worse than no citation, because it reads as authoritative
 * and gets repeated. The same mistake was already caught once in the BK-1
 * termination clause; these two survived it.
 */

/** Hard floor. A job post, contract or direct-hire offer below this is refused. */
const CARELINK_WAGE_FLOOR = 6400;

/** What CareLink encourages. Advisory only — never blocks a legal wage. */
const CARELINK_WAGE_ENCOURAGED = 7000;

if (!function_exists('carelink_wage_floor_message')) {
    /** The refusal shown when an amount is below the legal minimum. */
    function carelink_wage_floor_message(): string
    {
        return 'The minimum monthly salary for a kasambahay in this area is ₱'
            . number_format(CARELINK_WAGE_FLOOR)
            . ', set by the regional wage board (Wage Order No. VIII-DW-06). '
            . 'Please enter ₱' . number_format(CARELINK_WAGE_FLOOR) . ' or more.';
    }
}

if (!function_exists('carelink_wage_advisory')) {
    /**
     * A nudge for a salary that is legal but on the low side, or null when
     * none is warranted.
     *
     * Deliberately NOT a refusal. ₱6,400 is a lawful wage and CareLink has no
     * standing to reject it — the platform's own preference for ₱7,000 is a
     * preference, and dressing a preference up as a rule is how the old
     * "₱7,000 (RA 10361)" message came about.
     */
    function carelink_wage_advisory(float $monthly): ?string
    {
        if ($monthly >= CARELINK_WAGE_ENCOURAGED || $monthly < CARELINK_WAGE_FLOOR) {
            return null;
        }
        return 'This meets the ₱' . number_format(CARELINK_WAGE_FLOOR)
            . ' legal minimum. Offers of ₱' . number_format(CARELINK_WAGE_ENCOURAGED)
            . ' or more attract noticeably more applicants.';
    }
}
