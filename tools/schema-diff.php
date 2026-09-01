<?php
/**
 * tools/schema-diff.php — compare your local database against the live one.
 *
 * Lives OUTSIDE backend/, so it is never uploaded to the server. It is a
 * developer tool and it holds your migrate token on the command line.
 *
 * USAGE
 *
 *   php tools/schema-diff.php --token=<your MIGRATE_TOKEN>
 *
 *   Optional:
 *     --url=https://api.carelink-ph.com/carelink_api   (default)
 *     --db=carelink        local database name (default)
 *     --user=root --pass= --host=localhost --port=3306
 *     --out=tools/out      where the generated .sql files go
 *
 * WHAT IT DOES
 *
 * Pulls the live schema from backend/schema_report.php, reads your local one
 * directly, and reports every difference: tables on one side only, columns on
 * one side only, and columns whose definition differs.
 *
 * Then it writes TWO files, because "make them match" has two directions and
 * only you know which side is right:
 *
 *   fix-live.sql    run on the SERVER to make live look like local
 *   fix-local.sql   run on LARAGON to make local look like live
 *
 * Additive statements (ADD COLUMN, CREATE TABLE) are written first and are
 * safe. Anything that destroys data — DROP COLUMN, DROP TABLE, a type change
 * that could truncate — is written at the bottom under a REVIEW banner and
 * commented out. You uncomment what you actually want. A schema tool that
 * silently emits DROP is a schema tool that eventually deletes a column
 * somebody's data was in.
 *
 * This script never writes to either database. It only prints and generates.
 */

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
$args = [];
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--([a-z_]+)=?(.*)$/', $a, $m)) {
        $args[$m[1]] = $m[2];
    }
}

$token = $args['token'] ?? '';
$url   = rtrim($args['url'] ?? 'https://api.carelink-ph.com/carelink_api', '/');
$db    = $args['db']   ?? 'carelink';
$host  = $args['host'] ?? 'localhost';
$user  = $args['user'] ?? 'root';
$pass  = $args['pass'] ?? '';
$port  = (int) ($args['port'] ?? 3306);
$outDir = rtrim($args['out'] ?? __DIR__ . '/out', '/');

if ($token === '') {
    fwrite(STDERR, "Missing --token=<your MIGRATE_TOKEN>\n");
    fwrite(STDERR, "It is the value you put in backend/config.local.php on the server.\n");
    exit(1);
}

// ---------------------------------------------------------------------------
// Live schema
// ---------------------------------------------------------------------------
fwrite(STDOUT, "Fetching live schema from $url ...\n");

$ch = curl_init($url . '/schema_report.php');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => '',
    CURLOPT_HTTPHEADER     => ['X-CareLink-Migrate-Token: ' . $token],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 60,
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($body === false) {
    fwrite(STDERR, "Could not reach the server: $curlErr\n");
    exit(1);
}
$live = json_decode((string) $body, true);
if (!is_array($live) || empty($live['success'])) {
    fwrite(STDERR, "Live server returned HTTP $code:\n" . substr((string) $body, 0, 500) . "\n");
    if ($code === 403) {
        fwrite(STDERR, "\n403 means the token did not match backend/config.local.php on the server.\n");
    } elseif ($code === 404) {
        fwrite(STDERR, "\n404 means schema_report.php is not deployed yet — push to main first.\n");
    }
    exit(1);
}

// ---------------------------------------------------------------------------
// Local schema — same shape, read straight from MySQL
// ---------------------------------------------------------------------------
$conn = @mysqli_connect($host, $user, $pass, $db, $port);
if (!$conn) {
    fwrite(STDERR, "Could not connect to local database '$db': " . mysqli_connect_error() . "\n");
    fwrite(STDERR, "Is Laragon running? Override with --db= --user= --pass=\n");
    exit(1);
}

$localTables = [];
$res = $conn->query('SHOW TABLES');
while ($row = $res->fetch_array()) {
    $localTables[] = $row[0];
}
sort($localTables);

$local = [];
foreach ($localTables as $t) {
    $entry = ['create' => null, 'columns' => []];
    $r = $conn->query('SHOW CREATE TABLE `' . $conn->real_escape_string($t) . '`');
    if ($r && ($row = $r->fetch_array())) {
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
    $local[$t] = $entry;
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------
$liveTables = $live['tables'];
$onlyLocal = array_values(array_diff(array_keys($local), array_keys($liveTables)));
$onlyLive  = array_values(array_diff(array_keys($liveTables), array_keys($local)));
$shared    = array_values(array_intersect(array_keys($local), array_keys($liveTables)));

/** The column's line from SHOW CREATE TABLE — exact defaults, collation, generated expressions. */
function column_ddl(string $create, string $col): ?string
{
    foreach (preg_split('/\r?\n/', $create) as $line) {
        $trim = trim($line);
        if (str_starts_with($trim, '`' . $col . '`')) {
            return rtrim($trim, ',');
        }
    }
    return null;
}

/** Only the parts that change behaviour. Position is reported but never "fixed". */
function col_differs(array $a, array $b): bool
{
    return $a['type'] !== $b['type']
        || $a['nullable'] !== $b['nullable']
        || $a['default'] !== $b['default']
        || $a['extra'] !== $b['extra'];
}

$colsOnlyLocal = [];   // table => [col]
$colsOnlyLive  = [];
$colsDiffer    = [];   // table => [col => [local, live]]

foreach ($shared as $t) {
    $lc = $local[$t]['columns'];
    $vc = $liveTables[$t]['columns'];
    foreach ($lc as $name => $def) {
        if (!isset($vc[$name])) {
            $colsOnlyLocal[$t][] = $name;
        } elseif (col_differs($def, $vc[$name])) {
            $colsDiffer[$t][$name] = ['local' => $def, 'live' => $vc[$name]];
        }
    }
    foreach ($vc as $name => $def) {
        if (!isset($lc[$name])) {
            $colsOnlyLive[$t][] = $name;
        }
    }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
$line = str_repeat('=', 74);
echo "\n$line\n";
echo "  LOCAL  {$db} @ {$host}  —  " . count($local) . " tables\n";
echo "  LIVE   {$live['database']} @ {$url}  —  " . count($liveTables) . " tables\n";
echo "$line\n\n";

$clean = true;

if ($onlyLocal) {
    $clean = false;
    echo "TABLES ONLY ON LOCAL (missing from live):\n";
    foreach ($onlyLocal as $t) { echo "  - $t\n"; }
    echo "\n";
}
if ($onlyLive) {
    $clean = false;
    echo "TABLES ONLY ON LIVE (not in your local database):\n";
    foreach ($onlyLive as $t) { echo "  - $t\n"; }
    echo "\n";
}
if ($colsOnlyLocal) {
    $clean = false;
    echo "COLUMNS ONLY ON LOCAL (live will error if any query selects them):\n";
    foreach ($colsOnlyLocal as $t => $cs) { echo "  $t: " . implode(', ', $cs) . "\n"; }
    echo "\n";
}
if ($colsOnlyLive) {
    $clean = false;
    echo "COLUMNS ONLY ON LIVE (left behind by a local DROP; usually harmless):\n";
    foreach ($colsOnlyLive as $t => $cs) { echo "  $t: " . implode(', ', $cs) . "\n"; }
    echo "\n";
}
if ($colsDiffer) {
    $clean = false;
    echo "COLUMNS THAT DIFFER:\n";
    foreach ($colsDiffer as $t => $cols) {
        foreach ($cols as $name => $pair) {
            $l = $pair['local'];
            $v = $pair['live'];
            echo "  $t.$name\n";
            echo "      local: {$l['type']}" . ($l['nullable'] ? ' NULL' : ' NOT NULL')
               . ($l['default'] !== null ? " DEFAULT '{$l['default']}'" : '')
               . ($l['extra'] !== '' ? " {$l['extra']}" : '') . "\n";
            echo "      live : {$v['type']}" . ($v['nullable'] ? ' NULL' : ' NOT NULL')
               . ($v['default'] !== null ? " DEFAULT '{$v['default']}'" : '')
               . ($v['extra'] !== '' ? " {$v['extra']}" : '') . "\n";
        }
    }
    echo "\n";
}

if ($clean) {
    echo "No differences. Local and live schemas match.\n\n";
    exit(0);
}

// ---------------------------------------------------------------------------
// Generate the two fix scripts
// ---------------------------------------------------------------------------
if (!is_dir($outDir)) {
    mkdir($outDir, 0777, true);
}

$stamp = date('Y-m-d H:i');

// ---- fix-live.sql : make LIVE look like LOCAL --------------------------------
$safe = [];
$review = [];

foreach ($onlyLocal as $t) {
    $safe[] = "-- Table missing on live.";
    $safe[] = $local[$t]['create'] . ';';
    $safe[] = '';
}
foreach ($colsOnlyLocal as $t => $cs) {
    foreach ($cs as $c) {
        $ddl = column_ddl((string) $local[$t]['create'], $c);
        if ($ddl !== null) {
            $safe[] = "ALTER TABLE `$t` ADD COLUMN $ddl;";
        }
    }
}
foreach ($colsDiffer as $t => $cols) {
    foreach ($cols as $name => $pair) {
        $ddl = column_ddl((string) $local[$t]['create'], $name);
        if ($ddl !== null) {
            $review[] = "-- $t.$name  live: {$pair['live']['type']}  ->  local: {$pair['local']['type']}";
            $review[] = "-- ALTER TABLE `$t` MODIFY COLUMN $ddl;";
        }
    }
}
foreach ($colsOnlyLive as $t => $cs) {
    foreach ($cs as $c) {
        $review[] = "-- Column exists on live but not local. Dropping DELETES its data.";
        $review[] = "-- ALTER TABLE `$t` DROP COLUMN `$c`;";
    }
}
foreach ($onlyLive as $t) {
    $review[] = "-- Table exists on live but not local. Dropping DELETES every row.";
    $review[] = "-- DROP TABLE `$t`;";
}

$fixLive = "-- fix-live.sql — generated $stamp by tools/schema-diff.php\n"
    . "-- Run this on the SERVER (phpMyAdmin) to make live match local.\n"
    . "-- Back up first: phpMyAdmin > Export > Go.\n\n"
    . "-- ---- Safe: additive only, nothing is lost -------------------------------\n\n"
    . (count($safe) ? implode("\n", $safe) . "\n" : "-- (nothing)\n")
    . "\n\n-- ---- REVIEW: destructive or lossy. Uncomment only what you want. ------\n"
    . "-- Read every line. A MODIFY that narrows a type truncates existing values;\n"
    . "-- a DROP removes the data in that column for every row.\n\n"
    . (count($review) ? implode("\n", $review) . "\n" : "-- (nothing)\n");

// ---- fix-local.sql : make LOCAL look like LIVE -------------------------------
$safeL = [];
$reviewL = [];

foreach ($onlyLive as $t) {
    $safeL[] = "-- Table missing on local.";
    $safeL[] = $liveTables[$t]['create'] . ';';
    $safeL[] = '';
}
foreach ($colsOnlyLive as $t => $cs) {
    foreach ($cs as $c) {
        $ddl = column_ddl((string) $liveTables[$t]['create'], $c);
        if ($ddl !== null) {
            $safeL[] = "ALTER TABLE `$t` ADD COLUMN $ddl;";
        }
    }
}
foreach ($colsDiffer as $t => $cols) {
    foreach ($cols as $name => $pair) {
        $ddl = column_ddl((string) $liveTables[$t]['create'], $name);
        if ($ddl !== null) {
            $reviewL[] = "-- $t.$name  local: {$pair['local']['type']}  ->  live: {$pair['live']['type']}";
            $reviewL[] = "-- ALTER TABLE `$t` MODIFY COLUMN $ddl;";
        }
    }
}
foreach ($colsOnlyLocal as $t => $cs) {
    foreach ($cs as $c) {
        $reviewL[] = "-- Column exists on local but not live. Dropping DELETES its data.";
        $reviewL[] = "-- ALTER TABLE `$t` DROP COLUMN `$c`;";
    }
}
foreach ($onlyLocal as $t) {
    $reviewL[] = "-- Table exists on local but not live. Dropping DELETES every row.";
    $reviewL[] = "-- DROP TABLE `$t`;";
}

$fixLocal = "-- fix-local.sql — generated $stamp by tools/schema-diff.php\n"
    . "-- Run this on LARAGON to make local match live.\n\n"
    . "-- ---- Safe: additive only, nothing is lost -------------------------------\n\n"
    . (count($safeL) ? implode("\n", $safeL) . "\n" : "-- (nothing)\n")
    . "\n\n-- ---- REVIEW: destructive or lossy. Uncomment only what you want. ------\n\n"
    . (count($reviewL) ? implode("\n", $reviewL) . "\n" : "-- (nothing)\n");

file_put_contents($outDir . '/fix-live.sql', $fixLive);
file_put_contents($outDir . '/fix-local.sql', $fixLocal);

echo "Written:\n";
echo "  $outDir/fix-live.sql    run on the SERVER to make live match local\n";
echo "  $outDir/fix-local.sql   run on LARAGON to make local match live\n\n";
echo "Pick ONE direction. Read the REVIEW section before running either —\n";
echo "everything below that banner is commented out on purpose.\n\n";
