// app/(helper)/messages.tsx
import React, { useMemo, useState, useEffect, useRef, useCallback, createElement } from 'react';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, ScrollView, Modal,
  Linking, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useConversations, useChat, Conversation, Message } from '@/hooks/shared';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { Sidebar, MobileMenu, HelperTabBar } from '@/components/helper/home';
import { WorkModeTabBar } from '@/components/helper/work';
import { LoadingSpinner, ConfirmationModal, NotificationModal } from '@/components/shared/';
import API_URL from '@/constants/api';
import { applicationContractPdfUrl, applicationSignContractUrl } from '@/constants/applications';
import { ChatCallOptionsModal, HelperInterviewRequestModal } from '@/components/shared/ChatCallOptionsModal';
import type { ThemeColor } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { createHelperMessagesStyles } from './messages.styles';

type MessagesAppearanceValue = {
  s: ReturnType<typeof createHelperMessagesStyles>;
  c: ThemeColor;
  accent: string;
};
const MessagesAppearanceContext = React.createContext<MessagesAppearanceValue | null>(null);

function useMessagesAppearance(): MessagesAppearanceValue {
  const v = React.useContext(MessagesAppearanceContext);
  if (!v) throw new Error('Messages appearance unavailable');
  return v;
}

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
  const { accent } = useMessagesAppearance();
  const bg = color ?? accent;
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
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// ─── ConvItem ─────────────────────────────────────────────────────────────────

function ConvItem({ item, onPress, active }: { item: Conversation; onPress: () => void; active: boolean }) {
  const { s, c } = useMessagesAppearance();
  return (
    <TouchableOpacity style={[s.convItem, active && s.convItemActive]} onPress={onPress} activeOpacity={0.7}>
      <View style={s.convAvaWrap}>
        <Avatar name={item.partner_name} photo={item.partner_photo} size={48} color={c.parent} />
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
        <Text style={[s.convPreview, item.unread_count > 0 && { color: c.ink, fontWeight: '600' }]} numberOfLines={1}>
          {item.is_mine ? 'You: ' : ''}
          {item.last_message || 'Photo'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── ImageViewer Modal ────────────────────────────────────────────────────────

function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { s } = useMessagesAppearance();
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
  const { s, c, accent } = useMessagesAppearance();
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
          <View style={s.videoCardIcon}>
            <Ionicons name="videocam" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.videoCardTitle, isMine && { color: '#fff' }]}>Video Call Invitation</Text>
            <Text style={[s.videoCardSub, isMine && { color: 'rgba(255,255,255,0.85)' }]}>Tap to join the call</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isMine ? 'rgba(255,255,255,0.7)' : accent} />
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
          <Image
            source={{ uri: msg.image_url }}
            style={s.imgBubble}
            resizeMode="cover"
          />
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
            <Ionicons name="create-outline" size={18} color={c.muted} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
        {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
      </Text>
    </View>
  );
}

// ─── Edit Message Modal ───────────────────────────────────────────────────────

function EditModal({
  visible, initialText, onSave, onClose,
}: { visible: boolean; initialText: string; onSave: (t: string) => void; onClose: () => void }) {
  const { s, c } = useMessagesAppearance();
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
              <Text style={{ color: c.muted, fontWeight: '600' }}>Cancel</Text>
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
  const { s, c, accent } = useMessagesAppearance();
  const { messages, loading, sending, myUserId, sendMessage, editMessage, sendImage, sendVideoCall, fetchMessages } = useChat(partnerId);
  const [text, setText]                   = useState('');
  const [editTarget, setEditTarget]       = useState<Message | null>(null);
  const [viewerUri,  setViewerUri]        = useState<string | null>(null);
  const [callModal, setCallModal]         = useState(false);
  const [helperScheduleModal, setHelperScheduleModal] = useState(false);
  const [resolvedApp, setResolvedApp] = useState<{
    application_id: number;
    status: string;
    job_post_id: number;
    employer_signed_at?: string | null;
    helper_signed_at?: string | null;
  } | null>(null);
  const [contractAction, setContractAction] = useState(false);
  const [contractPdfVisible, setContractPdfVisible] = useState(false);
  const [contractPdfUri, setContractPdfUri] = useState<string | null>(null);
  const [signConfirmVisible, setSignConfirmVisible] = useState(false);
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
      const res = await fetch(`${API_URL}/helper/my_applications.php?helper_id=${user.user_id}`);
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
          status: String(match.status ?? ''),
          job_post_id: Number(match.job_post_id),
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

  useEffect(() => {
    if (messages.length > 0) flatRef.current?.scrollToEnd({ animated: false });
  }, [messages.length]);

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
      setContractAction(false);
    }
  };

  if (loading) {
    return (
      <View style={s.chatLoadWrap}>
        <ActivityIndicator color={accent} size="large" />
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
            <Ionicons name="arrow-back" size={22} color={c.ink} />
          </TouchableOpacity>
        )}
        <Avatar name={partnerName} photo={partnerPhoto} size={38} color={c.parent} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={s.chatHeaderName} numberOfLines={1}>{partnerName}</Text>
          {jobPostId && <Text style={s.chatHeaderSub}>Job #{jobPostId}</Text>}
        </View>
        <TouchableOpacity style={s.callBtn} onPress={() => setCallModal(true)}>
          <Ionicons name="videocam" size={20} color={accent} />
        </TouchableOpacity>
      </View>

      {resolvedApp && resolvedApp.status === 'contract_pending' && (
        <View style={s.contractActionBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.contractActionTitle}>Contract pending signatures</Text>
            <Text style={s.contractActionSub} numberOfLines={2}>
              Employer: {resolvedApp.employer_signed_at ? 'Signed' : 'Not signed'} · You:{' '}
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
                (!!resolvedApp.helper_signed_at || contractAction) && s.contractPrimaryBtnDisabled,
              ]}
              disabled={!!resolvedApp.helper_signed_at || contractAction}
              onPress={() => setSignConfirmVisible(true)}
            >
              {contractAction ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.contractPrimaryBtnTxt}>I agree</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
      {resolvedApp && (resolvedApp.status === 'hired' || resolvedApp.status === 'Accepted') && (
        <View style={s.hiredBar}>
          <Ionicons name="checkmark-circle" size={18} color={c.success} />
          <Text style={s.hiredBarTxt}>You are hired for this job</Text>
          <TouchableOpacity style={s.hiredBarLink} onPress={() => { void openReviewContract(); }}>
            <Text style={s.hiredBarLinkTxt}>Contract</Text>
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
            <Ionicons name="chatbubbles-outline" size={52} color={c.subtle} />
            <Text style={s.chatEmptyTitle}>No messages yet</Text>
            <Text style={s.chatEmptySub}>Say hello to {partnerName}!</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={s.inputRow}>
        <TouchableOpacity style={s.inputIcon} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={22} color={c.muted} />
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={c.subtle}
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
        accent={accent}
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
        accent={accent}
        partnerName={partnerName}
        jobPostId={jobPostId ?? null}
        helperId={myUserId}
        parentId={partnerId}
        onDone={() => { fetchMessages(); }}
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

function HelperMessagesContent() {
  const { s, c, accent } = useMessagesAppearance();
  const router           = useRouter();
  const { isDesktop }    = useResponsive();
  const { handleLogout } = useAuth();
  const { unreadCount: notifUnread } = useNotifications('helper');
  const { isWorkMode, activeHire } = useHelperWorkMode();
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
        partner_type:  'parent',
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
        <Ionicons name="search" size={16} color={c.muted} style={{ marginRight: 6 }} />
        <TextInput
          style={s.convSearchInput}
          value={convSearch}
          onChangeText={setConvSearch}
          placeholder="Search conversations…"
          placeholderTextColor={c.subtle}
        />
        {convSearch.length > 0 && (
          <TouchableOpacity onPress={() => setConvSearch('')}>
            <Ionicons name="close-circle" size={16} color={c.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {loadingConvs ? (
        <LoadingSpinner visible />
      ) : filteredConvs.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="chatbubbles-outline" size={52} color={c.subtle} />
          <Text style={s.emptyTitle}>{convSearch ? 'No matches' : 'No messages yet'}</Text>
          <Text style={s.emptySub}>
            {convSearch ? 'Try a different name.' : 'Apply to a job and start chatting with a parent.'}
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
          contentContainerStyle={{ paddingBottom: !activePartner ? 88 : 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (!isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: c.canvasHelper }}>
        {!activePartner ? (
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <View style={s.mobileHeader}>
                <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={s.menuBtn}>
                  <Ionicons name="menu-outline" size={26} color={c.ink} />
                </TouchableOpacity>
                <Text style={s.mobileTitle}>Messages</Text>
                <View style={{ width: 40 }} />
              </View>
              {ConvList}
            </View>
            {isWorkMode && activeHire ? <WorkModeTabBar /> : <HelperTabBar />}
          </SafeAreaView>
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
            <ChatPanel
              partnerId={activePartner.partner_id}
              partnerName={activePartner.partner_name}
              partnerPhoto={activePartner.partner_photo}
              jobPostId={activePartner.job_post_id}
              onBack={() => { setActivePartner(null); refresh(); }}
            />
          </SafeAreaView>
        )}

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
                <Ionicons name="chatbubbles-outline" size={56} color={accent} />
              </View>
              <Text style={s.noChatTitle}>Your Messages</Text>
              <Text style={s.noChatSub}>
                Select a conversation to start chatting, or apply to a job to connect with a parent.
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

export default function HelperMessages() {
  const { color: c } = useHelperTheme();
  const accent = c.helper;
  const s = useMemo(() => createHelperMessagesStyles(c, accent), [c, accent]);
  const appearance = useMemo(
    (): MessagesAppearanceValue => ({ s, c, accent }),
    [s, c, accent],
  );
  return (
    <MessagesAppearanceContext.Provider value={appearance}>
      <HelperMessagesContent />
    </MessagesAppearanceContext.Provider>
  );
}
