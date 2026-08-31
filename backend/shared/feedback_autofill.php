<?php
/**
 * shared/feedback_autofill.php — answer the demographics we already know.
 *
 * Part I of the Chapter 4 instrument asks role, age, sex, education and device.
 * The system already holds most of that, so asking the respondent to retype it
 * is wasted effort and a source of disagreement between the survey and the
 * database. These are recorded automatically the first time the evaluation
 * screen is opened, and the remaining items are still asked.
 *
 * WHAT IS DERIVABLE, AND FOR WHOM:
 *
 *   Q1 role      users.user_type                     every role
 *   Q2 age       helper_profiles.birth_date          HELPERS ONLY
 *   Q3 sex       helper_profiles.gender              HELPERS ONLY
 *   Q4 education helper_profiles.education_level     HELPERS ONLY
 *   Q7 device    log_trail.device_info (user agent)  every role
 *
 * Employers have none of birth_date, gender or education: an employer is
 * verified as a HOUSEHOLD, not as an individual worker, so those columns do not
 * exist on parent_profiles. Their Q2-Q4 stay as questions rather than being
 * invented. PESO staff likewise.
 *
 * INSERT IGNORE throughout: a respondent who has already answered an item by
 * hand keeps their answer. Autofill never overwrites a person's own words.
 */

if (!function_exists('carelink_age_bracket')) {
    function carelink_age_bracket(?string $birthDate): ?string
    {
        if (!$birthDate) return null;
        $bd = date_create($birthDate);
        if (!$bd) return null;
        $age = (int) $bd->diff(date_create('today'))->y;
        if ($age < 18) return null;          // outside the instrument's brackets
        if ($age <= 24) return '18-24';
        if ($age <= 34) return '25-34';
        if ($age <= 44) return '35-44';
        if ($age <= 54) return '45-54';
        return '55+';
    }
}

if (!function_exists('carelink_education_bracket')) {
    /** Maps free-ish education_level text onto the instrument's five brackets. */
    function carelink_education_bracket(?string $raw): ?string
    {
        $v = strtolower(trim((string) $raw));
        if ($v === '') return null;
        if (str_contains($v, 'post') || str_contains($v, 'master') || str_contains($v, 'doctor')) return 'Post-grad';
        if (str_contains($v, 'college') || str_contains($v, 'bachelor') || str_contains($v, 'university')) return 'College';
        if (str_contains($v, 'vocational') || str_contains($v, 'tesda') || str_contains($v, 'technical')) return 'Vocational/TESDA';
        if (str_contains($v, 'high school') || str_contains($v, 'highschool') || str_contains($v, 'senior') || str_contains($v, 'junior')) return 'High School';
        if (str_contains($v, 'elementary') || str_contains($v, 'primary')) return 'Elementary';
        return null;
    }
}

if (!function_exists('carelink_device_from_user_agent')) {
    /** Android / iPhone / Laptop-Desktop browser, from a recorded user agent. */
    function carelink_device_from_user_agent(?string $ua): ?string
    {
        $v = strtolower(trim((string) $ua));
        if ($v === '') return null;
        if (str_contains($v, 'android')) return 'Android';
        if (str_contains($v, 'iphone') || str_contains($v, 'ipad') || str_contains($v, 'ios')) return 'iPhone';
        // Anything else that reached us from a browser is a desktop browser.
        if (str_contains($v, 'mozilla') || str_contains($v, 'chrome') || str_contains($v, 'safari') || str_contains($v, 'edg')) {
            return 'Laptop/Desktop browser';
        }
        return null;
    }
}

if (!function_exists('carelink_autofill_demographics')) {
    /**
     * Records every demographic the system can already answer for this user.
     *
     * @return array<string,string> code => value, for the items just derived
     *   (or already on file). The screen shows this back to the respondent so
     *   the capture is visible rather than silent — it is research data about
     *   them, and they should be able to see what was recorded.
     */
    function carelink_autofill_demographics(mysqli $conn, int $userId, string $userType): array
    {
        if ($userId <= 0) return [];
        require_once __DIR__ . '/feedback_questions_table.php';
        ensure_feedback_questions_table($conn);

        $derived = [];

        // Q1 — role. Taken from the account, not asked, so it can never
        // contradict the account actually being used.
        $derived['dm_role'] = $userType === 'helper' ? 'Helper (Kasambahay)'
            : ($userType === 'parent' ? 'Employer (Household)' : 'PESO Staff');

        // Q2-Q4 — helper profile only. See the note at the top of this file.
        if ($userType === 'helper') {
            $st = $conn->prepare('SELECT birth_date, gender, education_level FROM helper_profiles WHERE user_id = ? LIMIT 1');
            if ($st) {
                $st->bind_param('i', $userId);
                $st->execute();
                $p = $st->get_result()->fetch_assoc();
                $st->close();
                if ($p) {
                    if ($age = carelink_age_bracket($p['birth_date'] ?? null)) $derived['dm_age'] = $age;
                    $g = strtolower(trim((string) ($p['gender'] ?? '')));
                    if ($g === 'female' || $g === 'f') $derived['dm_sex'] = 'Female';
                    elseif ($g === 'male' || $g === 'm') $derived['dm_sex'] = 'Male';
                    if ($ed = carelink_education_bracket($p['education_level'] ?? null)) $derived['dm_education'] = $ed;
                }
            }
        }

        // Q7 — device, from the most recent audit row for this user.
        $st = $conn->prepare(
            'SELECT device_info FROM log_trail
              WHERE user_id = ? AND device_info IS NOT NULL AND TRIM(device_info) <> ""
           ORDER BY log_id DESC LIMIT 1'
        );
        if ($st) {
            $st->bind_param('i', $userId);
            $st->execute();
            $row = $st->get_result()->fetch_assoc();
            $st->close();
            if ($row && ($dev = carelink_device_from_user_agent($row['device_info']))) {
                $derived['dm_device'] = $dev;
            }
        }
        // Fall back to the CURRENT request's agent when the trail has nothing —
        // a respondent whose first action is opening this screen has no rows yet.
        if (!isset($derived['dm_device'])) {
            if ($dev = carelink_device_from_user_agent($_SERVER['HTTP_USER_AGENT'] ?? null)) {
                $derived['dm_device'] = $dev;
            }
        }

        if (!$derived) return [];

        // INSERT IGNORE — a hand-typed answer is never overwritten.
        $codes = "'" . implode("','", array_map([$conn, 'real_escape_string'], array_keys($derived))) . "'";
        $res = $conn->query("SELECT question_id, code FROM feedback_questions WHERE code IN ($codes)");
        $ins = $conn->prepare(
            'INSERT IGNORE INTO feedback_answers (user_id, user_type, question_id, text_value) VALUES (?, ?, ?, ?)'
        );
        if (!$ins) return $derived;
        while ($res && ($q = $res->fetch_assoc())) {
            $qid = (int) $q['question_id'];
            $val = $derived[$q['code']];
            $ins->bind_param('isis', $userId, $userType, $qid, $val);
            $ins->execute();
        }
        $ins->close();

        return $derived;
    }
}
