# CareLink Deployment Guide

## Current status

| Part | Where | Status |
|---|---|---|
| Backend (PHP API) | Railway | ✅ Deployed |
| Database (MySQL) | Railway | ✅ Deployed |
| Frontend (Expo web) | — | 👉 This guide |
| Mobile apps (Android/iOS) | EAS | Later (see [Part 6](#part-6--later-custom-domain--mobile-apps)) |

This guide deploys the **web version** of the Expo frontend for **free**,
pointed at the Railway backend you already have running. No domain
purchase required — your hosting provider gives you a free `*.vercel.app`
(or `*.pages.dev`) URL.

```
CareLink/
├── frontend/   Expo Router app (web + mobile) ← deploy this
└── backend/    PHP API + MySQL              ← already on Railway
```

---

## Part 1 — Get your Railway backend URL

1. Open your Railway project → click the **backend** service.
2. Go to **Settings → Networking**. If there's no public domain yet, click
   **Generate Domain**. You'll get something like:
   ```
   https://carelink-api-production.up.railway.app
   ```
3. **Test it** by visiting `https://<your-railway-domain>/test_db.php` in
   your browser. You should see your DB env vars listed as "SET" and a list
   of tables. If you get an error, fix the Railway DB connection before
   continuing — the frontend deploy won't help until this works.
4. **Important**: because Railway's **Root Directory** is set to `backend`,
   your backend's root URL already points at the PHP files directly —
   there's **no** `/carelink_api` prefix in production (that prefix only
   exists in your local Laragon setup). So an endpoint that's
   `backend/helper/get_work_context.php` locally is reachable at:
   ```
   https://<your-railway-domain>/helper/get_work_context.php
   ```

Copy your Railway domain — you'll paste it into the frontend host's
environment variables in Part 3.

---

## Part 2 — Frontend is already wired for production

`frontend/constants/api.ts` now reads an `EXPO_PUBLIC_API_URL` environment
variable if it's set:

```ts
// PRODUCTION: when deploying the web build (Vercel/Cloudflare Pages/etc.),
// set EXPO_PUBLIC_API_URL to your Railway backend URL, e.g.
// https://carelink-api-production.up.railway.app
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL;

const API_URL = PRODUCTION_API_URL || (Platform.OS === 'web' ? webApiUrl : mobileApiUrl);
```

- **Local dev (Laragon)**: leave this unset — nothing changes, you keep
  using `http://localhost/carelink_api`.
- **Deployed web build**: your hosting provider sets
  `EXPO_PUBLIC_API_URL=https://<your-railway-domain>` (no trailing slash,
  no `/carelink_api`). Expo bakes this into the static build at build time.

---

## Part 3 — Deploy the web frontend to Vercel (free)

1. **Push your latest commits to GitHub** (`origin` is already
   `lomi-10/CareLink`):
   ```bash
   git push
   ```
2. Go to **https://vercel.com** and sign up/log in with your GitHub account.
3. Click **Add New → Project**, then **Import** the `CareLink` repo.
4. On the configuration screen:
   - **Root Directory**: click "Edit" → select `frontend`
   - **Framework Preset**: `Other`
   - **Build Command**: `npx expo export -p web`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Expand **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `EXPO_PUBLIC_API_URL` | `https://<your-railway-domain>` |
6. Click **Deploy**. The first build takes a few minutes.
7. Once done, Vercel gives you a free URL like
   `https://carelink-<random>.vercel.app` — open it and test.

### Re-deploying after future changes
Every `git push` to `main` automatically triggers a new Vercel build — no
manual steps needed.

---

## Part 4 — Alternative: Cloudflare Pages (free, no bandwidth limit)

If you'd rather use Cloudflare Pages (useful if Vercel's free bandwidth
ever becomes a concern):

1. Go to the Cloudflare dashboard → **Workers & Pages → Create → Pages →
   Connect to Git** → select the `CareLink` repo.
2. Build settings:
   - **Root directory**: `frontend`
   - **Build command**: `npx expo export -p web`
   - **Build output directory**: `dist`
3. Under **Environment variables**, add:
   | Name | Value |
   |---|---|
   | `EXPO_PUBLIC_API_URL` | `https://<your-railway-domain>` |
4. Save and deploy. You'll get a free `https://carelink-<random>.pages.dev`
   URL.

---

## Part 5 — Verify everything works

1. Open your deployed URL on desktop and on your phone's browser.
2. Try logging in / signing up — open browser dev tools (Network tab) and
   confirm requests go to `https://<your-railway-domain>/...` and return
   JSON (not HTML errors).
3. Click through a few screens (browse jobs, messages, etc.) to confirm
   data loads.

### Troubleshooting

- **"Network request failed" / requests go to `localhost`**: the
  `EXPO_PUBLIC_API_URL` env var wasn't set (or has a typo/trailing slash)
  before the build ran. Fix it in the host's project settings, then
  redeploy (env var changes require a new build — "Redeploy" in
  Vercel/Cloudflare).
- **CORS error in console**: the backend already sends
  `Access-Control-Allow-Origin: *`, so this shouldn't happen. If it does,
  double-check the Railway domain is `https://` (not `http://`) — browsers
  block "mixed content" (https page calling http API).
- **Blank page after deploy**: check the build logs for errors. Most often
  this means the Build/Output settings in Part 3 step 4 weren't saved
  correctly — re-check **Output Directory = `dist`**.

---

## Part 6 — Later: custom domain & mobile apps

Not needed now, but for when you're ready:

- **Custom domain**: both Vercel and Cloudflare Pages let you attach a
  domain you own for free under **Project Settings → Domains**. Once you
  have one, tighten the backend's CORS header
  (`Access-Control-Allow-Origin: *` in the PHP files) to your real domain
  instead of `*`.
- **Mobile apps (Android/iOS)**: use EAS Build, separate from this web
  deploy:
  ```bash
  cd frontend
  npm install -g eas-cli
  eas build --platform android
  eas build --platform ios
  ```
  Mobile builds also need `EXPO_PUBLIC_API_URL` (or your existing
  `mobileApiUrl`/Railway domain) configured via `eas.json` build profiles.

---

## Security reminders

- `backend/test_db.php` exposes whether your DB env vars are set and lists
  table names. It's useful for debugging Railway now, but **remove it (or
  password-protect it)** once your deployment is stable.
- Never commit `.env` / `.env.local` files (already in `.gitignore`).
- Keep using prepared statements for all SQL (already the case throughout
  `backend/`).
