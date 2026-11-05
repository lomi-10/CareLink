// Labels for parent_household.household_type (API stores English slug)

export const PARENT_HOUSEHOLD_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condominium', label: 'Condominium' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'other', label: 'Other' },
] as const;

export type ParentHouseholdTypeSlug = (typeof PARENT_HOUSEHOLD_TYPE_OPTIONS)[number]['value'];

/** Optional religion values for an employer's private profile, not job criteria. */
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
