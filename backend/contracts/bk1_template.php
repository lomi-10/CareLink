<?php
/**
 * HTML layout approximating DOLE Form BK-1 (Kontrata sa Paglilingkod sa Tahanan).
 * IMPORTANT: Verify against the latest official DOLE form; this is a template for automation only.
 *
 * @param array<string,mixed> $d Sanitized display values (pre-escaped where noted)
 */
function carelink_bk1_build_html(array $d): string
{
    $mark = static function ($flag) {
        return !empty($flag) ? '[X]' : '[ ]';
    };
    $mSss = $mark($d['prov_sss'] ?? false);
    $mPh  = $mark($d['prov_ph'] ?? false);
    $mPi  = $mark($d['prov_pi'] ?? false);

    return '<!DOCTYPE html>
<html lang="fil">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 10pt; color: #111; line-height: 1.35; }
    h1 { font-size: 13pt; text-align: center; margin: 0 0 6px 0; }
    h2 { font-size: 11pt; margin: 10px 0 4px 0; border-bottom: 1px solid #333; }
    .sub { text-align: center; font-size: 9pt; color: #333; margin-bottom: 12px; }
    .legal { font-size: 8pt; color: #444; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    td { border: 1px solid #333; padding: 6px; vertical-align: top; }
    .label { width: 28%; font-weight: bold; background: #f5f5f5; }
    .small { font-size: 8.5pt; }
  </style>
</head>
<body>
  <h1>KONTRATA SA PAGLILINGKOD SA TAHANAN</h1>
  <div class="sub">(Kasambahay) — Form BK-1 (approximation for system-generated PDF)<br/>
    <span class="small">Verify field labels against the latest official DOLE form. Document ID: ' . ($d['doc_ref'] ?? '') . '</span>
  </div>

  <p class="legal">Ang kontratang ito ay binuo ng CareLink mula sa datos na naisumite ng mga partido. Dapat suriin ng mga partido ang nilalaman at kumonsulta sa DOLE o legal na tagapayo kung kinakailangan.</p>

  <h2>I. Mga Partido</h2>
  <table>
    <tr><td class="label">Pangalan ng Amo (Employer)</td><td>' . ($d['employer_name'] ?? '') . '</td></tr>
    <tr><td class="label">Katayuang Sibil (Employer)</td><td>' . ($d['employer_civil'] ?? '') . '</td></tr>
    <tr><td class="label">Tirahan ng Amo</td><td>' . ($d['employer_address'] ?? '') . '</td></tr>
    <tr><td class="label">Telepono ng Amo</td><td>' . ($d['employer_phone'] ?? '') . '</td></tr>
    <tr><td class="label">Pangalan ng Kasambahay (Helper)</td><td>' . ($d['helper_name'] ?? '') . '</td></tr>
    <tr><td class="label">Edad</td><td>' . ($d['helper_age'] ?? '') . '</td></tr>
    <tr><td class="label">Katayuang Sibil (Helper)</td><td>' . ($d['helper_civil'] ?? '') . '</td></tr>
    <tr><td class="label">Tirahan ng Kasambahay</td><td>' . ($d['helper_address'] ?? '') . '</td></tr>
    <tr><td class="label">Telepono ng Kasambahay</td><td>' . ($d['helper_phone'] ?? '') . '</td></tr>
  </table>

  <h2>II. Uri ng Trabaho at Panahon</h2>
  <table>
    <tr><td class="label">Pamagat ng Trabaho / Posisyon</td><td>' . ($d['job_title'] ?? '') . '</td></tr>
    <tr><td class="label">Inilarawan na mga gawain</td><td>' . ($d['job_duties'] ?? '') . '</td></tr>
    <tr><td class="label">Uri ng Empleyo / Iskedyul</td><td>' . ($d['employment_work'] ?? '') . '</td></tr>
    <tr><td class="label">Petsa ng pagsisimula</td><td>' . ($d['start_date'] ?? '') . '</td></tr>
    <tr><td class="label">Petsa ng pagtatapos ng kontrata</td><td>' . ($d['end_date'] ?? '') . '</td></tr>
  </table>

  <h2>III. Kabayaran ng Sahod</h2>
  <table>
    <tr><td class="label">Halaga ng sahod</td><td>' . ($d['salary_amount'] ?? '') . '</td></tr>
    <tr><td class="label">Paraan / Panahon ng bayad</td><td>' . ($d['salary_period'] ?? '') . '</td></tr>
    <tr><td class="label">Araw ng pahinga (days off)</td><td>' . ($d['days_off'] ?? '') . '</td></tr>
  </table>

  <h2>IV. Mga Benepisyo (batay sa datos sa Job Post)</h2>
  <table>
    <tr><td class="label">SSS</td><td>' . $mSss . ' Ibinibigay / isasama</td></tr>
    <tr><td class="label">PhilHealth</td><td>' . $mPh . ' Ibinibigay / isasama</td></tr>
    <tr><td class="label">Pag-IBIG</td><td>' . $mPi . ' Ibinibigay / isasama</td></tr>
    <tr><td class="label">Iba pang benepisyo / tala</td><td>' . ($d['benefits_notes'] ?? '') . '</td></tr>
  </table>

  <h2>Karagdagang kasunduan / mga pagbabago</h2>
  <table>
    <tr><td class="label">Tala mula sa mga partido (bago lumikha ang kontratang ito)</td><td>' . ($d['contract_notes'] ?? '') . '</td></tr>
  </table>

  <h2>V. Lugar at Petsa</h2>
  <table>
    <tr><td class="label">Petsa ng paglalagda (system)</td><td>' . ($d['signed_date'] ?? '') . '</td></tr>
  </table>

  <p class="small">Ang mga lagda sa opisyal na form BK-1 ay dapat isumite sa tamang tanggapan ng DOLE kung kinakailangan. Ang PDF na ito ay dokumento para sa mga partido at rekord ng CareLink.</p>
</body>
</html>';
}
