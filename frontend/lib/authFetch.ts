// lib/authFetch.ts
//
// Attaches the login token to every request the app makes to the CareLink API.
//
// WHY IT'S DONE THIS WAY: the app has hundreds of bare `fetch()` calls written
// across many screens, with no central API client. Adding a header to each one
// would mean editing every call site and would silently miss any new one
// written later — the exact kind of gap that leaves an endpoint unprotected.
//
// Installing a single wrapper around fetch covers every existing call and every
// future one automatically. It only touches requests aimed at API_URL, so
// nothing else the app talks to (Nominatim, Daily, PayMongo) ever sees the
// token.

import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

const TOKEN_KEY = 'auth_token';

/** Cached so the common path doesn't hit storage on every single request. */
let cachedToken: string | null = null;
let installed = false;

export async function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function loadAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch { cachedToken = null; }
  return cachedToken;
}

/** Call once, as early as possible in app startup. Safe to call twice. */
export function installAuthFetch() {
  if (installed) return;
  installed = true;

  const original = global.fetch;

  global.fetch = async (input: any, init?: any) => {
    try {
      const url = typeof input === 'string' ? input : input?.url ?? '';

      // Only our own API — never leak the token to third-party services.
      if (url.startsWith(API_URL)) {
        const token = await loadAuthToken();
        if (token) {
          const headers = new Headers(init?.headers ?? (typeof input !== 'string' ? input?.headers : undefined));
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          return original(input, { ...(init ?? {}), headers });
        }
      }
    } catch {
      // Never let the interceptor be the reason a request fails — fall through
      // to the untouched call. The server still refuses on its own terms.
    }
    return original(input, init);
  };
}
