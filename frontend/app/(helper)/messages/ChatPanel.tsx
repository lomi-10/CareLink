// app/(helper)/messages/ChatPanel.tsx
import React, { useState, useEffect, useRef, useCallback, createElement } from 'react';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal,
  Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat, Message } from '@/hooks/shared';
import { ConfirmationModal, NotificationModal, PasswordConfirmModal, RequestContractChangesModal } from '@/components/shared/';
import API_URL from '@/constants/api';
import {
  applicationContractPdfUrl, applicationSignContractUrl,
  requestContractChangesUrl,
} from '@/constants/applications';
import { ChatCallOptionsModal, HelperInterviewRequestModal } from '@/components/shared/ChatCallOptionsModal';
import { DARK, MUTED, ORANGE, BLUE } from './messages.styles';
import { useMessagesAppearance } from './messagesAppearance';
import { ResolvedApplication } from './helpers';
import { Avatar } from './components';
import MessagesTab from './MessagesTab';
import ContractTab from './ContractTab';
import InterviewTab from './InterviewTab';
import VideoCallTab from './VideoCallTab';

export default function ChatPanel({
  partnerId, partnerName, partnerPhoto, jobPostId, onBack,
}: {
  partnerId: number; partnerName: string; partnerPhoto?: string | null;
  jobPostId?: number | null; onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { s } = useMessagesAppearance();
  const { messages, loading, sending, myUserId, sendMessage, editMessage, sendImage, sendVideoCall, fetchMessages } = useChat(partnerId);
  const [text, setText]                   = useState('');
  const [editTarget, setEditTarget]       = useState<Message | null>(null);
  const [viewerUri,  setViewerUri]        = useState<string | null>(null);
  const [callModal, setCallModal]         = useState(false);
  const [helperScheduleModal, setHelperScheduleModal] = useState(false);
  const [resolvedApp, setResolvedApp] = useState<ResolvedApplication | null>(null);
  const isHired = !!resolvedApp && ['hired', 'Accepted', 'termination_pending'].includes(resolvedApp.status);
  const [contractAction, setContractAction] = useState(false);
  const [contractPdfVisible, setContractPdfVisible] = useState(false);
  const [contractPdfUri, setContractPdfUri] = useState<string | null>(null);
  const [signConfirmVisible, setSignConfirmVisible] = useState(false);
  const [signPasswordVisible, setSignPasswordVisible] = useState(false);
  const [debtAckVisible, setDebtAckVisible] = useState(false);
  const [debtAcknowledged, setDebtAcknowledged] = useState(false);
  const [disagreeModalVisible, setDisagreeModalVisible] = useState(false);
  const [disagreeBusy, setDisagreeBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'contract' | 'interview' | 'videocall'>('messages');
  const [cancelInterviewConfirmVisible, setCancelInterviewConfirmVisible] = useState(false);
  const [interviewActionLoading, setInterviewActionLoading] = useState(false);
  const [chatNotif, setChatNotif] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ visible: false, message: '', type: 'info' });
  const flatRef = useRef<FlatList>(null);

  const showChatNotif = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setChatNotif({ visible: true, message, type });
  };

  const loadResolvedApp = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/helper/my_applications.php?helper_id=${user.user_id}&requester_id=${user.user_id}`);
      const data = await res.json();
      if (!data.success) return;
      const apps = data.applications ?? [];
      const match =
        apps.find(
          (a: { parent_id?: string; job_post_id: string | number }) =>
            Number(a.parent_id) === Number(partnerId) &&
            (jobPostId ? Number(a.job_post_id) === Number(jobPostId) : true),
        ) ??
        apps.find((a: { parent_id?: string }) => Number(a.parent_id) === Number(partnerId));
      if (match) {
        setResolvedApp({
          application_id: Number(match.application_id),
          job_title: String(match.job_title ?? ''),
          status: String(match.status ?? ''),
          job_post_id: Number(match.job_post_id),
          employer_signed_at: match.employer_signed_at ?? null,
          helper_signed_at: match.helper_signed_at ?? null,
          helper_decline_reason: match.helper_decline_reason ?? null,
          helper_decline_at: match.helper_decline_at ?? null,
          contract_generated_at: match.contract_generated_at ?? null,
          confirmed_salary: match.confirmed_salary !== null && match.confirmed_salary !== undefined ? Number(match.confirmed_salary) : null,
          work_hours: match.work_hours ?? null,
          rest_days: Array.isArray(match.rest_days) ? match.rest_days : [],
          employment_start_date: match.employment_start_date ?? null,
          employment_end_date: match.employment_end_date ?? null,
          contract_duration: match.contract_duration ?? null,
          payment_schedule: match.payment_schedule ?? null,
          other_benefits: match.other_benefits ?? null,
          pdf_file_path: match.pdf_file_path ?? null,
          interview_id: match.interview_id !== null && match.interview_id !== undefined ? Number(match.interview_id) : null,
          interview_date: match.interview_date ?? null,
          interview_type: match.interview_type ?? null,
          location_or_link: match.location_or_link ?? null,
          interview_status: match.interview_status ?? null,
          parent_confirmed: !!match.parent_confirmed,
          helper_confirmed: !!match.helper_confirmed,
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

  useEffect(() => {
    if (messages.length > 0) flatRef.current?.scrollToEnd({ animated: false });
  }, [messages.length]);

  useEffect(() => {
    setActiveTab('messages');
  }, [partnerId]);

  useEffect(() => {
    if (isHired) setActiveTab(prev => prev === 'interview' ? 'messages' : prev);
  }, [isHired]);

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

  const openReviewContract = async () => {
    if (!resolvedApp) return;
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const uri = applicationContractPdfUrl(resolvedApp.application_id, Number(user.user_id), 'helper');
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
    setContractAction(true);
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
          user_type:      'helper',
          debt_acknowledged: debtAcknowledged,
        }),
      });
      const data = await res.json() as { success?: boolean; message?: string; hire_finalized?: boolean };
      if (!data.success) throw new Error(data.message || 'Sign failed');
      await loadResolvedApp();
      fetchMessages();
      showChatNotif(
        data.hire_finalized
          ? 'Contract confirmed. You are now hired.'
          : 'Your signature was recorded. Waiting for the employer to confirm.',
        data.hire_finalized ? 'success' : 'info',
      );
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not sign', 'error');
    } finally {
      setDebtAcknowledged(false);
      setContractAction(false);
    }
  };

  const submitDisagree = async (reason: string) => {
    if (!resolvedApp) return;
    setDisagreeBusy(true);
    try {
      const res = await fetch(requestContractChangesUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: resolvedApp.application_id,
          helper_id:      myUserId,
          reason,
        }),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!data.success) throw new Error(data.message || 'Could not send your request');
      setDisagreeModalVisible(false);
      await loadResolvedApp();
      fetchMessages();
      showChatNotif('Your request has been sent to the employer.', 'success');
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not send your request', 'error');
    } finally {
      setDisagreeBusy(false);
    }
  };

  const executeCancelInterview = async () => {
    if (!resolvedApp?.interview_id) return;
    setCancelInterviewConfirmVisible(false);
    setInterviewActionLoading(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/interviews/cancel.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_id: resolvedApp.interview_id, user_id: user.user_id }),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!data.success) throw new Error(data.message || 'Could not cancel interview');
      await loadResolvedApp();
      fetchMessages();
      showChatNotif('Interview cancelled.', 'info');
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not cancel interview', 'error');
    } finally {
      setInterviewActionLoading(false);
    }
  };

  const executeConfirmInterview = async (action: 'confirm' | 'decline') => {
    if (!resolvedApp?.interview_id) return;
    setInterviewActionLoading(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/interviews/confirm.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_id: resolvedApp.interview_id, user_id: user.user_id, action }),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!data.success) throw new Error(data.message || 'Could not update interview');
      await loadResolvedApp();
      fetchMessages();
      showChatNotif(action === 'confirm' ? 'Interview confirmed.' : 'Interview declined.',
        action === 'confirm' ? 'success' : 'info');
    } catch (e: any) {
      showChatNotif(e.message ?? 'Could not update interview', 'error');
    } finally {
      setInterviewActionLoading(false);
    }
  };

  const contractNeedsAction =
    !!resolvedApp &&
    resolvedApp.status === 'contract_pending' &&
    !resolvedApp.helper_signed_at &&
    !resolvedApp.helper_decline_reason;

  const interviewNeedsAction =
    !!resolvedApp?.interview_id &&
    resolvedApp.interview_status === 'Scheduled' &&
    !resolvedApp.helper_confirmed;

  const interviewUpcoming =
    !!resolvedApp?.interview_date &&
    resolvedApp.interview_status !== 'Cancelled' &&
    resolvedApp.interview_status !== 'Completed' &&
    new Date(resolvedApp.interview_date).getTime() > Date.now();

  const interviewBadge = interviewNeedsAction || interviewUpcoming;

  if (loading) {
    return (
      <View style={s.chatLoadWrap}>
        <ActivityIndicator color={ORANGE} size="large" />
      </View>
    );
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
        <Avatar name={partnerName} photo={partnerPhoto} size={38} color={BLUE} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={s.chatHeaderName} numberOfLines={1}>{partnerName}</Text>
          {jobPostId && <Text style={s.chatHeaderSub}>Job #{jobPostId}</Text>}
        </View>
        <TouchableOpacity style={s.callBtn} onPress={() => setCallModal(true)}>
          <Ionicons name="videocam" size={20} color={ORANGE} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={s.chatTabBar}>
        <TouchableOpacity style={[s.chatTabBtn, activeTab === 'messages' && s.chatTabBtnActive]} onPress={() => setActiveTab('messages')}>
          <Ionicons name="chatbubbles-outline" size={16} color={activeTab === 'messages' ? '#fff' : MUTED} />
          <Text style={[s.chatTabBtnText, activeTab === 'messages' && s.chatTabBtnTextActive]}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.chatTabBtn, activeTab === 'contract' && s.chatTabBtnActive]} onPress={() => setActiveTab('contract')}>
          <Ionicons name="document-text-outline" size={16} color={activeTab === 'contract' ? '#fff' : MUTED} />
          <Text style={[s.chatTabBtnText, activeTab === 'contract' && s.chatTabBtnTextActive]}>Contract</Text>
          {contractNeedsAction && <View style={[s.chatTabDot, s.chatTabDotAmber]} />}
        </TouchableOpacity>
        {isHired ? (
          <TouchableOpacity style={[s.chatTabBtn, activeTab === 'videocall' && s.chatTabBtnActive]} onPress={() => setActiveTab('videocall')}>
            <Ionicons name="videocam-outline" size={16} color={activeTab === 'videocall' ? '#fff' : MUTED} />
            <Text style={[s.chatTabBtnText, activeTab === 'videocall' && s.chatTabBtnTextActive]}>Video Call</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.chatTabBtn, activeTab === 'interview' && s.chatTabBtnActive]} onPress={() => setActiveTab('interview')}>
            <Ionicons name="calendar-outline" size={16} color={activeTab === 'interview' ? '#fff' : MUTED} />
            <Text style={[s.chatTabBtnText, activeTab === 'interview' && s.chatTabBtnTextActive]}>Interview</Text>
            {interviewBadge && <View style={[s.chatTabDot, s.chatTabDotBlue]} />}
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'messages' && (
        <MessagesTab
          messages={messages}
          myUserId={myUserId}
          sending={sending}
          partnerName={partnerName}
          flatRef={flatRef}
          text={text}
          setText={setText}
          handleSend={handleSend}
          handlePickImage={handlePickImage}
          editTarget={editTarget}
          setEditTarget={setEditTarget}
          viewerUri={viewerUri}
          setViewerUri={setViewerUri}
          editMessage={editMessage}
          insets={insets}
        />
      )}

      {activeTab === 'contract' && (
        <ContractTab
          resolvedApp={resolvedApp}
          contractAction={contractAction}
          onReviewContract={openReviewContract}
          onDisagree={() => setDisagreeModalVisible(true)}
          onAgree={() => {
            if ((resolvedApp?.debt_amount ?? 0) > 0) {
              setDebtAckVisible(true);
            } else {
              setSignConfirmVisible(true);
            }
          }}
        />
      )}

      {activeTab === 'interview' && !isHired && (
        <InterviewTab
          resolvedApp={resolvedApp}
          partnerName={partnerName}
          interviewActionLoading={interviewActionLoading}
          onPropose={() => setHelperScheduleModal(true)}
          onConfirm={() => executeConfirmInterview('confirm')}
          onDecline={() => executeConfirmInterview('decline')}
          onCancel={() => setCancelInterviewConfirmVisible(true)}
        />
      )}

      {activeTab === 'videocall' && isHired && (
        <VideoCallTab
          partnerName={partnerName}
          onStartCall={async () => {
            const url = await sendVideoCall(myUserId, jobPostId);
            if (url) Linking.openURL(url);
          }}
        />
      )}

      <ChatCallOptionsModal
        visible={callModal}
        onClose={() => setCallModal(false)}
        accent={ORANGE}
        partnerName={partnerName}
        onScheduleInterview={() => setHelperScheduleModal(true)}
        onConfirmStartVideo={async () => {
          const url = await sendVideoCall(myUserId, jobPostId);
          if (url) Linking.openURL(url);
        }}
      />
      <HelperInterviewRequestModal
        visible={helperScheduleModal}
        onClose={() => setHelperScheduleModal(false)}
        accent={ORANGE}
        partnerName={partnerName}
        jobPostId={jobPostId ?? null}
        helperId={myUserId}
        parentId={partnerId}
        onDone={() => { fetchMessages(); }}
      />

      <ConfirmationModal
        visible={debtAckVisible}
        title="Debt / deployment terms"
        message={
          `This contract includes a debt or deployment-cost obligation of ₱${Number(resolvedApp?.debt_amount ?? 0).toLocaleString()}` +
          (resolvedApp?.debt_agreement ? `: ${resolvedApp.debt_agreement}` : '') +
          '\n\nBy continuing, you confirm you understand and accept this obligation. If you do not understand or do not agree, do not continue — you can discuss this with the employer or contact CareLink support first.'
        }
        confirmText="I understand and accept"
        cancelText="Not yet"
        type="warning"
        onConfirm={() => {
          setDebtAcknowledged(true);
          setDebtAckVisible(false);
          setSignConfirmVisible(true);
        }}
        onCancel={() => setDebtAckVisible(false)}
      />
      <ConfirmationModal
        visible={signConfirmVisible}
        title="Confirm agreement"
        message="By confirming, you agree to the terms of this contract. This cannot be undone."
        confirmText="Confirm"
        cancelText="Cancel"
        type="warning"
        onConfirm={() => {
          setSignConfirmVisible(false);
          setSignPasswordVisible(true);
        }}
        onCancel={() => setSignConfirmVisible(false)}
      />
      <PasswordConfirmModal
        visible={signPasswordVisible}
        onConfirmed={() => {
          setSignPasswordVisible(false);
          void executeSignContract();
        }}
        onCancel={() => setSignPasswordVisible(false)}
      />
      <RequestContractChangesModal
        visible={disagreeModalVisible}
        onClose={() => setDisagreeModalVisible(false)}
        onSubmit={(reason) => { void submitDisagree(reason); }}
        busy={disagreeBusy}
      />
      <ConfirmationModal
        visible={cancelInterviewConfirmVisible}
        title="Cancel interview?"
        message="The employer will be notified that this interview is cancelled."
        confirmText="Cancel interview"
        cancelText="Keep interview"
        type="danger"
        onConfirm={() => { void executeCancelInterview(); }}
        onCancel={() => setCancelInterviewConfirmVisible(false)}
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
