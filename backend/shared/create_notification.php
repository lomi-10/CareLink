<?php
/**
 * Insert a row into notifications (used by task completion, etc.)
 *
 * @return int|false New notification_id or false
 */
function carelink_create_notification(
    mysqli $conn,
    int $user_id,
    string $type,
    string $title,
    string $message,
    ?string $ref_type = null,
    ?int $ref_id = null
) {
    if ($ref_id === null) {
        $st = $conn->prepare("
            INSERT INTO notifications (user_id, type, title, message, is_read, ref_type, ref_id, created_at)
            VALUES (?, ?, ?, ?, 0, ?, NULL, NOW())
        ");
        if (!$st) {
            return false;
        }
        $st->bind_param('issss', $user_id, $type, $title, $message, $ref_type);
    } else {
        $st = $conn->prepare("
            INSERT INTO notifications (user_id, type, title, message, is_read, ref_type, ref_id, created_at)
            VALUES (?, ?, ?, ?, 0, ?, ?, NOW())
        ");
        if (!$st) {
            return false;
        }
        $st->bind_param('issssi', $user_id, $type, $title, $message, $ref_type, $ref_id);
    }
    $st->execute();
    $nid = (int) $conn->insert_id;
    $st->close();
    return $nid > 0 ? $nid : false;
}

if (!function_exists('createNotification')) {
    /**
     * @param ?string $ref_type
     * @param ?int $ref_id
     */
    function createNotification(
        mysqli $conn,
        int $user_id,
        string $type,
        string $title,
        string $message,
        ?string $ref_type = null,
        ?int $ref_id = null
    ) {
        return carelink_create_notification($conn, $user_id, $type, $title, $message, $ref_type, $ref_id);
    }
}
