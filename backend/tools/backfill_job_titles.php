<?php
/**
 * tools/backfill_job_titles.php — ONE-TIME data fix. Delete after running.
 *
 * Rewrites existing job_posts.title values using the concise rule in
 * shared/job_title.php (1 role -> that role, 2 -> "A & B", 3+ -> the category).
 * Job posts created BEFORE this change stored every selected role joined with
 * commas, which produced ~110-character titles. New/edited posts already build
 * their title correctly — this only repairs rows created before the fix.
 *
 * HOW TO RUN (Hostinger):
 *   1. Upload this file to  public_html/carelink_api/tools/
 *   2. Visit  https://<your-domain>/carelink_api/tools/backfill_job_titles.php?dry=1
 *      -> shows what WOULD change, without writing anything.
 *   3. Happy with it? Visit the same URL without ?dry=1 to apply.
 *   4. DELETE THIS FILE from the server.
 *
 * Safe to re-run: rows already holding the correct title are skipped.
 */

header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/../shared/job_title.php';

$dryRun = isset($_GET['dry']) && $_GET['dry'] !== '0';

echo $dryRun
    ? "DRY RUN — nothing will be written.\n\n"
    : "APPLYING CHANGES.\n\n";

$sql = "SELECT jp.job_post_id, jp.title, jp.job_ids, jp.custom_job_title, rc.category_name
        FROM job_posts jp
        LEFT JOIN ref_categories rc ON rc.category_id = jp.category_id";
$rows = $conn->query($sql);
if (!$rows) {
    echo "ERROR: " . $conn->error . "\n";
    exit;
}

$upd = $conn->prepare("UPDATE job_posts SET title = ? WHERE job_post_id = ?");
$changed = 0;
$skipped = 0;

while ($j = $rows->fetch_assoc()) {
    $roles = carelink_role_names_for_job_ids($conn, $j['job_ids']);
    $new   = carelink_build_job_title($j['category_name'], $roles, $j['custom_job_title'] ?? null);

    if ($new === '' || $new === $j['title']) {
        $skipped++;
        continue;
    }

    printf("#%s\n  OLD: %s\n  NEW: %s\n\n", $j['job_post_id'], $j['title'], $new);

    if (!$dryRun) {
        $upd->bind_param('si', $new, $j['job_post_id']);
        $upd->execute();
    }
    $changed++;
}
$upd->close();

echo str_repeat('-', 50) . "\n";
echo ($dryRun ? "WOULD update" : "Updated") . ": $changed\n";
echo "Already correct (skipped): $skipped\n";
echo $dryRun
    ? "\nRe-run without ?dry=1 to apply.\n"
    : "\nDone. NOW DELETE THIS FILE FROM THE SERVER.\n";
