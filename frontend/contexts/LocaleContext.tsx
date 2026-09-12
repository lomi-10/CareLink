// contexts/LocaleContext.tsx — makes a language change repaint the app.
//
// i18n-js is a plain object: setting i18n.locale changes what t() returns, but
// React has no idea anything happened and nothing re-renders until something
// else causes it to. The provider holds the locale in state so switching
// language repaints immediately, which is the whole point of a language picker.
//
// Components call useT() and use the `t` it returns. Importing t() directly from
// lib/i18n still works and still translates — it just will not re-render on a
// switch, so it suits module-level constants and anything outside React.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { i18n, initLocale, persistLocale, type LocaleCode } from '@/lib/i18n';

interface LocaleCtx {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  /** Translate. Re-renders the caller when the locale changes. */
  t: (key: string, params?: Record<string, unknown>) => string;
  /** False until the saved choice has been read back. */
  ready: boolean;
}

const Ctx = createContext<LocaleCtx>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
  ready: false,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void initLocale().then((code) => {
      if (!alive) return;
      setLocaleState(code);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    // State first so the repaint is immediate; the write to storage is a
    // background detail and must not hold the interface up.
    setLocaleState(code);
    void persistLocale(code);
  }, []);

  const value = useMemo<LocaleCtx>(() => ({
    locale,
    setLocale,
    // Depends on `locale` so every consumer gets a new function identity on a
    // switch — that is what actually forces the re-render.
    t: (key, params) => {
      i18n.locale = locale;
      return i18n.t(key, params as never);
    },
    ready,
  }), [locale, setLocale, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}
