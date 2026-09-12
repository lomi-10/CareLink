// components/shared/LanguagePicker.tsx
//
// One card per language, named in its own language.
//
// A picker that says "Cebuano" and "Filipino" in English is only usable by
// somebody who already reads English — which is precisely the person who does
// not need it. Each option leads with its endonym (Binisaya, Tagalog) and shows
// the English name underneath, so it is findable either way.
//
// Selecting repaints immediately: LocaleContext holds the locale in React state
// rather than only on the i18n object, so the label under the finger changes as
// it is tapped. Nothing is submitted and there is no Save — a language picker
// that needs confirming is a language picker somebody gets stuck inside.
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FontFamily } from '@/constants/GlobalStyles';
import { useT } from '@/contexts/LocaleContext';
import { LOCALES, type LocaleCode } from '@/lib/i18n';

export function LanguagePicker({
  accent,
  surface,
  border,
  text,
  muted,
  selectedBg,
  style,
}: {
  accent: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  selectedBg?: string;
  style?: ViewStyle;
}) {
  const { locale, setLocale, t } = useT();

  return (
    <View style={style}>
      <Text style={[s.label, { color: muted }]}>{t('settings.language')}</Text>
      <Text style={[s.hint, { color: text }]}>{t('settings.languageHint')}</Text>

      <View style={s.row}>
        {LOCALES.map((l) => {
          const on = locale === (l.code as LocaleCode);
          return (
            <Pressable
              key={l.code}
              onPress={() => setLocale(l.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              // The English name is the accessible label so a screen reader in
              // any language announces something its user can act on.
              accessibilityLabel={l.english}
              style={[
                s.card,
                {
                  backgroundColor: on ? (selectedBg ?? surface) : surface,
                  borderColor: on ? accent : border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: text }]} numberOfLines={1}>{l.label}</Text>
                {/* Hidden when it would simply repeat the line above it. */}
                {l.label !== l.english && (
                  <Text style={[s.english, { color: muted }]} numberOfLines={1}>{l.english}</Text>
                )}
              </View>
              {on && <Ionicons name="checkmark-circle" size={19} color={accent} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  label: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 12,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  hint: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    flexGrow: 1, flexBasis: 150, minWidth: 140,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15 },
  english: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, marginTop: 1 },
});
