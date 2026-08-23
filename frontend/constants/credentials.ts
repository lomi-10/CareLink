// constants/credentials.ts
// What each uploaded document proves, who can vouch for it, and whether PESO
// actually asks for it.
//
// FROM THE PESO INTERVIEW (Aug 2026), two rules the UI has to respect:
//
// 1. PESO verifies exactly TWO credentials, and the same two for helpers and
//    employers alike: a Valid ID and a Barangay Clearance. That is what a
//    "PESO Verified" account means — nothing more is required of anyone.
//
// 2. TESDA NC2, NBI Clearance and Police Clearance are OPTIONAL extras a helper
//    may choose to add. They are not part of the verification bar. A helper
//    without them is not incomplete, and the UI must never imply otherwise —
//    an optional slot rendered as "missing" reads as a failure they are
//    expected to fix.
//
// A third rule follows from who issues each document:
//
// 3. NBI and Police Clearances are issued by the NBI and the PNP. PESO has no
//    authority and no system to authenticate them, so they are held on file and
//    never carry a PESO seal — claiming otherwise would be a claim PESO cannot
//    back, and a family could act on it. TESDA NC2 IS verifiable by a PESO
//    officer, so it can earn a seal: the one bonus seal available.

import type { Ionicons } from '@expo/vector-icons';

export type CredentialTier = 'identity' | 'residency' | 'skill' | 'clearance';
export type CredentialRole = 'helper' | 'parent';

export interface CredentialSpec {
  /** Matches user_documents.document_type. */
  type: string;
  /** Short name on the badge face. */
  short: string;
  /** What the credential proves, in the badge's second line. */
  proves: string;
  /** Who actually stands behind it. */
  authority: string;
  /**
   * Part of the PESO verification bar. Only the Valid ID and Barangay Clearance
   * are — everything else is a voluntary addition and is never counted against
   * an account that lacks it.
   */
  core: boolean;
  /** Can a PESO officer authenticate this? Drives the whole badge treatment. */
  pesoVerifiable: boolean;
  tier: CredentialTier;
  icon: keyof typeof Ionicons.glyphMap;
  /** Who is asked for this at all. */
  appliesTo: CredentialRole[];
  /** One line shown wherever the rule needs explaining. */
  blurb: string;
}

export const CREDENTIALS: CredentialSpec[] = [
  // ── The verification bar — required of helpers and employers alike ─────────
  {
    type: 'Valid ID',
    short: 'Valid ID',
    proves: 'Identity Verified',
    authority: 'PESO Ormoc',
    core: true,
    pesoVerifiable: true,
    tier: 'identity',
    icon: 'card',
    appliesTo: ['helper', 'parent'],
    blurb: 'A government-issued ID checked by a PESO officer against the profile details.',
  },
  {
    type: 'Barangay Clearance',
    short: 'Barangay Clearance',
    proves: 'Residency Verified',
    authority: 'PESO Ormoc',
    core: true,
    pesoVerifiable: true,
    tier: 'residency',
    icon: 'home',
    appliesTo: ['helper', 'parent'],
    blurb: 'Confirms the barangay of residence and good standing in the community.',
  },

  // ── Optional additions, helper side only ──────────────────────────────────
  {
    type: 'TESDA NC2',
    short: 'TESDA NC II',
    proves: 'Skill Certified',
    authority: 'PESO Ormoc',
    core: false,
    pesoVerifiable: true,
    tier: 'skill',
    icon: 'ribbon',
    appliesTo: ['helper'],
    blurb: 'A national competency certificate in Household Services. Optional — and the one extra credential that can earn a PESO seal.',
  },
  {
    type: 'NBI Clearance',
    short: 'NBI Clearance',
    proves: 'On file · issued by NBI',
    authority: 'National Bureau of Investigation',
    core: false,
    pesoVerifiable: false,
    tier: 'clearance',
    icon: 'document-text',
    appliesTo: ['helper'],
    blurb: 'Optional. Held on file — PESO cannot authenticate NBI records, so it never carries a PESO seal.',
  },
  {
    type: 'Police Clearance',
    short: 'Police Clearance',
    proves: 'On file · issued by PNP',
    authority: 'Philippine National Police',
    core: false,
    pesoVerifiable: false,
    tier: 'clearance',
    icon: 'shield',
    appliesTo: ['helper'],
    blurb: 'Optional. Held on file — PESO cannot authenticate PNP records, so it never carries a PESO seal.',
  },
];

const BY_TYPE = new Map(CREDENTIALS.map((c) => [c.type, c]));

/** Falls back to a neutral, optional, non-verifiable spec so an unknown type can
 *  never accidentally render as PESO-verified or as a missing requirement. */
export function credentialSpec(documentType?: string | null): CredentialSpec {
  const found = documentType ? BY_TYPE.get(documentType) : undefined;
  if (found) return found;
  return {
    type: documentType || 'Document',
    short: documentType || 'Document',
    proves: 'On file',
    authority: 'Submitted by the account holder',
    core: false,
    pesoVerifiable: false,
    tier: 'clearance',
    icon: 'document',
    appliesTo: ['helper', 'parent'],
    blurb: 'Submitted and held on file.',
  };
}

/** True when a PESO officer is entitled to stamp this document verified. */
export function isPesoVerifiable(documentType?: string | null): boolean {
  return credentialSpec(documentType).pesoVerifiable;
}

/** True when this document is part of the PESO verification bar. */
export function isCoreCredential(documentType?: string | null): boolean {
  return credentialSpec(documentType).core;
}

/** Everything a role may hold — required ones first, matching CREDENTIALS order. */
export function credentialsForRole(role: CredentialRole): CredentialSpec[] {
  return CREDENTIALS.filter((c) => c.appliesTo.includes(role));
}

/** The two PESO actually requires. The bar for verification, same for both roles. */
export function requiredCredentialsForRole(role: CredentialRole): CredentialSpec[] {
  return credentialsForRole(role).filter((c) => c.core);
}
