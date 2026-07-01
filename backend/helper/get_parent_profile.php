<?php
// carelink_api/helper/get_parent_profile.php
// Returns full parent profile details for helpers viewing a job

ob_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
ini_set('display_errors', 0);
error_reporting(0);
include_once '../dbcon.php';
include_once __DIR__ . '/../shared/ownership_guard.php';
include_once __DIR__ . '/../shared/file_security.php';

function send($success, $message, $data = null) {
    if (ob_get_level()) ob_clean();
    $r = ['success' => $success, 'message' => $message];
    if ($data !== null) $r['data'] = $data;
    echo json_encode($r);
    exit();
}

try {
    if (!isset($_GET['parent_id'])) throw new Exception('parent_id is required');
    $parent_id = intval($_GET['parent_id']);
    $requester_id = isset($_GET['requester_id']) ? intval($_GET['requester_id']) : 0;
    // Deliberately cross-user (helpers browse employer profiles before
    // applying) — just requires a real logged-in account, not ownership.
    carelink_require_authenticated_user($conn, $requester_id);

    // ── 1. Basic user info ──────────────────────────────────────────────────
    $uStmt = $conn->prepare(
        "SELECT user_id, email, first_name, middle_name, last_name, status, created_at
         FROM users WHERE user_id = ? AND user_type = 'parent'"
    );
    $uStmt->bind_param("i", $parent_id);
    $uStmt->execute();
    $user = $uStmt->get_result()->fetch_assoc();
    $uStmt->close();
    if (!$user) throw new Exception('Parent not found');

    // ── 2. Parent profile ───────────────────────────────────────────────────
    $pStmt = $conn->prepare("SELECT * FROM parent_profiles WHERE user_id = ?");
    $pStmt->bind_param("i", $parent_id);
    $pStmt->execute();
    $profile = $pStmt->get_result()->fetch_assoc();
    $pStmt->close();

    // Build profile image URL
    if ($profile && $profile['profile_image']) {
        $img = (string) $profile['profile_image'];
        if (preg_match('#/uploads/profiles/(https?://)#i', $img)) {
            $img = preg_replace('#^.*?/uploads/profiles/#i', '', $img);
            $img = ltrim($img, '/');
        }
        if (stripos($img, 'http') === 0) {
            $profile['profile_image'] = $img;
        } else {
            $profile['profile_image'] = "http://" . $_SERVER['HTTP_HOST'] . "/carelink_api/uploads/profiles/" . $img;
        }
    }

    // ── 3. Household info ───────────────────────────────────────────────────
    $household = null;
    if ($profile) {
        $profile_id = (int) $profile['profile_id'];
        $hhStmt = $conn->prepare(
            "SELECT household_id, household_size, household_type, has_children, has_elderly, has_pets, pet_details
             FROM parent_household WHERE profile_id = ? LIMIT 1"
        );
        $hhStmt->bind_param("i", $profile_id);
        $hhStmt->execute();
        $household = $hhStmt->get_result()->fetch_assoc();
        $hhStmt->close();

        // ── 4. Children ────────────────────────────────────────────────────
        $children = [];
        $chStmt = $conn->prepare(
            "SELECT child_id, age, gender, special_needs FROM parent_children WHERE profile_id = ? ORDER BY child_id"
        );
        $chStmt->bind_param("i", $profile_id);
        $chStmt->execute();
        $chRes = $chStmt->get_result();
        while ($r = $chRes->fetch_assoc()) $children[] = $r;
        $chStmt->close();

        // ── 5. Elderly ─────────────────────────────────────────────────────
        $elderly = [];
        $elStmt = $conn->prepare(
            "SELECT elderly_id, age, gender, `condition`, care_level FROM parent_elderly WHERE profile_id = ? ORDER BY elderly_id"
        );
        $elStmt->bind_param("i", $profile_id);
        $elStmt->execute();
        $elRes = $elStmt->get_result();
        while ($r = $elRes->fetch_assoc()) $elderly[] = $r;
        $elStmt->close();
    } else {
        $children = [];
        $elderly  = [];
    }

    // ── 6. Rating ───────────────────────────────────────────────────────────
    $ratingStmt = $conn->prepare(
        "SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM placement_reviews WHERE reviewee_id = ?"
    );
    $ratingStmt->bind_param("i", $parent_id);
    $ratingStmt->execute();
    $ratingRow = $ratingStmt->get_result()->fetch_assoc();
    $ratingStmt->close();
    $avgRating    = $ratingRow ? round(floatval($ratingRow['avg_rating']), 1) : 0;
    $reviewCount  = $ratingRow ? intval($ratingRow['review_count']) : 0;

    // ── 7. Job posts count ──────────────────────────────────────────────────
    $jobCountStmt = $conn->prepare(
        "SELECT COUNT(*) as total FROM job_posts WHERE parent_id = ? AND status = 'Open'"
    );
    $jobCountStmt->bind_param("i", $parent_id);
    $jobCountStmt->execute();
    $jobCountRow = $jobCountStmt->get_result()->fetch_assoc();
    $jobCountStmt->close();
    $activeJobCount = $jobCountRow ? intval($jobCountRow['total']) : 0;

    // ── 8. Documents (Barangay Clearance + Valid ID only) ───────────────────
    $docStmt = $conn->prepare(
        "SELECT document_id, document_type, file_path, status FROM user_documents
         WHERE user_id = ? AND status = 'Verified'
         ORDER BY FIELD(document_type, 'Barangay Clearance', 'Valid ID')"
    );
    $docStmt->bind_param("i", $parent_id);
    $docStmt->execute();
    $docRes = $docStmt->get_result();
    $documents = [];
    while ($doc = $docRes->fetch_assoc()) {
        $documents[] = [
            'document_type' => $doc['document_type'],
            'status'        => $doc['status'],
            'file_url'      => $doc['file_path'] ? carelink_signed_document_url((int) $doc['document_id']) : null,
        ];
    }
    $docStmt->close();

    // ── Recent reviews (helpers browsing employer reputation) ─────────────────
    $recentReviews = [];
    $revSql = "
        SELECT pr.rating,
               COALESCE(pr.review_text, '') AS review_text,
               TRIM(CONCAT(COALESCE(ru.first_name,''), ' ', COALESCE(ru.last_name,''))) AS reviewer_name
        FROM placement_reviews pr
        INNER JOIN users ru ON ru.user_id = pr.reviewer_id
        WHERE pr.reviewee_id = ?
        ORDER BY pr.placement_id DESC, pr.reviewer_id DESC
        LIMIT 15
    ";
    $revStmt = $conn->prepare($revSql);
    if ($revStmt) {
        $revStmt->bind_param('i', $parent_id);
        $revStmt->execute();
        $revRes = $revStmt->get_result();
        while ($revRes && ($rr = $revRes->fetch_assoc())) {
            $recentReviews[] = [
                'rating' => round((float) ($rr['rating'] ?? 0), 1),
                'review_text' => trim((string) ($rr['review_text'] ?? '')),
                'reviewer_name' => trim((string) ($rr['reviewer_name'] ?? '')) ?: 'Reviewer',
            ];
        }
        if ($revRes) {
            $revRes->free();
        }
        $revStmt->close();
    }

    send(true, 'Parent profile retrieved', [
        'user'          => $user,
        'profile'       => $profile,
        'household'     => $household,
        'children'      => $children,
        'elderly'       => $elderly,
        'avg_rating'    => $avgRating,
        'review_count'  => $reviewCount,
        'active_jobs'   => $activeJobCount,
        'documents'     => $documents,
        'recent_reviews' => $recentReviews,
    ]);

} catch (Exception $e) {
    send(false, $e->getMessage());
}
if (isset($conn) && $conn) $conn->close();
?>
