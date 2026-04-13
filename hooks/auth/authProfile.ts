/**
 * Helpers for the registration / profile-completion cycle (Phase A).
 */

export function isProfileCompleted(user: { profile_completed?: unknown } | null | undefined): boolean {
  if (!user) return false;
  const v = user.profile_completed;
  return v === true || v === 1 || v === "1";
}
