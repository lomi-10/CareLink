// lib/documentType.ts
//
// Is this document a PDF?
//
// WHY THIS EXISTS: detection must NOT be based on file_url. Documents are
// served through a signed URL —
//   shared/serve_document.php?document_id=123&expires=...&token=...
// — which never ends in ".pdf" no matter what the file actually is. So every
// `file_url.toLowerCase().endsWith('.pdf')` check in the app returned false for
// a real PDF, the viewer fell through to its <Image> branch, and the user saw
// nothing. That is exactly why PDFs uploaded fine but could not be viewed.
//
// It only showed up once deployed because local uploads were served as a direct
// static path that did end in ".pdf", which masked the bug entirely.
//
// file_path is the stored server path and keeps the real extension, so it is
// the reliable signal. The signed URL is only a last-resort fallback, and its
// query string is stripped before checking.
//
// (The PESO document viewer already checked file_path, which is why that one
// screen displayed PDFs correctly while the helper and parent screens did not.)

export function isPdfDocument(filePath?: string | null, fileUrl?: string | null): boolean {
  const path = String(filePath ?? '').trim().toLowerCase();
  if (path) return path.split('?')[0].endsWith('.pdf');

  const url = String(fileUrl ?? '').trim().toLowerCase().split('?')[0];
  return url.endsWith('.pdf');
}
