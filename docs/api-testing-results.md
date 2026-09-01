# CareLink API Testing — Results and Explanation

Everything needed to write up the API testing section of the capstone
documentation. Written in plain language first, with the technical detail
underneath.

---

## 1. What was tested, in one paragraph

CareLink's backend is an API: about 180 PHP endpoints that the mobile and web
app calls to do everything — log in, post a job, apply to a job, verify a user,
file a complaint, generate reports. The app is only one way to call those
endpoints. Anyone can call them directly with the right URL, which is why they
have to defend themselves rather than trust the app to behave.

API testing means calling those endpoints directly, without the app, and
checking two things: that they do the right thing when asked properly, and that
they **refuse** when asked improperly. The tool used was **Postman**, the
industry-standard API client, running a saved collection of 21 requests against
the **live deployed server**, not a local copy.

---

## 2. The results

| | |
|---|---|
| **Date run** | 1 September 2026, 10:50 PM |
| **Target** | `https://api.carelink-ph.com/carelink_api` (live production server) |
| **Environment** | CareLink — live (Hostinger) |
| **Requests sent** | 21 |
| **Assertions checked** | **61** |
| **Passed** | **61** |
| **Failed** | **0** |
| **Errors** | **0** |
| **Total duration** | 4.317 seconds |
| **Average response time** | 127 ms |

An *assertion* is one individual check. One request usually carries several —
"did it answer at all", "was the answer valid JSON", "did it contain the field
we need". 21 requests produced 61 separate checks, and all 61 passed.

**Average response time of 127 ms** is a performance result worth quoting: it
means the live server answered in about an eighth of a second on average, on
shared hosting, over the public internet.

---

## 3. The one thing that confuses everybody

**More than half of these tests pass by being REFUSED.**

That sounds backwards, so it is worth stating carefully in the documentation.

A security test works by attacking your own system on purpose. The test
"IDOR — read another account's documents" deliberately tries to read a
different user's private documents. If the server **hands them over**, the test
FAILS — because the system is broken. If the server **refuses**, the test
PASSES — because the system defended itself.

So a green tick on a security test means *the attack was stopped*.

Of the 21 requests, **10 are supposed to be refused** and are only counted as
passing when they are.

### A related detail

This API answers a refusal with HTTP status **200 plus `{"success": false}`**
for business-rule refusals, and HTTP **403** for staff-permission refusals. It
does not use 401 everywhere. The tests therefore check the *content* of the
answer, not just the status code. This is normal for this style of API, but a
panel may ask about it, so it is better to have the answer ready.

---

## 4. How the test data was set up

Testing on a live server needs known accounts. Four were created by a seed
script, all with the password `CareLink!2026`:

| Account | Role | What it exercises |
|---|---|---|
| `peso@carelink.test` | PESO officer | Verification, reports, complaint handling |
| `admin@carelink.test` | Super admin | System evaluation results, account management |
| `helper@carelink.test` | Helper (kasambahay) | Applying, being verified, being read |
| `employer@carelink.test` | Household employer | Posting jobs, hiring |

Plus four demonstration records so the read-only endpoints have something real
to return: one job post, one application, one scheduled interview, one
complaint.

Both the helper and employer accounts are **PESO-verified**, and this is not
cosmetic. `post_job.php`, `apply_job.php`, `invite_helper.php`,
`send_message.php` and `create_direct_hire_offer.php` all refuse an unverified
account *before* checking anything else. That ordering is correct —
authorisation comes before business rules — but it means an unverified test
account is blocked at the door and the deeper rules never get exercised.

---

## 5. What each group of tests proves

### Group 1 — Authentication (2 requests, 5 assertions)

**Proves:** valid credentials get in and receive a session token; invalid ones
do not.

- `Login (helper or employer)` — correct password returns HTTP 200, valid JSON,
  and an `auth_token`. That token is what every later request uses to prove who
  it is.
- `Login — wrong password` — refused, with a message explaining why.

**Why it matters:** every other test depends on this. If login were broken or
if a wrong password were accepted, nothing else would be trustworthy.

### Group 2 — Security checks (4 requests, 8 assertions) — ALL PASSED BY BEING REFUSED

This is the most important group for the documentation. Each test is a real
attack pattern.

| Test | The attack | What passing means |
|---|---|---|
| **IDOR — read another account's documents** | Logged in as the helper (user 3), ask for user 4's private documents by changing the id in the URL | The server checked ownership and refused. A user cannot read another user's Valid ID or Barangay Clearance by guessing an id. |
| **Staff-only endpoint without staff id** | Call a PESO-only endpoint with no staff credentials at all | Refused with HTTP 403. This endpoint returns employer contact details and document links, so an open door here would leak private data. |
| **Staff-only endpoint as a non-staff user** | Call a PESO-only endpoint while logged in as an ordinary helper | Refused with HTTP 403. Being logged in is not the same as being authorised. |
| **Admin account creation without auth** | Try to create an administrator account with no authorisation | Refused with HTTP 403. This is the most severe possible flaw in any system — anyone able to create an admin account owns everything. |

**IDOR** stands for *Insecure Direct Object Reference*. It is one of the most
common real-world web vulnerabilities: a system shows you your own record at
`?id=3`, and nobody checks what happens when you type `?id=4`. CareLink checks.

### Group 3 — RA 10361 scope gate (4 requests, 11 assertions)

**Proves:** the legal scope of the system is enforced in the code, not just
described in the documentation.

CareLink handles kasambahay employment under **RA 10361 (Batas Kasambahay)**
only. The law excludes people doing domestic work "only occasionally or
sporadically and not on an occupational basis." A one-time task is therefore
outside the law's protection, and CareLink must not accept it — otherwise the
system would be arranging work it cannot protect.

- `Post job — engagement_type missing` — refused, and the message asks for the
  **recurring** vs one-time answer specifically.
- `Post job — one_time (must be blocked)` — refused, and the message **cites RA
  10361**.
- `Post job — salary below the floor` — refused, and the message cites the
  **₱7,000** monthly platform minimum.

**Why the exact wording is checked:** see section 7. This is worth reading
before the defense.

### Group 4 — PESO verification workflow (5 requests, 14 assertions)

**Proves:** a PESO officer can read the case information their job requires,
and cannot take an action the workflow forbids.

- `Job details`, `User details`, `Interview detail`, `Complaint case file` —
  all return complete, valid data to an authenticated PESO officer.
- `Safety flag on an unresolved case (must refuse)` — **refused**. A safety
  flag publicly marks a user as having a confirmed issue, so it cannot be
  raised on a case that is still under review. Due process is enforced by the
  server, not left to the officer to remember.

### Group 5 — Reports and analytics (4 requests, 16 assertions)

**Proves:** the PESO reporting features return real, structured data and the
Excel export works.

- `Reports & analytics` — returns data, and specifically contains the **gender
  classification** block and the **geography** block (within Ormoc vs beyond)
  that PESO asked for in the requirements interview.
- `Export preview (JSON)` — the preview shown before exporting contains all
  **six sheets**.
- `Export workbook (.xls)` — downloads a real spreadsheet (checked that it is a
  spreadsheet and not JSON, has a filename, and is not empty).
- `Reviews (staff)` — the private helper/employer written reviews are readable
  by PESO.

### Group 6 — Super admin (2 requests, 7 assertions)

**Proves:** the capstone evaluation instrument computes, and admin data
management works.

- `ISO/IEC 25010 results` — returns the quality characteristics and the
  individual items. **This is the endpoint that produces the Chapter 4
  evaluation data**, so a passing test here means the instrument is live and
  calculating on the deployed system.
- `Delete a respondent` — an administrator can remove a response.

---

## 6. Honest scope — what this testing does NOT claim

Include this. Panels respect stated limitations far more than they respect
overclaiming, and an unstated limitation invites the question anyway.

- **21 requests out of roughly 180 endpoints.** This is a targeted suite
  covering authentication, authorisation, legal-scope enforcement and the main
  PESO workflows — not exhaustive coverage of every endpoint.
- **Functional and security testing, not load testing.** The 127 ms average is
  a single-user measurement. It says nothing about behaviour under many
  simultaneous users.
- **Four specific vulnerability classes were tested,** not a full penetration
  test. Passing does not mean no vulnerability exists anywhere.
- **The data is seeded fixtures,** two test accounts and four demonstration
  records, not real user data.
- **One environment, one moment.** It confirms the live server behaved
  correctly on 1 September 2026.

---

## 7. A finding worth including: the test that passed for the wrong reason

This is the strongest single item in the whole testing section, because it
shows testing done properly rather than testing done to produce green ticks.

An earlier run failed one test: `Post job — one_time (must be blocked)`.
Investigation showed the request *was* refused — but with the message "Your
account is still being verified by PESO", not the RA 10361 refusal. The
employer test account had been seeded as unverified, so the verification guard
refused first and **the scope gate never ran**.

The application was correct. The test data was wrong.

The serious part came next. Two sibling tests — `engagement_type missing` and
`salary below the floor` — **passed anyway**, because they only asserted "the
request was refused" and "the refusal had a message." The verification guard
satisfies both. A run would have reported RA 10361 scope enforcement as proven
while it had never executed a single time.

Both tests now assert that the refusal **cites its own rule** — the words
`recurring`, `10361` and `7,000` respectively — so a refusal from the wrong
guard can never again be mistaken for the right one.

**The lesson, stated for the documentation:** a test that only checks *that*
something was refused, without checking *why*, can report a safeguard as
working when it was never reached. Asserting on the specific reason is what
turns a passing test into evidence.

---

## 8. Reproducibility

The run can be repeated from scratch at any time, including live in front of a
panel:

1. Import `docs/live-fresh-import.sql` into the production database — creates
   the full 57-table schema, the reference data, the four test accounts and the
   four demonstration records.
2. In Postman, import `docs/postman/CareLink.postman_collection.json` and
   `docs/postman/CareLink.postman_environment.live.json`.
3. Set the two password variables to `CareLink!2026`.
4. Run `1 · Auth → Login`, then Run collection.

Every id the tests need is pre-filled and fixed, so the same 61 assertions run
against the same records every time and produce the same result.

---

## 9. Suggested terms for the write-up

- **API (Application Programming Interface)** — the set of URLs the app calls
  to make things happen on the server.
- **Endpoint** — one such URL, e.g. `/auth/login.php`.
- **Assertion** — one individual pass/fail check inside a test.
- **Collection** — a saved group of Postman requests that can be run together.
- **IDOR (Insecure Direct Object Reference)** — accessing someone else's data
  by changing an id in a request.
- **Authentication** — proving who you are (logging in).
- **Authorisation** — whether who you are is allowed to do this particular
  thing. The staff-endpoint tests are authorisation tests: the user was
  authenticated but not authorised.
- **Token** — the proof of identity issued at login and attached to every later
  request.
- **Black-box testing** — testing through the public interface without relying
  on the internal code, which is what calling the deployed API from Postman is.
