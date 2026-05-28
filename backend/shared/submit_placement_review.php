<?php
/**
 * POST JSON: application_id, user_id, user_type (parent|helper), rating (1-5), comment? (optional)
 * Inserts into `placement_reviews` (placement_id, reviewer_id, reviewee_id, reviewer_type, rating decimal, review_text).
 * Only when the placement has ended for both sides (aligned with renewal / “recently ended” rules).
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

ini_set('display_errors', 0);
require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/placement_dispute_helpers.php';

function out($ok, $msg, $extra = [])
{
    echo json_encode(array_merge(['success' => $ok, 'message' => $msg], $extra));
    exit();
}

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        out(false, 'POST required');
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $application_id = isset($input['application_id']) ? (int) $input['application_id'] : 0;
    $user_id = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    $user_type = isset($input['user_type']) ? trim((string) $input['user_type']) : '';
    $rating = isset($input['rating']) ? (int) $input['rating'] : 0;
    $comment = isset($input['comment']) ? trim((string) $input['comment']) : '';
    if ($comment !== '' && strlen($comment) > 2000) {
        $comment = substr($comment, 0, 2000);
    }

    if ($application_id <= 0 || $user_id <= 0) {
        out(false, 'application_id and user_id required');
    }
    if ($user_type !== 'parent' && $user_type !== 'helper') {
        out(false, 'user_type must be parent or helper');
    }
    if ($rating < 1 || $rating > 5) {
        out(false, 'rating must be between 1 and 5');
    }

    $hire = carelink_load_application_parties($conn, $application_id);
    if (!$hire) {
        out(false, 'Placement not found');
    }
    if (!carelink_user_on_application($hire, $user_id, $user_type)) {
        out(false, 'You are not a party on this placement');
    }
    if (!carelink_application_allows_review($hire)) {
        out(false, 'Reviews open only after the contract has fully ended');
    }

    $placement_id = carelink_placement_id_for_application($conn, $application_id);
    if ($placement_id === null) {
        out(false, 'No placement record found for this application; contact support if the job has ended.');
    }

    $helper_id = (int) $hire['helper_id'];
    $parent_id = (int) $hire['parent_id'];
    $reviewee = $user_type === 'parent' ? $helper_id : $parent_id;

    $rating_dec = (float) $rating;
    $role = $user_type;

    if ($comment === '') {
        $st = $conn->prepare('
            INSERT INTO placement_reviews (placement_id, reviewer_id, reviewee_id, reviewer_type, rating)
            VALUES (?, ?, ?, ?, ?)
        ');
        if (!$st) {
            throw new Exception('Prepare failed');
        }
        $st->bind_param('iiisd', $placement_id, $user_id, $reviewee, $role, $rating_dec);
    } else {
        $st = $conn->prepare('
            INSERT INTO placement_reviews (placement_id, reviewer_id, reviewee_id, reviewer_type, rating, review_text)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        if (!$st) {
            throw new Exception('Prepare failed');
        }
        $st->bind_param('iiisds', $placement_id, $user_id, $reviewee, $role, $rating_dec, $comment);
    }
    if (!$st->execute()) {
        if ($conn->errno === 1062) {
            $st->close();
            out(false, 'You already submitted a review for this placement');
        }
        $st->close();
        throw new Exception('Could not save review');
    }
    $rid = (int) $conn->insert_id;
    $st->close();

    out(true, 'Thank you — your review was saved.', ['review_id' => $rid]);
} catch (Exception $e) {
    out(false, $e->getMessage());
}
