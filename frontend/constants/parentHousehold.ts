// Labels for parent_household.household_type (API stores English slug)

export const PARENT_HOUSEHOLD_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condominium', label: 'Condominium' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'other', label: 'Other' },
] as const;

export type ParentHouseholdTypeSlug = (typeof PARENT_HOUSEHOLD_TYPE_OPTIONS)[number]['value'];

/**
 * Religion options for employers — same list helpers already choose from, so
 * both sides of a match describe themselves in the same vocabulary.
 *
 * Stored as the plain label (not a slug) to match helper_profiles.religion,
 * which is free text. Always optional, and "Prefer not to say" is a real
 * choice rather than an absence — an employer who declines to answer should
 * not look like one who simply hasn't finished their profile.
 */
export const PARENT_RELIGION_OPTIONS = [
  { value: 'Roman Catholic', label: 'Roman Catholic' },
  { value: 'Christian', label: 'Christian' },
  { value: 'Iglesia ni Cristo', label: 'Iglesia ni Cristo' },
  { value: 'Islam', label: 'Islam' },
  { value: 'Protestant', label: 'Protestant' },
  { value: 'Seventh-day Adventist', label: 'Seventh-day Adventist' },
  { value: 'Born Again', label: 'Born Again' },
  { value: 'Buddhist', label: 'Buddhist' },
  { value: 'Aglipayan', label: 'Aglipayan' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
] as const;

export function formatParentHouseholdType(
  value: string | null | undefined
): string {
  if (!value || !String(value).trim()) return 'Not specified';
  const slug = String(value).trim().toLowerCase();
  const found = PARENT_HOUSEHOLD_TYPE_OPTIONS.find((o) => o.value === slug);
  return found?.label ?? value;
}

export function isValidParentHouseholdType(value: string): boolean {
  return PARENT_HOUSEHOLD_TYPE_OPTIONS.some((o) => o.value === value);
}
