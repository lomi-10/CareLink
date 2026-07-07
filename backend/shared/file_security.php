<?php
/**
 * file_security.php — shared helpers for safely handling uploaded identity
 * documents (Valid ID, Barangay Clearance, Police Clearance, TESDA NC2).
 *
 * See SECURITY_NOTES_document_uploads.md (repo root) for a plain-English
 * explanation of why each function exists.
 */

/**
 * Map of allowed extensions to the REAL file signatures (magic bytes) we
 * expect to find at the start of the file. This is what makes validation
 * "real" instead of trusting the filename or the browser-supplied MIME type
 * (both of which an attacker fully controls).
 */
const CARELINK_DOC_ALLOWED_TYPES = [
    'jpg'  => ['image/jpeg'],
    'jpeg' => ['image/jpeg'],
    'png'  => ['image/png'],
    'pdf'  => ['application/pdf'],
];

const CARELINK_DOC_MAX_BYTES = 5 * 1024 * 1024; // 5MB, same cap for every document type

/**
 * Validates one entry from $_FILES against real content, not just the name.
 *
 * @param array $file one element of $_FILES, e.g. $_FILES['valid_id']
 * @return string the validated extension to use for the stored filename (e.g. 'jpg')
 * @throws Exception with a user-safe message if the file fails any check
 */
function carelink_validate_uploaded_file(array $file, string $label): string
{
    // 1. Did the upload itself succeed? (network issues, exceeding php.ini limits, etc.)
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("$label: upload failed (error code {$file['error']}).");
    }

    // 2. Server-side size cap — never trust the client to enforce this.
    if ($file['size'] > CARELINK_DOC_MAX_BYTES) {
        $maxMb = CARELINK_DOC_MAX_BYTES / (1024 * 1024);
        throw new Exception("$label: file is too large. Maximum {$maxMb}MB.");
    }
    if ($file['size'] <= 0) {
        throw new Exception("$label: uploaded file is empty.");
    }

    // 3. The REAL check: inspect the file's actual bytes (magic numbers),
    //    not the filename extension and not the Content-Type header — both
    //    of those are just text the uploader's app chose to send and can be
    //    set to anything, e.g. "totally-a-photo.jpg" that is actually a
    //    script. finfo reads the file's first few bytes on disk instead.
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $realMime = $finfo->file($file['tmp_name']);

    foreach (CARELINK_DOC_ALLOWED_TYPES as $ext => $mimes) {
        if (in_array($realMime, $mimes, true)) {
            return $ext;
        }
    }

    throw new Exception("$label: file content doesn't look like a JPG, PNG, or PDF (detected: $realMime).");
}

/**
 * Builds an unpredictable filename. The old version used
 * "barangay_<user_id>_<unix_timestamp>.jpg" — both parts are guessable
 * (user IDs are small sequential integers, timestamps are bounded by
 * "whenever this user signed up"). Adding a random component means knowing
 * someone's user_id is no longer enough to construct their document's URL.
 */
function carelink_random_doc_filename(string $prefix, int $userId, string $ext): string
{
    $random = bin2hex(random_bytes(16)); // 32 hex chars, cryptographically random
    return "{$prefix}_{$userId}_{$random}.{$ext}";
}

/**
 * Secret key used to sign document-access tokens (see carelink_sign_document_token).
 * In production, set the DOC_SIGNING_SECRET environment variable to a long
 * random string (e.g. `openssl rand -hex 32`). The fallback below is fine for
 * local development only — never deploy with the fallback.
 */
function carelink_doc_signing_secret(): string
{
    return getenv('DOC_SIGNING_SECRET') ?: 'carelink-local-dev-secret-change-in-production';
}

/**
 * Creates a time-limited, tamper-proof token that proves "the server itself
 * generated this link a moment ago for this exact document_id" — see
 * carelink_verify_document_token() for how it's checked.
 *
 * @return array{expires:int, token:string}
 */
function carelink_sign_document_token(int $documentId, int $ttlSeconds = 900): array
{
    $expires = time() + $ttlSeconds;
    $token = hash_hmac('sha256', "{$documentId}.{$expires}", carelink_doc_signing_secret());
    return ['expires' => $expires, 'token' => $token];
}

/**
 * Re-computes the expected signature and compares it to what the caller sent.
 * hash_equals() (instead of ==) avoids leaking timing information about how
 * much of the token matched, which is a real (if minor) attack technique
 * called a "timing attack".
 */
function carelink_verify_document_token(int $documentId, int $expires, string $token): bool
{
    if ($expires < time()) {
        return false; // link expired
    }
    $expected = hash_hmac('sha256', "{$documentId}.{$expires}", carelink_doc_signing_secret());
    return hash_equals($expected, $token);
}

/**
 * Builds the full signed URL the frontend will use to actually view/download
 * a document, routed through serve_document.php instead of a raw static path.
 */
function carelink_signed_document_url(int $documentId, string $side = 'front'): string
{
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    ['expires' => $expires, 'token' => $token] = carelink_sign_document_token($documentId);
    // The token authorizes the whole document; ?side just picks which file of it
    // (front image vs the optional back image, e.g. for a two-sided Valid ID).
    $sideParam = $side === 'back' ? '&side=back' : '';
    return "{$protocol}://{$host}/carelink_api/shared/serve_document.php"
        . "?document_id={$documentId}&expires={$expires}&token=" . urlencode($token) . $sideParam;
}
