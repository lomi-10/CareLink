import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import { theme } from '@/constants/theme';
import {
  fetchApplicationTasks,
  completeApplicationTask,
  type ApplicationTask,
} from '@/lib/applicationTasksApi';

type Section = { title: string; data: ApplicationTask[] };

export default function WorkTasksScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { userData, loading: authLoading } = useAuth();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();

  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

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
      const res = await fetchApplicationTasks(activeHire.application_id, helperId, 'helper');
      if (res.success && res.data) setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [helperId, activeHire]);

  useEffect(() => {
    if (isWorkMode && activeHire && helperId) void load();
  }, [isWorkMode, activeHire, helperId, load]);

  const sections = useMemo((): Section[] => {
    const open = tasks.filter((t) => t.status === 'pending' || t.status === 'skipped');
    const done = tasks.filter((t) => t.status === 'done');
    const out: Section[] = [];
    if (open.length) out.push({ title: 'To do', data: open });
    if (done.length) out.push({ title: 'Completed', data: done });
    return out;
  }, [tasks]);

  const markDone = async (t: ApplicationTask) => {
    if (t.status !== 'pending' || !helperId) return;
    setBusyId(t.id);
    try {
      const res = await completeApplicationTask(t.id, helperId);
      if (!res.success) {
        Alert.alert('Tasks', res.message || 'Could not update');
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!ready || authLoading || !isWorkMode || !activeHire) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.color.helper} />
      </View>
    );
  }

  return (
    <WorkModeShell desktopTitle="Tasks" desktopSubtitle="Placement checklist">
      <View style={{ flex: 1 }}>
        <SectionList
          sections={sections}
          keyExtractor={(i) => String(i.id)}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          contentContainerStyle={[
            styles.listContent,
            !isDesktop && { paddingBottom: 24 },
            sections.length === 0 && !loading ? { flexGrow: 1 } : null,
          ]}
          ListEmptyComponent={
            loading ? null : (
              <Text style={styles.empty}>No tasks yet. Your employer can add tasks for this placement.</Text>
            )
          }
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          renderItem={({ item, section }) => {
            const isDoneSection = section.title === 'Completed';
            const isPending = item.status === 'pending';
            return (
              <View style={[styles.row, isDoneSection && styles.rowDone]}>
                <Checkbox
                  value={item.status === 'done'}
                  onValueChange={(v) => {
                    if (v && isPending) void markDone(item);
                  }}
                  color={item.status === 'done' ? theme.color.success : theme.color.muted}
                  disabled={!isPending || busyId === item.id}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.title, isDoneSection && styles.titleDone]}>{item.title}</Text>
                  {item.description ? (
                    <Text style={[styles.desc, isDoneSection && styles.descDone]} numberOfLines={3}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    {item.due_date ? (
                      <Text style={styles.meta}>Due {item.due_date}</Text>
                    ) : (
                      <Text style={styles.meta}>No due date</Text>
                    )}
                    {item.is_recurring ? <Text style={styles.meta}> · Recurring</Text> : null}
                  </View>
                </View>
                {busyId === item.id ? <ActivityIndicator color={theme.color.helper} /> : null}
              </View>
            );
          }}
        />
      </View>
    </WorkModeShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 16, gap: 8 },
  empty: { textAlign: 'center', color: theme.color.muted, marginTop: 48, fontSize: 15, paddingHorizontal: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    marginBottom: 8,
  },
  rowDone: { opacity: 0.55 },
  title: { fontSize: 16, fontWeight: '700', color: theme.color.ink },
  titleDone: { textDecorationLine: 'line-through', color: theme.color.muted },
  desc: { fontSize: 14, color: theme.color.inkMuted, marginTop: 4, lineHeight: 20 },
  descDone: { color: theme.color.muted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  meta: { fontSize: 12, color: theme.color.muted },
});
