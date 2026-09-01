<?php
/**
 * schema_report.php — read-only fingerprint of this server's database schema.
 *
 * WHY
 *
 * migrate.php can tell you a TABLE is missing. Nothing could tell you a
 * COLUMN was, and column drift is the more dangerous of the two: a missing
 * table fails loudly on the first query, while a missing column fails only on
 * the one screen that selects it, often long after you stopped looking.
 *
 * Local and live drift apart for ordinary reasons — a column added by hand in
 * phpMyAdmin months ago, a column dropped locally that no ALTER ever removed
 * from the server (helper_profiles.contact_number is exactly this), an ensure_*
 * helper written after the server was already built.
 *
 * This endpoint reports what the schema IS. It compares nothing and changes
 * nothing; tools/schema-diff.php does the comparing, on your machine, where
 * the local database is.
 *
 * WHAT IT RETURNS
 *
 *   create   SHOW CREATE TABLE, verbatim. The authoritative form — it carries
 *            defaults, collations, key order and constraints exactly, which a
 *            hand-built column list always gets subtly wrong.
 *   columns  The same information flattened, for readable diffs.
 *
 * SAFETY
 *
 * SELECT and SHOW only. No writes of any kind. It is still token-gated, with
 * the same MIGRATE_TOKEN as migrate.php: a schema listing is a map of the
 * application for anyone probing it, and there is no reason to publish one.
 *
 *   curl -X POST https://api.carelink-ph.com/carelink_api/schema_report.php \
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
    echo json_encode([
        'success' => false,
        'message' => 'MIGRATE_TOKEN is not set in backend/config.local.php on this server.',
    ]);
    exit;
}

$supplied = $_SERVER['HTTP_X_CARELINK_MIGRATE_TOKEN'] ?? ($_POST['token'] ?? '');
if (!is_string($supplied) || !hash_equals($expected, $supplied)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden.']);
    exit;
}

require_once __DIR__ . '/dbcon.php';

$dbName = (string) $conn->query('SELECT DATABASE() AS d')->fetch_assoc()['d'];

$tables = [];
$res = $conn->query('SHOW TABLES');
while ($row = $res->fetch_array()) {
    $tables[] = $row[0];
}
sort($tables);

$out = [];
foreach ($tables as $t) {
    $entry = ['create' => null, 'columns' => []];

    $r = $conn->query('SHOW CREATE TABLE `' . $conn->real_escape_string($t) . '`');
    if ($r && ($row = $r->fetch_array())) {
        // Strip the trailing AUTO_INCREMENT=<n> table option. It reflects how
        // many rows have ever been inserted, so it differs between any two
        // servers that have seen different traffic — reporting it would make
        // every table look changed on every run.
        $entry['create'] = preg_replace('/\s*AUTO_INCREMENT=\d+/', '', (string) $row[1]);
    }

    $stmt = $conn->prepare(
        "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA,
                COLLATION_NAME, ORDINAL_POSITION
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION"
    );
    $stmt->bind_param('s', $t);
    $stmt->execute();
    $cols = $stmt->get_result();
    while ($c = $cols->fetch_assoc()) {
        $entry['columns'][$c['COLUMN_NAME']] = [
            'type'      => $c['COLUMN_TYPE'],
            'nullable'  => $c['IS_NULLABLE'] === 'YES',
            'default'   => $c['COLUMN_DEFAULT'],
            'extra'     => $c['EXTRA'],
            'collation' => $c['COLLATION_NAME'],
            'position'  => (int) $c['ORDINAL_POSITION'],
        ];
    }
    $stmt->close();

    $out[$t] = $entry;
}

echo json_encode([
    'success'      => true,
    'database'     => $dbName,
    'server'       => $conn->server_info,
    'generated_at' => date('c'),
    'table_count'  => count($out),
    'tables'       => $out,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
