// app/(parent)/hire/task_board.tsx
// Task Board — all helpers' tasks, grouped by helper, with filter tabs.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FontFamily } from '@/constants/GlobalStyles';
import { BROWN, DARK, MUTED, DIVIDER, ICON_BG, GREEN, DANGER, SUBTLE } from '@/components/parent/home/parentWarmTheme';
import { Sidebar, ParentWorkModeTabBar } from '@/components/parent/home';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useParentActivePlacements, type ActivePlacement } from '@/hooks/parent/useParentActivePlacements';
import { fetchApplicationTasks, type ApplicationTask, type TaskPriority } from '@/lib/applicationTasksApi';
import { fetchAttendanceToday } from '@/lib/attendanceApi';

// ─── Palette ──────────────────────────────────────────────────────────────────
const HERO_GR  = ['#F6D9AE', '#E2A968', '#C5853E'] as const;
const CARD_GR  = ['#FFFDF9', '#FEF5E0'] as const;
const AMBER    = '#D97706';
const AMBER_BG = '#FEF3C7';

type FilterKey = 'all' | 'pending' | 'completed' | 'overdue';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue',   label: 'Overdue' },
];

// ─── Priority badge ───────────────────────────────────────────────────────────
const PRIORITY_C: Record<TaskPriority, { bg: string; text: string }> = {
  low:    { bg: '#DCFCE7', text: '#15803D' },
  medium: { bg: AMBER_BG,  text: AMBER },
  high:   { bg: '#FEE2E2', text: DANGER },
};

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const c = PRIORITY_C[priority] ?? PRIORITY_C.medium;
  return (
    <View style={[b.priorityBadge, { backgroundColor: c.bg }]}>
      <Text style={[b.priorityText, { color: c.text }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

// ─── Circular progress ring ───────────────────────────────────────────────────
function ProgressRing({ done, total, size = 56 }: { done: number; total: number; size?: number }) {
  const sw = 5;
  const r  = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(done / total, 1) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke="#F3E8D6" strokeWidth={sw} fill="none" />
        {total > 0 && (
          <Circle cx={size/2} cy={size/2} r={r}
            stroke={pct === 1 ? GREEN : BROWN}
            strokeWidth={sw} fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            rotation="-90" origin={`${size/2}, ${size/2}`}
          />
        )}
      </Svg>
      <Text style={b.ringNum}>{done}/{total}</Text>
      <Text style={b.ringLabel}>Done</Text>
    </View>
  );
}

// ─── Data hook ────────────────────────────────────────────────────────────────
type HelperBoard = {
  placement: ActivePlacement;
  tasks: ApplicationTask[];
  checkedIn: boolean;
  checkInAt: string | null;
};

function useTaskBoard() {
  const { placements, loading: pLoading, refresh: refreshPlacements } = useParentActivePlacements();
  const [boards, setBoards] = useState<HelperBoard[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (placements.length === 0) { setBoards([]); return; }
    const raw = await AsyncStorage.getItem('user_data');
    const parentId = raw ? Number((JSON.parse(raw) as { user_id: number }).user_id) : 0;
    if (!parentId) return;
    setLoading(true);
    try {
      const results = await Promise.all(placements.map(async p => {
        const appId = Number(p.application_id);
        const [taskRes, attRes] = await Promise.all([
          fetchApplicationTasks(appId, parentId, 'parent', 'all').catch(() => null),
          fetchAttendanceToday(appId, Number(p.helper_id)).catch(() => null),
        ]);
        return {
          placement: p,
          tasks: taskRes?.data ?? [],
          checkedIn: attRes?.data?.checked_in ?? false,
          checkInAt: attRes?.data?.checked_in_at ?? null,
        } satisfies HelperBoard;
      }));
      setBoards(results);
    } finally { setLoading(false); }
  }, [placements]);

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(async () => {
    await refreshPlacements();
    await load();
  }, [refreshPlacements, load]);

  return { boards, loading: pLoading || loading, refresh };
}

// ─── Single helper board section ──────────────────────────────────────────────
function HelperSection({
  data, filter, focusedAppId, onTaskPress,
}: {
  data: HelperBoard;
  filter: FilterKey;
  focusedAppId: number;
  onTaskPress: (task: ApplicationTask) => void;
}) {
  const { placement, tasks, checkedIn, checkInAt } = data;
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'pending') return t.status === 'pending';
      if (filter === 'completed') return t.status === 'done';
      if (filter === 'overdue') return t.status === 'pending' && !!t.due_date && t.due_date < today;
      return true;
    });
  }, [tasks, filter, today]);

  if (focusedAppId !== 0 && Number(placement.application_id) !== focusedAppId) return null;

  const done  = tasks.filter(t => t.status === 'done').length;
  const total = tasks.length;
  const initials = placement.helper_name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('');
  const timeStr = checkInAt
    ? (() => { try { return new Date(checkInAt.replace(' ','T')).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); } catch { return checkInAt; } })()
    : null;

  const preview = filtered.slice(0, 3);

  return (
    <LinearGradient colors={CARD_GR} style={b.section}>
      {/* Helper header */}
      <View style={b.sectionHead}>
        {placement.helper_photo ? (
          <Image source={{ uri: placement.helper_photo }} style={b.avatar} contentFit="cover" />
        ) : (
          <View style={[b.avatar, b.avatarFb]}><Text style={b.avatarInitials}>{initials}</Text></View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={b.helperName} numberOfLines={1}>{placement.helper_name}</Text>
          <Text style={b.helperRole} numberOfLines={1}>{placement.job_title}</Text>
          <View style={b.checkinRow}>
            <View style={[b.checkinDot, { backgroundColor: checkedIn ? GREEN : AMBER }]} />
            <Text style={b.checkinText}>
              {checkedIn ? `Checked In ${timeStr ?? ''}` : 'Not Checked In'}
            </Text>
          </View>
        </View>
        <ProgressRing done={done} total={total} size={58} />
      </View>

      {/* Task list or empty state */}
      {filtered.length === 0 ? (
        <View style={b.sectionEmpty}>
          <Ionicons name="checkmark-done-outline" size={22} color={MUTED} />
          <Text style={b.sectionEmptyText}>
            {filter === 'all' ? 'No tasks assigned yet.' : `No ${filter} tasks.`}
          </Text>
        </View>
      ) : (
        preview.map(task => (
          <TouchableOpacity key={task.id} style={b.taskRow} onPress={() => onTaskPress(task)} activeOpacity={0.85}>
            <View style={b.taskIconWrap}>
              {task.status === 'done'
                ? <Ionicons name="checkmark-circle" size={20} color={GREEN} />
                : task.due_date && task.due_date < today
                ? <Ionicons name="alert-circle-outline" size={20} color={DANGER} />
                : <Ionicons name="ellipse-outline" size={20} color={MUTED} />}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[b.taskTitle, task.status === 'done' && b.taskDone]} numberOfLines={1}>{task.title}</Text>
              {task.due_date && (
                <View style={b.taskMeta}>
                  <Ionicons name="time-outline" size={11} color={MUTED} />
                  <Text style={b.taskMetaText}>{task.due_date.slice(5).replace('-', '/')}</Text>
                </View>
              )}
            </View>
            <PriorityBadge priority={task.priority ?? 'medium'} />
            {task.photo_url && (
              <Image source={{ uri: task.photo_url }} style={b.thumb} contentFit="cover" />
            )}
            <Ionicons name="chevron-forward" size={16} color={MUTED} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        ))
      )}

      {filtered.length > 3 && (
        <TouchableOpacity
          style={b.viewAllBtn}
          onPress={() => router.push({
            pathname: '/(parent)/hire/placement_tasks',
            params: {
              application_id: String(placement.application_id),
              helper_name: encodeURIComponent(placement.helper_name),
            },
          } as never)}
          activeOpacity={0.8}
        >
          <Text style={b.viewAllText}>View all {filtered.length} tasks &gt;</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TaskBoardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ application_id?: string }>();
  const focusedAppId = params.application_id ? Number(params.application_id) : 0;

  const { isDesktop } = useResponsive();
  const { boards, loading, refresh } = useTaskBoard();
  const [filter, setFilter] = useState<FilterKey>('all');

  const onTaskPress = useCallback((task: ApplicationTask) => {
    const board = boards.find(b => b.tasks.some(t => t.id === task.id));
    if (!board) return;
    router.push({
      pathname: '/(parent)/hire/task_details',
      params: {
        task_id: String(task.id),
        application_id: String(board.placement.application_id),
        helper_id: String(board.placement.helper_id),
        helper_name: encodeURIComponent(board.placement.helper_name),
      },
    } as never);
  }, [boards, router]);

  const content = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={BROWN} />}
      contentContainerStyle={b.scroll}
    >
      {/* Filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={b.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[b.filterChip, filter === f.key && b.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[b.filterText, filter === f.key && b.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Info banner */}
      <View style={b.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={AMBER} />
        <Text style={b.infoBannerText}>Group tasks are shown by helper. Tap a helper to view full task list.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={BROWN} style={{ marginTop: 40 }} />
      ) : boards.length === 0 ? (
        <View style={b.empty}>
          <View style={b.emptyIcon}><Ionicons name="clipboard-outline" size={36} color={BROWN} /></View>
          <Text style={b.emptyTitle}>No active helpers</Text>
          <Text style={b.emptySub}>Hire a helper to start managing tasks here.</Text>
        </View>
      ) : (
        boards.map(d => (
          <HelperSection
            key={d.placement.application_id}
            data={d}
            filter={filter}
            focusedAppId={focusedAppId}
            onTaskPress={onTaskPress}
          />
        ))
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <View style={b.desktopRoot}>
        <Sidebar onLogout={() => {}} />
        <View style={b.desktopMain}>
          <View style={b.header}>
            <TouchableOpacity onPress={() => router.back()} style={b.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={BROWN} />
              <Text style={b.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={b.headerTitle}>Task Board</Text>
            <TouchableOpacity onPress={() => {}} style={b.iconBtn} activeOpacity={0.75}>
              <Ionicons name="search-outline" size={20} color={DARK} />
            </TouchableOpacity>
          </View>
          {content}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={b.root} edges={['top']}>
      <View style={b.header}>
        <TouchableOpacity onPress={() => router.back()} style={b.backBtn} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={BROWN} />
        </TouchableOpacity>
        <Text style={b.headerTitle}>Task Board</Text>
        <TouchableOpacity style={b.iconBtn} activeOpacity={0.75}>
          <Ionicons name="search-outline" size={20} color={DARK} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>{content}</View>
      <ParentWorkModeTabBar />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const b = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF8F2' },
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: '#FDF8F2' },
  desktopMain: { flex: 1, overflow: 'hidden' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
    backgroundColor: '#FFFDF9',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, flex: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 20 },

  filterRow: { gap: 8, paddingVertical: 4, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: DIVIDER,
  },
  filterChipActive: { backgroundColor: BROWN, borderColor: BROWN },
  filterText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },
  filterTextActive: { color: '#fff' },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: AMBER_BG, borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  infoBannerText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 },

  // Section
  section: { borderRadius: 20, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: DIVIDER },
  sectionHead: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: DIVIDER },

  avatar: { width: 52, height: 52, borderRadius: 14, flexShrink: 0 },
  avatarFb: { backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: BROWN },

  helperName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  helperRole: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 1 },
  checkinRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  checkinDot: { width: 8, height: 8, borderRadius: 4 },
  checkinText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

  ringNum: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK },
  ringLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 9, color: MUTED },

  // Task rows
  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  taskIconWrap: { width: 24, alignItems: 'center' },
  taskTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  taskDone: { color: MUTED, textDecorationLine: 'line-through' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  taskMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 6, flexShrink: 0 },
  priorityText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10 },
  thumb: { width: 36, height: 36, borderRadius: 8, marginLeft: 6, flexShrink: 0 },

  sectionEmpty: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  sectionEmptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },

  viewAllBtn: { padding: 14, alignItems: 'center' },
  viewAllText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, marginBottom: 6 },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
});
