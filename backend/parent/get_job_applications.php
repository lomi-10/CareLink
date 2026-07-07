<?php
// carelink_api/parent/get_job_applications.php

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once '../dbcon.php';
require_once __DIR__ . '/../shared/ownership_guard.php';

// Support two modes:
//   ?job_post_id=X  — applications for a specific job
//   ?parent_id=X    — ALL applications across all of a parent's jobs
$job_post_id  = isset($_GET['job_post_id']) && $_GET['job_post_id'] !== ''
    ? (int)$_GET['job_post_id'] : null;
$parent_id    = isset($_GET['parent_id'])   && $_GET['parent_id']   !== ''
    ? (int)$_GET['parent_id']   : null;
$requester_id = isset($_GET['requester_id']) ? (int)$_GET['requester_id'] : 0;

if (!$job_post_id && !$parent_id) {
    echo json_encode(['success' => false, 'message' => 'job_post_id or parent_id required']);
    exit;
}

try {
    // This list contains applicant PII (contact number, salary, address) —
    // only the parent who owns the job post(s) may view it.
    if ($parent_id) {
        carelink_require_self($requester_id, $parent_id, 'You are not allowed to view these applications.');
    } else {
        $ownerStmt = $conn->prepare("SELECT parent_id FROM job_posts WHERE job_post_id = ?");
        $ownerStmt->bind_param('i', $job_post_id);
        $ownerStmt->execute();
        $ownerRow = $ownerStmt->get_result()->fetch_assoc();
        $ownerStmt->close();
        carelink_require_self($requester_id, $ownerRow ? (int)$ownerRow['parent_id'] : 0, 'You are not allowed to view these applications.');
    }

    // 1. Fetch Application + User + Helper Profile Data
    if ($job_post_id) {
        $where = "a.job_post_id = $job_post_id";
    } else {
        $where = "jp.parent_id = $parent_id";
    }
    $query = "
        SELECT
            a.application_id, a.job_post_id, a.helper_id, a.status, a.applied_at, a.cover_letter,
            a.employer_signed_at, a.helper_signed_at, a.contract_generated_at,
            c.helper_decline_reason, c.helper_decline_at,
            c.confirmed_salary, c.work_hours, c.rest_days,
            c.employment_start_date, c.employment_end_date, c.contract_duration,
            c.payment_schedule, c.other_benefits, c.pdf_file_path,
            jp.title AS job_title, jp.start_date AS job_start_date, jp.category_id,
            rc.category_name,
            u.first_name, u.last_name, u.email, hp.contact_number,
            hp.profile_id, hp.profile_image, hp.birth_date, hp.gender,
            hp.experience_years, hp.barangay, hp.municipality, hp.province,
            hp.education_level, hp.religion, hp.civil_status, hp.bio,
            hp.employment_type, hp.work_schedule, hp.expected_salary, hp.salary_period,
            hp.verification_status, hp.rating_average, hp.rating_count,
            li.interview_id, li.interview_date, li.interview_type, li.location_or_link,
            li.interview_status, li.parent_confirmed, li.helper_confirmed
        FROM job_applications a
        JOIN job_posts jp ON a.job_post_id = jp.job_post_id
        LEFT JOIN ref_categories rc ON jp.category_id = rc.category_id
        LEFT JOIN contracts c ON c.application_id = a.application_id
        LEFT JOIN (
            SELECT i1.application_id, i1.interview_id, i1.interview_date, i1.interview_type,
                   i1.location_or_link, i1.status AS interview_status,
                   i1.parent_confirmed, i1.helper_confirmed
            FROM interview_schedules i1
            WHERE i1.interview_id = (
                SELECT i2.interview_id FROM interview_schedules i2
                WHERE i2.application_id = i1.application_id
                ORDER BY i2.created_at DESC, i2.interview_id DESC
                LIMIT 1
            )
        ) li ON li.application_id = a.application_id
        JOIN users u ON a.helper_id = u.user_id
        JOIN helper_profiles hp ON u.user_id = hp.user_id
        WHERE $where
        ORDER BY a.applied_at DESC
    ";
    
    $result = $conn->query($query);
    $applications = [];

    while ($row = $result->fetch_assoc()) {
        $helper_id = (int)$row['helper_id'];
        $profile_id = (int)$row['profile_id'];
        
        // Calculate Age
        $age = null;
        if (!empty($row['birth_date'])) {
            try {
                $dob = new DateTime($row['birth_date']);
                $now = new DateTime();
                $age = $now->diff($dob)->y;
            } catch (Exception $e) {}
        }

        // NOTE: Documents are private by default and are never bundled into the generic applications
        // list. A helper's verification documents only become visible to a parent when the helper
        // explicitly shares them on that specific application — see application_document_shares
        // and parent/get_applicant_profile.php (which returns `shared_documents`).

        // 2. FETCH CATEGORIES/JOBS
        $jobs_query = "
            SELECT rc.category_name, rj.job_title 
            FROM helper_jobs hj
            JOIN ref_jobs rj ON hj.job_id = rj.job_id
            JOIN ref_categories rc ON rj.category_id = rc.category_id
            WHERE hj.profile_id = $profile_id
        ";
        $jobs_result = $conn->query($jobs_query);
        $categories = [];
        $jobs = [];
        if ($jobs_result) {
            while ($job = $jobs_result->fetch_assoc()) {
                if (!in_array($job['category_name'], $categories)) $categories[] = $job['category_name'];
                if (!in_array($job['job_title'], $jobs)) $jobs[] = $job['job_title'];
            }
        }

        // 3. FETCH SKILLS
        $skills_query = "
            SELECT rs.skill_name 
            FROM helper_skills hs
            JOIN ref_skills rs ON hs.skill_id = rs.skill_id
            WHERE hs.profile_id = $profile_id
        ";
        $skills_result = $conn->query($skills_query);
        $skills = [];
        if ($skills_result) {
            while ($skill = $skills_result->fetch_assoc()) {
                $skills[] = $skill['skill_name'];
            }
        }

        // Map everything exactly as the Applications Screen expects it!
        $applications[] = [
            'application_id' => (string)$row['application_id'],
            'job_post_id'    => (string)$row['job_post_id'],
            'helper_id'      => (string)$row['helper_id'],
            'status'         => $row['status'],
            'employer_signed_at' => $row['employer_signed_at'] ?? null,
            'helper_signed_at' => $row['helper_signed_at'] ?? null,
            'contract_generated_at' => $row['contract_generated_at'] ?? null,
            'helper_decline_reason' => $row['helper_decline_reason'] ?? null,
            'helper_decline_at' => $row['helper_decline_at'] ?? null,
            'confirmed_salary'       => $row['confirmed_salary'] !== null ? (float)$row['confirmed_salary'] : null,
            'work_hours'             => $row['work_hours'] ?? null,
            'rest_days'              => $row['rest_days'] ? (json_decode($row['rest_days'], true) ?: []) : [],
            'employment_start_date'  => $row['employment_start_date'] ?? null,
            'employment_end_date'    => $row['employment_end_date'] ?? null,
            'contract_duration'      => $row['contract_duration'] ?? null,
            'payment_schedule'       => $row['payment_schedule'] ?? null,
            'other_benefits'         => $row['other_benefits'] ?? null,
            'pdf_file_path'          => $row['pdf_file_path'] ?? null,
            'interview_id'           => $row['interview_id'] !== null ? (int)$row['interview_id'] : null,
            'interview_date'         => $row['interview_date'] ?? null,
            'interview_type'         => $row['interview_type'] ?? null,
            'location_or_link'       => $row['location_or_link'] ?? null,
            'interview_status'       => $row['interview_status'] ?? null,
            'parent_confirmed'       => (bool)$row['parent_confirmed'],
            'helper_confirmed'       => (bool)$row['helper_confirmed'],
            'applied_at'     => $row['applied_at'],
            'cover_letter'   => $row['cover_letter'],
            'job_title'      => $row['job_title']    ?? null,
            'job_start_date' => $row['job_start_date'] ?? null,
            'category_name'  => $row['category_name'] ?? null,
            
            // Personal & Contact
            'helper_name' => trim($row['first_name'] . ' ' . $row['last_name']),
            'helper_photo' => $row['profile_image']
                ? (stripos($row['profile_image'], 'http') === 0
                    ? $row['profile_image']
                    : carelink_url_scheme() . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/" . $row['profile_image'])
                : null,
            'helper_age' => $age,
            'helper_gender' => $row['gender'],
            'helper_email' => $row['email'],
            'helper_phone' => $row['contact_number'],
            
            // Professional
            'helper_categories' => $categories,
            'helper_jobs' => $jobs,
            'helper_skills' => $skills,
            'helper_experience_years' => (int)$row['experience_years'],
            
            // Background
            'helper_education_level' => $row['education_level'],
            'helper_religion' => $row['religion'],
            'helper_civil_status' => $row['civil_status'],
            'helper_bio' => $row['bio'],

            // Work preferences
            'helper_employment_type' => $row['employment_type'],
            'helper_work_schedule'   => $row['work_schedule'],
            'helper_expected_salary' => $row['expected_salary'] !== null ? (float)$row['expected_salary'] : null,
            'helper_salary_period'   => $row['salary_period'],

            // Address
            'helper_barangay' => $row['barangay'],
            'helper_municipality' => $row['municipality'],
            'helper_province' => $row['province'],
            
            // Meta Statuses
            'verification_status' => $row['verification_status'],
            // No dedicated availability column yet — helpers on the platform are assumed open to work
            'availability_status' => 'Available',
            'helper_rating_average' => (float)$row['rating_average'],
            'helper_rating_count' => (int)$row['rating_count'],
        ];
    }

    echo json_encode(['success' => true, 'applications' => $applications]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>