// components/peso/dashboard/StatsRow.tsx
// The 6 headline stat cards across the top of the PESO dashboard. Theme-aware
// (light/dark), each card is an animated, hoverable Card that routes on press.
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/peso/ui';
import { usePesoTheme, font, type PesoColors } from '@/contexts/PesoThemeContext';
import type { DashboardStats } from '@/lib/pesoDashboardApi';

type Props = { stats: DashboardStats; router: ReturnType<typeof useRouter> };

type Tint = { fg: string; bg: string };
const tintFor = (tone: string, c: PesoColors): Tint => ({
  accent: { fg: c.accent, bg: c.accentSoft }, warn: { fg: c.warn, bg: c.warnSoft },
  info: { fg: c.info, bg: c.infoSoft }, ok: { fg: c.ok, bg: c.okSoft },
  bad: { fg: c.bad, bg: c.badSoft }, violet: { fg: '#8B6FE0', bg: 'rgba(139,111,224,0.16)' },
}[tone] ?? { fg: c.accent, bg: c.accentSoft });

export function StatsRow({ stats, router }: Props) {
  const { c } = usePesoTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
      <StatCard tone="accent" icon="people" title="Helpers Waiting" value={String(stats.helpers_waiting)} label="For Verification"
        linkLabel="Review now" delay={0} onPress={() => router.push('/(peso)/users' as never)} />
      <StatCard tone="warn" icon="briefcase" title="Jobs Awaiting Approval" value={String(stats.jobs_awaiting_approval)} label="For Verification"
        linkLabel="Review now" delay={60} onPress={() => router.push('/(peso)/jobs' as never)} />
      <StatCard tone="info" icon="calendar" title="Today's Interviews" linkLabel="View schedule" delay={120} onPress={() => router.push('/(peso)/interviews' as never)}>
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10, marginTop: 2 }}>
          <Mini value={stats.interviews_today.scheduled} label="Scheduled" color={c.ink} />
          <Mini value={stats.interviews_today.completed} label="Completed" color={c.ok} />
          <Mini value={stats.interviews_today.missed} label="Missed" color={c.bad} />
        </View>
      </StatCard>
      <StatCard tone="violet" icon="document-text" title="Active Contracts" value={String(stats.active_contracts)}
        label={`${stats.contracts_expiring_soon} expiring soon`} linkLabel="View contracts" delay={180} onPress={() => router.push('/(peso)/contracts' as never)} />
      <StatCard tone="bad" icon="alert-circle" title="Open Complaints" value={String(stats.open_complaints)} label="New complaints"
        linkLabel="View complaints" delay={240} onPress={() => router.push('/(peso)/complaints' as never)} />
      <StatCard tone="ok" icon="trending-up" title="This Month's Success Rate" value={`${stats.success_rate_pct}%`}
        label={`${stats.placements_this_month} of ${stats.applications_this_month} placements`} linkLabel="View analytics" delay={300} onPress={() => router.push('/(peso)/reports' as never)} />
    </View>
  );
}

function Mini({ value, label, color }: { value: number; label: string; color: string }) {
  const { c } = usePesoTheme();
  return (
    <View>
      <Text style={{ fontFamily: font.display, fontSize: 19, color }}>{value}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 10.5, color: c.subtle }}>{label}</Text>
    </View>
  );
}

function StatCard({
  tone, icon, title, value, label, linkLabel, onPress, delay, children,
}: {
  tone: string; icon: keyof typeof Ionicons.glyphMap; title: string; value?: string; label?: string;
  linkLabel: string; onPress: () => void; delay: number; children?: React.ReactNode;
}) {
  const { c } = usePesoTheme();
  const t = useMemo(() => tintFor(tone, c), [tone, c]);
  return (
    <Card onPress={onPress} delay={delay} style={{ flex: 1, minWidth: 168, padding: 16 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name={icon} size={20} color={t.fg} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: c.muted, marginBottom: 6 }}>{title}</Text>
      {children ?? (
        <>
          <Text style={{ fontFamily: font.display, fontSize: 26, color: c.ink, marginBottom: 3 }}>{value}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 11, color: c.subtle, marginBottom: 10 }}>{label}</Text>
        </>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: c.accent }}>{linkLabel}</Text>
        <Ionicons name="arrow-forward" size={13} color={c.accent} />
      </View>
    </Card>
  );
}
