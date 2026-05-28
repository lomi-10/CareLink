<?php
/**
 * GET ?application_id=&user_id=&user_type=parent|helper
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/placement_dispute_helpers.php';

function row_tri(?array $row, string $key): ?bool
{
    if (!$row || !array_key_exists($key, $row)) {
        return null;
    }
    $v = $row[$key];
    if ($v === null) {
        return null;
    }

    return (int) $v === 1;
}

function out_json($data)
{
    echo json_encode($data);
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    $application_id = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;
    $user_id = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
    $user_type = isset($_GET['user_type']) ? trim((string) $_GET['user_type']) : '';
    if ($application_id <= 0 || $user_id <= 0) {
        out_json(['success' => false, 'message' => 'application_id and user_id required']);
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        out_json(['success' => false, 'message' => 'user_type must be parent or helper']);
    }

    $hire = carelink_load_application_parties($conn, $application_id);
    if (!$hire) {
        out_json(['success' => false, 'message' => 'Placement not found']);
    }
    if (!carelink_user_on_application($hire, $user_id, $user_type)) {
        out_json(['success' => false, 'message' => 'Not authorized']);
    }

    $parent_interested = null;
    $helper_interested = null;
    $st = $conn->prepare('SELECT parent_interested, helper_interested FROM placement_renewal_intent WHERE application_id = ? LIMIT 1');
    if ($st) {
        $st->bind_param('i', $application_id);
        $st->execute();
        $res = $st->get_result();
        $row = $res ? $res->fetch_assoc() : null;
        if ($res) {
            $res->free();
        }
        $st->close();
        if ($row) {
            $parent_interested = row_tri($row, 'parent_interested');
            $helper_interested = row_tri($row, 'helper_interested');
        }
    }

    $both = $parent_interested === true && $helper_interested === true;

    out_json([
        'success' => true,
        'application_id' => $application_id,
        'parent_interested' => $parent_interested,
        'helper_interested' => $helper_interested,
        'both_interested' => $both,
    ]);
} catch (Exception $e) {
    out_json(['success' => false, 'message' => $e->getMessage()]);
}
