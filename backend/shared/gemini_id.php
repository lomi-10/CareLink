<?php
/**
 * gemini_id.php — AI document verification using Google Gemini vision.
 *
 * One call: send the document image/PDF the user already uploaded to Gemini,
 * which (per the expected document type):
 *   - checks whether it genuinely matches that document type / template,
 *   - extracts the relevant printed fields,
 *   - rates image clarity,
 *   - flags anything that looks tampered or doesn't match.
 *
 * Supports all four CareLink document types: Valid ID, Barangay Clearance,
 * Police Clearance, TESDA NC2.
 *
 * Reuses the SAME GEMINI_API_KEY the chatbot already uses (server env var), so
 * there's nothing new to configure. Analyzes the uploaded file directly — no
 * popup, no credits, no redirect.
 *
 * This is an assistive AI pre-check; PESO's manual review stays the final word.
 */

const CARELINK_GEMINI_ID_DEFAULT_MODEL = 'gemini-2.5-flash';

/** Map Gemini's verdict to user_documents.ai_verification_status. */
function carelink_gemini_map_status(?string $verdict): string
{
    $v = strtolower(trim((string) $verdict));
    if ($v === 'approved' || $v === 'pass' || $v === 'passed') return 'Passed';
    if ($v === 'declined' || $v === 'fail' || $v === 'failed' || $v === 'reject') return 'Failed';
    if ($v === 'review' || $v === 'flagged' || $v === 'in_review') return 'Flagged';
    return 'Unchecked';
}

function carelink_gemini_clamp_score($n): ?float
{
    if (!is_numeric($n)) return null;
    $f = (float) $n;
    return max(0.0, min(100.0, $f));
}

/** Per-document-type guidance for the Gemini prompt. */
function carelink_gemini_doc_guidance(string $documentType): string
{
    switch ($documentType) {
        case 'Valid ID':
            return "The document should be a Philippine government-issued ID (PhilSys National ID, Passport, "
                . "Driver's License, UMID, PRC, Postal, Voter's, SSS, or GSIS). You know the official Philippine "
                . "National ID (PhilSys / PhilID) layout: a 'Republika ng Pilipinas' header, 'PAMBANSANG "
                . "PAGKAKAKILANLAN / Philippine Identification Card', the PhilSys logo, a PCN (format like "
                . "1234-5678912-3), a photo, a signature, and bilingual labels (Apelyido/Last Name, Pangalan/Given "
                . "Names, Kasarian/Sex, Petsa ng kapanganakan/Date of Birth, Tirahan/Address, Uri ng Dugo/Blood Type).\n"
                . "Extract these fields when present: Full Name, ID Type, ID Number, Date of Birth, Sex, "
                . "Place of Birth, Blood Type, Address.";
        case 'Barangay Clearance':
            return "The document should be issued by a Philippine barangay. ACCEPT any of these as valid (they are "
                . "the same family of document and all qualify): 'Barangay Clearance', 'Barangay Certificate', "
                . "'Barangay Certification', 'Certificate of Residency', 'Certificate of Indigency'. It typically has "
                . "a barangay + city/municipality header with a seal/logo, a title containing 'BARANGAY', the "
                . "resident's name, a stated purpose, an issue date, and the signature of the Punong Barangay "
                . "(Barangay Captain). If it is a genuine barangay-issued document, set is_expected_document = true "
                . "and a high template_match — do NOT decline it just because the exact title is 'Certification' "
                . "rather than 'Clearance'.\n"
                . "Extract these fields when present: Full Name, Barangay, City/Municipality, Purpose, Issue Date, "
                . "Control/OR Number, Issued By.";
        case 'Police Clearance':
            return "The document should be a Philippine National Police (PNP) Police Clearance. It typically has a "
                . "PNP logo/header, the title 'POLICE CLEARANCE', the person's name, a stated purpose, a "
                . "clearance/reference number, an issue date, and often a photo and validity date.\n"
                . "Extract these fields when present: Full Name, Clearance Number, Purpose, Date Issued, Valid Until, "
                . "Issuing Office.";
        case 'TESDA NC2':
        case 'TESDA NC II':
        case 'TESDA Certificate':
            return "The document should be a TESDA National Certificate (NC II) — e.g. 'Household Services NC II'. "
                . "It typically has TESDA branding, the title 'NATIONAL CERTIFICATE', the holder's name, the "
                . "qualification title, a certificate number, an issue date and an expiry/valid-until date.\n"
                . "Extract these fields when present: Full Name, Qualification, Certificate Number, Date Issued, "
                . "Valid Until.";
        default:
            return "Identify what kind of official document this is, assess whether it looks genuine, and extract "
                . "the most important printed fields (such as the person's name, document/reference number, and dates).";
    }
}

/**
 * Scan a document image/PDF with Gemini for the given expected document type.
 *
 * @return array{
 *   ok:bool, status?:string, mapped_status?:string, legitimacy_score?:?float,
 *   quality_score?:?float, is_expected?:bool, document_guess?:string,
 *   fields?:array<int,array{label:string,value:string}>, warnings?:array, message?:string
 * }
 */
function carelink_gemini_scan_document(string $filePath, string $documentType, ?string $mime = null): array
{
    require_once __DIR__ . '/../load_config.php';
    $key = trim((string) carelink_cfg('GEMINI_API_KEY', ''));
    if ($key === '') {
        return ['ok' => false, 'message' => 'AI scanning is not enabled on the server yet (GEMINI_API_KEY missing).'];
    }
    if (!is_readable($filePath)) {
        return ['ok' => false, 'message' => 'The uploaded file could not be read for scanning.'];
    }

    if ($mime === null || $mime === '') {
        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
        $mime = $finfo ? (finfo_file($finfo, $filePath) ?: 'image/jpeg') : 'image/jpeg';
        if ($finfo) finfo_close($finfo);
    }

    $bytes = file_get_contents($filePath);
    if ($bytes === false) {
        return ['ok' => false, 'message' => 'Could not read the uploaded file.'];
    }
    $b64 = base64_encode($bytes);

    $guidance = carelink_gemini_doc_guidance($documentType);
    $prompt =
        "You are a document verifier for CareLink, a Philippine domestic-helper recruitment platform. "
        . "The user uploaded this document as their \"{$documentType}\". Examine the attached file and decide "
        . "whether it genuinely matches that document type, assess its authenticity and clarity, and extract its "
        . "key printed fields.\n\n"
        . $guidance . "\n\n"
        . "Return ONLY JSON matching the schema. Guidance:\n"
        . "- is_expected_document: true only if this really is a {$documentType}.\n"
        . "- template_match (0-100): how well it matches a genuine {$documentType} (layout, seals, official elements).\n"
        . "- clarity (0-100): how readable/clear the file is (focus, lighting, glare, cropping).\n"
        . "- overall: 'Approved' if it clearly looks like a genuine, readable {$documentType}; 'Review' if unsure or "
        . "partly unclear; 'Declined' if it is NOT a {$documentType} or shows clear signs of tampering.\n"
        . "- tampering_signs: short notes for anything suspicious or mismatched (empty if none).\n"
        . "- fields: an array of the printed details you can actually read, each as {label, value}. Use clear English "
        . "labels (e.g. 'Full Name', 'ID Number'). Do NOT invent values — only include fields you can read.\n";

    $schema = [
        'type' => 'object',
        'properties' => [
            'is_expected_document' => ['type' => 'boolean'],
            'document_guess'       => ['type' => 'string'],
            'template_match'       => ['type' => 'integer'],
            'clarity'              => ['type' => 'integer'],
            'overall'              => ['type' => 'string', 'enum' => ['Approved', 'Review', 'Declined']],
            'tampering_signs'      => ['type' => 'array', 'items' => ['type' => 'string']],
            'fields'               => [
                'type'  => 'array',
                'items' => [
                    'type'       => 'object',
                    'properties' => [
                        'label' => ['type' => 'string'],
                        'value' => ['type' => 'string'],
                    ],
                    'required' => ['label', 'value'],
                ],
            ],
        ],
        'required' => ['is_expected_document', 'template_match', 'clarity', 'overall'],
    ];

    $payload = json_encode([
        'contents' => [[
            'role'  => 'user',
            'parts' => [
                ['text' => $prompt],
                ['inline_data' => ['mime_type' => $mime, 'data' => $b64]],
            ],
        ]],
        'generationConfig' => [
            'temperature'      => 0.1,
            'responseMimeType' => 'application/json',
            'responseSchema'   => $schema,
        ],
    ], JSON_UNESCAPED_UNICODE);

    $model = trim((string) (getenv('GEMINI_ID_MODEL') ?: CARELINK_GEMINI_ID_DEFAULT_MODEL));
    if ($model === '' || !preg_match('/^[a-zA-Z0-9._-]+$/', $model)) {
        $model = CARELINK_GEMINI_ID_DEFAULT_MODEL;
    }
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ]);
    $res = curl_exec($ch);
    $errno = curl_errno($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno !== 0 || !is_string($res)) {
        return ['ok' => false, 'message' => 'Could not reach the AI scanning service. Please try again.'];
    }
    $decoded = json_decode($res, true);
    if ($code >= 400 || !is_array($decoded)) {
        $detail = is_array($decoded) ? (string) ($decoded['error']['message'] ?? '') : '';
        error_log('Gemini doc scan non-2xx (' . $code . '): ' . substr((string) $res, 0, 600));
        return ['ok' => false, 'message' => $detail !== '' ? $detail : "AI scanning error ({$code})."];
    }

    $text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
    if (!is_string($text) || $text === '') {
        return ['ok' => false, 'message' => 'The AI could not read this document. Try a clearer photo.'];
    }

    $out = json_decode($text, true);
    if (!is_array($out)) {
        return ['ok' => false, 'message' => 'The AI returned an unexpected result. Please try again.'];
    }

    $overall = (string) ($out['overall'] ?? 'Review');

    // Normalize the fields array into clean {label, value} pairs.
    $fields = [];
    if (isset($out['fields']) && is_array($out['fields'])) {
        foreach ($out['fields'] as $f) {
            if (!is_array($f)) continue;
            $label = trim((string) ($f['label'] ?? ''));
            $value = trim((string) ($f['value'] ?? ''));
            if ($label === '' || $value === '') continue;
            $fields[] = ['label' => $label, 'value' => $value];
        }
    }

    $warnings = (isset($out['tampering_signs']) && is_array($out['tampering_signs']))
        ? array_values(array_filter(array_map(fn($v) => trim((string) $v), $out['tampering_signs']), fn($v) => $v !== ''))
        : [];

    return [
        'ok'               => true,
        'status'           => $overall,
        'mapped_status'    => carelink_gemini_map_status($overall),
        'legitimacy_score' => carelink_gemini_clamp_score($out['template_match'] ?? null),
        'quality_score'    => carelink_gemini_clamp_score($out['clarity'] ?? null),
        'is_expected'      => !empty($out['is_expected_document']),
        'document_guess'   => (string) ($out['document_guess'] ?? ''),
        'fields'           => $fields,
        'warnings'         => $warnings,
    ];
}
