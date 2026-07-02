<?php
/**
 * load_config.php — portable configuration loader.
 *
 * Lets the backend run on hosts WITHOUT an environment-variable dashboard
 * (e.g. free shared hosting like InfinityFree) while still preferring real
 * environment variables when they exist (e.g. Railway / a VPS).
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
