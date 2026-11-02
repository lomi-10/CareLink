<?php

ob_start();
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../dbcon.php';
require_once __DIR__ . '/auth_tokens.php';
require_once __DIR__ . '/experience_verification.php';

function carelink_experience_confirmation_response(bool $success, string $message, array $data = [], int $status = 200): void
{
    if (ob_get_level()) {
        ob_clean();
    }
    http_response_code($status);
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit();
}

try {
    $transactionStarted = false;
    if (!$conn) {
        throw new RuntimeException('Database connection failed.');
    }
    $userId = carelink_authenticated_user_id($conn);
    if ($userId <= 0) {
        carelink_experience_confirmation_response(false, 'Please sign in again.', [], 401);
    }

    $accountStmt = $conn->prepare("SELECT user_type, status FROM users WHERE user_id = ? LIMIT 1");
    if (!$accountStmt) {
        throw new RuntimeException('Could not verify your account.');
    }
    $accountStmt->bind_param('i', $userId);
    if (!$accountStmt->execute()) {
        $accountStmt->close();
        throw new RuntimeException('Could not verify your account.');
    }
    $account = $accountStmt->get_result()->fetch_assoc();
    $accountStmt->close();
    if (!$account || !in_array($account['user_type'], ['helper', 'parent'], true)) {
        carelink_experience_confirmation_response(false, 'Only helpers and employers can confirm placement experience.', [], 403);
    }
    if (strtolower(trim((string) $account['status'])) === 'suspended') {
        carelink_experience_confirmation_response(false, 'This account is suspended.', [], 403);
    }
    $userType = (string) $account['user_type'];
    ensure_experience_verification_schema($conn);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $placements = carelink_pending_placement_confirmations($conn, $userId, $userType);
        carelink_experience_confirmation_response(true, 'Placement confirmations loaded.', ['placements' => $placements]);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        carelink_experience_confirmation_response(false, 'GET or POST required.', [], 405);
    }

    $input = json_decode((string) file_get_contents('php://input'), true);
    $placementId = is_array($input) ? (int) ($input['placement_id'] ?? 0) : 0;
    if ($placementId <= 0) {
        carelink_experience_confirmation_response(false, 'A valid placement is required.', [], 400);
    }

    $ownerColumn = $userType === 'helper' ? 'p.helper_id' : 'p.parent_id';
    $confirmationColumn = $userType === 'helper' ? 'helper_confirmed_at' : 'parent_confirmed_at';
    $endedOn = carelink_ended_placement_experience_sql();
    $conn->begin_transaction();
    $transactionStarted = true;

    $placementStmt = $conn->prepare(
        "SELECT p.placement_id
         FROM placements p
         INNER JOIN job_applications ja ON ja.application_id = p.application_id
         INNER JOIN contracts c ON c.application_id = p.application_id
         WHERE p.placement_id = ?
           AND {$ownerColumn} = ?
           AND ja.employer_signed_at IS NOT NULL
           AND ja.helper_signed_at IS NOT NULL
           AND {$endedOn} IS NOT NULL
           AND COALESCE(c.employment_start_date, p.start_date) <= {$endedOn}
         LIMIT 1
         FOR UPDATE"
    );
    if (!$placementStmt) {
        throw new RuntimeException('Unable to prepare the placement confirmation.');
    }
    $placementStmt->bind_param('ii', $placementId, $userId);
    if (!$placementStmt->execute()) {
        $placementStmt->close();
        throw new RuntimeException('Unable to check this placement.');
    }
    $placement = $placementStmt->get_result()->fetch_assoc();
    $placementStmt->close();
    if (!$placement) {
        $conn->rollback();
        $transactionStarted = false;
        carelink_experience_confirmation_response(
            false,
            'This placement is not eligible for confirmation or does not belong to your account.',
            [],
            403
        );
    }

    $confirmStmt = $conn->prepare(
        "INSERT INTO placement_experience_confirmations (placement_id, {$confirmationColumn})
         VALUES (?, NOW())
         ON DUPLICATE KEY UPDATE {$confirmationColumn} = COALESCE({$confirmationColumn}, NOW())"
    );
    if (!$confirmStmt) {
        throw new RuntimeException('Unable to save the placement confirmation.');
    }
    $confirmStmt->bind_param('i', $placementId);
    if (!$confirmStmt->execute()) {
        $confirmStmt->close();
        throw new RuntimeException('Unable to save the placement confirmation.');
    }
    $confirmStmt->close();

    $stateStmt = $conn->prepare(
        'SELECT helper_confirmed_at, parent_confirmed_at
         FROM placement_experience_confirmations WHERE placement_id = ? LIMIT 1'
    );
    if (!$stateStmt) {
        throw new RuntimeException('Unable to check placement confirmation status.');
    }
    $stateStmt->bind_param('i', $placementId);
    if (!$stateStmt->execute()) {
        $stateStmt->close();
        throw new RuntimeException('Unable to check placement confirmation status.');
    }
    $state = $stateStmt->get_result()->fetch_assoc();
    $stateStmt->close();
    $verified = $state
        && $state['helper_confirmed_at'] !== null
        && $state['parent_confirmed_at'] !== null;

    $conn->commit();
    $transactionStarted = false;
    carelink_experience_confirmation_response(
        true,
        $verified
            ? 'Both sides confirmed this CareLink placement.'
            : 'Your confirmation is saved. The other person must also confirm before it appears as verified experience.',
        ['platform_confirmed' => $verified]
    );
} catch (Throwable $e) {
    if (!empty($transactionStarted) && isset($conn) && $conn instanceof mysqli) {
        try {
            $conn->rollback();
        } catch (Throwable $rollbackError) {
            error_log('Placement experience rollback failed: ' . $rollbackError->getMessage());
        }
    }
    error_log('Placement experience confirmation failed: ' . $e->getMessage());
    carelink_experience_confirmation_response(false, $e->getMessage(), [], 400);
}
