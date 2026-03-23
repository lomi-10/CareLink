<?php
// carelink_api/shared/get_languages.php
ob_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../dbcon.php';

try {
    if (!$conn) throw new Exception("Database connection failed");

    $sql = "SELECT language_id, language_name FROM ref_languages ORDER BY language_name";
    $result = $conn->query($sql);
    
    $languages = array();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $languages[] = $row;
        }
    }

    echo json_encode([
        'success' => true,
        'languages' => $languages,
        'data' => $languages
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) $conn->close();
?>