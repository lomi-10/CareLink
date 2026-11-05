<?php

require_once __DIR__ . '/../shared/helper_safeguards.php';
require_once __DIR__ . '/../shared/job_description_review.php';

function assert_same_value($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message);
    }
}

function assert_invalid_adult_birth_date(?string $birthDate, string $message): void
{
    try {
        carelink_validate_adult_birth_date($birthDate);
    } catch (InvalidArgumentException $e) {
        return;
    }

    throw new RuntimeException($message);
}

$today = new DateTimeImmutable('today');
$adultBirthDate = $today->modify('-18 years')->format('Y-m-d');
$underageBirthDate = $today->modify('-18 years')->modify('+1 day')->format('Y-m-d');

assert_same_value($adultBirthDate, carelink_validate_adult_birth_date($adultBirthDate), 'An 18-year-old helper should pass eligibility.');
assert_invalid_adult_birth_date($underageBirthDate, 'A 17-year-old helper must fail eligibility.');
assert_invalid_adult_birth_date('2000-02-30', 'An invalid birth date must fail eligibility.');
assert_invalid_adult_birth_date($today->modify('+1 day')->format('Y-m-d'), 'A future birth date must fail eligibility.');

$flags = carelink_job_description_review_flags('Applicants aged 20 or older; Muslim only.');
assert_same_value(2, count($flags), 'Age and religion-related wording should both be flagged.');
assert_same_value(
    [],
    carelink_job_description_review_flags('Care for a 2-year-old child and prepare daily meals.'),
    'Ordinary hyphenated child-age wording should not trigger a hiring restriction alert.'
);

echo "PASS: helper age eligibility and job-description review flags\n";
