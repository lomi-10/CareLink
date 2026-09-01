<?php
/**
 * migrate.php — bring the live database up to date without opening phpMyAdmin.
 *
 * WHY THIS EXISTS
 *
 * CareLink has no migration framework. New tables are created by ensure_*()
 * helpers that each endpoint includes and calls before it queries. That works,
 * but it is LAZY: a table only comes into existence the first time somebody
 * loads the feature that needs it. On a freshly deployed server the schema is
 * therefore whatever set of features has happened to be visited, which is why
 * tables can be "not yet implemented" on live while existing locally.
 *
 * Worse, laziness is not evenly distributed. A guard, a dashboard count or a
 * report that touches a table WITHOUT including its ensure_* file gets an
 * "unknown table" error instead — and since PHP 8.1 mysqli throws by default,
 * that surfaces as a blank screen rather than a missing section.
 *
 * This endpoint calls every ensure_* helper in one pass, so the schema is
 * complete the moment a deploy finishes rather than whenever a user happens to
 * click the right thing. GitHub Actions calls it automatically after the FTP
 * sync (see .github/workflows/deploy-backend.yml).
 *
 * SAFETY
 *
 * Every statement it runs is CREATE TABLE IF NOT EXISTS or an ADD COLUMN
 * guarded by a column check. It creates and it backfills seed rows; it does
 * not DROP, TRUNCATE, or UPDATE existing data, and running it twice does
 * nothing the second time. It is safe to call on every deploy.
 *
 * It still runs DDL, so it is NOT public — see the token check below.
 *
 * SETUP (one time)
 *
 *   1. Add to backend/config.local.php on the server:
 *          'MIGRATE_TOKEN' => '<a long random string>',
 *   2. Add the same string as a GitHub repository secret named MIGRATE_TOKEN,
 *      and your API root as MIGRATE_URL (e.g. https://yourdomain.com/carelink_api).
 *
 * Without step 1 this endpoint refuses every request, including yours. That is
 * deliberate: a migration endpoint that defaults to open is worse than none.
 *
 * MANUAL RUN
 *
 *   curl -X POST https://yourdomain.com/carelink_api/migrate.php \
 *        -H "X-CareLink-Migrate-Token: <the token>"
 */

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

// No Access-Control-Allow-Origin on purpose. Nothing in the app calls this;
// it is for CI and for you with curl. Leaving it un-CORSed means a page open
// in a logged-in browser cannot be talked into calling it.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST only.']);
    exit;
}

require_once __DIR__ . '/load_config.php';

$expected = (string) carelink_cfg('MIGRATE_TOKEN', '');
if ($expected === '') {
    // Fail closed. An unconfigured token must never mean "allow everyone".
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'message' => "MIGRATE_TOKEN is not set in backend/config.local.php on this server. "
            . "Add it there and to your GitHub secrets before using this endpoint.",
    ]);
    exit;
}

$supplied = $_SERVER['HTTP_X_CARELINK_MIGRATE_TOKEN'] ?? ($_POST['token'] ?? '');
// hash_equals, not ===, so a wrong token cannot be found one character at a
// time by timing the response.
if (!is_string($supplied) || !hash_equals($expected, $supplied)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden.']);
    exit;
}

require_once __DIR__ . '/dbcon.php';

/** Table names present right now. */
function migrate_table_list(mysqli $conn): array
{
    $out = [];
    $res = $conn->query('SHOW TABLES');
    while ($row = $res->fetch_array()) {
        $out[] = $row[0];
    }
    sort($out);
    return $out;
}

$before = migrate_table_list($conn);

// Every ensure_* helper in the codebase, with the file that defines it.
// ADD NEW ONES HERE. A helper that is not on this list still works lazily,
// but will not be created by a deploy — which is the problem this file exists
// to solve, so leaving one off quietly reintroduces it.
$migrations = [
    'shared/auth_tokens.php'              => ['ensure_auth_tokens_table'],
    'shared/complaint_tracking_tables.php' => ['ensure_complaint_tracking_tables', 'ensure_user_safety_flags_table'],
    'shared/contract_signatures_table.php' => ['ensure_contract_signatures_table'],
    'shared/credential_flags_table.php'   => ['ensure_credential_flags_table'],
    'shared/feedback_questions_table.php' => ['ensure_feedback_questions_table'],
    'shared/interview_feedback_table.php' => ['ensure_interview_feedback_table'],
    'shared/interview_reviews_table.php'  => ['ensure_interview_reviews_table'],
    'shared/job_invites_table.php'        => ['ensure_job_invites_table'],
    'shared/placement_settings_table.php' => ['ensure_placement_settings_table'],
    'shared/revenue_tables.php'           => ['ensure_revenue_tables'],
    'shared/subscriptions_table.php'      => ['ensure_subscriptions_table'],
    'shared/system_feedback_table.php'    => ['ensure_system_feedback_table'],
    'shared/task_checklist_table.php'     => ['ensure_task_checklist_items_table'],
    'peso/application_flags_table.php'    => ['carelink_ensure_application_flags_table'],
];

$ran = [];
$failed = [];

foreach ($migrations as $file => $functions) {
    $path = __DIR__ . '/' . $file;
    if (!is_file($path)) {
        $failed[] = ['step' => $file, 'error' => 'file not found on server — deploy may be incomplete'];
        continue;
    }
    try {
        require_once $path;
    } catch (Throwable $e) {
        $failed[] = ['step' => $file, 'error' => $e->getMessage()];
        continue;
    }
    foreach ($functions as $fn) {
        if (!function_exists($fn)) {
            $failed[] = ['step' => $fn, 'error' => "not defined in $file"];
            continue;
        }
        try {
            // One failure must not abort the rest. A table that cannot be
            // created is worth reporting, but it is no reason to leave the
            // other twelve migrations unrun.
            $fn($conn);
            $ran[] = $fn;
        } catch (Throwable $e) {
            $failed[] = ['step' => $fn, 'error' => $e->getMessage()];
        }
    }
}

$after = migrate_table_list($conn);
$created = array_values(array_diff($after, $before));

// Full inventory check. Update this list when you add a table, so a missing
// one is reported here instead of discovered as a blank screen in the app.
$known = [
    'application_document_shares', 'application_flags', 'application_tasks', 'attendance_logs',
    'auth_codes', 'auth_tokens', 'complaint_actions', 'complaints',
    'contract_signatures', 'contracts', 'credential_flags', 'feedback_answers',
    'feedback_questions', 'helper_jobs', 'helper_languages', 'helper_profiles',
    'helper_skills', 'helper_work_history', 'interview_feedback', 'interview_notes',
    'interview_reviews', 'interview_schedules', 'job_applications', 'job_invites',
    'job_posts', 'job_views', 'leave_requests', 'log_trail',
    'messages', 'notifications', 'parent_children', 'parent_elderly',
    'parent_household', 'parent_profiles', 'password_verify_attempts', 'payment_checkouts',
    'payment_events', 'peso_reports', 'placement_fees', 'placement_renewal_intent',
    'placement_reviews', 'placement_settings', 'placement_tasks', 'placements',
    'ref_categories', 'ref_jobs', 'ref_languages', 'ref_skills',
    'saved_jobs', 'saved_profiles', 'saved_searches', 'subscriptions',
    'system_feedback', 'task_checklist_items', 'user_documents', 'user_safety_flags',
    'users',
];

// Tables no ensure_* helper can build — they predate the pattern and live only
// in database/schema.sql. If any show up here the server needs that file
// imported once by hand; nothing in a deploy will ever create them.
$stillMissing = array_values(array_diff($known, $after));

// Tables on the server that this file does not know about. Not an error —
// usually a leftover from an older schema or a hand-made backup copy — but
// worth surfacing, because the only other clue is a table_count that does
// not match the length of the list above, which is easy to misread.
$unexpected = array_values(array_diff($after, $known));

$ok = empty($failed) && empty($stillMissing);
http_response_code($ok ? 200 : 500);

echo json_encode([
    'success'            => $ok,
    'message'            => $ok
        ? 'Schema is up to date.'
        : 'Migration finished with problems — see failed / still_missing.',
    'migrations_run'     => $ran,
    'tables_created_now' => $created,
    'table_count'        => count($after),
    'failed'             => $failed,
    'still_missing'      => $stillMissing,
    'unexpected_tables'  => $unexpected,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
