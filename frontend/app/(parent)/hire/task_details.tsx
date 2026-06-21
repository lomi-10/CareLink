// app/(parent)/hire/task_details.tsx
// Task detail view for parents: priority, meta, photo proof, edit + mark complete.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FontFamily } from '@/constants/GlobalStyles';
import { BROWN, DARK, MUTED, DIVIDER, ICON_BG, GREEN, DANGER, SUBTLE } from '@/components/parent/home/parentWarmTheme';
import { Sidebar, ParentWorkModeTabBar } from '@/components/parent/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useAuth, useResponsive } from '@/hooks/shared';
import {
  fetchApplicationTasks, updateApplicationTask,
  deleteApplicationTask, completeApplicationTask,
  type ApplicationTask, type TaskPriority,
} from '@/lib/applicationTasksApi';

// ─── Palette ──────────────────────────────────────────────────────────────────
const AMBER    = '#D97706';
const AMBER_BG = '#FEF3C7';

const PRIORITY_C: Record<TaskPriority, { bg: string; text: string; label: string }> = {
  low:    { bg: '#DCFCE7', text: '#15803D', label: 'Low Priority' },
  medium: { bg: AMBER_BG,  text: AMBER,     label: 'Medium Priority' },
  high:   { bg: '#FEE2E2', text: DANGER,    label: 'High Priority' },
};

function PriorityPill({ priority }: { priority: TaskPriority }) {
  const c = PRIORITY_C[priority] ?? PRIORITY_C.medium;
  return (
    <View style={[d.priorityPill, { backgroundColor: c.bg }]}>
      <View style={[d.priorityDot, { backgroundColor: c.text }]} />
      <Text style={[d.priorityPillText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

function MetaRow({ icon, children }: { icon: React.ComponentProps<typeof Ionicons>['name']; children: React.ReactNode }) {
  return (
    <View style={d.metaRow}>
      <View style={d.metaIconWrap}><Ionicons name={icon} size={16} color={BROWN} /></View>
      {children}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TaskDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    task_id: string;
    application_id: string;
    helper_id: string;
    helper_name: string;
  }>();
  const taskId        = Number(params.task_id);
  const applicationId = Number(params.application_id);
  const helperId      = Number(params.helper_id);
  const helperName    = params.helper_name ? decodeURIComponent(params.helper_name) : 'Helper';

  const { userData } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;
  const { isDesktop } = useResponsive();

  const [task, setTask]           = useState<ApplicationTask | null>(null);
  const [loading, setLoading]     = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  // Edit modal
  const [editOpen, setEditOpen]         = useState(false);
  const [editTitle, setEditTitle]       = useState('');
  const [editDesc, setEditDesc]         = useState('');
  const [editDue, setEditDue]           = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editSaving, setEditSaving]     = useState(false);

  // Confirm / success modals
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState(false);
  const [successMsg, setSuccessMsg]           = useState('');

  const loadTask = useCallback(async () => {
    if (!taskId || !applicationId || !parentId) return;
    setLoading(true);
    try {
      const res = await fetchApplicationTasks(applicationId, parentId, 'parent', 'all');
      const found = res.data?.find(t => t.id === taskId) ?? null;
      setTask(found);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [taskId, applicationId, parentId]);

  useEffect(() => { void loadTask(); }, [loadTask]);

  const openEdit = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDesc(task.description ?? '');
    setEditDue(task.due_date ?? '');
    setEditPriority(task.priority ?? 'medium');
    setMenuOpen(false);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!task || !editTitle.trim() || !parentId) return;
    setEditSaving(true);
    try {
      const res = await updateApplicationTask(task.id, parentId, {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        due_date: editDue.trim() || null,
        priority: editPriority,
      });
      if (!res.success) { Alert.alert('Tasks', res.message || 'Could not save'); return; }
      setEditOpen(false);
      await loadTask();
    } finally { setEditSaving(false); }
  };

  const handleComplete = async () => {
    if (!task || !parentId) return;
    setCheckLoading(true);
    try {
      const res = await completeApplicationTask(task.id, helperId);
      if (!res.success && res.code !== 'already_done') {
        Alert.alert('Tasks', res.message || 'Could not complete task');
        return;
      }
      setSuccessMsg('Task marked as completed!');
      await loadTask();
    } finally { setCheckLoading(false); }
  };

  const handleDelete = async () => {
    if (!task || !parentId) return;
    const res = await deleteApplicationTask(task.id, parentId);
    if (!res.success) { Alert.alert('Tasks', res.message || 'Could not delete'); return; }
    setSuccessMsg('Task deleted.');
  };

  const formatDate = (ymd: string | null) => {
    if (!ymd) return null;
    try {
      const dt = new Date(ymd.replace(/-/g, '/'));
      return dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return ymd; }
  };

  if (loading) {
    return (
      <SafeAreaView style={d.root} edges={['top']}>
        <ActivityIndicator color={BROWN} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={d.root} edges={['top']}>
        <View style={d.header}>
          <TouchableOpacity onPress={() => router.back()} style={d.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={BROWN} />
          </TouchableOpacity>
          <Text style={d.headerTitle}>Task Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={d.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
          <Text style={d.notFoundText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isDone = task.status === 'done';

  const body = (
    <ScrollView contentContainerStyle={d.scroll} showsVerticalScrollIndicator={false}>
      {/* Priority + Title */}
      <PriorityPill priority={task.priority ?? 'medium'} />
      <Text style={d.taskTitle}>{task.title}</Text>

      {/* Meta */}
      <View style={d.metaCard}>
        <MetaRow icon="person-outline">
          <Text style={d.metaText}>Assigned to <Text style={d.metaBold}>{helperName}</Text></Text>
        </MetaRow>
        {task.due_date && (
          <MetaRow icon="calendar-outline">
            <Text style={d.metaText}>{formatDate(task.due_date)}</Text>
          </MetaRow>
        )}
        {task.description && (
          <MetaRow icon="document-text-outline">
            <Text style={d.metaText}>{task.description}</Text>
          </MetaRow>
        )}
        <MetaRow icon="flag-outline">
          <Text style={d.metaText}>
            Status: <Text style={[d.metaBold, { color: isDone ? GREEN : AMBER }]}>
              {isDone ? 'Completed' : 'Pending'}
            </Text>
          </Text>
        </MetaRow>
      </View>

      {/* Photo Proof */}
      <View style={d.sectionWrap}>
        <View style={d.sectionHeadRow}>
          <Ionicons name="camera" size={16} color={BROWN} />
          <Text style={d.sectionTitle}>Photo Proof</Text>
          {task.photo_url && (
            <View style={d.proofBadge}>
              <Ionicons name="checkmark-circle" size={12} color={GREEN} />
              <Text style={d.proofBadgeText}>Uploaded</Text>
            </View>
          )}
        </View>
        {task.photo_url ? (
          <Image source={{ uri: task.photo_url }} style={d.proofImg} contentFit="cover" />
        ) : (
          <View style={d.proofEmpty}>
            <View style={d.proofEmptyIcon}>
              <Ionicons name="camera-outline" size={32} color={MUTED} />
            </View>
            <Text style={d.proofEmptyTitle}>Waiting for photo proof</Text>
            <Text style={d.proofEmptyText}>
              {isDone
                ? 'This task was completed without a photo.'
                : 'Your helper will upload a photo when the task is done.'}
            </Text>
          </View>
        )}
      </View>

      {/* Timestamps */}
      {task.completed_at && (
        <Text style={d.timestamp}>Completed: {formatDate(task.completed_at.split(' ')[0])}</Text>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const actions = !isDone ? (
    <View style={d.actionBar}>
      <TouchableOpacity style={d.editBtn} onPress={openEdit} activeOpacity={0.85}>
        <Ionicons name="create-outline" size={16} color={BROWN} />
        <Text style={d.editBtnText}>Edit Task</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={d.completeBtn}
        onPress={() => setConfirmComplete(true)}
        disabled={checkLoading}
        activeOpacity={0.88}
      >
        {checkLoading
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={d.completeBtnText}>Mark as Completed</Text>
            </>}
      </TouchableOpacity>
    </View>
  ) : (
    <View style={d.actionBar}>
      <View style={d.completedBadge}>
        <Ionicons name="checkmark-circle" size={16} color={GREEN} />
        <Text style={d.completedBadgeText}>Completed</Text>
      </View>
    </View>
  );

  const header = (
    <View style={d.header}>
      <TouchableOpacity onPress={() => router.back()} style={d.backBtn} hitSlop={10} activeOpacity={0.7}>
        {isDesktop
          ? <><Ionicons name="arrow-back" size={18} color={BROWN} /><Text style={d.backText}>Back</Text></>
          : <Ionicons name="chevron-back" size={22} color={BROWN} />}
      </TouchableOpacity>
      <Text style={d.headerTitle} numberOfLines={1}>Task Details</Text>
      <TouchableOpacity onPress={() => setMenuOpen(true)} style={d.iconBtn} hitSlop={8} activeOpacity={0.75}>
        <Ionicons name="ellipsis-horizontal" size={20} color={DARK} />
      </TouchableOpacity>
    </View>
  );

  function renderModals() {
    return (
      <>
        {/* 3-dot menu */}
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <TouchableOpacity style={d.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
            <View style={d.menuCard}>
              <TouchableOpacity style={d.menuItem} onPress={openEdit}>
                <Ionicons name="create-outline" size={18} color={DARK} />
                <Text style={d.menuItemText}>Edit Task</Text>
              </TouchableOpacity>
              <View style={d.menuDivider} />
              <TouchableOpacity style={d.menuItem} onPress={() => { setMenuOpen(false); setConfirmDelete(true); }}>
                <Ionicons name="trash-outline" size={18} color={DANGER} />
                <Text style={[d.menuItemText, { color: DANGER }]}>Delete Task</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Edit modal */}
        <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={d.editOverlay}>
            <ScrollView contentContainerStyle={d.editScroll}>
              <View style={d.editCard}>
                <View style={d.editHeader}>
                  <Text style={d.editTitle}>Edit Task</Text>
                  <TouchableOpacity onPress={() => setEditOpen(false)}>
                    <Ionicons name="close" size={22} color={MUTED} />
                  </TouchableOpacity>
                </View>
                <TextInput style={d.input} value={editTitle} onChangeText={setEditTitle} placeholder="Task title *" placeholderTextColor={MUTED} />
                <TextInput style={[d.input, d.inputMulti]} value={editDesc} onChangeText={setEditDesc} placeholder="Description (optional)" multiline placeholderTextColor={MUTED} />
                <TextInput style={d.input} value={editDue} onChangeText={setEditDue} placeholder="Due date YYYY-MM-DD" placeholderTextColor={MUTED} />
                <Text style={d.inputLabel}>Priority</Text>
                <View style={d.priorityRow}>
                  {(['low', 'medium', 'high'] as TaskPriority[]).map(p => {
                    const c = PRIORITY_C[p];
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[d.priorityOption, { backgroundColor: c.bg, borderColor: editPriority === p ? c.text : 'transparent', borderWidth: 2 }]}
                        onPress={() => setEditPriority(p)}
                        activeOpacity={0.8}
                      >
                        <Text style={[d.priorityOptionText, { color: c.text }]}>{c.label.replace(' Priority', '')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={d.editActions}>
                  <TouchableOpacity style={d.cancelBtn} onPress={() => setEditOpen(false)}>
                    <Text style={d.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[d.saveBtn, !editTitle.trim() && { opacity: 0.5 }]}
                    disabled={!editTitle.trim() || editSaving}
                    onPress={() => void submitEdit()}
                  >
                    {editSaving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={d.saveBtnText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <ConfirmationModal
          visible={confirmComplete}
          title="Mark as Completed"
          message="Mark this task as done? The helper will be notified."
          confirmText="Mark Completed" cancelText="Cancel"
          onConfirm={() => { setConfirmComplete(false); void handleComplete(); }}
          onCancel={() => setConfirmComplete(false)}
        />
        <ConfirmationModal
          visible={confirmDelete}
          title="Delete Task"
          message={`Delete "${task?.title}"? This cannot be undone.`}
          confirmText="Delete" cancelText="Cancel" type="danger"
          onConfirm={() => { setConfirmDelete(false); void handleDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
        <NotificationModal
          visible={!!successMsg}
          message={successMsg}
          type="success"
          autoClose
          duration={1600}
          onClose={() => {
            setSuccessMsg('');
            if (successMsg.includes('deleted')) router.back();
          }}
        />
      </>
    );
  }

  if (isDesktop) {
    return (
      <View style={d.desktopRoot}>
        <Sidebar onLogout={() => {}} />
        <View style={d.desktopMain}>
          {header}
          <View style={{ flex: 1, maxWidth: 640, alignSelf: 'center', width: '100%' }}>
            {body}
            {actions}
          </View>
        </View>
        {renderModals()}
      </View>
    );
  }

  return (
    <SafeAreaView style={d.root} edges={['top']}>
      {header}
      <View style={{ flex: 1 }}>{body}</View>
      {actions}
      <ParentWorkModeTabBar />
      {renderModals()}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const d = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF8F2' },
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: '#FDF8F2' },
  desktopMain: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: DIVIDER, backgroundColor: '#FFFDF9',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, flex: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 16, paddingBottom: 20 },

  priorityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },

  taskTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: DARK, lineHeight: 30, marginBottom: 16 },

  metaCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: DIVIDER, marginBottom: 16, gap: 10,
  },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metaIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, flex: 1, lineHeight: 20, marginTop: 4 },
  metaBold: { fontFamily: FontFamily.fredokaSemiBold, color: DARK },

  sectionWrap: { marginBottom: 16 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, flex: 1 },

  proofBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  proofBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },

  proofEmpty: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: DIVIDER },
  proofEmptyIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  proofEmptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 4 },
  proofEmptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },
  proofImg: { width: '100%', height: 240, borderRadius: 16 },

  timestamp: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: SUBTLE, textAlign: 'center', marginTop: 8 },

  // Action bar
  actionBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: DIVIDER, backgroundColor: '#FFFDF9',
  },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: BROWN,
  },
  editBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
  completeBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: '#1E2A4A',
  },
  completeBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },
  completedBadge: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, backgroundColor: '#DCFCE7',
  },
  completedBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: GREEN },

  // 3-dot menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 16 },
  menuCard: { backgroundColor: '#fff', borderRadius: 16, minWidth: 180, overflow: 'hidden', borderWidth: 1, borderColor: DIVIDER },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  menuItemText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  menuDivider: { height: 1, backgroundColor: DIVIDER },

  // Edit modal
  editOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    ...Platform.select({ web: { justifyContent: 'center', padding: 20 }, default: { justifyContent: 'flex-end' } }),
  },
  editScroll: {
    width: '100%',
    ...Platform.select({ web: { flexGrow: 1, justifyContent: 'center', minHeight: '100%' as any }, default: { flexGrow: 1, justifyContent: 'flex-end' } }),
  },
  editCard: {
    backgroundColor: '#fff', padding: 22, paddingBottom: 32,
    ...Platform.select({ web: { borderRadius: 20, maxWidth: 500, alignSelf: 'center', width: '100%' }, default: { borderTopLeftRadius: 22, borderTopRightRadius: 22 } }),
  },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  editTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  input: {
    borderWidth: 1, borderColor: DIVIDER, borderRadius: 12, padding: 13,
    fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, marginBottom: 12,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  inputLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED, marginBottom: 8, letterSpacing: 0.5 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  priorityOption: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  priorityOptionText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  cancelBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  saveBtn: { backgroundColor: BROWN, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, minWidth: 110, alignItems: 'center' },
  saveBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  notFoundText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: MUTED },
});
