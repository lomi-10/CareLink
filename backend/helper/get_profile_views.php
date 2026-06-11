<?php
// helper/get_profile_views.php
// Returns recent profile views for a helper — who viewed and when.
// Used by the helper to see which parents have looked at their profile.
// Default window: 7 days. Viewer names are included so helpers can see who's interested.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../dbcon.php';

$helper_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$days      = isset($_GET['days'])    ? min(30, max(1, intval($_GET['days']))) : 7;

if ($helper_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'user_id is required']);
    exit;
}

try {
    // Check table exists (graceful fallback if migration hasn't run)
    $table_check = $conn->query("SHOW TABLES LIKE 'profile_view_log'");
    if ($table_check->num_rows === 0) {
        echo json_encode(['success' => true, 'views' => [], 'total' => 0, 'days' => $days]);
        exit;
    }

    // Fetch distinct-per-day views (latest view per viewer per day) in the window
    $sql = "
        SELECT
            pvl.viewer_id,
            CONCAT(u.first_name, ' ', u.last_name) AS viewer_name,
            u.profile_image                          AS viewer_photo,
            MAX(pvl.viewed_at)                       AS last_viewed_at
        FROM profile_view_log pvl
        JOIN users u ON u.user_id = pvl.viewer_id
        WHERE pvl.helper_id = ?
          AND pvl.viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY pvl.viewer_id, DATE(pvl.viewed_at)
        ORDER BY last_viewed_at DESC
        LIMIT 50
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $helper_id, $days);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Total unique viewers in window
    $cnt_stmt = $conn->prepare("
        SELECT COUNT(DISTINCT viewer_id) AS cnt
        FROM profile_view_log
        WHERE helper_id = ? AND viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ");
    $cnt_stmt->bind_param("ii", $helper_id, $days);
    $cnt_stmt->execute();
    $total = (int)($cnt_stmt->get_result()->fetch_assoc()['cnt'] ?? 0);
    $cnt_stmt->close();

    echo json_encode([
        'success' => true,
        'views'   => $rows,
        'total'   => $total,
        'days'    => $days,
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>
