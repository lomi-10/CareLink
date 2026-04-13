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

if (!isset($_GET['job_post_id'])) {
    echo json_encode(['success' => false, 'message' => 'Missing job_post_id']);
    exit;
}

$job_post_id = (int)$_GET['job_post_id'];

try {
    // 1. Fetch Application + User + Helper Profile Data
    $query = "
        SELECT 
            a.application_id, a.job_post_id, a.helper_id, a.status, a.applied_at, a.cover_letter,
            u.first_name, u.last_name, u.email, hp.contact_number,
            hp.profile_id, hp.profile_image, hp.birth_date, hp.gender,
            hp.experience_years, hp.barangay, hp.municipality, hp.province,
            hp.education_level, hp.religion, hp.civil_status, hp.bio,
            hp.verification_status, hp.availability_status, hp.rating_average, hp.rating_count
        FROM job_applications a
        JOIN users u ON a.helper_id = u.user_id
        JOIN helper_profiles hp ON u.user_id = hp.user_id
        WHERE a.job_post_id = $job_post_id
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

        // 2. FETCH DOCUMENTS FOR THIS APPLICANT
        $docs_query = "SELECT document_type, file_path FROM user_documents WHERE user_id = $helper_id";
        $docs_result = $conn->query($docs_query);
        
        $police_clearance = null;
        $nbi_clearance = null;
        $medical_certificate = null;
        $tesda_nc2 = null;

        if ($docs_result) {
            while ($doc = $docs_result->fetch_assoc()) {
                if ($doc['document_type'] === 'Police Clearance') $police_clearance = $doc['file_path'];
                if ($doc['document_type'] === 'NBI Clearance') $nbi_clearance = $doc['file_path'];
                if ($doc['document_type'] === 'Medical Certificate') $medical_certificate = $doc['file_path'];
                if ($doc['document_type'] === 'TESDA NC2') $tesda_nc2 = $doc['file_path'];
            }
        }

        // 3. FETCH CATEGORIES/JOBS
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

        // 4. FETCH SKILLS
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
            'job_post_id' => (string)$row['job_post_id'],
            'helper_id' => (string)$row['helper_id'],
            'status' => $row['status'],
            'applied_at' => $row['applied_at'],
            'cover_letter' => $row['cover_letter'],
            
            // Personal & Contact
            'helper_name' => trim($row['first_name'] . ' ' . $row['last_name']),
            'helper_photo' => $row['profile_image'],
            'helper_age' => $age,
            'helper_gender' => $row['gender'],
            'helper_email' => $row['email'],
            'helper_phone' => $row['phone'],
            
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
            
            // Address
            'helper_barangay' => $row['barangay'],
            'helper_municipality' => $row['municipality'],
            'helper_province' => $row['province'],
            
            // Documents
            'helper_police_clearance' => $police_clearance,
            'helper_nbi_clearance' => $nbi_clearance,
            'helper_medical_certificate' => $medical_certificate,
            'helper_tesda_nc2' => $tesda_nc2,
            
            // Meta Statuses
            'verification_status' => $row['verification_status'],
            'availability_status' => $row['availability_status'],
            'helper_rating_average' => (float)$row['rating_average'],
            'helper_rating_count' => (int)$row['rating_count'],
        ];
    }

    echo json_encode(['success' => true, 'applications' => $applications]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>