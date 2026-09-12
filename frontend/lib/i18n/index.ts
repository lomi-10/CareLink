// lib/i18n/index.ts — the translation layer.
//
// THREE LANGUAGES, AND WHY THIS ORDER
//
// Ormoc City speaks CEBUANO (Binisaya). Not Tagalog — Tagalog is the national
// language, not the local one, and a kasambahay in Ormoc reads Cebuano far more
// comfortably than Filipino. Cebuano is therefore a first-class locale here, not
// an afterthought behind Tagalog.
//
// English stays the default and the fallback. Every key resolves in English, so
// a missing translation degrades to a readable string rather than to a raw key
// like "helper.profile.title" appearing in the interface.
//
// WHAT IS DELIBERATELY NOT TRANSLATED
//
//   - The BK-1 employment contract. It is a legal instrument that both parties
//     sign, and a clause that means something slightly different in translation
//     is a clause that can be argued about. DOLE publishes its own Filipino
//     version; inventing one here would be worse than leaving it in English.
//   - The privacy policy, for the same reason.
//   - Statute names and numbers. "RA 10361" is RA 10361 in every language.
//   - The PESO and System Administrator portals. They are professional tools
//     used by staff who work in English, and translating them adds a surface to
//     maintain for no reader.
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import fil from './locales/fil';
import ceb from './locales/ceb';

export type LocaleCode = 'en' | 'fil' | 'ceb';

export const LOCALES: { code: LocaleCode; label: string; english: string }[] = [
  { code: 'en', label: 'English', english: 'English' },
  // Endonyms: a language picker that names languages in the language it is
  // offering is the only kind somebody can use without already reading English.
  { code: 'ceb', label: 'Binisaya', english: 'Cebuano' },
  { code: 'fil', label: 'Tagalog', english: 'Filipino' },
];

const STORAGE_KEY = 'carelink.locale';

export const i18n = new I18n({ en, fil, ceb });

i18n.defaultLocale = 'en';
i18n.locale = 'en';
// A key with no translation falls back to English rather than rendering the key
// itself. Partial coverage is normal while a language is being filled in, and it
// must look like English rather than like a bug.
i18n.enableFallback = true;

/** The device's language, if CareLink speaks it. */
export function deviceLocale(): LocaleCode {
  try {
    for (const l of getLocales()) {
      const tag = (l.languageCode || '').toLowerCase();
      if (tag === 'ceb') return 'ceb';
      // iOS and Android both report Filipino as 'fil'; some report 'tl'.
      if (tag === 'fil' || tag === 'tl') return 'fil';
    }
  } catch {
    // Locale lookup can throw in some web contexts. English is a fine answer.
  }
  return 'en';
}

/** Restore a saved choice, else follow the device. Call once at startup. */
export async function initLocale(): Promise<LocaleCode> {
  let next: LocaleCode = deviceLocale();
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'fil' || saved === 'ceb') next = saved;
  } catch {}
  i18n.locale = next;
  return next;
}

export async function persistLocale(code: LocaleCode): Promise<void> {
  i18n.locale = code;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

/**
 * Translate. `t('auth.login.title')`, with optional interpolation:
 * `t('work.hoursToday', { hours: '8h 30m' })`.
 */
export function t(key: string, params?: Record<string, unknown>): string {
  return i18n.t(key, params as never);
}
