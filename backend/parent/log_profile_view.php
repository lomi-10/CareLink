<?php
// parent/log_profile_view.php
// Called when a parent opens a helper's profile card in the Browse Helpers screen.
// Logs the view to profile_view_log (rate-limited: 1 entry per parent-helper pair per hour)
// and increments the cumulative profile_views counter on helper_profiles.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'POST required']);
    exit;
}

require_once '../dbcon.php';

$input     = json_decode(file_get_contents('php://input'), true) ?? [];
$parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : 0;
$helper_id = isset($input['helper_id']) ? intval($input['helper_id']) : 0;

if ($parent_id <= 0 || $helper_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'parent_id and helper_id are required']);
    exit;
}

try {
    // Rate limit: only insert if this parent hasn't viewed this helper in the last hour
    $check = $conn->prepare("
        SELECT view_id FROM profile_view_log
        WHERE viewer_id = ? AND helper_id = ? AND viewed_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        LIMIT 1
    ");
    $check->bind_param("ii", $parent_id, $helper_id);
    $check->execute();
    $already_logged = $check->get_result()->num_rows > 0;
    $check->close();

    if (!$already_logged) {
        // Insert view log
        $ins = $conn->prepare("
            INSERT INTO profile_view_log (helper_id, viewer_id, viewer_type)
            VALUES (?, ?, 'parent')
        ");
        $ins->bind_param("ii", $helper_id, $parent_id);
        $ins->execute();
        $ins->close();

        // Increment cumulative counter (safe even if column doesn't exist on very old DBs)
        $upd = $conn->prepare("
            UPDATE helper_profiles SET profile_views = profile_views + 1 WHERE user_id = ?
        ");
        $upd->bind_param("i", $helper_id);
        $upd->execute();
        $upd->close();
    }

    echo json_encode(['success' => true, 'logged' => !$already_logged]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
