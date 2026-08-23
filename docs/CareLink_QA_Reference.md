# CARELINK — Q&A REFERENCE GUIDE
### For personal review and defense preparation
### Covers all system features, business model, and expected panelist challenges

---

## HOW TO USE THIS GUIDE

Read the Feature Q&A when you forget what your own system does. Read the Business Model Q&A before technopreneurship classes. Read the Defense Q&A the day before mock defense — those are the sharpest questions a panelist will actually ask. Every answer is written the way you should say it out loud, not the way it would appear in the manuscript.

---

## PART 1 — SYSTEM FEATURES Q&A

### Authentication and Registration

**Q: How do users create an account on CareLink?**
A helper or parent (parent or homeowner employer) fills in email, password, name, and their role. The system sends a verification code to their email through Hostinger's SMTP service. They enter the code to activate the account. After activation, they complete a profile — helpers add skills, work experience, and documents; parents add household details and location. Both must pass PESO verification before they can post jobs, apply, or contact anyone.

**Q: Why email verification instead of SMS?**
Two reasons. First, SMS costs money per message; email through Hostinger's mail service is included in the ₱1,800/year hosting plan at zero marginal cost. Second, email verification satisfies RA 8792's attribution requirement — it ties the account to a verifiable, accessible communication channel that can be used for legal notifications, dispute resolution, and password recovery. This strengthens the digital signature attribution chain.

**Q: What if a user forgets their password?**
They request a password reset. The system generates a code, sends it to the verified email, and the user enters the code to set a new password. Same `auth_codes` table used for signup verification is reused for password resets and email change confirmations.

### PESO Verification

**Q: Walk me through the PESO verification process.** 
When a user completes their profile, they upload the required documents — helpers upload Valid ID, Barangay Clearance, and optionally Police Clearance and TESDA NC2. Parents upload Valid ID and Barangay Clearance. Every uploaded document is automatically pre-screened by Google Gemini Vision for clarity, name consistency with the profile, and document format. The pre-screening result is stored but does not approve or reject anything — it's an efficiency layer. The document then enters PESO's review queue. A PESO admin reviews each document manually, sees the pre-screening result as a hint, and approves or rejects with a reason. Once all required documents are approved, the account status becomes Verified and the user gets a PESO-Verified badge.

**Q: Can users bypass PESO verification?**
No. Every core action — posting jobs, browsing helpers, applying to jobs, messaging, generating contracts — requires an active Verified account. Un-verified accounts can only complete their profile and upload documents. This is enforced at the backend endpoint level, not just the UI.

**Q: What if PESO takes too long to verify?**
Users see a "Verification Pending" status with an estimated review time. If they're subscribed to CareLink Plus, they enter a priority review queue (still same PESO staff, just different queue order). PESO staff always retain final approval authority.

### Matching Algorithm

**Q: How does CareLink's matching actually work?**
There are three algorithms depending on context. When a helper browses jobs, each job gets a score against the helper's profile using seven weighted factors — category match (25), job role match (15), skills match (15), salary fit (15), location (10), experience (10), and employer rating (10) — totaling 100. When a parent has an active verified job post and browses helpers, each helper is scored against that specific job using seven factors — category (25), skills (15), job role (15), salary fit (15), experience (10), location (10), and helper's own rating (10). When a parent has no active job post, the system shows "Top Helpers in Ormoc" using a general capability score — PESO verification (30), rating (25), experience (20), skill count (15), and General Househelp bonus (10). All three produce a percentage score displayed on the results screen.

**Q: Is this machine learning?**
No. It's a weighted rule-based scoring system. Structured data analytics — not neural networks, not deep learning, not training on past data. This is a deliberate choice grounded in Raghavan et al. (2020) and Wood et al. (2019) — a transparent, auditable rule-based system is fair by design and can't develop hidden biases from unlabeled training data.

**Q: Why is this data analytics if it's just weighted scoring?**
Data analytics broadly means examining data to draw conclusions and inform decisions. CareLink's matching collects structured data from multiple sources — skills, category, location, salary, experience, ratings, verification status — and produces a ranked, quantitative compatibility percentage. That is descriptive and diagnostic analytics, which are recognized categories within the analytics spectrum. The title accurately describes what the system does.

**Q: What if the top match is a bad fit?**
The compatibility score is a starting point, not a decision. Users can browse below the top matches, adjust filters, and read profiles. The score guides attention; it doesn't make the hiring decision. That's the human-in-the-loop principle from Wood et al. (2019).

### Cover Letter and Job Description Generation

**Q: Do you use AI to write cover letters?**
No, it's a template. When a helper applies to a job, they can press a "Generate" button that auto-fills a fixed cover letter template with the job title, employer name, and job categories. The helper is expected to review and edit before submitting. Same pattern for parents generating a job description — the system fills in a template based on entered fields; the parent reviews and edits. This is a rule-based string interpolation function, not literal AI.

**Q: Why call it AI in the marketing but template in the code?**
The word "AI" is never used in the manuscript or the system's documentation for cover letter generation. Marketing language is separate from academic accuracy. In every academic and technical description of the system, the feature is described as "auto-generated cover letter template" — grounded in Anwar & Bar-Isaac (2025)'s finding that template assistance helps less-articulate applicants compete on more equal footing.

### Contract Generation and Digital Signing

**Q: What law does your contract follow?**
Republic Act No. 10361 — the Batas Kasambahay. The contract is generated field-by-field against the official DOLE BK Form 1 template obtained directly from PESO Ormoc City during coordination visits.

**Q: How does digital signing work?**
Both parties must independently review and accept the contract before signing. When each party signs, they tap "Sign," then re-enter their account password. The password verification satisfies RA 8792's attribution requirement — the signature is provably tied to a specific account holder. Failed password attempts are rate-limited via the `password_verify_attempts` table to prevent brute-force guessing. Only after both parties have signed with password verification does the contract become finalized.

**Q: Is a password-verified signature legally valid?**
Yes. Under RA 8792, an electronic signature is valid when it can be attributed to a specific person. Password re-entry provides that attribution — the password is unique to the account holder, and re-entering it at signing creates a verifiable link between the signature and the person. This is the honest interpretation of RA 8792, consistent with how e-signatures are handled by BIR, DocuSign Philippines, and other Philippine digital contract platforms.

**Q: What prevents someone from signing on behalf of another?**
Password re-entry, rate limiting on failed attempts, and email verification at account creation. If someone bypasses all three, they've committed identity theft under RA 10175 (Cybercrime Prevention Act), which is a criminal matter beyond CareLink's technical prevention scope.

### Shared Placement Record

**Q: What is the Shared Placement Record?**
A post-hire module that becomes available after a contract is signed. Provides tools for payroll tracking, leave request management, day-to-day task coordination, and optional attendance tracking. It's designed as a shared record, not a monitoring system — either party can update most fields, attendance tracking is off by default and configurable, and no feature requires either party to check in constantly.

**Q: Why is attendance tracking optional?**
Because mandatory attendance felt like surveillance to users during preliminary testing. The redesign — grounded in tester feedback — made attendance opt-in, with clear disclosure that it exists for payroll accuracy, not employer monitoring. Attendance can be recorded by either the helper (check-in), the parent (marking helper present), or retroactively if connectivity is limited.

**Q: What if the helper checks in late every day?**
The system shows attendance data. The parent decides how to respond — that's an employment relationship matter, not a platform enforcement matter. CareLink is a record-keeping tool for both parties, not an automated disciplinary system.

**Q: Does the platform track GPS?**
No. Check-in is a button tap that records timestamp only. GPS tracking would be a serious privacy violation and is not implemented.

### CareBot AI Assistant

**Q: What is CareBot?**
An in-platform AI assistant powered by Google Gemini API. Helps users navigate CareLink, answers questions about features, and explains the Kasambahay Law. Uses a limited non-sensitive context — user type, verification status, profile completion percentage, and whether an active job post or placement exists — to personalize its guidance.

**Q: Does CareBot see personal data?**
No. Sensitive fields — names, contact numbers, addresses, document contents, salary amounts, message contents — are never sent to the external Gemini service. Only the five non-sensitive contextual flags listed above are passed as part of the AI context. This is grounded in Rese et al. (2020)'s finding that chatbot personalization builds trust only when the chatbot avoids accessing sensitive user data.

**Q: Can CareBot take actions on my behalf?**
No. CareBot provides guidance only. It cannot post jobs, apply, message, or sign anything. Any action requires the user to do it themselves in the appropriate part of the platform.

**Q: What if Google Gemini's free API tier runs out?**
The chatbot silently falls back — it still responds using generic pre-written help messages for common questions, and personalization is disabled until API access recovers. Users can still use every core feature of the platform without CareBot.

### Document Storage and Privacy

**Q: Where are uploaded documents stored?**
Cloudinary — a secure cloud storage service. Not on the local Hostinger server filesystem, which would be vulnerable to server-side failures. Cloudinary is free-tier for CareLink's current usage volume.

**Q: Who can see a helper's uploaded documents?**
Three tiers of access. First, the helper themselves — always. Second, authorized PESO staff during verification. Third, parents — only for a strictly limited subset (Police Clearance, TESDA NC2, NBI Clearance) and only for specific applications where the helper has explicitly consented per application. Valid ID and Barangay Clearance are never shared with parents because they contain sensitive home address information that could be misused.

**Q: Why aren't parents allowed to see helpers' Valid ID?**
Because Valid ID and Barangay Clearance contain the helper's home address. PESO verification confirms who the helper is; it does not confirm that every parent is trustworthy with that helper's address. Restricting address-bearing documents to PESO-only access exceeds the standard practice of similar platforms and directly supports RA 10173 data minimization and RA 10364 anti-trafficking protections.

### Complaint System

**Q: How do users file complaints?**
Either party (parent or helper) can file a complaint against the other. The complaint form includes a subject, category (misconduct, non-payment, unsafe conditions, abuse or mistreatment, harassment, property damage, etc.), description, and optional evidence upload. Filed complaints go to the super admin first, who reviews and either resolves it internally or escalates to PESO. PESO staff can see all escalated complaints in their admin portal.

**Q: What if a helper is being abused?**
The complaint categories explicitly include "unsafe conditions" and "abuse or mistreatment" — these categories automatically escalate to PESO immediately, bypassing the normal super admin review. The helper can also terminate their placement independently without needing employer approval. This is a direct RA 10364 anti-trafficking safeguard.

---

## PART 2 — BUSINESS MODEL Q&A (FOR TECHNOPRENEURSHIP AND DEFENSE)

### Revenue Model

**Q: How does CareLink make money?**
Three revenue streams, all charged to parent or homeowner employer accounts only. First, Featured Job Post Placement — a parent pays approximately ₱99 to boost a specific job post to the top of helper search results for 7 days. Second, CareLink Plus Subscription — approximately ₱149 per month unlocks featured post credits, priority PESO review queue, unlimited concurrent job posts, extended placement history beyond 6 months, and advanced payroll report exports. Third, Placement Success Fee — approximately ₱199 charged when a contract is successfully signed and both parties become active in a placement. PESO Ormoc City receives none of this. Under RA 8759 a Public Employment Service Office provides employment facilitation free of charge, and PESO confirmed they take no revenue share — the split in code is 0% PESO, 100% platform. What PESO gets from CareLink is operational, not financial: a digitised verification queue, complaint case management, and labour-market data for their reporting.

**Q: Why don't helpers pay anything?**
Two reasons. First, legal — RA 8042 and RA 10364 prohibit charging job seekers recruitment or placement fees. Charging helpers would violate these laws and expose CareLink to illegal recruitment liability. Second, strategic — helpers are the network value in Holm & Günzel-Jensen's freemium framework. The more verified helpers on the platform, the more valuable it becomes for employers. Charging the network value side kills the network effect. So helpers stay free forever, and employers pay for enhanced access to the network.

**Q: Is that enough to sustain the platform?**
Yes, based on operating cost analysis. CareLink's total infrastructure cost is ₱1,800 per year — Hostinger for domain, backend, database, and email service. Cloudinary, Google Gemini API, and Nominatim all operate on free tiers within CareLink's projected usage. At approximately ₱150 per month operating cost, the platform breaks even at fewer than 10 CareLink Plus subscribers or fewer than 8 placement fees per month. That's a very achievable break-even point for a platform serving even a small local user base in Ormoc City.

**Q: What if usage scales past the free tiers of Gemini or Cloudinary?**
That's a success problem, not a sustainability problem. If the platform grows to the point where free tier limits are exceeded, revenue will have grown proportionally to cover the increased cost. Cloudinary paid tiers start at $89/month (~₱5,000) which would be justified by even a modest paid subscriber base. Google Gemini paid tier is per-API-call and grows with active users.

**Q: What if PESO doesn't formally partner?**
The platform still works, and no revenue depends on it. PESO's institutional verification role is what enables trust between strangers on the platform, and that comes from the existing coordination relationship rather than from any commercial agreement. There is no revenue share to negotiate — RA 8759 requires PESO services to be free of charge, so the placement fee is 100% platform by design, not by default. A formal MOA would only formalise the working relationship: data sharing, referral handling, and the escalation path for complaints.

### Customers and Market

**Q: Who is your target customer?**
The parent or homeowner employer in Ormoc City who needs a domestic helper. They are the paying customer. Helpers are the primary beneficiaries — they benefit at no cost. PESO is the institutional partner. So the customer segment for revenue purposes is specifically parent or homeowner employers with the ability and willingness to pay for enhanced access to verified helpers.

**Q: Is the Ormoc City market big enough?**
Ormoc City has approximately 220,000 residents. Assuming even 5% of households employ or want to employ a domestic helper, that's 11,000 potential parent or homeowner employer users. Combined with PESO's records of registered kasambahay workers in Ormoc, the addressable market at the city level is substantial enough to sustain a platform of this scale. The platform is also designed to be replicable to other cities in Region VIII and beyond.

**Q: How is this different from KazamPH?**
Four fundamental differences. First, KazamPH gates verification behind a paid subscription; CareLink verifies every account for free through PESO. Second, KazamPH publicly states it doesn't intervene in the employment relationship; CareLink stays with the placement through contract generation, digital signing, and post-hire coordination. Third, KazamPH has no compatibility scoring; CareLink shows a percentage score on every result. Fourth, KazamPH is not integrated with any government labor agency; CareLink is operationally embedded with PESO Ormoc City.

### Sustainability and Growth

**Q: What is your unique selling proposition?**
A platform that combines PESO-integrated government verification, context-aware compatibility matching, DOLE BK-1 auto-generated legal contracts with digital signing, a shared post-hire placement record for payroll and coordination, and a built-in AI assistant — all deployed specifically for a Philippine local government context in Ormoc City. No other platform combines all these elements. This synthesis is CareLink's unique value proposition.

**Q: What is your unfair advantage?**
The operational partnership with PESO Ormoc City. Any other platform can copy CareLink's features, but the working relationship with a specific local PESO office — the coordination visits, the DILG-sourced contract template, the direct feedback loop with PESO staff — cannot be replicated overnight. This institutional relationship is CareLink's most durable competitive moat, and it deepens over time as more placements flow through the platform and PESO becomes more integrated with the workflow.

**Q: What happens if a well-funded competitor enters the Philippine market?**
Two protections. First, the PESO partnership — a well-funded competitor entering Ormoc City would need to establish their own PESO relationship from scratch, and PESO is unlikely to abandon an existing working relationship for a new entrant. Second, the network of verified users — helpers already on CareLink with established ratings and work history have no incentive to switch to a new platform where they'd start over.

**Q: How do you prevent users from meeting on the platform and hiring outside it?**
Platform disintermediation is a known challenge for two-sided marketplaces. CareLink's approach uses five mitigations. First, off-platform hires forfeit the DOLE BK-1 auto-generated contract, which is the primary RA 10361 compliance mechanism. Second, off-platform hires forfeit access to the shared placement record and payroll tools. Third, off-platform hires cannot escalate complaints to PESO. Fourth, reputation and ratings only accumulate for platform-completed hires, so long-term platform use is valuable. Fifth, a lower "contract generation only" fee will be offered for parties who insist on off-platform hiring but still want the legal contract. Full disintermediation prevention is impossible in any marketplace; the goal is making platform completion clearly more valuable than leaving.

---

## PART 3 — DEFENSE Q&A (LOOPHOLES AND HARDEST QUESTIONS)

### Technical Loopholes

**Q: Your system is called "using Data Analytics" — but you also said it's just weighted scoring. Isn't that a stretch?**
Data analytics broadly encompasses examining structured data to inform decisions. CareLink's matching engine collects structured data from seven or more fields across two user profiles, applies a defined weighted model, and produces ranked quantitative outputs — a compatibility percentage. That is descriptive and diagnostic analytics, well-established categories within the analytics discipline. Data analytics does not require machine learning to qualify — that's a common misconception. The title accurately describes what the platform does.

**Q: If your digital signature is just a password, how is that more secure than a regular login?**
Digital signing security depends on attribution, not novelty. Password re-entry at the moment of signing creates a legally attributable link between the signature and the account holder — that's what RA 8792 requires. It's the same principle used by BIR eFPS, DocuSign Philippines, and other Philippine digital contract platforms. The platform strengthens this with rate-limiting on failed attempts, email verification tying the account to an accessible email, and full audit logging in the log_trail table.

**Q: What if the parent shows the helper's ID to someone else?**
Two safeguards. First, the sensitive documents (Valid ID and Barangay Clearance) are never shared with parents in the first place — only Police Clearance, TESDA NC2, and NBI Clearance are shareable. So the parent never sees the helper's address-bearing documents. Second, for the documents that are shared, the platform's terms of service explicitly prohibit re-distribution — violating this is grounds for account suspension and can be reported to PESO. Beyond that, no platform can technically prevent a user from screenshotting content shown to them. This is a legal and behavioral safeguard, not a technical one.

**Q: What if PESO makes a wrong verification decision?**
PESO retains final authority, which means CareLink is not liable for verification errors — that's PESO's institutional responsibility. The platform provides tools (Gemini Vision pre-screening, structured verification workflow, complaint escalation) that reduce error rates but do not replace PESO's judgment. This division of authority is documented in the Chapter 3 architecture and is a standard practice for government-partnered platforms.

**Q: Your matching algorithm scores an employer's rating as 10 points on the helper side. But new employers have no rating — doesn't that hurt them?**
Yes, and this is a known limitation documented honestly in Chapter 3. New employers with no rating receive a flat fallback score for that factor rather than zero — the specific fallback logic is 20% of the maximum weight for the factor, so 2 points instead of 0. This prevents new employers from being unfairly penalized. Over time, as they complete placements and receive ratings, their score adjusts based on real reputation.

**Q: What if a user files a false complaint?**
Two levels of protection. First, the super admin reviews all complaints before escalation to PESO — false complaints can be filtered out. Second, PESO's manual review adds another human check. Third, the two-way rating system means users who repeatedly file false complaints or receive complaints themselves accumulate a poor reputation, which affects their standing on future matches. False complaints are also technically actionable under RA 10175 Cybercrime Prevention Act if serious enough.

### Business Model Loopholes

**Q: How do you know parents will actually pay ₱149/month?**
Preliminary survey data suggests willingness to pay for verified access is present — 41% of parent respondents in the team's survey (n=62) indicated agreement to pay a small platform fee for premium services. Additionally, the CareLink Plus features (unlimited concurrent posts, priority verification queue, advanced payroll reports) are targeted at higher-volume users — households that hire multiple helpers or manage recurring placements — for whom ₱149/month is a small operational cost relative to the value received. Individual price validation will happen during production launch through A/B testing.

**Q: What if nobody buys the CareLink Plus subscription?**
Then the placement fee revenue stream carries the platform. The subscription is optional and not required for platform sustainability. Break-even can be reached through placement fees alone at approximately 8 successful placements per month, which is achievable even with modest platform adoption.

**Q: Isn't ₱199 a lot for a placement fee?**
It's actually less than most alternatives. Physical placement agencies in Metro Manila charge ₱3,000 to ₱15,000 per placement. Facebook-mediated hiring is "free" but carries the substantial risk of fraud, mismatched hires, and no legal contract. At ₱199, CareLink's placement fee is roughly 1% to 5% of what an agency charges, and includes the DOLE BK-1 contract, digital signing, PESO verification, shared placement record, and CareBot access. The pricing is designed to be genuinely accessible while sustainable for the platform.

**Q: Does PESO get a cut of the placement fee?**
No — and they cannot. RA 8759, the PESO Act of 1999, requires a Public Employment Service Office to provide employment facilitation services free of charge; it is a government service, not a commercial partner. PESO Ormoc City confirmed this directly. The placement fee is 0% PESO and 100% platform in code, and there is no payout mechanism to enable. PESO benefits operationally — a digitised verification queue, complaint case management, and labour-market data — which is what a PESO is meant to gain from a system like this.

**Q: How do you scale beyond Ormoc City?**
The architecture is designed to be replicable — the PESO integration model can be extended to any Philippine city with a PESO office. Expansion would follow a city-by-city model: establish coordination with the local PESO office, adapt job taxonomy to local kasambahay categories, deploy the same platform code with city-specific configuration. This is deliberate; CareLink is a template for city-level PESO-integrated recruitment, not a Metro-Manila-focused product.

### Ethical Loopholes

**Q: Isn't asking parents to pay a placement fee just repackaging KazamPH's premium model?**
No. KazamPH's premium is for verification — pay to be verified, or appear un-verified in results. CareLink's placement fee is for a successful hire — payment is only triggered when a contract is signed, which means the platform has delivered a working match. The value is captured only when value is delivered. This is fundamentally different from gating basic identity verification behind payment.

**Q: What about helpers who can't afford smartphones?**
92.1% of surveyed helpers already own smartphones with mobile data. For the remaining 7.9%, CareLink integrates with PESO's existing walk-in registration process — a helper can visit PESO Ormoc City, and PESO staff can create the account on their behalf using PESO's device. This is not a new burden on PESO; it's the same walk-in registration they already do.

**Q: What if a helper is being pressured by an employer to sign a contract they don't understand?**
Three safeguards. First, the contract requires both parties to independently review and accept before signing — if the helper is with the employer, the employer cannot sign for them. Second, the platform explicitly recommends that helpers review contracts privately before signing, and CareBot can walk them through the terms in plain language. Third, if a helper feels coerced, they can decline the contract, which sends it back to the parent with a request for changes. Nothing forces a helper to sign.

**Q: Your platform enables digital surveillance of domestic workers through attendance tracking. How is that ethical?**
Attendance tracking is off by default and completely optional. The parent chooses whether to enable it, and the disclosure is explicit: "Attendance tracking: Off — turn on for payroll accuracy." When enabled, it exists to support payroll computation and to protect the helper in case of a wage dispute. The reframe was based on preliminary user testing that surfaced this exact concern, and the resolution is grounded in Wood et al. (2019)'s human-in-the-loop principle — no automated monitoring, no GPS, no mandatory check-in.

### Scope and Rigor Loopholes

**Q: Your matching algorithm has only 7 factors. Modern recommendation systems use dozens.**
Deliberate design choice. Raghavan et al. (2020) showed that expanding the number of factors in hiring algorithms often introduces hidden bias through proxy variables. Wood et al. (2019) argued for transparent, auditable decision logic in developing-country platforms. A 7-factor weighted model is fully auditable — a user (or a panelist) can walk through exactly why a specific compatibility score was calculated. This transparency is a feature, not a limitation.

**Q: Your sample size for the preliminary survey is only 125 (63 helpers + 62 parents). Is that statistically significant?**
For a descriptive-developmental study on a local labor market of Ormoc City's size, 125 respondents provides usable descriptive statistics without claiming inferential power beyond the sample. The manuscript is explicit about this — the survey findings are described as revealing patterns and preferences within the sampled respondents, not as generalized statistical inferences about all Ormoc City households. This is standard practice for capstone-level descriptive research.

**Q: You cite Anwar & Bar-Isaac (2025) but that's an arXiv preprint, not a peer-reviewed publication.**
Correct. The manuscript cites it as a working paper with clear indication of its arXiv status. Working papers are legitimate academic sources especially when they cover recent methodological findings that peer-review timelines haven't yet caught up to. This is standard practice in academic research, particularly for AI-related topics where preprints often precede journal publication by 12-18 months.

**Q: You claim to comply with 8 laws. But you never actually consulted with a lawyer. How do you know your compliance is correct?**
Compliance was verified against the actual text of each cited law, cross-referenced with DOLE and PESO official documents, and grounded in Chapter 2's academic citations. The manuscript is explicit that this is capstone-level compliance work by computer science students, not legal opinion. Any deployment beyond academic study would benefit from a formal legal review, and this is acknowledged as a limitation. The rigor applied is appropriate for a student research project.

---

## PART 4 — READ THIS BEFORE MOCK DEFENSE

1. **Lead with the fact the system is LIVE at carelink-ph.com.** This puts you ahead of every capstone team presenting mockups. Say it clearly, early.

2. **Speak the ₱267/day salary story once, early, and let it anchor emotionally.** Real interview data makes CareLink feel like a solution to a real problem, not a technical demo.

3. **Never say "AI" for the cover letter or task engine.** Say "template" and "rule-based." Every time.

4. **If you don't know a number, say "I'd need to verify that exact figure."** Panelists respect precision over confidence.

5. **When challenged, cite the study, not the feature.** "That's grounded in Wood et al. 2019" is stronger than "we thought that made sense."

6. **When you show the matching algorithm, walk through one real example.** Pick a specific job post and a specific helper, and walk the panel through how each factor contributes to the score. This proves you understand your own system.

7. **On business model, always start with: "Helpers pay nothing, ever."** That single sentence answers 80% of the ethical concerns before they're raised.

8. **On PESO partnership, use the phrase "operational partner" not "official partner."** The coordination is real; the MOA is not yet signed. This wording is accurate and defensible.

9. **If a panelist tries to catch you on innovation without RRL, point to Chapter 2's 11 foreign studies and 4 local studies.** Every major feature has a source. Name the study.

10. **If a panelist says "this is just KazamPH but for Ormoc," you have a prepared response.** The four differences: free verification for all users, government partnership, compatibility scoring, and post-hire management. Say all four.

---

*End of Q&A reference. Update this file as new features or challenges emerge.*
