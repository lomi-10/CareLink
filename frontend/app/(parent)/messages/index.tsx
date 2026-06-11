// app/(parent)/messages/index.tsx
// PHP: messages/get_conversations.php, messages/get_messages.php, messages/send_message.php, messages/upload_image.php, messages/edit_message.php
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConversations, useChat, Conversation, Message } from '@/hooks/shared';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { LoadingSpinner, ConfirmationModal, NotificationModal } from '@/components/shared/';
import { ChatCallOptionsModal } from '@/components/shared/ChatCallOptionsModal';
import { InterviewModal } from '@/components/shared/InterviewModal';
import { theme } from '@/constants/theme';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, GOLD, DARK, MUTED, SUBTLE, GREEN, DANGER, SUCCESS_BG,
} from '@/components/parent/home/parentWarmTheme';
import API_URL from '@/constants/api';
import { applicationContractPdfUrl, applicationSignContractUrl } from '@/constants/applications';
import {
  HireJobPickerModal,
  HireContractTermsModal,
  toYmdInput,
  type HireJobOptionRow,
} from '@/components/parent/hire';
import { s } from './messages.styles';
const ACCENT = BROWN;

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
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F3E3CF' }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
        justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontFamily: FontFamily.fredokaSemiBold }}>{initials}</Text>
    </View>
  );
}

// ─── ConvItem ─────────────────────────────────────────────────────────────────

function ConvItem({ item, onPress, active }: { item: Conversation; onPress: () => void; active: boolean }) {
  return (
    <TouchableOpacity style={[s.convItem, active && s.convItemActive]} onPress={onPress} activeOpacity={0.7}>
      <View style={s.convAvaWrap}>
        <Avatar name={item.partner_name} photo={item.partner_photo} size={48} color={CARAMEL} />
        {item.unread_count > 0 && (
          <View style={s.badge}><Text style={s.badgeTxt}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text></View>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={s.convRow}>
          <Text style={[s.convName, item.unread_count > 0 && { fontFamily: FontFamily.fredokaSemiBold, color: DARK }]} numberOfLines={1}>
            {item.partner_name}
          </Text>
          <Text style={s.convTime}>{timeLabel(item.last_sent_at)}</Text>
        </View>
        {item.job_title && (
          <Text style={s.convJob} numberOfLines={1}>re: {item.job_title}</Text>
        )}
        <Text
          style={[s.convPreview, item.unread_count > 0 && { color: DARK, fontFamily: FontFamily.fredokaSemiBold }]}
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
          {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' âœ“âœ“' : ' âœ“')}
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
          {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' âœ“âœ“' : ' âœ“')}
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
            <Ionicons name="create-outline" size={18} color={MUTED} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
        {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' âœ“âœ“' : ' âœ“')}
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
              <Text style={s.editModalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.editModalSave, !text.trim() && { opacity: 0.4 }]}
              onPress={() => { if (text.trim()) { onSave(text.trim()); onClose(); } }}
              disabled={!text.trim()}
            >
              <Text style={s.editModalSaveTxt}>Save</Text>
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
  const insets = useSafeAreaInsets();
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
  const [hireContractDuration, setHireContractDuration] = useState('Indefinite');
  const [hireConfirmedSalary, setHireConfirmedSalary] = useState('');
  const [hireWorkHours, setHireWorkHours] = useState('');
  const [hireRestDays, setHireRestDays] = useState<string[]>([]);
  const [hireVacationLeave, setHireVacationLeave] = useState(5);
  const [hireSickLeave, setHireSickLeave] = useState(5);
  const [hireSpecialConditions, setHireSpecialConditions] = useState('');
  const [hireOvertimeRate, setHireOvertimeRate] = useState('');
  const [hirePaymentSchedule, setHirePaymentSchedule] = useState('');
  const [hireOtherBenefits, setHireOtherBenefits] = useState('');
  const [hireDebtAgreement, setHireDebtAgreement] = useState('');
  const [hireDeploymentAgreement, setHireDeploymentAgreement] = useState('');
  const [hireTerminationConditions, setHireTerminationConditions] = useState('');
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
        setHireContractDuration('Indefinite');
        setHireConfirmedSalary('');
        setHireWorkHours('');
        setHireRestDays([]);
        setHireVacationLeave(5);
        setHireSickLeave(5);
        setHireSpecialConditions('');
        setHireOvertimeRate('');
        setHirePaymentSchedule('');
        setHireOtherBenefits('');
        setHireDebtAgreement('');
        setHireDeploymentAgreement('');
        setHireTerminationConditions('');
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
    setHireContractDuration('Indefinite');
    setHireConfirmedSalary('');
    setHireWorkHours('');
    setHireRestDays([]);
    setHireVacationLeave(5);
    setHireSickLeave(5);
    setHireSpecialConditions('');
    setHireOvertimeRate('');
    setHirePaymentSchedule('');
    setHireOtherBenefits('');
    setHireDebtAgreement('');
    setHireDeploymentAgreement('');
    setHireTerminationConditions('');
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
    const salary = parseFloat(hireConfirmedSalary.trim());
    if (!hireConfirmedSalary.trim() || isNaN(salary) || salary < 7000) {
      showChatNotif('Confirmed salary must be at least ₱7,000 (RA 10361).', 'warning');
      return;
    }
    if (hireRestDays.length === 0) {
      showChatNotif('Select at least one rest day for the contract.', 'warning');
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
          contract_end_date:      hireContractEndDate.trim(),
          contract_start_date:    hireContractStartDate.trim() || undefined,
          contract_terms_notes:   hireContractNotes.trim() || undefined,
          contract_duration:      hireContractDuration || undefined,
          confirmed_salary:       parseFloat(hireConfirmedSalary.trim()) || undefined,
          work_hours:             hireWorkHours.trim() || undefined,
          rest_days:              hireRestDays.length > 0 ? hireRestDays : undefined,
          vacation_leave_days:    hireVacationLeave,
          sick_leave_days:        hireSickLeave,
          special_conditions:     hireSpecialConditions.trim() || undefined,
          overtime_rate:          hireOvertimeRate.trim() || undefined,
          payment_schedule:       hirePaymentSchedule.trim() || undefined,
          other_benefits:         hireOtherBenefits.trim() || undefined,
          debt_agreement:         hireDebtAgreement.trim() || undefined,
          deployment_agreement:   hireDeploymentAgreement.trim() || undefined,
          termination_conditions: hireTerminationConditions.trim() || undefined,
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
      setHireContractDuration('Indefinite');
      setHireConfirmedSalary('');
      setHireWorkHours('');
      setHireRestDays([]);
      setHireVacationLeave(5);
      setHireSickLeave(5);
      setHireSpecialConditions('');
      setHireOvertimeRate('');
      setHirePaymentSchedule('');
      setHireOtherBenefits('');
      setHireDebtAgreement('');
      setHireDeploymentAgreement('');
      setHireTerminationConditions('');
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
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
        )}
        <Avatar name={partnerName} photo={partnerPhoto} size={38} color={CARAMEL} />
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
            Application Â· {resolvedApp.status}
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
              Employer: {resolvedApp.employer_signed_at ? 'Signed' : 'Not signed'} Â· Helper:{' '}
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
          <Ionicons name="checkmark-circle" size={18} color={GREEN} />
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
            <Ionicons name="chatbubbles-outline" size={52} color={SUBTLE} />
            <Text style={s.chatEmptyTitle}>No messages yet</Text>
            <Text style={s.chatEmptySub}>Say hello to {partnerName}!</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={[s.inputRow, Platform.OS === 'android' && insets.bottom > 0 && { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={s.inputIcon} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={22} color={MUTED} />
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a messageâ€¦"
          placeholderTextColor={SUBTLE}
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
        helperName={partnerName ? decodeURIComponent(String(partnerName)) : ''}
        contractStartDate={hireContractStartDate}
        contractEndDate={hireContractEndDate}
        contractNotes={hireContractNotes}
        contractDuration={hireContractDuration}
        confirmedSalary={hireConfirmedSalary}
        overtimeRate={hireOvertimeRate}
        paymentSchedule={hirePaymentSchedule}
        workHours={hireWorkHours}
        restDays={hireRestDays}
        vacationLeaveDays={hireVacationLeave}
        sickLeaveDays={hireSickLeave}
        specialConditions={hireSpecialConditions}
        otherBenefits={hireOtherBenefits}
        debtAgreement={hireDebtAgreement}
        deploymentAgreement={hireDeploymentAgreement}
        terminationConditions={hireTerminationConditions}
        onChangeStart={setHireContractStartDate}
        onChangeEnd={setHireContractEndDate}
        onChangeNotes={setHireContractNotes}
        onChangeContractDuration={setHireContractDuration}
        onChangeSalary={setHireConfirmedSalary}
        onChangeOvertimeRate={setHireOvertimeRate}
        onChangePaymentSchedule={setHirePaymentSchedule}
        onChangeWorkHours={setHireWorkHours}
        onToggleRestDay={(day) => setHireRestDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])}
        onChangeVacationLeave={setHireVacationLeave}
        onChangeSickLeave={setHireSickLeave}
        onChangeSpecialConditions={setHireSpecialConditions}
        onChangeOtherBenefits={setHireOtherBenefits}
        onChangeDebtAgreement={setHireDebtAgreement}
        onChangeDeploymentAgreement={setHireDeploymentAgreement}
        onChangeTerminationConditions={setHireTerminationConditions}
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
          setHireContractDuration('Indefinite');
          setHireConfirmedSalary('');
          setHireWorkHours('');
          setHireRestDays([]);
          setHireVacationLeave(5);
          setHireSickLeave(5);
          setHireSpecialConditions('');
          setHireOvertimeRate('');
          setHirePaymentSchedule('');
          setHireOtherBenefits('');
          setHireDebtAgreement('');
          setHireDeploymentAgreement('');
          setHireTerminationConditions('');
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
        <Ionicons name="search" size={16} color={MUTED} style={{ marginRight: 6 }} />
        <TextInput
          style={s.convSearchInput}
          value={convSearch}
          onChangeText={setConvSearch}
          placeholder="Search conversation"
          placeholderTextColor={SUBTLE}
        />
        {convSearch.length > 0 && (
          <TouchableOpacity onPress={() => setConvSearch('')}>
            <Ionicons name="close-circle" size={16} color={SUBTLE} />
          </TouchableOpacity>
        )}
      </View>

      {loadingConvs ? (
        <LoadingSpinner visible />
      ) : filteredConvs.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="chatbubbles-outline" size={52} color={SUBTLE} />
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
      <View style={{ flex: 1, backgroundColor: BG }}>
        {!activePartner ? (
          <SafeAreaView style={{ flex: 1 }}>
            <View style={s.mobileHeader}>
              <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={s.menuBtn}>
                <Ionicons name="menu-outline" size={26} color={DARK} />
              </TouchableOpacity>
              <Text style={s.mobileTitle}>Messages</Text>
              <TouchableOpacity
                style={[s.menuBtn, { position: 'relative' }]}
                onPress={() => router.push('/(parent)/notifications')}
                activeOpacity={0.8}
              >
                <Ionicons name={notifUnread > 0 ? 'notifications' : 'notifications-outline'} size={24} color={BROWN} />
                {notifUnread > 0 && (
                  <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7,
                    backgroundColor: CARAMEL, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                    <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>
                      {notifUnread > 9 ? '9+' : notifUnread}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={s.contractFlowHintBar}>
              <Ionicons name="document-text-outline" size={14} color={MUTED} />
              <Text style={s.contractFlowHintText}>
                After you message a helper and agree on terms, the next step is generating your employment contract.
              </Text>
            </View>
            {ConvList}
          </SafeAreaView>
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
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
            <Ionicons name="document-text-outline" size={14} color={MUTED} />
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