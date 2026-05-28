import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeShell } from '@/components/helper/work';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import {
  fetchApplicationTasks,
  completeApplicationTask,
  type ApplicationTask,
} from '@/lib/applicationTasksApi';
import { fetchAttendanceToday, type AttendanceToday } from '@/lib/attendanceApi';
import { uploadImageToCloudinary } from '@/lib/cloudinaryUpload';

import { createHelperWorkTasksStyles } from './work_tasks.styles';

type Section = { title: string; data: ApplicationTask[] };

export default function WorkTasksScreen() {
  const router = useRouter();
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createHelperWorkTasksStyles(c), [c]);
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

  const helperId = userData ? Number(userData.user_id) : 0;

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

  const sections = useMemo((): Section[] => {
    const open = tasks.filter((t) => t.status === 'pending' || t.status === 'skipped');
    const done = tasks.filter((t) => t.status === 'done');
    const out: Section[] = [];
    if (open.length) out.push({ title: 'To do', data: open });
    if (done.length) out.push({ title: 'Completed', data: done });
    return out;
  }, [tasks]);

  const mustCheckIn =
    todayAtt && !todayAtt.is_rest_day && !todayAtt.checked_in;

  const pickImage = async (mode: 'camera' | 'library') => {
    const perm =
      mode === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a picture.');
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
        Alert.alert('Tasks', res.message || 'Could not update');
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
      Alert.alert(
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
          Alert.alert(
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
      Alert.alert('Photo required', 'This task requires a completion photo.');
      return;
    }
    await runComplete(confirmTask, url);
  };

  const onCheckboxPress = (item: ApplicationTask, wantDone: boolean) => {
    if (!wantDone || item.status !== 'pending') return;
    setPickedUri(null);
    setConfirmTask(item);
  };

  if (!ready || authLoading || !isWorkMode || !activeHire) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={c.helper} />
      </View>
    );
  }

  const instructionHeader = (
    <View style={styles.instructionCard}>
      <Ionicons name="information-circle-outline" size={22} color={c.helper} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.instructionTitle}>How placement tasks work</Text>
        <Text style={styles.instructionBody}>
          Your employer adds tasks for this job. Check off items when you finish them — we may ask for a photo as
          proof. Completed items move below. You must check in for today (on your Work home screen) before marking tasks
          complete, unless today is a scheduled rest day.
        </Text>
        {mustCheckIn ? (
          <TouchableOpacity style={styles.checkInCta} onPress={() => router.push('/(helper)/home' as never)} activeOpacity={0.85}>
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={styles.checkInCtaText}>Go to check-in</Text>
          </TouchableOpacity>
        ) : todayAtt?.is_rest_day ? (
          <Text style={styles.restHint}>Today is a rest day — check-in is not required to complete tasks.</Text>
        ) : null}
      </View>
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
                    <Ionicons name="camera-outline" size={16} color={c.warning} />
                    <Text style={styles.reqPillText}>Photo required</Text>
                  </View>
                ) : (
                  <Text style={styles.modalHint}>Photo optional — add one if helpful for your employer.</Text>
                )}
                <View style={styles.photoRow}>
                  <TouchableOpacity style={styles.photoBtn} onPress={() => void pickImage('camera')}>
                    <Ionicons name="camera" size={20} color={c.helper} />
                    <Text style={styles.photoBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={() => void pickImage('library')}>
                    <Ionicons name="images-outline" size={20} color={c.helper} />
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
    <WorkModeShell desktopTitle="Tasks" desktopSubtitle="Placement checklist">
      <View style={{ flex: 1 }}>
        <SectionList
          sections={sections}
          keyExtractor={(i) => String(i.id)}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          ListHeaderComponent={instructionHeader}
          contentContainerStyle={[
            styles.listContent,
            !isDesktop && { paddingBottom: 24 },
            sections.length === 0 && !loading ? { flexGrow: 1 } : null,
          ]}
          ListEmptyComponent={
            loading ? null : (
              <Text style={styles.empty}>No tasks for today yet. Your employer can add tasks for this placement.</Text>
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
                    if (v && isPending) onCheckboxPress(item, true);
                  }}
                  color={item.status === 'done' ? c.success : c.muted}
                  disabled={!isPending || busyId === item.id || !!mustCheckIn}
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
                    {item.requires_photo ? <Text style={styles.metaWarn}> · Photo required</Text> : null}
                    {item.is_recurring ? <Text style={styles.meta}> · Recurring</Text> : null}
                  </View>
                  {item.status === 'done' && item.photo_url ? (
                    <Text style={styles.photoLink} numberOfLines={1}>
                      Photo on file
                    </Text>
                  ) : null}
                </View>
                {busyId === item.id ? <ActivityIndicator color={c.helper} /> : null}
              </View>
            );
          }}
        />
      </View>
      {confirmModal}
    </WorkModeShell>
  );
}
