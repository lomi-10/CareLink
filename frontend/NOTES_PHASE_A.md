# CareLink — Phase A (registration & verification cycle) — change notes

Date: aligned with your capstone sprint. Copy these notes into your deployment notes or thesis appendix if useful.

## Summary

Implemented a **role-based public registration path** (parent vs helper only), a **profile-completion gate** backed by `users.profile_completed`, **login / cold-start routing** to profile vs home, a **public landing page** at `/`, and **API hardening** for self-service signup. PESO and super-admin accounts remain **out of public signup** (created via your admin flows).

---
 
## Frontend (Expo / React Native)

### `app/index.tsx`

- **Landing**: If there is no session, the app shows the new `LandingScreen` instead of redirecting to a bare “welcome” screen.
- **Returning users**: If `user_token` and `user_data` exist, it calls `GET carelink_api/shared/get_user_status.php` to refresh `status` and `profile_completed`, updates AsyncStorage, then routes:
  - `admin` → `/admin/dashboard`
  - `peso` → `/(peso)/home` (use the same casing as your `app/(peso)` folder)
  - `helper` / `parent` → `/(role)/profile` if profile incomplete, else `/(role)/home`

### `components/landing/LandingScreen.tsx`

- Public marketing layout: nav, hero placeholder, dual CTAs (parent / helper), link to role-selection, optional **Staff** entry on **web** only (admin portal).
- **Images**: Do not bundle a missing file. Add `assets/landing/hero.png` when ready and wire an `<Image>` in this file (see `assets/landing/README.txt`).

### `app/welcome.tsx`

- Now a **`Redirect` to `/`** so old links still work.

### `app/(auth)/role-selection.tsx`

- Back control uses **`router.replace("/")`** so it always returns to the landing page.

### `app/(auth)/login.tsx`

- “Back” copy points to **`/`** (home/landing).

### `hooks/auth/useLoginForm.ts` + `hooks/auth/authProfile.ts`

- Login responses now include **`profile_completed`** and **`status`** (from PHP). After login, users go to **`/(helper)/profile`** or **`/(parent)/profile`** until the server marks the profile complete (same for **pending** accounts that are allowed to log in for setup—see API behavior below).

### `hooks/auth/useSignupForm.ts`

- When navigating from landing with `?role=parent|helper`, **`user_type` syncs from the URL param** so the picker is not required again.

### `hooks/shared/useAuth.ts`

- **Logout** clears storage and navigates to **`/`** (landing), not only login.

### `app/(helper)/_layout.tsx` and `app/(parent)/_layout.tsx`

- Suspended-user logout now goes to **`/`** instead of `/welcome`.

### `app/_layout.tsx`

- Registered **`(peso)`** stack group so PESO routes resolve consistently with `router.replace("/(peso)/home")`.

---

## Backend (PHP / MySQL)

### `carelink_api/auth/login.php`

- **`user` object** now includes: `username`, `status`, `profile_completed` (for both successful login and the **Account Pending** branch).

### `carelink_api/auth/signup.php`

- **Whitelist**: only **`parent`** and **`helper`** are allowed for public JSON signup. Other roles get a clear error (PESO/super admin must be created by admins).

### `carelink_api/shared/sync_profile_completed.php` (new)

- **`carelink_sync_helper_profile_completed`**: sets `users.profile_completed` when helper has username (≥3 chars), contact + address fields, bio length ≥ 15, **≥1 skill**, **≥1 non-rejected document**.
- **`carelink_sync_parent_profile_completed`**: sets flag when parent has address + bio ≥ 15, **household row** exists, **≥1 non-rejected document**.

These rules match “Phase A: complete profile for PESO verification” without blocking users who still need document uploads—uploading documents can flip the flag to `1` even if the profile form was saved earlier.

### Wired into:

- `carelink_api/helper/update_profile.php` — after profile save (returns `profile_completed` in JSON `data`).
- `carelink_api/parent/update_profile.php` — same.
- `carelink_api/helper/upload_documents.php` — after successful upload batch.
- `carelink_api/parent/upload_documents.php` — after successful upload (includes `data.profile_completed`).

---

## Assets / design handoff

| Location | Purpose | Suggested size |
|----------|---------|----------------|
| `assets/landing/hero.png` | Hero banner (optional) | ~1920×720 (or 1600×600), see `assets/landing/README.txt` |
| `assets/landing/logo-mark.png` | Optional logo mark | 512×512 PNG transparent |

---

## What you should manually verify

1. **New parent/helper signup** → login → should land on **profile** until `profile_completed` is true.
2. **Complete profile + skills + documents** (helper) or **household + documents** (parent) → `profile_completed` becomes `1` → next login / app open goes to **home**.
3. **PESO / admin** still use separate portals; they are **not** on public signup.
4. If you use a case-sensitive deploy (Linux), ensure only one **`(peso)`** route folder exists in `app/` (delete duplicate `(PESO)` if both exist on Windows).

---

## Copy-paste reminder

Sync these paths into your real Laragon project and DB as you already do: `carelink_api/**`, `app/**`, `components/**`, `hooks/**`, and this notes file.

---

## UI / UX polish (Phase A continuation)

- **`constants/theme.ts`**: Shared palette (parent blue, helper green, PESO orange), radii, spacing, shadows. Use for new screens.
- **Auth**: `signup.styles.ts`, `login.styles.ts`, `role-selection.tsx`, `signup.tsx`, `login.tsx` — card layout, labels, password hints, SafeArea on login, staff link on web, role-selection cards aligned with theme.
- **Notifications**: `components/shared/NotificationModal.tsx` — optional title line, type-based defaults, refined card and icon treatment.
- **Landing**: `LandingScreen.tsx` reads colors from `theme`.
- **Helper / parent shells**: Pending banners include a **Complete profile** CTA to the correct profile route.
- **PESO**: `app/(peso)/_layout.tsx` — invalid `transition` style removed (React Native); **mobile** top bar + slide-up menu with the same routes as the sidebar; logout goes to **`/`**; nav links centralized in `NAV_LINKS`. `user_verification.tsx` uses PESO orange for active tabs/filters. `view_user_profile.tsx` — checklist banner, **Approve account** only when every document is **Verified** (and at least one document exists); helper text when blocked; routes use `/(peso)/...`.
- **API**: `carelink_api/peso/verify_user.php` rejects **approve** if any document is **Rejected** (matches UI rules).

### Web-friendly alerts

React Native **`Alert.alert`** is unreliable on web. Remaining usages were replaced with **`NotificationModal`** (and **`ConfirmationModal`** where a confirm/cancel flow is needed): **`app/(auth)/login.tsx`** (forgot password), **`app/(peso)/create_peso_user.tsx`**, **`app/admin/user_management.tsx`**, **`app/(parent)/applicant_profile.tsx`** (hire/reject confirmations + outcomes).
