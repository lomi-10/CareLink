<?php

require_once __DIR__ . '/../shared/multivalue_relations.php';
require_once __DIR__ . '/../shared/job_match.php';

function assert_relation_value($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($message);
    }
}

assert_relation_value([4, 2], carelink_parse_id_list('[4,"2",0,-1,4]'), 'Reference IDs should be positive, unique integers in source order.');
assert_relation_value([], carelink_parse_id_list('not-json'), 'Malformed relationship JSON should not create reference rows.');
assert_relation_value(
    ['Gardening', 'Meal preparation'],
    carelink_parse_custom_value_list('["Gardening"," Meal preparation "]'),
    'Custom value JSON should be trimmed without changing its order.'
);
assert_relation_value(['Laundry, cooking'], carelink_parse_custom_value_list('Laundry, cooking'), 'Legacy plain text should remain a single preserved value.');
assert_relation_value(['Laundry'], carelink_parse_custom_value_list('"Laundry"'), 'A JSON string scalar should remain one custom value.');
assert_relation_value(['Childcare', 'Cooking'], carelink_parse_custom_value_list([' Childcare ', '', 'Cooking']), 'Custom arrays should trim blanks while preserving source order.');

$match = carelink_score_job_for_helper(
    ['municipality' => 'Ormoc', 'province' => 'Leyte', 'experience_years' => 2, 'expected_salary' => 6400, 'salary_period' => 'Monthly'],
    [1],
    [2],
    [3],
    [
        'category_id' => 1,
        'category_ids' => [1],
        'job_ids' => [2],
        'skill_ids' => [3],
        'municipality' => 'Ormoc',
        'province' => 'Leyte',
        'min_experience_years' => 1,
        'salary_offered' => 6400,
        'salary_period' => 'Monthly',
    ]
);
assert_relation_value(true, in_array('1/1 required job roles match', $match['reasons'], true), 'Matching should score normalized role ID arrays.');
assert_relation_value(true, in_array('1/1 required skills match', $match['reasons'], true), 'Matching should score normalized skill ID arrays.');

echo "PASS: normalized relationship value parsing\n";
