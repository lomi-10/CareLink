# Running the API tests against the live server

For capstone documentation: evidence that the deployed API behaves correctly
and refuses what it should refuse.

The collection is portable — all 21 requests use `{{base_url}}`, so the same
file runs against Laragon or the live server depending only on which
environment is selected.

---

## Before you run

1. **The four test accounts exist on live.** Either `docs/live-fresh-import.sql`
   (wipes and rebuilds) or `docs/reset-live-for-testing.sql` (wipes data, keeps
   the schema). Without them every request fails at Login and the run proves
   nothing.
2. **The deploy has finished**, so the endpoints under test are the current code.

---

## Option A — the Postman app

Best for screenshots.

1. **Import** → `docs/postman/CareLink.postman_collection.json` and
   `docs/postman/CareLink.postman_environment.live.json`.
2. Select **CareLink — live (Hostinger)** in the environment dropdown, top right.
3. Set `password` and `employer_password` to `CareLink!2026`. They ship blank —
   passwords do not belong in a committed file.
4. Run **`1 · Auth > Login`** on its own first. It writes `auth_token` and
   `user_id` into the environment; nothing else works until it has.
5. Collection **⋯ → Run collection → Run CareLink**.
6. Export the result: **Export Results** on the run summary.

## Option B — Newman, for a file you can attach

Produces an artifact rather than a screenshot. Newman is Postman's CLI.

```bash
npx newman run docs/postman/CareLink.postman_collection.json \
  -e docs/postman/CareLink.postman_environment.live.json \
  --env-var "password=CareLink!2026" \
  --env-var "employer_password=CareLink!2026" \
  --reporters cli,json,junit \
  --reporter-json-export tools/out/postman-live.json \
  --reporter-junit-export tools/out/postman-live.xml
```

`--env-var` keeps the password off disk. `tools/out/` is gitignored.

For a formatted HTML report to paste into an appendix:

```bash
npm i -g newman-reporter-htmlextra
npx newman run docs/postman/CareLink.postman_collection.json \
  -e docs/postman/CareLink.postman_environment.live.json \
  --env-var "password=CareLink!2026" \
  --env-var "employer_password=CareLink!2026" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export tools/out/postman-live.html
```

---

## Reading the results — the part that trips people up

**This API answers refusals with HTTP 200 and `{success: false}`, not 401.**
So the tests assert on the `success` field, not the status code.

**Everything in `2 · Security checks` PASSES when the request is REFUSED.**
A green tick there means the server correctly blocked an attack. If one of
those turns red, the endpoint let the attack through — that is the serious
kind of failure.

Two exceptions worth knowing before you interpret a run: staff guards answer
**403**, not 200-with-`success:false`, and the `.xls` export returns a
spreadsheet, not JSON.

---

## What each folder demonstrates

Useful for writing the documentation chapter — this is the claim each folder
supports.

| Folder | What a passing run demonstrates |
|---|---|
| **1 · Auth** | Valid credentials authenticate and are issued a token; wrong passwords are rejected. |
| **2 · Security checks** | Access control holds: no reading another account's documents (IDOR), no staff endpoint without a staff id, no staff endpoint as an ordinary user, no admin account creation without authorisation. |
| **3 · RA 10361 scope gate** | The Batas Kasambahay scope is enforced at job posting: engagement type is required, one-time work is refused, and salary below the PESO floor is refused. |
| **4 · PESO — verification** | Officers can read the case data their work needs, and a safety flag cannot be raised on an unresolved case. |
| **5 · PESO — reports & export** | Analytics return data, the export preview matches, and the workbook downloads. |
| **6 · Super admin** | The ISO/IEC 25010 instrument results compute, and a respondent can be removed. |

---

## Requests that need existing records

A freshly seeded database has accounts but no job posts, interviews or
complaints. These will fail for lack of data, which is **not** a defect —
fill in the environment variable once the record exists, or note it as out of
scope for the run.

| Request | Needs |
|---|---|
| `2 · Staff-only endpoint without staff id` | `job_post_id` |
| `4 · Job details (staff)` | `job_post_id` |
| `4 · Interview detail` | `interview_id` |
| `4 · Complaint case file` | `complaint_id` |
| `4 · Safety flag on an unresolved case` | `complaint_id` |
| `6 · Delete a respondent` | a submitted System Evaluation response |

`other_user_id` is pre-filled with `4`, the employer — a different account from
the helper who logs in, which is exactly what the IDOR check needs.

To get a full green run, do this first in the app: log in as the employer, post
a recurring job, then paste its id into `job_post_id`.

**`6 · Delete a respondent` is destructive.** It really deletes. Leave it
unchecked in the runner unless you have a throwaway response to spend.

---

## If everything fails at once

- **Every request errors** — check `base_url` has no trailing slash and reads
  `https://api.carelink-ph.com/carelink_api`. That is a subdomain, not the
  `/api/carelink_api` path the FTP deploy writes to.
- **Login returns "Account pending for approval"** — `users.status` is not
  exactly `approved`.
- **Login returns "Please verify your email"** — `email_verified_at` is NULL.
  Both seed scripts set it; a hand-made account usually does not.
