<?php
/**
 * shared/create_call_room.php — create a private video room for a chat.
 *
 * POST { user_id, requester_id, partner_id } -> { success, url }
 *
 * TWO PROVIDERS, because they fail in opposite ways:
 *
 *   jitsi (default)  A URL on a public Jitsi server. No account, no API key,
 *                    no card, and no outbound API call from this server — so
 *                    it cannot be broken by a blocked port or a missing key.
 *                    In exchange there is no server-side expiry, and public
 *                    instances have at times demanded the first participant
 *                    sign in with Google/Facebook/GitHub.
 *
 *   daily            A real provisioned room with a two-hour expiry, created
 *                    through Daily's API. Needs DAILY_API_KEY, and Daily now
 *                    requires a payment method on the account before anyone
 *                    can join — free minutes included, but a card on file.
 *
 * Set VIDEO_PROVIDER in config.local.php to force one. With nothing set, a
 * server that has a Daily key uses Daily and every other server uses Jitsi,
 * so video calling works out of the box rather than reporting itself unset.
 *
 * WHY STILL A PLAIN URL, now that eas.json exists: no EAS build has actually
 * been produced, so the app still runs under Expo Go, where no native video
 * SDK can be used. Opening a room URL is what lets this work on web and on a
 * phone today with no native rebuild, and it keeps working afterwards.
 *
 * Rooms are named carelink-<lowerUserId>-<higherUserId>-<random>. The pair
 * identifies the conversation; the random suffix is what stops anyone deriving
 * a colleague's room name, and on Jitsi it is the ONLY access control there is.
 *
 * Rooms expire (`exp`), so a link posted in a chat cannot be rejoined weeks
 * later by anyone who scrolls back to it.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../load_config.php';
require_once __DIR__ . '/ownership_guard.php';

/** How long a call link stays joinable. */
const CALL_ROOM_TTL_SECONDS = 7200; // 2 hours

function room_out(bool $ok, string $msg, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    $input        = json_decode(file_get_contents('php://input'), true) ?? [];
    $user_id      = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $requester_id = isset($input['requester_id']) ? (int) $input['requester_id'] : 0;
    $partner_id   = isset($input['partner_id']) ? (int) $input['partner_id'] : 0;

    if ($user_id <= 0 || $partner_id <= 0) room_out(false, 'user_id and partner_id are required.');
    carelink_require_self($requester_id, $user_id, 'You are not allowed to start a call as this account.');

    // Deterministic-ish but unguessable: the pair identifies the conversation,
    // the random suffix stops anyone deriving a colleague's room name.
    $lo   = min($user_id, $partner_id);
    $hi   = max($user_id, $partner_id);
    $name = 'carelink-' . $lo . '-' . $hi . '-' . bin2hex(random_bytes(4));

    $key = trim((string) carelink_cfg('DAILY_API_KEY', ''));

    // Provider choice, in order: an explicit VIDEO_PROVIDER, else Daily when a
    // key exists, else Jitsi. The default has to be the one needing no account,
    // because a server with nothing configured should still be able to place a
    // call rather than fail with 'not set up yet' and no way forward.
    $provider = strtolower(trim((string) carelink_cfg('VIDEO_PROVIDER', '')));
    if ($provider === '') $provider = $key !== '' ? 'daily' : 'jitsi';

    if ($provider === 'jitsi') {
        // No API call, no key, no account, no card. The room springs into
        // existence when the first person opens the URL.
        //
        // HONEST LIMITS, so nobody discovers these during a demo:
        //  - There is no server-side expiry. A Daily room dies after two hours;
        //    a Jitsi link stays valid forever, so anyone who scrolls the chat
        //    back can reopen that room. The unguessable name is the only
        //    control, which is why the random suffix is not optional here.
        //  - meet.jit.si has at times required the FIRST participant to sign in
        //    with Google/Facebook/GitHub before others may join. Test the link
        //    before relying on it, and point JITSI_HOST at another instance or
        //    your own if that behaviour is back.
        $host = trim((string) carelink_cfg('JITSI_HOST', 'meet.jit.si'));
        $host = preg_replace('#^https?://#', '', $host);
        $host = rtrim((string) $host, '/');
        if ($host === '') $host = 'meet.jit.si';

        room_out(true, 'ok', [
            'url'        => 'https://' . $host . '/' . rawurlencode($name),
            'provider'   => 'jitsi',
            'expires_in' => null, // Jitsi rooms do not expire; see above.
        ]);
    }

    if ($key === '') {
        room_out(false, 'Video calling is set to Daily on this server, but DAILY_API_KEY is missing from config.local.php.');
    }

    $payload = json_encode([
        'name'       => $name,
        'privacy'    => 'public', // unguessable name + short expiry is the control
        'properties' => [
            'exp'                => time() + CALL_ROOM_TTL_SECONDS,
            'enable_prejoin_ui'  => true,  // lets each side check camera/mic first
            'enable_chat'        => true,
            'enable_screenshare' => true,
            'max_participants'   => 2,
        ],
    ]);

    $ch = curl_init('https://api.daily.co/v1/rooms');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $key,
        ],
    ]);
    $res     = curl_exec($ch);
    $code    = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err     = curl_errno($ch);
    $errText = curl_error($ch);
    curl_close($ch);

    if ($err !== 0 || !is_string($res)) {
        // The cURL error used to be thrown away, leaving an unfixable message:
        // "check your connection" is wrong advice when it is the SERVER that
        // cannot reach Daily. errno 6 is DNS, 7 is a blocked outbound port,
        // 28 is a timeout, 60 is a missing CA bundle — four different fixes.
        error_log(sprintf('create_call_room.php: cURL errno=%d %s', $err, $errText));
        room_out(false,
            'The server could not reach the video service (error ' . $err . '). '
            . 'This is a server-side problem, not your connection. Run diagnostics.php.',
            ['curl_errno' => $err]);
    }

    $body = json_decode($res, true);
    if ($code >= 400 || empty($body['url'])) {
        error_log('create_call_room.php: Daily responded ' . $code . ' ' . substr((string) $res, 0, 300));
        room_out(false, 'Could not start the call. Please try again in a moment.');
    }

    room_out(true, 'ok', ['url' => (string) $body['url'], 'provider' => 'daily', 'expires_in' => CALL_ROOM_TTL_SECONDS]);
} catch (Throwable $e) {
    error_log('create_call_room.php: ' . $e->getMessage());
    room_out(false, 'Could not start the call.');
}
