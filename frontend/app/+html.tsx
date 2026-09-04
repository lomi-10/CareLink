// app/+html.tsx
//
// The HTML shell every web page is rendered into. Expo Router uses this file
// on the server/static build only — it never runs in the app.
//
// WHY IT EXISTS
//
// The exported index.html shipped `<title data-rh="true"></title>` — empty.
// Expo Router fills the title client-side, so the browser tab showed the bare
// hostname ("carelink-ph.com") until JavaScript loaded, and anything reading
// the page without running scripts — a link preview, a search crawler, a
// bookmark saved fast — got nothing at all.
//
// A title in the shell is present in the first byte of the response.
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const TITLE = 'CareLink — Kasambahay hiring, verified by PESO Ormoc';
const DESCRIPTION =
  'CareLink connects Ormoc households with PESO-verified kasambahay, on employment ' +
  'contracts written to the Batas Kasambahay (RA 10361). Free for helpers, always.';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content="#EA6F2A" />

        {/* Shared into Messenger or Facebook — which is how a capstone actually
            gets passed around — these are what render the preview card. */}
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Required by Expo Router: disables the body scroll that would other-
            wise fight ScrollView on web. */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
