// components/peso/dashboard/StatsRow.tsx
// The 6 headline stat cards across the top of the PESO dashboard.
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { DashboardStats } from '@/lib/pesoDashboardApi';

type Props = { stats: DashboardStats; router: ReturnType<typeof useRouter> };

export function StatsRow({ stats, router }: Props) {
  return (
    <View style={s.row}>
      <Card
        icon="people" iconBg="#FFF4E5" iconColor="#FF9500"
        value={String(stats.helpers_waiting)} label="For Verification" title="Helpers Waiting"
        linkLabel="Review Now" onPress={() => router.push('/(peso)/users' as never)}
      />
      <Card
        icon="briefcase" iconBg="#FFF4E5" iconColor="#FF9500"
        value={String(stats.jobs_awaiting_approval)} label="For Verification" title="Jobs Awaiting Approval"
        linkLabel="Review Now" onPress={() => router.push('/(peso)/jobs' as never)}
      />
      <Card
        icon="calendar" iconBg="#E8F5E9" iconColor="#34C759"
        title="Today's Interviews" linkLabel="View Schedule" onPress={() => router.push('/(peso)/interviews' as never)}
      >
        <View style={s.interviewRow}>
          <View style={s.interviewItem}>
            <Text style={s.interviewNum}>{stats.interviews_today.scheduled}</Text>
            <Text style={s.interviewLabel}>Scheduled</Text>
          </View>
          <View style={s.interviewItem}>
            <Text style={[s.interviewNum, { color: '#34C759' }]}>{stats.interviews_today.completed}</Text>
            <Text style={s.interviewLabel}>Completed</Text>
          </View>
          <View style={s.interviewItem}>
            <Text style={[s.interviewNum, { color: '#DC2626' }]}>{stats.interviews_today.missed}</Text>
            <Text style={s.interviewLabel}>Missed</Text>
          </View>
        </View>
      </Card>
      <Card
        icon="document-text" iconBg="#F3E8FF" iconColor="#9333EA"
        value={String(stats.active_contracts)}
        label={`${stats.contracts_expiring_soon} expiring soon`}
        title="Active Contracts"
        linkLabel="View Contracts" onPress={() => router.push('/(peso)/contracts' as never)}
      />
      <Card
        icon="alert-circle" iconBg="#FEE2E2" iconColor="#DC2626"
        value={String(stats.open_complaints)} label="New Complaints" title="Open Complaints"
        linkLabel="View Complaints" onPress={() => router.push('/(peso)/complaints' as never)}
      />
      <Card
        icon="trending-up" iconBg="#E8F5E9" iconColor="#34C759"
        value={`${stats.success_rate_pct}%`}
        label={`${stats.placements_this_month} of ${stats.applications_this_month} placements`}
        title="This Month's Success Rate"
        linkLabel="View Analytics" onPress={() => router.push('/(peso)/reports' as never)}
      />
    </View>
  );
}

function Card({
  icon, iconBg, iconColor, value, label, title, linkLabel, onPress, children,
}: {
  icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string;
  value?: string; label?: string; title: string; linkLabel: string; onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeadRow}>
        <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      </View>
      <Text style={s.title}>{title}</Text>
      {children ?? (
        <>
          <Text style={s.value}>{value}</Text>
          <Text style={s.label}>{label}</Text>
        </>
      )}
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s.linkRow}>
        <Text style={s.linkText}>{linkLabel}</Text>
        <Ionicons name="arrow-forward" size={13} color={theme.color.peso} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  card: {
    flex: 1, minWidth: 168, backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.lg, padding: 16, borderWidth: 1, borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  cardHeadRow: { marginBottom: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12, fontWeight: '700', color: theme.color.muted, marginBottom: 6 },
  value: { fontSize: 26, fontWeight: '800', color: theme.color.ink, marginBottom: 3 },
  label: { fontSize: 11, color: theme.color.subtle, marginBottom: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' },
  linkText: { fontSize: 12, fontWeight: '700', color: theme.color.peso },

  interviewRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  interviewItem: { alignItems: 'flex-start' },
  interviewNum: { fontSize: 18, fontWeight: '800', color: theme.color.ink },
  interviewLabel: { fontSize: 10, color: theme.color.subtle },
});
