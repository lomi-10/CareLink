# Contract — legal review brief

**For:** the lawyer PESO recommended you consult, and for your own defense prep.
**Subject:** the CareLink employment contract (DOLE BK-1 form) generated at hire.

PESO Ormoc raised several points in the Aug 2026 review. This separates them
into **what the statute already answers** (implemented, cited) and **what
genuinely needs counsel** (not implemented, flagged).

Governing law: **RA 10361**, the Domestic Workers Act / Batas Kasambahay (2013),
and its IRR. Supporting: PD 851 (13th month pay), RA 8792 (E-Commerce Act) for
electronic signatures. 

---

## Part 1 — Answered by RA 10361, now in the contract

### 1.1 Thirteenth month pay — ADDED
PESO said 13th month pay belongs in mandatory benefits. Correct.

> **Sec. 27.** *Thirteenth Month Pay.* — The domestic worker who has rendered at
> least one (1) month of service shall be entitled to a thirteenth month pay as
> provided for under Presidential Decree No. 851.

It is now listed **unconditionally and first** in the benefits clause. It is not
driven by a job-post toggle, because it is not something an employer opts into —
unlike SSS / PhilHealth / Pag-IBIG, which are also mandatory but whose premium
split depends on the wage level (Sec. 30).

**Also added:** service incentive leave — five days with pay after one year
(Sec. 29). It was absent for the same reason.

### 1.2 Working hours — REWRITTEN
PESO said: not more than 12 hours, 8 hours maximum normal, overtime must be paid.

What the statute actually guarantees:

> **Sec. 20.** *Daily Rest Period.* — The domestic worker shall be entitled to an
> aggregate daily rest period of eight (8) hours per day.
>
> **Sec. 21.** *Weekly Rest Period.* — ...at least twenty-four (24) consecutive
> hours of rest in a week.

Note what that does **not** say: RA 10361 does not itself impose an 8-hour
working day the way the Labor Code does for regular employees. It guarantees
rest, not a work cap.

The clause now stipulates all of it — normal work not exceeding 8 hours per day,
anything beyond as compensated overtime requiring the helper's consent, a hard
ceiling of 12 hours in any day, plus the statutory 8-hour daily and 24-hour
weekly rest. The 8-and-12 figures are stated as **contract terms**, with the
rest periods cited to the sections that create them.

### 1.3 Grounds for termination — ADDED, VERBATIM
PESO said they did not know what grounds justify immediate termination. The
statute lists them, so the contract now reproduces both sections rather than
paraphrasing.

**Sec. 33 — the HELPER may end service for:** verbal or emotional abuse;
inhuman treatment including physical abuse; commission of a crime or offense
against the helper; violation by the employer of the contract terms or the law;
any disease prejudicial to the health of either party or the household; other
analogous causes.

**Sec. 34 — the EMPLOYER may end service for:** misconduct or willful
disobedience of a lawful work-related order; gross or habitual neglect or
inefficiency; fraud or willful breach of trust; commission of a crime or offense
against the employer or an immediate family member; violation by the helper of
the contract terms or the law; any disease prejudicial to health; other
analogous causes.

### 1.4 A wrong citation, now corrected — IMPORTANT

The old contract said:

> *"Either party may terminate this agreement with at least 30 days written
> notice or payment in lieu thereof (₱7,000.00), as provided under RA 10361."*

**That was wrong on two counts, and it was attributed to the statute**, which
makes it worse than saying nothing — it reads as authoritative.

| Old clause said | RA 10361 Sec. 32 actually says |
|---|---|
| 30 days written notice | **5 days** notice — and only where the duration of service is undetermined |
| "payment in lieu" of notice | No such thing. There is an **indemnity of 15 days' work** where the helper is unjustly dismissed |
| — | Where the helper leaves without justifiable cause, up to **15 days' unpaid salary** is forfeited |
| — | Before the term expires, neither party may terminate **except on Sec. 33/34 grounds** |

The 30-day rule belongs to the **Labor Code** (regular employees). A kasambahay
is governed by RA 10361. The clause now states Sec. 32 correctly.

> **Ask counsel to confirm this reading**, and specifically whether a contract
> may lawfully stipulate a *longer* notice period than the statutory five days
> where that favours the worker.

---

## Part 2 — Needs counsel. Not implemented.

### 2.1 Minimum engagement before a contract is required
**PESO's answer: they were not sure, and said to ask a lawyer.**

CareLink currently declines to generate a contract for very short engagements
(a day, a week) on the reasoning that BK-1 describes a continuing household
employment relationship, not casual work. **That threshold is our invention.**
We cannot cite a provision for it.

Questions for counsel:
1. Is there a minimum duration below which RA 10361 does not attach, or is any
   domestic work engagement covered regardless of length?
2. Does Sec. 11 (Employment Contract) require a written contract for *every*
   engagement, including a one-day job?
3. If there is no statutory floor, what should the platform do — generate a
   contract for a one-day hire, or decline and say why?

**Until answered, the current behaviour is a product decision, not a legal one,
and must not be defended as compliance.**

### 2.2 Overtime premium rate
The contract requires overtime to be compensated at "the agreed overtime rate".
RA 10361 does not set a premium percentage for kasambahay the way the Labor Code
does (25% ordinary day, 30% rest day/holiday).

Question: does the Labor Code overtime premium apply to domestic workers by
analogy or by IRR, or is the rate purely a matter of agreement? Right now the
contract leaves it to the parties, which is defensible but may under-protect.

### 2.3 Night work
Sec. 20's eight-hour aggregate rest does not distinguish day from night work.
Ask whether the Labor Code night-shift differential (Art. 86) reaches kasambahay.

### 2.4 The barangay's role in disputes
The escalation ladder we built is Barangay → PESO → DOLE, on PESO's description.
Confirm whether barangay conciliation (Katarungang Pambarangay, RA 7160) is a
**mandatory precondition** to a labour complaint of this kind, or optional.

---

## Part 3 — Electronic signature

PESO asked that the signature be secure. It now is, within what a system with no
certificate authority can honestly claim.

**Before:** signing wrote one timestamp — `employer_signed_at` /
`helper_signed_at`. That records that a database row changed. It proves nothing
about who signed, what they signed, or whether the document changed afterwards.

**Now** (`shared/contract_signatures_table.php`), each signature records:

| Field | What it establishes |
|---|---|
| `document_hash` | SHA-256 of the contract as it stood at signing — re-hash later and any alteration shows |
| `signature_seal` | HMAC over signer + role + document hash + timestamp, keyed with the server secret — a row edited in the database no longer verifies |
| `auth_method` | how identity was proven (password re-entry at signing) |
| `ip_address`, `user_agent`, `consent_text` | the circumstances a dispute turns on |

Mapped to **RA 8792** and its IRR, which treat an electronic signature as
reliable when it is (a) uniquely linked to the signatory, (b) capable of
identifying them, (c) under their sole control, and (d) linked to the data so
that any change is detectable:

- (a) and (b) — signer id bound into the sealed record
- (c) — password re-entry at the moment of signing (`v1/auth/verify_password.php`)
- (d) — the document hash

Verified behaviour (tested):

```
same document        -> seal valid, document matches
altered document     -> seal valid, document MISMATCH   <- alteration detected
tampered database row-> seal INVALID                    <- tampering detected
```

### What this is NOT — say this plainly
This is a **reliable electronic signature with an audit trail**, not a *digital
signature* in the PKI sense. There is no certificate authority and the signer
holds no private key, so it cannot claim the legal presumption that attaches to
a digitally signed document under RA 8792 Sec. 8. If a panel or counsel asks
whether this would hold up in court, the honest answer is: it is strong
evidence of assent and of document integrity, and it is not a notarised or
PKI-backed signature.

**Ask counsel:** is this sufficient for a BK-1 employment contract, or does DOLE
expect a wet signature or a notarised copy on file for kasambahay contracts?

---

## Summary for the defense

If asked "is your contract legally sound?":

> The contract is the DOLE BK-1 form, and the mandatory benefits, working-hour
> limits and termination grounds are drawn directly from RA 10361 with the
> section numbers cited. We found and corrected one clause that misattributed a
> 30-day notice period to RA 10361 — the statute provides five days, and a
> 15-day indemnity for unjust dismissal. Signatures are electronic with a
> document hash and a tamper-evident seal, which satisfies the reliability tests
> in RA 8792 but is not a PKI digital signature. Three questions remain open for
> counsel, the main one being the minimum engagement length that should require
> a contract at all — PESO did not know either, and we have not invented an
> answer.

That last sentence is the strongest thing in this document. Say it.
