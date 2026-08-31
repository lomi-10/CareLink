# CareLink — Building an APK, and testing the API

Two things, both free. Written for this repo specifically, not from a generic tutorial.

---

## Part 1 — APK with EAS

**Yes, and your project is already in good shape for it.** Expo SDK 54,
React Native 0.81.5, and every native dependency you use
(`expo-image-picker`, `expo-document-picker`, `expo-file-system`,
`expo-haptics`, `expo-linear-gradient`, `react-native-svg`,
`react-native-reanimated`, `react-native-gesture-handler`) is a standard Expo
module with a config plugin. There is no custom native code to port.

### Is it free?

Yes, with a real limit worth knowing before you start.

| | Free tier |
|---|---|
| EAS Build | **30 builds/month**, on shared (slower) workers |
| Queue wait | Minutes to ~an hour when busy; paid tiers skip the queue |
| Expo account | Free |
| The APK itself | Yours, no restrictions |

30/month is plenty for a capstone. You are not going to build 30 times.

**Local alternative, unlimited and offline:** `npx expo run:android` builds on
your own machine. It needs Android Studio and the SDK installed (a few GB), but
no account, no queue, no monthly cap. Worth having as a fallback if EAS is
queued the night before your defense.

### Steps

```bash
npm install -g eas-cli
eas login                 # create a free account at expo.dev first
cd frontend
eas init                  # links this project, writes projectId into app.json
eas build -p android --profile preview
```

`eas.json` already exists in `frontend/` with three profiles:

- **preview** — an installable `.apk`. **This is the one you want.**
- **development** — dev client, like Expo Go but with your native modules.
- **production** — an `.aab` for the Play Store. A phone cannot install this
  directly, which is the mistake people hit when they use the default profile.

When it finishes EAS gives you a URL. Open it on the phone, download, install
(Android will ask you to allow installs from unknown sources).

### Three things to fix before you build

**1. The API URL. This is the one that will bite you.**

`constants/api.ts` falls back to `http://<your-computer-IP>/carelink_api` when
`EXPO_PUBLIC_API_URL` is not set. That IP is your LAN address — the APK will
work on your Wi-Fi and fail everywhere else, including at the defense if their
network differs.

Set the real backend URL in `eas.json` under `build.preview.env`
(the placeholder is `https://REPLACE-WITH-YOUR-DOMAIN/carelink_api`). It must be
reachable from the public internet.

**2. The package name.** `app.json` has `com.anonymous.CareLink` — the Expo
default. Change it to something like `ph.ormoc.carelink` before your first
build. Changing it later means users must uninstall and reinstall.

**3. Cleartext HTTP.** Android 9+ blocks plain `http://` by default. If your
backend is not on HTTPS the APK will fail every request with no useful error.
Either put the backend on HTTPS (correct), or add `usesCleartextTraffic` for
testing (works, but do not ship it and do not mention it as a design choice).

### What building unlocks

Right now the project runs under Expo Go, which is why native SDKs were ruled
out earlier. Once you have your own build that restriction disappears — real
push notifications via `expo-notifications` become available, which is the
upgrade path already named in the limitations section of the modules doc.

---

## Part 2 — Postman

**Yes, and free.** Postman's free tier covers everything you need: unlimited
personal collections, environments, and the Collection Runner. The paid tiers
are about team collaboration, which does not apply to a solo capstone.

A ready-made collection is in `docs/postman/`:

- `CareLink.postman_collection.json` — 20 requests in 6 folders
- `CareLink.postman_environment.json` — the variables, blank for you to fill

### Setup

1. Postman → **Import** → drop in **both** files.
2. Top-right dropdown → select **CareLink — local**.
3. Open the environment and fill in the ids from your own database:

| Variable | What it is |
|---|---|
| `base_url` | `http://localhost/carelink_api` (already set) |
| `helper_email`, `password` | any real helper or employer login |
| `peso_user_id` | an **approved** `user_type = 'peso'` account |
| `admin_user_id` | an **approved** `user_type = 'admin'` account |
| `employer_id` | a `user_type = 'parent'` account |
| `user_id`, `other_user_id` | **two different** accounts — the IDOR test needs them to differ |
| `job_post_id`, `interview_id`, `complaint_id` | any existing row |

Find them quickly:

```sql
SELECT user_id, user_type, email, status FROM users ORDER BY user_type;
```

4. Run **1 · Auth → Login** first. Its test script writes `auth_token` and
   `user_id` into the environment automatically, so every later request is
   already signed in.

### Reading the results — important

This API answers with **HTTP 200 and `{success: true|false, message}`** for
in-handler checks, and **HTTP 403** from the staff guards. So a refusal is not
always a 401.

The tests assert on *refusal*, accepting either shape. **Everything in
"2 · Security checks" passes when the request is REFUSED.** A green tick there
means the protection worked, not that the attack succeeded.

### What is in it

| Folder | Purpose |
|---|---|
| 1 · Auth | Login, and a wrong-password check |
| 2 · Security checks | IDOR, staff-only endpoints, unauthenticated admin creation |
| 3 · RA 10361 scope gate | Missing / one-time / below-salary-floor posts |
| 4 · PESO verification | Job details, user details, interview, complaint case file, safety-flag guard |
| 5 · Reports & export | Analytics, JSON preview, the actual `.xls` workbook |
| 6 · Super admin | ISO/IEC 25010 results, delete a respondent |

### Verified

The collection was run end to end against the live local backend:
**20 requests, 57 assertions, 56 passing.** The one failure is Login, because
the credential variables ship blank — fill them in and it passes.

Two defects were found and fixed by running it, which is the argument for
running it rather than trusting it:

- the staff-guard requests return **403**, not 200, so the refusal assertion was
  rewritten to accept either;
- the workbook download asserted "is JSON" on a binary `.xls`.

### Running it from the command line

Useful for a defense screenshot, or to re-check everything after a change:

```bash
npx newman run docs/postman/CareLink.postman_collection.json \
  -e docs/postman/CareLink.postman_environment.json
```

Newman is Postman's CLI runner. Free, no account needed.

### One caution

**6 · Super admin → Delete a respondent** really deletes evaluation data and is
marked destructive. Only point it at sample responses. It writes an audit row
either way.
