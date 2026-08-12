// lib/parentProfileCompletion.ts
//
// ONE definition of "is this part of the employer's profile done".
//
// WHY THIS EXISTS: the home-screen setup guide and the Edit Profile modal each
// decided this for themselves, and disagreed:
//
//   guide  personal = contact_number AND address
//   modal  personal = first name AND last name   ("contact number is optional")
//
// So an employer with a name and an address but no contact number saw the guide
// say "Complete your details" while the modal showed every section ticked
// green. Both were internally consistent and the user was told two different
// things about the same account.
//
// The sections here mirror the Edit Profile modal one-for-one, so a tick in the
// modal and a tick in the guide can never mean different things again.
//
// On the contact number: it is NOT optional for completion. PESO verifies a
// household partly by being able to reach it, and the guide's own instruction
// says "so helpers and PESO can reach you". Treating it as optional was what
// let an unreachable profile look finished.

export type ParentSectionKey = 'personal' | 'address' | 'household' | 'documents';

export type ParentCompletion = Record<ParentSectionKey, boolean>;

const REQUIRED_DOCS = ['Valid ID', 'Barangay Clearance'];

export function parentProfileCompletion(profileData: any): ParentCompletion {
  const p = profileData?.profile ?? {};
  const household = profileData?.household ?? {};
  const docs: any[] = profileData?.documents ?? [];
  const has = (t: string) => docs.some((d) => d?.document_type === t);

  return {
    personal:  !!String(p.contact_number ?? '').trim(),
    address:   !!(String(p.province ?? '').trim()
              && String(p.municipality ?? '').trim()
              && String(p.barangay ?? '').trim()),
    household: !!String(household.household_type ?? '').trim(),
    documents: REQUIRED_DOCS.every(has),
  };
}
