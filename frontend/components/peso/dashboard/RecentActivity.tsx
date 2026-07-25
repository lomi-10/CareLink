// components/peso/dashboard/RecentActivity.tsx
// "Recent Activities" merged timeline (applications, job approvals, interviews, contracts).
// Theme-aware (light/dark), animated entrance, hover on the footer link.
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimateIn } from '@/components/peso/ui';
import { usePesoTheme, shadow, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';
import type { ActivityEntry } from '@/lib/pesoDashboardApi';

const TONE: Record<ActivityEntry['type'], keyof PesoColors> = {
  application: 'accent',
  job_approved: 'info',
  interview_completed: 'ok',
  contract_signed: 'accent',
};
const ICON: Record<ActivityEntry['type'], keyof typeof Ionicons.glyphMap> = {
  application: 'document-text-outline',
  job_approved: 'briefcase-outline',
  interview_completed: 'calendar-outline',
  contract_signed: 'checkmark-done-outline',
};

export function RecentActivity({ activities, router }: { activities: ActivityEntry[]; router: ReturnType<typeof useRouter> }) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c, dark), [c, dark]);
  return (
    <AnimateIn delay={140} style={s.panel}>
      <Text style={s.panelTitle}>Recent Activities</Text>

      {activities.length === 0 ? (
        <Text style={s.emptyText}>No recent activity yet.</Text>
      ) : (
        activities.map((a, i) => {
          const color = (c[TONE[a.type]] as string) ?? c.accent;
          return (
            <View key={`${a.type}-${a.ts}-${i}`} style={s.row}>
              <View style={[s.iconWrap, { backgroundColor: color + '22' }]}>
                <Ionicons name={ICON[a.type]} size={15} color={color} />
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

      <Pressable onPress={() => router.push('/(peso)/reports' as never)}>
        {({ hovered }: any) => <Text style={[s.viewAll, hovered && { color: c.accentInk }]}>View all activities →</Text>}
      </Pressable>
    </AnimateIn>
  );
}

const makeStyles = (c: PesoColors, dark: boolean) => StyleSheet.create({
  panel: {
    flex: 1, minWidth: 280, backgroundColor: c.surface, borderRadius: radius.lg,
    padding: 18, borderWidth: 1, borderColor: c.line, ...shadow('sm', dark),
  },
  panelTitle: { fontSize: 15, fontFamily: font.display, color: c.ink, marginBottom: 12 },
  emptyText: { fontSize: 13, color: c.muted, paddingVertical: 16, textAlign: 'center', fontFamily: font.regular },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.line },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  title: { fontSize: 12.5, fontFamily: font.semibold, color: c.ink },
  subtitle: { fontSize: 11, color: c.muted, marginTop: 1, fontFamily: font.regular },
  time: { fontSize: 10, color: c.subtle, flexShrink: 0, fontFamily: font.regular },
  viewAll: { fontSize: 12, fontFamily: font.semibold, color: c.accent, marginTop: 12 },
});
