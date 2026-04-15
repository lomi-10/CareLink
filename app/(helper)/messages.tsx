// app/(helper)/messages.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useConversations, useChat, Conversation, Message } from '@/hooks/shared';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar, MobileMenu } from '@/components/helper/home';
import { LoadingSpinner, ConfirmationModal } from '@/components/shared/';
import { theme } from '@/constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Time helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeLabel(dateStr: string) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60)          return 'Just now';
  if (diff < 3600)        return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)       return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 86400 * 7)   return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name, photo, size = 44, color }: { name: string; photo?: string | null; size?: number; color?: string }) {
  const bg    = color ?? theme.color.helper;
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation list item
// ─────────────────────────────────────────────────────────────────────────────
function ConvItem({ item, onPress, active }: { item: Conversation; onPress: () => void; active: boolean }) {
  return (
    <TouchableOpacity
      style={[s.convItem, active && s.convItemActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={s.convAva}>
        <Avatar name={item.partner_name} photo={item.partner_photo} size={46} color={theme.color.parent} />
        {item.unread_count > 0 && (
          <View style={s.badge}><Text style={s.badgeTxt}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text></View>
        )}
      </View>
      <View style={s.convBody}>
        <View style={s.convRow}>
          <Text style={[s.convName, item.unread_count > 0 && s.convNameBold]} numberOfLines={1}>{item.partner_name}</Text>
          <Text style={s.convTime}>{timeLabel(item.last_sent_at)}</Text>
        </View>
        {item.job_title && <Text style={s.convJob} numberOfLines={1}>re: {item.job_title}</Text>}
        <Text style={[s.convPreview, item.unread_count > 0 && s.convPreviewBold]} numberOfLines={1}>
          {item.is_mine ? 'You: ' : ''}{item.last_message}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat bubble
// ─────────────────────────────────────────────────────────────────────────────
function Bubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
      <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
        <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{msg.message_text}</Text>
        <Text style={[s.bubbleMeta, isMine && s.bubbleMetaMine]}>
          {timeLabel(msg.sent_at)}{isMine && (msg.is_read ? '  ✓✓' : '  ✓')}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat panel (messages + input)
// ─────────────────────────────────────────────────────────────────────────────
function ChatPanel({
  partnerId,
  partnerName,
  partnerPhoto,
  jobPostId,
  onBack,
}: {
  partnerId: number;
  partnerName: string;
  partnerPhoto?: string | null;
  jobPostId?: number | null;
  onBack?: () => void;
}) {
  const { messages, loading, sending, myUserId, sendMessage } = useChat(partnerId);
  const [text, setText] = useState('');
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) flatRef.current?.scrollToEnd({ animated: false });
  }, [messages.length]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await sendMessage(t, jobPostId);
  };

  if (loading) return <View style={s.chatLoadWrap}><ActivityIndicator color={theme.color.helper} /></View>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Chat header */}
      <View style={s.chatHeader}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={s.chatBack}>
            <Ionicons name="arrow-back" size={22} color={theme.color.ink} />
          </TouchableOpacity>
        )}
        <Avatar name={partnerName} photo={partnerPhoto} size={36} color={theme.color.parent} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={s.chatHeaderName}>{partnerName}</Text>
          {jobPostId && <Text style={s.chatHeaderSub}>re: job #{jobPostId}</Text>}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => String(m.message_id)}
        renderItem={({ item }) => <Bubble msg={item} isMine={item.sender_id === myUserId} />}
        contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.chatEmpty}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.color.subtle} />
            <Text style={s.chatEmptyTxt}>No messages yet. Say hello!</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={s.inputRow}>
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
            : <Ionicons name="send" size={20} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function HelperMessages() {
  const router           = useRouter();
  const { isDesktop }    = useResponsive();
  const { handleLogout } = useAuth();
  const params           = useLocalSearchParams<{ partner_id?: string; partner_name?: string; job_post_id?: string }>();

  const { conversations, loading: loadingConvs, refresh } = useConversations();

  const [activePartner, setActivePartner] = useState<Conversation | null>(null);
  const [isMobileMenuOpen,     setIsMobileMenuOpen]     = useState(false);
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  // Open a chat from deep-link params — fires once loading is done (works even with 0 conversations)
  useEffect(() => {
    if (!params.partner_id || loadingConvs) return;
    const found = conversations.find(c => String(c.partner_id) === params.partner_id);
    if (found) {
      setActivePartner(found);
    } else if (params.partner_name) {
      // New conversation — no prior messages yet
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

  const MobileContent = () => (
    <>
      {!activePartner ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.canvasHelper }}>
          <View style={s.mobileHeader}>
            <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={s.menuBtn}>
              <Ionicons name="menu-outline" size={26} color={theme.color.ink} />
            </TouchableOpacity>
            <Text style={s.mobileTitle}>Messages</Text>
          </View>
          {loadingConvs ? (
            <LoadingSpinner />
          ) : conversations.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={56} color={theme.color.subtle} />
              <Text style={s.emptyTitle}>No messages yet</Text>
              <Text style={s.emptySub}>Apply to a job and start a conversation with a parent.</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={c => String(c.partner_id)}
              renderItem={({ item }) => (
                <ConvItem item={item} onPress={() => setActivePartner(item)} active={false} />
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      ) : (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <ChatPanel
            partnerId={activePartner.partner_id}
            partnerName={activePartner.partner_name}
            partnerPhoto={activePartner.partner_photo}
            jobPostId={activePartner.job_post_id}
            onBack={() => { setActivePartner(null); refresh(); }}
          />
        </SafeAreaView>
      )}
    </>
  );

  if (!isDesktop) {
    return (
      <>
        <MobileContent />
        <MobileMenu
          visible={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onLogout={() => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); }}
        />
        <ConfirmationModal
          visible={confirmLogoutVisible}
          title="Log out?"
          message="You will need to log in again."
          onConfirm={async () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); setTimeout(() => handleLogout(), 1500); }}
          onCancel={() => setConfirmLogoutVisible(false)}
        />
      </>
    );
  }

  // Desktop: sidebar + two-pane layout
  return (
    <View style={s.desktopRoot}>
      <Sidebar activePage="messages" onLogout={() => setConfirmLogoutVisible(true)} />
      <View style={s.desktopMain}>
        {/* Conversation list */}
        <View style={s.desktopList}>
          <Text style={s.desktopListTitle}>Messages</Text>
          {loadingConvs ? (
            <ActivityIndicator color={theme.color.helper} style={{ marginTop: 24 }} />
          ) : conversations.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={40} color={theme.color.subtle} />
              <Text style={[s.emptySub, { textAlign: 'center', marginTop: 8 }]}>No conversations yet.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {conversations.map(c => (
                <ConvItem
                  key={c.partner_id}
                  item={c}
                  onPress={() => { setActivePartner(c); refresh(); }}
                  active={activePartner?.partner_id === c.partner_id}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Chat pane */}
        <View style={s.desktopChat}>
          {activePartner ? (
            <ChatPanel
              partnerId={activePartner.partner_id}
              partnerName={activePartner.partner_name}
              partnerPhoto={activePartner.partner_photo}
              jobPostId={activePartner.job_post_id}
            />
          ) : (
            <View style={s.chatPlaceholder}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color={theme.color.subtle} />
              <Text style={s.chatPlaceholderTxt}>Select a conversation</Text>
            </View>
          )}
        </View>
      </View>
      <ConfirmationModal
        visible={confirmLogoutVisible}
        title="Log out?"
        message="You will need to log in again."
        onConfirm={async () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); setTimeout(() => handleLogout(), 1500); }}
        onCancel={() => setConfirmLogoutVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  // Desktop layout
  desktopRoot:  { flex: 1, flexDirection: 'row', backgroundColor: theme.color.canvasHelper },
  desktopMain:  { flex: 1, flexDirection: 'row' },
  desktopList:  { width: 320, borderRightWidth: 1, borderRightColor: theme.color.line, backgroundColor: '#fff', paddingTop: 16 },
  desktopListTitle: { fontSize: 18, fontWeight: '700', color: theme.color.ink, paddingHorizontal: 16, marginBottom: 8 },
  desktopChat:  { flex: 1, backgroundColor: '#fff' },

  // Mobile header
  mobileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.color.line },
  menuBtn:      { marginRight: 12 },
  mobileTitle:  { fontSize: 18, fontWeight: '700', color: theme.color.ink },

  // Conversation item
  convItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.color.surface },
  convItemActive: { backgroundColor: theme.color.helperSoft },
  convAva:        { position: 'relative', marginRight: 12 },
  badge:          { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.color.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeTxt:       { color: '#fff', fontSize: 10, fontWeight: '700' },
  convBody:       { flex: 1 },
  convRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName:       { fontSize: 14, fontWeight: '500', color: theme.color.ink, flex: 1, marginRight: 6 },
  convNameBold:   { fontWeight: '700' },
  convTime:       { fontSize: 11, color: theme.color.muted },
  convJob:        { fontSize: 11, color: theme.color.helper, marginTop: 1 },
  convPreview:    { fontSize: 13, color: theme.color.muted, marginTop: 2 },
  convPreviewBold:{ color: theme.color.ink, fontWeight: '500' },

  // Chat header
  chatHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.color.line },
  chatBack:       { marginRight: 8 },
  chatHeaderName: { fontSize: 15, fontWeight: '700', color: theme.color.ink },
  chatHeaderSub:  { fontSize: 11, color: theme.color.muted },

  // Chat bubbles
  bubbleWrap:      { marginBottom: 4 },
  bubbleWrapLeft:  { alignItems: 'flex-start', paddingLeft: 2 },
  bubbleWrapRight: { alignItems: 'flex-end',   paddingRight: 2 },
  bubble:          { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 8 },
  bubbleMine:      { backgroundColor: theme.color.helper, borderBottomRightRadius: 4 },
  bubbleTheirs:    { backgroundColor: theme.color.surface, borderBottomLeftRadius: 4 },
  bubbleText:      { fontSize: 14, color: theme.color.ink },
  bubbleTextMine:  { color: '#fff' },
  bubbleMeta:      { fontSize: 10, color: theme.color.muted, marginTop: 3, textAlign: 'right' },
  bubbleMetaMine:  { color: 'rgba(255,255,255,0.7)' },

  // Input bar
  inputRow:    { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: theme.color.line },
  input:       { flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1, borderColor: theme.color.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: theme.color.ink, backgroundColor: theme.color.surface, marginRight: 8 },
  sendBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.color.helper, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: theme.color.subtle },

  // Empty states
  emptyWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle:  { fontSize: 17, fontWeight: '700', color: theme.color.ink, marginTop: 14 },
  emptySub:    { fontSize: 14, color: theme.color.muted, marginTop: 6, textAlign: 'center' },
  chatEmpty:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  chatEmptyTxt:{ fontSize: 14, color: theme.color.muted, marginTop: 12 },
  chatLoadWrap:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatPlaceholder:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatPlaceholderTxt: { fontSize: 15, color: theme.color.muted, marginTop: 14 },
});
