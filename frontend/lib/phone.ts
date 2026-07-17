// lib/phone.ts — PH mobile helpers.
//
// MIRRORS backend/shared/phone.php. The server is the source of truth (it
// normalises and enforces uniqueness); this exists so the UI can validate before
// a round-trip and format numbers for display. Keep the two in sync — if you
// change the rules here, change them there too.
//
// Canonical form: 09XXXXXXXXX (11 digits).

/** @returns canonical 09XXXXXXXXX, or null when it isn't a valid PH mobile. */
export function normalizePhMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const s = raw.trim();
  const plus = s.startsWith('+');
  let d = s.replace(/\D/g, '');
  if (!d) return null;

  if (d.startsWith('63') && d.length === 12) {
    d = '0' + d.slice(2);
  } else if (plus && d.startsWith('63')) {
    return null; // "+63…" with a wrong length — reject rather than guess
  } else if (d.length === 10 && d.startsWith('9')) {
    d = '0' + d; // user dropped the leading 0
  }

  return /^09\d{9}$/.test(d) ? d : null;
}

export function isValidPhMobile(raw: string | null | undefined): boolean {
  return normalizePhMobile(raw) !== null;
}

/** Display form: 0917 123 4567. */
export function formatPhMobile(raw: string | null | undefined): string | null {
  const n = normalizePhMobile(raw);
  return n ? `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : null;
}

/** True when the input looks like a phone attempt rather than an email. */
export function looksLikePhone(s: string): boolean {
  return !s.includes('@') && /^[\d\s\-+()]+$/.test(s.trim());
}
