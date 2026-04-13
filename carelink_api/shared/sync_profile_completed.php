<?php
/**
 * Marks users.profile_completed based on minimum fields for PESO verification prep.
 * Called from helper/update_profile.php and parent/update_profile.php inside the same transaction.
 *
 * @return bool Whether the profile is considered complete after sync.
 */
function carelink_sync_helper_profile_completed(mysqli $conn, int $user_id): bool
{
    $sql = "
        SELECT u.username,
               hp.contact_number, hp.province, hp.municipality, hp.barangay, hp.bio, hp.profile_id
        FROM users u
        INNER JOIN helper_profiles hp ON hp.user_id = u.user_id
        WHERE u.user_id = ?
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        $stmt->close();
        carelink_set_profile_completed_flag($conn, $user_id, false);
        return false;
    }
    $row = $res->fetch_assoc();
    $stmt->close();

    $profile_id = (int) $row['profile_id'];
    $bio = isset($row['bio']) ? trim((string) $row['bio']) : '';
    $uname = isset($row['username']) ? trim((string) $row['username']) : '';

    $baseOk = $uname !== ''
        && strlen($uname) >= 3
        && trim((string) $row['contact_number']) !== ''
        && trim((string) $row['province']) !== ''
        && trim((string) $row['municipality']) !== ''
        && trim((string) $row['barangay']) !== ''
        && strlen($bio) >= 15;

    $skillCount = 0;
    $sk = $conn->prepare("SELECT COUNT(*) AS c FROM helper_skills WHERE profile_id = ?");
    if ($sk) {
        $sk->bind_param("i", $profile_id);
        $sk->execute();
        $skillCount = (int) ($sk->get_result()->fetch_assoc()['c'] ?? 0);
        $sk->close();
    }

    $docCount = 0;
    $dk = $conn->prepare("SELECT COUNT(*) AS c FROM user_documents WHERE user_id = ? AND status IN ('Pending','Verified')");
    if ($dk) {
        $dk->bind_param("i", $user_id);
        $dk->execute();
        $docCount = (int) ($dk->get_result()->fetch_assoc()['c'] ?? 0);
        $dk->close();
    }

    $complete = $baseOk && $skillCount > 0 && $docCount >= 1;
    carelink_set_profile_completed_flag($conn, $user_id, $complete);
    return $complete;
}

function carelink_sync_parent_profile_completed(mysqli $conn, int $user_id): bool
{
    $sql = "
        SELECT pp.contact_number, pp.province, pp.municipality, pp.barangay, pp.bio, pp.profile_id
        FROM parent_profiles pp
        WHERE pp.user_id = ?
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) {
        $stmt->close();
        carelink_set_profile_completed_flag($conn, $user_id, false);
        return false;
    }
    $row = $res->fetch_assoc();
    $stmt->close();

    $profile_id = (int) $row['profile_id'];
    $bio = isset($row['bio']) ? trim((string) $row['bio']) : '';

    $baseOk = trim((string) $row['contact_number']) !== ''
        && trim((string) $row['province']) !== ''
        && trim((string) $row['municipality']) !== ''
        && trim((string) $row['barangay']) !== ''
        && strlen($bio) >= 15;

    $hh = 0;
    $hq = $conn->prepare("SELECT COUNT(*) AS c FROM parent_household WHERE profile_id = ?");
    if ($hq) {
        $hq->bind_param("i", $profile_id);
        $hq->execute();
        $hh = (int) ($hq->get_result()->fetch_assoc()['c'] ?? 0);
        $hq->close();
    }

    $docCount = 0;
    $dk = $conn->prepare("SELECT COUNT(*) AS c FROM user_documents WHERE user_id = ? AND status IN ('Pending','Verified')");
    if ($dk) {
        $dk->bind_param("i", $user_id);
        $dk->execute();
        $docCount = (int) ($dk->get_result()->fetch_assoc()['c'] ?? 0);
        $dk->close();
    }

    $complete = $baseOk && $hh > 0 && $docCount >= 1;
    carelink_set_profile_completed_flag($conn, $user_id, $complete);
    return $complete;
}

function carelink_set_profile_completed_flag(mysqli $conn, int $user_id, bool $complete): void
{
    $v = $complete ? 1 : 0;
    $up = $conn->prepare("UPDATE users SET profile_completed = ?, updated_at = NOW() WHERE user_id = ?");
    if ($up) {
        $up->bind_param("ii", $v, $user_id);
        $up->execute();
        $up->close();
    }
}
