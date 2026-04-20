// app/(parent)/messages.tsx
import React, { useState, useEffect, useRef, useCallback, createElement } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, StyleSheet, Modal, Linking, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useConversations, useChat, Conversation, Message } from '@/hooks/shared';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { LoadingSpinner, ConfirmationModal, NotificationModal } from '@/components/shared/';
import { ChatCallOptionsModal } from '@/components/shared/ChatCallOptionsModal';
import { InterviewModal } from '@/components/shared/InterviewModal';
import { theme } from '@/constants/theme';
import API_URL from '@/constants/api';
import { applicationContractPdfUrl, applicationSignContractUrl } from '@/constants/applications';
import {
  HireJobPickerModal,
  HireContractTermsModal,
  toYmdInput,
  type HireJobOptionRow,
} from '@/components/parent/hire';

const ACCENT = theme.color.parent;
const CANVAS = theme.color.canvasParent;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeLabel(dateStr: string) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60)        return 'Just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)     return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 86400 * 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fullTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dateDivider(dateStr: string) {
  const d   = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function shouldShowDivider(prev: Message | undefined, curr: Message) {
  if (!prev) return true;
  return new Date(prev.sent_at).toDateString() !== new Date(curr.sent_at).toDateString();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name, photo, size = 40, color,
}: { name: string; photo?: string | null; size?: number; color?: string }) {
  const bg       = color ?? ACCENT;
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e0e0e0' }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
        justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// ─── ConvItem ─────────────────────────────────────────────────────────────────

function ConvItem({ item, onPress, active }: { item: Conversation; onPress: () => void; active: boolean }) {
  return (
    <TouchableOpacity style={[s.convItem, active && s.convItemActive]} onPress={onPress} activeOpacity={0.7}>
      <View style={s.convAvaWrap}>
        <Avatar name={item.partner_name} photo={item.partner_photo} size={48} color={theme.color.helper} />
        {item.unread_count > 0 && (
          <View style={s.badge}><Text style={s.badgeTxt}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text></View>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={s.convRow}>
          <Text style={[s.convName, item.unread_count > 0 && { fontWeight: '700' }]} numberOfLines={1}>
            {item.partner_name}
          </Text>
          <Text style={s.convTime}>{timeLabel(item.last_sent_at)}</Text>
        </View>
        {item.job_title && (
          <Text style={s.convJob} numberOfLines={1}>re: {item.job_title}</Text>
        )}
        <Text
          style={[s.convPreview, item.unread_count > 0 && { color: theme.color.ink, fontWeight: '600' }]}
          numberOfLines={1}
        >
          {item.is_mine ? 'You: ' : ''}
          {item.last_message || 'Photo'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── ImageViewer Modal ────────────────────────────────────────────────────────

function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.imgViewerBg} activeOpacity={1} onPress={onClose}>
        <Image source={{ uri }} style={s.imgViewerImg} resizeMode="contain" />
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

function Bubble({
  msg, isMine, onLongPress, onImagePress, onEditPress,
}: {
  msg: Message;
  isMine: boolean;
  onLongPress?: () => void;
  onImagePress?: (uri: string) => void;
  onEditPress?: () => void;
}) {
  const isVideoCall = msg.message_type === 'video_call';
  const isImage     = msg.message_type === 'image';

  if (isVideoCall) {
    return (
      <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
        <TouchableOpacity
          style={[s.videoCard, isMine && s.videoCardMine]}
          onPress={() => Linking.openURL(msg.message_text)}
          activeOpacity={0.8}
        >
          <View style={[s.videoCardIcon, isMine && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Ionicons name="videocam" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.videoCardTitle, isMine && { color: '#fff' }]}>Video Call Invitation</Text>
            <Text style={[s.videoCardSub, isMine && { color: 'rgba(255,255,255,0.75)' }]}>Tap to join the call</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isMine ? 'rgba(255,255,255,0.7)' : ACCENT} />
        </TouchableOpacity>
        <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
          {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
        </Text>
      </View>
    );
  }

  if (isImage && msg.image_url) {
    return (
      <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
        <TouchableOpacity onPress={() => onImagePress?.(msg.image_url!)} activeOpacity={0.9}>
          <Image source={{ uri: msg.image_url }} style={s.imgBubble} resizeMode="cover" />
        </TouchableOpacity>
        <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
          {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%', gap: 4 }}>
        <TouchableOpacity
          style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}
          onLongPress={isMine ? onLongPress : undefined}
          delayLongPress={400}
          activeOpacity={0.85}
        >
          <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{msg.message_text}</Text>
          {msg.is_edited && (
            <Text style={[s.editedLabel, isMine && s.editedLabelMine]}>edited</Text>
          )}
        </TouchableOpacity>
        {isMine && onEditPress && (
          <TouchableOpacity onPress={onEditPress} hitSlop={8} style={s.editBubbleBtn} accessibilityLabel="Edit message">
            <Ionicons name="create-outline" size={18} color={theme.color.muted} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
        {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
      </Text>
    </View>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  visible, initialText, onSave, onClose,
}: { visible: boolean; initialText: string; onSave: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initialText);
  useEffect(() => { if (visible) setText(initialText); }, [visible, initialText]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.editModalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.editModalBox} activeOpacity={1}>
          <Text style={s.editModalTitle}>Edit Message</Text>
          <TextInput
            style={s.editModalInput}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={2000}
          />
          <View style={s.editModalBtns}>
            <TouchableOpacity style={s.editModalCancel} onPress={onClose}>
              <Text style={{ color: theme.color.muted, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.editModalSave, !text.trim() && { opacity: 0.4 }]}
              onPress={() => { if (text.trim()) { onSave(text.trim()); onClose(); } }}
              disabled={!text.trim()}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

function ChatPanel({
  partnerId, partnerName, partnerPhoto, jobPostId, onBack,
}: {
  partnerId: number; partnerName: string; partnerPhoto?: string | null;
  jobPostId?: number | null; onBack?: () => void;
}) {
  const { messages, loading, sending, myUserId, sendMessage, editMessage, sendImage, sendVideoCall, fetchMessages } = useChat(partnerId);
  const [text, setText]             = useState('');
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [viewerUri, setViewerUri]   = useState<string | null>(null);
  const [callModal, setCallModal]   = useState(false);
  const [interviewModalVisible, setInterviewModalVisible] = useState(false);
  const [interviewAppId, setInterviewAppId] = useState(0);
  const [interviewJobTitle, setInterviewJobTitle] = useState('');
  const [resolvedApp, setResolvedApp] = useState<{
    application_id: number;
    job_title: string;
    status: string;
    job_post_id: number;
    job_start_date?: string | null;
    employer_signed_at?: string | null;
    helper_signed_at?: string | null;
  } | null>(null);
  const [hiringAction, setHiringAction] = useState(false);
  const [hirePickVisible, setHirePickVisible] = useState(false);
  const [hirePickHelperName, setHirePickHelperName] = useState('');
  const [hirePickApps, setHirePickApps] = useState<HireJobOptionRow[]>([]);
  const [hirePickSelectedId, setHirePickSelectedId] = useState<number | null>(null);
  const [hirePayload, setHirePayload] = useState<{
    application_id: number;
    job_post_id: number;
    job_title: string;
    job_start_date?: string | null;
  } | null>(null);
  const [hireTermsVisible, setHireTermsVisible] = useState(false);
  const [hireContractStartDate, setHireContractStartDate] = useState('');
  const [hireContractEndDate, setHireContractEndDate] = useState('');
  const [hireContractNotes, setHireContractNotes] = useState('');
  const [hireConfirmVisible, setHireConfirmVisible] = useState(false);
  const [rejectConfirmVisible, setRejectConfirmVisible] = useState(false);
  const [contractPdfVisible, setContractPdfVisible] = useState(false);
  const [contractPdfUri, setContractPdfUri] = useState<string | null>(null);
  const [signConfirmVisible, setSignConfirmVisible] = useState(false);
  const [chatNotif, setChatNotif] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ visible: false, message: '', type: 'info' });

  const showChatNotif = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setChatNotif({ visible: true, message, type });
  };

  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) flatRef.current?.scrollToEnd({ animated: false });
  }, [messages.length]);

  const loadResolvedApp = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/parent/get_job_applications.php?parent_id=${user.user_id}`);
      const data = await res.json();
      if (!data.success) return;
      const apps = data.applications ?? [];
      const match =
        apps.find(
          (a: { helper_id: string; job_post_id: string }) =>
            Number(a.helper_id) === Number(partnerId) &&
            (jobPostId ? Number(a.job_post_id) === Number(jobPostId) : true),
        ) ??
        apps.find((a: { helper_id: string }) => Number(a.helper_id) === Number(partnerId));
      if (match) {
        setResolvedApp({
          application_id: Number(match.application_id),
          job_title:        String(match.job_title ?? ''),
          status:           String(match.status ?? ''),
          job_post_id:      Number(match.job_post_id),
          job_start_date:   match.job_start_date ?? null,
          employer_signed_at: match.employer_signed_at ?? null,
          helper_signed_at: match.helper_signed_at ?? null,
        });
      } else {
        setResolvedApp(null);
      }
    } catch {
      setResolvedApp(null);
    }
  }, [partnerId, jobPostId]);

  useEffect(() => {
    void loadResolvedApp();
  }, [loadResolvedApp]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await sendMessage(t, jobPostId);
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Allow photo access to send images.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS !== 'web',
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const ok = await sendImage(result.assets[0].uri, jobPostId);
      if (!ok) Alert.alert('Upload failed', 'Could not send the image. On web, try a smaller JPG or PNG.');
    }
  };

  const openParentScheduleInterview = async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/parent/get_job_applications.php?parent_id=${user.user_id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to load applications');
      const apps = data.applications ?? [];
      const match = apps.find(
        (a: { helper_id: string }) => Number(a.helper_id) === Number(partnerId),
      );
      if (!match) {
        showChatNotif(
          'This helper has not applied to any of your job posts yet. They can apply from the job listing, or you can start an instant video call from the menu.',
          'info',
        );
        return;
      }
      setInterviewAppId(Number(match.application_id));
      setInterviewJobTitle(String(match.job_title ?? 'Position'));
      setInterviewModalVisible(true);
    } catch (e: any) {
      showChatNotif(e.message || 'Could not load applications', 'error');
    }
  };

  const beginHireFlow = async () => {
    if (!resolvedApp) return;
    setHiringAction(true);
    setHirePayload(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(
        `${API_URL}/parent/get_helper_hire_options.php?parent_id=${user.user_id}&helper_id=${partnerId}`,
      );
      const data = await res.json() as {
        success?: boolean;
        message?: string;
        needs_selection?: boolean;
        helper_name?: string;
        applications?: Array<{
          application_id: number;
          job_post_id: number;
          job_title: string;
          status: string;
          applied_at: string;
          job_start_date?: string | null;
        }>;
      };
      if (!data.success) throw new Error(data.message || 'Could not load hire options');
      if (!data.needs_selection) {
        setHirePayload({
          application_id: resolvedApp.application_id,
          job_post_id:    resolvedApp.job_post_id,
          job_title:      resolvedApp.job_title,
          job_start_date: resolvedApp.job_start_date ?? null,
        });
        setHireContractStartDate(toYmdInput(resolvedApp.job_start_date));
        setHireContractEndDate('');
        setHireContractNotes('');
        setHireTermsVisible(true);
        return;
      }
      const apps = (data.applications ?? []).map(a => ({
        application_id: Number(a.application_id),
        job_post_id:    Number(a.job_post_id),
        job_title:      String(a.job_title ?? ''),
        status:         String(a.status ?? ''),
        applied_at:     String(a.applied_at ?? ''),
        job_start_date: a.job_start_date ?? null,
      }));
      setHirePickHelperName(String(data.helper_name ?? partnerName));
      setHirePickApps(apps);
      const pre =
        apps.find(a => a.application_id === resolvedApp.application_id) ?? apps[0] ?? null;
      setHirePickSelectedId(pre?.application_id ?? null);
      setHirePickVisible(true);
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not start hire', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  const confirmHireJobSelection = () => {
    const row = hirePickApps.find(a => a.application_id === hirePickSelectedId);
    if (!row) return;
    setHirePayload({
      application_id: row.application_id,
      job_post_id:    row.job_post_id,
      job_title:      row.job_title,
      job_start_date: row.job_start_date ?? null,
    });
    setHireContractStartDate(toYmdInput(row.job_start_date));
    setHireContractEndDate('');
    setHireContractNotes('');
    setHirePickVisible(false);
    setHireTermsVisible(true);
  };

  const confirmHireTerms = () => {
    const end = hireContractEndDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      showChatNotif('Enter the contract end date as YYYY-MM-DD (required).', 'warning');
      return;
    }
    const start = hireContractStartDate.trim();
    if (start !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
      showChatNotif('Employment start must be YYYY-MM-DD, or leave blank to use the job post date.', 'warning');
      return;
    }
    if (start !== '' && end < start) {
      showChatNotif('Contract end date must be on or after the employment start date.', 'warning');
      return;
    }
    setHireTermsVisible(false);
    setHireConfirmVisible(true);
  };

  const executeHire = async () => {
    if (!resolvedApp) return;
    const appId = hirePayload?.application_id ?? resolvedApp.application_id;
    const jpId  = hirePayload?.job_post_id ?? resolvedApp.job_post_id;
    setHireConfirmVisible(false);
    setHiringAction(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/parent/hire_helper.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: appId,
          job_post_id:    jpId,
          parent_id:      user.user_id,
          helper_id:      partnerId,
          contract_end_date:     hireContractEndDate.trim(),
          contract_start_date:   hireContractStartDate.trim() || undefined,
          contract_terms_notes: hireContractNotes.trim() || undefined,
        }),
      });
      const hireData = await res.json() as {
        success?: boolean;
        message?: string;
        contract_pdf_url?: string | null;
        contract_generation_error?: string | null;
      };
      if (!hireData.success) throw new Error(hireData.message || 'Could not start contract');

      setHirePayload(null);
      setHireContractEndDate('');
      setHireContractStartDate('');
      setHireContractNotes('');
      await loadResolvedApp();
      fetchMessages();

      const contractErr = hireData.contract_generation_error ?? null;
      if (contractErr) {
        showChatNotif(
          `Contract draft started but the PDF file failed: ${contractErr}`,
          'warning',
        );
      } else {
        showChatNotif(
          'Draft contract created. You and the helper must review and confirm before the hire is final.',
          'success',
        );
      }
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not start contract', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  const openReviewContract = async () => {
    if (!resolvedApp) return;
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const uri = applicationContractPdfUrl(resolvedApp.application_id, Number(user.user_id), 'parent');
      setContractPdfUri(uri);
      if (Platform.OS === 'web') {
        setContractPdfVisible(true);
      } else {
        await WebBrowser.openBrowserAsync(uri);
      }
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not open contract', 'error');
    }
  };

  const executeSignContract = async () => {
    if (!resolvedApp) return;
    setSignConfirmVisible(false);
    setHiringAction(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(applicationSignContractUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: resolvedApp.application_id,
          user_id:        user.user_id,
          user_type:      'parent',
        }),
      });
      const data = await res.json() as {
        success?: boolean;
        message?: string;
        hire_finalized?: boolean;
      };
      if (!data.success) throw new Error(data.message || 'Sign failed');
      await loadResolvedApp();
      fetchMessages();
      showChatNotif(
        data.hire_finalized
          ? 'Contract confirmed. The helper is now hired.'
          : 'Your signature was recorded. Waiting for the helper to confirm.',
        data.hire_finalized ? 'success' : 'info',
      );
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not sign', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  const openRejectConfirm = () => {
    if (!resolvedApp) return;
    setRejectConfirmVisible(true);
  };

  const executeReject = async () => {
    if (!resolvedApp) return;
    setRejectConfirmVisible(false);
    setHiringAction(true);
    try {
      const res = await fetch(`${API_URL}/parent/update_application_status.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: resolvedApp.application_id,
          status:           'Rejected',
          parent_notes:     'Not selected for this role.',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Update failed');
      setResolvedApp({ ...resolvedApp, status: 'Rejected' });
      fetchMessages();
      showChatNotif('Application rejected.', 'info');
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not update', 'error');
    } finally {
      setHiringAction(false);
    }
  };

  if (loading) {
    return <View style={s.chatLoadWrap}><ActivityIndicator color={ACCENT} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={s.chatHeader}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={s.chatBack}>
            <Ionicons name="arrow-back" size={22} color={theme.color.ink} />
          </TouchableOpacity>
        )}
        <Avatar name={partnerName} photo={partnerPhoto} size={38} color={theme.color.helper} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={s.chatHeaderName} numberOfLines={1}>{partnerName}</Text>
          {jobPostId && <Text style={s.chatHeaderSub}>Job #{jobPostId}</Text>}
        </View>
        <TouchableOpacity style={s.callBtn} onPress={() => setCallModal(true)}>
          <Ionicons name="videocam" size={20} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {resolvedApp &&
        !['Accepted', 'Rejected', 'Withdrawn', 'contract_pending', 'hired', 'auto_rejected'].includes(
          resolvedApp.status,
        ) && (
        <View style={s.appActionBar}>
          <Text style={s.appActionLabel} numberOfLines={1}>
            Application · {resolvedApp.status}
          </Text>
          <View style={s.appActionBtns}>
            <TouchableOpacity
              style={[s.appActionBtn, s.appActionReject]}
              onPress={openRejectConfirm}
              disabled={hiringAction}
            >
              <Text style={s.appActionRejectTxt}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.appActionBtn, s.appActionHire]}
              onPress={() => { void beginHireFlow(); }}
              disabled={hiringAction}
            >
              {hiringAction ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.appActionBtnTxt}>Hire</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {resolvedApp && resolvedApp.status === 'contract_pending' && (
        <View style={s.contractActionBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.contractActionTitle}>Contract pending signatures</Text>
            <Text style={s.contractActionSub} numberOfLines={2}>
              Employer: {resolvedApp.employer_signed_at ? 'Signed' : 'Not signed'} · Helper:{' '}
              {resolvedApp.helper_signed_at ? 'Signed' : 'Not signed'}
            </Text>
          </View>
          <View style={s.contractActionBtns}>
            <TouchableOpacity style={s.contractOutlineBtn} onPress={() => { void openReviewContract(); }}>
              <Text style={s.contractOutlineBtnTxt}>Review contract</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.contractPrimaryBtn,
                (!!resolvedApp.employer_signed_at || hiringAction) && s.contractPrimaryBtnDisabled,
              ]}
              disabled={!!resolvedApp.employer_signed_at || hiringAction}
              onPress={() => setSignConfirmVisible(true)}
            >
              {hiringAction ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.contractPrimaryBtnTxt}>I agree</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {resolvedApp && (resolvedApp.status === 'hired' || resolvedApp.status === 'Accepted') && (
        <View style={[s.appActionBarMuted, { flexWrap: 'wrap' }]}>
          <Ionicons name="checkmark-circle" size={18} color={theme.color.success} />
          <Text style={[s.appActionMutedTxt, { flex: 1 }]}>Hired for this job</Text>
          <TouchableOpacity style={s.contractDownloadLink} onPress={() => { void openReviewContract(); }}>
            <Text style={s.contractDownloadLinkTxt}>Download contract</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => String(m.message_id)}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 14 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const isMine     = item.sender_id === myUserId;
          const showDivider = shouldShowDivider(messages[index - 1], item);
          return (
            <>
              {showDivider && (
                <View style={s.dateDividerWrap}>
                  <Text style={s.dateDivider}>{dateDivider(item.sent_at)}</Text>
                </View>
              )}
              <Bubble
                msg={item}
                isMine={isMine}
                onLongPress={() => setEditTarget(item)}
                onEditPress={item.message_type === 'text' && isMine ? () => setEditTarget(item) : undefined}
                onImagePress={uri => setViewerUri(uri)}
              />
            </>
          );
        }}
        ListEmptyComponent={
          <View style={s.chatEmpty}>
            <Ionicons name="chatbubbles-outline" size={52} color={theme.color.subtle} />
            <Text style={s.chatEmptyTitle}>No messages yet</Text>
            <Text style={s.chatEmptySub}>Say hello to {partnerName}!</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={s.inputRow}>
        <TouchableOpacity style={s.inputIcon} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={22} color={theme.color.muted} />
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={theme.color.subtle}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {/* Edit modal */}
      <EditModal
        visible={!!editTarget}
        initialText={editTarget?.message_text ?? ''}
        onSave={newText => { if (editTarget) editMessage(editTarget.message_id, newText); }}
        onClose={() => setEditTarget(null)}
      />

      {/* Image viewer */}
      {viewerUri && <ImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />}

      <ChatCallOptionsModal
        visible={callModal}
        onClose={() => setCallModal(false)}
        accent={ACCENT}
        partnerName={partnerName}
        onScheduleInterview={openParentScheduleInterview}
        onConfirmStartVideo={async () => {
          const url = await sendVideoCall(myUserId, jobPostId);
          if (url) Linking.openURL(url);
        }}
      />
      <InterviewModal
        visible={interviewModalVisible}
        onClose={() => setInterviewModalVisible(false)}
        applicationId={interviewAppId}
        helperName={partnerName}
        jobTitle={interviewJobTitle}
        scheduledBy={myUserId}
        onScheduled={() => { fetchMessages(); }}
      />

      <HireContractTermsModal
        visible={hireTermsVisible}
        jobTitle={hirePayload?.job_title ?? resolvedApp?.job_title ?? 'this job'}
        contractStartDate={hireContractStartDate}
        contractEndDate={hireContractEndDate}
        contractNotes={hireContractNotes}
        onChangeStart={setHireContractStartDate}
        onChangeEnd={setHireContractEndDate}
        onChangeNotes={setHireContractNotes}
        onCancel={() => { setHireTermsVisible(false); setHirePayload(null); }}
        onContinue={confirmHireTerms}
      />

      <HireJobPickerModal
        visible={hirePickVisible}
        helperName={hirePickHelperName}
        accentColor={ACCENT}
        applications={hirePickApps}
        selectedId={hirePickSelectedId}
        onSelect={setHirePickSelectedId}
        onCancel={() => setHirePickVisible(false)}
        onContinue={confirmHireJobSelection}
      />

      <ConfirmationModal
        visible={hireConfirmVisible}
        title="Start employment contract?"
        message={resolvedApp
          ? `Create a draft contract for "${hirePayload?.job_title ?? resolvedApp.job_title}" ending ${hireContractEndDate.trim() || '(set date)'}. The hire is not final until you and the helper both review and confirm.`
          : ''}
        confirmText="Continue"
        cancelText="Cancel"
        type="default"
        onConfirm={() => { void executeHire(); }}
        onCancel={() => {
          setHireConfirmVisible(false);
          setHirePayload(null);
          setHireContractEndDate('');
          setHireContractStartDate('');
          setHireContractNotes('');
        }}
      />
      <ConfirmationModal
        visible={signConfirmVisible}
        title="Confirm agreement"
        message="By confirming, you agree to the terms of this contract. This cannot be undone."
        confirmText="Confirm"
        cancelText="Cancel"
        type="warning"
        onConfirm={() => { void executeSignContract(); }}
        onCancel={() => setSignConfirmVisible(false)}
      />
      <Modal visible={contractPdfVisible} animationType="slide" onRequestClose={() => setContractPdfVisible(false)}>
        <View style={s.contractPdfModal}>
          <View style={s.contractPdfHeader}>
            <Text style={s.contractPdfTitle}>Employment contract</Text>
            <TouchableOpacity onPress={() => setContractPdfVisible(false)} hitSlop={12}>
              <Text style={s.contractPdfClose}>Close</Text>
            </TouchableOpacity>
          </View>
          {contractPdfUri && Platform.OS === 'web'
            ? createElement('iframe', {
              title: 'Employment contract',
              src: contractPdfUri,
              style: { flex: 1, width: '100%', border: 'none', minHeight: 400 } as Record<string, unknown>,
            })
            : null}
        </View>
      </Modal>
      <ConfirmationModal
        visible={rejectConfirmVisible}
        title="Reject application?"
        message="The helper will be notified that they were not selected."
        confirmText="Reject"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => { void executeReject(); }}
        onCancel={() => setRejectConfirmVisible(false)}
      />
      <NotificationModal
        visible={chatNotif.visible}
        message={chatNotif.message}
        type={chatNotif.type === 'warning' ? 'warning' : chatNotif.type === 'error' ? 'error' : chatNotif.type === 'success' ? 'success' : 'info'}
        onClose={() => setChatNotif(n => ({ ...n, visible: false }))}
        autoClose={chatNotif.type !== 'warning'}
        duration={4200}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ParentMessages() {
  const router           = useRouter();
  const { isDesktop }    = useResponsive();
  const { handleLogout } = useAuth();
  const { unreadCount: notifUnread } = useNotifications('parent');
  const params = useLocalSearchParams<{ partner_id?: string; partner_name?: string; job_post_id?: string }>();

  const { conversations, loading: loadingConvs, refresh } = useConversations();

  const [activePartner,        setActivePartner]        = useState<Conversation | null>(null);
  const [isMobileMenuOpen,     setIsMobileMenuOpen]     = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);
  const [convSearch,           setConvSearch]           = useState('');

  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setConfirmLogoutVisible(true);
  };
  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  useEffect(() => {
    if (!params.partner_id || loadingConvs) return;
    const found = conversations.find(c => String(c.partner_id) === params.partner_id);
    if (found) {
      setActivePartner(found);
    } else if (params.partner_name) {
      setActivePartner({
        partner_id:    Number(params.partner_id),
        partner_name:  decodeURIComponent(params.partner_name),
        partner_type:  'helper',
        partner_photo: null,
        last_message:  '',
        last_sent_at:  new Date().toISOString(),
        is_mine:       false,
        unread_count:  0,
        job_post_id:   params.job_post_id ? Number(params.job_post_id) : null,
        job_title:     null,
      });
    }
  }, [params.partner_id, params.partner_name, loadingConvs]);

  const filteredConvs = convSearch.trim()
    ? conversations.filter(c =>
        c.partner_name.toLowerCase().includes(convSearch.toLowerCase()) ||
        (c.job_title ?? '').toLowerCase().includes(convSearch.toLowerCase())
      )
    : conversations;

  const openPartner = useCallback((conv: Conversation) => {
    setActivePartner(conv);
  }, []);

  const ConvList = (
    <>
      {/* Search */}
      <View style={s.convSearch}>
        <Ionicons name="search" size={16} color={theme.color.muted} style={{ marginRight: 6 }} />
        <TextInput
          style={s.convSearchInput}
          value={convSearch}
          onChangeText={setConvSearch}
          placeholder="Search conversations…"
          placeholderTextColor={theme.color.subtle}
        />
        {convSearch.length > 0 && (
          <TouchableOpacity onPress={() => setConvSearch('')}>
            <Ionicons name="close-circle" size={16} color={theme.color.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {loadingConvs ? (
        <LoadingSpinner visible />
      ) : filteredConvs.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="chatbubbles-outline" size={52} color={theme.color.subtle} />
          <Text style={s.emptyTitle}>{convSearch ? 'No matches' : 'No messages yet'}</Text>
          <Text style={s.emptySub}>
            {convSearch ? 'Try a different name.' : 'Post a job and start chatting with helpers.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConvs}
          keyExtractor={c => String(c.partner_id)}
          renderItem={({ item }) => (
            <ConvItem
              item={item}
              onPress={() => openPartner(item)}
              active={activePartner?.partner_id === item.partner_id}
            />
          )}
          contentContainerStyle={{ paddingBottom: 88 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (!isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: CANVAS }}>
        {!activePartner ? (
          <SafeAreaView style={{ flex: 1 }}>
            <View style={s.mobileHeader}>
              <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={s.menuBtn}>
                <Ionicons name="menu-outline" size={26} color={theme.color.ink} />
              </TouchableOpacity>
              <Text style={s.mobileTitle}>Messages</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={s.contractFlowHintBar}>
              <Ionicons name="document-text-outline" size={14} color={theme.color.muted} />
              <Text style={s.contractFlowHintText}>
                After you message a helper and agree on terms, the next step is generating your employment contract.
              </Text>
            </View>
            {ConvList}
          </SafeAreaView>
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
            <ChatPanel
              partnerId={activePartner.partner_id}
              partnerName={activePartner.partner_name}
              partnerPhoto={activePartner.partner_photo}
              jobPostId={activePartner.job_post_id}
              onBack={() => { setActivePartner(null); refresh(); }}
            />
          </SafeAreaView>
        )}

        {!activePartner ? <ParentTabBar /> : null}

        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          handleLogout={initiateLogout}
          notificationUnread={notifUnread}
        />
        <ConfirmationModal
          visible={confirmLogoutVisible}
          title="Log Out"
          message="Are you sure you want to log out?"
          confirmText="Log Out"
          cancelText="Cancel"
          type="danger"
          onConfirm={executeLogout}
          onCancel={() => setConfirmLogoutVisible(false)}
        />
        <NotificationModal
          visible={successLogoutVisible}
          message="Logged Out Successfully!"
          type="success"
          autoClose
          duration={1500}
          onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }}
        />
      </View>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  return (
    <>
      <View style={s.desktopWrap}>
        <Sidebar onLogout={initiateLogout} />
        <View style={s.desktopMain}>
        {/* Conversation list panel */}
        <View style={s.convPanel}>
          <View style={s.convPanelHeader}>
            <Text style={s.convPanelTitle}>Messages</Text>
            <Text style={s.convPanelCount}>{conversations.length}</Text>
          </View>
          <View style={s.contractFlowHintBar}>
            <Ionicons name="document-text-outline" size={14} color={theme.color.muted} />
            <Text style={s.contractFlowHintText}>
              After you message a helper and agree on terms, the next step is generating your employment contract.
            </Text>
          </View>
          {ConvList}
        </View>

        {/* Chat panel */}
        <View style={s.chatPanelWrap}>
          {activePartner ? (
            <ChatPanel
              partnerId={activePartner.partner_id}
              partnerName={activePartner.partner_name}
              partnerPhoto={activePartner.partner_photo}
              jobPostId={activePartner.job_post_id}
            />
          ) : (
            <View style={s.noChatWrap}>
              <View style={s.noChatIcon}>
                <Ionicons name="chatbubbles-outline" size={56} color={ACCENT} />
              </View>
              <Text style={s.noChatTitle}>Your Messages</Text>
              <Text style={s.noChatSub}>
                Select a conversation to start chatting, or post a job to connect with helpers. When you are ready to hire, you will move on from messaging to employment contract generation.
              </Text>
            </View>
          )}
        </View>
        </View>
      </View>
      <ConfirmationModal
        visible={confirmLogoutVisible}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={executeLogout}
        onCancel={() => setConfirmLogoutVisible(false)}
      />
      <NotificationModal
        visible={successLogoutVisible}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  desktopWrap:      { flex: 1, flexDirection: 'row', backgroundColor: CANVAS },
  desktopMain:      { flex: 1, flexDirection: 'row', overflow: 'hidden' },

  convPanel:        { width: 300, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#EAECEF' },
  convPanelHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16,
                      borderBottomWidth: 1, borderBottomColor: '#EAECEF' },
  convPanelTitle:   { fontSize: 17, fontWeight: '700', color: theme.color.ink, flex: 1 },
  convPanelCount:   { fontSize: 13, color: theme.color.muted, backgroundColor: '#F0F2F5',
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  contractFlowHintBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
    backgroundColor: '#FAFBFC',
  },
  contractFlowHintText: {
    flex: 1,
    fontSize: 12,
    color: theme.color.muted,
    lineHeight: 17,
  },

  convSearch:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginVertical: 10,
                      backgroundColor: '#F5F7FA', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  convSearchInput:  { flex: 1, fontSize: 14, color: theme.color.ink, padding: 0 },

  convItem:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
                      borderBottomWidth: 1, borderBottomColor: '#F5F7FA' },
  convItemActive:   { backgroundColor: '#EEF4FF' },
  convAvaWrap:      { position: 'relative' },
  badge:            { position: 'absolute', top: -2, right: -2, backgroundColor: ACCENT,
                      borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
                      paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' },
  badgeTxt:         { color: '#fff', fontSize: 10, fontWeight: '700' },
  convRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  convName:         { fontSize: 14, fontWeight: '600', color: theme.color.ink, flex: 1, marginRight: 6 },
  convTime:         { fontSize: 11, color: theme.color.muted },
  convJob:          { fontSize: 11, color: ACCENT, marginBottom: 2 },
  convPreview:      { fontSize: 13, color: theme.color.muted },

  emptyWrap:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle:       { fontSize: 16, fontWeight: '700', color: theme.color.ink, marginTop: 14, marginBottom: 6 },
  emptySub:         { fontSize: 14, color: theme.color.muted, textAlign: 'center', lineHeight: 20 },

  chatPanelWrap:    { flex: 1, backgroundColor: '#F5F7FA' },
  noChatWrap:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noChatIcon:       { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EEF4FF',
                      justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  noChatTitle:      { fontSize: 20, fontWeight: '700', color: theme.color.ink, marginBottom: 8 },
  noChatSub:        { fontSize: 14, color: theme.color.muted, textAlign: 'center', lineHeight: 22, maxWidth: 300 },

  mobileHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 16, paddingVertical: 12,
                      backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EAECEF' },
  menuBtn:          { padding: 4 },
  mobileTitle:      { fontSize: 18, fontWeight: '700', color: theme.color.ink },

  chatHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
                      backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EAECEF',
                      ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } }) },
  chatBack:         { marginRight: 8, padding: 4 },
  chatHeaderName:   { fontSize: 15, fontWeight: '700', color: theme.color.ink },
  chatHeaderSub:    { fontSize: 12, color: theme.color.muted },
  callBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF4FF',
                      justifyContent: 'center', alignItems: 'center', marginLeft: 6 },

  appActionBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F0F7FF',
                      borderBottomWidth: 1, borderBottomColor: '#EAECEF', gap: 10 },
  appActionLabel:   { flex: 1, fontSize: 12, color: theme.color.muted, fontWeight: '600' },
  appActionBtns:    { flexDirection: 'row', gap: 8 },
  appActionBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 72, alignItems: 'center' },
  appActionHire:    { backgroundColor: theme.color.success },
  appActionReject:  { backgroundColor: theme.color.surfaceElevated, borderWidth: 1, borderColor: theme.color.line },
  appActionBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  appActionRejectTxt: { color: theme.color.danger, fontWeight: '700', fontSize: 13 },
  appActionBarMuted:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8,
                      backgroundColor: theme.color.successSoft, borderBottomWidth: 1, borderBottomColor: '#EAECEF' },
  appActionMutedTxt:{ fontSize: 13, color: theme.color.success, fontWeight: '600' },
  contractDownloadLink: { paddingVertical: 4, paddingHorizontal: 8 },
  contractDownloadLinkTxt: { fontSize: 13, color: ACCENT, fontWeight: '700' },

  contractActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF8E6',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
  },
  contractActionTitle: { fontSize: 13, fontWeight: '700', color: theme.color.ink },
  contractActionSub: { fontSize: 11, color: theme.color.muted, marginTop: 2 },
  contractActionBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  contractOutlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: '#fff',
  },
  contractOutlineBtnTxt: { fontSize: 13, fontWeight: '700', color: ACCENT },
  contractPrimaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.color.success,
    minWidth: 88,
    alignItems: 'center',
  },
  contractPrimaryBtnDisabled: { opacity: 0.45 },
  contractPrimaryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  contractPdfModal: { flex: 1, backgroundColor: '#fff' },
  contractPdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
  },
  contractPdfTitle: { fontSize: 16, fontWeight: '700', color: theme.color.ink },
  contractPdfClose: { fontSize: 15, fontWeight: '700', color: ACCENT },

  chatLoadWrap:     { flex: 1, justifyContent: 'center', alignItems: 'center' },

  dateDividerWrap:  { alignItems: 'center', marginVertical: 10 },
  dateDivider:      { fontSize: 11, color: theme.color.muted, backgroundColor: '#E8EAED',
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },

  chatEmpty:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  chatEmptyTitle:   { fontSize: 16, fontWeight: '700', color: theme.color.ink, marginTop: 14 },
  chatEmptySub:     { fontSize: 13, color: theme.color.muted, marginTop: 6 },

  bubbleWrap:       { marginBottom: 4, maxWidth: '75%' },
  bubbleWrapRight:  { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapLeft:   { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:           { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine:       { backgroundColor: ACCENT, borderBottomRightRadius: 4 },
  bubbleTheirs:     { backgroundColor: '#fff', borderBottomLeftRadius: 4,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  bubbleText:       { fontSize: 15, color: theme.color.ink, lineHeight: 21 },
  bubbleTextMine:   { color: '#fff' },
  editedLabel:      { fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 2 },
  editedLabelMine:  { color: 'rgba(255,255,255,0.6)' },
  bubbleMeta:       { fontSize: 11, color: theme.color.muted, marginTop: 3 },
  bubbleMetaRight:  { alignSelf: 'flex-end' },
  bubbleMetaLeft:   { alignSelf: 'flex-start' },

  imgBubble:        { width: 200, height: 160, borderRadius: 14, backgroundColor: '#e0e0e0' },

  videoCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                      borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: ACCENT,
                      maxWidth: 260, gap: 10 },
  videoCardMine:    { backgroundColor: ACCENT, borderColor: 'rgba(255,255,255,0.3)' },
  videoCardIcon:    { width: 38, height: 38, borderRadius: 19, backgroundColor: ACCENT,
                      justifyContent: 'center', alignItems: 'center' },
  videoCardTitle:   { fontSize: 14, fontWeight: '700', color: theme.color.ink },
  videoCardSub:     { fontSize: 12, color: theme.color.muted, marginTop: 1 },

  inputRow:         { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10,
                      paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EAECEF',
                      gap: 8 },
  inputIcon:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FA',
                      justifyContent: 'center', alignItems: 'center' },
  input:            { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 22, paddingHorizontal: 16,
                      paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 15, color: theme.color.ink,
                      maxHeight: 120 },
  sendBtn:          { width: 42, height: 42, borderRadius: 21, backgroundColor: ACCENT,
                      justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled:  { opacity: 0.35 },
  editBubbleBtn:    { padding: 4, marginBottom: 2 },

  editModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center',
                      alignItems: 'center', padding: 24 },
  editModalBox:     { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 440 },
  editModalTitle:   { fontSize: 16, fontWeight: '700', color: theme.color.ink, marginBottom: 12 },
  editModalInput:   { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 12, fontSize: 15,
                      color: theme.color.ink, minHeight: 80, maxHeight: 180 },
  editModalBtns:    { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
  editModalCancel:  { paddingHorizontal: 16, paddingVertical: 10 },
  editModalSave:    { backgroundColor: ACCENT, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },

  imgViewerBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  imgViewerImg:     { width: '90%', height: '80%' },
});
