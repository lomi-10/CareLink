<?php
/**
 * forms/nsrp_template.php — NSRP Form 1.REV 3 (Reg. Form No. PESO-02), the
 * National Skills Registration Program registration form, pre-filled from a
 * helper's CareLink profile.
 *
 * WHY THIS EXISTS
 *
 * PESO Ormoc asked whether the form could be generated with the helper's
 * details already in it. Today a kasambahay registering at PESO hand-copies
 * information CareLink already holds — name, birth date, address, contact,
 * education, work history — onto a paper form, and an officer then reads that
 * handwriting back.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not invent answers. CareLink holds roughly half of what NSRP asks
 * for; the rest (place of birth, height, weight, 4Ps status, OFW status,
 * eligibility, training) is simply not collected. Those fields print as ruled
 * blanks for the applicant to complete by hand.
 *
 * Guessing would be worse than blank. "Citizenship: Filipino" is a safe-looking
 * assumption that is wrong often enough to matter, and a form submitted to DOLE
 * with a fabricated answer is the applicant's problem, not ours. Every value
 * here comes from something the helper actually entered.
 *
 * PRINTING
 *
 * Sized for A4 at 9pt, which is what the paper form uses. The @media print
 * block drops the toolbar so Ctrl+P produces the form alone.
 */

if (!function_exists('nsrp_e')) {
    function nsrp_e(?string $v): string
    {
        return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('nsrp_val')) {
    /** A filled value, or a ruled blank of roughly the right width. */
    function nsrp_val(?string $v, int $minWidth = 0): string
    {
        $v = trim((string) $v);
        if ($v === '') {
            return '<span class="blank"' . ($minWidth ? ' style="min-width:' . $minWidth . 'px"' : '') . '></span>';
        }
        return '<span class="v">' . nsrp_e($v) . '</span>';
    }
}

if (!function_exists('nsrp_box')) {
    /**
     * A checkbox. $state is true (ticked), false (empty), or null (unknown —
     * also empty, but the distinction is kept so a future caller can style
     * "we do not know" differently from "we know it is no").
     */
    function nsrp_box(?bool $state, string $label): string
    {
        $mark = $state === true ? '&#9746;' : '&#9744;'; // ☒ / ☐
        $cls  = $state === true ? 'box on' : 'box';
        return '<span class="' . $cls . '">' . $mark . ' ' . nsrp_e($label) . '</span>';
    }
}

if (!function_exists('carelink_nsrp_build_html')) {
    /**
     * @param array $d {
     *   last_name, first_name, middle_name, suffix, birth_date, age, sex,
     *   civil_status, mobile, email, house_street, barangay, municipality,
     *   province, education_level, expected_salary, salary_period,
     *   preferred_occupations: string[], preferred_locations: string[],
     *   dialects: string[], technical_skills: string[],
     *   work_history: array<int,array{company,address,position,from,to,status}>,
     *   generated_at
     * }
     */
    function carelink_nsrp_build_html(array $d): string
    {
        $g = static fn(string $k, $fallback = '') => isset($d[$k]) && $d[$k] !== null ? (string) $d[$k] : $fallback;
        $arr = static fn(string $k): array => isset($d[$k]) && is_array($d[$k]) ? $d[$k] : [];

        // ── Sex ────────────────────────────────────────────────────────────
        $sex = strtolower($g('sex'));
        $sexBoxes = nsrp_box($sex === 'male' ? true : ($sex === '' ? null : false), 'Male')
                  . nsrp_box($sex === 'female' ? true : ($sex === '' ? null : false), 'Female');

        // ── Civil status. CareLink stores four of the five NSRP options; the
        //    fifth ("Others") can therefore never be ticked from our data. ──
        $cs = strtolower($g('civil_status'));
        $csBoxes = '';
        foreach (['Single', 'Married', 'Widowed', 'Separated'] as $opt) {
            $csBoxes .= nsrp_box($cs === strtolower($opt) ? true : ($cs === '' ? null : false), $opt);
        }
        $csBoxes .= nsrp_box(null, 'Others: ______________');

        // ── Education. CareLink's enum and NSRP's list do not line up
        //    one-to-one, so the mapping is explicit rather than assumed. ──
        $eduMap = [
            'Elementary'             => 'Elementary Level',
            'High School Undergrad'  => 'High School Level',
            'High School Grad'       => 'High School Graduate',
            'College Undergrad'      => 'College level',
            'College Grad'           => 'College Graduate',
            'Vocational'             => 'Technical-vocational graduate',
        ];
        $eduNow = $eduMap[$g('education_level')] ?? '';
        $eduOptions = [
            'No formal education', 'Elementary Level', 'Elementary Graduate',
            'High School Level', 'High School Graduate', 'College level',
            'College Graduate', 'Technical-vocational graduate', 'Post Graduate',
        ];
        $eduBoxes = '';
        foreach ($eduOptions as $opt) {
            $eduBoxes .= nsrp_box($eduNow === $opt ? true : ($eduNow === '' ? null : false), $opt);
        }

        // ── Section IX technical skills. Ticked only where the helper actually
        //    listed the matching skill; everything else stays open. ──
        // Matched on a STEM, not the whole word. CareLink's skills are named for
        // the person doing the job and NSRP's for the activity: the catalogue says
        // "Cook" and "Family Driver" where the form says "Cooking" and "Driving".
        // A plain str_contains of the form's label found neither, so a helper who
        // had listed cooking got an empty Section IX.
        $skills = array_map('strtolower', $arr('technical_skills'));
        $techList = [
            'Carpentry' => 'carpent', 'Masonry' => 'mason', 'Welding' => 'weld',
            'Auto Mechanic' => 'mechanic', 'Plumbing' => 'plumb', 'Driving' => 'driv',
            'Gardening' => 'garden', 'Tailoring' => 'tailor', 'Photography' => 'photograph',
            'Hairdressing' => 'hairdress', 'Cooking' => 'cook', 'Baking' => 'bak',
        ];
        $has = static function (string $stem) use ($skills): ?bool {
            if (!$skills) return null;
            foreach ($skills as $s) {
                if (str_contains($s, $stem)) return true;
            }
            return false;
        };
        $techBoxes = '';
        foreach ($techList as $label => $stem) {
            $techBoxes .= '<span class="cell3">' . nsrp_box($has($stem), $label) . '</span>';
        }

        // ── Dialects ───────────────────────────────────────────────────────
        // Same stem problem, plus a local one: the catalogue says "Bicolano"
        // where the form says "Bikol", and an exact match ticked neither.
        //
        // Ormoc speaks Cebuano and Waray, and NEITHER is on the form's four
        // boxes — so for most helpers here the real answer lives in Others.
        // That box is ticked when there is something to put in it, rather than
        // printing a filled-in line beside an empty checkbox.
        $dialectStems = ['Tagalog' => ['tagalog'], 'Ilocano' => ['ilocano', 'ilokano'],
                         'Ilonggo' => ['ilonggo', 'hiligaynon'], 'Bikol' => ['bikol', 'bicol']];
        $dialects = $arr('dialects');
        $dLower = array_map('strtolower', $dialects);
        $dHas = static function (array $stems) use ($dLower): ?bool {
            if (!$dLower) return null;
            foreach ($dLower as $d) {
                foreach ($stems as $stem) if (str_contains($d, $stem)) return true;
            }
            return false;
        };
        $listed = [];
        $others = [];
        foreach ($dialects as $d) {
            $matched = false;
            foreach ($dialectStems as $stems) {
                foreach ($stems as $stem) if (str_contains(strtolower($d), $stem)) { $matched = true; break 2; }
            }
            if (!$matched) $others[] = $d;
        }
        unset($listed);
        $dialectBoxes = '';
        foreach ($dialectStems as $label => $stems) {
            $dialectBoxes .= nsrp_box($dHas($stems), $label);
        }
        $dialectBoxes .= nsrp_box($others ? true : null,
            'Others: ' . ($others ? implode(', ', $others) : '________________'));

        // ── Job preference rows ────────────────────────────────────────────
        $occ = $arr('preferred_occupations');
        $loc = $arr('preferred_locations');
        $occRows = '';
        for ($i = 0; $i < 3; $i++) {
            $occRows .= '<tr><td class="n">' . ($i + 1) . '.</td><td>' . nsrp_val($occ[$i] ?? '') . '</td><td>' . nsrp_val('') . '</td></tr>';
        }
        $locRows = '';
        for ($i = 0; $i < 3; $i++) {
            $locRows .= '<tr><td class="n">' . ($i + 1) . '.</td><td>' . nsrp_val($loc[$i] ?? '') . '</td></tr>';
        }

        // ── Work experience: three rows, as the paper form has ─────────────
        $wh = $arr('work_history');
        $whRows = '';
        for ($i = 0; $i < 3; $i++) {
            $r = $wh[$i] ?? [];
            $whRows .= '<tr>'
                . '<td>' . nsrp_val($r['company']  ?? '') . '</td>'
                . '<td>' . nsrp_val($r['address']  ?? '') . '</td>'
                . '<td>' . nsrp_val($r['position'] ?? '') . '</td>'
                . '<td>' . nsrp_val(trim(($r['from'] ?? '') . (isset($r['to']) && $r['to'] !== '' ? ' to ' . $r['to'] : ''))) . '</td>'
                . '<td>' . nsrp_val($r['status'] ?? '') . '</td>'
                . '</tr>';
        }

        $salary = $g('expected_salary');
        if ($salary !== '') {
            $salary = '₱' . number_format((float) $salary, 2)
                . ($g('salary_period') !== '' ? ' / ' . strtolower($g('salary_period')) : '');
        }

        // house_street already reads 'barangay, municipality, province' when the
        // profile was saved through the app; appending the parts again repeated it.
        $addr = !empty($d['address_is_complete'])
            ? $g('house_street')
            : trim(implode(', ', array_filter([
                $g('house_street'), $g('barangay'), $g('municipality'), $g('province'),
            ])));

        $generated = nsrp_e($g('generated_at', date('j F Y, g:i a')));

        // ─────────────────────────────────────────────────────────────────────
        ob_start();
        ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NSRP Form 1.REV 3 — <?= nsrp_e(trim($g('first_name') . ' ' . $g('last_name'))) ?></title>
<style>
  /* A4 at 9pt, matching the printed form's density. Anything larger and
     Section VII alone spills onto a second sheet. */
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000;
    margin: 0; background: #f2f2f2;
  }
  .sheet {
    width: 210mm; min-height: 297mm; margin: 12px auto; padding: 10mm;
    background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.18);
  }
  .toolbar {
    max-width: 210mm; margin: 12px auto 0; display: flex; gap: 8px;
    align-items: center; justify-content: space-between; font-size: 11pt;
  }
  .toolbar button {
    font: inherit; padding: 8px 16px; border: 0; border-radius: 6px;
    background: #E86019; color: #fff; cursor: pointer;
  }
  .toolbar .note { color: #555; font-size: 9.5pt; }

  h1 { font-size: 11pt; text-align: center; margin: 0; text-transform: uppercase; }
  .gov { text-align: center; font-size: 8.5pt; line-height: 1.35; margin-bottom: 6px; }
  .meta { font-size: 7.5pt; line-height: 1.4; }
  .instructions { font-size: 7.5pt; border: 1px solid #000; padding: 4px 6px; margin: 6px 0; }

  .band {
    background: #d9d9d9; border: 1px solid #000; border-bottom: 0;
    font-weight: bold; font-size: 8.5pt; padding: 2px 5px; margin-top: 7px;
  }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 3px 5px; vertical-align: top; font-size: 8.5pt; }
  th { background: #f0f0f0; font-size: 8pt; text-align: center; }
  td.lbl { width: 25%; font-weight: bold; font-size: 8pt; background: #fafafa; }
  td.n { width: 18px; text-align: center; }

  /* A filled value versus a line to write on. The underline makes it obvious
     at a glance which fields still need a pen. */
  .v { font-weight: bold; }
  .blank {
    display: inline-block; min-width: 90px; border-bottom: 1px solid #666;
    height: 11px; vertical-align: baseline;
  }
  .box { display: inline-block; margin-right: 10px; white-space: nowrap; font-size: 8.5pt; }
  .box.on { font-weight: bold; }
  .cell3 { display: inline-block; width: 33%; }
  .cols { column-count: 3; column-gap: 10px; }
  .foot { font-size: 7.5pt; margin-top: 3px; }
  .sig { margin-top: 14px; display: flex; gap: 40px; }
  .sig div { flex: 1; text-align: center; }
  .sigline { border-top: 1px solid #000; margin-top: 26px; padding-top: 2px; font-size: 8pt; }
  .peso { border: 1px solid #000; border-top: 2px dotted #000; padding: 5px; margin-top: 10px; font-size: 8pt; }

  .stamp {
    margin-top: 8px; font-size: 7.5pt; color: #444; border-top: 1px solid #ccc; padding-top: 4px;
  }

  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { box-shadow: none; margin: 0; width: auto; padding: 0; }
  }
</style>
</head>
<body>

<div class="toolbar">
  <span class="note">Pre-filled from the CareLink profile. Blank lines still need to be completed by hand.</span>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="sheet">
  <div class="meta">
    NSRP Form 1.REV 3<br>
    Reg. Form No.: PESO - 02<br>
    Year: <?= date('Y') ?><br>
    Series No.: <span class="blank"></span>
  </div>

  <div class="gov">
    Republic of the Philippines<br>
    <strong>Department of Labor and Employment</strong><br>
    NATIONAL SKILLS REGISTRATION PROGRAM
  </div>
  <h1>Registration Form</h1>

  <div class="instructions">
    <strong>INSTRUCTIONS:</strong> Please fill out the form legibly with ballpen. Print in block letters.
    Check appropriate boxes. Please do not leave any items unanswered. Indicate &ldquo;NA&rdquo; if not
    applicable. You may use extra sheet if needed. Submit accomplished form to the Public Employment
    Service Office (PESO) Manager or staff in your city/municipality/province.
  </div>

  <div class="band">I. PERSONAL INFORMATION</div>
  <table>
    <tr>
      <td class="lbl">LAST NAME</td><td><?= nsrp_val($g('last_name')) ?></td>
      <td class="lbl">FIRST NAME</td><td><?= nsrp_val($g('first_name')) ?></td>
    </tr>
    <tr>
      <td class="lbl">MIDDLE NAME</td><td><?= nsrp_val($g('middle_name')) ?></td>
      <td class="lbl">SUFFIX (Sr., Jr.)</td><td><?= nsrp_val('') ?></td>
    </tr>
    <tr>
      <td class="lbl">DATE OF BIRTH (mm/dd/yyyy)</td><td><?= nsrp_val($g('birth_date')) ?></td>
      <td class="lbl">AGE</td><td><?= nsrp_val($g('age')) ?></td>
    </tr>
    <tr>
      <td class="lbl">SEX</td><td><?= $sexBoxes ?></td>
      <td class="lbl">PLACE OF BIRTH</td><td><?= nsrp_val('') ?></td>
    </tr>
    <tr>
      <td class="lbl">CIVIL STATUS</td><td colspan="3"><?= $csBoxes ?></td>
    </tr>
    <tr>
      <td class="lbl">CITIZENSHIP</td><td><?= nsrp_val('') ?></td>
      <td class="lbl">HEIGHT / WEIGHT</td><td><?= nsrp_val('') ?></td>
    </tr>
    <tr>
      <td class="lbl">PRESENT ADDRESS</td><td colspan="3"><?= nsrp_val($addr) ?></td>
    </tr>
    <tr>
      <td class="lbl">PERMANENT ADDRESS</td>
      <td colspan="3"><?= nsrp_box(null, 'check if same as Present Address') ?> <?= nsrp_val('') ?></td>
    </tr>
    <tr>
      <td class="lbl">MOBILE NUMBER</td><td><?= nsrp_val($g('mobile')) ?></td>
      <td class="lbl">LANDLINE NUMBER</td><td><?= nsrp_val('') ?></td>
    </tr>
    <tr>
      <td class="lbl">EMAIL ADDRESS</td><td colspan="3"><?= nsrp_val($g('email')) ?></td>
    </tr>
    <tr>
      <td class="lbl">DISABILITY</td>
      <td colspan="3">
        <?= nsrp_box(null, 'Visual') . nsrp_box(null, 'Hearing') . nsrp_box(null, 'Speech')
           . nsrp_box(null, 'Physical') . nsrp_box(null, 'Others, specify: ____________') ?>
      </td>
    </tr>
    <tr>
      <td class="lbl">EMPLOYMENT STATUS</td>
      <td colspan="3">
        <?= nsrp_box(null, 'Employed &mdash; Wage Employed') . nsrp_box(null, 'Self Employed') ?><br>
        <?= nsrp_box(null, 'Unemployed &mdash; New Entrant/Fresh Graduate') . nsrp_box(null, 'Finished Contract')
           . nsrp_box(null, 'Resigned') . nsrp_box(null, 'Retired') . nsrp_box(null, 'Terminated/Laid off') ?>
      </td>
    </tr>
    <tr>
      <td class="lbl">Actively looking for work?</td>
      <td><?= nsrp_box(null, 'Yes') . nsrp_box(null, 'No') ?> How long: <?= nsrp_val('') ?></td>
      <td class="lbl">Willing to work immediately?</td>
      <td><?= nsrp_box(null, 'Yes') . nsrp_box(null, 'No') ?></td>
    </tr>
    <tr>
      <td class="lbl">4Ps beneficiary?</td>
      <td><?= nsrp_box(null, 'Yes') . nsrp_box(null, 'No') ?> Household ID: <?= nsrp_val('') ?></td>
      <td class="lbl">Are you an OFW?</td>
      <td><?= nsrp_box(null, 'Yes') . nsrp_box(null, 'No') ?> Country: <?= nsrp_val('') ?></td>
    </tr>
  </table>

  <div class="band">II. JOB PREFERENCE</div>
  <table>
    <tr><th style="width:18px"></th><th>PREFERRED OCCUPATION</th><th>INDUSTRY</th></tr>
    <?= $occRows ?>
  </table>
  <table style="margin-top:-1px">
    <tr><th style="width:18px"></th><th>PREFERRED WORK LOCATION (Local &mdash; city/municipality)</th></tr>
    <?= $locRows ?>
    <tr><td colspan="2">Overseas, specify countries: <?= nsrp_val('') ?></td></tr>
    <tr><td colspan="2"><strong>Salary Expectation (PHP):</strong> <?= nsrp_val($salary) ?></td></tr>
  </table>

  <div class="band">III. EDUCATIONAL BACKGROUND</div>
  <table>
    <tr>
      <td class="lbl">Currently in school?</td>
      <td colspan="3"><?= nsrp_box(null, 'Yes') . nsrp_box(null, 'No') ?></td>
    </tr>
    <tr>
      <td class="lbl">HIGHEST EDUCATIONAL LEVEL</td>
      <td colspan="3"><?= $eduBoxes ?></td>
    </tr>
    <tr>
      <td class="lbl">YEAR GRADUATED / LAST ATTENDED</td><td><?= nsrp_val('') ?></td>
      <td class="lbl">SCHOOL / UNIVERSITY</td><td><?= nsrp_val('') ?></td>
    </tr>
    <tr>
      <td class="lbl">COURSE / PROGRAM</td><td><?= nsrp_val('') ?></td>
      <td class="lbl">AWARDS / HONORS RECEIVED</td><td><?= nsrp_val('') ?></td>
    </tr>
  </table>

  <div class="band">IV. TECHNICAL / VOCATIONAL AND OTHER TRAINING</div>
  <table>
    <tr><td colspan="5">Currently in training? <?= nsrp_box(null, 'Yes') . nsrp_box(null, 'No') ?></td></tr>
    <tr>
      <th>TRAINING</th><th>DURATION OF COURSE</th><th>TRAINING INSTITUTION</th>
      <th>CERTIFICATES RECEIVED</th><th>COMPLETED</th>
    </tr>
    <?php for ($i = 0; $i < 3; $i++): ?>
      <tr>
        <td><?= nsrp_val('') ?></td><td><?= nsrp_val('') ?></td><td><?= nsrp_val('') ?></td>
        <td><?= nsrp_val('') ?></td><td><?= nsrp_box(null, 'Yes') . nsrp_box(null, 'No') ?></td>
      </tr>
    <?php endfor; ?>
  </table>

  <div class="band">V. ELIGIBILITY</div>
  <table>
    <tr><th>CAREER SERVICE / BOARD / BAR</th><th>LICENSE NUMBER</th><th>EXPIRY DATE</th></tr>
    <tr><td><?= nsrp_val('') ?></td><td><?= nsrp_val('') ?></td><td><?= nsrp_val('') ?></td></tr>
    <tr><td colspan="3">
      <strong>LANGUAGE PROFICIENCY CERTIFICATION</strong><br>
      <?= nsrp_box(null, 'IELTS') . nsrp_box(null, 'TOEFL') . nsrp_box(null, 'TOCFL')
         . nsrp_box(null, 'JLPT') . nsrp_box(null, 'TOPIC') . nsrp_box(null, 'Others: __________') ?>
      <br>Validity date: <?= nsrp_val('') ?>
      <br><strong>Dialects Spoken:</strong> <?= $dialectBoxes ?>
    </td></tr>
  </table>

  <div class="band">VI. WORK EXPERIENCE (limit to the last 10 years, most recent first)</div>
  <table>
    <tr>
      <th>NAME OF OFFICE / COMPANY</th><th>ADDRESS</th><th>POSITION HELD</th>
      <th>INCLUSIVE DATES (mm/yyyy)</th><th>STATUS OF APPOINTMENT</th>
    </tr>
    <?= $whRows ?>
  </table>
  <div class="foot"><em>*Status of appointment can be either of the ff.: Permanent, Contractual, Part-time, or Probationary.</em></div>

  <div class="band">VII. 21st CENTURY SKILLS &mdash; check five (5) skills you possess (self-assessment)</div>
  <table><tr><td>
    <div class="cols">
      <?php foreach (['Innovation','Team Work','Multitasking','Work Ethics','Self Motivation',
                      'Creative Problem Solving','Problem Solving','Critical Thinking','Decision Making',
                      'Stress Tolerance','Planning and Organizing','Social Perceptiveness',
                      'English Functional Skills','English Comprehension','Math Functional Skill'] as $sk): ?>
        <div><?= nsrp_box(null, $sk) ?></div>
      <?php endforeach; ?>
    </div>
  </td></tr></table>

  <div class="band">IX. TECHNICAL SKILLS ACQUIRED WITHOUT FORMAL TRAINING</div>
  <table><tr><td>
    <?= $techBoxes ?>
    <span class="cell3"><?= nsrp_box(null, 'Others: ____________') ?></span>
  </td></tr></table>

  <table style="margin-top:7px">
    <tr><td>
      <div style="text-align:center;font-weight:bold;font-size:8.5pt">CERTIFICATION / AUTHORIZATION</div>
      <div style="font-size:8pt;text-align:justify">
        This is to certify that all data/information that I have provided in this form are true to the best
        of my knowledge. This is also to authorize the DOLE to include my profile in the Skills Registry
        System, which is maintained in the PhilJobNet. It is understood that my name shall be made
        available to employers who have access to the Registry. I am also aware that DOLE is not obliged
        to seek employment on my behalf.
      </div>
      <div class="sig">
        <div><div class="sigline">Signature of Applicant</div></div>
        <div><div class="sigline">Date</div></div>
      </div>
    </td></tr>
  </table>

  <div class="peso">
    <strong>FOR USE OF PESO ONLY. PLEASE DO NOT WRITE BELOW THIS DOTTED LINE.</strong><br>
    Eligible for public employment services?
    <?= nsrp_box(null, 'SPES') . nsrp_box(null, 'GIP') . nsrp_box(null, 'TUPAD')
       . nsrp_box(null, 'JobStart') . nsrp_box(null, 'Others, specify: __________') ?>
    <div class="sig">
      <div><div class="sigline">Signature over Printed Name of Assessor</div></div>
      <div><div class="sigline">Date</div></div>
    </div>
  </div>

  <div class="stamp">
    Generated by CareLink on <?= $generated ?> from the applicant's own profile.
    Bold entries were supplied by the applicant through CareLink; ruled blanks are to be completed by hand.
  </div>
</div>

</body>
</html>
        <?php
        return (string) ob_get_clean();
    }
}
