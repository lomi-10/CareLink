// components/landing/WebLandingRedesign.tsx
// Desktop (≥1024px) marketing landing page.
//
// The orchestrator: it lays the sections out in order, tracks which one you are
// reading, and owns the pieces that sit OUTSIDE the scroller — the animated
// backdrop behind it, the sticky nav above it, the splash over it. Each section
// is its own file in components/landing/web/.
//
// Colours and the light/dark switch live in web/landingTheme.tsx.
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ScrollView, StyleSheet, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';

import { AnimatedBackdrop } from './web/AnimatedBackdrop';
import { BottomCta } from './web/BottomCta';
import { BuiltOnTrust } from './web/BuiltOnTrust';
import { EmploymentManagement } from './web/EmploymentManagement';
import { FeatureStrip } from './web/FeatureStrip';
import { Footer } from './web/Footer';
import { Hero } from './web/Hero';
import { HowItWorks } from './web/HowItWorks';
import { LandingSplash } from './web/LandingSplash';
import { StatsBand } from './web/StatsBand';
import { StickyNav, NAV_HEIGHT } from './web/StickyNav';
import { Team } from './web/Team';
import {
  LandingThemeProvider, SECTIONS, useLandingTheme, type SectionKey,
} from './web/landingTheme';

/** Distance past a section's top before it counts as the one being read. */
const SPY_OFFSET = NAV_HEIGHT + 40;

function LandingBody() {
  const router = useRouter();
  const { c } = useLandingTheme();
  const scrollRef = useRef<ScrollView>(null);

  const sectionY = useRef<Record<SectionKey, number>>({
    features: 0, howItWorks: 0, management: 0, trust: 0, team: 0,
  });

  const [active, setActive] = useState<SectionKey | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  const captureY = (key: SectionKey) => (e: LayoutChangeEvent) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToSection = useCallback((key: SectionKey) => {
    // Land the section title just below the nav rather than under it.
    scrollRef.current?.scrollTo({ y: Math.max(0, sectionY.current[key] - NAV_HEIGHT - 12), animated: true });
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setScrolled(y > 8);

    // Walk backwards and take the LAST section whose top has passed the nav.
    // Forwards would match the first candidate and stick on it.
    let current: SectionKey | null = null;
    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const key = SECTIONS[i].key;
      if (y + SPY_OFFSET >= sectionY.current[key]) { current = key; break; }
    }

    // The very bottom always highlights the last section. Otherwise a short
    // final section can never win the comparison and Team would stay dark even
    // while you are looking straight at it.
    const { layoutMeasurement, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + y >= contentSize.height - 80) {
      current = SECTIONS[SECTIONS.length - 1].key;
    }

    setActive((prev) => (prev === current ? prev : current));
  }, []);

  return (
    <View style={[s.page, { backgroundColor: c.bg }]}>
      <AnimatedBackdrop />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        // 16ms keeps the underline in step with the scroll. Lower and the
        // highlight visibly lags the section it is describing.
        scrollEventThrottle={16}
      >
        <Hero router={router} onNavigate={scrollToSection} />

        <View onLayout={captureY('features')}><FeatureStrip /></View>
        <View onLayout={captureY('howItWorks')}><HowItWorks /></View>
        <View onLayout={captureY('management')}><EmploymentManagement /></View>
        <View onLayout={captureY('trust')}><BuiltOnTrust /></View>
        <View onLayout={captureY('team')}><Team /></View>

        <StatsBand />
        <BottomCta router={router} />
        <Footer />
      </ScrollView>

      <StickyNav router={router} active={active} scrolled={scrolled} onNavigate={scrollToSection} />

      {!splashDone && <LandingSplash onDone={() => setSplashDone(true)} />}
    </View>
  );
}

export function WebLandingRedesign() {
  return (
    <LandingThemeProvider>
      <LandingBody />
    </LandingThemeProvider>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 0 },
});
