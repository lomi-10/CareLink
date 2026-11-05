<?php

$baseUrl = rtrim((string) getenv('CARELINK_TEST_API_BASE'), '/');
$parentId = (int) getenv('CARELINK_TEST_PARENT_ID');
$helperId = (int) getenv('CARELINK_TEST_HELPER_ID');
$applicationId = (int) getenv('CARELINK_TEST_APPLICATION_ID');

if ($baseUrl === '' || $parentId < 1 || $helperId < 1 || $applicationId < 1) {
    throw new RuntimeException(
        'Set CARELINK_TEST_API_BASE, CARELINK_TEST_PARENT_ID, CARELINK_TEST_HELPER_ID, and CARELINK_TEST_APPLICATION_ID for a test database.'
    );
}

function request_json(string $path, array $query = [], ?array $body = null): array
{
    global $baseUrl;
    $url = $baseUrl . '/' . ltrim($path, '/');
    if ($query) {
        $url .= '?' . http_build_query($query);
    }

    $options = ['http' => ['timeout' => 20, 'ignore_errors' => true]];
    if ($body !== null) {
        $options['http']['method'] = 'POST';
        $options['http']['header'] = "Content-Type: application/json\r\n";
        $options['http']['content'] = json_encode($body);
    }
    $response = file_get_contents($url, false, stream_context_create($options));
    if ($response === false) {
        throw new RuntimeException('Request failed: ' . $path);
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Endpoint returned invalid JSON: ' . $path);
    }

    return $decoded;
}

function assert_success(array $response, string $label): void
{
    if (($response['success'] ?? false) !== true) {
        throw new RuntimeException($label . ' did not return success: ' . ($response['message'] ?? 'unknown error'));
    }
}

function assert_no_sensitive_keys($value, array $forbidden, string $path): void
{
    if (!is_array($value)) {
        return;
    }

    foreach ($value as $key => $child) {
        if (is_string($key) && in_array(strtolower($key), $forbidden, true)) {
            throw new RuntimeException('Sensitive field "' . $key . '" found in ' . $path);
        }
        assert_no_sensitive_keys($child, $forbidden, $path . '.' . (string) $key);
    }
}

function contains_helper_id($value, int $helperId): bool
{
    if (!is_array($value)) {
        return false;
    }

    if (isset($value['user_id']) && (int) $value['user_id'] === $helperId) {
        return true;
    }
    if (isset($value['helper_id']) && (int) $value['helper_id'] === $helperId) {
        return true;
    }

    foreach ($value as $child) {
        if (contains_helper_id($child, $helperId)) {
            return true;
        }
    }
    return false;
}

$employerFields = [
    'birth_date', 'date_of_birth', 'birthdate', 'age', 'helper_age',
    'civil_status', 'helper_civil_status', 'religion', 'helper_religion',
];
$responses = [
    'helper directory' => request_json('parent/browse.php', ['parent_id' => $parentId]),
    'application list' => request_json('parent/get_job_applications.php', [
        'parent_id' => $parentId,
        'requester_id' => $parentId,
    ]),
    'applicant profile' => request_json('parent/get_applicant_profile.php', [
        'application_id' => $applicationId,
        'helper_id' => $helperId,
        'requester_id' => $parentId,
        'include_file_urls' => 0,
    ]),
    'hire options' => request_json('parent/get_helper_hire_options.php', [
        'parent_id' => $parentId,
        'helper_id' => $helperId,
        'requester_id' => $parentId,
    ]),
];

foreach ($responses as $label => $response) {
    assert_success($response, $label);
    assert_no_sensitive_keys($response, $employerFields, $label);
}

if (!contains_helper_id($responses['helper directory'], $helperId)) {
    throw new RuntimeException('The test helper must be visible in the verified, available helper directory.');
}
if (!contains_helper_id($responses['application list'], $helperId)) {
    throw new RuntimeException('The configured application must appear in the employer application list.');
}

$helperFacingProfile = request_json('helper/get_parent_profile.php', [
    'parent_id' => $parentId,
    'requester_id' => $helperId,
]);
assert_success($helperFacingProfile, 'helper-facing employer profile');
assert_no_sensitive_keys($helperFacingProfile, ['religion'], 'helper-facing employer profile');

$underageBirthDate = (new DateTimeImmutable('today'))->modify('-18 years')->modify('+1 day')->format('Y-m-d');
$signupResponse = request_json('auth/signup.php', [], [
    'first_name' => 'Safeguard',
    'last_name' => 'Test',
    'password' => 'NotARealAccount-123!',
    'user_type' => 'helper',
    'birth_date' => $underageBirthDate,
    'privacy_consent' => true,
    'verification_channel' => 'email',
]);
if (($signupResponse['success'] ?? true) !== false ||
    strpos((string) ($signupResponse['message'] ?? ''), '18 and older') === false) {
    throw new RuntimeException('Server-side signup must reject an under-18 helper before creating an account.');
}

echo "PASS: employer/helper privacy API responses and server-side signup eligibility\n";
