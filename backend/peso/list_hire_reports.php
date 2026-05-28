<?php
/**
 * PESO admin: all active hire placements (parent + helper), with signature timestamps and contract PDF when available.
 * Includes rows that are hired/accepted but not yet fully signed (unlike list_signed_contracts.php).
 */
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

require_once '../dbcon.php';
require_once __DIR__ . '/peso_auth.php';

try {
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    peso_require_staff($conn);

    $sql = "
        SELECT
            ja.application_id,
            ja.job_post_id,
            ja.helper_id,
            ja.status,
            ja.employer_signed_at,
            ja.helper_signed_at,
            ja.contract_generated_at,
            jp.title AS job_title,
            jp.parent_id,
            pe.first_name AS parent_first,
            pe.last_name AS parent_last,
            pe.email AS parent_email,
            he.first_name AS helper_first,
            he.last_name AS helper_last,
            he.email AS helper_email,
            c.pdf_file_path,
            c.template_version,
            c.created_at AS contract_record_at
        FROM job_applications ja
        INNER JOIN job_posts jp ON jp.job_post_id = ja.job_post_id
        INNER JOIN users pe ON pe.user_id = jp.parent_id
        INNER JOIN users he ON he.user_id = ja.helper_id
        LEFT JOIN contracts c ON c.application_id = ja.application_id
        WHERE LOWER(TRIM(ja.status)) IN ('hired', 'accepted')
        ORDER BY
            GREATEST(
                IFNULL(UNIX_TIMESTAMP(ja.helper_signed_at), 0),
                IFNULL(UNIX_TIMESTAMP(ja.employer_signed_at), 0),
                IFNULL(UNIX_TIMESTAMP(ja.contract_generated_at), 0)
            ) DESC,
            ja.application_id DESC
    ";

    $res = $conn->query($sql);
    $rows = [];
    if ($res) {
        while ($r = $res->fetch_assoc()) {
            $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
            $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
            $pdfPath = $r['pdf_file_path'] ?? '';
            $pdfUrl = $pdfPath !== ''
                ? $proto . '://' . $host . '/carelink_api/uploads/' . $pdfPath
                : null;

            $emp = $r['employer_signed_at'] ?? null;
            $hel = $r['helper_signed_at'] ?? null;
            $fullySigned = ($emp !== null && $emp !== '' && $hel !== null && $hel !== '');

            $rows[] = [
                'application_id' => (int) $r['application_id'],
                'job_post_id' => (int) $r['job_post_id'],
                'job_title' => $r['job_title'],
                'parent_id' => (int) $r['parent_id'],
                'parent_name' => trim($r['parent_first'] . ' ' . $r['parent_last']),
                'parent_email' => $r['parent_email'],
                'helper_id' => (int) $r['helper_id'],
                'helper_name' => trim($r['helper_first'] . ' ' . $r['helper_last']),
                'helper_email' => $r['helper_email'],
                'application_status' => $r['status'],
                'employer_signed_at' => $r['employer_signed_at'],
                'helper_signed_at' => $r['helper_signed_at'],
                'contract_generated_at' => $r['contract_generated_at'],
                'template_version' => $r['template_version'],
                'fully_signed' => $fullySigned,
                'pdf_url' => $pdfUrl,
            ];
        }
    }

    echo json_encode(['success' => true, 'hires' => $rows]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

if (isset($conn) && $conn) {
    $conn->close();
}
