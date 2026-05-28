// components/helper/home/GreetingCard.tsx
// Recruitment-style hero banner for helpers

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

function createGreetingStyles(c: ThemeColor) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.helper,
      borderRadius: 20,
      padding: 22,
      marginBottom: 24,
      overflow: 'hidden',
      position: 'relative',
      minHeight: 150,
    },
    circle1: {
      position: 'absolute',
      right: -30,
      top: -30,
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: 'rgba(255,255,255,0.07)',
    },
    circle2: {
      position: 'absolute',
      right: 40,
      bottom: -50,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },

    content: { flex: 1, zIndex: 1 },

    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    kickerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 20,
    },
    kickerText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    verifiedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.25)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },
    verifiedPillText: { fontSize: 9, fontWeight: '800', color: '#fff' },

    greeting: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
    name: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
    tagline: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginBottom: 14 },

    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statChipText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },

    illustration: {
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
      zIndex: 1,
      position: 'relative',
    },
    iconRing: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconRingSmall: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

interface GreetingCardProps {
  userName: string;
  verifiedBadge?: boolean;
}

export function GreetingCard({ userName, verifiedBadge }: GreetingCardProps) {
  const { color: c } = useHelperTheme();
  const s = useMemo(() => createGreetingStyles(c), [c]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={s.card}>
      <View style={s.circle1} />
      <View style={s.circle2} />

      <View style={s.content}>
        <View style={s.kickerRow}>
          <View style={s.kickerBadge}>
            <Ionicons name="home-outline" size={10} color="#fff" />
            <Text style={s.kickerText}>DOMESTIC SERVICES</Text>
          </View>
          {verifiedBadge && (
            <View style={s.verifiedPill}>
              <Ionicons name="shield-checkmark" size={11} color="#fff" />
              <Text style={s.verifiedPillText}>PESO Verified</Text>
            </View>
          )}
        </View>

        <Text style={s.greeting}>{getGreeting()},</Text>
        <Text style={s.name} numberOfLines={1}>
          {userName}
        </Text>

        <Text style={s.tagline}>Your career in domestic{'\n'}services starts here.</Text>

        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Ionicons name="briefcase-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={s.statChipText}>Browse Jobs</Text>
          </View>
          <View style={s.dot} />
          <View style={s.statChip}>
            <Ionicons name="shield-checkmark-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={s.statChipText}>PESO-Verified</Text>
          </View>
        </View>
      </View>

      <View style={s.illustration}>
        <View style={s.iconRing}>
          <Ionicons name="home" size={28} color="#fff" />
        </View>
        <View style={[s.iconRingSmall, { top: -10, right: -10 }]}>
          <Ionicons name="leaf" size={14} color="#fff" />
        </View>
        <View style={[s.iconRingSmall, { bottom: -8, left: -12 }]}>
          <Ionicons name="star" size={12} color="#FBBF24" />
        </View>
      </View>
    </View>
  );
}
