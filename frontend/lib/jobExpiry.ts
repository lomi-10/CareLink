// lib/jobExpiry.ts
// Shared "applications close on" formatting for job_posts.expires_at
// (a MySQL datetime string like "2026-08-15 23:59:59" or null/undefined).

export function isJobExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt.replace(' ', 'T'));
  return !isNaN(t) && t < Date.now();
}

export function applyByLabel(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const t = Date.parse(expiresAt.replace(' ', 'T'));
  if (isNaN(t)) return null;
  const date = new Date(t).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  return isJobExpired(expiresAt) ? `Applications closed ${date}` : `Apply by ${date}`;
}
