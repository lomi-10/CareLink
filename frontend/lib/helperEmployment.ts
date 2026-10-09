// Shared detection for applications closed because the helper was hired
// by a different employer. Backend writes this exact parent_notes string in
// carelink_finalize_hire_after_contract().

export const HELPER_EMPLOYED_ELSEWHERE_NOTE =
  'Helper is already employed by another employer.';

export function isHiredElsewhere(
  status?: string | null,
  parentNotes?: string | null,
): boolean {
  return status === 'Rejected' && parentNotes === HELPER_EMPLOYED_ELSEWHERE_NOTE;
}

/** Pipeline badge label for employers when a candidate was hired by someone else. */
export function employerPipelineStatusLabel(
  status: string,
  parentNotes?: string | null,
): string | null {
  if (isHiredElsewhere(status, parentNotes)) return 'Candidate Hired Elsewhere';
  return null;
}
