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
    // Pre-fetch ref_jobs titles
    $allRefJobs = [];
    $rjRes = $conn->query("SELECT job_id, job_title FROM ref_jobs");
    if ($rjRes) { while ($r = $rjRes->fetch_assoc()) $allRefJobs[$r['job_id']] = $r['job_title']; }

    // Fetch all applications for this helper
    $stmt = $conn->prepare("
        SELECT
            ja.*,
            c.helper_decline_reason,
            c.helper_decline_at,
            c.confirmed_salary,
            c.work_hours,
            c.rest_days,
            c.employment_start_date,
            c.employment_end_date,
            c.contract_duration,
            c.payment_schedule,
            c.other_benefits,
            c.pdf_file_path,
            jp.title as job_title,
            jp.description as job_description,
            jp.employment_type,
            jp.work_schedule,
            jp.salary_offered,
            jp.salary_period,
            jp.municipality,
            jp.province,
            jp.status as job_status,
            jp.job_ids,
            rc.category_name,
            u.user_id as parent_id,
            u.first_name,
            u.last_name,
            u.status as verification_status,
            li.interview_id,
            li.interview_date,
            li.interview_type,
            li.location_or_link,
            li.status AS interview_status,
            li.parent_confirmed,
            li.helper_confirmed
        FROM job_applications ja
        LEFT JOIN job_posts jp ON ja.job_post_id = jp.job_post_id
        LEFT JOIN ref_categories rc ON jp.category_id = rc.category_id
        LEFT JOIN contracts c ON c.application_id = ja.application_id
        LEFT JOIN users u ON jp.parent_id = u.user_id
        LEFT JOIN (
            SELECT i1.application_id, i1.interview_id, i1.interview_date, i1.interview_type,
                   i1.location_or_link, i1.status, i1.parent_confirmed, i1.helper_confirmed
            FROM interview_schedules i1
            WHERE i1.interview_id = (
                SELECT i2.interview_id FROM interview_schedules i2
                WHERE i2.application_id = i1.application_id
                ORDER BY i2.created_at DESC, i2.interview_id DESC
                LIMIT 1
            )
        ) li ON li.application_id = ja.application_id
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

        // Resolve job_ids to names
        $jobIds   = json_decode($app['job_ids'] ?? '[]', true) ?: [];
        $jobNames = array_values(array_filter(array_map(fn($id) => $allRefJobs[(int)$id] ?? null, $jobIds)));

        $applications[] = [
            'application_id' => $app['application_id'],
            'job_post_id' => $app['job_post_id'],
            'helper_id' => $app['helper_id'],
            'cover_letter' => $app['cover_letter'],
            'status' => $app['status'],
            'employer_signed_at' => $app['employer_signed_at'] ?? null,
            'helper_signed_at' => $app['helper_signed_at'] ?? null,
            'contract_generated_at' => $app['contract_generated_at'] ?? null,
            'helper_decline_reason' => $app['helper_decline_reason'] ?? null,
            'helper_decline_at' => $app['helper_decline_at'] ?? null,
            'confirmed_salary'       => $app['confirmed_salary'] !== null ? (float)$app['confirmed_salary'] : null,
            'work_hours'             => $app['work_hours'] ?? null,
            'rest_days'              => $app['rest_days'] ? (json_decode($app['rest_days'], true) ?: []) : [],
            'employment_start_date'  => $app['employment_start_date'] ?? null,
            'employment_end_date'    => $app['employment_end_date'] ?? null,
            'contract_duration'      => $app['contract_duration'] ?? null,
            'payment_schedule'       => $app['payment_schedule'] ?? null,
            'other_benefits'         => $app['other_benefits'] ?? null,
            'pdf_file_path'          => $app['pdf_file_path'] ?? null,
            'interview_id'           => $app['interview_id'] !== null ? (int)$app['interview_id'] : null,
            'interview_date'         => $app['interview_date'] ?? null,
            'interview_type'         => $app['interview_type'] ?? null,
            'location_or_link'       => $app['location_or_link'] ?? null,
            'interview_status'       => $app['interview_status'] ?? null,
            'parent_confirmed'       => (bool)$app['parent_confirmed'],
            'helper_confirmed'       => (bool)$app['helper_confirmed'],
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
            'location'      => trim(implode(', ', array_filter([$app['municipality'], $app['province']]))),
            'category_name' => $app['category_name'] ?? null,
            'job_names'     => $jobNames,
            'parent_id' => $app['parent_id'],
            'parent_name' => $app['first_name'] . ' ' . $app['last_name'],
            'parent_verified' => $app['verification_status'] === 'approved',
            'job_status' => $app['job_status'],
            'message_from_parent' => $app['parent_notes'] ?? null,
        ];
    }

    // Attach shared document IDs for each application (used by edit modal to pre-select)
    if (!empty($applications)) {
        $appIds = array_map('intval', array_column($applications, 'application_id'));
        $idList = implode(',', $appIds);
        $sharedResult = $conn->query("
            SELECT application_id, document_id
            FROM application_document_shares
            WHERE application_id IN ($idList)
        ");
        $sharedByApp = [];
        if ($sharedResult) {
            while ($row = $sharedResult->fetch_assoc()) {
                $sharedByApp[(int)$row['application_id']][] = (int)$row['document_id'];
            }
        }
        foreach ($applications as &$app) {
            $app['shared_document_ids'] = $sharedByApp[(int)$app['application_id']] ?? [];
        }
        unset($app);
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