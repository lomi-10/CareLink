// components/landing/WebLandingRedesign.tsx
// Desktop (≥1024px) marketing landing page — dark cinematic brand redesign.
// Rendered by LandingPage.tsx for wide viewports.
//
// This file is just the orchestrator: it lays the sections out in order and
// wires up the nav's smooth-scroll-to-section behavior. Each section is its
// own file under components/landing/web/ — edit those directly to redesign
// a section without touching this one. Shared colors/gradients/layout live
// in components/landing/web/theme.ts.
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { BottomCta } from "./web/BottomCta";
import { BuiltOnTrust } from "./web/BuiltOnTrust";
import { EmploymentManagement } from "./web/EmploymentManagement";
import { FeatureStrip } from "./web/FeatureStrip";
import { Footer } from "./web/Footer";
import { Hero } from "./web/Hero";
import { HowItWorks } from "./web/HowItWorks";
import { StatsBand } from "./web/StatsBand";
import { BG_DARK, type SectionKey } from "./web/theme";

export function WebLandingRedesign() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<SectionKey, number>>({
    howItWorks: 0,
    management: 0,
    trust: 0,
  });

  const captureY = (key: SectionKey) => (e: LayoutChangeEvent) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  const scrollToSection = (key: SectionKey) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, sectionY.current[key] - 24), animated: true });
  };

  return (
    <View style={s.page}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ════════ SECTION 1 — HERO (nav floats over the photo) ════════ */}
        <Hero router={router} onNavigate={scrollToSection} />
        <FeatureStrip />

        {/* ════════ SECTION 2 — HOW IT WORKS + MANAGEMENT + TRUST ════════ */}
        <View onLayout={captureY("howItWorks")}>
          <HowItWorks />
        </View>
        <View onLayout={captureY("management")}>
          <EmploymentManagement />
        </View>
        <View onLayout={captureY("trust")}>
          <BuiltOnTrust />
        </View>

        {/* ════════ SECTION 3 — STATS + CTA + FOOTER ════════ */}
        <StatsBand />
        <BottomCta router={router} />
        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG_DARK },
  scroll: { flexGrow: 1, paddingBottom: 0 },
});
