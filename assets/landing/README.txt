CareLink — landing page assets
==============================

Web (Expo)
----------
The full marketing page lives at **public/landing.html** and is shown in an iframe from
`components/landing/LandingScreen.tsx` when `Platform.OS === "web"`.

- **Logo:** App-wide mark is **assets/images/carelink_logo.png** (also copied to **public/carelink-logo.png**
  for the static landing page). Replace both files when you update the brand asset.
- **Static files:** Anything in **public/** is served at the site root (e.g. `/landing.html`).

Native (iOS / Android)
----------------------
The same `LandingScreen` component shows the built-in React Native fallback (not the HTML file).

Optional local images (RN fallback / future use)
-------------------------------------------------
Place files here and `require()` from `LandingScreen.tsx` if you extend the native layout.

1) hero.png (optional)
   - Recommended: 1920 x 720 px (or 1600 x 600) at 72–144 dpi for web.
   - Format: PNG or JPG; PNG with transparency for overlays.

2) logo-mark.png (optional)
   - Square: 512 x 512 px, transparent PNG.

Metro only bundles files that exist at build time, so the file must be present before require().
