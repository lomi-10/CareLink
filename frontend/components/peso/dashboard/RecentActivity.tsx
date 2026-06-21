// components/peso/dashboard/RecentActivity.tsx
// "Recent Activities" merged timeline (applications, job approvals, interviews, contracts).
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { ActivityEntry } from '@/lib/pesoDashboardApi';

const ICONS: Record<ActivityEntry['type'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  application: { icon: 'document-text-outline', color: '#FF9500' },
  job_approved: { icon: 'briefcase-outline', color: '#0284C7' },
  interview_completed: { icon: 'calendar-outline', color: '#34C759' },
  contract_signed: { icon: 'checkmark-done-outline', color: '#9333EA' },
};

export function RecentActivity({ activities, router }: { activities: ActivityEntry[]; router: ReturnType<typeof useRouter> }) {
  return (
    <View style={s.panel}>
      <Text style={s.panelTitle}>Recent Activities</Text>

      {activities.length === 0 ? (
        <Text style={s.emptyText}>No recent activity yet.</Text>
      ) : (
        activities.map((a, i) => {
          const meta = ICONS[a.type];
          return (
            <View key={`${a.type}-${a.ts}-${i}`} style={s.row}>
              <View style={[s.iconWrap, { backgroundColor: meta.color + '1A' }]}>
                <Ionicons name={meta.icon} size={15} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>{a.title}</Text>
                <Text style={s.subtitle} numberOfLines={1}>{a.subtitle}</Text>
              </View>
              <Text style={s.time}>{a.ts_label}</Text>
            </View>
          );
        })
      )}

      <TouchableOpacity onPress={() => router.push('/(peso)/reports' as never)} activeOpacity={0.7}>
        <Text style={s.viewAll}>View all activities →</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    flex: 1, minWidth: 280, backgroundColor: theme.color.surfaceElevated, borderRadius: theme.radius.lg,
    padding: 18, borderWidth: 1, borderColor: theme.color.line, ...theme.shadow.card,
  },
  panelTitle: { fontSize: 15, fontWeight: '800', color: theme.color.ink, marginBottom: 12 },
  emptyText: { fontSize: 13, color: theme.color.muted, paddingVertical: 16, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: theme.color.line },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  title: { fontSize: 12.5, fontWeight: '700', color: theme.color.ink },
  subtitle: { fontSize: 11, color: theme.color.muted, marginTop: 1 },
  time: { fontSize: 10, color: theme.color.subtle, flexShrink: 0 },
  viewAll: { fontSize: 12, fontWeight: '700', color: theme.color.peso, marginTop: 12 },
});
