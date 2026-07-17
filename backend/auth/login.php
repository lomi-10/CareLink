<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include("../dbcon.php");
require_once __DIR__ . "/../shared/phone.php";

// Helper function to get client IP
function get_client_ip() {
    $ipaddress = '';
    if (isset($_SERVER['HTTP_CLIENT_IP']))
        $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
    else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
    else if(isset($_SERVER['HTTP_X_FORWARDED']))
        $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
    else if(isset($_SERVER['REMOTE_ADDR']))
        $ipaddress = $_SERVER['REMOTE_ADDR'];
    else
        $ipaddress = 'UNKNOWN';
    return $ipaddress;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data["email"], $data["password"])) {
    echo json_encode(["success" => false, "message" => "Missing input fields"]);
    exit;
}

// The "email" field doubles as the identifier: users may type an email OR a
// mobile number. Older / less tech-savvy users remember 0917… far more reliably
// than an email address, so both are accepted in the one box.
$identifier = trim((string) $data["email"]);
$password = $data["password"];
$ip_address = get_client_ip();
$user_agent = $_SERVER['HTTP_USER_AGENT']; // Captures "Mozilla/5.0..." (Device Info)

$phoneLookup = carelink_looks_like_phone($identifier)
    ? carelink_normalize_ph_mobile($identifier)
    : null;

if ($phoneLookup !== null) {
    // Matched on the canonical number, so 0917…, +6391…, and 0917 123 4567 all
    // find the same account.
    $stmt = $conn->prepare("SELECT * FROM users WHERE phone = ?");
    $stmt->bind_param("s", $phoneLookup);
} else {
    $email = strtolower($identifier);
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
}
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Please enter correct email/mobile number and/or password.",
        "reason"  => "wrong_password",
    ]);
    exit;
}

$row = $result->fetch_assoc();
$user_id = $row['user_id'];

// --- HANDLE THE EMPTY MIDDLE NAME ---
// If middle name is empty or null, we make it an empty string. Otherwise, we add a space after it.
$first = $row['first_name'] ?? '';
$middle = (!empty($row['middle_name'])) ? $row['middle_name'] . ' ' : '';
$last = $row['last_name'] ?? '';

// This creates a perfectly spaced full name, whether they have a middle name or not!
$clean_full_name = trim($first . ' ' . $middle . $last);

if (password_verify($password, $row["password"])) {

    // Email verification gate — checked BEFORE the approval gate so an unverified
    // user is told to verify rather than the misleading "pending approval".
    // Accounts created before verification shipped were backfilled as verified,
    // so this can never lock out an existing user.
    if (empty($row['email_verified_at'])) {
        $log_stmt = $conn->prepare("INSERT INTO log_trail (user_id, action, module, status, ip_address, device_info) VALUES (?, 'LOGIN', 'Auth', 'Failed', ?, ?)");
        $log_stmt->bind_param("iss", $user_id, $ip_address, $user_agent);
        $log_stmt->execute();

        echo json_encode([
            "success"  => false,
            "message"  => "Please verify your email to continue. Check your inbox for the 6-digit code.",
            "reason"   => "email_unverified",
            "user_id"  => (int) $row['user_id'],
            "email"    => $row['email'],
        ]);
        exit;
    }

    if ($row['status'] !== 'approved') {
        // Log Failed Attempt
        $log_stmt = $conn->prepare("INSERT INTO log_trail (user_id, action, module, status, ip_address, device_info) VALUES (?, 'LOGIN', 'Auth', 'Failed', ?, ?)");
        $log_stmt->bind_param("iss", $user_id, $ip_address, $user_agent);
        $log_stmt->execute();
        
        $user = [
            "user_id" => $row['user_id'],
            "username" => $row['username'] ?? '',
            "first_name" => $first,       
            "middle_name" => $row['middle_name'] ?? '',
            "last_name" => $last,
            "full_name" => $clean_full_name, 
            "email" => $row['email'],
            "user_type" => $row['user_type'],
            "status" => $row['status'],
            "profile_completed" => (bool)($row['profile_completed'] ?? 0),
        ];

        echo json_encode([
            "success" => false,
            "message" => "Account pending for approval.",
            "user" => $user,
            "reason" => "Account Pending",
            "user_type" => $row['user_type']
        ]);
        exit;
    }
    
    // Log Success
    $log_stmt = $conn->prepare("INSERT INTO log_trail (user_id, action, module, status, ip_address, device_info) VALUES (?, 'LOGIN', 'Auth', 'Success', ?, ?)");
    $log_stmt->bind_param("iss", $user_id, $ip_address, $user_agent);
    $log_stmt->execute();
    
    $user = [
        "user_id" => $row['user_id'],
        "username" => $row['username'] ?? '',
        "first_name" => $first,       
        "middle_name" => $row['middle_name'] ?? '',
        "last_name" => $last,
        "full_name" => $clean_full_name, 
        "email" => $row['email'],
        "user_type" => $row['user_type'],
        "status" => $row['status'],
        "profile_completed" => (bool)($row['profile_completed'] ?? 0),
    ];

    echo json_encode([
        "success" => true,
        "message" => "Login Successful!",
        "user" => $user,
        "user_type" => $row['user_type']
    ]);

} else {
    // FIXED: Changed 'Failed (Password)' to 'Failed' to prevent DB enum/varchar crashes!
    $log_stmt = $conn->prepare("INSERT INTO log_trail (user_id, action, module, status, ip_address, device_info) VALUES (?, 'LOGIN', 'Auth', 'Failed', ?, ?)");
    $log_stmt->bind_param("iss", $user_id, $ip_address, $user_agent);
    $log_stmt->execute();
    
    echo json_encode(["success" => false, "message" => "Please enter correct email and/or password.", "reason" => "wrong_password"]);
}

$stmt->close();
$conn->close();
?>