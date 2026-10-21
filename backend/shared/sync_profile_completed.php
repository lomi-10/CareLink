<?php
/**
 * Parent review readiness requires both required document types. Helpers
 * enter the review queue with a submitted Valid ID; PESO may still require
 * Barangay Clearance before approving them.
 */
/**
 * The documents an account must have on file before PESO can verify it.
 *
 * Valid ID proves who they are; Barangay Clearance places them in a community
 * a PESO officer can check with. Police Clearance and TESDA NC2 are optional
 * credentials that strengthen a profile but cannot stand in for identity.
 */
if (!defined('CARELINK_REQUIRED_DOCUMENT_TYPES')) {
    define('CARELINK_REQUIRED_DOCUMENT_TYPES', ['Valid ID', 'Barangay Clearance']);
}

/**
 * Which required documents this account is missing.
 *
 * Returns the human-readable names, so callers can say exactly what is absent
 * instead of a generic "documents incomplete".
 *
 * @return string[] empty when nothing is missing
 */
function carelink_missing_required_documents(mysqli $conn, int $user_id): array
{
    $required = CARELINK_REQUIRED_DOCUMENT_TYPES;

    $stmt = $conn->prepare(
        "SELECT DISTINCT document_type
           FROM user_documents
          WHERE user_id = ?
            AND status IN ('Pending', 'Verified')"
    );
    // A lookup failure must not silently report "nothing missing" — that is the
    // failure mode that let unverified accounts through in the first place.
    if (!$stmt) return $required;

    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $onFile = [];
    while ($row = $res->fetch_assoc()) $onFile[] = (string) $row['document_type'];
    $stmt->close();

    return array_values(array_diff($required, $onFile));
}

function carelink_has_required_documents(mysqli $conn, int $user_id): bool
{
    $stmt = $conn->prepare(
        "SELECT COUNT(DISTINCT document_type) AS c
         FROM user_documents
         WHERE user_id = ?
           AND document_type IN ('Barangay Clearance', 'Valid ID')
           AND status IN ('Pending', 'Verified')"
    );
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $count = (int) ($stmt->get_result()->fetch_assoc()['c'] ?? 0);
    $stmt->close();
    return $count >= 2; // both Barangay Clearance AND Valid ID
}

function carelink_has_any_required_document(mysqli $conn, int $user_id): bool
{
    $stmt = $conn->prepare(
        "SELECT 1
         FROM user_documents
         WHERE user_id = ?
           AND document_type IN ('Barangay Clearance', 'Valid ID')
           AND status IN ('Pending', 'Verified')
         LIMIT 1"
    );
    if (!$stmt) {
        error_log("Failed to prepare required-document availability check: " . $conn->error);
        return false;
    }
    $stmt->bind_param("i", $user_id);
    if (!$stmt->execute()) {
        error_log("Failed required-document availability check for user {$user_id}: " . $stmt->error);
        $stmt->close();
        return false;
    }
    $exists = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $exists;
}

/**
 * Marks helper users.profile_completed when they are ready to enter the PESO
 * queue; this is separate from optional profile-completion progress.
 * Called from helper/update_profile.php and parent/update_profile.php inside the same transaction.
 *
 * @return bool Whether the helper is ready to enter the PESO review queue.
 */
function carelink_sync_helper_profile_completed(mysqli $conn, int $user_id): bool
{
    $sql = "
        SELECT u.phone AS contact_number,
               hp.birth_date, hp.gender,
               hp.province, hp.municipality, hp.barangay, hp.profile_id
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
    $baseOk = trim((string) $row['contact_number']) !== ''
        && trim((string) $row['birth_date']) !== ''
        && trim((string) $row['gender']) !== ''
        && trim((string) $row['province']) !== ''
        && trim((string) $row['municipality']) !== ''
        && trim((string) $row['barangay']) !== '';

    $jobCount = 0;
    $jobs = $conn->prepare("SELECT COUNT(*) AS c FROM helper_jobs WHERE profile_id = ?");
    if ($jobs) {
        $jobs->bind_param("i", $profile_id);
        $jobs->execute();
        $jobCount = (int) ($jobs->get_result()->fetch_assoc()['c'] ?? 0);
        $jobs->close();
    }

    $validId = $conn->prepare(
        "SELECT 1 FROM user_documents
         WHERE user_id = ? AND document_type = 'Valid ID'
           AND status IN ('Pending', 'Verified')
         LIMIT 1"
    );
    $hasValidId = false;
    if ($validId) {
        $validId->bind_param("i", $user_id);
        $validId->execute();
        $hasValidId = $validId->get_result()->num_rows > 0;
        $validId->close();
    }

    $readyForReview = $baseOk && $jobCount > 0 && $hasValidId;
    carelink_set_profile_completed_flag($conn, $user_id, $readyForReview);

    // A submitted Valid ID is enough to enter the review queue. PESO still
    // handles document verification and may require the Barangay Clearance.
    if ($readyForReview) {
        $q = $conn->prepare(
            "UPDATE helper_profiles
             SET verification_status = 'Pending',
                 verified_by = NULL,
                 verified_at = NULL,
                 rejected_by = NULL,
                 rejected_at = NULL,
                 rejection_reason = NULL,
                 updated_at = NOW()
             WHERE user_id = ?
               AND (verification_status = 'Unverified'
                    OR verification_status = 'Rejected'
                    OR verification_status IS NULL
                    OR verification_status = '')"
        );
        if ($q) {
            $q->bind_param("i", $user_id);
            $q->execute();
            if ($q->affected_rows > 0) {
                require_once __DIR__ . '/notify_peso_staff.php';
                $nameRow = $conn->query("SELECT CONCAT(first_name,' ',last_name) AS n FROM users WHERE user_id = " . (int)$user_id)->fetch_assoc();
                $nm = $nameRow ? $nameRow['n'] : 'A helper';
                notifyAllPesoStaff(
                    $conn,
                    'peso_queue_user',
                    'Helper ready for verification',
                    $nm . ' completed the required details and submitted a Valid ID for PESO review.',
                    'account',
                    $user_id
                );
            }
            $q->close();
        }
    }
    return $readyForReview;
}

function carelink_sync_parent_profile_completed(mysqli $conn, int $user_id): bool
{
    $sql = "
        SELECT u.phone AS contact_number,
               pp.province, pp.municipality, pp.barangay, pp.bio, pp.profile_id
        FROM parent_profiles pp
        INNER JOIN users u ON u.user_id = pp.user_id
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
        && trim((string) $row['barangay']) !== '';
    // Bio deliberately excluded — see the helper function above.

    $hhOk = false;
    $hq = $conn->prepare("SELECT household_type FROM parent_household WHERE profile_id = ? LIMIT 1");
    if ($hq) {
        $hq->bind_param("i", $profile_id);
        $hq->execute();
        $hr = $hq->get_result();
        if ($hr && $hr->num_rows > 0) {
            $hrow = $hr->fetch_assoc();
            $ht = isset($hrow['household_type']) ? trim((string) $hrow['household_type']) : '';
            $hhOk = ($ht !== '');
        }
        $hq->close();
    }

    $hasRequiredDocs = carelink_has_required_documents($conn, $user_id);

    $complete = $baseOk && $hhOk && $hasRequiredDocs;
    carelink_set_profile_completed_flag($conn, $user_id, $complete);

    // If parent is now "complete", move verification into the PESO queue.
    if ($complete) {
        $q = $conn->prepare(
            "UPDATE parent_profiles
             SET verification_status = 'Pending',
                 verified_by = NULL,
                 verified_at = NULL,
                 rejected_by = NULL,
                 rejected_at = NULL,
                 rejection_reason = NULL,
                 updated_at = NOW()
             WHERE user_id = ?
               AND (verification_status = 'Unverified'
                    OR verification_status = 'Rejected'
                    OR verification_status IS NULL
                    OR verification_status = '')"
        );
        if ($q) {
            $q->bind_param("i", $user_id);
            $q->execute();
            if ($q->affected_rows > 0) {
                require_once __DIR__ . '/notify_peso_staff.php';
                $nameRow = $conn->query("SELECT CONCAT(first_name,' ',last_name) AS n FROM users WHERE user_id = " . (int)$user_id)->fetch_assoc();
                $nm = $nameRow ? $nameRow['n'] : 'A parent';
                notifyAllPesoStaff(
                    $conn,
                    'peso_queue_user',
                    'Parent ready for verification',
                    $nm . ' completed their profile and is in the PESO verification queue.',
                    'account',
                    $user_id
                );
            }
            $q->close();
        }
    }
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
