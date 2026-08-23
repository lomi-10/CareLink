<?php
/**
 * shared/auth_tokens.php — real proof of who is calling.
 *
 * THE PROBLEM THIS SOLVES
 * Every protected endpoint decided who you were by reading a `requester_id`
 * out of the request and comparing it to the target id. That only proves the
 * two numbers match — it proves nothing about WHO SENT THEM. Anyone could put
 * someone else's id in both fields and be treated as that person.
 *
 * A token fixes it because the caller cannot invent one: it is random, issued
 * only by a successful login, and checked against the database on every use.
 *
 * WHAT IS STORED
 * Only a SHA-256 hash of the token, never the token itself — the same reason
 * passwords are hashed. A leaked database dump then contains nothing that can
 * be replayed as a login.
 *
 * ROLLOUT
 * carelink_require_self() prefers the token when one is present and falls back
 * to the old id comparison when it isn't, so an app build that doesn't send
 * tokens yet keeps working. Set AUTH_STRICT=true in config.local.php to drop
 * the fallback once every client is updated — that is the switch that makes
 * this a real control rather than an improvement.
 */

if (!function_exists('carelink_issue_auth_token')) {

    /** How long a session lasts before the user must sign in again.
     *  define(), not const — `const` is a compile-time construct and is not
     *  permitted inside a conditional block like this function_exists guard. */
    if (!defined('AUTH_TOKEN_TTL_DAYS')) define('AUTH_TOKEN_TTL_DAYS', 30);

    function ensure_auth_tokens_table(mysqli $conn): void
    {
        $conn->query(
            "CREATE TABLE IF NOT EXISTS auth_tokens (
                token_id    INT AUTO_INCREMENT PRIMARY KEY,
                user_id     INT NOT NULL,
                token_hash  CHAR(64) NOT NULL COMMENT 'SHA-256 of the token; the token itself is never stored',
                issued_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at  DATETIME NOT NULL,
                last_used_at DATETIME NULL,
                device_info VARCHAR(255) NULL,
                UNIQUE KEY uniq_token (token_hash),
                INDEX idx_user (user_id),
                INDEX idx_expiry (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci"
        );
    }

    /**
     * Issue a session token for a user who has just proven their password.
     * Returns the RAW token — this is the only moment it exists in plaintext.
     */
    function carelink_issue_auth_token(mysqli $conn, int $userId, ?string $device = null): ?string
    {
        if ($userId <= 0) return null;
        ensure_auth_tokens_table($conn);

        try {
            $token = bin2hex(random_bytes(32));
        } catch (Throwable $e) {
            return null; // no secure randomness available — never fall back to a weak token
        }
        $hash = hash('sha256', $token);
        $ttl  = AUTH_TOKEN_TTL_DAYS;

        $st = $conn->prepare(
            "INSERT INTO auth_tokens (user_id, token_hash, expires_at, device_info)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL $ttl DAY), ?)"
        );
        if (!$st) return null;
        $dev = $device !== null ? mb_substr($device, 0, 255) : null;
        $st->bind_param('iss', $userId, $hash, $dev);
        if (!$st->execute()) { $st->close(); return null; }
        $st->close();

        // Opportunistic cleanup so the table doesn't grow forever.
        $conn->query("DELETE FROM auth_tokens WHERE expires_at < NOW()");

        return $token;
    }

    /** The raw token from the Authorization header, if the caller sent one. */
    function carelink_bearer_token(): ?string
    {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if ($h === '' && function_exists('apache_request_headers')) {
            foreach (apache_request_headers() as $k => $v) {
                if (strcasecmp($k, 'Authorization') === 0) { $h = $v; break; }
            }
        }
        if ($h === '' || stripos($h, 'Bearer ') !== 0) return null;
        $t = trim(substr($h, 7));
        return $t !== '' ? $t : null;
    }

    /**
     * Who is actually calling, according to their token.
     *
     * @return int user_id, or 0 when there is no valid token.
     */
    function carelink_authenticated_user_id(mysqli $conn): int
    {
        static $cached = null;
        if ($cached !== null) return $cached;

        $token = carelink_bearer_token();
        if ($token === null) return $cached = 0;

        ensure_auth_tokens_table($conn);
        $hash = hash('sha256', $token);

        $st = $conn->prepare(
            "SELECT user_id FROM auth_tokens
              WHERE token_hash = ? AND expires_at > NOW() LIMIT 1"
        );
        if (!$st) return $cached = 0;
        $st->bind_param('s', $hash);
        $st->execute();
        $row = $st->get_result()->fetch_assoc();
        $st->close();

        if (!$row) return $cached = 0;

        $upd = $conn->prepare("UPDATE auth_tokens SET last_used_at = NOW() WHERE token_hash = ?");
        if ($upd) { $upd->bind_param('s', $hash); $upd->execute(); $upd->close(); }

        return $cached = (int) $row['user_id'];
    }

    /** Sign out: destroy this session's token so it can never be reused. */
    function carelink_revoke_auth_token(mysqli $conn): void
    {
        $token = carelink_bearer_token();
        if ($token === null) return;
        ensure_auth_tokens_table($conn);
        $hash = hash('sha256', $token);
        $st = $conn->prepare("DELETE FROM auth_tokens WHERE token_hash = ?");
        if ($st) { $st->bind_param('s', $hash); $st->execute(); $st->close(); }
    }

    /**
     * Is token authentication mandatory?
     *
     * Off by default so a client that hasn't been updated yet keeps working.
     * Turn it on in config.local.php once the app is confirmed to send tokens:
     *   'AUTH_STRICT' => true
     */
    function carelink_auth_is_strict(): bool
    {
        require_once __DIR__ . '/../load_config.php';
        $v = carelink_cfg('AUTH_STRICT', false);
        return $v === true || $v === 1 || $v === '1' || $v === 'true';
    }
}
