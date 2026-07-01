<?php
/**
 * ownership_guard.php — reusable "is the caller actually allowed to see/edit
 * this data" checks. Used across GET/POST endpoints that take a target
 * identifier (user_id, parent_id, helper_id, etc.) straight from the request.
 *
 * See SECURITY_NOTES_app_wide_ownership_checks.md (repo root) for the
 * plain-English explanation of why this exists and where it's used.
 */

/**
 * The most common case: "the requester must be the same person as the
 * target." Throws if not, so callers can just call this and continue —
 * matches the existing exception-based error handling already used
 * throughout this codebase.
 */
function carelink_require_self(int $requesterId, int $targetId, string $message = 'You are not allowed to access this resource.'): void
{
    if ($requesterId <= 0 || $targetId <= 0 || $requesterId !== $targetId) {
        throw new Exception($message);
    }
}

/**
 * Same idea, but also allows verified PESO/admin staff through (for
 * endpoints PESO legitimately needs for verification work, e.g. viewing a
 * helper's profile). $requesterType is whatever the caller already
 * sends/knows ('helper' | 'parent' | 'peso' | 'admin').
 */
function carelink_require_self_or_staff(mysqli $conn, int $requesterId, int $targetId, string $requesterType, string $message = 'You are not allowed to access this resource.'): void
{
    if ($requesterId > 0 && $targetId > 0 && $requesterId === $targetId) {
        return; // viewing/editing your own data
    }

    if (in_array($requesterType, ['peso', 'admin'], true) && $requesterId > 0) {
        $st = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = ? AND LOWER(TRIM(status)) = 'approved' LIMIT 1");
        $st->bind_param('is', $requesterId, $requesterType);
        $st->execute();
        $ok = $st->get_result()->fetch_assoc();
        $st->close();
        if ($ok) {
            return;
        }
    }

    throw new Exception($message);
}

/**
 * For endpoints that are deliberately cross-user by design (e.g. a helper
 * browsing a parent's profile before applying to their job) — there's no
 * single "owner," but it should still require a real, existing account
 * asking, not a fully anonymous request with a made-up number.
 */
function carelink_require_authenticated_user(mysqli $conn, int $requesterId, string $message = 'You must be logged in to view this.'): void
{
    if ($requesterId <= 0) {
        throw new Exception($message);
    }
    $st = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? LIMIT 1");
    $st->bind_param('i', $requesterId);
    $st->execute();
    $ok = $st->get_result()->fetch_assoc();
    $st->close();
    if (!$ok) {
        throw new Exception($message);
    }
}
