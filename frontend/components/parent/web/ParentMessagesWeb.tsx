// components/parent/web/ParentMessagesWeb.tsx — desktop Messages for the parent.
// Two columns: conversation list (search · filter · CareBot) + the shared parent
// ChatPanel (full chat + contract/video/interview). No modals; inline throughout.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useConversations, pendingConnectionLabel, type Conversation } from '@/hooks/shared/useMessages';
import { useParentPortalMode } from '@/hooks/parent';
import { useCareBot } from '@/contexts/CareBotContext';
import ChatPanel from '@/app/(parent)/messages/ChatPanel';
import { ParentTopNav } from './ParentTopNav';
import { pt } from './parentWebTheme';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const initials = (n: string) => (n || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
function convTime(v?: string) {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function ParentMessagesWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const isWorkMode = useParentPortalMode();
  const { open: openCareBot } = useCareBot();
  const { conversations, loading, refresh } = useConversations();
  const params = useLocalSearchParams<{ partner_id?: string; partner_name?: string; job_post_id?: string }>();

  const [active, setActive] = useState<Conversation | null>(null);
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<'all' | 'helpers' | 'system'>('all');

  useEffect(() => {
    if (!params.partner_id || loading) return;
    const found = conversations.find((c) => String(c.partner_id) === params.partner_id);
    if (found) setActive(found);
    else if (params.partner_name) setActive({
      partner_id: Number(params.partner_id), partner_name: decodeURIComponent(params.partner_name),
      partner_type: 'helper', partner_photo: null, last_message: null, last_sent_at: new Date().toISOString(),
      is_mine: false, unread_count: 0, job_post_id: params.job_post_id ? Number(params.job_post_id) : null,
      job_title: null, has_messages: false, application_status: null,
    });
  }, [params.partner_id, params.partner_name, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let arr = conversations;
    if (chip === 'helpers') arr = arr.filter((c) => c.partner_type === 'helper');
    else if (chip === 'system') arr = arr.filter((c) => (c.partner_type as string) === 'system');
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((c) => c.partner_name.toLowerCase().includes(q) || (c.job_title ?? '').toLowerCase().includes(q));
    return arr;
  }, [conversations, chip, search]);

  const totalUnread = conversations.reduce((n, c) => n + (c.unread_count || 0), 0);
  const CHIPS: { key: typeof chip; label: string; n?: number }[] = [
    { key: 'all', label: 'All', n: totalUnread || undefined },
    { key: 'helpers', label: 'Helpers' },
    { key: 'system', label: 'System' },
  ];

  return (
    <View style={s.root}>
      <ParentTopNav active="messages" mode={isWorkMode ? 'work' : 'recruitment'} userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <View style={s.body}>
        {/* ── conversation list ── */}
        <View style={s.convPanel}>
          <View style={s.convHead}>
            <Text style={s.pageTitle}>Messages</Text>
            <Text style={s.pageSub}>Chat with helpers and manage your conversations.</Text>
          </View>
          <View style={s.searchWrap}>
            <View style={s.search}>
              <Ionicons name="search" size={17} color={pt.subtle} />
              <TextInput style={s.searchInput} placeholder="Search conversations..." placeholderTextColor={pt.subtle} value={search} onChangeText={setSearch} />
            </View>
          </View>
          <View style={s.chips}>
            {CHIPS.map((c) => {
              const on = chip === c.key;
              return (
                <Pressable key={c.key} onPress={() => setChip(c.key)} style={({ hovered }: any) => [s.chip, on && s.chipOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                  <Text style={[s.chipText, on && { color: '#fff' }]}>{c.label}</Text>
                  {c.n ? <View style={[s.chipBadge, on && { backgroundColor: 'rgba(255,255,255,.25)' }]}><Text style={[s.chipBadgeText, on && { color: '#fff' }]}>{c.n}</Text></View> : null}
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
            {loading && conversations.length === 0 ? (
              <ActivityIndicator color={pt.accent} style={{ marginTop: 30 }} />
            ) : filtered.length === 0 ? (
              <View style={s.emptyList}>
                <Ionicons name="chatbubbles-outline" size={40} color={pt.subtle} />
                <Text style={s.emptyListTitle}>{search ? 'No matches' : 'No messages yet'}</Text>
                <Text style={s.emptyListSub}>{search ? 'Try a different name.' : 'Shortlist an applicant to start a conversation.'}</Text>
              </View>
            ) : (
              filtered.map((c) => <ConvRow key={c.partner_id} conv={c} active={active?.partner_id === c.partner_id} onPress={() => setActive(c)} />)
            )}
          </ScrollView>

          <View style={s.botCard}>
            <Image source={CAREBOT_ICON} style={s.botMascot} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={s.botTitle}>Need help while chatting?</Text>
              <Text style={s.botText}>CareBot can help you draft messages and more.</Text>
              <Pressable onPress={openCareBot} style={({ hovered }: any) => [s.botBtn, TRANS, hovered && { transform: [{ translateY: -1 }] }]}>
                <Text style={s.botBtnText}>Chat with CareBot</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── chat ── */}
        <View style={s.chatWrap}>
          {active ? (
            <ChatPanel
              key={active.partner_id}
              partnerId={active.partner_id}
              partnerName={active.partner_name}
              partnerPhoto={active.partner_photo}
              jobPostId={active.job_post_id}
              onBack={() => { setActive(null); refresh(); }}
            />
          ) : (
            <View style={s.noChat}>
              <View style={s.noChatIcon}><Ionicons name="chatbubbles-outline" size={40} color={pt.accent} /></View>
              <Text style={s.noChatTitle}>Your Messages</Text>
              <Text style={s.noChatSub}>Select a conversation to start chatting, or shortlist an applicant to connect with a helper.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ConvRow({ conv, active, onPress }: { conv: Conversation; active: boolean; onPress: () => void }) {
  const preview = conv.last_message || (conv.application_status ? pendingConnectionLabel(conv.application_status) : 'Say hello!');
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.conv, active && s.convActive, TRANS, hovered && !active && { backgroundColor: pt.lineSoft }]}>
      {conv.partner_photo ? <Image source={{ uri: conv.partner_photo }} style={s.convAva} /> : <View style={[s.convAva, s.convAvaFb]}><Text style={s.convAvaText}>{initials(conv.partner_name)}</Text></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.convTop}>
          <Text style={s.convName} numberOfLines={1}>{conv.partner_name}</Text>
          {conv.partner_type === 'helper' && <View style={s.verPill}><Ionicons name="checkmark-circle" size={10} color={pt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>}
          <View style={{ flex: 1 }} />
          <Text style={s.convTime}>{convTime(conv.last_sent_at)}</Text>
        </View>
        <View style={s.convBottom}>
          <Text style={[s.convPreview, conv.unread_count > 0 && { color: pt.ink, fontFamily: FontFamily.fredokaSemiBold }]} numberOfLines={2}>{preview}</Text>
          {conv.unread_count > 0 && <View style={s.unread}><Text style={s.unreadText}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</Text></View>}
        </View>
      </View>
    </Pressable>
  );
}

const shadowSm = { boxShadow: '0 2px 10px rgba(139,90,43,.06)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: pt.canvas },
  body: { flex: 1, flexDirection: 'row', maxWidth: 1500, width: '100%', alignSelf: 'center' },
  convPanel: { width: 340, flexGrow: 0, flexShrink: 0, borderRightWidth: 1, borderRightColor: pt.line, backgroundColor: pt.surface },
  convHead: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: pt.ink, letterSpacing: -0.4 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 2, lineHeight: 17 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 11, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.ink, outlineStyle: 'none' as any },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: pt.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: pt.ink, borderColor: pt.ink },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.muted },
  chipBadge: { backgroundColor: pt.accent, borderRadius: 999, minWidth: 18, paddingHorizontal: 5, alignItems: 'center' },
  chipBadgeText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },
  conv: { flexDirection: 'row', gap: 11, padding: 11, borderRadius: 14, marginBottom: 2 },
  convActive: { backgroundColor: pt.accentSoft },
  convAva: { width: 46, height: 46, borderRadius: 23 },
  convAvaFb: { backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  convAvaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.caramel },
  convTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  convName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink, flexShrink: 1 },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: pt.greenSoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  verPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9.5, color: pt.green },
  convTime: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.subtle },
  convBottom: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 3 },
  convPreview: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, lineHeight: 17 },
  unread: { backgroundColor: pt.accent, borderRadius: 999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },
  emptyList: { alignItems: 'center', paddingVertical: 40, gap: 8, paddingHorizontal: 20 },
  emptyListTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  emptyListSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, textAlign: 'center', lineHeight: 18 },
  botCard: { flexDirection: 'row', gap: 12, alignItems: 'center', margin: 14, padding: 14, backgroundColor: pt.accentSoft, borderRadius: 16 },
  botMascot: { width: 44, height: 44 },
  botTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  botText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 2, marginBottom: 8 },
  botBtn: { alignSelf: 'flex-start', backgroundColor: pt.feat2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  botBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5 },
  chatWrap: { flex: 1, minWidth: 0, backgroundColor: pt.canvas },
  noChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 50 },
  noChatIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  noChatTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: pt.ink },
  noChatSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 360 },
});
