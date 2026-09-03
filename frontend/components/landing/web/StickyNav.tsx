// components/landing/web/StickyNav.tsx
//
// The nav stays at the top and tracks which section you are reading.
//
// TWO BEHAVIOURS WORTH EXPLAINING
//
// Sticky: the nav is rendered as a SIBLING of the ScrollView, not inside it.
// Anything inside a ScrollView scrolls away by definition, so a nav that stays
// put cannot live there. Position it over the scroller instead.
//
// Scrollspy: the active link is decided by the section nearest the top of the
// viewport, offset by the nav's own height — without that offset a section
// counts as "active" while it is still hidden behind the nav, and the
// highlight jumps one link early the whole way down.
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CareLinkLogoMark } from '@/components/branding/CareLinkLogoMark';
import { FontFamily } from '@/constants/GlobalStyles';
import { CONTAINER_MAX, SECTIONS, useLandingTheme, type SectionKey } from './landingTheme';

export const NAV_HEIGHT = 68;

export function StickyNav({
  router,
  active,
  scrolled,
  onNavigate,
}: {
  router: ReturnType<typeof useRouter>;
  /** Section currently under the nav, or null while still on the hero. */
  active: SectionKey | null;
  /** True once the page has moved, which is when the nav grows its background. */
  scrolled: boolean;
  onNavigate: (key: SectionKey) => void;
}) {
  const { c, mode, toggle } = useLandingTheme();

  return (
    <View
      style={[
        s.nav,
        {
          height: NAV_HEIGHT,
          // Transparent over the hero, glass once you scroll. The border only
          // appears with the background — a hairline floating over a photo
          // looks like a rendering artefact.
          backgroundColor: scrolled ? c.glass : 'transparent',
          borderBottomColor: scrolled ? c.glassBorder : 'transparent',
          borderBottomWidth: StyleSheet.hairlineWidth,
          ...(Platform.OS === 'web' && scrolled
            ? ({ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } as object)
            : null),
          ...(Platform.OS === 'web'
            ? ({ transition: 'background-color 220ms ease, border-color 220ms ease' } as object)
            : null),
        },
      ]}
    >
      <View style={s.container}>
        <View style={s.inner}>
          <Pressable style={s.brand} onPress={() => router.push('/')}>
            <CareLinkLogoMark size={32} />
            <Text style={[s.logo, { color: c.text }]}>
              Care<Text style={{ color: c.accent }}>Link</Text>
            </Text>
          </Pressable>

          <View style={s.links}>
            {SECTIONS.map((sec) => {
              const on = active === sec.key;
              return (
                <Pressable key={sec.key} onPress={() => onNavigate(sec.key)} style={s.linkWrap}>
                  <Text
                    style={[
                      s.link,
                      { color: on ? c.text : c.textMuted, fontFamily: on ? FontFamily.fredokaSemiBold : FontFamily.fredokaRegular },
                    ]}
                  >
                    {sec.label}
                  </Text>
                  {/* The underline is the whole point of the scrollspy: it is
                      the only element on the page that answers "where am I". */}
                  <View
                    style={[
                      s.underline,
                      {
                        backgroundColor: on ? c.accent : 'transparent',
                        ...(Platform.OS === 'web'
                          ? ({ transition: 'background-color 200ms ease, transform 200ms ease' } as object)
                          : null),
                        transform: [{ scaleX: on ? 1 : 0 }],
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={s.actions}>
            <Pressable
              onPress={toggle}
              style={[s.iconBtn, { borderColor: c.glassBorder, backgroundColor: c.card }]}
              accessibilityRole="button"
              accessibilityLabel={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={16} color={c.text} />
            </Pressable>

            <Pressable onPress={() => router.push('/(auth)/login')} style={s.ghostBtn}>
              <Text style={[s.ghostTxt, { color: c.textMuted }]}>Log in</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(auth)/role-selection')}
              style={[s.cta, { backgroundColor: c.accent }]}
            >
              <Text style={s.ctaTxt}>Get started</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  nav: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    justifyContent: 'center',
  },
  container: { width: '100%', maxWidth: CONTAINER_MAX, alignSelf: 'center', paddingHorizontal: 32 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, letterSpacing: -0.2 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  linkWrap: { alignItems: 'center', gap: 5 },
  link: { fontSize: 14 },
  underline: { height: 2, width: 20, borderRadius: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  ghostBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  ghostTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  cta: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 11 },
  ctaTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },
});
