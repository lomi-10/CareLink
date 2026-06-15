<?php
/**
 * HTML layout for the CareLink Domestic Helper Employment Agreement PDF
 * (brown/amber themed redesign of the PESO Ormoc BK-1 contract).
 *
 * @param array<string,mixed> $d Sanitized display values (pre-escaped where noted)
 */
function carelink_bk1_build_html(array $d): string
{
    $nl = static function ($s): string {
        return nl2br((string) $s);
    };

    $sectionHeader = static function (string $title): string {
        return '<div style="background:#FDF3E7; border-left:4px solid #C8733A; padding:8px 12px; '
            . 'font-size:10pt; font-weight:bold; color:#8B4513; margin:10px 0 8px 0;">' . $title . '</div>';
    };

    $logoImgLarge = $d['logo_src'] !== '' ? '<img src="' . $d['logo_src'] . '" style="height:60px; display:block;" />' : '';
    $logoImgSmall = $d['logo_src'] !== '' ? '<img src="' . $d['logo_src'] . '" style="height:24px; vertical-align:middle;" />' : '';

    $contractId = (string) $d['contract_id_display'];

    $duties = !empty($d['job_duties_items']) && is_array($d['job_duties_items'])
        ? $d['job_duties_items']
        : ['Mga gawain sa tahanan ayon sa napagkasunduan.'];
    $dutiesHtml = '';
    foreach ($duties as $duty) {
        $dutiesHtml .= '<div style="font-size:10pt; color:#1A1A1A; margin-bottom:5px;">'
            . '<span style="color:#2D7D46; font-weight:bold;">&#10003;</span> ' . $duty . '</div>';
    }

    $benefitsHtml = '';
    if (!empty($d['prov_sss'])) {
        $benefitsHtml .= '<div style="font-size:10pt; color:#1A1A1A; margin-bottom:3px;"><span style="color:#2D7D46; font-weight:bold;">&#10003;</span> SSS</div>';
    }
    if (!empty($d['prov_ph'])) {
        $benefitsHtml .= '<div style="font-size:10pt; color:#1A1A1A; margin-bottom:3px;"><span style="color:#2D7D46; font-weight:bold;">&#10003;</span> PhilHealth</div>';
    }
    if (!empty($d['prov_pi'])) {
        $benefitsHtml .= '<div style="font-size:10pt; color:#1A1A1A; margin-bottom:3px;"><span style="color:#2D7D46; font-weight:bold;">&#10003;</span> Pag-IBIG</div>';
    }
    if ($benefitsHtml === '') {
        $benefitsHtml = '<div style="font-size:10pt; color:#6B6B6B;">None applicable</div>';
    }

    $otherBenefitsHtml = '';
    if (($d['other_benefits'] ?? 'Wala') !== 'Wala') {
        $otherBenefitsHtml = '<div style="font-size:8pt; color:#6B6B6B; text-transform:uppercase; letter-spacing:1px; margin-top:8px;">Other Benefits</div>'
            . '<div style="font-size:10pt; color:#1A1A1A; line-height:1.4;">' . $nl($d['other_benefits']) . '</div>';
    }

    $isSigned = ($d['contract_status'] ?? 'PENDING') === 'SIGNED';
    $badgeBg = $isSigned ? '#C8733A' : '#F59E0B';
    $badgeLabel = $isSigned ? 'SIGNED' : 'PENDING';

    $salaryPeriodLower = strtolower((string) ($d['salary_period_label'] ?? 'month'));

    $numBadge = static function (int $n): string {
        return '<span style="display:inline-block; background:#C8733A; color:#FFFFFF; width:16px; height:16px; '
            . 'line-height:16px; text-align:center; border-radius:8px; font-size:8pt; font-weight:bold; margin-right:6px;">' . $n . '</span>';
    };

    $termItem = static function (int $n, string $title, string $body) use ($numBadge): string {
        return '<table style="width:100%; border-collapse:collapse; margin-bottom:10px;"><tr>'
            . '<td style="width:20px; vertical-align:top; padding-top:1px;">' . $numBadge($n) . '</td>'
            . '<td style="vertical-align:top;">'
            . '<div style="font-size:10pt; font-weight:bold; color:#1A1A1A; text-transform:uppercase; margin-bottom:2px;">' . $title . '</div>'
            . '<div style="font-size:9pt; color:#6B6B6B; line-height:1.4;">' . $body . '</div>'
            . '</td>'
            . '</tr></table>';
    };

    $benefitsListSmall = '';
    if (!empty($d['prov_sss'])) {
        $benefitsListSmall .= '&bull; SSS<br/>';
    }
    if (!empty($d['prov_ph'])) {
        $benefitsListSmall .= '&bull; PhilHealth<br/>';
    }
    if (!empty($d['prov_pi'])) {
        $benefitsListSmall .= '&bull; Pag-IBIG<br/>';
    }
    if ($benefitsListSmall === '') {
        $benefitsListSmall = 'None applicable';
    }

    $mealsText = (($d['other_benefits'] ?? 'Wala') !== 'Wala')
        ? $nl($d['other_benefits'])
        : 'The employer shall provide meals for the helper.';

    $salaryPeriodAdverb = match ($salaryPeriodLower) {
        'monthly' => 'every month',
        'weekly' => 'every week',
        'daily' => 'every day',
        'bi-weekly', 'biweekly' => 'every two weeks',
        'semi-monthly', 'semimonthly' => 'twice a month',
        default => $salaryPeriodLower !== '' ? 'per ' . $salaryPeriodLower : 'periodically',
    };

    $hasAdditionalTerms = (($d['debt_agreement'] ?? 'Wala') !== 'Wala')
        || (($d['deployment_agreement'] ?? 'Wala') !== 'Wala')
        || (($d['other_agreements'] ?? 'Wala') !== 'Wala')
        || (($d['termination_conditions'] ?? 'Ayon sa RA 10361') !== 'Ayon sa RA 10361');

    $additionalTermsHtml = '';
    if ($hasAdditionalTerms) {
        $additionalRows = '';
        if (($d['debt_agreement'] ?? 'Wala') !== 'Wala') {
            $additionalRows .= '<div style="font-size:9pt; color:#1A1A1A; line-height:1.4; margin-bottom:6px;"><strong>Debt Agreement:</strong> ' . $nl($d['debt_agreement']) . '</div>';
        }
        if (($d['deployment_agreement'] ?? 'Wala') !== 'Wala') {
            $additionalRows .= '<div style="font-size:9pt; color:#1A1A1A; line-height:1.4; margin-bottom:6px;"><strong>Deployment Cost Agreement:</strong> ' . $nl($d['deployment_agreement']) . '</div>';
        }
        if (($d['other_agreements'] ?? 'Wala') !== 'Wala') {
            $additionalRows .= '<div style="font-size:9pt; color:#1A1A1A; line-height:1.4; margin-bottom:6px;"><strong>Other Agreements:</strong> ' . $nl($d['other_agreements']) . '</div>';
        }
        if (($d['termination_conditions'] ?? 'Ayon sa RA 10361') !== 'Ayon sa RA 10361') {
            $additionalRows .= '<div style="font-size:9pt; color:#1A1A1A; line-height:1.4; margin-bottom:6px;"><strong>Additional Termination Conditions:</strong> ' . $nl($d['termination_conditions']) . '</div>';
        }

        $additionalTermsHtml = '
  <div style="border:1px solid #E0D5C8; padding:12px; margin-top:10px;">
    <div style="font-size:10pt; font-weight:bold; color:#1A1A1A; margin-bottom:6px;">ADDITIONAL TERMS</div>
    ' . $additionalRows . '
  </div>';
    }

    $certRow = static function (string $label, string $value, bool $pending): string {
        if ($pending) {
            return '<div style="margin-bottom:4px;"><span style="color:#F59E0B; font-weight:bold;">&#9679;</span> ' . $label . ': <span style="color:#F59E0B; font-weight:bold;">Pending</span></div>';
        }

        return '<div style="margin-bottom:4px;"><span style="color:#2D7D46; font-weight:bold;">&#10003;</span> ' . $label . ': ' . $value . '</div>';
    };

    $signatureBlock = static function (string $roleLabel, string $name, string $signedDate, string $filCaption, int $applicationId): string {
        $isSigned = $signedDate !== 'Pending';
        $sigName = $isSigned
            ? '<div style="font-size:18pt; font-style:italic; font-weight:bold; color:#1A1A1A; padding-top:8px;">' . $name . '</div>'
            : '';
        $confirmBox = $isSigned
            ? '<div style="font-size:9pt; font-weight:bold; color:#1A1A1A; margin-bottom:2px;">Digitally signed via CareLink</div>'
                . '<div style="font-size:9pt; color:#6B6B6B; margin-bottom:2px;">' . $signedDate . '</div>'
                . '<div style="font-size:9pt; color:#6B6B6B; margin-bottom:2px;">Identity verified by password re-entry</div>'
                . '<div style="font-size:9pt; color:#6B6B6B;">Ref: APP-' . $applicationId . '</div>'
            : '<div style="font-size:9pt; font-weight:bold; color:#F59E0B;">Pending signature</div>';

        return '
      <div style="font-size:8pt; font-weight:bold; color:#C8733A; letter-spacing:1px; margin-bottom:6px;">' . $roleLabel . '</div>
      <div style="height:46px; border-bottom:1px solid #1A1A1A; margin-bottom:6px;">' . $sigName . '</div>
      <div style="font-size:11pt; font-weight:bold; color:#1A1A1A;">' . $name . '</div>
      <div style="font-size:9pt; color:#6B6B6B; margin-bottom:10px;">(' . $filCaption . ')</div>
      <div style="background:#F5F5F5; border:1px solid #E0D5C8; padding:8px; margin-bottom:14px;">' . $confirmBox . '</div>
      <div style="font-size:9pt; color:#6B6B6B;">(Saksi &mdash; pirmahan ng personal)</div>
      <div style="height:28px; border-bottom:1px solid #1A1A1A; margin-top:14px;"></div>
    ';
    };

    $smallHeader = '
  <table style="width:100%; border-collapse:collapse; margin-bottom:14px;">
    <tr>
      <td style="vertical-align:middle; border-bottom:1px solid #E0D5C8; padding-bottom:8px; width:50%;">'
            . $logoImgSmall . ' <span style="font-size:10pt; font-weight:bold; color:#8B4513; vertical-align:middle;">CareLink</span>
      </td>
      <td style="text-align:right; vertical-align:middle; border-bottom:1px solid #E0D5C8; padding-bottom:8px; width:50%; font-size:9pt; color:#6B6B6B;">Contract ID: ' . $contractId . '</td>
    </tr>
  </table>
';

    // ---- PAGE 1 ----
    $page1 = '
  <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
    <tr>
      <td style="width:42%; vertical-align:middle; padding:0;">
        <table style="border-collapse:collapse;"><tr>
          <td style="vertical-align:middle; padding-right:10px;">' . $logoImgLarge . '</td>
          <td style="vertical-align:middle;">
            <div style="font-size:18pt; font-weight:bold; color:#8B4513;">CareLink</div>
            <div style="font-size:9pt; color:#6B6B6B; line-height:1.3;">Intelligent Domestic Helper</div>
            <div style="font-size:9pt; color:#6B6B6B; line-height:1.3;">Recruitment Platform</div>
          </td>
        </tr></table>
      </td>
      <td style="width:58%; vertical-align:top;">
        <div style="background:#FDF3E7; border:1px solid #E0D5C8; border-radius:6px; padding:10px 12px;">
          <div style="font-size:9pt; font-weight:bold; color:#8B4513; margin-bottom:5px;">CARELINK VERIFICATION</div>
          <div style="font-size:9pt; color:#1A1A1A; line-height:1.55;">
            <span style="color:#2D7D46; font-weight:bold;">&#10003;</span> Employer Identity Verified<br/>
            <span style="color:#2D7D46; font-weight:bold;">&#10003;</span> Helper Identity Verified<br/>
            <span style="color:#2D7D46; font-weight:bold;">&#10003;</span> Contract Generated Through CareLink<br/>
            <span style="color:#2D7D46; font-weight:bold;">&#10003;</span> Digital Agreement Recorded<br/>
            <span style="color:#2D7D46; font-weight:bold;">&#10003;</span> Compliant with RA 10361
          </div>
        </div>
      </td>
    </tr>
  </table>

  <div style="text-align:center; padding:10px 0 6px 0;">
    <div style="font-size:24pt; font-weight:bold; color:#1A1A1A; letter-spacing:3px;">DOMESTIC HELPER</div>
    <div style="font-size:24pt; font-weight:bold; color:#1A1A1A; letter-spacing:3px;">EMPLOYMENT AGREEMENT</div>
    <div style="font-size:11pt; color:#C8733A; font-style:italic; margin-top:4px;">In Partnership with PESO Ormoc City</div>
  </div>

  <table style="width:100%; border-collapse:collapse; border-top:1px solid #E0D5C8; border-bottom:1px solid #E0D5C8; margin-bottom:8px;">
    <tr>
      <td style="padding:6px 0; font-size:9pt; color:#1A1A1A; width:38%;">Contract ID: <strong>' . $contractId . '</strong></td>
      <td style="padding:6px 0; font-size:9pt; color:#1A1A1A; width:38%;">Date Created: <strong>' . $d['date_created'] . '</strong></td>
      <td style="padding:6px 0; font-size:9pt; text-align:right; width:24%;">
        <span style="background:' . $badgeBg . '; color:#FFFFFF; padding:4px 12px; border-radius:4px; font-weight:bold; font-size:9pt;">' . $badgeLabel . '</span>
      </td>
    </tr>
  </table>

  ' . $sectionHeader('EMPLOYMENT SUMMARY') . '
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="width:50%; border:1px solid #E0D5C8; padding:14px; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; letter-spacing:1px; margin-bottom:6px;">EMPLOYER</div>
        <div style="font-size:14pt; font-weight:bold; color:#1A1A1A; margin-bottom:4px;">' . $d['employer_name'] . '</div>
        <div style="font-size:10pt; color:#6B6B6B; margin-bottom:2px;">Tel: ' . $d['employer_phone'] . '</div>
        <div style="font-size:10pt; color:#6B6B6B;">' . $d['employer_address'] . '</div>
      </td>
      <td style="width:50%; border:1px solid #E0D5C8; padding:14px; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; letter-spacing:1px; margin-bottom:6px;">HELPER</div>
        <div style="font-size:14pt; font-weight:bold; color:#1A1A1A; margin-bottom:4px;">' . $d['helper_name'] . '</div>
        <div style="font-size:10pt; color:#6B6B6B; margin-bottom:2px;">Tel: ' . $d['helper_phone'] . '</div>
        <div style="font-size:10pt; color:#6B6B6B; margin-bottom:2px;">' . $d['helper_address'] . '</div>
        <div style="font-size:10pt; color:#6B6B6B;">' . $d['helper_civil'] . ' &middot; Age: ' . $d['helper_age'] . '</div>
      </td>
    </tr>
  </table>

  <table style="width:100%; border-collapse:collapse; margin-top:8px;">
    <tr>
      <td style="border:1px solid #E0D5C8; padding:10px; width:25%; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; margin-bottom:4px;">POSITION</div>
        <div style="font-size:11pt; font-weight:bold; color:#1A1A1A;">' . $d['job_title'] . '</div>
      </td>
      <td style="border:1px solid #E0D5C8; padding:10px; width:25%; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; margin-bottom:4px;">WORK ARRANGEMENT</div>
        <div style="font-size:11pt; font-weight:bold; color:#1A1A1A;">' . $d['work_arrangement'] . '</div>
      </td>
      <td style="border:1px solid #E0D5C8; padding:10px; width:25%; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; margin-bottom:4px;">START DATE</div>
        <div style="font-size:11pt; font-weight:bold; color:#1A1A1A;">' . $d['start_date'] . '</div>
      </td>
      <td style="border:1px solid #E0D5C8; padding:10px; width:25%; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; margin-bottom:4px;">END DATE</div>
        <div style="font-size:11pt; font-weight:bold; color:#1A1A1A;">' . $d['end_date_display'] . '</div>
      </td>
    </tr>
    <tr>
      <td style="border:1px solid #E0D5C8; padding:10px; width:25%; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; margin-bottom:4px;">WORK LOCATION</div>
        <div style="font-size:11pt; font-weight:bold; color:#1A1A1A;">' . $d['place_of_work'] . '</div>
      </td>
      <td style="border:1px solid #E0D5C8; padding:10px; width:25%; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; margin-bottom:4px;">WORK SCHEDULE</div>
        <div style="font-size:11pt; font-weight:bold; color:#1A1A1A;">' . $d['work_schedule'] . '</div>
      </td>
      <td style="border:1px solid #E0D5C8; padding:10px; width:25%; vertical-align:top;">
        <div style="font-size:8pt; font-weight:bold; color:#C8733A; margin-bottom:4px;">REST DAY</div>
        <div style="font-size:11pt; font-weight:bold; color:#1A1A1A;">' . $d['rest_days'] . '</div>
      </td>
      <td style="border:1px solid #E0D5C8; padding:10px; width:25%; vertical-align:top;">&nbsp;</td>
    </tr>
  </table>

  <table style="width:100%; border-collapse:collapse; margin-top:4px;">
    <tr>
      <td style="width:50%; vertical-align:top; padding-right:8px;">
        ' . $sectionHeader('COMPENSATION &amp; BENEFITS') . '
        <div style="padding:0 2px;">
          <div style="font-size:8pt; color:#6B6B6B; text-transform:uppercase; letter-spacing:1px;">Monthly Salary</div>
          <div style="font-size:24pt; font-weight:bold; color:#1A1A1A; margin:2px 0;">' . $d['salary_big'] . '</div>
          <div style="font-size:9pt; color:#6B6B6B; margin-bottom:8px;">Cash Payment &middot; ' . $d['salary_period_label'] . '</div>

          <div style="font-size:8pt; color:#6B6B6B; text-transform:uppercase; letter-spacing:1px;">Payment Schedule</div>
          <div style="font-size:10pt; color:#1A1A1A; margin-bottom:8px;">' . $d['payment_schedule'] . '</div>

          <div style="font-size:8pt; color:#6B6B6B; text-transform:uppercase; letter-spacing:1px;">Mandatory Benefits</div>
          ' . $benefitsHtml . '
          ' . $otherBenefitsHtml . '
        </div>
      </td>
      <td style="width:50%; vertical-align:top; padding-left:8px;">
        ' . $sectionHeader('PRIMARY RESPONSIBILITIES') . '
        <div style="padding:0 2px;">' . $dutiesHtml . '</div>
      </td>
    </tr>
  </table>

  ' . $sectionHeader('KEY TERMS AT A GLANCE') . '
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="width:20%; vertical-align:top; padding:0 6px; text-align:center;">
        <div style="font-size:9pt; font-weight:bold; color:#1A1A1A; margin-bottom:3px;">Confidentiality</div>
        <div style="font-size:8pt; color:#6B6B6B; line-height:1.4;">Both parties agree to keep personal information private and secure.</div>
      </td>
      <td style="width:20%; vertical-align:top; padding:0 6px; text-align:center;">
        <div style="font-size:9pt; font-weight:bold; color:#1A1A1A; margin-bottom:3px;">Leave Entitlement</div>
        <div style="font-size:8pt; color:#6B6B6B; line-height:1.4;">' . $d['vacation_leave_days'] . ' days vacation leave and ' . $d['sick_leave_days'] . ' days sick leave per year.</div>
      </td>
      <td style="width:20%; vertical-align:top; padding:0 6px; text-align:center;">
        <div style="font-size:9pt; font-weight:bold; color:#1A1A1A; margin-bottom:3px;">Termination</div>
        <div style="font-size:8pt; color:#6B6B6B; line-height:1.4;">Either party may terminate this agreement with proper notice.</div>
      </td>
      <td style="width:20%; vertical-align:top; padding:0 6px; text-align:center;">
        <div style="font-size:9pt; font-weight:bold; color:#1A1A1A; margin-bottom:3px;">Governing Law</div>
        <div style="font-size:8pt; color:#6B6B6B; line-height:1.4;">This agreement follows RA 10361 (Batas Kasambahay) and other applicable laws.</div>
      </td>
      <td style="width:20%; vertical-align:top; padding:0 6px; text-align:center;">
        <div style="font-size:9pt; font-weight:bold; color:#1A1A1A; margin-bottom:3px;">Dispute Resolution</div>
        <div style="font-size:8pt; color:#6B6B6B; line-height:1.4;">Any dispute shall be settled amicably through Barangay / DOLE procedures.</div>
      </td>
    </tr>
  </table>

  <div style="text-align:center; font-style:italic; font-size:9pt; color:#6B6B6B; margin-top:10px; line-height:1.5;">
    This contract is legally binding once signed by both parties.<br/>
    All information provided is true and correct to the best of our knowledge.
  </div>
';

    // ---- PAGE 2 ----
    $page2 = '
  <div style="page-break-before: always;">
  ' . $smallHeader . '

  <div style="font-size:14pt; font-weight:bold; color:#1A1A1A; border-bottom:2px solid #E0D5C8; padding-bottom:8px; margin-bottom:14px;">TERMS AND CONDITIONS</div>

  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="width:50%; vertical-align:top; padding-right:14px;">
        ' . $termItem(1, 'Place of Work', 'The helper shall work at the employer&#39;s residence located at ' . $d['place_of_work'] . '.') . '
        ' . $termItem(2, 'Job Title', 'The helper shall be employed as ' . $d['job_title'] . '.') . '
        ' . $termItem(3, 'Duties and Responsibilities', 'The helper shall perform the duties as listed in Page 1 of this agreement and other reasonable tasks related to the household.') . '
        ' . $termItem(4, 'Working Hours', 'The regular working hours shall be ' . $d['work_hours'] . '. Overtime work must be agreed upon and paid accordingly.') . '
        ' . $termItem(5, 'Rest Day', 'The helper shall have at least one (1) rest day every week, which is ' . $d['rest_days'] . '.') . '
        ' . $termItem(6, 'Salary', 'The employer shall pay the helper a salary of ' . $d['salary_big'] . ' ' . $salaryPeriodAdverb . ', payable ' . $d['payment_schedule'] . '.') . '
      </td>
      <td style="width:50%; vertical-align:top; padding-left:14px;">
        ' . $termItem(7, 'Benefits', 'The employer shall shoulder the following mandatory benefits:<br/>' . $benefitsListSmall) . '
        ' . $termItem(8, 'Leaves', 'The helper is entitled to ' . $d['vacation_leave_days'] . ' days vacation leave and ' . $d['sick_leave_days'] . ' days sick leave per year.') . '
        ' . $termItem(9, 'Meals', $mealsText) . '
        ' . $termItem(10, 'Confidentiality', 'The helper shall keep all information about the employer and the family confidential.') . '
        ' . $termItem(11, 'Expenses', 'Any work-related expenses during deployment shall be borne by the employer.') . '
        ' . $termItem(12, 'Applicable Law', 'This agreement shall be governed by the provisions of RA 10361 (Batas Kasambahay) and other relevant laws.') . '
      </td>
    </tr>
  </table>

  <div style="background:#FDF3E7; border-left:4px solid #C8733A; padding:12px; margin-top:6px;">
    <div style="font-size:10pt; font-weight:bold; color:#8B4513; margin-bottom:4px;">&#9888; NOTICE FOR TERMINATION</div>
    <div style="font-size:9pt; color:#1A1A1A; line-height:1.4;">Either party may terminate this agreement with at least 30 days written notice or payment in lieu thereof (' . $d['termination_pay'] . '), as provided under RA 10361.</div>
  </div>

  <div style="border:1px solid #E0D5C8; padding:12px; margin-top:10px;">
    <div style="font-size:10pt; font-weight:bold; color:#1A1A1A; margin-bottom:4px;">&#9878; DISPUTE RESOLUTION</div>
    <div style="font-size:9pt; color:#6B6B6B; line-height:1.4;">Any disagreement or dispute arising from this agreement shall be resolved amicably. If unresolved, either party may seek assistance from the Barangay or DOLE-Regional/Provincial Field Office having jurisdiction.</div>
  </div>
  ' . $additionalTermsHtml . '
  </div>
';

    // ---- PAGE 3 ----
    $page3 = '
  <div style="page-break-before: always;">
  ' . $smallHeader . '

  ' . $sectionHeader('ACKNOWLEDGEMENT &amp; SIGNATURES') . '

  <div style="font-size:9pt; font-style:italic; color:#6B6B6B; line-height:1.5; margin-bottom:14px;">
    By signing below, both parties acknowledge that they have read, understood, and voluntarily agree to the terms and conditions of this Domestic Helper Employment Agreement.
  </div>

  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="width:50%; vertical-align:top; padding-right:14px;">' . $signatureBlock('EMPLOYER', $d['employer_name'], $d['employer_signed_date'], 'Lagda ng Pinaglilingkuran', (int) $d['application_id']) . '</td>
      <td style="width:50%; vertical-align:top; padding-left:14px;">' . $signatureBlock('HELPER', $d['helper_name'], $d['helper_signed_date'], 'Lagda ng Kasambahay', (int) $d['application_id']) . '</td>
    </tr>
  </table>

  <div style="background:#FDF3E7; border:1px solid #C8733A; border-radius:6px; padding:16px; margin-top:16px;">
    <table style="width:100%; border-collapse:collapse;">
      <tr>
        <td style="width:68%; vertical-align:top; padding-right:14px;">
          <div style="font-size:10pt; font-weight:bold; color:#8B4513; margin-bottom:6px;">DIGITAL SIGNATURE CERTIFICATION</div>
          <div style="font-size:9pt; color:#6B6B6B; line-height:1.4; margin-bottom:8px;">This contract was generated and secured electronically by CareLink in compliance with the Electronic Commerce Act of the Philippines (RA 8792).</div>
          <div style="font-size:9pt; line-height:1.7;">
            ' . $certRow('Employer confirmed', $d['employer_signed_date'], $d['employer_signed_date'] === 'Pending') . '
            ' . $certRow('Helper confirmed', $d['helper_signed_date'], $d['helper_signed_date'] === 'Pending') . '
            <div style="margin-bottom:4px;"><span style="color:#2D7D46; font-weight:bold;">&#10003;</span> Document ID: ' . $contractId . '</div>
            <div><span style="color:#2D7D46; font-weight:bold;">&#10003;</span> Verification: Both parties authenticated using registered account credentials (PASSWORD_BCRYPT).</div>
          </div>
        </td>
        <td style="width:32%; vertical-align:top; text-align:center;">
          <table style="width:90px; height:90px; margin:0 auto; border:1px dashed #C8733A; border-collapse:collapse;">
            <tr><td style="text-align:center; vertical-align:middle; font-size:7pt; color:#C8733A; line-height:1.4;">Scan to<br/>verify</td></tr>
          </table>
          <div style="font-size:8pt; color:#1A1A1A; margin-top:8px;">Verify this contract</div>
          <div style="font-size:8pt; color:#C8733A; word-wrap:break-word;">' . $d['verify_url'] . '</div>
        </td>
      </tr>
    </table>
  </div>

  <table style="width:100%; border-collapse:collapse; margin-top:18px;">
    <tr>
      <td style="background:#2C1810; padding:16px 22px; vertical-align:middle; width:60%;">
        <div style="font-size:11pt; font-weight:bold; color:#FFFFFF; margin-bottom:4px;">Secure. Verified. Trusted.</div>
        <div style="font-size:9pt; color:#C4A882;">CareLink is committed to safe and fair employment.</div>
      </td>
      <td style="background:#2C1810; padding:16px 22px; vertical-align:middle; text-align:right; width:40%;">
        <div style="font-size:10pt; font-weight:bold; color:#FFFFFF; margin-bottom:4px;">Thank you for using CareLink.</div>
        <div style="font-size:9pt; color:#C4A882;">Building safer homes. Building better futures.</div>
      </td>
    </tr>
  </table>
  </div>
';

    return '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { margin: 1.3cm 1.6cm; }
    body { font-family: Arial, "DejaVu Sans", sans-serif; font-size: 10pt; line-height: 1.4; color: #1A1A1A; }
    table { border-collapse: collapse; }
  </style>
</head>
<body>' . $page1 . $page2 . $page3 . '
</body>
</html>';
}
