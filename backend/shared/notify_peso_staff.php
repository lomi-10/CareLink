<?php
// carelink_api/shared/notify_peso_staff.php
// Notify every active PESO officer (users.user_type = 'peso').

require_once __DIR__ . '/create_notification.php';

function notifyAllPesoStaff($conn, $type, $title, $message, $ref_type = null, $ref_id = null) {
    if (!$conn) return 0;
    $res = $conn->query("SELECT user_id FROM users WHERE user_type = 'peso' AND (status IS NULL OR LOWER(status) IN ('active','approved'))");
    if (!$res) return 0;
    $n = 0;
    while ($row = $res->fetch_assoc()) {
        $uid = (int)$row['user_id'];
        if ($uid && createNotification($conn, $uid, $type, $title, $message, $ref_type, $ref_id)) {
            $n++;
        }
    }
    return $n;
}
