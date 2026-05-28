# CareBot (Gemini) — API key, Laragon, and quota safety

## In plain English (read this first)

- **What CareBot does:** Your phone app sends questions to **your own website** (PHP on Laragon). That small script asks Google’s Gemini for a reply, then sends the answer back to the app. The app **never** holds your secret key.
- **Why the key is not in the app:** If the key were inside the app, anyone could copy it and run up your bill or use your free limit. Keeping it **only on your PC/server** is the safe pattern.
- **What “quota protection” means:** Your `chatbot_api.php` script limits how often each **logged-in user** and each **internet address** can ask Gemini per hour, so one person or a bot cannot burn through your free tier in minutes.
- **What the key looks like:** A long password-like line, usually starting with **`AIzaSy`**. You copy it once from Google’s website and paste it into Windows as an **environment variable** named `GEMINI_API_KEY` (steps below). **Never** paste it into GitHub or the React Native code.

Your **Gemini API key must live only on the PHP server**. The Expo app never contains the key, so it cannot leak from the client or from a GitHub commit of the React Native project.

---

## What a Gemini / Google AI Studio key looks like

- You create it in **Google AI Studio**: https://aistudio.google.com/apikey  
- After you click **Create API key**, Google shows a **long single-line string**.
- It **often starts with** `AIzaSy` and is **about 39 characters** (letters, numbers, and sometimes symbols).  
  Example shape (this is **not** a real key): `AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Treat it like a password: **do not** paste it into Discord, screenshots, or GitHub. If it leaks, **revoke** it in AI Studio and create a new one.

---

## Where to put the key (Windows + Laragon)

1. Copy the key from AI Studio once (use **Copy** on the site).
2. Open **Environment Variables** for your Windows user:
   - Press `Win + R`, run `sysdm.cpl` → **Advanced** tab → **Environment Variables…**
   - Under **User variables**:
     - If **`GEMINI_API_KEY` already exists** → select it → **Edit…** → replace the **entire** value with the new key (no spaces before/after) → OK.
     - If it does **not** exist → **New…** → **Variable name:** `GEMINI_API_KEY` → **Variable value:** paste the full key → OK.
   - Confirm you do **not** have two different variables for the same purpose (only one `GEMINI_API_KEY`).
3. **Restart Laragon** fully (Stop All → Start All), or at least **restart Apache**, so PHP’s `getenv('GEMINI_API_KEY')` sees the new value. **Opening a new terminal** after changing user variables also helps anything you run from the command line.
4. Keep **`chatbot_api.php`** in your Laragon API folder, e.g. **`C:\laragon\www\carelink_api\chatbot_api.php`** — same folder as your other CareLink PHP files. (That file only lives on your machine; it is not shipped in this React repo.)
5. In the app, open **CareBot** from the **round sparkles button** (bottom-right while signed in), or from the sidebar / sparkles quick action / slide-out menu. `API_URL` in `constants/api.ts` should already point at `carelink_api`.

Optional tuning (same User variables dialog):

| Variable | Meaning | Default in `chatbot_api.php` |
|----------|---------|-------------------------|
| `CHATBOT_MAX_PER_IP_HOUR` | Max Gemini calls per visitor IP per hour | `20` |
| `CHATBOT_MAX_PER_USER_HOUR` | Max calls per logged-in `user_id` per hour | `30` |
| `CHATBOT_MAX_TURNS` | How many past chat rows (`contents`) are sent to Gemini (saves tokens) | `6` |

---

## How quota protection works

- The CareLink app sends **`user_id`** (from login — the same value stored in `AsyncStorage` as `user_data.user_id`) on every CareBot request. The PHP script rejects requests without a positive `user_id`, so random crawlers cannot burn your Gemini quota.
- The server counts requests **per IP** and **per user** in a rolling **1-hour** window (temp files under the server’s temp directory). Over the limit → HTTP **429** and no Gemini call.
- Long messages are **truncated** and old turns are **dropped** before calling Gemini to reduce token usage.

For stronger security later, you can add a real session check in PHP (verify `user_id` against your database the same way your other endpoints do).

---

## Quick test (optional)

From PowerShell (replace URL and use a real `user_id` from your `users` table):

```powershell
$body = '{"user_id":1,"contents":[{"role":"user","text":"Hello"}]}'
Invoke-WebRequest -Uri "http://localhost/carelink_api/chatbot_api.php" -Method POST -Body $body -ContentType "application/json"
```

You should get JSON with `"success":true` and a `"reply"` when the key is set.
