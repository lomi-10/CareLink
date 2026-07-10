// app/(parent)/messages/ChatPanel.tsx
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
import { ConfirmationModal, NotificationModal, PasswordConfirmModal } from '@/components/shared/';
import { ChatCallOptionsModal } from '@/components/shared/ChatCallOptionsModal';
import { InterviewModal, type InterviewInfo } from '@/components/shared/InterviewModal';
import API_URL from '@/constants/api';
import { applicationContractPdfUrl, applicationSignContractUrl } from '@/constants/applications';
import { HireJobPickerModal, HireContractTermsModal } from '@/components/parent/hire';
import { CARAMEL, DARK, MUTED } from '@/components/parent/home/parentWarmTheme';
import { s, ACCENT } from './messages.styles';
import { ResolvedApplication } from './helpers';
import { Avatar } from './components';
import MessagesTab from './MessagesTab';
import ContractTab from './ContractTab';
import InterviewTab from './InterviewTab';
import VideoCallTab from './VideoCallTab';
import { useHireFlow } from './useHireFlow';

export default function ChatPanel({
  partnerId, partnerName, partnerPhoto, jobPostId, onBack,
}: {
  partnerId: number; partnerName: string; partnerPhoto?: string | null;
  jobPostId?: number | null; onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { messages, loading, sending, sendError, clearSendError, myUserId, sendMessage, editMessage, sendImage, sendVideoCall, fetchMessages } = useChat(partnerId);
  const [text, setText]             = useState('');
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [viewerUri, setViewerUri]   = useState<string | null>(null);
  const [callModal, setCallModal]   = useState(false);
  const [interviewModalVisible, setInterviewModalVisible] = useState(false);
  const [interviewAppId, setInterviewAppId] = useState(0);
  const [interviewJobTitle, setInterviewJobTitle] = useState('');
  const [interviewExisting, setInterviewExisting] = useState<InterviewInfo | null>(null);
  const [cancelInterviewConfirmVisible, setCancelInterviewConfirmVisible] = useState(false);
  const [interviewActionLoading, setInterviewActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'contract' | 'interview' | 'videocall'>('messages');
  const [resolvedApp, setResolvedApp] = useState<ResolvedApplication | null>(null);
  const isHired = !!resolvedApp && ['hired', 'Accepted', 'termination_pending'].includes(resolvedApp.status);
  const [hiringAction, setHiringAction] = useState(false);
  const [contractPdfVisible, setContractPdfVisible] = useState(false);
  const [contractPdfUri, setContractPdfUri] = useState<string | null>(null);
  const [signConfirmVisible, setSignConfirmVisible] = useState(false);
  const [signPasswordVisible, setSignPasswordVisible] = useState(false);
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
      const res  = await fetch(`${API_URL}/parent/get_job_applications.php?parent_id=${user.user_id}&requester_id=${user.user_id}`);
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
          helper_decline_reason: match.helper_decline_reason ?? null,
          helper_decline_at: match.helper_decline_at ?? null,
          contract_generated_at: match.contract_generated_at ?? null,
          confirmed_salary: match.confirmed_salary !== null && match.confirmed_salary !== undefined
            ? Number(match.confirmed_salary) : null,
          work_hours: match.work_hours ?? null,
          rest_days: Array.isArray(match.rest_days) ? match.rest_days : [],
          employment_start_date: match.employment_start_date ?? null,
          employment_end_date: match.employment_end_date ?? null,
          contract_duration: match.contract_duration ?? null,
          payment_schedule: match.payment_schedule ?? null,
          other_benefits: match.other_benefits ?? null,
          pdf_file_path: match.pdf_file_path ?? null,
          interview_id: match.interview_id !== null && match.interview_id !== undefined
            ? Number(match.interview_id) : null,
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

  // ChatPanel isn't remounted when switching conversations on desktop — reset to Messages tab.
  useEffect(() => {
    setActiveTab('messages');
  }, [partnerId]);

  useEffect(() => {
    if (isHired) setActiveTab(prev => prev === 'interview' ? 'messages' : prev);
  }, [isHired]);

  // Surface a blocked send (e.g. this helper is already hired by someone else).
  useEffect(() => {
    if (sendError) { showChatNotif(sendError, 'warning'); clearSendError(); }
  }, [sendError]); // eslint-disable-line react-hooks/exhaustive-deps

  const contractNeedsAction =
    !!resolvedApp &&
    resolvedApp.status === 'contract_pending' &&
    (!!resolvedApp.helper_decline_reason || !resolvedApp.employer_signed_at);

  const interviewUpcoming =
    !!resolvedApp?.interview_date &&
    resolvedApp.interview_status !== 'Cancelled' &&
    resolvedApp.interview_status !== 'Completed' &&
    new Date(resolvedApp.interview_date).getTime() > Date.now();

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
      const res  = await fetch(`${API_URL}/parent/get_job_applications.php?parent_id=${user.user_id}&requester_id=${user.user_id}`);
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
      setInterviewExisting(null);
      setInterviewModalVisible(true);
    } catch (e: any) {
      showChatNotif(e.message || 'Could not load applications', 'error');
    }
  };

  const openScheduleInterviewForResolvedApp = () => {
    if (!resolvedApp) { void openParentScheduleInterview(); return; }
    setInterviewAppId(resolvedApp.application_id);
    setInterviewJobTitle(resolvedApp.job_title || 'Position');
    setInterviewExisting(null);
    setInterviewModalVisible(true);
  };

  const openRescheduleInterview = () => {
    if (!resolvedApp) return;
    setInterviewAppId(resolvedApp.application_id);
    setInterviewJobTitle(resolvedApp.job_title || 'Position');
    setInterviewExisting({
      interview_id: resolvedApp.interview_id ?? undefined,
      interview_date: resolvedApp.interview_date ?? undefined,
      interview_type: resolvedApp.interview_type ?? undefined,
      location_or_link: resolvedApp.location_or_link ?? undefined,
      status: resolvedApp.interview_status ?? undefined,
    });
    setInterviewModalVisible(true);
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

  const {
    contractFlowMode,
    hirePickVisible, setHirePickVisible,
    hirePickHelperName,
    hirePickApps,
    hirePickSelectedId, setHirePickSelectedId,
    hirePayload, setHirePayload,
    hireTermsVisible, setHireTermsVisible,
    hireContractStartDate, setHireContractStartDate,
    hireContractType, setHireContractType,
    hireDurationAmount, setHireDurationAmount,
    hireDurationUnit, setHireDurationUnit,
    hireContractNotes, setHireContractNotes,
    hireConfirmedSalary, setHireConfirmedSalary,
    hireWorkSchedule, setHireWorkSchedule,
    hireWorkHoursStart, setHireWorkHoursStart,
    hireWorkHoursEnd, setHireWorkHoursEnd,
    hireFlexibleHours, setHireFlexibleHours,
    hireRestDays, setHireRestDays,
    hireVacationLeave, setHireVacationLeave,
    hireSickLeave, setHireSickLeave,
    hireSpecialConditions, setHireSpecialConditions,
    hireOvertimeRate, setHireOvertimeRate,
    hirePaymentSchedule, setHirePaymentSchedule,
    hireOtherBenefits, setHireOtherBenefits,
    hireDebtAgreement, setHireDebtAgreement,
    hireDebtAmount, setHireDebtAmount,
    hireDeploymentAgreement, setHireDeploymentAgreement,
    hireTerminationConditions, setHireTerminationConditions,
    hireContractEndDate,
    resetHireFormState,
    hireConfirmVisible, setHireConfirmVisible,
    rejectConfirmVisible, setRejectConfirmVisible,
    beginHireFlow, confirmHireJobSelection, beginEditContractFlow, confirmHireTerms,
    executeHire, executeEditContract, openRejectConfirm, executeReject,
  } = useHireFlow({
    resolvedApp, setResolvedApp, partnerId, partnerName,
    setHiringAction, fetchMessages, loadResolvedApp, showChatNotif,
  });

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

      {/* Tabs */}
      <View style={s.chatTabBar}>
        <TouchableOpacity
          style={[s.chatTabBtn, activeTab === 'messages' && s.chatTabBtnActive]}
          onPress={() => setActiveTab('messages')}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={activeTab === 'messages' ? '#fff' : MUTED} />
          <Text style={[s.chatTabBtnText, activeTab === 'messages' && s.chatTabBtnTextActive]}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.chatTabBtn, activeTab === 'contract' && s.chatTabBtnActive]}
          onPress={() => setActiveTab('contract')}
        >
          <Ionicons name="document-text-outline" size={16} color={activeTab === 'contract' ? '#fff' : MUTED} />
          <Text style={[s.chatTabBtnText, activeTab === 'contract' && s.chatTabBtnTextActive]}>Contract</Text>
          {contractNeedsAction && <View style={[s.chatTabDot, s.chatTabDotAmber]} />}
        </TouchableOpacity>
        {isHired ? (
          <TouchableOpacity
            style={[s.chatTabBtn, activeTab === 'videocall' && s.chatTabBtnActive]}
            onPress={() => setActiveTab('videocall')}
          >
            <Ionicons name="videocam-outline" size={16} color={activeTab === 'videocall' ? '#fff' : MUTED} />
            <Text style={[s.chatTabBtnText, activeTab === 'videocall' && s.chatTabBtnTextActive]}>Video Call</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.chatTabBtn, activeTab === 'interview' && s.chatTabBtnActive]}
            onPress={() => setActiveTab('interview')}
          >
            <Ionicons name="calendar-outline" size={16} color={activeTab === 'interview' ? '#fff' : MUTED} />
            <Text style={[s.chatTabBtnText, activeTab === 'interview' && s.chatTabBtnTextActive]}>Interview</Text>
            {interviewUpcoming && <View style={[s.chatTabDot, s.chatTabDotBlue]} />}
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
          hiringAction={hiringAction}
          onReviewContract={openReviewContract}
          onEditTerms={beginEditContractFlow}
          onHire={beginHireFlow}
          onReject={openRejectConfirm}
          onAgree={() => setSignConfirmVisible(true)}
        />
      )}

      {activeTab === 'interview' && !isHired && (
        <InterviewTab
          resolvedApp={resolvedApp}
          partnerName={partnerName}
          interviewActionLoading={interviewActionLoading}
          onSchedule={openScheduleInterviewForResolvedApp}
          onReschedule={openRescheduleInterview}
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
        existing={interviewExisting}
        onScheduled={() => { fetchMessages(); void loadResolvedApp(); }}
      />

      <HireContractTermsModal
        visible={hireTermsVisible}
        jobTitle={hirePayload?.job_title ?? resolvedApp?.job_title ?? 'this job'}
        helperName={partnerName ? decodeURIComponent(String(partnerName)) : ''}
        workSchedule={hireWorkSchedule}
        contractStartDate={hireContractStartDate}
        onChangeStart={setHireContractStartDate}
        contractType={hireContractType}
        onChangeContractType={setHireContractType}
        durationAmount={hireDurationAmount}
        onChangeDurationAmount={setHireDurationAmount}
        durationUnit={hireDurationUnit}
        onChangeDurationUnit={setHireDurationUnit}
        confirmedSalary={hireConfirmedSalary}
        onChangeSalary={setHireConfirmedSalary}
        paymentSchedule={hirePaymentSchedule}
        onChangePaymentSchedule={setHirePaymentSchedule}
        workHoursStart={hireWorkHoursStart}
        workHoursEnd={hireWorkHoursEnd}
        onChangeWorkHoursStart={setHireWorkHoursStart}
        onChangeWorkHoursEnd={setHireWorkHoursEnd}
        flexibleHours={hireFlexibleHours}
        onChangeFlexibleHours={setHireFlexibleHours}
        restDays={hireRestDays}
        onToggleRestDay={(day) => setHireRestDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])}
        vacationLeaveDays={hireVacationLeave}
        sickLeaveDays={hireSickLeave}
        onChangeVacationLeave={setHireVacationLeave}
        onChangeSickLeave={setHireSickLeave}
        overtimeRate={hireOvertimeRate}
        onChangeOvertimeRate={setHireOvertimeRate}
        otherBenefits={hireOtherBenefits}
        onChangeOtherBenefits={setHireOtherBenefits}
        debtAgreement={hireDebtAgreement}
        onChangeDebtAgreement={setHireDebtAgreement}
        debtAmount={hireDebtAmount}
        onChangeDebtAmount={setHireDebtAmount}
        deploymentAgreement={hireDeploymentAgreement}
        onChangeDeploymentAgreement={setHireDeploymentAgreement}
        terminationConditions={hireTerminationConditions}
        onChangeTerminationConditions={setHireTerminationConditions}
        specialConditions={hireSpecialConditions}
        onChangeSpecialConditions={setHireSpecialConditions}
        contractNotes={hireContractNotes}
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
        title={contractFlowMode === 'edit' ? 'Update employment contract?' : 'Start employment contract?'}
        message={resolvedApp
          ? contractFlowMode === 'edit'
            ? `Update the contract for "${hirePayload?.job_title ?? resolvedApp.job_title}" ${hireContractType === 'Indefinite' ? 'with no fixed end date (Indefinite)' : `ending ${hireContractEndDate || '(set date)'}`}. Both you and the helper will need to review and confirm again.`
            : `Create a draft contract for "${hirePayload?.job_title ?? resolvedApp.job_title}" ${hireContractType === 'Indefinite' ? 'with no fixed end date (Indefinite)' : `ending ${hireContractEndDate || '(set date)'}`}. The hire is not final until you and the helper both review and confirm.`
          : ''}
        confirmText="Continue"
        cancelText="Cancel"
        type="default"
        onConfirm={() => { if (contractFlowMode === 'edit') { void executeEditContract(); } else { void executeHire(); } }}
        onCancel={() => {
          setHireConfirmVisible(false);
          setHirePayload(null);
          setHireContractStartDate('');
          setHireConfirmedSalary('');
          setHireWorkSchedule('Full-time');
          resetHireFormState();
        }}
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
      <ConfirmationModal
        visible={cancelInterviewConfirmVisible}
        title="Cancel interview?"
        message="The helper will be notified that this interview is cancelled."
        confirmText="Cancel Interview"
        cancelText="Keep It"
        type="danger"
        onConfirm={() => { void executeCancelInterview(); }}
        onCancel={() => setCancelInterviewConfirmVisible(false)}
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
