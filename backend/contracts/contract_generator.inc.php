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
    ?string $termsNotes = null
): void {
    $ins = $conn->prepare("
        INSERT INTO contracts (application_id, job_post_id, employer_id, helper_id, pdf_file_path, template_version, employment_start_date, employment_end_date, terms_notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            pdf_file_path = VALUES(pdf_file_path),
            template_version = VALUES(template_version),
            job_post_id = VALUES(job_post_id),
            employer_id = VALUES(employer_id),
            helper_id = VALUES(helper_id),
            employment_start_date = VALUES(employment_start_date),
            employment_end_date = VALUES(employment_end_date),
            terms_notes = VALUES(terms_notes),
            created_at = NOW()
    ");
    if (!$ins) {
        throw new Exception('Failed to prepare insert: ' . $conn->error);
    }
    $ins->bind_param(
        'iiiisssss',
        $application_id,
        $job_post_id,
        $employer_id,
        $helper_id,
        $relativePath,
        $templateVer,
        $employmentStart,
        $employmentEnd,
        $termsNotes
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
 * @param array{application_status_required?:'accepted'|'hireable'|'contract_ready',skip_persist?:bool,contract_end_date?:string,contract_start_date?:string,contract_terms_notes?:string} $opts
 *        hireable = can start contract (not contract_pending, hired, Accepted, Rejected, Withdrawn)
 *        contract_ready = PDF allowed for contract_pending, hired, or legacy Accepted
 *        accepted = legacy alias: same as contract_ready
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
            c.terms_notes
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

    $employerCivil = 'N/A';
    if (is_array($pp) && isset($pp['civil_status']) && trim((string) $pp['civil_status']) !== '') {
        $employerCivil = carelink_contract_escape(trim((string) $pp['civil_status']));
    }

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

    $birth = (is_array($hp) && isset($hp['birth_date'])) ? (string) $hp['birth_date'] : null;
    $helperAge = carelink_contract_escape(carelink_contract_age_from_birth($birth));

    $jobTitle = carelink_contract_escape(trim((string) ($row['job_title'] ?? 'Kasambahay')));
    $desc = isset($row['description']) ? trim((string) $row['description']) : '';
    $custSk = isset($row['custom_skills']) ? trim((string) $row['custom_skills']) : '';
    $jobDuties = trim($desc . ($custSk !== '' ? "\n\nMga kasanayan / tungkulin: " . $custSk : ''));
    if ($jobDuties === '') {
        $jobDuties = 'Mga gawain sa tahanan ayon sa napagkasunduan.';
    }
    $jobDuties = carelink_contract_escape($jobDuties);

    $employmentWork = carelink_contract_escape(
        trim((string) ($row['employment_type'] ?? 'N/A')) . ' / ' . trim((string) ($row['work_schedule'] ?? 'N/A'))
    );

    $jobPostStartRaw = isset($row['start_date']) ? (string) $row['start_date'] : '';
    $storedStartRaw = isset($row['employment_start_date']) && $row['employment_start_date'] !== null && trim((string) $row['employment_start_date']) !== ''
        ? (string) $row['employment_start_date']
        : '';
    $optStartRaw = isset($opts['contract_start_date']) ? trim((string) $opts['contract_start_date']) : '';
    $effectiveStartRaw = $optStartRaw !== '' ? $optStartRaw : ($storedStartRaw !== '' ? $storedStartRaw : $jobPostStartRaw);
    $startDate = $effectiveStartRaw !== '' ? carelink_contract_escape(substr($effectiveStartRaw, 0, 32)) : 'N/A';

    $storedEndRaw = isset($row['employment_end_date']) && $row['employment_end_date'] !== null && trim((string) $row['employment_end_date']) !== ''
        ? (string) $row['employment_end_date']
        : '';
    $optEndRaw = isset($opts['contract_end_date']) ? trim((string) $opts['contract_end_date']) : '';
    $effectiveEndRaw = $optEndRaw !== '' ? $optEndRaw : $storedEndRaw;
    $endDate = $effectiveEndRaw !== '' ? carelink_contract_escape(substr($effectiveEndRaw, 0, 32)) : 'N/A';

    $storedNotesRaw = isset($row['contract_terms_notes']) ? trim((string) $row['contract_terms_notes']) : '';
    $optNotesRaw = isset($opts['contract_terms_notes']) ? trim((string) $opts['contract_terms_notes']) : '';
    $effectiveNotesRaw = $optNotesRaw !== '' ? $optNotesRaw : $storedNotesRaw;
    $contractNotesEsc = $effectiveNotesRaw !== '' ? carelink_contract_escape($effectiveNotesRaw) : 'N/A';

    $salaryAmt = carelink_contract_escape(trim((string) ($row['salary_offered'] ?? '')) . ' (' . trim((string) ($row['salary_period'] ?? '')) . ')');

    $daysOffRaw = isset($row['days_off']) ? $row['days_off'] : '';
    $daysOffStr = 'N/A';
    if ($daysOffRaw !== null && $daysOffRaw !== '') {
        if (is_string($daysOffRaw) && strlen($daysOffRaw) > 0 && ($daysOffRaw[0] === '[' || $daysOffRaw[0] === '{')) {
            $dec = json_decode($daysOffRaw, true);
            if (is_array($dec)) {
                $daysOffStr = implode(', ', array_map('strval', $dec));
            } else {
                $daysOffStr = (string) $daysOffRaw;
            }
        } else {
            $daysOffStr = (string) $daysOffRaw;
        }
    }
    $daysOffStr = carelink_contract_escape($daysOffStr);

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

    $provSss = !empty($row['provides_sss']);
    $provPh = !empty($row['provides_philhealth']);
    $provPi = !empty($row['provides_pagibig']);

    $signedDate = carelink_contract_escape(date('Y-m-d'));
    $docRef = carelink_contract_escape('APP-' . $application_id . '-' . date('YmdHis'));

    $salaryPeriodEsc = carelink_contract_escape(trim((string) ($row['salary_period'] ?? '')));

    $data = [
        'doc_ref' => $docRef,
        'employer_name' => $employerName,
        'employer_civil' => $employerCivil,
        'employer_address' => $employerAddr,
        'employer_phone' => $employerPhone,
        'helper_name' => $helperName,
        'helper_age' => $helperAge,
        'helper_civil' => $helperCivil,
        'helper_address' => $helperAddr,
        'helper_phone' => $helperPhone,
        'job_title' => $jobTitle,
        'job_duties' => $jobDuties,
        'employment_work' => $employmentWork,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'contract_notes' => $contractNotesEsc,
        'salary_amount' => $salaryAmt,
        'salary_period' => $salaryPeriodEsc,
        'days_off' => $daysOffStr,
        'prov_sss' => $provSss,
        'prov_ph' => $provPh,
        'prov_pi' => $provPi,
        'benefits_notes' => $benefitsNotes,
        'signed_date' => $signedDate,
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
        $persistNotes
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
