<?php
/**
 * shared/create_call_room.php — create a private video room for a chat.
 *
 * POST { user_id, requester_id, partner_id } -> { success, url }
 *
 * WHY NOT JITSI ANY MORE: the app used https://meet.jit.si/<room>, which is
 * Jitsi's FREE PUBLIC server. Since 2023 it requires the first participant to
 * authenticate with a Google/Facebook/GitHub account before anyone can join,
 * and it rate-limits and drops calls under load. Testers hit a broken free
 * service, not broken code — so the fix is a provider swap, not a rewrite.
 *
 * WHY DAILY, AND WHY STILL A PLAIN URL: the app has no EAS dev build (there is
 * no eas.json), so it runs under Expo Go, where no native video SDK can be
 * used at all. Keeping the "open a room URL" approach is what lets this work
 * on web and on a phone today without a native rebuild. Daily supplies that
 * URL from a real service instead of a shared free one.
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

    $key = trim((string) carelink_cfg('DAILY_API_KEY', ''));
    if ($key === '') {
        room_out(false, 'Video calling is not set up on this server yet.');
    }

    // Deterministic-ish but unguessable: the pair identifies the conversation,
    // the random suffix stops anyone deriving a colleague's room name.
    $lo   = min($user_id, $partner_id);
    $hi   = max($user_id, $partner_id);
    $name = 'carelink-' . $lo . '-' . $hi . '-' . bin2hex(random_bytes(4));

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
    $res  = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_errno($ch);
    curl_close($ch);

    if ($err !== 0 || !is_string($res)) {
        room_out(false, 'Could not reach the video service. Check your connection and try again.');
    }

    $body = json_decode($res, true);
    if ($code >= 400 || empty($body['url'])) {
        error_log('create_call_room.php: Daily responded ' . $code . ' ' . substr((string) $res, 0, 300));
        room_out(false, 'Could not start the call. Please try again in a moment.');
    }

    room_out(true, 'ok', ['url' => (string) $body['url'], 'expires_in' => CALL_ROOM_TTL_SECONDS]);
} catch (Throwable $e) {
    error_log('create_call_room.php: ' . $e->getMessage());
    room_out(false, 'Could not start the call.');
}
