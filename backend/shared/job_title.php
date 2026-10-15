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

if (!function_exists('carelink_normalize_category_ids')) {
    /**
     * Canonical sorted int list from selected category IDs or their JSON value.
     * @return int[]
     */
    function carelink_normalize_category_ids($categoryIds): array
    {
        $ids = is_array($categoryIds) ? $categoryIds : (json_decode((string) $categoryIds, true) ?: []);
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), fn($n) => $n > 0)));
        sort($ids, SORT_NUMERIC);
        return $ids;
    }
}

if (!function_exists('carelink_validate_job_categories')) {
    /**
     * Validate selected categories and ensure every selected role belongs to one.
     *
     * @return array{category_id:int, category_ids:int[], category_names:string[]}
     */
    function carelink_validate_job_categories(mysqli $conn, $categoryIds, int $fallbackCategoryId, array $jobIds): array
    {
        $requested = is_array($categoryIds) ? $categoryIds : [];
        if (!$requested && $fallbackCategoryId > 0) $requested = [$fallbackCategoryId];
        $ids = carelink_normalize_category_ids($requested);
        if (!$ids) throw new Exception('Select at least one valid job category.');

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $conn->prepare("SELECT category_id, category_name FROM ref_categories WHERE category_id IN ($placeholders)");
        if (!$stmt) throw new Exception('Could not validate job categories: ' . $conn->error);
        $types = str_repeat('i', count($ids));
        $params = [$types];
        foreach ($ids as $index => $id) $params[] = &$ids[$index];
        call_user_func_array([$stmt, 'bind_param'], $params);
        if (!$stmt->execute()) throw new Exception('Could not validate job categories: ' . $stmt->error);
        $result = $stmt->get_result();
        $categoryNames = [];
        while ($row = $result->fetch_assoc()) $categoryNames[(int) $row['category_id']] = (string) $row['category_name'];
        $stmt->close();

        if (count($categoryNames) !== count($ids)) throw new Exception('One or more selected job categories are unavailable.');
        foreach ($ids as $id) {
            if (strcasecmp(trim($categoryNames[$id]), 'General Househelp') === 0 && count($ids) > 1) {
                throw new Exception('General Househelp is an all-around category and cannot be combined with other categories.');
            }
        }

        $normalizedJobs = carelink_normalize_job_ids($jobIds);
        if ($normalizedJobs) {
            $jobPlaceholders = implode(',', array_fill(0, count($normalizedJobs), '?'));
            $jobStmt = $conn->prepare("SELECT job_id, category_id FROM ref_jobs WHERE job_id IN ($jobPlaceholders)");
            if (!$jobStmt) throw new Exception('Could not validate job roles: ' . $conn->error);
            $jobTypes = str_repeat('i', count($normalizedJobs));
            $jobParams = [$jobTypes];
            foreach ($normalizedJobs as $index => $id) $jobParams[] = &$normalizedJobs[$index];
            call_user_func_array([$jobStmt, 'bind_param'], $jobParams);
            if (!$jobStmt->execute()) throw new Exception('Could not validate job roles: ' . $jobStmt->error);
            $jobResult = $jobStmt->get_result();
            $validJobIds = [];
            while ($row = $jobResult->fetch_assoc()) {
                $jobId = (int) $row['job_id'];
                if (!in_array((int) $row['category_id'], $ids, true)) {
                    $jobStmt->close();
                    throw new Exception('Each selected job role must belong to one of the selected categories.');
                }
                $validJobIds[] = $jobId;
            }
            $jobStmt->close();
            if (count($validJobIds) !== count($normalizedJobs)) throw new Exception('One or more selected job roles are unavailable.');
        }

        $orderedNames = array_map(fn($id) => $categoryNames[$id], $ids);
        $categoryId = (int) (is_array($categoryIds) && count($categoryIds) > 0
            ? reset($categoryIds)
            : $fallbackCategoryId);
        if (!in_array($categoryId, $ids, true)) $categoryId = $ids[0];

        return ['category_id' => $categoryId, 'category_ids' => $ids, 'category_names' => $orderedNames];
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
