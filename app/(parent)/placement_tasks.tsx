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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Checkbox from 'expo-checkbox';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar } from '@/components/parent/home';
import { theme } from '@/constants/theme';
import {
  fetchApplicationTasks,
  createApplicationTask,
  updateApplicationTask,
  deleteApplicationTask,
  type ApplicationTask,
} from '@/lib/applicationTasksApi';
import { ConfirmationModal, NotificationModal } from '@/components/shared';

type Section = { title: string; data: ApplicationTask[] };

function parseRecurDays(s: string): string[] | null {
  const parts = s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

export default function PlacementTasksScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    application_id?: string;
    helper_name?: string;
  }>();
  const applicationId = params.application_id ? Number(params.application_id) : 0;
  const helperName = params.helper_name ? decodeURIComponent(params.helper_name) : 'Helper';

  const { isDesktop } = useResponsive();
  const { userData, handleLogout } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;

  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [titleIn, setTitleIn] = useState('');
  const [descIn, setDescIn] = useState('');
  const [dueIn, setDueIn] = useState('');
  const [addReqPhoto, setAddReqPhoto] = useState(false);
  const [addRecurring, setAddRecurring] = useState(false);
  const [recurDaysIn, setRecurDaysIn] = useState('');
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState<ApplicationTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDue, setEditDue] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const load = useCallback(async () => {
    if (!applicationId || !parentId) return;
    setLoading(true);
    try {
      const res = await fetchApplicationTasks(applicationId, parentId, 'parent', 'all');
      if (res.success && res.data) setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [applicationId, parentId]);

  useEffect(() => {
    if (applicationId && parentId) void load();
  }, [applicationId, parentId, load]);

  const sections = useMemo((): Section[] => {
    const open = tasks.filter((t) => t.status === 'pending' || t.status === 'skipped');
    const done = tasks.filter((t) => t.status === 'done');
    const out: Section[] = [];
    if (open.length) out.push({ title: 'Open', data: open });
    if (done.length) out.push({ title: 'Completed', data: done });
    return out;
  }, [tasks]);

  const resetAdd = () => {
    setTitleIn('');
    setDescIn('');
    setDueIn('');
    setAddReqPhoto(false);
    setAddRecurring(false);
    setRecurDaysIn('');
  };

  const submitAdd = async () => {
    const t = titleIn.trim();
    if (!t || !applicationId || !parentId) return;
    setSaving(true);
    try {
      const res = await createApplicationTask(applicationId, parentId, {
        title: t,
        description: descIn.trim() || undefined,
        due_date: dueIn.trim() || null,
        requires_photo: addReqPhoto,
        is_recurring: addRecurring,
        recur_days: parseRecurDays(recurDaysIn),
      });
      if (!res.success) {
        Alert.alert('Tasks', res.message || 'Could not create');
        return;
      }
      setAddOpen(false);
      resetAdd();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (task: ApplicationTask) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description ?? '');
    setEditDue(task.due_date ?? '');
    setEditOpen(true);
  };

  const submitEdit = async () => {
    const t = editTitle.trim();
    if (!t || !editTask || !parentId) return;
    setSaving(true);
    try {
      const res = await updateApplicationTask(editTask.id, parentId, {
        title: t,
        description: editDesc.trim() || null,
        due_date: editDue.trim() || null,
      });
      if (!res.success) {
        Alert.alert('Tasks', res.message || 'Could not save');
        return;
      }
      setEditOpen(false);
      setEditTask(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (task: ApplicationTask) => {
    Alert.alert('Delete task', `Remove “${task.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteApplicationTask(task.id, parentId);
          if (!res.success) {
            Alert.alert('Tasks', res.message || 'Delete failed');
            return;
          }
          await load();
        },
      },
    ]);
  };

  const renderRight = (item: ApplicationTask) => (
    <TouchableOpacity style={styles.swipeDel} onPress={() => confirmDelete(item)}>
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.swipeDelText}>Delete</Text>
    </TouchableOpacity>
  );

  const instruction = (
    <View style={styles.instructionCard}>
      <Ionicons name="information-circle-outline" size={22} color={theme.color.parent} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.instructionTitle}>Managing placement tasks</Text>
        <Text style={styles.instructionBody}>
          Add tasks your helper should complete during this hire. You can require a photo proof, set a due date, and
          note recurring weekdays. Your helper checks items off after check-in (except on rest days). Swipe open tasks
          left to delete. Tap a row to edit. Completed tasks stay visible with any submitted photos.
        </Text>
      </View>
    </View>
  );

  const list = (
    <SectionList
      sections={sections}
      keyExtractor={(i) => String(i.id)}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      ListHeaderComponent={instruction}
      contentContainerStyle={[
        styles.listPad,
        sections.length === 0 && !loading ? { flexGrow: 1 } : null,
      ]}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={theme.color.parent} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>No tasks yet. Tap “Add task” to assign work.</Text>
        )
      }
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
      )}
      renderItem={({ item, section }) => {
        const isDone = section.title === 'Completed';
        const rowContent = (
          <>
            <Checkbox value={item.status === 'done'} disabled color={theme.color.success} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rowTitle, isDone && styles.rowTitleDone]}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.rowDesc} numberOfLines={4}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                {item.due_date ? <Text style={styles.meta}>Due {item.due_date}</Text> : null}
                {item.requires_photo ? <Text style={styles.metaWarn}> · Photo required</Text> : null}
                {item.is_recurring ? <Text style={styles.meta}> · Recurring</Text> : null}
              </View>
              {isDone && item.photo_url ? (
                <Image source={{ uri: item.photo_url }} style={styles.thumb} contentFit="cover" />
              ) : null}
            </View>
          </>
        );

        if (isDone) {
          return <View style={[styles.row, styles.rowDone]}>{rowContent}</View>;
        }

        return (
          <Swipeable renderRightActions={() => renderRight(item)} overshootRight={false}>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => openEdit(item)}
            >
              {rowContent}
            </TouchableOpacity>
          </Swipeable>
        );
      }}
    />
  );

  const headerBlock = (
    <View style={[styles.pageHead, !isDesktop && styles.pageHeadMobile]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={theme.color.parent} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>Placement tasks</Text>
        <Text style={styles.pageSub}>{helperName}</Text>
      </View>
      {isDesktop ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );

  const addFields = (
    <>
      <TextInput
        style={styles.input}
        placeholder="Title *"
        value={titleIn}
        onChangeText={setTitleIn}
        placeholderTextColor={theme.color.subtle}
      />
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Description (optional)"
        value={descIn}
        onChangeText={setDescIn}
        multiline
        placeholderTextColor={theme.color.subtle}
      />
      <TextInput
        style={styles.input}
        placeholder="Due date YYYY-MM-DD (optional)"
        value={dueIn}
        onChangeText={setDueIn}
        placeholderTextColor={theme.color.subtle}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Require photo when done</Text>
        <Switch value={addReqPhoto} onValueChange={setAddReqPhoto} trackColor={{ true: theme.color.parent }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Recurring</Text>
        <Switch value={addRecurring} onValueChange={setAddRecurring} trackColor={{ true: theme.color.parent }} />
      </View>
      {addRecurring ? (
        <TextInput
          style={styles.input}
          placeholder="Weekdays e.g. Monday, Wednesday, Friday"
          value={recurDaysIn}
          onChangeText={setRecurDaysIn}
          placeholderTextColor={theme.color.subtle}
        />
      ) : null}
    </>
  );

  const addModal = (
    <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New task</Text>
            {addFields}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setAddOpen(false);
                  resetAdd();
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, !titleIn.trim() && { opacity: 0.5 }]}
                disabled={!titleIn.trim() || saving}
                onPress={() => void submitAdd()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const editModal = (
    <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit task</Text>
            <TextInput
              style={styles.input}
              placeholder="Title *"
              value={editTitle}
              onChangeText={setEditTitle}
              placeholderTextColor={theme.color.subtle}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              placeholderTextColor={theme.color.subtle}
            />
            <TextInput
              style={styles.input}
              placeholder="Due date YYYY-MM-DD (optional)"
              value={editDue}
              onChangeText={setEditDue}
              placeholderTextColor={theme.color.subtle}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, !editTitle.trim() && { opacity: 0.5 }]}
                disabled={!editTitle.trim() || saving}
                onPress={() => void submitEdit()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const fab = !isDesktop ? (
    <TouchableOpacity style={styles.fab} onPress={() => setAddOpen(true)} activeOpacity={0.9}>
      <Ionicons name="add" size={30} color="#fff" />
    </TouchableOpacity>
  ) : null;

  const logoutModals = (
    <>
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          setConfirmLogout(false);
          setSuccessLogout(true);
        }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => {
          setSuccessLogout(false);
          handleLogout();
        }}
      />
    </>
  );

  if (!applicationId) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.empty}>Missing application.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkBack}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <Sidebar onLogout={() => setConfirmLogout(true)} />
        <View style={styles.desktopMain}>
          {headerBlock}
          {list}
        </View>
        {addModal}
        {editModal}
        {logoutModals}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mobileRoot} edges={['top']}>
      {headerBlock}
      <View style={{ flex: 1, minHeight: 0 }}>{list}</View>
      {fab}
      {addModal}
      {editModal}
      {logoutModals}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: theme.color.canvasParent },
  desktopMain: { flex: 1, padding: 24 },
  mobileRoot: { flex: 1, backgroundColor: theme.color.canvasParent },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  linkBack: { marginTop: 12, color: theme.color.parent, fontWeight: '700' },
  pageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  pageHeadMobile: { paddingHorizontal: 16 },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: theme.color.ink },
  pageSub: { fontSize: 14, color: theme.color.muted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.color.parent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.color.parent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 20,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.color.parentSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  instructionTitle: { fontSize: 14, fontWeight: '800', color: theme.color.ink, marginBottom: 6 },
  instructionBody: { fontSize: 13, color: theme.color.inkMuted, lineHeight: 20 },
  listPad: { paddingBottom: 120, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.color.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.color.line,
    marginBottom: 8,
  },
  rowDone: { opacity: 0.55 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: theme.color.ink },
  rowTitleDone: { textDecorationLine: 'line-through', color: theme.color.muted },
  rowDesc: { fontSize: 14, color: theme.color.inkMuted, marginTop: 4, lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  meta: { fontSize: 12, color: theme.color.muted },
  metaWarn: { fontSize: 12, color: theme.color.warning, fontWeight: '700' },
  thumb: { width: 120, height: 120, borderRadius: 10, marginTop: 10, backgroundColor: theme.color.surface },
  empty: { textAlign: 'center', color: theme.color.muted, marginTop: 32, paddingHorizontal: 24 },
  swipeDel: {
    backgroundColor: theme.color.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    marginBottom: 8,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  swipeDelText: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.color.overlay,
    alignItems: 'center',
    ...Platform.select({
      web: { justifyContent: 'center', padding: 20 },
      default: { justifyContent: 'flex-end' },
    }),
  },
  modalScroll: {
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
      web: { flexGrow: 1, justifyContent: 'center', minHeight: '100%' as const },
      default: { flexGrow: 1, justifyContent: 'flex-end' },
    }),
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: theme.color.surfaceElevated,
    padding: 24,
    paddingBottom: 36,
    ...theme.shadow.card,
    ...Platform.select({
      web: { borderRadius: 20, maxHeight: '90%' as const },
      default: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    }),
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: theme.color.ink, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: theme.color.ink,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: theme.color.ink, flex: 1, marginRight: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  modalCancelText: { color: theme.color.muted, fontWeight: '700' },
  modalSave: {
    backgroundColor: theme.color.parent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '800' },
});
