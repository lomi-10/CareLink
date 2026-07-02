<?php
/**
 * user_context.php — SAFE, non-sensitive user snapshot for CareBot.
 *
 * Returns ONLY coarse status flags used to personalize the assistant. It NEVER
 * exposes names, contact numbers, addresses, document contents/URLs, salary or
 * any financial data, job/application/message contents, or any other user's
 * data. Computed entirely server-side from the authenticated user_id — the
 * client cannot inject or spoof these values.
 *
 * Uses its own silent DB connection so a database hiccup degrades gracefully
 * (returns null) and never breaks CareBot, which otherwise needs no database.
 *
 * Fields returned:
 *   user_type                   'parent' | 'helper' | (other)
 *   verification_status         'Verified' | 'Pending' | 'Rejected' | 'Unverified'
 *   profile_completion_percent  0-100  (same formula as get_profile.php)
 *   has_active_job_post         bool   (parents only; false otherwise)
 *   has_active_placement        bool   (true when in an active employment)
 */

function carelink_user_safe_context(int $userId): ?array
{
    if ($userId < 1) return null;

    require_once __DIR__ . '/../load_config.php';
    $host = carelink_cfg('DB_HOST', 'localhost');
    $user = carelink_cfg('DB_USERNAME', 'root');
    $pass = carelink_cfg('DB_PASSWORD', '');
    $db   = carelink_cfg('DB_DATABASE', 'carelink');
    $port = (int) carelink_cfg('DB_PORT', 3306);

    if (function_exists('mysqli_report')) {
        mysqli_report(MYSQLI_REPORT_OFF); // return false/null instead of throwing
    }
    $conn = @mysqli_connect($host, $user, $pass, $db, $port);
    if (!$conn) return null;
    @mysqli_set_charset($conn, 'utf8mb4');

    $ctx = [
        'user_type'                  => null,
        'verification_status'        => 'Unverified',
        'profile_completion_percent' => 0,
        'has_active_placement'       => false,
    ];

    try {
        $userType = carelink_uc_scalar($conn, "SELECT user_type FROM users WHERE user_id = ? LIMIT 1", $userId);
        if ($userType === null) { mysqli_close($conn); return null; }
        $ctx['user_type'] = (string) $userType;

        if ($userType === 'helper') {
            carelink_uc_helper($conn, $userId, $ctx);
        } elseif ($userType === 'parent') {
            carelink_uc_parent($conn, $userId, $ctx);
        }
    } catch (\Throwable $e) {
        @mysqli_close($conn);
        return $ctx['user_type'] ? $ctx : null;
    }

    mysqli_close($conn);
    return $ctx;
}

// ── Helper role ───────────────────────────────────────────────────────────────
function carelink_uc_helper(mysqli $conn, int $userId, array &$ctx): void
{
    $stmt = $conn->prepare(
        "SELECT profile_id, contact_number, birth_date, gender, province, municipality, barangay,
                bio, education_level, religion, landmark, profile_image, verification_status
         FROM helper_profiles WHERE user_id = ? LIMIT 1"
    );
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $p = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($p) {
        $ctx['verification_status'] = $p['verification_status'] ?: 'Unverified';
        $profileId = (int) $p['profile_id'];

        $jobs  = carelink_uc_count($conn, "SELECT COUNT(*) c FROM helper_jobs WHERE profile_id = ?", $profileId);
        $skills = carelink_uc_count($conn, "SELECT COUNT(*) c FROM helper_skills WHERE profile_id = ?", $profileId);
        $langs = carelink_uc_count($conn, "SELECT COUNT(*) c FROM helper_languages WHERE profile_id = ?", $profileId);
        $docs  = carelink_uc_doc_types($conn, $userId);

        // Mirror helper/get_profile.php completeness.
        $total = 0; $done = 0;
        foreach (['contact_number', 'birth_date', 'gender', 'province', 'municipality', 'barangay'] as $f) {
            $total += 8; if (!empty($p[$f])) $done += 8;
        }
        foreach (['bio', 'education_level', 'religion', 'landmark'] as $f) {
            $total += 5; if (!empty($p[$f])) $done += 5;
        }
        $total += 10; if (!empty($p['profile_image'])) $done += 10;
        $total += 10; if ($jobs  > 0) $done += 10;
        $total += 10; if ($skills > 0) $done += 10;
        $total += 10; if ($langs > 0) $done += 10;
        foreach (['Barangay Clearance', 'Valid ID'] as $d) {
            $total += 10; if (in_array($d, $docs, true)) $done += 10;
        }
        $ctx['profile_completion_percent'] = $total > 0 ? (int) round($done / $total * 100) : 0;
    }

    $ctx['has_active_placement'] = carelink_uc_exists(
        $conn,
        "SELECT 1 FROM job_applications WHERE helper_id = ? AND status IN ('hired','Accepted','termination_pending') LIMIT 1",
        $userId
    );
}

// ── Parent role ───────────────────────────────────────────────────────────────
function carelink_uc_parent(mysqli $conn, int $userId, array &$ctx): void
{
    $stmt = $conn->prepare(
        "SELECT profile_id, contact_number, province, municipality, barangay, bio, profile_image, verification_status
         FROM parent_profiles WHERE user_id = ? LIMIT 1"
    );
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $p = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($p) {
        $ctx['verification_status'] = $p['verification_status'] ?: 'Unverified';
        $profileId = (int) $p['profile_id'];

        $stmt = $conn->prepare("SELECT household_size, household_type FROM parent_household WHERE profile_id = ? LIMIT 1");
        $stmt->bind_param("i", $profileId);
        $stmt->execute();
        $hh = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $docs = carelink_uc_doc_types($conn, $userId);

        // Mirror parent/get_profile.php completeness.
        $total = 0; $done = 0;
        foreach (['contact_number', 'province', 'municipality', 'barangay'] as $f) {
            $total += 10; if (!empty($p[$f])) $done += 10;
        }
        $total += 10; if (!empty($p['bio'])) $done += 10;
        $total += 10; if (!empty($p['profile_image'])) $done += 10;
        $total += 10; if ($hh && $hh['household_size'] !== null && $hh['household_size'] !== '') $done += 10;
        $total += 5;  if ($hh && trim((string) ($hh['household_type'] ?? '')) !== '') $done += 5;
        $total += 20; if (in_array('Valid ID', $docs, true)) $done += 20;
        $total += 20; if (in_array('Barangay Clearance', $docs, true)) $done += 20;
        $ctx['profile_completion_percent'] = $total > 0 ? (int) round($done / $total * 100) : 0;
    }

    $ctx['has_active_job_post'] = carelink_uc_exists(
        $conn,
        "SELECT 1 FROM job_posts WHERE parent_id = ? AND status IN ('Open','Pending') LIMIT 1",
        $userId
    );
    $ctx['has_active_placement'] = carelink_uc_exists(
        $conn,
        "SELECT 1 FROM job_applications ja
         INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
         WHERE jp.parent_id = ? AND ja.status IN ('hired','Accepted','termination_pending') LIMIT 1",
        $userId
    );
}

// ── tiny query helpers ────────────────────────────────────────────────────────
function carelink_uc_scalar(mysqli $conn, string $sql, int $id)
{
    $stmt = $conn->prepare($sql);
    if (!$stmt) return null;
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_row();
    $stmt->close();
    return $row ? $row[0] : null;
}

function carelink_uc_count(mysqli $conn, string $sql, int $id): int
{
    $stmt = $conn->prepare($sql);
    if (!$stmt) return 0;
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return (int) ($row['c'] ?? 0);
}

function carelink_uc_exists(mysqli $conn, string $sql, int $id): bool
{
    $stmt = $conn->prepare($sql);
    if (!$stmt) return false;
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $res = $stmt->get_result();
    $exists = $res && $res->num_rows > 0;
    $stmt->close();
    return $exists;
}

function carelink_uc_doc_types(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare("SELECT DISTINCT document_type FROM user_documents WHERE user_id = ?");
    if (!$stmt) return [];
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $out = [];
    while ($row = $res->fetch_assoc()) { $out[] = (string) $row['document_type']; }
    $stmt->close();
    return $out;
}
