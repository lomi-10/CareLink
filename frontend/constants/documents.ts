// constants/documents.ts
// Which verified documents a helper may share with an EMPLOYER when applying.
//
// SAFETY POLICY (mirrors backend/helper/apply_job.php): Valid ID and Barangay
// Clearance carry the helper's home address. A PESO-verified family is verified,
// not necessarily an agency you can trust with your address — so those two are
// kept for PESO's eyes only and are NEVER offered for sharing here. Only proofs
// of legitimacy / skill (which reveal no address) can be shared with a family.
export const SHAREABLE_DOC_TYPES = ['Police Clearance', 'TESDA NC2', 'NBI Clearance'] as const;

/** True when this document type is safe to offer for sharing with an employer. */
export function isShareableWithEmployer(documentType: string | null | undefined): boolean {
  return !!documentType && (SHAREABLE_DOC_TYPES as readonly string[]).includes(documentType);
}
