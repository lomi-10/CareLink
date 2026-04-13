<?php
// carelink_api/peso/get_dashboard_stats.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../dbcon.php';

$stats = [
    'total_helpers' => 0,
    'pending_helpers' => 0,
    'verified_helpers' => 0,
    'total_parents' => 0,
    'pending_documents' => 0,
    'verified_documents' => 0,
    'pending_jobs' => 0,
    'total_jobs' => 0
];

try {
    // Helper Stats (Checking helper_profiles for verification_status)
    $res = $conn->query("SELECT COUNT(*) as count FROM users WHERE user_type = 'helper'");
    if($res) $stats['total_helpers'] = $res->fetch_assoc()['count'];

    $res = $conn->query("SELECT COUNT(*) as count FROM helper_profiles WHERE verification_status = 'Pending'");
    if($res) $stats['pending_helpers'] = $res->fetch_assoc()['count'];

    $res = $conn->query("SELECT COUNT(*) as count FROM helper_profiles WHERE verification_status = 'Verified'");
    if($res) $stats['verified_helpers'] = $res->fetch_assoc()['count'];

    // Parent Stats
    $res = $conn->query("SELECT COUNT(*) as count FROM users WHERE user_type = 'parent'");
    if($res) $stats['total_parents'] = $res->fetch_assoc()['count'];

    // Job Stats
    $res = $conn->query("SELECT COUNT(*) as count FROM job_posts WHERE status = 'Pending'");
    if($res) $stats['pending_jobs'] = $res->fetch_assoc()['count'];

    $res = $conn->query("SELECT COUNT(*) as count FROM job_posts WHERE status = 'Open'");
    if($res) $stats['total_jobs'] = $res->fetch_assoc()['count'];

    // Document Stats (Using your user_documents table)
    $res = $conn->query("SELECT COUNT(*) as count FROM user_documents WHERE status = 'Pending'");
    if($res) $stats['pending_documents'] = $res->fetch_assoc()['count'];

    $res = $conn->query("SELECT COUNT(*) as count FROM user_documents WHERE status = 'Verified'");
    if($res) $stats['verified_documents'] = $res->fetch_assoc()['count'];

    echo json_encode(['success' => true, 'data' => $stats]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>