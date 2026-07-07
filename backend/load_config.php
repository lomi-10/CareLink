<?php
/**
 * load_config.php — portable configuration loader.
 *
 * Lets the backend run on hosts WITHOUT an environment-variable dashboard
 * (typical shared hosting such as Hostinger) while still preferring real
 * environment variables when they exist (e.g. a VPS / PaaS).
 *
 * Precedence: real env var (getenv) → backend/config.local.php → default.
 *
 * Create backend/config.local.php (gitignored) from config.local.php.example
 * and put your DB credentials + GEMINI_API_KEY there. NEVER commit that file.
 */

if (!isset($GLOBALS['__carelink_cfg'])) {
    $GLOBALS['__carelink_cfg'] = [];
    $local = __DIR__ . '/config.local.php';
    if (is_file($local)) {
        $loaded = include $local;
        if (is_array($loaded)) {
            $GLOBALS['__carelink_cfg'] = $loaded;
        }
    }
}

if (!function_exists('carelink_url_scheme')) {
    /**
     * Correct URL scheme for building absolute asset URLs. Returns 'https://'
     * when the request is served over HTTPS (Hostinger/SSL, or behind a proxy),
     * else 'http://' (local Laragon). Avoids mixed-content blocking of images
     * when the frontend is on HTTPS.
     */
    function carelink_url_scheme(): string
    {
        $https =
            (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off')
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
            || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);
        return $https ? 'https://' : 'http://';
    }
}

if (!function_exists('carelink_cfg')) {
    /**
     * Read a config value: environment variable first, then config.local.php,
     * then the provided default.
     */
    function carelink_cfg(string $key, $default = null)
    {
        $env = getenv($key);
        if ($env !== false && $env !== '') {
            return $env;
        }
        return $GLOBALS['__carelink_cfg'][$key] ?? $default;
    }
}
