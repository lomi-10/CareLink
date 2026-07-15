// app/(helper)/work/tasks.tsx
// PHP: v1/applications/tasks.php (list), v1/applications/task_complete.php (complete toggle)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, useResponsive, useNotice } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import { ORANGE, GREEN, MUTED, DANGER, INFO, ICON_BG, INFO_BG, SUCCESS_BG, DANGER_BG } from '@/components/helper/home/helperWarmTheme';
import { ymdLocal } from '@/lib/helperWorkApi';

const WARNING = '#D97706';
// Brighter variants for icons sitting on the dark hero gradient.
const AMBER_ON_DARK = '#FCD34D';
const GREEN_ON_DARK = '#4ADE80';
const RED_ON_DARK = '#F87171';

import {
  fetchApplicationTasks,
  completeApplicationTask,
  type ApplicationTask,
} from '@/lib/applicationTasksApi';
import { fetchAttendanceToday, type AttendanceToday } from '@/lib/attendanceApi';
import { uploadImageToCloudinary } from '@/lib/cloudinaryUpload';

import { createHelperWorkTasksStyles, type HelperWorkTasksStyles } from './work_tasks.styles';

type SectionKey = 'overdue' | 'today' | 'pending' | 'completed';
type Section = { key: SectionKey; title: string; data: ApplicationTask[] };
type Filter = 'all' | 'pending' | 'completed' | 'overdue';

const SECTION_META: Record<SectionKey, { icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; color: string }> = {
  overdue: { icon: 'alert-circle', bg: DANGER_BG, color: DANGER },
  today: { icon: 'today', bg: ICON_BG, color: ORANGE },
  pending: { icon: 'time', bg: ICON_BG, color: ORANGE },
  completed: { icon: 'checkmark-done', bg: SUCCESS_BG, color: GREEN },
};

const EMPTY_STATES: Record<Filter, { icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; color: string; title: string; text: string }> = {
  all: {
    icon: 'checkmark-done-circle-outline',
    bg: SUCCESS_BG,
    color: GREEN,
    title: "You're all caught up!",
    text: 'No tasks for today — enjoy your day.',
  },
  pending: {
    icon: 'happy-outline',
    bg: SUCCESS_BG,
    color: GREEN,
    title: 'Nothing pending',
    text: 'No pending tasks right now. Nice work!',
  },
  completed: {
    icon: 'time-outline',
    bg: ICON_BG,
    color: ORANGE,
    title: 'No completed tasks yet',
    text: 'Tasks you finish today will show up here.',
  },
  overdue: {
    icon: 'shield-checkmark-outline',
    bg: SUCCESS_BG,
    color: GREEN,
    title: "You're on track",
    text: 'Nothing overdue — great job staying on top of things!',
  },
};

function getTaskIcon(title: string): React.ComponentProps<typeof Ionicons>['name'] {
  const t = title.toLowerCase();
  if (/cook|meal|breakfast|lunch|dinner|food/.test(t)) return 'restaurant-outline';
  if (/laundry|wash|iron|fold|cloth/.test(t)) return 'shirt-outline';
  if (/clean|sweep|mop|dust|vacuum|tidy/.test(t)) return 'sparkles-outline';
  if (/groc|shop|market|buy|errand/.test(t)) return 'cart-outline';
  if (/water|plant|garden/.test(t)) return 'leaf-outline';
  if (/pet|dog|cat|feed/.test(t)) return 'paw-outline';
  if (/child|kid|baby|school|homework|pick.?up/.test(t)) return 'happy-outline';
  if (/trash|garbage|dispose/.test(t)) return 'trash-outline';
  if (/car|vehicle|garage/.test(t)) return 'car-outline';
  return 'clipboard-outline';
}

function daysBetween(earlier: string, later: string): number {
  const [ay, am, ad] = earlier.split('-').map(Number);
  const [by, bm, bd] = later.split('-').map(Number);
  const a = new Date(ay, am - 1, ad).getTime();
  const b = new Date(by, bm - 1, bd).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

function dueLabel(task: ApplicationTask, todayStr: string): string {
  if (!task.due_date) return 'No due date';
  if (task.due_date === todayStr) return 'Due today';
  if (task.due_date < todayStr) {
    const days = daysBetween(task.due_date, todayStr);
    return days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`;
  }
  return `Due ${task.due_date}`;
}

function formatLongDate(ymd: string | null | undefined): string | null {
  if (!ymd) return null;
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return ymd;
  }
}

function formatCompletedTime(iso: string | null): string {
  if (!iso) return 'Completed';
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return 'Completed';
  return `Completed ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function HeroStat({ styles, icon, color, value, label }: {
  styles: HelperWorkTasksStyles;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.heroStatTile}>
      <View style={styles.heroStatIconWrap}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

export default function WorkTasksScreen() {
  const router = useRouter();
  const { notify, noticeHost } = useNotice();
  const styles = useMemo(() => createHelperWorkTasksStyles(), []);
  const { isDesktop } = useResponsive();
  const { userData, loading: authLoading } = useAuth();
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();

  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [todayAtt, setTodayAtt] = useState<AttendanceToday | null>(null);
  const [confirmTask, setConfirmTask] = useState<ApplicationTask | null>(null);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [showProofInfo, setShowProofInfo] = useState(false);

  const helperId = userData ? Number(userData.user_id) : 0;
  const todayStr = ymdLocal();

  useEffect(() => {
    if (!ready || authLoading) return;
    if (!isWorkMode || !activeHire) {
      router.replace('/(helper)/home');
    }
  }, [ready, isWorkMode, activeHire, authLoading, router]);

  const loadAttendance = useCallback(async () => {
    if (!activeHire || !helperId) return;
    const res = await fetchAttendanceToday(activeHire.application_id, helperId);
    if (res.success && res.data) setTodayAtt(res.data);
  }, [activeHire, helperId]);

  const load = useCallback(async () => {
    if (!activeHire || !helperId) return;
    setLoading(true);
    try {
      const [taskRes] = await Promise.all([
        fetchApplicationTasks(activeHire.application_id, helperId, 'helper', 'today'),
        loadAttendance(),
      ]);
      if (taskRes.success && taskRes.data) setTasks(taskRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [helperId, activeHire, loadAttendance]);

  useEffect(() => {
    if (isWorkMode && activeHire && helperId) void load();
  }, [isWorkMode, activeHire, helperId, load]);

  const { overdueTasks, todayTasks, completedTasks } = useMemo(() => {
    const overdue: ApplicationTask[] = [];
    const today: ApplicationTask[] = [];
    const completed: ApplicationTask[] = [];
    for (const t of tasks) {
      if (t.status === 'done') {
        completed.push(t);
      } else if (t.due_date && t.due_date < todayStr) {
        overdue.push(t);
      } else {
        today.push(t);
      }
    }
    return { overdueTasks: overdue, todayTasks: today, completedTasks: completed };
  }, [tasks, todayStr]);

  const counts = {
    total: tasks.length,
    pending: overdueTasks.length + todayTasks.length,
    completed: completedTasks.length,
    overdue: overdueTasks.length,
  };

  const sections = useMemo((): Section[] => {
    const out: Section[] = [];
    if (filter === 'all') {
      if (overdueTasks.length) out.push({ key: 'overdue', title: 'Needs Attention', data: overdueTasks });
      if (todayTasks.length) out.push({ key: 'today', title: "Today's Tasks", data: todayTasks });
      if (completedTasks.length) out.push({ key: 'completed', title: 'Completed Today', data: completedTasks });
    } else if (filter === 'pending') {
      const data = [...overdueTasks, ...todayTasks];
      if (data.length) out.push({ key: 'pending', title: 'Pending Tasks', data });
    } else if (filter === 'completed') {
      if (completedTasks.length) out.push({ key: 'completed', title: 'Completed Today', data: completedTasks });
    } else if (filter === 'overdue') {
      if (overdueTasks.length) out.push({ key: 'overdue', title: 'Overdue Tasks', data: overdueTasks });
    }
    return out;
  }, [filter, overdueTasks, todayTasks, completedTasks]);

  const hasProofRequiredTasks = tasks.some((t) => t.requires_photo && t.status !== 'done');

  const mustCheckIn =
    todayAtt && !todayAtt.is_rest_day && !todayAtt.checked_in;

  const pickImage = async (mode: 'camera' | 'library') => {
    const perm =
      mode === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Permission needed', 'Allow photo access to attach a picture.');
      return;
    }
    const result =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, mediaTypes: 'images' });
    if (!result.canceled && result.assets[0]?.uri) {
      setPickedUri(result.assets[0].uri);
    }
  };

  const runComplete = async (t: ApplicationTask, photoUrl: string | null) => {
    if (t.status !== 'pending' || !helperId) return;
    setBusyId(t.id);
    try {
      const res = await completeApplicationTask(t.id, helperId, photoUrl);
      if (!res.success) {
        notify('Tasks', res.message || 'Could not update', 'error');
        return;
      }
      setConfirmTask(null);
      setPickedUri(null);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const submitComplete = async () => {
    if (!confirmTask || !helperId) return;
    if (mustCheckIn) {
      notify(
        'Check in first',
        'Your employer requires you to check in for today before you can mark tasks done (except on rest days).',
      );
      return;
    }
    let url: string | null = null;
    if (pickedUri) {
      setUploadingPhoto(true);
      try {
        url = await uploadImageToCloudinary(pickedUri);
        if (!url) {
          notify(
            'Upload failed',
            'Could not upload the photo. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET, or try again.',
          );
          return;
        }
      } finally {
        setUploadingPhoto(false);
      }
    }
    if (confirmTask.requires_photo && !url) {
      notify('Photo required', 'This task requires a completion photo.', 'error');
      return;
    }
    await runComplete(confirmTask, url);
  };

  const onMarkComplete = (item: ApplicationTask) => {
    if (item.status !== 'pending') return;
    setPickedUri(null);
    setConfirmTask(item);
  };

  if (!ready || authLoading || !isWorkMode || !activeHire) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const beforeStart = !!activeHire.employment_start_date && todayStr < activeHire.employment_start_date;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All Tasks' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'overdue', label: 'Overdue' },
  ];

  const emptyState = EMPTY_STATES[filter];

  const listHeader = (
    <View style={styles.header}>
      <LinearGradient
        colors={['#6B2E0A', '#3B1508', '#1E0A04']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {!isDesktop ? (
          <>
            <Text style={styles.heroTitle}>My Tasks</Text>
            <Text style={styles.heroSubtitle}>Stay organized and complete your tasks on time</Text>
          </>
        ) : null}
        <View style={styles.heroStatsRow}>
          <HeroStat styles={styles} icon="clipboard-outline" color={ORANGE} value={counts.total} label="Total" />
          <HeroStat styles={styles} icon="time-outline" color={AMBER_ON_DARK} value={counts.pending} label="Pending" />
          <HeroStat styles={styles} icon="checkmark-circle-outline" color={GREEN_ON_DARK} value={counts.completed} label="Completed" />
          <HeroStat styles={styles} icon="alert-circle-outline" color={RED_ON_DARK} value={counts.overdue} label="Overdue" />
        </View>
      </LinearGradient>

      {beforeStart ? (
        <View style={styles.previewBanner}>
          <View style={styles.previewBannerIconWrap}>
            <Ionicons name="eye-outline" size={20} color={INFO} />
          </View>
          <Text style={styles.previewBannerText}>
            Preview — your work starts on {formatLongDate(activeHire.employment_start_date)}.
          </Text>
        </View>
      ) : mustCheckIn ? (
        <View style={styles.checkInBanner}>
          <View style={styles.checkInBannerIconWrap}>
            <Ionicons name="alert-circle" size={20} color={DANGER} />
          </View>
          <Text style={styles.checkInBannerText}>
            Check in for today before you can mark tasks as complete.
          </Text>
          <TouchableOpacity style={styles.checkInBannerCta} onPress={() => router.push('/(helper)/home')} activeOpacity={0.85}>
            <Text style={styles.checkInBannerCtaText}>Check In</Text>
          </TouchableOpacity>
        </View>
      ) : todayAtt?.is_rest_day ? (
        <View style={styles.restDayBanner}>
          <View style={styles.restDayBannerIconWrap}>
            <Ionicons name="bed" size={20} color={GREEN} />
          </View>
          <Text style={styles.restDayBannerText}>
            Today is a rest day — task completion isn't required, but you can still check things off.
          </Text>
        </View>
      ) : null}

      <View style={styles.filterSegment}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === 'all' ? counts.total : counts[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{f.label}</Text>
              <Text style={[styles.filterPillCount, active && styles.filterPillCountActive]}>{count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {hasProofRequiredTasks ? (
        <>
          <TouchableOpacity style={styles.proofBanner} onPress={() => setShowProofInfo((v) => !v)} activeOpacity={0.85}>
            <View style={styles.proofBannerIconWrap}>
              <Ionicons name="camera-outline" size={18} color={ORANGE} />
            </View>
            <Text style={styles.proofBannerText}>Some tasks require a photo as proof of completion.</Text>
            <Text style={styles.proofBannerLink}>{showProofInfo ? 'Hide' : 'Learn more'}</Text>
          </TouchableOpacity>
          {showProofInfo ? (
            <View style={styles.proofInfoBox}>
              <Text style={styles.proofInfoText}>
                After finishing a task marked "Photo required," take a clear photo and attach it when you mark the
                task complete. Your employer can view this photo from their dashboard as confirmation the work was
                done.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const confirmModal = (
    <Modal visible={!!confirmTask} transparent animationType="fade" onRequestClose={() => setConfirmTask(null)}>
      <View style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalCenter} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mark task complete?</Text>
            {confirmTask ? (
              <>
                <Text style={styles.modalTaskTitle}>{confirmTask.title}</Text>
                {confirmTask.requires_photo ? (
                  <View style={styles.reqPill}>
                    <Ionicons name="camera-outline" size={16} color={WARNING} />
                    <Text style={styles.reqPillText}>Photo required</Text>
                  </View>
                ) : (
                  <Text style={styles.modalHint}>Photo optional — add one if helpful for your employer.</Text>
                )}
                <View style={styles.photoRow}>
                  <TouchableOpacity style={styles.photoBtn} onPress={() => void pickImage('camera')}>
                    <Ionicons name="camera" size={20} color={ORANGE} />
                    <Text style={styles.photoBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={() => void pickImage('library')}>
                    <Ionicons name="images-outline" size={20} color={ORANGE} />
                    <Text style={styles.photoBtnText}>Library</Text>
                  </TouchableOpacity>
                </View>
                {pickedUri ? (
                  <Text style={styles.pickedLabel}>Photo selected — ready to upload when you confirm.</Text>
                ) : null}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmTask(null)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSave, (uploadingPhoto || busyId === confirmTask.id) && { opacity: 0.6 }]}
                    disabled={uploadingPhoto || busyId === confirmTask.id}
                    onPress={() => void submitComplete()}
                  >
                    {uploadingPhoto || busyId === confirmTask.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalSaveText}>Complete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <WorkModeShell desktopTitle="My Tasks" desktopSubtitle="Stay organized and complete your tasks on time">
      <View style={{ flex: 1 }}>
        <SectionList
          sections={sections}
          keyExtractor={(i) => String(i.id)}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.listContent,
            !isDesktop && { paddingBottom: 24 },
            sections.length === 0 && !loading ? { flexGrow: 1 } : null,
          ]}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconWrap, { backgroundColor: emptyState.bg }]}>
                  <Ionicons name={emptyState.icon} size={28} color={emptyState.color} />
                </View>
                <Text style={styles.emptyTitle}>{emptyState.title}</Text>
                <Text style={styles.emptyText}>{emptyState.text}</Text>
              </View>
            )
          }
          renderSectionHeader={({ section }) => {
            const meta = SECTION_META[section.key];
            return (
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <Text style={[styles.sectionTitle, section.key === 'overdue' && styles.sectionTitleDanger]}>
                  {section.title}
                </Text>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
              </View>
            );
          }}
          renderItem={({ item, section }) => {
            const isDone = item.status === 'done';
            const isOverdue = section.key === 'overdue';
            const isPending = item.status === 'pending';
            const disabled = !isPending || !!mustCheckIn;
            return (
              <View style={[styles.taskCard, isOverdue && styles.taskCardOverdue, isDone && styles.taskCardDone]}>
                <View style={[styles.taskIconWrap, isOverdue && styles.taskIconWrapDanger, isDone && styles.taskIconWrapDone]}>
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : getTaskIcon(item.title)}
                    size={22}
                    color={isDone ? GREEN : isOverdue ? DANGER : ORANGE}
                  />
                </View>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
                  ) : null}
                  <View style={styles.taskMetaRow}>
                    {isDone ? (
                      <View style={[styles.duePill, styles.duePillDone]}>
                        <Ionicons name="checkmark-circle" size={12} color={GREEN} />
                        <Text style={[styles.duePillText, styles.duePillTextDone]}>{formatCompletedTime(item.completed_at)}</Text>
                      </View>
                    ) : (
                      <View style={[styles.duePill, isOverdue && styles.duePillOverdue]}>
                        <Ionicons name={isOverdue ? 'alert-circle' : 'calendar-outline'} size={12} color={isOverdue ? DANGER : ORANGE} />
                        <Text style={[styles.duePillText, isOverdue && styles.duePillTextOverdue]}>{dueLabel(item, todayStr)}</Text>
                      </View>
                    )}
                    {item.requires_photo ? (
                      <View style={styles.taskBadge}>
                        <Ionicons name="camera-outline" size={12} color={WARNING} />
                        <Text style={styles.taskBadgeText}>Photo required</Text>
                      </View>
                    ) : null}
                    {item.is_recurring ? (
                      <View style={[styles.taskBadge, styles.taskBadgeRecur]}>
                        <Ionicons name="repeat-outline" size={12} color={INFO} />
                        <Text style={[styles.taskBadgeText, styles.taskBadgeRecurText]}>Recurring</Text>
                      </View>
                    ) : null}
                  </View>
                  {isDone && item.photo_url ? (
                    <Text style={styles.photoLink}>Photo on file</Text>
                  ) : null}
                </View>
                {!isDone ? (
                  busyId === item.id ? (
                    <ActivityIndicator color={ORANGE} />
                  ) : (
                    <TouchableOpacity
                      style={[styles.markCompleteBtn, disabled && styles.markCompleteBtnDisabled]}
                      disabled={disabled}
                      onPress={() => onMarkComplete(item)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="checkmark" size={14} color={disabled ? MUTED : '#fff'} />
                      <Text style={[styles.markCompleteBtnText, disabled && styles.markCompleteBtnTextDisabled]}>
                        Complete
                      </Text>
                    </TouchableOpacity>
                  )
                ) : (
                  <View style={styles.doneCheckWrap}>
                    <Ionicons name="checkmark-circle" size={24} color={GREEN} />
                  </View>
                )}
              </View>
            );
          }}
        />
      </View>
      {confirmModal}
      {noticeHost}
    </WorkModeShell>
  );
}
