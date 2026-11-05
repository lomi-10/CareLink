export function getJobDescriptionReviewFlags(description: string): string[] {
  const flags: string[] = [];

  if (/\baged\b|\b\d{1,2}\s+years?\s+old\b|\bage(?:\s+(?:range|limit))?\s*[:=]?\s*\d{1,2}\b|\b\d{1,2}\s*(?:-|to)\s*\d{1,2}\s+years?\b/i.test(description)) {
    flags.push('Possible age-related hiring wording');
  }

  if (/\b(?:muslim|catholic|christian)(?:[\s-]+applicants?)?[\s-]+only\b|\bonly[\s-]+(?:a[\s-]+)?(?:muslim|catholic|christian)\b/i.test(description)) {
    flags.push('Possible religion-based hiring restriction');
  }

  return flags;
}
