<?php
include '../db_connection.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$response = array();

// We need to fetch the skill, its job title, and its main category
// ASSUMPTION: You have tables linked like: 
// ref_skills -> ref_job_profiles (job titles) -> ref_job_categories (categories)
$sql = "
    SELECT 
        s.skill_id, 
        s.skill_name, 
        jp.job_title, 
        jc.category_name 
    FROM ref_skills s
    JOIN ref_job_profiles jp ON s.job_profile_id = jp.job_profile_id
    JOIN ref_job_categories jc ON jp.category_id = jc.category_id
    ORDER BY jc.category_name ASC, jp.job_title ASC, s.skill_name ASC
";

$result = $conn->query($sql);

if ($result) {
    $skills = array();
    while ($row = $result->fetch_assoc()) {
        $skills[] = $row;
    }
    echo json_encode(array("success" => true, "data" => $skills));
} else {
    echo json_encode(array("success" => false, "message" => "SQL Error: " . $conn->error));
}

$conn->close();
?>