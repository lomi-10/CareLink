// app/(parent)/hire/placement_tasks.tsx
// Tasks hub (no application_id) + single-helper task list (with application_id)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, SectionList,
  TouchableOpacity, StyleSheet, TextInput, Modal, KeyboardAvoidingView,
  Platform, Switch, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily } from '@/constants/GlobalStyles';
import API_URL from '@/constants/api';
import {
  BROWN, DARK, MUTED, DIVIDER, ICON_BG, GREEN, DANGER,
} from '@/components/parent/home/parentWarmTheme';
import { Sidebar, ParentWorkModeTabBar, MobileMenu } from '@/components/parent/home';
import { MobileHeader } from '@/components/helper/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useAuth, useResponsive, useNotifications, useNotice } from '@/hooks/shared';
import { useParentPortalMode } from '@/hooks/parent/useParentPortalMode';
import { useParentWorkDashboard, type PlacementDashData } from '@/hooks/parent/useParentWorkDashboard';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import {
  fetchApplicationTasks, createApplicationTask,
  type ApplicationTask,
} from '@/lib/applicationTasksApi';
import { resolveCategoryKey, CATEGORY_TO_SKILLS } from '@/components/tasks/QuickQuestionSheet';

// ─── Palette ──────────────────────────────────────────────────────────────────
const HERO_GR   = ['#F6D9AE', '#E2A968', '#C5853E'] as const;
const CARD_GR   = ['#FFFDF9', '#FEF5E0'] as const;
const NAVY      = '#1E2A4A';
const AMBER     = '#D97706';
const AMBER_BG  = '#FEF3C7';
const PURPLE    = '#7C3AED';
const PURPLE_BG = '#EDE9FE';

// ─── Category icon mapping ────────────────────────────────────────────────────
type DbCategory = { category_id: number; category_name: string };

function categoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  const n = name.toLowerCase();
  if (n.includes('clean') || n.includes('sweep') || n.includes('mop'))         return 'sparkles-outline';
  if (n.includes('laundry') || n.includes('wash') || n.includes('iron'))       return 'shirt-outline';
  if (n.includes('cook') || n.includes('food') || n.includes('meal') || n.includes('kitchen')) return 'restaurant-outline';
  if (n.includes('child') || n.includes('baby') || n.includes('yaya') || n.includes('infant')) return 'happy-outline';
  if (n.includes('nanny') || n.includes('tutor'))                               return 'school-outline';
  if (n.includes('care') || n.includes('elderly') || n.includes('senior'))     return 'heart-outline';
  if (n.includes('shop') || n.includes('grocery') || n.includes('market') || n.includes('errand')) return 'cart-outline';
  if (n.includes('driver') || n.includes('driving') || n.includes('chauffeur')) return 'car-outline';
  if (n.includes('garden') || n.includes('yard') || n.includes('ground') || n.includes('plant')) return 'leaf-outline';
  if (n.includes('pet') || n.includes('animal'))                                return 'paw-outline';
  if (n.includes('general') || n.includes('house'))                             return 'home-outline';
  return 'clipboard-outline';
}

// True if at least one active helper's job title/skills match this category's
// keyword group (same mapping the AI Task Assistant uses to auto-suggest a helper).
function categoryHasSkilledHelper(catName: string, perPlacement: PlacementDashData[]): boolean {
  const skills = CATEGORY_TO_SKILLS[resolveCategoryKey(catName)];
  if (!skills.length) return true;
  return perPlacement.some(d => {
    const text = [d.placement.job_title, ...(d.placement.helper_skills ?? []), ...(d.placement.helper_jobs ?? [])]
      .join(' ').toLowerCase();
    return skills.some(skill => text.includes(skill));
  });
}

// ─── Circular Progress ────────────────────────────────────────────────────────
function CircularProgress({ done, total, size = 72 }: { done: number; total: number; size?: number }) {
  const strokeW = 6;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(done / total, 1) : 0;
  const offset = circ * (1 - pct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cy} r={r} stroke="#F3E8D6" strokeWidth={strokeW} fill="none" />
        {total > 0 && (
          <Circle
            cx={cx} cy={cy} r={r}
            stroke={pct === 1 ? GREEN : BROWN}
            strokeWidth={strokeW}
            fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        )}
      </Svg>
      <Text style={t.progNum}>{done}/{total}</Text>
      <Text style={t.progLabel}>Done</Text>
    </View>
  );
}

// ─── Helper overview card ─────────────────────────────────────────────────────
function HelperTaskCard({
  name, photo, role, checkedIn, checkInAt,
  tasksDone, tasksTotal, onView,
}: {
  name: string; photo: string | null; role: string;
  checkedIn: boolean; checkInAt: string | null;
  tasksDone: number; tasksTotal: number;
  onView: () => void;
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const timeStr = checkInAt
    ? (() => { try { return new Date(checkInAt.replace(' ', 'T')).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return checkInAt; } })()
    : null;

  return (
    <LinearGradient colors={CARD_GR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={t.helperCard}>
      <View style={t.helperCardTop}>
        {/* Avatar */}
        {photo ? (
          <Image source={{ uri: photo }} style={t.helperAvatar} contentFit="cover" />
        ) : (
          <View style={t.helperAvatarFallback}>
            <Text style={t.helperInitials}>{initials}</Text>
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={t.helperName} numberOfLines={1}>{name}</Text>
          <Text style={t.helperRole} numberOfLines={1}>{role}</Text>
          <View style={t.helperStatusRow}>
            <View style={[t.helperDot, { backgroundColor: checkedIn ? GREEN : AMBER }]} />
            <Text style={t.helperStatusText}>
              {checkedIn ? `Checked In${timeStr ? ` ${timeStr}` : ''}` : 'Not Checked In'}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <CircularProgress done={tasksDone} total={tasksTotal} size={68} />
      </View>

      {/* View tasks link */}
      <TouchableOpacity style={t.viewTasksBtn} onPress={onView} activeOpacity={0.8}>
        <Ionicons name="clipboard-outline" size={14} color={BROWN} />
        <Text style={t.viewTasksBtnText}>View & Assign Tasks</Text>
        <Ionicons name="chevron-forward" size={14} color={BROWN} />
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS HUB  (no application_id)
// ─────────────────────────────────────────────────────────────────────────────
function TasksHub() {
  const { notify, noticeHost } = useNotice();
  const router = useRouter();
  const { perPlacement, stats, loading, refresh } = useParentWorkDashboard();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [categories, setCategories] = useState<DbCategory[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/shared/get_categories.php`)
      .then(r => r.json())
      .then(d => { if (d.categories) setCategories(d.categories as DbCategory[]); })
      .catch(() => {});
  }, []);

  const totalAssigned  = useMemo(() => perPlacement.reduce((s, d) => s + d.tasksTotal, 0), [perPlacement]);
  const totalCompleted = useMemo(() => perPlacement.reduce((s, d) => s + d.tasksDone, 0), [perPlacement]);
  const totalPending   = totalAssigned - totalCompleted;

  const handleGenerateTasks = () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    router.push({
      pathname: '/(parent)/hire/ai_tasks',
      params: { prompt: encodeURIComponent(prompt), select_all: '1' },
    } as never);
  };

  const handleCategory = (cat: DbCategory) => {
    if (perPlacement.length === 0) {
      notify('No active helpers', 'You need an active helper placement to assign tasks.');
      return;
    }
    router.push({
      pathname: '/(parent)/hire/ai_tasks',
      params: {
        prompt: encodeURIComponent(cat.category_name),
        category: encodeURIComponent(cat.category_name),
      },
    } as never);
  };

  const handleCategoryLongPress = (cat: DbCategory, dim: boolean) => {
    if (!dim) return;
    notify(
      cat.category_name,
      'None of your active helpers list a matching skill — tasks will default to your first active helper. You can reassign after generating.',
    );
  };

  // Relevant categories (matching a hired helper's job/skills) sort first;
  // the rest stay tappable but dimmed.
  const sortedCategories = useMemo(() => {
    if (perPlacement.length === 0) return categories.map(cat => ({ cat, dim: false }));
    return categories
      .map(cat => ({ cat, dim: !categoryHasSkilledHelper(cat.category_name, perPlacement) }))
      .sort((a, b) => Number(a.dim) - Number(b.dim));
  }, [categories, perPlacement]);

  const today = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <ScrollView
      contentContainerStyle={t.hubScroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={BROWN} />}
    >
      {/* ── Hero header ──────────────────────────────────────── */}
      <LinearGradient colors={HERO_GR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={t.hero}>
        <View style={t.heroTextCol}>
          <View style={t.heroEyebrowRow}>
            <Ionicons name="clipboard" size={12} color="rgba(59,42,24,0.65)" />
            <Text style={t.heroEyebrow}>TASK MANAGEMENT</Text>
          </View>
          <Text style={t.heroTitle}>Your{'\n'}Tasks</Text>
          <Text style={t.heroSub}>Organize, assign and track daily tasks for your household.</Text>
        </View>
        <Image
          source={require('@/assets/landing/family-role.png')}
          style={t.heroImg}
          contentFit="cover"
        />
      </LinearGradient>

      {/* ── TODAY'S SUMMARY ──────────────────────────────────── */}
      <View style={t.card}>
        <View style={t.cardHeaderRow}>
          <View style={t.cardHeaderLeft}>
            <View style={[t.sectionDot, { backgroundColor: AMBER_BG }]}>
              <Ionicons name="today" size={12} color={AMBER} />
            </View>
            <Text style={t.cardLabel}>TODAY'S SUMMARY</Text>
          </View>
          <Text style={t.cardDate}>{today}</Text>
        </View>

        {/* Stats row */}
        <View style={t.statsRow}>
          {[
            { value: totalAssigned,  label: 'Assigned',  color: DARK },
            { value: totalCompleted, label: 'Completed', color: GREEN },
            { value: totalPending,   label: 'Pending',   color: AMBER },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={t.statDiv} />}
              <View style={t.statTile}>
                <Text style={[t.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={t.statLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        <Text style={t.basedOnText}>
          Based on your {perPlacement.length} active helper{perPlacement.length !== 1 ? 's' : ''}
        </Text>

        {/* Active helpers row */}
        {perPlacement.length > 0 && (
          <View style={t.activeRow}>
            <Text style={t.activeCount}>{stats.checkedInToday}</Text>
            <Text style={t.activeLabel}> Helpers Active Today</Text>
            <View style={t.avatarStack}>
              {perPlacement.slice(0, 4).map((d, i) => (
                d.placement.helper_photo ? (
                  <Image
                    key={d.placement.application_id}
                    source={{ uri: d.placement.helper_photo }}
                    style={[t.stackAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}
                    contentFit="cover"
                  />
                ) : (
                  <View key={d.placement.application_id} style={[t.stackAvatarFallback, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                    <Text style={t.stackInitials}>{d.placement.helper_name[0]?.toUpperCase()}</Text>
                  </View>
                )
              ))}
            </View>
            <TouchableOpacity onPress={() => router.push('/(parent)/hire' as never)} style={{ marginLeft: 'auto' }}>
              <Text style={t.viewAllLink}>View all &gt;</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── AI TASK ASSISTANT ────────────────────────────────── */}
      <View style={t.card}>
        <View style={t.aiHeaderRow}>
          <View style={t.aiBadge}>
            <Ionicons name="sparkles" size={11} color="#7C3AED" />
            <Text style={t.aiLabel}>AI TASK ASSISTANT</Text>
          </View>
          <View style={t.betaBadge}><Text style={t.betaText}>BETA</Text></View>
        </View>
        <Text style={t.aiSubtitle}>Describe what you need and let AI create tasks for you.</Text>
        <View style={t.aiInputWrap}>
          <TextInput
            style={t.aiInput}
            placeholder="e.g. Prepare the house for a family gathering this weekend"
            placeholderTextColor={MUTED}
            value={aiPrompt}
            onChangeText={setAiPrompt}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          <View style={t.aiInputIcon}>
            <Ionicons name="sparkles-outline" size={16} color={PURPLE} />
          </View>
        </View>
        <TouchableOpacity
          style={[t.aiBtn, !aiPrompt.trim() && { opacity: 0.55 }]}
          onPress={handleGenerateTasks}
          disabled={!aiPrompt.trim() || aiLoading}
          activeOpacity={0.85}
        >
          {aiLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={t.aiBtnText}>Generate Tasks</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── QUICK TEMPLATE ───────────────────────────────────── */}
      <View style={t.sectionHeaderRow}>
        <Text style={t.sectionTitle}>QUICK TEMPLATE</Text>
      </View>
      <Text style={t.sectionSub}>Tap a category to jump-start your task list.</Text>
      {categories.length === 0 ? (
        <ActivityIndicator color={BROWN} style={{ marginVertical: 12, alignSelf: 'flex-start', marginLeft: 14 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={t.templateRow}>
          {sortedCategories.map(({ cat, dim }) => (
            <TouchableOpacity
              key={cat.category_id}
              style={[t.templateChip, dim && { opacity: 0.5 }]}
              onPress={() => handleCategory(cat)}
              onLongPress={() => handleCategoryLongPress(cat, dim)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={CARD_GR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={t.templateChipInner}>
                <View style={t.templateIconWrap}>
                  <Ionicons name={categoryIcon(cat.category_name)} size={22} color={BROWN} />
                </View>
                <Text style={t.templateLabel} numberOfLines={2}>{cat.category_name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── TASK OVERVIEW BY HELPER ──────────────────────────── */}
      <View style={t.sectionHeaderRow}>
        <Text style={t.sectionTitle}>TASK OVERVIEW BY HELPER</Text>
        <TouchableOpacity onPress={() => router.push('/(parent)/hire/task_board' as never)} activeOpacity={0.7}>
          <Text style={t.viewAllLink}>View board &gt;</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={BROWN} style={{ marginVertical: 32 }} />
      ) : perPlacement.length === 0 ? (
        <View style={t.emptyCard}>
          <View style={t.emptyIconWrap}>
            <Ionicons name="clipboard-outline" size={36} color={BROWN} />
          </View>
          <Text style={t.emptyTitle}>No active helpers yet</Text>
          <Text style={t.emptyText}>Hire a helper to start assigning tasks.</Text>
        </View>
      ) : (
        perPlacement.map((d) => (
          <HelperTaskCard
            key={d.placement.application_id}
            name={d.placement.helper_name}
            photo={d.placement.helper_photo ?? null}
            role={d.placement.job_title}
            checkedIn={d.checkedIn}
            checkInAt={d.checkInAt}
            tasksDone={d.tasksDone}
            tasksTotal={d.tasksTotal}
            onView={() => router.push({
              pathname: '/(parent)/hire/task_board',
              params: {
                application_id: String(d.placement.application_id),
              },
            } as never)}
          />
        ))
      )}

      <View style={{ height: 100 }} />
      {noticeHost}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE-HELPER TASK LIST  (with application_id)
// ─────────────────────────────────────────────────────────────────────────────
type Section = { title: string; data: ApplicationTask[] };

function parseRecurDays(s: string): string[] | null {
  const parts = s.split(',').map(x => x.trim()).filter(Boolean);
  return parts.length ? parts : null;
}

function SingleHelperTasks({ applicationId, helperName }: { applicationId: number; helperName: string }) {
  const { notify, noticeHost } = useNotice();
  const router = useRouter();
  const { userData } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;
  const { placements } = useParentActivePlacements();

  // Resolve helper_id from placements for task_details navigation
  const helperId = useMemo(() => {
    const p = placements.find(pl => Number(pl.application_id) === applicationId);
    return p ? Number(p.helper_id) : 0;
  }, [placements, applicationId]);

  const [tasks, setTasks]       = useState<ApplicationTask[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [titleIn, setTitleIn]   = useState('');
  const [descIn, setDescIn]     = useState('');
  const [dueIn, setDueIn]       = useState('');
  const [addReqPhoto, setAddReqPhoto]   = useState(false);
  const [addRecurring, setAddRecurring] = useState(false);
  const [recurDaysIn, setRecurDaysIn]   = useState('');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!applicationId || !parentId) return;
    setLoading(true);
    try {
      const res = await fetchApplicationTasks(applicationId, parentId, 'parent', 'all');
      if (res.success && res.data) setTasks(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [applicationId, parentId]);

  useEffect(() => { void load(); }, [load]);

  const sections = useMemo((): Section[] => {
    const open = tasks.filter(t => t.status === 'pending' || t.status === 'skipped');
    const done = tasks.filter(t => t.status === 'done');
    const out: Section[] = [];
    if (open.length) out.push({ title: 'Open', data: open });
    if (done.length) out.push({ title: 'Completed', data: done });
    return out;
  }, [tasks]);

  const submitAdd = async () => {
    const ttl = titleIn.trim();
    if (!ttl || !applicationId || !parentId) return;
    setSaving(true);
    try {
      const res = await createApplicationTask(applicationId, parentId, {
        title: ttl, description: descIn.trim() || undefined,
        due_date: dueIn.trim() || null, requires_photo: addReqPhoto,
        is_recurring: addRecurring, recur_days: parseRecurDays(recurDaysIn),
      });
      if (!res.success) { notify('Tasks', res.message || 'Could not create', 'error'); return; }
      setAddOpen(false);
      setTitleIn(''); setDescIn(''); setDueIn('');
      setAddReqPhoto(false); setAddRecurring(false); setRecurDaysIn('');
      await load();
    } finally { setSaving(false); }
  };

  const openDetails = (item: ApplicationTask) => {
    router.push({
      pathname: '/(parent)/hire/task_details',
      params: {
        task_id: String(item.id),
        application_id: String(applicationId),
        helper_id: String(helperId),
        helper_name: encodeURIComponent(helperName),
      },
    } as never);
  };

  const statsRow = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(x => x.status === 'done').length,
    pending: tasks.filter(x => x.status === 'pending').length,
  }), [tasks]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={{ flex: 1 }}>
      {/* Mini stats band */}
      <LinearGradient colors={HERO_GR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={t.miniHero}>
        <View style={t.miniHeroInfo}>
          <Text style={t.miniHeroName} numberOfLines={1}>{helperName}</Text>
          <Text style={t.miniHeroSub}>Task management</Text>
        </View>
        <View style={t.miniStatsBand}>
          {[
            { v: statsRow.total,   l: 'Total',   c: DARK },
            { v: statsRow.done,    l: 'Done',    c: GREEN },
            { v: statsRow.pending, l: 'Pending', c: AMBER },
          ].map((s, i) => (
            <React.Fragment key={s.l}>
              {i > 0 && <View style={t.miniStatDiv} />}
              <View style={t.miniStat}>
                <Text style={[t.miniStatVal, { color: s.c }]}>{s.v}</Text>
                <Text style={t.miniStatLbl}>{s.l}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        <TouchableOpacity style={t.addBtn} onPress={() => setAddOpen(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={t.addBtnText}>Add Task</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Hint banner */}
      <View style={t.hintBanner}>
        <Ionicons name="information-circle-outline" size={14} color={AMBER} />
        <Text style={t.hintText}>Tap a task to view details and proof uploaded by your helper.</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={i => String(i.id)}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={BROWN} />}
        contentContainerStyle={t.listPad}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator color={BROWN} style={{ marginTop: 40 }} />
            : <View style={t.emptyCard}><View style={t.emptyIconWrap}><Ionicons name="clipboard-outline" size={32} color={BROWN} /></View><Text style={t.emptyTitle}>No tasks yet</Text><Text style={t.emptyText}>Tap "+ Add Task" to assign work to {helperName}.</Text></View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={t.sectionHeaderBand}>
            <Text style={t.sectionBandText}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isDone = item.status === 'done';
          const isOverdue = !isDone && !!item.due_date && item.due_date < today;
          return (
            <TouchableOpacity
              style={[t.taskRow, isDone && t.taskRowDone]}
              onPress={() => openDetails(item)}
              activeOpacity={0.85}
            >
              {/* Status icon */}
              <View style={t.taskStatusIcon}>
                {isDone
                  ? <Ionicons name="checkmark-circle" size={20} color={GREEN} />
                  : isOverdue
                  ? <Ionicons name="alert-circle-outline" size={20} color={DANGER} />
                  : <Ionicons name="ellipse-outline" size={20} color={MUTED} />}
              </View>

              {/* Content */}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[t.taskTitle, isDone && t.taskTitleDone]} numberOfLines={2}>{item.title}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 5 }}>
                  {item.due_date && (
                    <View style={t.metaChip}>
                      <Ionicons name="calendar-outline" size={10} color={isOverdue ? DANGER : MUTED} />
                      <Text style={[t.metaChipText, isOverdue && { color: DANGER }]}>Due {item.due_date}</Text>
                    </View>
                  )}
                  {item.requires_photo && (
                    <View style={[t.metaChip, { backgroundColor: AMBER_BG }]}>
                      <Ionicons name="camera-outline" size={10} color={AMBER} />
                      <Text style={[t.metaChipText, { color: AMBER }]}>Photo required</Text>
                    </View>
                  )}
                  {item.photo_url && (
                    <View style={[t.metaChip, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="checkmark-circle-outline" size={10} color={GREEN} />
                      <Text style={[t.metaChipText, { color: GREEN }]}>Proof uploaded</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Chevron */}
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </TouchableOpacity>
          );
        }}
      />

      {/* Add task modal */}
      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={t.modalOverlay}>
          <ScrollView contentContainerStyle={t.modalScroll}>
            <View style={t.modalCard}>
              <View style={t.modalTitleRow}>
                <Ionicons name="add-circle" size={20} color={BROWN} />
                <Text style={t.modalTitle}>New Task</Text>
              </View>
              <TextInput style={t.input} placeholder="Task title *" value={titleIn} onChangeText={setTitleIn} placeholderTextColor={MUTED} />
              <TextInput style={[t.input, t.inputMulti]} placeholder="Description (optional)" value={descIn} onChangeText={setDescIn} multiline placeholderTextColor={MUTED} />
              <TextInput style={t.input} placeholder="Due date YYYY-MM-DD (optional)" value={dueIn} onChangeText={setDueIn} placeholderTextColor={MUTED} />
              <View style={t.switchRow}>
                <Text style={t.switchLabel}>Require photo proof</Text>
                <Switch value={addReqPhoto} onValueChange={setAddReqPhoto} trackColor={{ true: BROWN }} thumbColor="#fff" />
              </View>
              <View style={t.switchRow}>
                <Text style={t.switchLabel}>Recurring task</Text>
                <Switch value={addRecurring} onValueChange={setAddRecurring} trackColor={{ true: BROWN }} thumbColor="#fff" />
              </View>
              {addRecurring && (
                <TextInput style={t.input} placeholder="e.g. Monday, Wednesday, Friday" value={recurDaysIn} onChangeText={setRecurDaysIn} placeholderTextColor={MUTED} />
              )}
              <View style={t.modalActions}>
                <TouchableOpacity style={t.cancelBtn} onPress={() => setAddOpen(false)}>
                  <Text style={t.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[t.saveBtn, !titleIn.trim() && { opacity: 0.5 }]}
                  disabled={!titleIn.trim() || saving}
                  onPress={() => void submitAdd()}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={t.saveBtnText}>Save Task</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      {noticeHost}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PlacementTasksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ application_id?: string; helper_name?: string }>();
  const applicationId = params.application_id ? Number(params.application_id) : 0;
  const helperName = params.helper_name ? decodeURIComponent(params.helper_name) : 'Helper';

  const { isDesktop } = useResponsive();
  const isWorkMode = useParentPortalMode();
  const { handleLogout } = useAuth();
  const { unreadCount } = useNotifications('parent');

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const isHub = applicationId === 0;

  if (isDesktop) {
    return (
      <View style={t.desktopRoot}>
        <Sidebar onLogout={() => setConfirmLogout(true)} />
        <View style={t.desktopMain}>
          {!isHub && (
            <View style={t.desktopBar}>
              <TouchableOpacity onPress={() => router.back()} style={t.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={18} color={BROWN} />
                <Text style={t.backText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}
          {isHub ? <TasksHub /> : <SingleHelperTasks applicationId={applicationId} helperName={helperName} />}
        </View>
        <ConfirmationModal visible={confirmLogout} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }} onCancel={() => setConfirmLogout(false)} />
        <NotificationModal visible={successLogout} message="Logged Out Successfully!" type="success" autoClose duration={1500} onClose={() => { setSuccessLogout(false); handleLogout(); }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={t.mobileRoot} edges={['top']}>
      {isHub ? (
        <MobileHeader
          onMenuPress={() => setMenuOpen(true)}
          subtitle="Tasks"
          notificationCount={unreadCount}
          onNotificationPress={() => router.push('/(parent)/notifications')}
        />
      ) : (
        <View style={t.mobileBar}>
          <TouchableOpacity onPress={() => router.back()} style={t.backBtn} hitSlop={12} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={BROWN} />
          </TouchableOpacity>
          <Text style={t.mobileBarTitle} numberOfLines={1}>{helperName}</Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        {isHub ? <TasksHub /> : <SingleHelperTasks applicationId={applicationId} helperName={helperName} />}
      </View>

      {isWorkMode && <ParentWorkModeTabBar />}

      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        handleLogout={() => { setMenuOpen(false); setConfirmLogout(true); }}
        notificationUnread={unreadCount}
      />
      <ConfirmationModal visible={confirmLogout} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }} onCancel={() => setConfirmLogout(false)} />
      <NotificationModal visible={successLogout} message="Logged Out Successfully!" type="success" autoClose duration={1500} onClose={() => { setSuccessLogout(false); handleLogout(); }} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const t = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: '#FDF8F2' },
  desktopMain: { flex: 1, overflow: 'hidden' },
  desktopBar: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  mobileRoot: { flex: 1, backgroundColor: '#FDF8F2' },
  mobileBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  mobileBarTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, flex: 1, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },

  // ── Hub scroll ────────────────────────────────────────────
  hubScroll: { paddingBottom: 20 },

  // ── Hero ──────────────────────────────────────────────────
  hero: {
    flexDirection: 'row', alignItems: 'flex-end',
    marginHorizontal: 14, marginTop: 14, marginBottom: 12,
    borderRadius: 22, overflow: 'hidden',
  },
  heroTextCol: { flex: 1, padding: 20, paddingBottom: 18 },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  heroEyebrow: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 10,
    color: 'rgba(59,42,24,0.65)', letterSpacing: 1.2,
  },
  heroTitle: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 26,
    color: DARK, lineHeight: 32, marginBottom: 6,
  },
  heroSub: {
    fontFamily: FontFamily.fredokaRegular, fontSize: 13,
    color: 'rgba(59,42,24,0.72)', lineHeight: 19,
  },
  heroImg: { width: 120, height: 148, flexShrink: 0 },

  // ── Card ──────────────────────────────────────────────────
  card: {
    marginHorizontal: 14, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: DIVIDER,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionDot: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: DARK, letterSpacing: 0.8 },
  cardDate: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

  // ── Stats ─────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  statDiv: { width: 1, height: 40, backgroundColor: DIVIDER, marginHorizontal: 8 },
  statTile: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 28, letterSpacing: -0.5 },
  statLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 1 },
  basedOnText: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, textAlign: 'center', marginTop: -6, marginBottom: 10 },

  // ── Active helpers row ────────────────────────────────────
  activeRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: DIVIDER },
  activeCount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  activeLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  avatarStack: { flexDirection: 'row', marginLeft: 10 },
  stackAvatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#fff' },
  stackAvatarFallback: { width: 26, height: 26, borderRadius: 13, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  stackInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: BROWN },
  viewAllLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN },

  // ── AI Assistant ──────────────────────────────────────────
  aiHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PURPLE_BG, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  aiLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: PURPLE, letterSpacing: 0.5 },
  betaBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  betaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: AMBER, letterSpacing: 0.5 },
  aiSubtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 12 },
  aiInputWrap: { position: 'relative', marginBottom: 12 },
  aiInput: {
    backgroundColor: '#F9F5EE', borderWidth: 1, borderColor: DIVIDER,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, paddingRight: 40,
    fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK,
    minHeight: 56, textAlignVertical: 'top',
  },
  aiInputIcon: { position: 'absolute', right: 14, top: 14 },
  aiBtn: {
    backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  aiBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  // ── Section headers ───────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 14, marginTop: 4, marginBottom: 4,
  },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED, letterSpacing: 0.8 },
  sectionSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginHorizontal: 14, marginBottom: 10 },

  // ── Templates ─────────────────────────────────────────────
  templateRow: { paddingHorizontal: 14, paddingBottom: 8, gap: 10 },
  templateChip: { alignItems: 'center' },
  templateChipInner: { width: 70, alignItems: 'center', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: DIVIDER },
  templateIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  templateLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: DARK, textAlign: 'center' },

  // ── Helper task card ──────────────────────────────────────
  helperCard: {
    marginHorizontal: 14, marginBottom: 10,
    borderRadius: 18, padding: 14, borderWidth: 1, borderColor: DIVIDER,
  },
  helperCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  helperAvatar: { width: 52, height: 52, borderRadius: 14, flexShrink: 0 },
  helperAvatarFallback: { width: 52, height: 52, borderRadius: 14, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  helperInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: BROWN },
  helperName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  helperRole: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 2 },
  helperStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  helperDot: { width: 8, height: 8, borderRadius: 4 },
  helperStatusText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
  viewTasksBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: DIVIDER,
    paddingTop: 10, justifyContent: 'center',
  },
  viewTasksBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN, flex: 1, textAlign: 'center' },

  // ── Circular progress ─────────────────────────────────────
  progNum: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  progLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 9, color: MUTED },

  // ── Single-helper mini hero ───────────────────────────────
  miniHero: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: DIVIDER, gap: 10,
  },
  miniHeroInfo: { flex: 1, minWidth: 100 },
  miniHeroName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  miniHeroSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 2 },
  miniStatsBand: { flexDirection: 'row', alignItems: 'center' },
  miniStatDiv: { width: 1, height: 28, backgroundColor: DIVIDER, marginHorizontal: 10 },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18 },
  miniStatLbl: { fontFamily: FontFamily.fredokaRegular, fontSize: 9, color: MUTED },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BROWN, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
  },
  addBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#fff' },

  // ── Hint banner ───────────────────────────────────────────
  hintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: AMBER_BG, paddingHorizontal: 14, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  hintText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: AMBER, flex: 1, lineHeight: 17 },

  // ── Task list ─────────────────────────────────────────────
  listPad: { paddingHorizontal: 14, paddingBottom: 100 },
  taskStatusIcon: { paddingTop: 1, flexShrink: 0 },
  sectionHeaderBand: { marginTop: 10, marginBottom: 6 },
  sectionBandText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  taskRow: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 14,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  taskRowDone: { opacity: 0.55 },
  taskTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  taskTitleDone: { textDecorationLine: 'line-through', color: MUTED },
  taskDesc: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 18 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: ICON_BG, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  metaChipText: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },
  thumb: { width: 100, height: 100, borderRadius: 10, marginTop: 8 },
  swipeDel: {
    backgroundColor: DANGER, justifyContent: 'center', alignItems: 'center',
    width: 80, marginBottom: 8, borderTopRightRadius: 16, borderBottomRightRadius: 16,
  },
  swipeDelText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#fff', marginTop: 3 },

  // ── Empty ─────────────────────────────────────────────────
  emptyCard: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyIconWrap: { width: 68, height: 68, borderRadius: 18, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginBottom: 6 },
  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },

  // ── Modals ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    ...Platform.select({ web: { justifyContent: 'center', padding: 20 }, default: { justifyContent: 'flex-end' } }),
  },
  modalScroll: {
    width: '100%', alignItems: 'center',
    ...Platform.select({ web: { flexGrow: 1, justifyContent: 'center', minHeight: '100%' as const }, default: { flexGrow: 1, justifyContent: 'flex-end' } }),
  },
  modalCard: {
    width: '100%', maxWidth: 520, alignSelf: 'center',
    backgroundColor: '#fff', padding: 24, paddingBottom: 36,
    ...Platform.select({ web: { borderRadius: 20 }, default: { borderTopLeftRadius: 22, borderTopRightRadius: 22 } }),
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, elevation: 10,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  modalTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  input: {
    borderWidth: 1, borderColor: DIVIDER, borderRadius: 12, padding: 14,
    fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, marginBottom: 12,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingVertical: 2 },
  switchLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, flex: 1, marginRight: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  saveBtn: { backgroundColor: BROWN, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, minWidth: 110, alignItems: 'center' },
  saveBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

});
