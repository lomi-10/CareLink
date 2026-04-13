<?php
// carelink_api/parent/browse.php

// 1. Force CORS headers
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once '../dbcon.php'; 

try {
    // FIXED: Removed u.phone and correctly added hp.contact_number
    $query = "
        SELECT 
            u.user_id, u.first_name, u.last_name, u.email,
            hp.profile_id, hp.contact_number, hp.profile_image, hp.birth_date, hp.gender,
            hp.experience_years, hp.employment_type, hp.work_schedule,
            hp.expected_salary, hp.barangay, hp.municipality, hp.province,
            hp.education_level, hp.religion, hp.civil_status,
            hp.verification_status, hp.availability_status,
            hp.rating_average, hp.rating_count, hp.bio
        FROM users u
        JOIN helper_profiles hp ON u.user_id = hp.user_id
        WHERE u.user_type = 'helper' AND u.status = 'approved'
    ";

    $result = $conn->query($query);

    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $helpers = [];

    while ($row = $result->fetch_assoc()) {
        $user_id = (int)$row['user_id'];
        $profile_id = (int)$row['profile_id'];

        // Calculate exact age dynamically
        $age = null;
        if (!empty($row['birth_date'])) {
            try {
                $dob = new DateTime($row['birth_date']);
                $now = new DateTime();
                $age = $now->diff($dob)->y;
            } catch (Exception $e) {
                $age = null; 
            }
        }

        // --- FETCH CATEGORIES AND SPECIFIC JOBS ---
        $jobs_query = "
            SELECT rc.category_id, rc.category_name, rj.job_title 
            FROM helper_jobs hj
            JOIN ref_jobs rj ON hj.job_id = rj.job_id
            JOIN ref_categories rc ON rj.category_id = rc.category_id
            WHERE hj.profile_id = $profile_id
        ";
        
        $jobs_result = $conn->query($jobs_query);
        $category_ids = [];
        $categories = [];
        $jobs = [];
        
        if ($jobs_result) {
            while ($job = $jobs_result->fetch_assoc()) {
                if (!in_array((string)$job['category_id'], $category_ids)) {
                    $category_ids[] = (string)$job['category_id'];
                    $categories[] = $job['category_name'];
                }
                if (!in_array($job['job_title'], $jobs)) {
                    $jobs[] = $job['job_title'];
                }
            }
        }

        // --- FETCH SPECIFIC SKILLS ---
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

        // --- FETCH DOCUMENTS (FROM DOCUMENTS TABLE) ---
        $docs_query = "SELECT document_type, file_path FROM user_documents WHERE user_id = $user_id";
        $docs_result = $conn->query($docs_query);
        
        $police_clearance = null;
        $nbi_clearance = null;
        $medical_certificate = null;
        $tesda_nc2 = null;

        if ($docs_result) {
            while ($doc = $docs_result->fetch_assoc()) {
                $type = $doc['document_type'];
                $path = $doc['file_path'];
                
                if ($type === 'Police Clearance') $police_clearance = $path;
                if ($type === 'NBI Clearance') $nbi_clearance = $path;
                if ($type === 'Medical Certificate') $medical_certificate = $path;
                if ($type === 'TESDA NC2') $tesda_nc2 = $path;
            }
        }

        // Build the JSON object exactly how your React app expects it
        $helpers[] = [
            'user_id' => (string)$row['user_id'],
            'profile_id' => (string)$row['profile_id'],
            'full_name' => trim($row['first_name'] . ' ' . $row['last_name']),
            'first_name' => $row['first_name'],
            'last_name' => $row['last_name'],
            'profile_image' => $row['profile_image'],
            'age' => $age,
            'gender' => $row['gender'],
            
            // FIXED: Now mapping hp.contact_number!
            'email' => $row['email'],
            'phone' => $row['contact_number'],
            
            // Professional
            'category_ids' => $category_ids,
            'categories' => $categories,
            'jobs' => $jobs,
            'skills' => $skills,
            
            'experience_years' => (int)$row['experience_years'],
            'employment_type' => $row['employment_type'],
            'work_schedule' => $row['work_schedule'],
            'expected_salary' => (float)$row['expected_salary'],
            
            // Background
            'education_level' => $row['education_level'],
            'religion' => $row['religion'],
            'civil_status' => $row['civil_status'],
            
            // Documents
            'police_clearance' => $police_clearance,
            'nbi_clearance' => $nbi_clearance,
            'medical_certificate' => $medical_certificate,
            'tesda_nc2' => $tesda_nc2,
            
            // Location
            'barangay' => $row['barangay'],
            'municipality' => $row['municipality'],
            'province' => $row['province'],
            
            // Meta
            'verification_status' => $row['verification_status'],
            'availability_status' => $row['availability_status'],
            'rating_average' => (float)$row['rating_average'],
            'rating_count' => (int)$row['rating_count'],
            'bio' => $row['bio']
        ];
    }

    echo json_encode([
        'success' => true,
        'helpers' => $helpers
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>