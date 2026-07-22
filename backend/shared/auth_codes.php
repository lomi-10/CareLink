<?php
/**
 * shared/auth_codes.php — issue & verify one-time codes (email verification,
 * password reset).
 *
 * Security decisions, so they live in one place instead of four endpoints:
 *  • Codes are generated with random_int() (CSPRNG) — never rand()/mt_rand().
 *  • Codes are stored HASHED (password_hash). A DB leak must not hand out
 *    working reset codes.
 *  • 15-minute expiry.
 *  • Max 5 wrong attempts per code, then it's dead — stops brute-forcing a
 *    6-digit code (1M combos is guessable at unlimited speed).
 *  • Issuing a new code consumes all previous unused ones for that purpose.
 *  • 60-second resend cooldown — stops using our SMTP as a mail bomb.
 */

const CARELINK_CODE_TTL_SECONDS  = 900; // 15 minutes
const CARELINK_CODE_MAX_ATTEMPTS = 5;
const CARELINK_CODE_COOLDOWN_SEC = 60;

/** True when the user asked for a code less than the cooldown ago. */
function carelink_code_on_cooldown(mysqli $conn, int $userId, string $purpose): bool
{
    $sql = "SELECT created_at FROM auth_codes
            WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL
            ORDER BY created_at DESC LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('is', $userId, $purpose);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) return false;

    return (time() - strtotime($row['created_at'])) < CARELINK_CODE_COOLDOWN_SEC;
}

/**
 * Issue a fresh 6-digit code, invalidating any earlier unused ones.
 * @return string the PLAINTEXT code — email it, never store or log it.
 */
function carelink_issue_code(mysqli $conn, int $userId, string $purpose, ?string $pendingValue = null): string
{
    // Retire older codes so only the newest email works.
    $del = $conn->prepare("UPDATE auth_codes SET consumed_at = NOW()
                           WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL");
    $del->bind_param('is', $userId, $purpose);
    $del->execute();
    $del->close();

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $hash = password_hash($code, PASSWORD_DEFAULT);
    $expires = date('Y-m-d H:i:s', time() + CARELINK_CODE_TTL_SECONDS);

    // pending_value binds a code to the exact new value it was issued for (e.g. the
    // new email/contact), so a code obtained for one value can't confirm another.
    $ins = $conn->prepare("INSERT INTO auth_codes (user_id, purpose, code_hash, pending_value, expires_at)
                           VALUES (?, ?, ?, ?, ?)");
    $ins->bind_param('issss', $userId, $purpose, $hash, $pendingValue, $expires);
    $ins->execute();
    $ins->close();

    return $code;
}

/**
 * Check a submitted code.
 * @return array{ok: bool, message: string}
 */
function carelink_verify_code(mysqli $conn, int $userId, string $purpose, string $code): array
{
    $code = trim($code);
    if (!preg_match('/^\d{6}$/', $code)) {
        return ['ok' => false, 'message' => 'Enter the 6-digit code from your email.'];
    }

    $sql = "SELECT code_id, code_hash, pending_value, expires_at, attempts FROM auth_codes
            WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL
            ORDER BY created_at DESC LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('is', $userId, $purpose);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return ['ok' => false, 'message' => 'No active code. Please request a new one.'];
    }
    if (strtotime($row['expires_at']) < time()) {
        return ['ok' => false, 'message' => 'That code has expired. Please request a new one.'];
    }
    if ((int) $row['attempts'] >= CARELINK_CODE_MAX_ATTEMPTS) {
        return ['ok' => false, 'message' => 'Too many incorrect attempts. Please request a new code.'];
    }

    if (!password_verify($code, $row['code_hash'])) {
        $bump = $conn->prepare("UPDATE auth_codes SET attempts = attempts + 1 WHERE code_id = ?");
        $bump->bind_param('i', $row['code_id']);
        $bump->execute();
        $bump->close();

        $left = CARELINK_CODE_MAX_ATTEMPTS - ((int) $row['attempts'] + 1);
        return [
            'ok' => false,
            'message' => $left > 0
                ? "That code is incorrect. {$left} attempt" . ($left === 1 ? '' : 's') . ' left.'
                : 'Too many incorrect attempts. Please request a new code.',
        ];
    }

    // Burn it — a code works exactly once.
    $done = $conn->prepare("UPDATE auth_codes SET consumed_at = NOW() WHERE code_id = ?");
    $done->bind_param('i', $row['code_id']);
    $done->execute();
    $done->close();

    // 'value' is the pending_value the code was bound to (null for codes that
    // carry none, e.g. verify_email). Callers that changed a value compare it.
    return ['ok' => true, 'message' => 'Code verified.', 'value' => $row['pending_value']];
}
