<?php

function carelink_job_description_review_flags(string $description): array
{
    $flags = [];

    if (preg_match(
        '/\baged\b|\b\d{1,2}\s+years?\s+old\b|\bage(?:\s+(?:range|limit))?\s*[:=]?\s*\d{1,2}\b|\b\d{1,2}\s*(?:-|to)\s*\d{1,2}\s+years?\b/i',
        $description
    )) {
        $flags[] = 'Possible age-related hiring wording';
    }

    if (preg_match(
        '/\b(?:muslim|catholic|christian)(?:[\s-]+applicants?)?[\s-]+only\b|\bonly[\s-]+(?:a[\s-]+)?(?:muslim|catholic|christian)\b/i',
        $description
    )) {
        $flags[] = 'Possible religion-based hiring restriction';
    }

    return $flags;
}
