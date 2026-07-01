<?php
/**
 * Core employment contract PDF generation (shared by generate_contract.php and hire_helper.php).
 *
 * @return array{ok:bool, application_id?:int, job_post_id?:int, pdf_url?:string, pdf_file_path?:string, template_version?:string, pdf_binary?:string}
 */

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * @throws Exception
 */
function carelink_contract_upsert_row(
    mysqli $conn,
    int $application_id,
    int $job_post_id,
    int $employer_id,
    int $helper_id,
    string $relativePath,
    string $templateVer,
    ?string $employmentStart = null,
    ?string $employmentEnd = null,
    ?string $termsNotes = null,
    ?string $contractDuration = null,
    ?float $confirmedSalary = null,
    ?string $workHours = null,
    ?string $restDays = null,
    ?int $vacationLeaveDays = null,
    ?int $sickLeaveDays = null,
    ?string $specialConditions = null,
    ?string $overtimeRate = null,
    ?string $paymentSchedule = null,
    ?string $otherBenefits = null,
    ?string $debtAgreement = null,
    ?float $debtAmount = null,
    ?string $deploymentAgreement = null,
    ?string $terminationConditions = null
): void {
    $ins = $conn->prepare("
        INSERT INTO contracts (
            application_id, job_post_id, employer_id, helper_id,
            pdf_file_path, template_version,
            employment_start_date, employment_end_date, terms_notes,
            contract_duration, confirmed_salary, work_hours, rest_days,
            vacation_leave_days, sick_leave_days, special_conditions,
            overtime_rate, payment_schedule, other_benefits, debt_agreement,
            debt_amount, deployment_agreement, termination_conditions,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            pdf_file_path = VALUES(pdf_file_path),
            template_version = VALUES(template_version),
            job_post_id = VALUES(job_post_id),
            employer_id = VALUES(employer_id),
            helper_id = VALUES(helper_id),
            employment_start_date = VALUES(employment_start_date),
            employment_end_date = VALUES(employment_end_date),
            terms_notes = VALUES(terms_notes),
            contract_duration = VALUES(contract_duration),
            confirmed_salary = VALUES(confirmed_salary),
            work_hours = VALUES(work_hours),
            rest_days = VALUES(rest_days),
            vacation_leave_days = VALUES(vacation_leave_days),
            sick_leave_days = VALUES(sick_leave_days),
            special_conditions = VALUES(special_conditions),
            overtime_rate = VALUES(overtime_rate),
            payment_schedule = VALUES(payment_schedule),
            other_benefits = VALUES(other_benefits),
            debt_agreement = VALUES(debt_agreement),
            debt_amount = VALUES(debt_amount),
            deployment_agreement = VALUES(deployment_agreement),
            termination_conditions = VALUES(termination_conditions),
            created_at = NOW()
    ");
    if (!$ins) {
        throw new Exception('Failed to prepare insert: ' . $conn->error);
    }
    $ins->bind_param(
        'iiiissssssdssiisssssdss',
        $application_id,
        $job_post_id,
        $employer_id,
        $helper_id,
        $relativePath,
        $templateVer,
        $employmentStart,
        $employmentEnd,
        $termsNotes,
        $contractDuration,
        $confirmedSalary,
        $workHours,
        $restDays,
        $vacationLeaveDays,
        $sickLeaveDays,
        $specialConditions,
        $overtimeRate,
        $paymentSchedule,
        $otherBenefits,
        $debtAgreement,
        $debtAmount,
        $deploymentAgreement,
        $terminationConditions
    );
    if (!$ins->execute()) {
        $err = $ins->error;
        $ins->close();
        throw new Exception('Failed to save contract record: ' . $err);
    }
    $ins->close();
}

/**
 * Write PDF bytes to uploads/contracts/{filename}. Call after DB commit when using skip_persist pre-hire flow.
 *
 * @throws Exception
 */
function carelink_contract_write_pdf_file(string $relativePath, string $pdfBinary): void
{
    $fileName = basename($relativePath);
    if ($fileName === '' || $fileName === '.' || $fileName === '..') {
        throw new Exception('Invalid contract file path');
    }
    $uploadDir = dirname(__DIR__) . '/uploads/contracts/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
            throw new Exception('Cannot create uploads/contracts directory');
        }
    }
    $fullPath = $uploadDir . $fileName;
    if (file_put_contents($fullPath, $pdfBinary) === false) {
        throw new Exception('Failed to write PDF file');
    }
}

/**
 * @param array{application_status_required?:'accepted'|'hireable'|'contract_ready'|'editable',skip_persist?:bool,contract_end_date?:string,contract_start_date?:string,contract_terms_notes?:string} $opts
 *        hireable = can start contract (not contract_pending, hired, Accepted, Rejected, Withdrawn)
 *        contract_ready = PDF allowed for contract_pending, hired, or legacy Accepted
 *        accepted = legacy alias: same as contract_ready
 *        editable = contract can still be edited/regenerated (contract_pending only, before both signatures finalize)
 *        skip_persist = build PDF only (no DB row, no file) — use before committing hire
 * @throws Exception on hard failures (caller may catch)
 */
function carelink_generate_employment_contract(mysqli $conn, int $application_id, int $employer_id, int $helper_id, array $opts = []): array
{
    $statusMode = isset($opts['application_status_required']) ? (string) $opts['application_status_required'] : 'contract_ready';
    $skipPersist = !empty($opts['skip_persist']);
    $sql = "
        SELECT
            ja.application_id,
            ja.job_post_id,
            ja.helper_id,
            ja.status AS application_status,
            jp.parent_id,
            jp.title AS job_title,
            jp.description,
            jp.custom_skills,
            jp.days_off,
            jp.salary_offered,
            jp.salary_period,
            jp.start_date,
            jp.benefits,
            jp.employment_type,
            jp.work_schedule,
            jp.provides_sss,
            jp.provides_philhealth,
            jp.provides_pagibig,
            jp.provides_meals,
            jp.provides_accommodation,
            c.employment_start_date,
            c.employment_end_date,
            c.terms_notes,
            c.contract_duration,
            c.confirmed_salary,
            c.work_hours,
            c.rest_days,
            c.vacation_leave_days,
            c.sick_leave_days,
            c.special_conditions,
            c.overtime_rate,
            c.payment_schedule,
            c.other_benefits,
            c.debt_agreement,
            c.debt_amount,
            c.deployment_agreement,
            c.termination_conditions,
            ja.employer_signed_at,
            ja.helper_signed_at
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        LEFT JOIN contracts c ON c.application_id = ja.application_id
        WHERE ja.application_id = ?
          AND ja.helper_id = ?
          AND jp.parent_id = ?
        LIMIT 1
    ";
    $st = $conn->prepare($sql);
    if (!$st) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }
    $st->bind_param('iii', $application_id, $helper_id, $employer_id);
    $st->execute();
    $res = $st->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    $st->close();

    if (!$row) {
        throw new Exception('Application not found or does not match employer/helper');
    }

    $status = isset($row['application_status']) ? trim((string) $row['application_status']) : '';
    if ($statusMode === 'hireable') {
        $blocked = ['Accepted', 'Rejected', 'Withdrawn', 'contract_pending', 'hired', 'auto_rejected'];
        if (in_array($status, $blocked, true)) {
            if ($status === 'hired' || $status === 'Accepted') {
                throw new Exception('This helper is already hired for this application.');
            }
            if ($status === 'contract_pending') {
                throw new Exception('A contract is already pending signatures for this application.');
            }
            throw new Exception('Cannot hire: application status is ' . $status);
        }
    } elseif ($statusMode === 'accepted' || $statusMode === 'contract_ready') {
        $allowed = ['contract_pending', 'hired', 'Accepted'];
        if (!in_array($status, $allowed, true)) {
            throw new Exception(
                'Contract PDF is only available once the application is in contract review or hired. Current status: '
                . ($status !== '' ? $status : '(empty)')
            );
        }
    } elseif ($statusMode === 'editable') {
        if ($status !== 'contract_pending') {
            throw new Exception(
                'This contract can no longer be edited (application status: '
                . ($status !== '' ? $status : '(empty)') . ').'
            );
        }
    } else {
        throw new Exception('Invalid application_status_required');
    }

    $job_post_id = (int) $row['job_post_id'];

    $pu = $conn->prepare('SELECT user_id, first_name, middle_name, last_name FROM users WHERE user_id = ? AND user_type = ? LIMIT 1');
    $ptype = 'parent';
    $pu->bind_param('is', $employer_id, $ptype);
    $pu->execute();
    $employerUser = $pu->get_result()->fetch_assoc();
    $pu->close();
    if (!$employerUser) {
        throw new Exception('Employer user not found');
    }

    $pp = null;
    $pprof = $conn->prepare('SELECT * FROM parent_profiles WHERE user_id = ? LIMIT 1');
    $pprof->bind_param('i', $employer_id);
    $pprof->execute();
    $pp = $pprof->get_result()->fetch_assoc();
    $pprof->close();

    $hu = $conn->prepare('SELECT user_id, first_name, middle_name, last_name FROM users WHERE user_id = ? AND user_type = ? LIMIT 1');
    $htype = 'helper';
    $hu->bind_param('is', $helper_id, $htype);
    $hu->execute();
    $helperUser = $hu->get_result()->fetch_assoc();
    $hu->close();
    if (!$helperUser) {
        throw new Exception('Helper user not found');
    }

    $hp = null;
    $hprof = $conn->prepare('SELECT * FROM helper_profiles WHERE user_id = ? LIMIT 1');
    $hprof->bind_param('i', $helper_id);
    $hprof->execute();
    $hp = $hprof->get_result()->fetch_assoc();
    $hprof->close();

    $employerName = carelink_contract_escape(carelink_contract_full_name($employerUser));
    $helperName   = carelink_contract_escape(carelink_contract_full_name($helperUser));

    $helperCivil = 'N/A';
    if (is_array($hp) && isset($hp['civil_status']) && trim((string) $hp['civil_status']) !== '') {
        $helperCivil = carelink_contract_escape(trim((string) $hp['civil_status']));
    }

    $employerAddr = 'N/A';
    if (is_array($pp)) {
        $employerAddr = carelink_contract_escape(carelink_contract_format_address($pp));
    }

    $helperAddr = 'N/A';
    if (is_array($hp)) {
        $helperAddr = carelink_contract_escape(carelink_contract_format_address($hp));
    }

    $employerPhone = (is_array($pp) && isset($pp['contact_number']) && trim((string) $pp['contact_number']) !== '')
        ? carelink_contract_escape(trim((string) $pp['contact_number']))
        : 'N/A';

    $helperPhone = (is_array($hp) && isset($hp['contact_number']) && trim((string) $hp['contact_number']) !== '')
        ? carelink_contract_escape(trim((string) $hp['contact_number']))
        : 'N/A';

    $employerAddrPhone = $employerAddr . ($employerPhone !== 'N/A' ? ' / Tel: ' . $employerPhone : '');
    $helperAddrPhone = $helperAddr . ($helperPhone !== 'N/A' ? ' / Tel: ' . $helperPhone : '');

    $birth = (is_array($hp) && isset($hp['birth_date'])) ? (string) $hp['birth_date'] : null;
    $helperAgeRaw = carelink_contract_age_from_birth($birth);
    $helperAge = carelink_contract_escape($helperAgeRaw);
    $helperAgeNum = is_numeric($helperAgeRaw) ? (int) $helperAgeRaw : null;
    $isMinor = ($helperAgeNum !== null && $helperAgeNum >= 15 && $helperAgeNum <= 17);

    $jobTitle = carelink_contract_escape(trim((string) ($row['job_title'] ?? 'Kasambahay')));
    $desc = isset($row['description']) ? trim((string) $row['description']) : '';
    $custSk = isset($row['custom_skills']) ? trim((string) $row['custom_skills']) : '';
    $jobDutiesRaw = trim($desc . ($custSk !== '' ? "\nMga kasanayan / tungkulin: " . $custSk : ''));
    $jobDutiesItems = array_map('carelink_contract_escape', carelink_contract_split_duties($jobDutiesRaw));

    $jobPostStartRaw = isset($row['start_date']) ? (string) $row['start_date'] : '';
    $storedStartRaw = isset($row['employment_start_date']) && $row['employment_start_date'] !== null && trim((string) $row['employment_start_date']) !== ''
        ? (string) $row['employment_start_date']
        : '';
    $optStartRaw = isset($opts['contract_start_date']) ? trim((string) $opts['contract_start_date']) : '';
    $effectiveStartRaw = $optStartRaw !== '' ? $optStartRaw : ($storedStartRaw !== '' ? $storedStartRaw : $jobPostStartRaw);
    $startDate = carelink_fmt_date($effectiveStartRaw);

    $storedEndRaw = isset($row['employment_end_date']) && $row['employment_end_date'] !== null && trim((string) $row['employment_end_date']) !== ''
        ? (string) $row['employment_end_date']
        : '';
    $optEndRaw = isset($opts['contract_end_date']) ? trim((string) $opts['contract_end_date']) : '';
    $effectiveEndRaw = $optEndRaw !== '' ? $optEndRaw : $storedEndRaw;
    $endDate = carelink_fmt_date($effectiveEndRaw);

    $storedNotesRaw = isset($row['terms_notes']) ? trim((string) $row['terms_notes']) : '';
    $optNotesRaw = isset($opts['contract_terms_notes']) ? trim((string) $opts['contract_terms_notes']) : '';
    $effectiveNotesRaw = $optNotesRaw !== '' ? $optNotesRaw : $storedNotesRaw;
    $contractNotesEsc = $effectiveNotesRaw !== '' ? carelink_contract_escape($effectiveNotesRaw) : 'N/A';

    // Confirmed salary: prefer opt > contracts row > job_posts fallback
    $optSalary = isset($opts['confirmed_salary']) && $opts['confirmed_salary'] !== null ? floatval($opts['confirmed_salary']) : null;
    $storedSalary = isset($row['confirmed_salary']) && $row['confirmed_salary'] !== null ? floatval($row['confirmed_salary']) : null;
    $effectiveSalary = $optSalary ?? $storedSalary ?? floatval($row['salary_offered'] ?? 0);
    $salaryPeriodRaw = trim((string) ($row['salary_period'] ?? 'Monthly'));
    $salaryAmt = carelink_contract_escape('₱' . number_format($effectiveSalary, 2) . ' / ' . $salaryPeriodRaw . ' (cash)');

    // Work hours
    $optWorkHours = isset($opts['work_hours']) ? trim((string) $opts['work_hours']) : '';
    $workHoursEsc = $optWorkHours !== '' ? carelink_contract_escape($optWorkHours)
        : (isset($row['work_hours']) && $row['work_hours'] !== null && trim((string) $row['work_hours']) !== ''
            ? carelink_contract_escape(trim((string) $row['work_hours'])) : 'N/A');

    // Rest days (from opts or contracts row)
    $optRestDays = isset($opts['rest_days']) ? $opts['rest_days'] : null;
    $storedRestDays = isset($row['rest_days']) ? $row['rest_days'] : null;
    $effectiveRestRaw = $optRestDays !== null ? $optRestDays : $storedRestDays;
    $restDaysStr = 'N/A';
    if ($effectiveRestRaw !== null && $effectiveRestRaw !== '') {
        if (is_array($effectiveRestRaw)) {
            $restDaysStr = implode(', ', array_map('strval', $effectiveRestRaw));
        } elseif (is_string($effectiveRestRaw) && strlen($effectiveRestRaw) > 0 && $effectiveRestRaw[0] === '[') {
            $dec = json_decode($effectiveRestRaw, true);
            $restDaysStr = is_array($dec) ? implode(', ', array_map('strval', $dec)) : $effectiveRestRaw;
        } else {
            $restDaysStr = (string) $effectiveRestRaw;
        }
    }
    $restDaysEsc = carelink_contract_escape($restDaysStr);

    // Leave days
    $optVacation = isset($opts['vacation_leave_days']) ? intval($opts['vacation_leave_days']) : null;
    $vacationDays = $optVacation ?? (isset($row['vacation_leave_days']) ? intval($row['vacation_leave_days']) : 5);
    $optSick = isset($opts['sick_leave_days']) ? intval($opts['sick_leave_days']) : null;
    $sickDays = $optSick ?? (isset($row['sick_leave_days']) ? intval($row['sick_leave_days']) : 5);

    // Contract duration
    $optDuration = isset($opts['contract_duration']) ? trim((string) $opts['contract_duration']) : '';
    $contractDurationEsc = $optDuration !== '' ? carelink_contract_escape($optDuration)
        : (isset($row['contract_duration']) && $row['contract_duration'] !== null && trim((string) $row['contract_duration']) !== ''
            ? carelink_contract_escape(trim((string) $row['contract_duration'])) : 'N/A');

    // BK-1 item 2: "Hanggang sa" — show "Walang takdang panahon" for indefinite contracts
    $endDateDisplay = ($contractDurationEsc === 'Indefinite' || $effectiveEndRaw === '')
        ? 'Walang takdang panahon'
        : $endDate;

    // Special conditions
    $optSpecial = isset($opts['special_conditions']) ? trim((string) $opts['special_conditions']) : '';
    $specialCondEsc = $optSpecial !== '' ? carelink_contract_escape($optSpecial)
        : (isset($row['special_conditions']) && $row['special_conditions'] !== null && trim((string) $row['special_conditions']) !== ''
            ? carelink_contract_escape(trim((string) $row['special_conditions'])) : 'N/A');

    // BK-1 item 7b: overtime rate (opts > stored > default)
    $optOvertimeRate = isset($opts['overtime_rate']) ? trim((string) $opts['overtime_rate']) : '';
    $storedOvertimeRate = isset($row['overtime_rate']) && $row['overtime_rate'] !== null ? trim((string) $row['overtime_rate']) : '';
    $effectiveOvertimeRate = $optOvertimeRate !== '' ? $optOvertimeRate : $storedOvertimeRate;
    if ($effectiveOvertimeRate !== '') {
        $overtimeRateEsc = is_numeric($effectiveOvertimeRate)
            ? carelink_contract_escape('₱' . number_format((float) $effectiveOvertimeRate, 2) . ' kada oras (per hour)')
            : carelink_contract_escape($effectiveOvertimeRate);
    } else {
        $overtimeRateEsc = 'Ayon sa kasunduan ng dalawang panig';
    }

    // BK-1 item 7c: salary payment schedule (opts > stored > default)
    $optPaymentSchedule = isset($opts['payment_schedule']) ? trim((string) $opts['payment_schedule']) : '';
    $storedPaymentSchedule = isset($row['payment_schedule']) && $row['payment_schedule'] !== null ? trim((string) $row['payment_schedule']) : '';
    $effectivePaymentSchedule = $optPaymentSchedule !== '' ? $optPaymentSchedule : $storedPaymentSchedule;
    $paymentScheduleEsc = $effectivePaymentSchedule !== '' ? carelink_contract_escape($effectivePaymentSchedule) : 'Buwanang pagbabayad';

    // BK-1 item 10: other benefits (opts > stored > default "Wala")
    $optOtherBenefits = isset($opts['other_benefits']) ? trim((string) $opts['other_benefits']) : '';
    $storedOtherBenefits = isset($row['other_benefits']) && $row['other_benefits'] !== null ? trim((string) $row['other_benefits']) : '';
    $effectiveOtherBenefits = $optOtherBenefits !== '' ? $optOtherBenefits : $storedOtherBenefits;
    $otherBenefitsEsc = $effectiveOtherBenefits !== '' ? carelink_contract_escape($effectiveOtherBenefits) : 'Wala';

    // BK-1 item 11: debt agreement (opts > stored > default "Wala")
    $optDebtAgreement = isset($opts['debt_agreement']) ? trim((string) $opts['debt_agreement']) : '';
    $storedDebtAgreement = isset($row['debt_agreement']) && $row['debt_agreement'] !== null ? trim((string) $row['debt_agreement']) : '';
    $effectiveDebtAgreement = $optDebtAgreement !== '' ? $optDebtAgreement : $storedDebtAgreement;

    // Numeric debt amount (opts > stored), used only to flag debt bondage risk —
    // an RA 10364 (Anti-Trafficking) safeguard. Not itself a legal cap, just a
    // visible warning when the debt exceeds one month's salary.
    $optDebtAmount = isset($opts['debt_amount']) && $opts['debt_amount'] !== null && $opts['debt_amount'] !== ''
        ? (float) $opts['debt_amount'] : null;
    $storedDebtAmount = isset($row['debt_amount']) && $row['debt_amount'] !== null ? (float) $row['debt_amount'] : null;
    $effectiveDebtAmount = $optDebtAmount ?? $storedDebtAmount;
    $debtMonthlySalary = $salaryPeriodRaw === 'Daily' ? $effectiveSalary * 26 : $effectiveSalary;
    $debtExceedsOneMonth = $effectiveDebtAmount !== null && $debtMonthlySalary > 0 && $effectiveDebtAmount > $debtMonthlySalary;

    $debtAgreementEsc = $effectiveDebtAgreement !== '' ? carelink_contract_escape($effectiveDebtAgreement) : 'Wala';
    if ($effectiveDebtAmount !== null) {
        $debtAgreementEsc .= ' (₱' . number_format($effectiveDebtAmount, 2) . ')';
    }
    if ($debtExceedsOneMonth) {
        $debtAgreementEsc .= ' — ⚠ Exceeds one month\'s salary; helper must explicitly acknowledge before signing.';
    }

    // BK-1 item 12: deployment cost agreement (opts > stored > default "Wala")
    $optDeploymentAgreement = isset($opts['deployment_agreement']) ? trim((string) $opts['deployment_agreement']) : '';
    $storedDeploymentAgreement = isset($row['deployment_agreement']) && $row['deployment_agreement'] !== null ? trim((string) $row['deployment_agreement']) : '';
    $effectiveDeploymentAgreement = $optDeploymentAgreement !== '' ? $optDeploymentAgreement : $storedDeploymentAgreement;
    $deploymentAgreementEsc = $effectiveDeploymentAgreement !== '' ? carelink_contract_escape($effectiveDeploymentAgreement) : 'Wala';

    // BK-1 item 13: termination conditions (opts > stored > default)
    $optTerminationConditions = isset($opts['termination_conditions']) ? trim((string) $opts['termination_conditions']) : '';
    $storedTerminationConditions = isset($row['termination_conditions']) && $row['termination_conditions'] !== null ? trim((string) $row['termination_conditions']) : '';
    $effectiveTerminationConditions = $optTerminationConditions !== '' ? $optTerminationConditions : $storedTerminationConditions;
    $terminationConditionsEsc = $effectiveTerminationConditions !== '' ? carelink_contract_escape($effectiveTerminationConditions) : 'Ayon sa RA 10361';

    // BK-1 item 14: termination pay-in-lieu = one full month's salary, matching
    // the 30-day notice period stated elsewhere in this same contract (see
    // bk1_template.php's termination clause). Previously this used salary/26*15
    // (~15 working days, roughly half a month) — inconsistent with the stated
    // 30-day notice. Daily-rate contracts are converted to a 30-day equivalent.
    $terminationPayMonthly = $salaryPeriodRaw === 'Daily' ? $effectiveSalary * 30 : $effectiveSalary;
    $terminationPayEsc = '₱' . number_format($terminationPayMonthly, 2);

    // BK-1 employer/helper signature dates (from job_applications, when already signed)
    $employerSignedRaw = isset($row['employer_signed_at']) ? (string) $row['employer_signed_at'] : '';
    $employerSignedDate = carelink_fmt_datetime($employerSignedRaw);
    $helperSignedRaw = isset($row['helper_signed_at']) ? (string) $row['helper_signed_at'] : '';
    $helperSignedDate = carelink_fmt_datetime($helperSignedRaw);

    $benefitsNotes = '';
    if (isset($row['benefits']) && trim((string) $row['benefits']) !== '') {
        $benefitsNotes .= trim((string) $row['benefits']);
    }
    if (!empty($row['provides_meals'])) {
        $benefitsNotes .= ($benefitsNotes !== '' ? '; ' : '') . 'Mga pagkain (meals)';
    }
    if (!empty($row['provides_accommodation'])) {
        $benefitsNotes .= ($benefitsNotes !== '' ? '; ' : '') . 'Tuluyan (accommodation)';
    }
    $benefitsNotes = $benefitsNotes !== '' ? carelink_contract_escape($benefitsNotes) : 'N/A';

    // BK-1 item 8: SSS/PhilHealth/Pag-IBIG deductions are mandatory under RA 10361,
    // regardless of the job post's toggles. Pag-IBIG is always mandatory for
    // kasambahay; SSS applies at >= P1,000/mo. PhilHealth has NO salary threshold —
    // RA 11223 (Universal Health Care Act, 2019) made PhilHealth coverage mandatory
    // for all employed persons regardless of salary, superseding the old >= P5,000
    // PhilHealth Circular threshold previously used here.
    $provSss = !empty($row['provides_sss']) || $effectiveSalary >= 1000;
    $provPh = true;
    $provPi = true;

    $signedDate = carelink_contract_escape(date('Y-m-d'));
    $docRef = carelink_contract_escape('APP-' . $application_id . '-' . date('YmdHis'));

    // Brown-theme PDF: logo, status badge, contract ID, and other display-only fields
    // derived from values already computed above (additive — existing $data keys are unchanged).
    $logoPath = dirname(__DIR__) . '/assets/images/carelink_logo.png';
    $logoSrc = is_readable($logoPath)
        ? 'data:image/png;base64,' . base64_encode((string) file_get_contents($logoPath))
        : '';

    $workArrangementMap = ['Stay-in' => 'Stay-in (Live-in)', 'Stay-out' => 'Stay-out (Live-out)', 'Any' => 'Flexible'];
    $workArrangementRaw = trim((string) ($row['employment_type'] ?? 'Any'));
    $workArrangementEsc = carelink_contract_escape($workArrangementMap[$workArrangementRaw] ?? $workArrangementRaw);
    $workScheduleEsc = carelink_contract_escape(trim((string) ($row['work_schedule'] ?? 'N/A')));

    $salaryBigEsc = carelink_contract_escape('₱' . number_format($effectiveSalary, 2));
    $salaryPeriodEsc = carelink_contract_escape($salaryPeriodRaw);

    $contractStatus = ($employerSignedDate !== 'Pending' && $helperSignedDate !== 'Pending') ? 'SIGNED' : 'PENDING';
    $contractIdDisplay = 'CL-' . date('Y') . '-' . $application_id;
    $dateCreated = carelink_fmt_date(date('Y-m-d'));
    $verifyUrl = 'carelink.app/verify/' . $contractIdDisplay;

    // BK-1 item 10: combine job-post benefits (meals/accommodation/etc.) with hire-time other benefits
    $otherBenefitsParts = [];
    if ($benefitsNotes !== 'N/A' && $benefitsNotes !== '') {
        $otherBenefitsParts[] = $benefitsNotes;
    }
    if ($otherBenefitsEsc !== 'Wala' && $otherBenefitsEsc !== '') {
        $otherBenefitsParts[] = $otherBenefitsEsc;
    }
    $otherBenefitsEsc = !empty($otherBenefitsParts) ? implode("\n\n", $otherBenefitsParts) : 'Wala';

    // BK-1 item 15: other agreements = special conditions + free-form notes
    $otherAgreementsParts = [];
    if ($specialCondEsc !== 'N/A' && $specialCondEsc !== '') {
        $otherAgreementsParts[] = $specialCondEsc;
    }
    if ($contractNotesEsc !== 'N/A' && $contractNotesEsc !== '') {
        $otherAgreementsParts[] = $contractNotesEsc;
    }
    $otherAgreementsEsc = !empty($otherAgreementsParts) ? implode("\n\n", $otherAgreementsParts) : 'Wala';

    $data = [
        'doc_ref'                => $docRef,
        'application_id'         => $application_id,
        'employer_name'          => $employerName,
        'employer_addr_phone'    => $employerAddrPhone,
        'place_of_work'          => $employerAddr,
        'helper_name'            => $helperName,
        'helper_civil'           => $helperCivil,
        'helper_age'             => $helperAge,
        'is_minor'               => $isMinor,
        'helper_addr_phone'      => $helperAddrPhone,
        'job_title'              => $jobTitle,
        'job_duties_items'       => $jobDutiesItems,
        'start_date'             => $startDate,
        'end_date_display'       => $endDateDisplay,
        'work_hours'             => $workHoursEsc,
        'rest_days'              => $restDaysEsc,
        'salary_amount'          => $salaryAmt,
        'overtime_rate'          => $overtimeRateEsc,
        'payment_schedule'       => $paymentScheduleEsc,
        'prov_sss'               => $provSss,
        'prov_ph'                => $provPh,
        'prov_pi'                => $provPi,
        'vacation_leave_days'    => $vacationDays,
        'sick_leave_days'        => $sickDays,
        'other_benefits'         => $otherBenefitsEsc,
        'debt_agreement'         => $debtAgreementEsc,
        'deployment_agreement'   => $deploymentAgreementEsc,
        'termination_conditions' => $terminationConditionsEsc,
        'termination_pay'        => $terminationPayEsc,
        'other_agreements'       => $otherAgreementsEsc,
        'employer_signed_date'   => $employerSignedDate,
        'helper_signed_date'     => $helperSignedDate,
        'signed_date'            => $signedDate,
        'logo_src'               => $logoSrc,
        'employer_phone'         => $employerPhone,
        'employer_address'       => $employerAddr,
        'helper_phone'           => $helperPhone,
        'helper_address'         => $helperAddr,
        'work_arrangement'       => $workArrangementEsc,
        'work_schedule'          => $workScheduleEsc,
        'salary_big'             => $salaryBigEsc,
        'salary_period_label'    => $salaryPeriodEsc,
        'contract_status'        => $contractStatus,
        'contract_id_display'    => $contractIdDisplay,
        'date_created'           => $dateCreated,
        'verify_url'             => $verifyUrl,
    ];

    $html = carelink_bk1_build_html($data);

    $options = new Options();
    $options->set('isRemoteEnabled', false);
    $options->set('defaultFont', 'DejaVu Sans');
    $options->set('isHtml5ParserEnabled', true);

    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    // Brown-theme PDF: running "Page X of Y" footer (content-length-independent).
    $canvas = $dompdf->getCanvas();
    $canvas->page_text($canvas->get_width() / 2 - 30, $canvas->get_height() - 28, 'Page {PAGE_NUM} of {PAGE_COUNT}', 'DejaVu Sans', 9, [0.42, 0.42, 0.42]);

    $pdfBinary = $dompdf->output();

    $templateVer = 'BK-1-v1';

    $safeApp = (int) $application_id;
    $fileName = 'contract_app' . $safeApp . '_' . date('Ymd_His') . '.pdf';
    $relativePath = 'contracts/' . $fileName;
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $pdfUrl = $protocol . '://' . $host . '/carelink_api/uploads/' . $relativePath;

    if ($skipPersist) {
        return [
            'ok' => true,
            'application_id' => $application_id,
            'job_post_id' => $job_post_id,
            'pdf_url' => $pdfUrl,
            'pdf_file_path' => $relativePath,
            'template_version' => $templateVer,
            'pdf_binary' => $pdfBinary,
        ];
    }

    $uploadDir = dirname(__DIR__) . '/uploads/contracts/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true) && !is_dir($uploadDir)) {
            throw new Exception('Cannot create uploads/contracts directory');
        }
    }

    $fullPath = $uploadDir . $fileName;
    if (file_put_contents($fullPath, $pdfBinary) === false) {
        throw new Exception('Failed to write PDF file');
    }

    $persistStart = $effectiveStartRaw !== '' ? substr($effectiveStartRaw, 0, 32) : null;
    $persistEnd = $effectiveEndRaw !== '' ? substr($effectiveEndRaw, 0, 32) : null;
    $persistNotes = $effectiveNotesRaw !== '' ? $effectiveNotesRaw : null;
    $persistDuration   = $contractDurationEsc !== 'N/A' ? (isset($opts['contract_duration']) ? $opts['contract_duration'] : (isset($row['contract_duration']) ? $row['contract_duration'] : null)) : null;
    $persistSalary     = $optSalary ?? $storedSalary ?? null;
    $persistWorkHours  = $optWorkHours !== '' ? $optWorkHours : (isset($row['work_hours']) ? $row['work_hours'] : null);
    $persistRestDays   = ($optRestDays !== null && $optRestDays !== '') ? (is_array($optRestDays) ? json_encode($optRestDays) : $optRestDays) : (isset($row['rest_days']) ? $row['rest_days'] : null);
    $persistVacation   = $vacationDays;
    $persistSick       = $sickDays;
    $persistSpecial    = $optSpecial !== '' ? $optSpecial : (isset($row['special_conditions']) ? $row['special_conditions'] : null);
    $persistOvertimeRate    = $optOvertimeRate !== '' ? $optOvertimeRate : ($storedOvertimeRate !== '' ? $storedOvertimeRate : null);
    $persistPaymentSchedule = $optPaymentSchedule !== '' ? $optPaymentSchedule : ($storedPaymentSchedule !== '' ? $storedPaymentSchedule : null);
    $persistOtherBenefits   = $optOtherBenefits !== '' ? $optOtherBenefits : ($storedOtherBenefits !== '' ? $storedOtherBenefits : null);
    $persistDebtAgreement   = $optDebtAgreement !== '' ? $optDebtAgreement : ($storedDebtAgreement !== '' ? $storedDebtAgreement : null);
    $persistDebtAmount      = $effectiveDebtAmount;
    $persistDeploymentAgreement   = $optDeploymentAgreement !== '' ? $optDeploymentAgreement : ($storedDeploymentAgreement !== '' ? $storedDeploymentAgreement : null);
    $persistTerminationConditions = $optTerminationConditions !== '' ? $optTerminationConditions : ($storedTerminationConditions !== '' ? $storedTerminationConditions : null);
    carelink_contract_upsert_row(
        $conn,
        $application_id,
        $job_post_id,
        $employer_id,
        $helper_id,
        $relativePath,
        $templateVer,
        $persistStart,
        $persistEnd,
        $persistNotes,
        $persistDuration,
        $persistSalary,
        $persistWorkHours,
        $persistRestDays,
        $persistVacation,
        $persistSick,
        $persistSpecial,
        $persistOvertimeRate,
        $persistPaymentSchedule,
        $persistOtherBenefits,
        $persistDebtAgreement,
        $persistDebtAmount,
        $persistDeploymentAgreement,
        $persistTerminationConditions
    );

    return [
        'ok' => true,
        'application_id' => $application_id,
        'job_post_id' => $job_post_id,
        'pdf_url' => $pdfUrl,
        'pdf_file_path' => $relativePath,
        'template_version' => $templateVer,
    ];
}
