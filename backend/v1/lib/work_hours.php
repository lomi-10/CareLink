<?php
/**
 * v1/lib/work_hours.php — hours worked, and overtime, from a check-in pair.
 *
 * WHY THIS EXISTS
 *
 * attendance_logs has stored checked_in_at and checked_out_at since Work Mode
 * shipped, and nothing ever subtracted one from the other. The BK-1 contract
 * both parties sign states the normal working day is 8 hours, that 12 is the
 * ceiling, and that overtime is paid — while the system that recorded the
 * timestamps could not say whether any of that was being honoured.
 *
 * THE RULES, AND WHERE THEY COME FROM
 *
 *   8 hours   RA 10361 Sec. 20: "the domestic worker shall not work more than
 *             eight (8) hours a day". Anything beyond this is overtime.
 *
 *   12 hours  Not statutory. It is the ceiling written into CareLink's own
 *             contract template, so it is flagged as a CONTRACT breach rather
 *             than reported as though the law names the figure. The same care
 *             the wage floor needed: never attribute a number to RA 10361 that
 *             RA 10361 does not contain.
 *
 * Reporting only. Nothing here blocks a check-out or alters pay — a helper who
 * has worked twelve hours must still be able to check out, and a system that
 * refused would simply push the record off the books entirely.
 */

/** Normal hours in a day before overtime begins. RA 10361 Sec. 20. */
const CARELINK_NORMAL_DAY_HOURS = 8.0;

/** Ceiling from the CareLink contract template, not from statute. */
const CARELINK_MAX_DAY_HOURS = 12.0;

if (!function_exists('carelink_work_hours')) {
    /**
     * Hours for one attendance row.
     *
     * @return array{
     *   worked:?float, normal:?float, overtime:?float,
     *   over_ceiling:bool, open:bool, label:?string
     * }
     *   worked null and open true when the helper is still checked in — an
     *   unfinished day has no total yet, and guessing one by using "now" would
     *   quietly inflate every report run mid-shift.
     */
    function carelink_work_hours(?string $checkedInAt, ?string $checkedOutAt): array
    {
        $none = [
            'worked' => null, 'normal' => null, 'overtime' => null,
            'over_ceiling' => false, 'open' => false, 'label' => null,
        ];

        if (!$checkedInAt) {
            return $none;
        }
        if (!$checkedOutAt) {
            return array_merge($none, ['open' => true]);
        }

        $in  = strtotime($checkedInAt);
        $out = strtotime($checkedOutAt);
        if ($in === false || $out === false) {
            return $none;
        }

        // A check-out earlier than the check-in means the shift ran past
        // midnight. Treating it as a negative day would corrupt every total it
        // is summed into, so roll it forward a day instead.
        if ($out < $in) {
            $out += 86400;
        }

        $worked = ($out - $in) / 3600;
        if ($worked <= 0) {
            return $none;
        }

        // Two decimals: hours are shown as "8.5 h" and summed across a month,
        // so unrounded floats would drift visibly in the total.
        $worked   = round($worked, 2);
        $normal   = round(min($worked, CARELINK_NORMAL_DAY_HOURS), 2);
        $overtime = round(max(0, $worked - CARELINK_NORMAL_DAY_HOURS), 2);

        return [
            'worked'       => $worked,
            'normal'       => $normal,
            'overtime'     => $overtime,
            'over_ceiling' => $worked > CARELINK_MAX_DAY_HOURS,
            'open'         => false,
            'label'        => carelink_hours_label($worked),
        ];
    }
}

if (!function_exists('carelink_hours_label')) {
    /** "7h 30m" — friendlier than 7.5 for someone checking their own day. */
    function carelink_hours_label(float $hours): string
    {
        $totalMinutes = (int) round($hours * 60);
        $h = intdiv($totalMinutes, 60);
        $m = $totalMinutes % 60;
        return $m === 0 ? ($h . 'h') : ($h . 'h ' . $m . 'm');
    }
}

if (!function_exists('carelink_work_hours_totals')) {
    /**
     * Month totals from rows carrying checked_in_at / checked_out_at.
     *
     * @param array<int,array<string,mixed>> $rows
     * @return array{
     *   days_worked:int, hours:float, normal:float, overtime:float,
     *   days_over_ceiling:int, open_days:int, hours_label:string, overtime_label:string
     * }
     */
    function carelink_work_hours_totals(array $rows): array
    {
        $days = 0; $hours = 0.0; $normal = 0.0; $ot = 0.0; $over = 0; $open = 0;

        foreach ($rows as $r) {
            $h = carelink_work_hours(
                isset($r['checked_in_at']) ? (string) $r['checked_in_at'] : null,
                isset($r['checked_out_at']) ? (string) $r['checked_out_at'] : null
            );
            if ($h['open']) { $open++; continue; }
            if ($h['worked'] === null) { continue; }
            $days++;
            $hours  += $h['worked'];
            $normal += $h['normal'];
            $ot     += $h['overtime'];
            if ($h['over_ceiling']) { $over++; }
        }

        $hours  = round($hours, 2);
        $normal = round($normal, 2);
        $ot     = round($ot, 2);

        return [
            'days_worked'       => $days,
            'hours'             => $hours,
            'normal'            => $normal,
            'overtime'          => $ot,
            'days_over_ceiling' => $over,
            'open_days'         => $open,
            'hours_label'       => carelink_hours_label($hours),
            'overtime_label'    => carelink_hours_label($ot),
        ];
    }
}
