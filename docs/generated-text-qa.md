# CareLink — Generated Cover Letters & Job Descriptions · Q&A

The tester's concern: *"if everyone taps Generate, won't every letter and every
job post look the same?"* Honest answer below. Notion-ready.

---

**Q: Is this AI?**

**No — and don't call it that in a defence.** Both generators are **template
libraries with seeded variation**, not a language model. No API call, no cost, no
latency, works offline. (CareBot, a separate feature, *is* Gemini.)

---

**Q: Were letters actually all the same?**

**Originally yes**, then partly fixed, and one real gap survived until now:

| Stage | Behaviour |
|---|---|
| Originally | ONE hardcoded paragraph — every helper identical |
| Then | 5 templates × 6 categories, + a personalised middle paragraph |
| **Bug found** | Template picked by generation index, so **every helper's first press returned `bucket[0]`** |
| Now | Template start point seeded per helper |

The bug: `n` is the generation counter, and it starts at 0 — so the very first
(and for most helpers, only) press always returned the same skeleton.

```ts
// BEFORE — n starts at 0, so everyone got bucket[0]
const tmpl = bucket[((n % bucket.length) + bucket.length) % bucket.length];

// AFTER — start point is per-helper; +n still varies on re-press
const offset = seedFrom(`${helper?.name ?? ''}|${job.title ?? ''}|${key}`);
const tmpl = bucket[(offset + Math.max(0, n)) % bucket.length];
```

**Q: So how different are two letters now?**

For the same job and category, the skeleton is 1 of **5**, and the personalised
paragraph varies independently:

```ts
// lib/coverLetterTemplates.ts — each sentence seeded separately
experience → 3 variants (or 2 if they have no years yet)   // seed
skills     → 3 variants                                     // seed >> 3
location   → 2 variants                                     // seed >> 5
```

That's **5 × 3 × 3 × 2 = 90** shapes per category — but the bigger differentiator
is that the paragraph contains *their actual data*: their years, their skill
names, their barangay. Two helpers with different skills read differently even on
the same skeleton.

**Q: When do letters still look alike?**

**When the helper's profile is empty.** `personalParagraph()` returns `''` if
there's no experience, skills, or location — so a blank profile falls back to the
bare template. Two empty profiles applying to the same category still produce
near-identical letters.

That's arguably correct behaviour: the fix is for the helper to fill in their
profile, which is what we want anyway. But be upfront that it's the remaining
case.

**Q: Can a helper spam Generate until it looks unique?**

No — capped at 3 per application (`MAX_GENERATIONS = 3`). It's a first draft to
edit, not a slot machine.

---

**Q: Same question for job descriptions?**

Partly. `hooks/parent/useJobForm.ts` varies the intro, the closing, and the
details header by a seed built from the post's real data:

```ts
const seed = descSeed(`${jobTitles}|${catId}|${ctx.municipality ?? ''}|${ctx.salaryMin ?? ''}|${ctx.employmentType ?? ''}`);
const intro   = descPick([...3 variants...], seed);
const closing = descPick([...3 variants...], seed >> 3);
```

…and the "About this role" block is built entirely from **that post's** actual
values — arrangement, location, salary range, rest days, experience, start date,
contract length, benefits:

```ts
if (place) lines.push(`• Location: ${place}`);
if (ctx.daysOff?.length) lines.push(`• Rest day(s): ${ctx.daysOff.join(', ')}`);
if (perks.length) lines.push(`• We provide: ${perks.join(', ')}`);
```

**Q: What's still shared between job posts?**

**The Responsibilities / Requirements checklist.** `CATEGORY_COPY` has one body
per category, so every Yaya post lists the same duties.

**This one is defensible, not a bug.** A Yaya's core duties genuinely *are* the
same across households — that's what a category means. The post's identity comes
from the details block above, which is unique. And the description is optional:
a parent can write their own, or edit the draft.

---

## The honest framing

> "Neither generator is AI — they're template libraries. The cover letter picks
> 1 of 5 skeletons per category using a seed derived from the helper, then weaves
> in a paragraph built from their own experience, skills and location, so two
> helpers don't send the same letter. The job description varies its opening and
> closing and builds a details block from that post's real terms. The shared part
> — a category's duty checklist — is shared on purpose, because those duties
> genuinely are the same. Both are **editable first drafts**, and both are
> optional."

---

## Where the code lives

| Concern | File |
|---|---|
| Cover letter templates, personalisation, per-helper seed | `frontend/lib/coverLetterTemplates.ts` |
| Generate cap (3/application) | same file → `MAX_GENERATIONS` |
| Call sites (mobile / web) | `components/helper/jobs/ApplicationModal.tsx`, `components/helper/web/HelperBrowseWeb.tsx` |
| Job description generator | `frontend/hooks/parent/useJobForm.ts` |
| Per-category duty bodies | same file → `CATEGORY_COPY` |

---

## Known limits

- A helper with an **empty profile** gets the bare template — no personalisation
  to add. Fill in the profile.
- Duty checklists are **shared within a category** by design.
- Both generators are **deterministic**: the same helper + same job + same press
  count always produces the same text. That's intentional (stable, testable), but
  it does mean re-applying to the same job re-generates the same first draft.
