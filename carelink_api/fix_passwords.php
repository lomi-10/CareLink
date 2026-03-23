<?php
// carelink_api/fix_passwords.php
// ONE-TIME SCRIPT: Fixes plain text passwords from legacy XAMPP accounts
// Access: http://localhost/carelink_api/fix_passwords.php
// DELETE THIS FILE after running!

header('Content-Type: text/html; charset=UTF-8');

require_once 'dbcon.php';

echo "<h1>CareLink - Fix Legacy Passwords</h1>";
echo "<p>This script will hash any plain text passwords...</p>";

// Legacy accounts with plain text passwords
$legacy_accounts = [
    ['email' => 'jess@carelink.com', 'password' => 'Jess#1234'],
    ['email' => 'gabriel@peso.com', 'password' => 'Gabriel#123'],
];

echo "<h2>Processing...</h2>";
echo "<ul>";

$fixed_count = 0;
$skipped_count = 0;

foreach ($legacy_accounts as $account) {
    $email = $account['email'];
    $plain_password = $account['password'];
    
    // Check if user exists
    $stmt = mysqli_prepare($conn, "SELECT user_id, password FROM users WHERE email = ?");
    mysqli_stmt_bind_param($stmt, 's', $email);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    if ($row = mysqli_fetch_assoc($result)) {
        $user_id = $row['user_id'];
        $current_password = $row['password'];
        
        // Check if already hashed (starts with $2y$ for bcrypt)
        if (substr($current_password, 0, 4) === '$2y$') {
            echo "<li>⏭️ <strong>$email</strong> - Already hashed (skip)</li>";
            $skipped_count++;
        } else {
            // Hash the password
            $hashed = password_hash($plain_password, PASSWORD_BCRYPT);
            
            // Update database
            $update_stmt = mysqli_prepare($conn, "UPDATE users SET password = ? WHERE user_id = ?");
            mysqli_stmt_bind_param($update_stmt, 'si', $hashed, $user_id);
            
            if (mysqli_stmt_execute($update_stmt)) {
                echo "<li>✅ <strong>$email</strong> - Password hashed successfully</li>";
                $fixed_count++;
            } else {
                echo "<li>❌ <strong>$email</strong> - Failed to update: " . mysqli_error($conn) . "</li>";
            }
        }
    } else {
        echo "<li>⚠️ <strong>$email</strong> - Account not found</li>";
    }
}

echo "</ul>";

echo "<hr>";
echo "<h2>Summary:</h2>";
echo "<p>✅ Fixed: $fixed_count</p>";
echo "<p>⏭️ Skipped (already hashed): $skipped_count</p>";

if ($fixed_count > 0) {
    echo "<h3 style='color: green;'>✅ Legacy passwords have been hashed!</h3>";
    echo "<p>You can now login with these accounts using their original passwords.</p>";
    echo "<p><strong>⚠️ IMPORTANT:</strong> Delete this file (fix_passwords.php) immediately!</p>";
}

echo "<hr>";
echo "<h3>Test Login:</h3>";
echo "<ul>";
echo "<li><strong>jess@carelink.com</strong> / Jess#1234 (Super Admin)</li>";
echo "<li><strong>gabriel@peso.com</strong> / Gabriel#123 (PESO Officer)</li>";
echo "</ul>";

mysqli_close($conn);
?>