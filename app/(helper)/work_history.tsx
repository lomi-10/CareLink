import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import { theme } from '@/constants/theme';
import { fetchWeekAttendance, listWeekStartsGoingBack, type WeekDayAttendance } from '@/lib/helperWorkApi';
import { attendanceDotBackground } from '@/lib/attendanceUi';

type WeekBlock = { week_start: string; days: WeekDayAttendance[] };

export default function WorkHistoryScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { userData, loading: authLoading } = useAuth();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();

  const [weeks, setWeeks] = useState<WeekBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const helperId = userData ? Number(userData.user_id) : 0;

  useEffect(() => {
    if (!ready || authLoading) return;
    if (!isWorkMode || !activeHire) {
      router.replace('/(helper)/home');
    }
  }, [ready, isWorkMode, activeHire, authLoading, router]);

  const load = useCallback(async () => {
    if (!activeHire || !helperId) return;
    setLoading(true);
    try {
      const starts = listWeekStartsGoingBack(12);
      const results = await Promise.all(
        starts.map((ws) => fetchWeekAttendance(helperId, activeHire.application_id, ws)),
      );
      const next: WeekBlock[] = [];
      results.forEach((res, i) => {
        if (res.success && res.days) {
          next.push({ week_start: starts[i], days: res.days });
        }
      });
      setWeeks(next);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [helperId, activeHire]);

  useEffect(() => {
    if (isWorkMode && activeHire && helperId) void load();
  }, [isWorkMode, activeHire, helperId, load]);

  if (!ready || authLoading || !isWorkMode || !activeHire) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.color.helper} />
      </View>
    );
  }

  const body = (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={[styles.scroll, !isDesktop && { paddingBottom: 24 }]}
    >
      {loading && weeks.length === 0 ? (
        <ActivityIndicator color={theme.color.helper} style={{ marginTop: 24 }} />
      ) : (
        weeks.map((w) => {
          const checkedDays = w.days.filter((d) => d.checked_in).length;
          return (
            <View key={w.week_start} style={styles.weekCard}>
              <Text style={styles.weekTitle}>Week of {w.week_start}</Text>
              <Text style={styles.weekSub}>
                {checkedDays} day{checkedDays === 1 ? '' : 's'} with check-in
              </Text>
              <View style={styles.dots}>
                {w.days.map((d) => (
                  <View key={d.date} style={styles.dotCol}>
                    <Text style={styles.dotLbl}>{d.weekday.slice(0, 1)}</Text>
                    <View style={[styles.dot, d.checked_in && styles.dotOn]} />
                  </View>
                ))}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  return (
    <WorkModeShell desktopTitle="History" desktopSubtitle="Recent attendance">
      <View style={{ flex: 1 }}>{body}</View>
    </WorkModeShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { gap: 12, paddingBottom: 16 },
  weekCard: {
    borderRadius: 14,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: 14,
  },
  weekTitle: { fontSize: 16, fontWeight: '800', color: theme.color.ink },
  weekSub: { fontSize: 13, color: theme.color.muted, marginTop: 4, marginBottom: 12 },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  dotCol: { alignItems: 'center', gap: 6 },
  dotLbl: { fontSize: 10, fontWeight: '700', color: theme.color.muted },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.color.line,
  },
});
