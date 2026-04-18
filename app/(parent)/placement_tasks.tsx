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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import Checkbox from 'expo-checkbox';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar } from '@/components/parent/home';
import { theme } from '@/constants/theme';
import {
  fetchApplicationTasks,
  createApplicationTask,
  deleteApplicationTask,
  type ApplicationTask,
} from '@/lib/applicationTasksApi';
import { ConfirmationModal, NotificationModal } from '@/components/shared';

type Section = { title: string; data: ApplicationTask[] };

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
  const [saving, setSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const load = useCallback(async () => {
    if (!applicationId || !parentId) return;
    setLoading(true);
    try {
      const res = await fetchApplicationTasks(applicationId, parentId, 'parent');
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

  const submitAdd = async () => {
    const t = titleIn.trim();
    if (!t || !applicationId || !parentId) return;
    setSaving(true);
    try {
      const res = await createApplicationTask(applicationId, parentId, {
        title: t,
        description: descIn.trim() || undefined,
        due_date: dueIn.trim() || null,
        is_recurring: false,
      });
      if (!res.success) {
        Alert.alert('Tasks', res.message || 'Could not create');
        return;
      }
      setAddOpen(false);
      setTitleIn('');
      setDescIn('');
      setDueIn('');
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

  const list = (
    <SectionList
      sections={sections}
      keyExtractor={(i) => String(i.id)}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={[
        styles.listPad,
        sections.length === 0 && !loading ? { flexGrow: 1 } : null,
      ]}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={theme.color.parent} style={{ marginTop: 40 }} />
        ) : (
          <Text style={styles.empty}>No tasks yet. Tap “Add Task” to assign work.</Text>
        )
      }
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
      )}
      renderItem={({ item, section }) => {
        const isDone = section.title === 'Completed';
        const row = (
          <View style={[styles.row, isDone && styles.rowDone]}>
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
                {item.is_recurring ? <Text style={styles.meta}> · Recurring</Text> : null}
              </View>
            </View>
          </View>
        );
        if (isDone) return row;
        return (
          <Swipeable renderRightActions={() => renderRight(item)} overshootRight={false}>
            {row}
          </Swipeable>
        );
      }}
    />
  );

  const headerBlock = (
    <View style={styles.pageHead}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={theme.color.parent} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>Placement tasks</Text>
        <Text style={styles.pageSub}>{helperName}</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.addBtnText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  const addModal = (
    <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New task</Text>
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
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setAddOpen(false)}>
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
      </KeyboardAvoidingView>
    </Modal>
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mobileRoot} edges={['top']}>
      {headerBlock}
      <View style={{ flex: 1, minHeight: 0 }}>{list}</View>
      {addModal}
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
  listPad: { paddingBottom: 32 },
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
  metaRow: { flexDirection: 'row', marginTop: 6 },
  meta: { fontSize: 12, color: theme.color.muted },
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.color.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
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
