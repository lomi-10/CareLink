<?php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET, OPTIONS');
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(['success' => false, 'message' => 'GET required']);
    exit();
}

ini_set('display_errors', '0');
error_reporting(0);

include_once '../dbcon.php';
include_once __DIR__ . '/peso_auth.php';
include_once __DIR__ . '/../shared/auth_tokens.php';

function nsrp_decode_string_list(?string $json, string $fieldName): array
{
    if ($json === null || trim($json) === '') {
        return [];
    }

    $values = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($values) || !array_is_list($values)) {
        throw new Exception("Saved helper {$fieldName} data is invalid.");
    }

    $result = [];
    $seen = [];
    foreach ($values as $value) {
        if (!is_string($value)) {
            throw new Exception("Saved helper {$fieldName} data is invalid.");
        }
        $value = trim($value);
        $key = strtolower($value);
        if ($value !== '' && !isset($seen[$key])) {
            $seen[$key] = true;
            $result[] = $value;
        }
    }
    return $result;
}

try {
    $staffId = peso_require_staff($conn);
    if (carelink_authenticated_user_id($conn) !== $staffId) {
        http_response_code(403);
        throw new Exception('A valid signed-in PESO session is required.');
    }

    $userId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    if ($userId <= 0) {
        throw new Exception('A valid helper user ID is required.');
    }

    $profileStmt = $conn->prepare(
        "SELECT u.user_id, u.first_name, u.middle_name, u.last_name, u.email,
                u.phone AS contact_number,
                h.birth_date, h.gender, h.civil_status, h.address, h.landmark, h.barangay, h.municipality, h.province,
                h.education_level, h.experience_years, h.availability_status, h.employment_type, h.work_schedule,
                h.expected_salary, h.salary_period, h.custom_jobs, h.custom_skills,
                h.verification_status
           FROM users u
           INNER JOIN helper_profiles h ON h.user_id = u.user_id
          WHERE u.user_id = ?
          LIMIT 1"
    );
    if (!$profileStmt) {
        throw new Exception('Unable to load the helper profile.');
    }
    $profileStmt->bind_param('i', $userId);
    if (!$profileStmt->execute()) {
        $profileStmt->close();
        throw new Exception('Unable to load the helper profile.');
    }
    $profile = $profileStmt->get_result()->fetch_assoc();
    $profileStmt->close();
    if (!$profile) {
        throw new Exception('Helper profile not found.');
    }
    if ($profile['verification_status'] !== 'Verified') {
        http_response_code(403);
        throw new Exception('Only PESO-verified helpers can export an NSRP draft.');
    }

    $profileIdStmt = $conn->prepare("SELECT profile_id FROM helper_profiles WHERE user_id = ? LIMIT 1");
    if (!$profileIdStmt) {
        throw new Exception('Unable to load the helper profile.');
    }
    $profileIdStmt->bind_param('i', $userId);
    if (!$profileIdStmt->execute()) {
        $profileIdStmt->close();
        throw new Exception('Unable to load the helper profile.');
    }
    $profileId = (int) ($profileIdStmt->get_result()->fetch_assoc()['profile_id'] ?? 0);
    $profileIdStmt->close();
    if ($profileId <= 0) {
        throw new Exception('Helper profile not found.');
    }

    $jobs = [];
    $jobsStmt = $conn->prepare(
        "SELECT rj.job_title, rc.category_name
           FROM helper_jobs hj
           INNER JOIN ref_jobs rj ON rj.job_id = hj.job_id
           INNER JOIN ref_categories rc ON rc.category_id = rj.category_id
          WHERE hj.profile_id = ?
          ORDER BY rc.category_name, rj.job_title"
    );
    if (!$jobsStmt) {
        throw new Exception('Unable to load helper job preferences.');
    }
    $jobsStmt->bind_param('i', $profileId);
    if (!$jobsStmt->execute()) {
        $jobsStmt->close();
        throw new Exception('Unable to load helper job preferences.');
    }
    $jobsResult = $jobsStmt->get_result();
    while ($row = $jobsResult->fetch_assoc()) {
        $jobs[] = [
            'job_title' => (string) $row['job_title'],
            'category_name' => (string) $row['category_name'],
        ];
    }
    $jobsStmt->close();
    foreach (nsrp_decode_string_list($profile['custom_jobs'] ?? null, 'custom jobs') as $customJob) {
        $key = strtolower($customJob);
        $alreadyIncluded = false;
        foreach ($jobs as $job) {
            if (strtolower($job['job_title']) === $key) {
                $alreadyIncluded = true;
                break;
            }
        }
        if (!$alreadyIncluded) {
            $jobs[] = ['job_title' => $customJob, 'category_name' => ''];
        }
    }

    $skills = [];
    $skillsStmt = $conn->prepare(
        "SELECT rs.skill_name
           FROM helper_skills hs
           INNER JOIN ref_skills rs ON rs.skill_id = hs.skill_id
          WHERE hs.profile_id = ?
          ORDER BY rs.skill_name"
    );
    if (!$skillsStmt) {
        throw new Exception('Unable to load helper skills.');
    }
    $skillsStmt->bind_param('i', $profileId);
    if (!$skillsStmt->execute()) {
        $skillsStmt->close();
        throw new Exception('Unable to load helper skills.');
    }
    $skillsResult = $skillsStmt->get_result();
    while ($row = $skillsResult->fetch_assoc()) {
        $skills[] = (string) $row['skill_name'];
    }
    $skillsStmt->close();
    $skills = array_merge(
        $skills,
        nsrp_decode_string_list($profile['custom_skills'] ?? null, 'custom skills')
    );
    $uniqueSkills = [];
    $seenSkills = [];
    foreach ($skills as $skill) {
        $key = strtolower(trim($skill));
        if ($key !== '' && !isset($seenSkills[$key])) {
            $seenSkills[$key] = true;
            $uniqueSkills[] = trim($skill);
        }
    }
    $skills = $uniqueSkills;

    $languages = [];
    $languagesStmt = $conn->prepare(
        "SELECT rl.language_name
           FROM helper_languages hl
           INNER JOIN ref_languages rl ON rl.language_id = hl.language_id
          WHERE hl.profile_id = ?
          ORDER BY rl.language_name"
    );
    if (!$languagesStmt) {
        throw new Exception('Unable to load helper languages.');
    }
    $languagesStmt->bind_param('i', $profileId);
    if (!$languagesStmt->execute()) {
        $languagesStmt->close();
        throw new Exception('Unable to load helper languages.');
    }
    $languagesResult = $languagesStmt->get_result();
    while ($row = $languagesResult->fetch_assoc()) {
        $languages[] = (string) $row['language_name'];
    }
    $languagesStmt->close();

    $history = [];
    $historyStmt = $conn->prepare(
        "SELECT employer_name, employer_contact, position, start_date, end_date, duties, reason_for_leaving, can_contact
           FROM helper_work_history
          WHERE profile_id = ?
          ORDER BY COALESCE(end_date, '9999-12-31') DESC, start_date DESC, history_id DESC"
    );
    if (!$historyStmt) {
        throw new Exception('Unable to load helper work history.');
    }
    $historyStmt->bind_param('i', $profileId);
    if (!$historyStmt->execute()) {
        $historyStmt->close();
        throw new Exception('Unable to load helper work history.');
    }
    $historyResult = $historyStmt->get_result();
    while ($row = $historyResult->fetch_assoc()) {
        $canContact = (int) ($row['can_contact'] ?? 0) === 1;
        $history[] = [
            'employer_name' => (string) ($row['employer_name'] ?? ''),
            'employer_contact' => $canContact ? (string) ($row['employer_contact'] ?? '') : null,
            'position' => (string) ($row['position'] ?? ''),
            'start_date' => $row['start_date'] ?? null,
            'end_date' => $row['end_date'] ?? null,
            'duties' => $row['duties'] ?? null,
            'reason_for_leaving' => $row['reason_for_leaving'] ?? null,
            'can_contact' => $canContact,
        ];
    }
    $historyStmt->close();

    $profileData = [
        'first_name' => (string) $profile['first_name'],
        'middle_name' => $profile['middle_name'] !== null ? (string) $profile['middle_name'] : null,
        'last_name' => (string) $profile['last_name'],
        'email' => (string) $profile['email'],
        'contact_number' => $profile['contact_number'] !== null ? (string) $profile['contact_number'] : null,
        'birth_date' => $profile['birth_date'] ?: null,
        'gender' => $profile['gender'] !== null ? (string) $profile['gender'] : null,
        'civil_status' => $profile['civil_status'] !== null ? (string) $profile['civil_status'] : null,
        'address' => $profile['address'] !== null ? (string) $profile['address'] : null,
        'landmark' => $profile['landmark'] !== null ? (string) $profile['landmark'] : null,
        'barangay' => $profile['barangay'] !== null ? (string) $profile['barangay'] : null,
        'municipality' => $profile['municipality'] !== null ? (string) $profile['municipality'] : null,
        'province' => $profile['province'] !== null ? (string) $profile['province'] : null,
        'education_level' => $profile['education_level'] !== null ? (string) $profile['education_level'] : null,
        'availability_status' => $profile['availability_status'] !== null ? (string) $profile['availability_status'] : null,
        'employment_type' => $profile['employment_type'] !== null ? (string) $profile['employment_type'] : null,
        'work_schedule' => $profile['work_schedule'] !== null ? (string) $profile['work_schedule'] : null,
        'expected_salary' => $profile['expected_salary'] !== null ? (string) $profile['expected_salary'] : null,
        'salary_period' => $profile['salary_period'] !== null ? (string) $profile['salary_period'] : null,
        'experience_years' => $profile['experience_years'] !== null ? (int) $profile['experience_years'] : null,
    ];

    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(
        [
            'success' => true,
            'data' => [
                'profile' => $profileData,
                'jobs' => $jobs,
                'skills' => $skills,
                'languages' => $languages,
                'history' => $history,
            ],
        ],
        JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
    );
} catch (Throwable $e) {
    error_log('NSRP draft export failed: ' . $e->getMessage());
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    if (http_response_code() < 400) {
        http_response_code(400);
    }
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode(
        ['success' => false, 'message' => $e->getMessage()],
        JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE
    );
}
