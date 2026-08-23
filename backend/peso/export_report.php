<?php
/**
 * peso/export_report.php — the detailed PESO analytics workbook.
 *
 * WHY NOT CSV: the old export wrote four one-column-pair CSVs ("Week,Placements")
 * straight from whatever the dashboard happened to be holding. PESO called it
 * unprofessional and they were right — it carried no names, no ages, no
 * locations, no relationships, and nothing that could be filed or presented.
 *
 * WHY NOT .xlsx: a real xlsx is a ZIP archive, and this server has no zip
 * extension and no PhpSpreadsheet. Rather than ship a fake, this writes
 * SpreadsheetML 2003 (Excel's own XML workbook format) — a single plain-XML
 * file that Excel, LibreOffice and Google Sheets open natively, with real
 * multiple sheets, styled headers, column widths, frozen panes and typed
 * numeric/date cells. No dependency, and nothing pretending to be something
 * it is not.
 *
 * Six sheets: Summary, Helpers, Employers, Placements, Complaints, Demographics
 *
 * GET ?staff_user_id=..   (staff only — this is the whole user base, with PII)
 */

ini_set('display_errors', 0);
error_reporting(0);

// CORS must be sent BEFORE anything that can exit early (peso_require_staff
// returns 403 and stops), and before any output.
//
// This file originally shipped with no CORS headers at all, unlike every other
// endpoint here. The web app runs on localhost:8081 and the API on
// localhost/carelink_api — a different origin — so the browser discarded the
// response and fetch rejected, which surfaced in the app as "could not reach
// the server" even though the endpoint was answering correctly.
//
// Authorization is listed in Allow-Headers because lib/authFetch.ts attaches a
// bearer token to every API_URL request. That makes this a non-simple request,
// so the browser sends an OPTIONS preflight first — which has to be answered
// before the real GET is ever attempted.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
// So a browser download can read the filename off the response.
header('Access-Control-Expose-Headers: Content-Disposition');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

// Every row below carries names, ages and addresses for the entire platform.
// This must never be reachable without staff auth.
peso_require_staff($conn);

// ── XML helpers ─────────────────────────────────────────────────────────────
function xs($v): string
{
    // Excel's XML parser rejects raw control characters outright, so they are
    // stripped rather than escaped — one stray 0x0B in a complaint description
    // would otherwise make the whole workbook refuse to open.
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', (string) $v);
    return htmlspecialchars($v, ENT_QUOTES | ENT_XML1, 'UTF-8');
}
function cellStr($v, string $style = ''): string
{
    $s = $style !== '' ? ' ss:StyleID="' . $style . '"' : '';
    return '<Cell' . $s . '><Data ss:Type="String">' . xs($v) . '</Data></Cell>';
}
function cellNum($v, string $style = ''): string
{
    $s = $style !== '' ? ' ss:StyleID="' . $style . '"' : '';
    if ($v === null || $v === '') return '<Cell' . $s . '/>';
    return '<Cell' . $s . '><Data ss:Type="Number">' . (0 + $v) . '</Data></Cell>';
}
function cellDate($v): string
{
    if (!$v) return '<Cell/>';
    $t = strtotime((string) $v);
    if (!$t) return cellStr($v);
    return '<Cell ss:StyleID="sDate"><Data ss:Type="DateTime">' . date('Y-m-d\TH:i:s', $t) . '</Data></Cell>';
}
function rowOf(array $cells): string { return '<Row>' . implode('', $cells) . '</Row>'; }

/** Header row + column widths + a frozen top row, so a long sheet stays readable. */
function sheetOpen(string $name, array $headers, array $widths): string
{
    $x = '<Worksheet ss:Name="' . xs(substr($name, 0, 31)) . '"><Table>';
    foreach ($widths as $w) $x .= '<Column ss:Width="' . (int) $w . '" ss:AutoFitWidth="0"/>';
    $x .= '<Row ss:Height="24">';
    foreach ($headers as $h) $x .= cellStr($h, 'sHead');
    $x .= '</Row>';
    return $x;
}
function sheetClose(): string
{
    return '</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">'
         . '<FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal>'
         . '<TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane>'
         . '</WorksheetOptions></Worksheet>';
}
function q(mysqli $conn, string $sql): array
{
    $res = $conn->query($sql);
    $out = [];
    if ($res) while ($r = $res->fetch_assoc()) $out[] = $r;
    return $out;
}
function inOrmoc($m): string
{
    $m = trim((string) $m);
    if ($m === '') return 'Unknown';
    return stripos($m, 'ormoc') !== false ? 'Within Ormoc' : 'Beyond Ormoc';
}

$generated = date('Y-m-d H:i');
$fileName  = 'CareLink_PESO_Report_' . date('Y-m-d') . '.xls';

// helper_profiles.gender is free text enough that 'male', 'Male' and '' all
// occur; bucketing in SQL keeps every downstream percentage honest.
$GENDER = "CASE
    WHEN LOWER(TRIM(COALESCE(hp.gender,''))) IN ('male','m') THEN 'Male'
    WHEN LOWER(TRIM(COALESCE(hp.gender,''))) IN ('female','f') THEN 'Female'
    ELSE 'Not stated' END";

$helpers = q($conn, "
    SELECT u.user_id, TRIM(CONCAT(u.first_name,' ',COALESCE(u.middle_name,''),' ',COALESCE(u.last_name,''))) AS name,
           u.email, u.phone, u.status AS account_status, u.created_at,
           {$GENDER} AS gender,
           TIMESTAMPDIFF(YEAR, hp.birth_date, CURDATE()) AS age,
           hp.civil_status, hp.barangay, hp.municipality, hp.province,
           hp.experience_years, hp.expected_salary,
           hp.verification_status, hp.rating_average, hp.rating_count,
           (SELECT GROUP_CONCAT(DISTINCT rc.category_name ORDER BY rc.category_name SEPARATOR ', ')
              FROM helper_jobs hj INNER JOIN ref_jobs rj ON rj.job_id = hj.job_id LEFT JOIN ref_categories rc ON rc.category_id = rj.category_id
             WHERE hj.profile_id = hp.profile_id) AS specialty,
           (SELECT COUNT(*) FROM placements p WHERE p.helper_id = u.user_id) AS placements,
           (SELECT COUNT(*) FROM placements p WHERE p.helper_id = u.user_id AND p.status = 'Active') AS active_placements,
           (SELECT COUNT(*) FROM complaints cp WHERE cp.respondent_id = u.user_id) AS complaints_against,
           (SELECT COUNT(*) FROM complaints cp WHERE cp.complainant_id = u.user_id) AS complaints_filed
    FROM users u
    INNER JOIN helper_profiles hp ON hp.user_id = u.user_id
    WHERE u.user_type = 'helper'
    ORDER BY name");

$employers = q($conn, "
    SELECT u.user_id, TRIM(CONCAT(u.first_name,' ',COALESCE(u.middle_name,''),' ',COALESCE(u.last_name,''))) AS name,
           u.email, u.phone, u.status AS account_status, u.created_at,
           pp.barangay, pp.municipality, pp.province, pp.verification_status,
           (SELECT COUNT(*) FROM job_posts jp WHERE jp.parent_id = u.user_id) AS job_posts,
           (SELECT COUNT(*) FROM job_posts jp WHERE jp.parent_id = u.user_id AND jp.status = 'Open') AS open_posts,
           (SELECT COUNT(*) FROM placements p WHERE p.parent_id = u.user_id) AS placements,
           (SELECT COUNT(*) FROM complaints cp WHERE cp.respondent_id = u.user_id) AS complaints_against,
           (SELECT COUNT(*) FROM complaints cp WHERE cp.complainant_id = u.user_id) AS complaints_filed
    FROM users u
    INNER JOIN parent_profiles pp ON pp.user_id = u.user_id
    WHERE u.user_type = 'parent'
    ORDER BY name");

$placements = q($conn, "
    SELECT p.placement_id, p.status, p.start_date, p.end_date, p.created_at,
           TRIM(CONCAT(hu.first_name,' ',COALESCE(hu.last_name,''))) AS helper_name,
           TIMESTAMPDIFF(YEAR, hp.birth_date, CURDATE()) AS helper_age,
           {$GENDER} AS helper_gender,
           hp.barangay AS helper_barangay, hp.municipality AS helper_municipality,
           hp.verification_status AS helper_verification,
           (SELECT GROUP_CONCAT(DISTINCT rc2.category_name ORDER BY rc2.category_name SEPARATOR ', ')
              FROM helper_jobs hj INNER JOIN ref_jobs rj2 ON rj2.job_id = hj.job_id LEFT JOIN ref_categories rc2 ON rc2.category_id = rj2.category_id
             WHERE hj.profile_id = hp.profile_id) AS helper_specialty,
           TRIM(CONCAT(pu.first_name,' ',COALESCE(pu.last_name,''))) AS employer_name,
           pp.municipality AS employer_municipality,
           jp.title AS job_title, rc.category_name AS job_category,
           jp.salary_offered, jp.salary_period, jp.employment_type, jp.work_schedule,
           (SELECT COUNT(*) FROM complaints cp WHERE cp.placement_id = p.placement_id) AS complaints
    FROM placements p
    INNER JOIN users hu ON hu.user_id = p.helper_id
    LEFT  JOIN helper_profiles hp ON hp.user_id = p.helper_id
    INNER JOIN users pu ON pu.user_id = p.parent_id
    LEFT  JOIN parent_profiles pp ON pp.user_id = p.parent_id
    LEFT  JOIN job_posts jp ON jp.job_post_id = p.job_post_id
    LEFT  JOIN ref_categories rc ON rc.category_id = jp.category_id
    ORDER BY p.created_at DESC");

$complaints = q($conn, "
    SELECT cp.complaint_id, cp.created_at, cp.category, cp.status, cp.subject, cp.description, cp.placement_id,
           TRIM(CONCAT(cu.first_name,' ',COALESCE(cu.last_name,''))) AS complainant_name,
           cu.user_type AS complainant_type,
           TRIM(CONCAT(ru.first_name,' ',COALESCE(ru.last_name,''))) AS respondent_name,
           ru.user_type AS respondent_type,
           CASE
             WHEN LOWER(TRIM(COALESCE(rhp.gender,''))) IN ('male','m') THEN 'Male'
             WHEN LOWER(TRIM(COALESCE(rhp.gender,''))) IN ('female','f') THEN 'Female'
             WHEN ru.user_type = 'helper' THEN 'Not stated' ELSE '' END AS respondent_gender,
           TIMESTAMPDIFF(YEAR, rhp.birth_date, CURDATE()) AS respondent_age,
           COALESCE(rhp.municipality, rpp.municipality) AS respondent_municipality,
           jp.title AS job_title, rc.category_name AS job_category
    FROM complaints cp
    LEFT JOIN users cu ON cu.user_id = cp.complainant_id
    LEFT JOIN users ru ON ru.user_id = cp.respondent_id
    LEFT JOIN helper_profiles rhp ON rhp.user_id = cp.respondent_id
    LEFT JOIN parent_profiles rpp ON rpp.user_id = cp.respondent_id
    LEFT JOIN placements p ON p.placement_id = cp.placement_id
    LEFT JOIN job_posts jp ON jp.job_post_id = p.job_post_id
    LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
    ORDER BY cp.created_at DESC");

$catJobs = q($conn, "
    SELECT COALESCE(rc.category_name,'Uncategorised') AS name, COUNT(*) AS c
    FROM job_posts jp LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
    GROUP BY name ORDER BY c DESC");
$catPlace = q($conn, "
    SELECT COALESCE(rc.category_name,'Uncategorised') AS name, COUNT(*) AS c
    FROM placements p INNER JOIN job_posts jp ON jp.job_post_id = p.job_post_id
    LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id
    GROUP BY name ORDER BY c DESC");
$catSpec = q($conn, "
    SELECT name, COUNT(*) AS c FROM (
      SELECT DISTINCT hp.user_id, COALESCE(rc.category_name,'Uncategorised') AS name
      FROM helper_profiles hp
      INNER JOIN helper_jobs hj ON hj.profile_id = hp.profile_id
      INNER JOIN ref_jobs rj ON rj.job_id = hj.job_id
      LEFT JOIN ref_categories rc ON rc.category_id = rj.category_id
    ) t GROUP BY name ORDER BY c DESC");

// ── Derived summary ─────────────────────────────────────────────────────────
$gTally = ['Male' => 0, 'Female' => 0, 'Not stated' => 0];
$gComplaints = $gTally;
$gPlacements = $gTally;
$geoHelpers = ['Within Ormoc' => 0, 'Beyond Ormoc' => 0, 'Unknown' => 0];
foreach ($helpers as $h) {
    $g = $h['gender'];
    $gTally[$g]++;
    $gComplaints[$g] += (int) $h['complaints_against'];
    $gPlacements[$g] += (int) $h['placements'];
    $geoHelpers[inOrmoc($h['municipality'])]++;
}
$geoEmployers = ['Within Ormoc' => 0, 'Beyond Ormoc' => 0, 'Unknown' => 0];
foreach ($employers as $e) $geoEmployers[inOrmoc($e['municipality'])]++;

$againstHelper = 0;
$againstEmployer = 0;
foreach ($complaints as $cp) {
    if ($cp['respondent_type'] === 'helper') $againstHelper++;
    elseif ($cp['respondent_type'] === 'parent') $againstEmployer++;
}

$hTotal = count($helpers);
$eTotal = count($employers);
$pTotal = count($placements);
$cTotal = count($complaints);
$roleName = function ($t) { return $t === 'helper' ? 'Helper' : ($t === 'parent' ? 'Household Employer' : ucfirst((string) $t)); };
$share = function (int $n, int $total) { return $total > 0 ? round(($n / $total) * 100, 1) : 0; };


// ── Build every sheet once ──────────────────────────────────────────────────
// The preview in the app and the downloaded workbook are rendered from THIS
// array, not from two parallel code paths. PESO asked to see the report before
// exporting it, and a preview assembled separately from the file is a preview
// of something else — it drifts the first time one side is edited.
$sheets = [];

$rate = function (string $g) use ($gTally, $gComplaints) {
    // Complaints per 100 helpers of that gender. A raw count only tracks
    // headcount, so it cannot answer "which group is more prone".
    $n = $gTally[$g];
    return $n > 0 ? round(($gComplaints[$g] / $n) * 100, 1) : 0;
};

$catNames = [];
foreach ([$catJobs, $catPlace, $catSpec] as $set) foreach ($set as $r) $catNames[$r['name']] = true;
$pick = function (array $set, $name) { foreach ($set as $r) if ($r['name'] === $name) return (int) $r['c']; return 0; };

$sheets[] = [
    'name'   => 'Summary',
    'widths' => [300, 130, 130, 200],
    'blocks' => [
        ['title' => 'PLATFORM TOTALS', 'headers' => null, 'rows' => [
            ['Registered helpers', $hTotal],
            ['Registered employers', $eTotal],
            ['Total placements', $pTotal],
            ['Total complaints', $cTotal],
        ]],
        ['title' => 'HELPER GENDER DEMOGRAPHICS',
         'headers' => ['Gender', 'Helpers', 'Placements', 'Complaints per 100 helpers'],
         'rows' => array_map(fn($g) => [$g, $gTally[$g], $gPlacements[$g], $rate($g)], ['Male', 'Female', 'Not stated'])],
        ['title' => 'WHO IS REPORTED', 'headers' => null, 'rows' => [
            ['Complaints against helpers', $againstHelper],
            ['Complaints against employers', $againstEmployer],
            ['Most reported party', $againstHelper === $againstEmployer ? 'Even' : ($againstHelper > $againstEmployer ? 'Helpers' : 'Employers')],
        ]],
        ['title' => 'GEOGRAPHIC DISTRIBUTION',
         'headers' => ['Area', 'Helpers', 'Employers', ''],
         'rows' => array_map(fn($k) => [$k, $geoHelpers[$k], $geoEmployers[$k], ''], ['Within Ormoc', 'Beyond Ormoc', 'Unknown'])],
        ['title' => 'CATEGORY LEADERS',
         'headers' => ['Category', 'Job posts', 'Placements', 'Helpers with specialty'],
         'rows' => array_map(fn($n) => [$n, $pick($catJobs, $n), $pick($catPlace, $n), $pick($catSpec, $n)], array_keys($catNames))],
    ],
];

$sheets[] = [
    'name'    => 'Helpers',
    'widths'  => [70,190,45,70,85,120,120,110,125,220,95,105,95,100,55,60,80,100,110,100,190,110,90],
    'headers' => ['Helper ID','Full name','Age','Gender','Civil status','Barangay','Municipality','Province','Within/Beyond Ormoc',
                  'Category specialty','Experience (yrs)','Expected salary','Verification','Account status','Rating','Reviews',
                  'Placements','Active placements','Complaints against','Complaints filed','Email','Phone','Registered'],
    'money'   => [11],
    'dates'   => [22],
    'rows'    => array_map(fn($h) => [
        (int) $h['user_id'], preg_replace('/\s+/', ' ', (string) $h['name']), $h['age'], $h['gender'], $h['civil_status'],
        $h['barangay'], $h['municipality'], $h['province'], inOrmoc($h['municipality']), $h['specialty'],
        $h['experience_years'], $h['expected_salary'], $h['verification_status'], $h['account_status'],
        $h['rating_average'], $h['rating_count'], $h['placements'], $h['active_placements'],
        $h['complaints_against'], $h['complaints_filed'], $h['email'], $h['phone'], $h['created_at'],
    ], $helpers),
];

$sheets[] = [
    'name'    => 'Employers',
    'widths'  => [80,190,120,120,110,125,95,100,85,85,90,110,100,190,110,90],
    'headers' => ['Employer ID','Full name','Barangay','Municipality','Province','Within/Beyond Ormoc','Verification','Account status',
                  'Job posts','Open posts','Placements','Complaints against','Complaints filed','Email','Phone','Registered'],
    'dates'   => [15],
    'rows'    => array_map(fn($e) => [
        (int) $e['user_id'], preg_replace('/\s+/', ' ', (string) $e['name']),
        $e['barangay'], $e['municipality'], $e['province'], inOrmoc($e['municipality']),
        $e['verification_status'], $e['account_status'], $e['job_posts'], $e['open_posts'], $e['placements'],
        $e['complaints_against'], $e['complaints_filed'], $e['email'], $e['phone'], $e['created_at'],
    ], $employers),
];

$sheets[] = [
    'name'    => 'Placements',
    'widths'  => [90,80,180,75,85,120,135,125,200,110,180,145,190,140,95,75,115,115,90,90,85,90],
    'headers' => ['Placement ID','Status','Helper','Helper age','Helper gender','Helper barangay','Helper municipality','Within/Beyond Ormoc',
                  'Helper specialty','Helper verification','Employer','Employer municipality','Job title','Job category',
                  'Salary','Period','Employment type','Work schedule','Start date','End date','Complaints','Recorded'],
    'money'   => [14],
    'dates'   => [18, 19, 21],
    'rows'    => array_map(fn($p) => [
        (int) $p['placement_id'], $p['status'], $p['helper_name'], $p['helper_age'], $p['helper_gender'],
        $p['helper_barangay'], $p['helper_municipality'], inOrmoc($p['helper_municipality']),
        $p['helper_specialty'], $p['helper_verification'], $p['employer_name'], $p['employer_municipality'],
        $p['job_title'], $p['job_category'], $p['salary_offered'], $p['salary_period'],
        $p['employment_type'], $p['work_schedule'], $p['start_date'], $p['end_date'],
        $p['complaints'], $p['created_at'],
    ], $placements),
];

$sheets[] = [
    'name'    => 'Complaints',
    'widths'  => [95,95,140,115,180,100,180,115,115,100,155,125,185,140,95,230,400],
    'headers' => ['Reference','Date filed','Category','Status','Filed by','Filed by role','Reported party','Reported party role',
                  'Reported party gender','Reported party age','Reported party municipality','Within/Beyond Ormoc',
                  'Related job','Job category','Placement ID','Subject','Description'],
    'dates'   => [1],
    'wrap'    => [15, 16],
    'rows'    => array_map(fn($cp) => [
        'GRV-' . str_pad((string) $cp['complaint_id'], 4, '0', STR_PAD_LEFT),
        $cp['created_at'], $cp['category'], $cp['status'],
        $cp['complainant_name'], $roleName($cp['complainant_type']),
        $cp['respondent_name'], $roleName($cp['respondent_type']),
        $cp['respondent_gender'], $cp['respondent_age'],
        $cp['respondent_municipality'], inOrmoc($cp['respondent_municipality']),
        $cp['job_title'], $cp['job_category'], $cp['placement_id'],
        $cp['subject'], $cp['description'],
    ], $complaints),
];

// Every cross-tab in one long filterable shape, so an officer can pivot it
// themselves instead of asking for another export.
$demoRows = [];
$jobsSum  = (int) array_sum(array_column($catJobs, 'c'));
$placeSum = (int) array_sum(array_column($catPlace, 'c'));
foreach (['Male', 'Female', 'Not stated'] as $g) $demoRows[] = ['Helper gender', $g, $gTally[$g], $share($gTally[$g], $hTotal)];
foreach (['Male', 'Female', 'Not stated'] as $g) $demoRows[] = ['Complaints against helpers, by gender', $g, $gComplaints[$g], $share($gComplaints[$g], $againstHelper)];
foreach (['Male', 'Female', 'Not stated'] as $g) $demoRows[] = ['Placements, by helper gender', $g, $gPlacements[$g], $share($gPlacements[$g], $pTotal)];
foreach (['Within Ormoc', 'Beyond Ormoc', 'Unknown'] as $k) $demoRows[] = ['Helper location', $k, $geoHelpers[$k], $share($geoHelpers[$k], $hTotal)];
foreach (['Within Ormoc', 'Beyond Ormoc', 'Unknown'] as $k) $demoRows[] = ['Employer location', $k, $geoEmployers[$k], $share($geoEmployers[$k], $eTotal)];
$demoRows[] = ['Reported party', 'Helpers', $againstHelper, $share($againstHelper, $cTotal)];
$demoRows[] = ['Reported party', 'Employers', $againstEmployer, $share($againstEmployer, $cTotal)];
foreach ($catJobs as $r)  $demoRows[] = ['Job posts by category', $r['name'], (int) $r['c'], $share((int) $r['c'], $jobsSum)];
foreach ($catPlace as $r) $demoRows[] = ['Placements by category', $r['name'], (int) $r['c'], $share((int) $r['c'], $placeSum)];
foreach ($catSpec as $r)  $demoRows[] = ['Helper specialty by category', $r['name'], (int) $r['c'], $share((int) $r['c'], $hTotal)];

$sheets[] = [
    'name'    => 'Demographics',
    'widths'  => [280, 230, 95, 130],
    'headers' => ['Measure', 'Group', 'Count', 'Share of total (%)'],
    'rows'    => $demoRows,
];

// ── Preview mode ────────────────────────────────────────────────────────────
// Same $sheets the workbook is written from, as JSON. Rows are capped because
// the preview is for checking shape and content before committing to a file —
// the download always carries every row.
if (($_GET['format'] ?? '') === 'json') {
    header('Content-Type: application/json; charset=UTF-8');
    $limit = max(1, min(500, (int) ($_GET['limit'] ?? 100)));
    $outSheets = [];
    foreach ($sheets as $sh) {
        $entry = ['name' => $sh['name'], 'widths' => $sh['widths'] ?? []];
        if (isset($sh['blocks'])) {
            $entry['blocks'] = $sh['blocks'];
            $entry['total_rows'] = array_sum(array_map(fn($b) => count($b['rows']), $sh['blocks']));
            $entry['shown_rows'] = $entry['total_rows'];
        } else {
            $entry['headers']     = $sh['headers'];
            $entry['total_rows']  = count($sh['rows']);
            $entry['rows']        = array_slice($sh['rows'], 0, $limit);
            $entry['shown_rows']  = count($entry['rows']);
            $entry['money']       = $sh['money'] ?? [];
            $entry['dates']       = $sh['dates'] ?? [];
        }
        $outSheets[] = $entry;
    }
    echo json_encode([
        'success'     => true,
        'generated_at' => $generated,
        'file_name'   => $fileName,
        'row_limit'   => $limit,
        'sheets'      => $outSheets,
    ]);
    if (isset($conn) && $conn) $conn->close();
    exit;
}

// ── Render the workbook from $sheets ────────────────────────────────────────
header('Content-Type: application/vnd.ms-excel; charset=UTF-8');
header('Content-Disposition: attachment; filename="' . $fileName . '"');
header('Cache-Control: max-age=0');

// BOM — without it Excel mangles the N-tilde and accents in Filipino names.
echo "\xEF\xBB\xBF";
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<?mso-application progid="Excel.Sheet"?>' . "\n";
echo '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'
   . ' xmlns:o="urn:schemas-microsoft-com:office:office"'
   . ' xmlns:x="urn:schemas-microsoft-com:office:excel"'
   . ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"'
   . ' xmlns:html="http://www.w3.org/TR/REC-html40">';

echo '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">'
   . '<Title>CareLink - PESO Analytics Report</Title>'
   . '<Author>CareLink / PESO Ormoc</Author>'
   . '<Created>' . date('Y-m-d\TH:i:s\Z') . '</Created>'
   . '</DocumentProperties>';

$peso = "\xE2\x82\xB1"; // peso sign, kept out of the style literal
echo '<Styles>'
   . '<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top"/>'
   .   '<Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1F2937"/></Style>'
   . '<Style ss:ID="sTitle"><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#B44810"/></Style>'
   . '<Style ss:ID="sSub"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#6B7280"/></Style>'
   . '<Style ss:ID="sHead"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>'
   .   '<Interior ss:Color="#E8641A" ss:Pattern="Solid"/>'
   .   '<Alignment ss:Vertical="Center" ss:WrapText="1"/>'
   .   '<Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B44810"/></Borders></Style>'
   . '<Style ss:ID="sSection"><Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#2B1608"/>'
   .   '<Interior ss:Color="#FCEAD9" ss:Pattern="Solid"/></Style>'
   . '<Style ss:ID="sLabel"><Font ss:Bold="1"/></Style>'
   . '<Style ss:ID="sDate"><NumberFormat ss:Format="yyyy\-mm\-dd"/></Style>'
   . '<Style ss:ID="sMoney"><NumberFormat ss:Format="&quot;' . $peso . '&quot;#,##0"/></Style>'
   . '<Style ss:ID="sPct"><NumberFormat ss:Format="0.0"/></Style>'
   . '<Style ss:ID="sWrap"><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>'
   . '</Styles>';

/** One data cell, typed by value and column role. */
function autoCell($v, int $i, array $money, array $dates, array $wrap): string
{
    if (in_array($i, $dates, true)) return cellDate($v);
    if ($v === null || $v === '') return '<Cell/>';
    if (is_numeric($v)) return cellNum($v, in_array($i, $money, true) ? 'sMoney' : '');
    return cellStr($v, in_array($i, $wrap, true) ? 'sWrap' : '');
}

foreach ($sheets as $sh) {
    if (isset($sh['blocks'])) {
        echo '<Worksheet ss:Name="' . xs($sh['name']) . '"><Table>';
        foreach ($sh['widths'] as $w) echo '<Column ss:Width="' . (int) $w . '" ss:AutoFitWidth="0"/>';
        echo rowOf([cellStr('CareLink - PESO Analytics Report', 'sTitle')]);
        echo rowOf([cellStr('Public Employment Service Office, Ormoc City   |   generated ' . $generated, 'sSub')]);
        foreach ($sh['blocks'] as $b) {
            echo rowOf([cellStr('')]);
            echo rowOf([cellStr($b['title'], 'sSection'), cellStr('', 'sSection'), cellStr('', 'sSection'), cellStr('', 'sSection')]);
            if (!empty($b['headers'])) {
                echo '<Row ss:Height="22">';
                foreach ($b['headers'] as $h) echo cellStr($h, 'sHead');
                echo '</Row>';
            }
            foreach ($b['rows'] as $r) {
                $cells = [];
                foreach (array_values($r) as $i => $v) {
                    $cells[] = ($i === 0 && empty($b['headers']))
                        ? cellStr($v, 'sLabel')
                        : (is_numeric($v) ? cellNum($v) : cellStr($v));
                }
                echo rowOf($cells);
            }
        }
        echo sheetClose();
        continue;
    }

    echo sheetOpen($sh['name'], $sh['headers'], $sh['widths']);
    $money = $sh['money'] ?? [];
    $dates = $sh['dates'] ?? [];
    $wrap  = $sh['wrap'] ?? [];
    foreach ($sh['rows'] as $r) {
        $cells = [];
        foreach (array_values($r) as $i => $v) $cells[] = autoCell($v, $i, $money, $dates, $wrap);
        echo rowOf($cells);
    }
    echo sheetClose();
}

echo '</Workbook>';
if (isset($conn) && $conn) $conn->close();
