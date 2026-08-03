<?php
/**
 * shared/staff_contacts.php — who a staff member is allowed to message.
 *
 * GET ?staff_user_id=&role=peso|admin[&q=search][&type=helper|parent|peso]
 *
 * Staff messaging reuses the ordinary messages table and endpoints; the only
 * thing missing was a way for staff to FIND someone to write to, since helpers
 * and employers discover each other through jobs and applications.
 *
 * Who may message whom:
 *   PESO staff  -> helpers, employers, and admins (to escalate)
 *   Admin       -> helpers, employers, and PESO staff
 *
 * Staff can reach each other in both directions. An officer who hits something
 * they can't resolve needs a way to raise it, and a one-way channel would have
 * meant falling back to chat outside the system — exactly what this replaces.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../dbcon.php';

try {
    if (!$conn) throw new Exception('Database connection failed');

    $staff_id = isset($_GET['staff_user_id']) ? (int) $_GET['staff_user_id'] : 0;
    $role     = trim((string) ($_GET['role'] ?? ''));
    $q        = trim((string) ($_GET['q'] ?? ''));
    $type     = trim((string) ($_GET['type'] ?? ''));

    if ($staff_id <= 0 || !in_array($role, ['peso', 'admin'], true)) {
        echo json_encode(['success' => false, 'message' => 'staff_user_id and a valid role are required.']);
        exit();
    }

    // The caller must actually BE that kind of staff — the role can't just be
    // asserted in the query string.
    $auth = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND user_type = ? LIMIT 1");
    $auth->bind_param('is', $staff_id, $role);
    $auth->execute();
    $isStaff = (bool) $auth->get_result()->fetch_assoc();
    $auth->close();
    if (!$isStaff) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Not an authorised staff account.']);
        exit();
    }

    $allowed = $role === 'admin'
        ? ['helper', 'parent', 'peso']
        : ['helper', 'parent', 'admin'];
    if ($type !== '' && in_array($type, $allowed, true)) {
        $allowed = [$type];
    }

    $placeholders = implode(',', array_fill(0, count($allowed), '?'));
    $types  = str_repeat('s', count($allowed));
    $params = $allowed;

    $where = "u.user_type IN ($placeholders) AND u.user_id <> ?";
    $types .= 'i';
    $params[] = $staff_id;

    if ($q !== '') {
        $where .= " AND (CONCAT_WS(' ', u.first_name, u.last_name) LIKE ? OR u.email LIKE ?)";
        $like = '%' . $q . '%';
        $types .= 'ss';
        $params[] = $like;
        $params[] = $like;
    }

    // Anyone this staff member has already spoken to sorts to the top, with the
    // newest exchange first — an open thread matters more than alphabetical order.
    $sql = "SELECT u.user_id, u.email, u.user_type, u.status,
                   CONCAT_WS(' ', u.first_name, u.last_name) AS name,
                   COALESCE(hp.profile_image, pp.profile_image) AS photo,
                   (SELECT MAX(m.sent_at) FROM messages m
                     WHERE (m.sender_id = u.user_id AND m.receiver_id = ?)
                        OR (m.receiver_id = u.user_id AND m.sender_id = ?)) AS last_at,
                   (SELECT COUNT(*) FROM messages m
                     WHERE m.sender_id = u.user_id AND m.receiver_id = ? AND m.is_read = 0) AS unread
              FROM users u
              LEFT JOIN helper_profiles hp ON hp.user_id = u.user_id
              LEFT JOIN parent_profiles pp ON pp.user_id = u.user_id
             WHERE $where
             ORDER BY (last_at IS NULL), last_at DESC, name ASC
             LIMIT 60";

    // The three subquery binds come first, so they lead the parameter list.
    $allTypes  = 'iii' . $types;
    $allParams = array_merge([$staff_id, $staff_id, $staff_id], $params);

    $st = $conn->prepare($sql);
    if (!$st) throw new Exception('Prepare failed: ' . $conn->error);
    $st->bind_param($allTypes, ...$allParams);
    $st->execute();
    $res = $st->get_result();

    $contacts = [];
    while ($r = $res->fetch_assoc()) {
        $contacts[] = [
            'user_id'   => (int) $r['user_id'],
            'name'      => trim((string) $r['name']) ?: (string) $r['email'],
            'email'     => $r['email'],
            'user_type' => $r['user_type'],
            'status'    => $r['status'],
            'photo'     => $r['photo'],
            'last_at'   => $r['last_at'],
            'unread'    => (int) $r['unread'],
        ];
    }
    $st->close();

    echo json_encode(['success' => true, 'contacts' => $contacts]);
} catch (Throwable $e) {
    error_log('staff_contacts.php: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Could not load contacts.']);
}
