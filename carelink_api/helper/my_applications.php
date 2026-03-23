<?php
// helper/my_applications.php
// Fetch helper's job applications

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../dbcon.php';

// Get helper_id from query params
$helper_id = isset($_GET['helper_id']) ? intval($_GET['helper_id']) : 0;

if ($helper_id === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Helper ID is required'
    ]);
    exit;
}

try {
    // Fetch all applications for this helper
    $stmt = $conn->prepare("
        SELECT 
            ja.*,
            jp.title as job_title,
            jp.description as job_description,
            jp.employment_type,
            jp.work_schedule,
            jp.salary_offered,
            jp.salary_period,
            jp.municipality,
            jp.province,
            jp.status as job_status,
            u.user_id as parent_id,
            u.first_name,
            u.last_name,
            u.verification_status
        FROM job_applications ja
        LEFT JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
        LEFT JOIN users u ON jp.parent_id = u.user_id
        WHERE ja.helper_id = ?
        ORDER BY ja.applied_at DESC
    ");
    
    $stmt->bind_param("i", $helper_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $applications = [];
    while ($app = $result->fetch_assoc()) {
        // Format timestamps
        $applied_timestamp = strtotime($app['applied_at']);
        $now = time();
        $diff = $now - $applied_timestamp;
        
        if ($diff < 3600) {
            $applied_at = floor($diff / 60) . ' minutes ago';
        } elseif ($diff < 86400) {
            $hours = floor($diff / 3600);
            $applied_at = $hours . ' ' . ($hours == 1 ? 'hour' : 'hours') . ' ago';
        } elseif ($diff < 604800) {
            $days = floor($diff / 86400);
            $applied_at = $days . ' ' . ($days == 1 ? 'day' : 'days') . ' ago';
        } elseif ($diff < 2592000) {
            $weeks = floor($diff / 604800);
            $applied_at = $weeks . ' ' . ($weeks == 1 ? 'week' : 'weeks') . ' ago';
        } else {
            $applied_at = date('M j, Y', $applied_timestamp);
        }

        $reviewed_at = null;
        if ($app['reviewed_at']) {
            $reviewed_timestamp = strtotime($app['reviewed_at']);
            $diff_reviewed = $now - $reviewed_timestamp;
            
            if ($diff_reviewed < 3600) {
                $reviewed_at = floor($diff_reviewed / 60) . ' minutes ago';
            } elseif ($diff_reviewed < 86400) {
                $hours = floor($diff_reviewed / 3600);
                $reviewed_at = $hours . ' ' . ($hours == 1 ? 'hour' : 'hours') . ' ago';
            } elseif ($diff_reviewed < 604800) {
                $days = floor($diff_reviewed / 86400);
                $reviewed_at = $days . ' ' . ($days == 1 ? 'day' : 'days') . ' ago';
            } else {
                $reviewed_at = date('M j, Y', $reviewed_timestamp);
            }
        }

        $applications[] = [
            'application_id' => $app['application_id'],
            'job_post_id' => $app['job_post_id'],
            'helper_id' => $app['helper_id'],
            'cover_letter' => $app['cover_letter'],
            'status' => $app['status'],
            'parent_notes' => $app['parent_notes'],
            'applied_at' => $applied_at,
            'reviewed_at' => $reviewed_at,
            'updated_at' => $app['updated_at'],
            'job_title' => $app['job_title'],
            'job_description' => $app['job_description'],
            'employment_type' => $app['employment_type'],
            'work_schedule' => $app['work_schedule'],
            'salary_offered' => floatval($app['salary_offered']),
            'salary_period' => $app['salary_period'],
            'municipality' => $app['municipality'],
            'province' => $app['province'],
            'parent_id' => $app['parent_id'],
            'parent_name' => $app['first_name'] . ' ' . $app['last_name'],
            'parent_verified' => $app['verification_status'] === 'Verified',
            'job_status' => $app['job_status'],
        ];
    }

    echo json_encode([
        'success' => true,
        'applications' => $applications,
        'total' => count($applications)
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>