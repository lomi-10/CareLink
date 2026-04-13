<?php
// carelink_api/parent/get_master_data.php
// API to fetch reference data for job posting (Categories, Jobs, Skills, Languages, Religions)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

ini_set('display_errors', 0);
error_reporting(0);
require_once '../dbcon.php';

try {
    // 1. Categories
    $categories = [];
    $res = $conn->query("SELECT category_id, category_name as name FROM ref_categories ORDER BY category_id");
    while($row = $res->fetch_assoc()) $categories[] = $row;

    // 2. Jobs
    $jobs = [];
    $res = $conn->query("SELECT job_id, category_id, job_title FROM ref_jobs ORDER BY category_id, job_title");
    while($row = $res->fetch_assoc()) $jobs[] = $row;

    // 3. Skills
    $skills = [];
    $res = $conn->query("SELECT skill_id, job_id, skill_name FROM ref_skills ORDER BY job_id, skill_name");
    while($row = $res->fetch_assoc()) $skills[] = $row;

    // 4. Languages
    $languages = [];
    $res = $conn->query("SELECT language_id, language_name FROM ref_languages ORDER BY language_name");
    while($row = $res->fetch_assoc()) $languages[] = $row;

    // 5. Religions
    $religions = [
        ['id' => 'Catholic', 'name' => 'Roman Catholic'],
        ['id' => 'Christian', 'name' => 'Christian'],
        ['id' => 'Iglesia', 'name' => 'Iglesia ni Cristo'],
        ['id' => 'Muslim', 'name' => 'Islam'],
        ['id' => 'Others', 'name' => 'Others'],
        ['id' => 'None', 'name' => 'No Preference']
    ];

    echo json_encode([
        'success' => true,
        'categories' => $categories,
        'jobs' => $jobs,
        'skills' => $skills,
        'languages' => $languages,
        'religions' => $religions
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
