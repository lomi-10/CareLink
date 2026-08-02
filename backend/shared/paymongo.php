<?php
/**
 * shared/paymongo.php — thin PayMongo API client.
 *
 * Keys come from carelink_cfg() (real env var first, then config.local.php),
 * the same portable-config path DB and mail credentials already use. They are
 * NEVER in code and NEVER in the database.
 *
 * Config keys expected:
 *   PAYMONGO_SECRET_KEY    sk_test_... / sk_live_...
 *   PAYMONGO_PUBLIC_KEY    pk_test_... (frontend, optional)
 *   PAYMONGO_WEBHOOK_SECRET  whsk_...  (verifies incoming webhooks)
 *
 * Money is handled in CENTAVOS everywhere, because that is what the PayMongo
 * API expects and floats have no business near currency. ₱99 => 9900.
 */

require_once __DIR__ . '/../load_config.php';

const PAYMONGO_API = 'https://api.paymongo.com/v1';

/** Prices in centavos, single source of truth. */
const PRICE_FEATURED_BOOST = 9900;   // ₱99   one-off, 7-day boost
const PRICE_PLUS_MONTHLY   = 14900;  // ₱149  per month
const PRICE_PLACEMENT_FEE  = 19900;  // ₱199  one-off on a completed hire

/** Share of the placement fee accrued for PESO Ormoc City (not auto-disbursed). */
const PESO_REVENUE_SHARE = 0.30;

/** CareLink Plus loyalty discount applied to the placement fee. */
const PLUS_PLACEMENT_DISCOUNT = 0.20;

/** Days a boosted post stays on top. */
const BOOST_DURATION_DAYS = 7;

function carelink_paymongo_configured(): bool
{
    return trim((string) carelink_cfg('PAYMONGO_SECRET_KEY', '')) !== '';
}

/**
 * One authenticated call to PayMongo.
 *
 * @return array{ok:bool, status:int, body:array, error:?string}
 */
function carelink_paymongo_request(string $method, string $path, array $payload = null): array
{
    $key = trim((string) carelink_cfg('PAYMONGO_SECRET_KEY', ''));
    if ($key === '') {
        return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'Payments are not configured on this server.'];
    }

    $ch = curl_init(PAYMONGO_API . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => [
            // PayMongo uses HTTP Basic with the secret key as the username and
            // an empty password.
            'Authorization: Basic ' . base64_encode($key . ':'),
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }

    $raw    = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlEr = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        error_log('PayMongo transport error: ' . $curlEr);
        return ['ok' => false, 'status' => 0, 'body' => [], 'error' => 'Could not reach the payment provider.'];
    }

    $body = json_decode((string) $raw, true) ?: [];
    if ($status < 200 || $status >= 300) {
        // Log the provider's reason for us; return something safe for the user.
        $detail = $body['errors'][0]['detail'] ?? ('HTTP ' . $status);
        error_log('PayMongo error ' . $status . ': ' . $detail);
        return ['ok' => false, 'status' => $status, 'body' => $body, 'error' => $detail];
    }

    return ['ok' => true, 'status' => $status, 'body' => $body, 'error' => null];
}

/**
 * Create a hosted Checkout Session and return its URL.
 *
 * Hosted checkout is deliberate: card details never touch CareLink's servers,
 * so there is nothing to tokenize, log or accidentally store.
 *
 * @param array $meta Small key/value pairs echoed back on the webhook. This is
 *                    how a payment is tied to the row it belongs to.
 * @return array{ok:bool, url:?string, id:?string, error:?string}
 */
function carelink_paymongo_checkout(
    string $description,
    int $amountCentavos,
    array $meta,
    string $successUrl,
    string $cancelUrl
): array {
    $res = carelink_paymongo_request('POST', '/checkout_sessions', [
        'data' => [
            'attributes' => [
                'billing'              => null,
                'send_email_receipt'   => true,
                'show_description'     => true,
                'show_line_items'      => true,
                'description'          => $description,
                'line_items'           => [[
                    'currency' => 'PHP',
                    'amount'   => $amountCentavos,
                    'name'     => $description,
                    'quantity' => 1,
                ]],
                'payment_method_types' => ['gcash', 'paymaya', 'card', 'dob'],
                'success_url'          => $successUrl,
                'cancel_url'           => $cancelUrl,
                'metadata'             => array_map('strval', $meta),
            ],
        ],
    ]);

    if (!$res['ok']) {
        return ['ok' => false, 'url' => null, 'id' => null, 'error' => $res['error']];
    }

    return [
        'ok'    => true,
        'url'   => $res['body']['data']['attributes']['checkout_url'] ?? null,
        'id'    => $res['body']['data']['id'] ?? null,
        'error' => null,
    ];
}

/**
 * Verify a webhook really came from PayMongo.
 *
 * Header format:  t=<unix>,te=<test signature>,li=<live signature>
 * Signed payload: "<t>.<raw body>" HMAC-SHA256 with the webhook secret.
 *
 * Returns false on any doubt — an unverified webhook must never move money.
 */
function carelink_paymongo_verify_webhook(string $rawBody, string $signatureHeader): bool
{
    $secret = trim((string) carelink_cfg('PAYMONGO_WEBHOOK_SECRET', ''));
    if ($secret === '' || $signatureHeader === '') {
        return false;
    }

    $parts = [];
    foreach (explode(',', $signatureHeader) as $chunk) {
        $kv = explode('=', trim($chunk), 2);
        if (count($kv) === 2) {
            $parts[$kv[0]] = $kv[1];
        }
    }
    $t = $parts['t'] ?? '';
    if ($t === '') {
        return false;
    }

    // Reject anything older than 5 minutes so a captured webhook can't be
    // replayed later.
    if (abs(time() - (int) $t) > 300) {
        error_log('PayMongo webhook rejected: timestamp outside tolerance.');
        return false;
    }

    $expected = hash_hmac('sha256', $t . '.' . $rawBody, $secret);
    foreach (['te', 'li'] as $k) {
        if (!empty($parts[$k]) && hash_equals($expected, $parts[$k])) {
            return true;
        }
    }
    return false;
}

/** Split a gross fee into the PESO share and the platform share. */
function carelink_split_placement_fee(int $grossCentavos): array
{
    $peso = (int) round($grossCentavos * PESO_REVENUE_SHARE);
    return ['peso' => $peso, 'platform' => $grossCentavos - $peso];
}

/** Centavos -> pesos, for storing in DECIMAL(10,2) columns. */
function carelink_centavos_to_pesos(int $centavos): string
{
    return number_format($centavos / 100, 2, '.', '');
}
