<?php

if (!function_exists('carelink_parse_id_list')) {
    function carelink_parse_id_list($value): array
    {
        $values = is_array($value) ? $value : json_decode((string) $value, true);
        if (!is_array($values)) return [];

        $ids = [];
        foreach ($values as $item) {
            $id = (int) $item;
            if ($id > 0 && !in_array($id, $ids, true)) $ids[] = $id;
        }
        return $ids;
    }
}

if (!function_exists('carelink_parse_custom_value_list')) {
    function carelink_parse_custom_value_list($value): array
    {
        $decoded = is_array($value) ? $value : json_decode((string) $value, true);
        if (is_string($decoded)) {
            $decoded = trim($decoded);
            return $decoded === '' ? [] : [$decoded];
        }
        $values = $decoded;
        if (!is_array($values)) {
            $value = trim((string) $value);
            return $value === '' ? [] : [$value];
        }

        $items = [];
        foreach ($values as $item) {
            if (!is_scalar($item)) continue;
            $item = trim((string) $item);
            if ($item !== '') $items[] = $item;
        }
        return $items;
    }
}

if (!function_exists('carelink_bind_dynamic_params')) {
    function carelink_bind_dynamic_params(mysqli_stmt $stmt, string $types, array &$values): void
    {
        $params = [$types];
        foreach ($values as $index => &$value) $params[] = &$value;
        unset($value);
        call_user_func_array([$stmt, 'bind_param'], $params);
    }
}

if (!function_exists('carelink_load_ordered_relations')) {
    function carelink_load_ordered_relations(mysqli $conn, array $ownerIds, array $relations, string $ownerColumn): array
    {
        $ownerIds = array_values(array_unique(array_filter(array_map('intval', $ownerIds), fn($id) => $id > 0)));
        if (!$ownerIds) return [];

        $allowedRelations = [
            'job_post_id' => [
                'job_post_categories' => 'category_id',
                'job_post_roles' => 'job_id',
                'job_post_skills' => 'skill_id',
                'job_post_custom_skills' => 'custom_skill',
            ],
            'profile_id' => [
                'helper_custom_jobs' => 'custom_value',
                'helper_custom_skills' => 'custom_value',
            ],
        ];
        if (!isset($allowedRelations[$ownerColumn])) throw new InvalidArgumentException('Unsupported relation owner.');

        $out = [];
        foreach ($ownerIds as $ownerId) $out[$ownerId] = [];
        foreach ($relations as $table => $valueColumn) {
            if (($allowedRelations[$ownerColumn][$table] ?? null) !== $valueColumn) {
                throw new InvalidArgumentException('Unsupported relation value.');
            }
            foreach (array_chunk($ownerIds, 500) as $ownerChunk) {
                $placeholders = implode(',', array_fill(0, count($ownerChunk), '?'));
                $stmt = $conn->prepare(
                    "SELECT `$ownerColumn`, `$valueColumn` FROM `$table`
                     WHERE `$ownerColumn` IN ($placeholders) ORDER BY `$ownerColumn`, `sort_order`"
                );
                if (!$stmt) throw new RuntimeException('Could not load normalized relationships: ' . $conn->error);
                $values = $ownerChunk;
                carelink_bind_dynamic_params($stmt, str_repeat('i', count($values)), $values);
                if (!$stmt->execute()) throw new RuntimeException('Could not load normalized relationships: ' . $stmt->error);
                $result = $stmt->get_result();
                while ($row = $result->fetch_assoc()) {
                    $out[(int) $row[$ownerColumn]][$table][] = $row[$valueColumn];
                }
                $stmt->close();
            }
        }
        return $out;
    }
}

if (!function_exists('carelink_load_job_post_relations')) {
    function carelink_load_job_post_relations(mysqli $conn, array $jobPostIds): array
    {
        $loaded = carelink_load_ordered_relations($conn, $jobPostIds, [
            'job_post_categories' => 'category_id',
            'job_post_roles' => 'job_id',
            'job_post_skills' => 'skill_id',
            'job_post_custom_skills' => 'custom_skill',
        ], 'job_post_id');

        $relations = [];
        foreach ($loaded as $jobPostId => $values) {
            $relations[$jobPostId] = [
                'category_ids' => array_map('intval', $values['job_post_categories'] ?? []),
                'job_ids' => array_map('intval', $values['job_post_roles'] ?? []),
                'skill_ids' => array_map('intval', $values['job_post_skills'] ?? []),
                'custom_skill_values' => array_map('strval', $values['job_post_custom_skills'] ?? []),
            ];
        }
        return $relations;
    }
}

if (!function_exists('carelink_attach_job_post_relations')) {
    function carelink_attach_job_post_relations(array $job, array $relations): array
    {
        $id = (int) ($job['job_post_id'] ?? 0);
        $values = $relations[$id] ?? [
            'category_ids' => [],
            'job_ids' => [],
            'skill_ids' => [],
            'custom_skill_values' => [],
        ];
        $job['category_ids'] = $values['category_ids'];
        $job['job_ids'] = $values['job_ids'];
        $job['skill_ids'] = $values['skill_ids'];
        $job['custom_skills'] = json_encode($values['custom_skill_values'], JSON_UNESCAPED_UNICODE);
        return $job;
    }
}

if (!function_exists('carelink_load_helper_custom_values')) {
    function carelink_load_helper_custom_values(mysqli $conn, array $profileIds): array
    {
        $loaded = carelink_load_ordered_relations($conn, $profileIds, [
            'helper_custom_jobs' => 'custom_value',
            'helper_custom_skills' => 'custom_value',
        ], 'profile_id');
        $values = [];
        foreach ($loaded as $profileId => $items) {
            $values[$profileId] = [
                'custom_jobs' => array_map('strval', $items['helper_custom_jobs'] ?? []),
                'custom_skills' => array_map('strval', $items['helper_custom_skills'] ?? []),
            ];
        }
        return $values;
    }
}

if (!function_exists('carelink_replace_relation_values')) {
    function carelink_replace_relation_values(mysqli $conn, string $table, string $ownerColumn, int $ownerId, array $values): void
    {
        $specs = [
            'job_post_categories' => ['job_post_id', 'category_id', 'int'],
            'job_post_roles' => ['job_post_id', 'job_id', 'int'],
            'job_post_skills' => ['job_post_id', 'skill_id', 'int'],
            'job_post_custom_skills' => ['job_post_id', 'custom_skill', 'string'],
            'helper_custom_jobs' => ['profile_id', 'custom_value', 'string'],
            'helper_custom_skills' => ['profile_id', 'custom_value', 'string'],
        ];
        if (!isset($specs[$table]) || $specs[$table][0] !== $ownerColumn) {
            throw new InvalidArgumentException('Unsupported relationship table.');
        }
        [$expectedOwner, $valueColumn, $type] = $specs[$table];
        if ($ownerId <= 0) throw new InvalidArgumentException('Relationship owner ID must be positive.');

        $delete = $conn->prepare("DELETE FROM `$table` WHERE `$expectedOwner` = ?");
        if (!$delete) throw new RuntimeException('Could not replace relationships: ' . $conn->error);
        $delete->bind_param('i', $ownerId);
        if (!$delete->execute()) throw new RuntimeException('Could not replace relationships: ' . $delete->error);
        $delete->close();

        $insert = $conn->prepare(
            "INSERT INTO `$table` (`$expectedOwner`, `sort_order`, `$valueColumn`) VALUES (?, ?, ?)"
        );
        if (!$insert) throw new RuntimeException('Could not save relationships: ' . $conn->error);
        foreach (array_values($values) as $position => $value) {
            $position = (int) $position;
            if ($type === 'int') {
                $value = (int) $value;
                if ($value <= 0) continue;
                $insert->bind_param('iii', $ownerId, $position, $value);
            } else {
                $value = trim((string) $value);
                if ($value === '') continue;
                $insert->bind_param('iis', $ownerId, $position, $value);
            }
            if (!$insert->execute()) {
                $error = $insert->error;
                $insert->close();
                throw new RuntimeException('Could not save relationships: ' . $error);
            }
        }
        $insert->close();
    }
}

if (!function_exists('carelink_replace_job_post_relations')) {
    function carelink_replace_job_post_relations(
        mysqli $conn,
        int $jobPostId,
        array $categoryIds,
        array $jobIds,
        array $skillIds,
        $customSkills = []
    ): void {
        carelink_replace_relation_values($conn, 'job_post_categories', 'job_post_id', $jobPostId, carelink_parse_id_list($categoryIds));
        carelink_replace_relation_values($conn, 'job_post_roles', 'job_post_id', $jobPostId, carelink_parse_id_list($jobIds));
        carelink_replace_relation_values($conn, 'job_post_skills', 'job_post_id', $jobPostId, carelink_parse_id_list($skillIds));
        carelink_replace_relation_values($conn, 'job_post_custom_skills', 'job_post_id', $jobPostId, carelink_parse_custom_value_list($customSkills));
    }
}
