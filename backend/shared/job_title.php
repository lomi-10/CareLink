<?php
/**
 * shared/job_title.php — concise, professional job-post titles.
 *
 * WHY THIS EXISTS: titles used to be every selected role joined with commas, so a
 * parent picking all 7 roles under "Cook" produced a ~110-character headline that
 * wrapped across three lines on every helper job card, application row and
 * contract. Real job boards use ONE short title ("Cook") and list the specifics in
 * the body — the category is precisely the professional umbrella term for its
 * roles. The individual roles are never lost; they're shown as chips in the details.
 *
 * MIRRORS frontend/lib/jobTitle.ts — keep the two in sync. This server-side copy
 * lets post/edit rebuild the title without trusting the client, and backs the
 * one-time backfill of existing rows.
 */

if (!function_exists('carelink_build_job_title')) {
    /**
     * @param string|null   $categoryName e.g. "Cook" (ref_categories.category_name)
     * @param string[]|null $roleNames    selected role titles
     * @param string|null   $customTitle  parent-written title — always wins when non-empty
     */
    function carelink_build_job_title(?string $categoryName, ?array $roleNames, ?string $customTitle = null): string
    {
        $custom = trim((string) ($customTitle ?? ''));
        if ($custom !== '') return $custom;

        $roles = [];
        foreach (($roleNames ?? []) as $r) {
            $r = trim((string) $r);
            if ($r !== '') $roles[] = $r;
        }
        $category = trim((string) ($categoryName ?? ''));

        // 1 role is already specific and readable — use it as-is.
        if (count($roles) === 1) return $roles[0];

        // 2 roles still read naturally joined.
        if (count($roles) === 2) return $roles[0] . ' & ' . $roles[1];

        // 3+ roles: the category is the umbrella term for all of them.
        if (count($roles) >= 3) return $category !== '' ? $category : $roles[0];

        // No roles picked — fall back to the category, else a generic label.
        return $category !== '' ? $category : 'Household Helper';
    }
}

if (!function_exists('carelink_normalize_job_ids')) {
    /**
     * Canonical sorted int list from a job_ids JSON value.
     *
     * Stored job_ids are NOT comparable as raw strings: element order varies with
     * the order the parent tapped the roles, older rows hold strings ("26") while
     * newer ones hold ints (26), and MySQL reformats JSON columns. Normalising both
     * sides is the only reliable way to tell whether two posts cover the same roles.
     *
     * @return int[] sorted ascending, de-duplicated
     */
    function carelink_normalize_job_ids($jobIdsJson): array
    {
        $ids = is_array($jobIdsJson) ? $jobIdsJson : (json_decode((string) $jobIdsJson, true) ?: []);
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), fn($n) => $n > 0)));
        sort($ids, SORT_NUMERIC);
        return $ids;
    }
}

if (!function_exists('carelink_role_names_for_job_ids')) {
    /**
     * Resolve a job_posts.job_ids JSON array to ref_jobs.job_title names.
     * @return string[]
     */
    function carelink_role_names_for_job_ids(mysqli $conn, $jobIdsJson): array
    {
        $ids = is_array($jobIdsJson) ? $jobIdsJson : (json_decode((string) $jobIdsJson, true) ?: []);
        $ids = array_values(array_filter(array_map('intval', $ids), fn($n) => $n > 0));
        if (!$ids) return [];

        $names = [];
        $res = $conn->query('SELECT job_title FROM ref_jobs WHERE job_id IN (' . implode(',', $ids) . ')');
        if ($res) { while ($r = $res->fetch_assoc()) $names[] = $r['job_title']; }
        return $names;
    }
}
