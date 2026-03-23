<?php
// carelink_api/get_categories.php
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

    $sql = "SELECT category_id, category_name, description FROM ref_categories ORDER BY category_name";
    $result = $conn->query($sql);
    
    $categories = array();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $categories[] = $row;
        }
    }

    echo json_encode([
        'success' => true,
        'categories' => $categories,
        'data' => $categories // Sending both to be safe with your hooks
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) $conn->close();
?>