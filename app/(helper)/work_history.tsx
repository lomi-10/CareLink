import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { fetchWeekAttendance, listWeekStartsGoingBack, type WeekDayAttendance } from '@/lib/helperWorkApi';
import { attendanceDotBackground } from '@/lib/attendanceUi';

import { createHelperWorkHistoryStyles } from './work_history.styles';

type WeekBlock = { week_start: string; days: WeekDayAttendance[] };

export default function WorkHistoryScreen() {
  const router = useRouter();
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createHelperWorkHistoryStyles(c), [c]);
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
        <ActivityIndicator size="large" color={c.helper} />
      </View>
    );
  }

  const body = (
    <ScrollView
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={[styles.scroll, !isDesktop && { paddingBottom: 24 }]}
    >
      {loading && weeks.length === 0 ? (
        <ActivityIndicator color={c.helper} style={{ marginTop: 24 }} />
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
