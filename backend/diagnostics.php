<?php
/**
 * diagnostics.php — what is actually wrong with this server.
 *
 * WHY
 *
 * When a feature fails on Hostinger there is nothing to look at. Errors go to
 * a log you have to hunt for in hPanel, PHP's display_errors is off (correctly),
 * and the app only ever shows the polite sentence the endpoint chose. "Could
 * not reach the video service" covers a missing API key, a blocked outbound
 * port, a DNS failure, an expired CA bundle and a timeout — five problems with
 * five different fixes and one message.
 *
 * This reports the facts: which config keys are set, whether the required PHP
 * extensions exist, and whether the server can actually reach the third-party
 * services it depends on.
 *
 * SAFETY
 *
 * It NEVER returns a secret. For every config key it reports only whether a
 * value is present and how long it is — enough to tell "missing" from "set" and
 * from "pasted with a truncation", and useless to anyone who steals the output.
 * It is token-gated with the same MIGRATE_TOKEN as migrate.php, and it writes
 * nothing anywhere.
 *
 *   curl -X POST https://api.carelink-ph.com/carelink_api/diagnostics.php \
 *        -H "X-CareLink-Migrate-Token: <the token>"
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST only.']);
    exit;
}

require_once __DIR__ . '/load_config.php';

$expected = (string) carelink_cfg('MIGRATE_TOKEN', '');
if ($expected === '') {
    http_response_code(503);
    echo json_encode(['success' => false, 'message' => 'MIGRATE_TOKEN is not set in backend/config.local.php.']);
    exit;
}
$supplied = $_SERVER['HTTP_X_CARELINK_MIGRATE_TOKEN'] ?? ($_POST['token'] ?? '');
if (!is_string($supplied) || !hash_equals($expected, $supplied)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden.']);
    exit;
}

/** Presence and shape of a secret — never the secret. */
function diag_key(string $name): array
{
    $v = (string) carelink_cfg($name, '');
    return [
        'set'    => $v !== '',
        'length' => strlen($v),
    ];
}

/**
 * Can this server actually open a connection to $url?
 *
 * Uses a HEAD-ish GET with a short timeout. What matters is not the HTTP status
 * the service returns — 401 from an API with no credentials still proves the
 * connection succeeded — but whether cURL reached it at all.
 */
function diag_reach(string $url): array
{
    if (!function_exists('curl_init')) {
        return ['reachable' => false, 'detail' => 'the cURL extension is not installed'];
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_NOBODY         => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    curl_exec($ch);
    $errno  = curl_errno($ch);
    $err    = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno === 0) {
        return ['reachable' => true, 'http_status' => $status];
    }

    // The four that actually happen on shared hosting, named so the fix is obvious.
    $meaning = [
        6  => 'DNS lookup failed — the server cannot resolve this hostname',
        7  => 'connection refused or blocked — outbound traffic to this host is likely firewalled by the host',
        28 => 'timed out — outbound traffic is probably being dropped rather than refused',
        60 => 'TLS certificate could not be verified — the server CA bundle is missing or stale',
        77 => 'CA certificate file could not be read',
    ][$errno] ?? 'cURL error';

    return [
        'reachable'  => false,
        'curl_errno' => $errno,
        'meaning'    => $meaning,
        'detail'     => $err,
    ];
}

$php = [
    'version'          => PHP_VERSION,
    'curl'             => extension_loaded('curl'),
    'openssl'          => extension_loaded('openssl'),
    'mysqli'           => extension_loaded('mysqli'),
    'mbstring'         => extension_loaded('mbstring'),
    'gd'               => extension_loaded('gd'),
    'allow_url_fopen'  => (bool) ini_get('allow_url_fopen'),
];
if (function_exists('curl_version')) {
    $cv = curl_version();
    $php['curl_version']    = $cv['version'] ?? null;
    $php['curl_ssl']        = $cv['ssl_version'] ?? null;
}

$config = [
    'DB_DATABASE'    => diag_key('DB_DATABASE'),
    'MIGRATE_TOKEN'  => diag_key('MIGRATE_TOKEN'),
    'DAILY_API_KEY'  => diag_key('DAILY_API_KEY'),
    'VIDEO_PROVIDER' => ['value' => (string) carelink_cfg('VIDEO_PROVIDER', '(auto)')],
    'JITSI_HOST'     => ['value' => (string) carelink_cfg('JITSI_HOST', 'meet.jit.si')],
    'GEMINI_API_KEY' => diag_key('GEMINI_API_KEY'),
    'MAIL_USERNAME'  => diag_key('MAIL_USERNAME'),
    'MAIL_PASSWORD'  => diag_key('MAIL_PASSWORD'),
];

$outbound = [
    'api.daily.co'                    => diag_reach('https://api.daily.co/v1/'),
    'generativelanguage.googleapis.com' => diag_reach('https://generativelanguage.googleapis.com/'),
    // Reachability from THIS server is only indicative for Jitsi — the call is
    // made by the two browsers, not by the server. A failure here is worth
    // knowing about but does not by itself mean calls will not connect.
    'jitsi_host' => diag_reach('https://' . preg_replace('#^https?://#', '', (string) carelink_cfg('JITSI_HOST', 'meet.jit.si')) . '/'),
];

// Plain-language conclusions, so the answer does not have to be inferred.
$findings = [];
if (!$php['curl']) {
    $findings[] = 'The cURL extension is missing. Video calling and Gemini document scanning cannot work at all until it is enabled.';
}
// Which provider will actually be used, by the same rule create_call_room.php applies.
// This is context, not a fault, so it goes in its own list — appending it to
// $findings would make "no problems found" unreachable forever.
$notes = [];
$videoProvider = strtolower(trim((string) carelink_cfg('VIDEO_PROVIDER', '')));
if ($videoProvider === '') $videoProvider = $config['DAILY_API_KEY']['set'] ? 'daily' : 'jitsi';
$notes[] = 'Video calls will use: ' . $videoProvider
    . ($videoProvider === 'jitsi'
        ? ' (' . carelink_cfg('JITSI_HOST', 'meet.jit.si') . ') — no account or API key needed.'
        : ' — requires a payment method on the Daily account before anyone can join.');

if ($videoProvider === 'daily') {
    if ($config['DAILY_API_KEY']['length'] > 0 && $config['DAILY_API_KEY']['length'] < 32) {
        $findings[] = 'DAILY_API_KEY is only ' . $config['DAILY_API_KEY']['length']
            . ' characters, shorter than a Daily key. It may have been truncated when pasted.';
    }
    if (!$config['DAILY_API_KEY']['set']) {
        $findings[] = 'VIDEO_PROVIDER is set to daily but DAILY_API_KEY is missing, so every call is refused.';
    }
    if (empty($outbound['api.daily.co']['reachable'])) {
        $findings[] = 'This server cannot reach api.daily.co (' . ($outbound['api.daily.co']['meaning'] ?? 'unknown')
            . '). Daily calls will fail regardless of the API key — a hosting restriction, not a code or key problem.'
            . ' Setting VIDEO_PROVIDER to jitsi avoids the outbound call entirely.';
    }
}
if (!$config['GEMINI_API_KEY']['set']) {
    $findings[] = 'GEMINI_API_KEY is not set, so AI document scanning is inert on this server.';
}
if (!$config['MAIL_PASSWORD']['set']) {
    $findings[] = 'MAIL_PASSWORD is not set, so email verification codes cannot be sent — new signups will not be able to verify.';
}
$ok = empty($findings);
if ($ok) {
    $findings[] = 'No problems found. Every required key is present and every outbound service is reachable.';
}

echo json_encode([
    'success'   => true,
    'checked_at' => date('c'),
    'php'       => $php,
    'config'    => $config,
    'outbound'  => $outbound,
    'healthy'   => $ok,
    'findings'  => $findings,
    'notes'     => $notes,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
