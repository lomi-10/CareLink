<?php
declare(strict_types=1);

/**
 * CareLink CareBot — POST JSON in, JSON out.
 *
 * === Paste into Laragon (default path) ===
 *   C:\laragon\www\carelink_api\chatbot_api.php
 *
 * === Required (Windows) ===
 *   User env: GEMINI_API_KEY = key from https://aistudio.google.com/apikey
 *   Then restart Laragon (Stop All → Start All) so PHP sees the new value.
 *
 * === Optional (Windows User env overrides the constants below) ===
 *   GEMINI_MODEL              — Gemini model id (see constants CARELINK_CHATBOT_DEFAULT_MODEL)
 *   CHATBOT_MAX_PER_IP_HOUR   — rate limit per IP per rolling hour (0 = disable)
 *   CHATBOT_MAX_PER_USER_HOUR — rate limit per app user_id per rolling hour (0 = disable)
 *   CHATBOT_MAX_TURNS         — max conversation *rows* sent (last N messages; default 6)
 *
 * Never put GEMINI_API_KEY in this file or in the mobile app repo.
 *
 * --- Edit these defaults if you prefer not to use Windows env vars ---
 * (GEMINI_MODEL / CHATBOT_* env vars still override when set.)
 */
const CARELINK_CHATBOT_DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const CARELINK_CHATBOT_MAX_IP_PER_HOUR = 30;
const CARELINK_CHATBOT_MAX_USER_PER_HOUR = 45;
/** Last N rows from `contents` (each user/model line = one message). */
const CARELINK_CHATBOT_MAX_TURNS_DEFAULT = 6;

/**
 * System instruction for Gemini (role fixed by API as systemInstruction).
 */
function carelink_chatbot_system_instruction_text(): string
{
    return <<<'CAREBOT_SYS'
You are CareBot, the in-app assistant for CareLink — a domestic 
helper recruitment and workforce management platform in the 
Philippines. You help employers (parents) and helpers (kasambahay) 
use the CareLink app effectively.

== ABOUT CARELINK ==
CareLink is a mobile and web app where:
- Employers post jobs, review applicants, and hire helpers
- Helpers browse jobs, apply, and manage their daily work
- PESO (Public Employment Service Office) verifies all accounts
- Contracts are generated automatically following DOLE Form BK-1
  (Kasambahay Law, RA 10361)

== USER ROLES ==
- Parent/Employer: posts jobs, hires helpers, manages work
- Helper/Kasambahay: applies to jobs, does daily work tasks
- PESO: verifies accounts and oversees contracts
- Admin: manages the platform

== HOW TO USE CARELINK — EMPLOYER FEATURES ==
1. POST A JOB: Go to "My Job Posts" → tap the + button → 
   fill in job title, duties, salary, schedule, live-in or 
   live-out arrangement → submit. PESO-verified helpers can 
   then see and apply to your post.

2. REVIEW APPLICATIONS: Go to "Applications" → see all 
   applicants → tap a card to view their profile and documents 
   → options: Shortlist, Reject, or Message the applicant.

3. HIRE A HELPER: From Applications, tap "Hire" on an 
   applicant → select which job if they applied to multiple 
   → fill in contract start/end date → a contract PDF is 
   generated automatically → both you and the helper must 
   sign it → once both sign, the helper is officially hired.

4. POST TASKS (after hiring): Go to "My Helpers" → select 
   the active hire → tap "Tasks" → tap "Add Task" → enter 
   task title, description (optional), due date (optional), 
   and toggle "Require photo proof" if needed. Tasks appear 
   on your helper's work dashboard immediately.

5. VIEW ATTENDANCE: Go to "My Helpers" → select hire → 
   tap "Attendance" → see weekly or monthly view → green 
   dot means present, gray means absent, yellow means 
   approved leave, purple means rest day. Tap any day for 
   check-in and check-out times.

6. APPROVE LEAVE REQUESTS: Go to Notifications or 
   "My Helpers" → Attendance → Leave Requests → tap 
   Approve or Decline. If approved, the day is automatically 
   marked as leave in the attendance grid.

7. MARK SALARY PAID: Go to "My Helpers" → Salary → 
   review computed amount based on days worked → tap 
   "Mark as Paid." The helper will be notified.

8. END EMPLOYMENT: Go to "My Helpers" → Contract → scroll 
   to bottom → tap "End Employment" → select reason → 
   confirm. A 5-day notice period applies unless both 
   parties agree to immediate termination. PESO is 
   automatically notified.

== HOW TO USE CARELINK — HELPER FEATURES ==
1. BROWSE JOBS: From Home (before hired), tap "Browse Jobs" 
   → filter by location, job type, salary → tap a listing 
   to view details → tap "Apply" to submit your application 
   with a cover message.

2. TRACK APPLICATIONS: Go to "My Applications" → see 
   status of each application: Pending, Reviewed, 
   Shortlisted, Interview, Contract Pending, or Hired.

3. SIGN CONTRACT: When an employer hires you, you will get 
   a notification → tap to open the contract PDF → read it 
   → tap "I Agree" to sign. Once both parties sign, you 
   are officially hired and your dashboard switches to 
   Work Mode.

4. CHECK IN: After being hired, your home screen shows a 
   large green "Check In" button → tap it when you arrive 
   at work. It records your arrival time. It changes to a 
   red "Check Out" button. Tap Check Out when your day ends.

5. VIEW AND COMPLETE TASKS: From your Work dashboard, tap 
   "Tasks" → see all tasks your employer added for today → 
   tap the checkbox to mark a task done → if the task 
   requires a photo, the camera will open so you can take 
   a proof photo before it is marked complete.

6. VIEW YOUR SCHEDULE: Tap "Schedule" → see a monthly 
   calendar with your work days, rest days, approved 
   leaves, and absences. Tap any day to see details.

7. REQUEST DAY OFF: From the Schedule screen, tap 
   "Request Day Off" → pick the date → select reason 
   (sick, personal, family emergency, other) → add an 
   optional note → submit. Your employer will be notified 
   and must approve or decline. You have 5 paid leave 
   days per year under RA 10361.

8. VIEW SALARY: Tap "Salary" from your Work dashboard → 
   see expected pay for this period based on your contract 
   salary and days worked → see if your employer has 
   marked it as paid.

== KASAMBAHAY LAW QUICK FACTS (RA 10361) ==
- Minimum wage: ₱7,000/month (2025 rate, may vary by region)
- Rest day: at least 1 day per week (usually Sunday)
- Paid leaves: 5 days per year
- SSS, PhilHealth, Pag-IBIG: required after 1 month of service
- Notice for termination: 5 days written notice
- Contract: must follow DOLE Form BK-1
- Employer pays ALL recruitment costs — helper pays nothing
- Pre-employment docs required: NBI clearance, medical cert, 
  barangay clearance, birth certificate

== HOW TO RESPOND ==
- Always answer based on CareLink features first
- If the question is about how to do something in the app, 
  give step-by-step instructions using the feature names above
- Keep answers short — 3 to 5 lines maximum unless steps 
  require more
- Be friendly, clear, and use simple English or mix of 
  Filipino terms naturally (e.g. "kasambahay", "po")
- If someone asks something you don't know or is outside 
  CareLink, say: "Para sa ganyang tanong, mas maganda pong 
  makipag-ugnayan sa DOLE o sa inyong lokal na PESO office."
- Never make up features that don't exist in CareLink
CAREBOT_SYS;
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST only']);
    exit;
}

function carelink_chatbot_client_ip(): string
{
    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if (is_string($xff) && $xff !== '') {
        $parts = explode(',', $xff);
        $first = trim((string) ($parts[0] ?? ''));
        if ($first !== '') {
            return $first;
        }
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

/**
 * Simple file-based rolling window rate limit.
 *
 * @return bool true = over limit (reject request)
 */
function carelink_chatbot_rate_limited(string $bucket, int $maxPerWindow, int $windowSeconds): bool
{
    if ($maxPerWindow <= 0) {
        return false;
    }
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'carelink_chatbot_rl';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $safe = preg_replace('/[^a-zA-Z0-9._-]/', '_', $bucket);
    $path = $dir . DIRECTORY_SEPARATOR . substr(hash('sha256', $bucket), 0, 32) . '_' . $safe . '.json';
    $now = time();
    $start = $now;
    $count = 0;
    if (is_readable($path)) {
        $raw = @file_get_contents($path);
        $old = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($old) && isset($old['start'], $old['count'])) {
            $os = (int) $old['start'];
            $oc = (int) $old['count'];
            if ($now - $os < $windowSeconds) {
                $start = $os;
                $count = $oc;
            }
        }
    }
    if ($count >= $maxPerWindow) {
        return true;
    }
    $count++;
    @file_put_contents($path, json_encode(['start' => $start, 'count' => $count]), LOCK_EX);

    return false;
}

$key = trim((string) (getenv('GEMINI_API_KEY') ?: ''));
if ($key === '') {
    echo json_encode([
        'success' => false,
        'code' => 'not_configured',
        'message' => 'CareBot is not enabled on the server yet. An administrator must configure the assistant key on the server.',
    ]);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);
if (!is_array($body) || !isset($body['contents']) || !is_array($body['contents'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON: expected { "contents": [...], "user_id": <number> }']);
    exit;
}

$userId = isset($body['user_id']) ? (int) $body['user_id'] : 0;
if ($userId < 1) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'code' => 'invalid_user',
        'message' => 'Missing or invalid user_id. Only signed-in app users can use CareBot.',
    ]);
    exit;
}

$maxIp = (int) (getenv('CHATBOT_MAX_PER_IP_HOUR') ?: (string) CARELINK_CHATBOT_MAX_IP_PER_HOUR);
$maxUser = (int) (getenv('CHATBOT_MAX_PER_USER_HOUR') ?: (string) CARELINK_CHATBOT_MAX_USER_PER_HOUR);
$ip = carelink_chatbot_client_ip();

if (carelink_chatbot_rate_limited('ip:' . $ip, $maxIp, 3600)) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'code' => 'rate_limited',
        'message' => 'Too many requests from this network. Try again in an hour or ask your admin to raise CHATBOT_MAX_PER_IP_HOUR.',
    ]);
    exit;
}

if (carelink_chatbot_rate_limited('user:' . (string) $userId, $maxUser, 3600)) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'code' => 'rate_limited',
        'message' => 'You have reached the hourly CareBot limit. Try again later.',
    ]);
    exit;
}

$maxTurns = (int) (getenv('CHATBOT_MAX_TURNS') ?: (string) CARELINK_CHATBOT_MAX_TURNS_DEFAULT);
$rows = $body['contents'];
if ($maxTurns > 0 && count($rows) > $maxTurns) {
    $rows = array_slice($rows, -$maxTurns);
}

$parts = [];
foreach ($rows as $row) {
    if (!is_array($row)) {
        continue;
    }
    $role = (($row['role'] ?? '') === 'model') ? 'model' : 'user';
    $text = trim((string) ($row['text'] ?? ''));
    if ($text === '') {
        continue;
    }
    if (strlen($text) > 4000) {
        $text = substr($text, 0, 4000) . '…';
    }
    $parts[] = [
        'role' => $role,
        'parts' => [['text' => $text]],
    ];
}

if ($parts === []) {
    echo json_encode(['success' => false, 'message' => 'No messages to send']);
    exit;
}

$model = trim((string) (getenv('GEMINI_MODEL') ?: CARELINK_CHATBOT_DEFAULT_MODEL));
if ($model === '' || !preg_match('/^[a-zA-Z0-9._-]+$/', $model)) {
    $model = CARELINK_CHATBOT_DEFAULT_MODEL;
}
$url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';

$sys = trim(carelink_chatbot_system_instruction_text());
$bodyOut = [
    'contents' => $parts,
];
if ($sys !== '') {
    $bodyOut['systemInstruction'] = [
        'parts' => [['text' => $sys]],
    ];
}
$payload = json_encode($bodyOut, JSON_UNESCAPED_UNICODE);

$ch = curl_init($url);
if ($ch === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not init HTTP client']);
    exit;
}

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-goog-api-key: ' . $key,
    ],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
]);

$res = curl_exec($ch);
$errno = curl_errno($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($errno !== 0 || !is_string($res)) {
    http_response_code(502);
    echo json_encode(['success' => false, 'message' => 'CareBot could not reach the assistant service. Check your connection and try again.']);
    exit;
}

$decoded = json_decode($res, true);
if ($httpCode >= 400 || !is_array($decoded)) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => 'CareBot could not complete that reply. Please try again in a moment.',
    ]);
    exit;
}

$text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
if (!is_string($text) || $text === '') {
    echo json_encode(['success' => false, 'message' => 'CareBot had no reply for that message. Please try rephrasing.']);
    exit;
}

echo json_encode(['success' => true, 'reply' => $text], JSON_UNESCAPED_UNICODE);
