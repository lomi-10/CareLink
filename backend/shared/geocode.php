<?php
/**
 * shared/geocode.php — server-side fallback geocoder.
 *
 * WHY THIS EXISTS: LocationSearchInput only sets latitude/longitude when the
 * user picks a Nominatim suggestion. Nominatim's Philippine barangay coverage
 * is patchy, so many testers type the address manually into the province/
 * municipality/barangay fields instead — which never touches onSelect, so
 * latitude/longitude stay NULL. Distance is 10 of 100 matching points, so a
 * helper with no coordinates silently loses them with no visible error.
 *
 * This runs the same lookup server-side, once, right before saving, as a
 * catch-all for every entry path (mobile, web, future ones) rather than
 * wiring geocode-on-blur into each form separately.
 */

if (!function_exists('carelink_geocode_ph')) {

    /**
     * Best-effort geocode of a PH barangay/municipality/province address.
     * Falls back from the full address to municipality-only, so distance is
     * approximate rather than absent. Never throws — a failed lookup just
     * means the coordinates stay null, same as today.
     *
     * @return array{lat:float, lng:float}|null
     */
    function carelink_geocode_ph(string $barangay, string $municipality, string $province): ?array
    {
        if ($municipality === '' && $province === '') return null;

        $attempts = [];
        if ($barangay !== '') {
            $attempts[] = trim("$barangay, $municipality, $province");
        }
        if ($municipality !== '') {
            $attempts[] = trim("$municipality, $province");
        }

        foreach (array_unique($attempts) as $query) {
            $result = carelink_geocode_lookup($query);
            if ($result !== null) return $result;
        }
        return null;
    }

    /** One Nominatim lookup. Returns null on any failure — never fatal. */
    function carelink_geocode_lookup(string $query): ?array
    {
        if ($query === '' || !function_exists('curl_init')) return null;

        $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
            'q'             => $query . ', Philippines',
            'format'        => 'json',
            'countrycodes'  => 'ph',
            'limit'         => 1,
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_HTTPHEADER     => ['User-Agent: CareLink-App/1.0 (carelink.app)'],
        ]);
        $body = curl_exec($ch);
        $ok   = $body !== false && curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
        curl_close($ch);

        if (!$ok) return null;

        $data = json_decode((string) $body, true);
        if (!is_array($data) || empty($data[0]['lat']) || empty($data[0]['lon'])) return null;

        return ['lat' => (float) $data[0]['lat'], 'lng' => (float) $data[0]['lon']];
    }
}
