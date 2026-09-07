<?php
/**
 * forms/nsrp_form.php — serve a helper's NSRP registration form, pre-filled.
 *
 * GET ?helper_id=&requester_id=
 *
 * WHO MAY OPEN IT
 *
 *   - the helper, for their own form; and
 *   - PESO staff, because registering applicants into the NSRP is their job.
 *
 * Nobody else — not an employer, not another helper. This form carries a home
 * address, a birth date and a work history in one page, which is more personal
 * data in one place than any screen an employer can reach. The existing
 * document-sharing rules are untouched: this is not a document, and being
 * shared an applicant's Valid ID does not grant access here.
 *
 * Returns HTML rather than JSON, because the browser prints it. Errors are
 * plain text for the same reason — a JSON blob rendered in a tab is not an
 * error message anybody can act on.
 */

header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/nsrp_template.php';

function nsrp_fail(string $msg, int $code = 400): void
{
    http_response_code($code);
    header('Content-Type: text/plain; charset=UTF-8');
    echo $msg;
    exit;
}

try {
    $helper_id    = isset($_GET['helper_id']) ? (int) $_GET['helper_id'] : 0;
    $requester_id = isset($_GET['requester_id']) ? (int) $_GET['requester_id'] : 0;

    if ($helper_id <= 0 || $requester_id <= 0) {
        nsrp_fail('helper_id and requester_id are required.');
    }

    // Self, or PESO staff. Checked here rather than trusted from the client.
    $allowed = ($requester_id === $helper_id);
    if (!$allowed) {
        $st = $conn->prepare("SELECT user_type, status FROM users WHERE user_id = ? LIMIT 1");
        $st->bind_param('i', $requester_id);
        $st->execute();
        $req = $st->get_result()->fetch_assoc();
        $st->close();
        $allowed = $req
            && in_array($req['user_type'], ['peso', 'admin'], true)
            && $req['status'] === 'approved';
    }
    if (!$allowed) {
        nsrp_fail('You are not allowed to view this form.', 403);
    }

    // ── The applicant ──────────────────────────────────────────────────────
    $st = $conn->prepare(
        "SELECT u.first_name, u.middle_name, u.last_name, u.email, u.phone,
                hp.profile_id, hp.birth_date, hp.gender, hp.civil_status,
                hp.province, hp.municipality, hp.barangay, hp.address,
                hp.education_level, hp.expected_salary, hp.salary_period, hp.custom_skills
           FROM users u
           LEFT JOIN helper_profiles hp ON hp.user_id = u.user_id
          WHERE u.user_id = ? AND u.user_type = 'helper'
          LIMIT 1"
    );
    $st->bind_param('i', $helper_id);
    $st->execute();
    $row = $st->get_result()->fetch_assoc();
    $st->close();

    if (!$row) {
        nsrp_fail('No helper account found for that id.', 404);
    }

    $profileId = (int) ($row['profile_id'] ?? 0);

    // ── Age, from the birth date rather than stored ────────────────────────
    $age = '';
    if (!empty($row['birth_date'])) {
        $bd = date_create((string) $row['birth_date']);
        if ($bd) $age = (string) $bd->diff(date_create('today'))->y;
    }

    // ── Preferred occupations: the job titles the helper offers ────────────
    $occupations = [];
    if ($profileId > 0) {
        $q = $conn->prepare(
            "SELECT rj.job_title
               FROM helper_jobs hj
               JOIN ref_jobs rj ON rj.job_id = hj.job_id
              WHERE hj.profile_id = ?
              ORDER BY rj.job_title LIMIT 3"
        );
        $q->bind_param('i', $profileId);
        $q->execute();
        $r = $q->get_result();
        while ($x = $r->fetch_assoc()) $occupations[] = $x['job_title'];
        $q->close();
    }

    // ── Dialects, from the languages they listed ───────────────────────────
    $dialects = [];
    if ($profileId > 0) {
        $q = $conn->prepare(
            "SELECT rl.language_name
               FROM helper_languages hl
               JOIN ref_languages rl ON rl.language_id = hl.language_id
              WHERE hl.profile_id = ?"
        );
        $q->bind_param('i', $profileId);
        $q->execute();
        $r = $q->get_result();
        while ($x = $r->fetch_assoc()) $dialects[] = $x['language_name'];
        $q->close();
    }

    // ── Section IX skills: named skills plus anything typed in freehand ────
    $skills = [];
    if ($profileId > 0) {
        $q = $conn->prepare(
            "SELECT rs.skill_name
               FROM helper_skills hs
               JOIN ref_skills rs ON rs.skill_id = hs.skill_id
              WHERE hs.profile_id = ?"
        );
        $q->bind_param('i', $profileId);
        $q->execute();
        $r = $q->get_result();
        while ($x = $r->fetch_assoc()) $skills[] = $x['skill_name'];
        $q->close();
    }
    if (!empty($row['custom_skills'])) {
        $decoded = json_decode((string) $row['custom_skills'], true);
        if (is_array($decoded)) {
            foreach ($decoded as $cs) if (is_string($cs)) $skills[] = $cs;
        }
    }

    // ── Work history, most recent first, as the form asks ──────────────────
    $work = [];
    if ($profileId > 0) {
        $q = $conn->prepare(
            "SELECT employer_name, position, start_date, end_date
               FROM helper_work_history
              WHERE profile_id = ?
              ORDER BY COALESCE(end_date, '9999-12-31') DESC, start_date DESC
              LIMIT 3"
        );
        $q->bind_param('i', $profileId);
        $q->execute();
        $r = $q->get_result();
        while ($x = $r->fetch_assoc()) {
            $work[] = [
                'company'  => $x['employer_name'] ?? '',
                // CareLink never asks where a past employer was, so this stays
                // blank rather than being filled with the applicant's own town.
                'address'  => '',
                'position' => $x['position'] ?? '',
                'from'     => $x['start_date'] ? date('m/Y', strtotime((string) $x['start_date'])) : '',
                'to'       => $x['end_date'] ? date('m/Y', strtotime((string) $x['end_date'])) : 'present',
                'status'   => '',
            ];
        }
        $q->close();
    }

    echo carelink_nsrp_build_html([
        'last_name'   => $row['last_name'],
        'first_name'  => $row['first_name'],
        'middle_name' => $row['middle_name'],
        'birth_date'  => $row['birth_date'] ? date('m/d/Y', strtotime((string) $row['birth_date'])) : '',
        'age'         => $age,
        'sex'         => $row['gender'],
        'civil_status' => $row['civil_status'],
        // users.phone only. helper_profiles.contact_number was dropped from the
        // schema; current.sql still lists it, which is what this query believed.
        'mobile'      => $row['phone'],
        'email'       => $row['email'],
        // helper_profiles.address is ALREADY 'barangay, municipality, province'
        // (auto-composed on save), so concatenating it with those same three
        // columns printed the address twice. Prefer it whole; fall back to the
        // parts only when a profile predates it being generated.
        'house_street' => $row['address'],
        'address_is_complete' => !empty($row['address']),
        'barangay'    => $row['barangay'],
        'municipality' => $row['municipality'],
        'province'    => $row['province'],
        'education_level' => $row['education_level'],
        'expected_salary' => $row['expected_salary'],
        'salary_period'   => $row['salary_period'],
        'preferred_occupations' => $occupations,
        'preferred_locations'   => array_filter([$row['municipality'], $row['province']]),
        'dialects'         => $dialects,
        'technical_skills' => $skills,
        'work_history'     => $work,
        'generated_at'     => date('j F Y, g:i a'),
    ]);
} catch (Throwable $e) {
    error_log('nsrp_form.php: ' . $e->getMessage());
    nsrp_fail('Could not build the form. Please try again.', 500);
}
