# CareLink — Chapter 4 Evaluation Instrument

Questionnaire and scoring guide for the system evaluation. Adapt to whatever
framework your adviser and panel require — confirm that first, since some
programs mandate ISO/IEC 25010, others TAM/UTAUT, others a department rubric.
This uses **ISO/IEC 25010**, the most common choice for PH capstones.

---

## First: two different things called "feedback"

Don't confuse these — the panel will.

| | In-app placement review | Chapter 4 evaluation |
|---|---|---|
| Rates | **The other person** (helper ⇄ employer) | **The system** |
| When | Placement ends (`placement_review_pending.php`) | After the test session |
| Stored in | `placement_reviews` | Your own survey form / spreadsheet |
| Purpose | Feeds `parent_rating` into matching (10 pts) | Research data |
| Already built? | **Yes** | **No — this document** |

The existing peer review is a *product feature*. It is not evaluation data,
because it measures how good a helper was, not how good CareLink is.

### Why NOT to trigger the Chapter 4 survey on hiring

You asked for feedback "after the user hires someone or is hired." That's a
reasonable instinct for a product, but it would produce weak research data:

- **Almost no one will complete a hire in a one-week test.** Hiring requires a
  post, applications, an interview and two contract signatures. You'd end up with
  an n of 2–3.
- **It biases the sample to successes.** Testers who got confused and gave up —
  the ones whose feedback matters most — would never be asked.
- **Chapter 4 needs all respondents**, not just those who reached the end.

**Recommendation:** administer the questionnaire below to **every** tester at the
end of their session, regardless of how far they got. Keep the hire-triggered
in-app prompt as an optional extra for qualitative quotes.

---

## Part I — Respondent profile

Used for your demographics table.

1. Role tested: ☐ Helper (Kasambahay) ☐ Employer (Household) ☐ PESO Staff
2. Age: ☐ 18–24 ☐ 25–34 ☐ 35–44 ☐ 45–54 ☐ 55+
3. Sex: ☐ Female ☐ Male ☐ Prefer not to say
4. Highest education: ☐ Elementary ☐ High School ☐ Vocational/TESDA ☐ College ☐ Post-grad
5. How often do you use a smartphone app? ☐ Daily ☐ Weekly ☐ Rarely ☐ First time
6. Have you used a job-seeking or hiring app before? ☐ Yes ☐ No
7. Device used today: ☐ Android ☐ iPhone ☐ Laptop/Desktop browser

> Q5 and Q6 matter: CareLink targets users who may not be tech-savvy, so
> correlating usability scores against these is a strong Chapter 4 discussion point.

---

## Part II — System evaluation (ISO/IEC 25010)

**Scale:** 5 = Strongly Agree · 4 = Agree · 3 = Neutral · 2 = Disagree · 1 = Strongly Disagree

### A. Functional Suitability
*Does it do what it's supposed to?*

1. The system performed all the tasks I expected it to.
2. I was able to complete what I set out to do (set up my profile / post a job / apply).
3. The information shown (job details, helper profiles, match scores) was accurate.
4. The features are appropriate for finding or hiring household help.

### B. Usability
*Can people actually use it?* — your most important section, given the target users.

5. The system was easy to learn, even without someone teaching me.
6. The screens and buttons were easy to understand.
7. The words used were clear and easy to understand (not too technical).
8. I could tell what to do next at each step.
9. It was easy to correct a mistake when I made one.
10. The text was large enough and easy to read.
11. The guide ("How CareLink works") helped me understand the system.

### C. Reliability
*Does it behave consistently?*

12. The system worked without crashing or freezing.
13. The system responded consistently each time I used the same feature.
14. When something went wrong, the system explained it clearly.

### D. Performance Efficiency
*Is it fast enough?*

15. Screens loaded quickly enough.
16. Searching and browsing did not take too long.
17. Uploading documents and photos completed in reasonable time.

### E. Security
*Do they trust it?* — critical for this domain.

18. I felt my personal information was kept safe.
19. I am comfortable that only PESO can see my ID and Barangay Clearance.
20. The PESO verification makes me trust the other people on the platform.
21. I felt safe communicating through the app instead of sharing my number.

### F. Perceived Usefulness
*Would it actually help them?* — borrowed from TAM; panels usually expect this.

22. CareLink would make it easier for me to find work / find a helper.
23. CareLink is safer than how I would normally find work / hire someone.
24. I would use CareLink if it were available today.
25. I would recommend CareLink to a friend or relative.

---

## Part III — Role-specific items

Ask only the block matching the respondent.

**Helpers**
26. Setting up my profile was straightforward.
27. I understood what documents I needed and why.
28. The job matches shown were relevant to my skills.
29. I understood what the match percentage meant.
30. The generated cover letter was a helpful starting point.

**Employers**
31. Posting a job was straightforward.
32. The applicants shown were relevant to my job post.
33. I understood what the match percentage meant.
34. The generated job description was a helpful starting point.
35. I understood what the contract covers and that both parties must sign.

**PESO staff**
36. The verification queue is easy to review.
37. I had enough information to decide whether to approve a document.
38. The AI pre-check flags were helpful, not confusing.
39. The system would reduce our manual paperwork.

---

## Part IV — Open-ended

Verbatim answers here are what make Chapter 4 readable — quote them directly.

40. What did you like most about CareLink?
41. What was the most confusing or difficult part?
42. Was there anything you expected to find but couldn't?
43. What would you add or change before this is used for real?
44. (If applicable) Describe any error or unexpected behaviour you encountered.

---

## Scoring

Weighted mean per item and per criterion:

```
WM = Σ(f × w) / n

f = number of respondents choosing that option
w = the option's weight (5…1)
n = total respondents
```

**Interpretation scale** (standard 5-point PH capstone ranges):

| Range | Verbal interpretation |
|---|---|
| 4.20 – 5.00 | Excellent / Strongly Agree |
| 3.40 – 4.19 | Very Good / Agree |
| 2.60 – 3.39 | Good / Neutral |
| 1.80 – 2.59 | Fair / Disagree |
| 1.00 – 1.79 | Poor / Strongly Disagree |

Report one table per ISO characteristic (items + WM + interpretation), then a
summary table of the six criteria with an **overall weighted mean**.

### Respondents

Aim for a spread rather than a big number — capstone panels care more about
covering every role than about n. A defensible minimum:

| Group | Suggested n |
|---|---|
| Helpers | 10–15 |
| Employers | 8–10 |
| PESO staff | 2–3 |
| IT experts (optional) | 3–5 |

If your panel wants Maintainability and Portability evaluated, give those items
to IT experts only — end users can't judge them, and including them in the
end-user mean will be challenged.

---

## Running the session

1. Consent first: explain it's a student project, that test data will be deleted,
   and that they should **not** upload real IDs.
2. Give a task list, not a demo — you learn nothing by driving for them.
   *e.g. "Sign up as a helper, complete your profile, find a job you like, apply."*
3. **Don't help unless they're stuck for 2+ minutes.** Note where they hesitate;
   those notes become Chapter 4's qualitative findings.
4. Administer this questionnaire at the end, to everyone.
5. Log every bug they hit with the role and screen — Chapter 5 recommendations.

> Watching where people hesitate produces better Chapter 4 material than the
> Likert scores do. The scores prove it works; the hesitations explain why you
> made the changes you made.
