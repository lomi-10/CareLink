import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { CredentialSealMark } from './CredentialBadge';

export type VerifiedAccountRole = 'helper' | 'employer';

const PALETTES = {
  helper: {
    background: ['#321407', '#54230B', '#2A1006'] as const,
    tile: ['#FF8A24', '#D94C0A'] as const,
    ink: '#FFF7ED',
    accent: '#FF9A3D',
    sub: '#D6B69B',
    edge: '#7C3A18',
    icon: 'home' as const,
  },
  employer: {
    background: ['#FFF8EA', '#FFF0D4', '#FFF9EE'] as const,
    tile: ['#FFD985', '#E9A93A'] as const,
    ink: '#3B1C0D',
    accent: '#D98920',
    sub: '#8D5A2B',
    edge: '#F0C478',
    icon: 'people' as const,
  },
} satisfies Record<VerifiedAccountRole, {
  background: readonly [string, string, string];
  tile: readonly [string, string];
  ink: string;
  accent: string;
  sub: string;
  edge: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}>;

export function PesoVerifiedBanner({
  role,
  location,
  compact = false,
  style,
}: {
  role: VerifiedAccountRole;
  location?: string | null;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const palette = PALETTES[role];
  const roleLabel = role === 'helper' ? 'Domestic Helper' : 'Household Employer';

  return (
    <View style={[styles.shell, { borderColor: palette.edge }, style]}>
      <LinearGradient
        colors={palette.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.banner, compact && styles.bannerCompact]}
      >
        <LinearGradient
          colors={palette.tile}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.roleIconTile, compact && styles.roleIconTileCompact]}
        >
          <Ionicons
            name={palette.icon}
            size={compact ? 19 : 27}
            color={role === 'helper' ? '#FFF7ED' : '#7C3A18'}
          />
          {!compact && role === 'employer' && (
            <View style={styles.heartMark}>
              <Ionicons name="heart" size={10} color="#9A4B17" />
            </View>
          )}
        </LinearGradient>

        <View style={[styles.divider, compact && styles.dividerCompact, { backgroundColor: palette.accent }]} />

        <View style={styles.copy}>
          <Text style={[styles.title, compact && styles.titleCompact, { color: palette.ink }]}>
            <Text style={{ color: palette.accent }}>PESO </Text>
            <Text>Verified</Text>
          </Text>
          <Text style={[styles.role, compact && styles.roleCompact, { color: palette.ink }]} numberOfLines={1}>{roleLabel}</Text>
          {!!location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={compact ? 11 : 13} color={palette.accent} />
              <Text style={[styles.location, compact && styles.locationCompact, { color: palette.sub }]} numberOfLines={1}>{location}</Text>
            </View>
          )}
        </View>

        <View style={[styles.sealOrbit, compact && styles.sealOrbitCompact]}>
          <CredentialSealMark size={compact ? 22 : 34} colors={[palette.accent, palette.tile[1]]} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'stretch',
    borderRadius: 25,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#7C3A18', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12 },
      android: { elevation: 5 },
      default: { boxShadow: '0 6px 18px rgba(82,42,18,0.16)' } as object,
    }),
  },
  banner: { minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, gap: 8 },
  bannerCompact: { minHeight: 48, paddingHorizontal: 7, paddingVertical: 5, gap: 6 },
  roleIconTile: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  roleIconTileCompact: { width: 32, height: 32, borderRadius: 10 },
  heartMark: { position: 'absolute', right: 6, bottom: 6, width: 17, height: 17, borderRadius: 9, backgroundColor: '#FFF4DD', alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, height: 44, opacity: 0.65, flexShrink: 0 },
  dividerCompact: { height: 34 },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, lineHeight: 19 },
  titleCompact: { fontSize: 12, lineHeight: 15 },
  role: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, lineHeight: 16 },
  roleCompact: { fontSize: 10, lineHeight: 13 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1, minWidth: 0 },
  location: { flex: 1, minWidth: 0, fontFamily: FontFamily.fredokaRegular, fontSize: 10 },
  locationCompact: { fontSize: 8.5 },
  sealOrbit: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sealOrbitCompact: { width: 24, height: 26 },
});
