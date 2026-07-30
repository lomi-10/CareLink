# CareLink Deployment Guide

## Current status

| Part | Where | Status |
|---|---|---|
| Backend (PHP API) | Hostinger | ✅ Deployed |
| Database (MySQL) | Hostinger | ✅ Deployed |
| Domain | Hostinger | ✅ Configured |
| Frontend (Expo web) | Vercel | ✅ Deployed |
| Images (uploads) | Cloudinary | ✅ Wired (direct client-side upload) |
| Mobile apps (Android/iOS) | EAS | Later (see [Part 5](#part-5--later-mobile-apps)) |

```
CareLink/
├── frontend/   Expo Router app (web + mobile) ← deployed to Vercel
└── backend/    PHP API + MySQL              ← deployed to Hostinger
```

---

## Part 1 — Backend config on Hostinger (`config.local.php`)

Hostinger shared hosting has no environment-variable dashboard, so the
backend reads secrets from `backend/config.local.php` instead — a file
that is **gitignored on purpose** (it holds real passwords) and therefore
**never arrives on the server via git**. It has to exist on Hostinger
itself, created by hand.

1. In hPanel → **File Manager** (or an FTP client), go to wherever
   `backend/` was uploaded on Hostinger.
2. Copy `backend/config.local.php.example` to `backend/config.local.php`
   right there on the server.
3. Fill in real values:
   - **DB_HOST / DB_USERNAME / DB_PASSWORD / DB_DATABASE** — from
     hPanel → **Databases → MySQL Databases**. Host is almost always
     `localhost` on Hostinger shared hosting.
   - **MAIL_HOST / MAIL_PORT / MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM**
     — see [Part 3](#part-3--email-signup-codes--password-reset) below,
     this is the part that's currently broken.
   - **GEMINI_API_KEY** — same key the chatbot already uses locally.
4. `load_config.php` prefers a real environment variable over this file
   when one exists (`getenv()`), so if Hostinger's plan ever gives you an
   env-var panel, you can migrate later without touching code.

Since the whole app works except email, DB_* is almost certainly already
set correctly on the server — it's specifically the `MAIL_*` keys worth
re-checking (see Part 3).

---

## Part 2 — Frontend on Vercel

`frontend/constants/api.ts` reads `EXPO_PUBLIC_API_URL` at build time:

```ts
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL;
const API_URL = PRODUCTION_API_URL || (Platform.OS === 'web' ? webApiUrl : mobileApiUrl);
```

- **Local dev (Laragon)**: leave unset — keeps using
  `http://localhost/carelink_api`.
- **Vercel**: Project Settings → Environment Variables →
  `EXPO_PUBLIC_API_URL` = your Hostinger backend URL (e.g.
  `https://yourdomain.com` or `https://api.yourdomain.com`, whichever
  path serves the PHP files — **no trailing slash**).
- Build settings: **Root Directory** = `frontend`, **Build Command** =
  `npx expo export -p web`, **Output Directory** = `dist`.
- Every `git push` to `main` auto-triggers a new Vercel build. Changing
  the env var itself requires a manual **Redeploy** (env vars are baked
  in at build time, not read at runtime).

---

## Part 3 — Email (signup codes / password reset)

`backend/shared/mailer.php` sends through SMTP via PHPMailer, configured
entirely from `MAIL_*` keys in `config.local.php` (see Part 1). If those
keys are missing or empty, `carelink_mail_configured()` returns false and
the backend **already degrades gracefully** — it still creates the
account / issues the code, but responds with `email_sent: false` and a
message like *"we couldn't send the verification email"* instead of
silently pretending it worked. If a tester is stuck on the verify-code
screen with no email arriving, this is almost always one of:

1. **`config.local.php` on Hostinger has empty/placeholder `MAIL_*`
   values.** This is the most likely cause if it's never worked in
   production — copying the `.example` file only fills in
   `youraddress@gmail.com` / `abcdefghijklmnop`, not real credentials.
   Fix: fill in a real Gmail address + a 16-character **App Password**
   (regular Gmail passwords don't work with SMTP — see the comments in
   `config.local.php.example` for the 2-Step-Verification → App
   Passwords steps).

2. **Hostinger blocks outbound SMTP to third-party hosts.** Some
   Hostinger shared/business plans restrict outbound connections to
   external mail servers (like `smtp.gmail.com`) as an anti-spam
   measure, even with correct credentials — PHPMailer would then time
   out or get "Connection refused". If Gmail SMTP was never blocked
   for you before, this may not apply, but it's worth ruling out.
   **Fix**: switch to Hostinger's own mail relay, using an email
   account created on your domain (hPanel → Emails):
   ```php
   'MAIL_HOST'     => 'smtp.hostinger.com',
   'MAIL_PORT'     => '465',
   'MAIL_USERNAME' => 'noreply@yourdomain.com',
   'MAIL_PASSWORD' => 'that mailbox\'s password',
   'MAIL_FROM'     => 'noreply@yourdomain.com',
   ```
   This is also better for deliverability than Gmail long-term (SPF/DKIM
   on your own domain).

3. **Check the actual error.** `mailer.php` logs the precise reason on
   every failure:
   - `"MAIL_USERNAME/MAIL_PASSWORD not configured"` → case 1 above.
   - `"CareLink mail FAILED to ... : <SMTP error>"` → the real PHPMailer
     error (auth failure, connection timeout, etc.) — case 2, or a typo
     in the App Password.
   Hostinger → hPanel → **Advanced → PHP Error Log** (or wherever
   `error_log` is routed for your plan) will show which one it is. That
   single line tells you exactly what to fix next — worth checking
   before guessing further.

Codes themselves (expiry, hashing, attempt limits) live in
`backend/shared/auth_codes.php` and are timezone-safe already — see
`backend/dbcon.php`, which pins both PHP's and MySQL's clocks to
`+08:00` specifically because Hostinger's MySQL runs in UTC by default.
That part isn't the issue here.

---

## Part 4 — Images (Cloudinary)

Uploads that go through `frontend/lib/cloudinaryUpload.ts` (e.g. task
photo proof) upload **directly from the device to Cloudinary** — the PHP
backend only ever receives and stores the resulting HTTPS URL, it never
proxies image bytes. Nothing to configure server-side for that path.
(Other uploads — documents, profile photos — currently still go through
the backend's own `uploads/` folder on Hostinger; that's unrelated to
the Cloudinary path and unaffected by this guide.)

---

## Part 5 — Later: mobile apps

Not needed now, but for when you're ready:

```bash
cd frontend
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

Mobile builds need `EXPO_PUBLIC_API_URL` (or your existing
`mobileApiUrl`) pointed at the Hostinger backend URL, configured via
`eas.json` build profiles.

---

## Security reminders

- Never commit `.env` / `.env.local` / `backend/config.local.php`
  (already gitignored).
- Keep using prepared statements for all SQL (already the case
  throughout `backend/`).
- Any one-off debug script you create directly on Hostinger to test
  DB/mail connectivity should be deleted (or password-protected) once
  you're done with it — don't leave debug endpoints reachable in
  production.
