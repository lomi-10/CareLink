// components/helper/web/HelperMessagesWeb.tsx — desktop Messages (3 columns).
// Left: conversation list (search, filter chips, CareBot). Middle: the shared
// ChatPanel (full chat + contract/video/interview). Right: "About this employer".
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useConversations, pendingConnectionLabel, type Conversation } from '@/hooks/shared/useMessages';
import { useBrowseJobs, type JobPost } from '@/hooks/helper';
import { useCareBot } from '@/contexts/CareBotContext';
import { ParentProfileModal } from '@/components/helper/jobs';
import { SubmitComplaintModal } from '@/components/shared';
import ChatPanel from '@/app/(helper)/messages/ChatPanel';
import { HelperTopNav } from './HelperTopNav';
import { wt } from './webTheme';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const initials = (n: string) => (n || 'E').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

function convTime(v?: string) {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function HelperMessagesWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const router = useRouter();
  const { open: openCareBot } = useCareBot();
  const { conversations, loading, refresh } = useConversations();
  const { jobs } = useBrowseJobs();
  const params = useLocalSearchParams<{ partner_id?: string; partner_name?: string; job_post_id?: string }>();

  const [active, setActive] = useState<Conversation | null>(null);
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<'all' | 'employers' | 'system'>('all');
  const [showProfile, setShowProfile] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Deep-link from Applications / Browse ("Message Employer")
  useEffect(() => {
    if (!params.partner_id || loading) return;
    const found = conversations.find((c) => String(c.partner_id) === params.partner_id);
    if (found) setActive(found);
    else if (params.partner_name) setActive({
      partner_id: Number(params.partner_id), partner_name: decodeURIComponent(params.partner_name),
      partner_type: 'parent', partner_photo: null, last_message: null, last_sent_at: new Date().toISOString(),
      is_mine: false, unread_count: 0, job_post_id: params.job_post_id ? Number(params.job_post_id) : null,
      job_title: null, has_messages: false, application_status: null,
    });
  }, [params.partner_id, params.partner_name, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let arr = conversations;
    if (chip === 'employers') arr = arr.filter((c) => c.partner_type === 'parent');
    else if (chip === 'system') arr = arr.filter((c) => (c.partner_type as string) === 'system');
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((c) => c.partner_name.toLowerCase().includes(q) || (c.job_title ?? '').toLowerCase().includes(q));
    return arr;
  }, [conversations, chip, search]);

  const totalUnread = conversations.reduce((n, c) => n + (c.unread_count || 0), 0);
  const CHIPS: { key: typeof chip; label: string; n?: number }[] = [
    { key: 'all', label: 'All', n: totalUnread || undefined },
    { key: 'employers', label: 'Employers' },
    { key: 'system', label: 'System' },
  ];

  return (
    <View style={s.root}>
      <HelperTopNav active="messages" userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <View style={s.body}>
        {/* ── LEFT: conversation list ── */}
        <View style={s.convPanel}>
          <View style={s.convHead}>
            <Text style={s.pageTitle}>Messages</Text>
            <Text style={s.pageSub}>Communicate with employers and manage your conversations.</Text>
          </View>
          <View style={s.searchWrap}>
            <View style={s.search}>
              <Ionicons name="search" size={17} color={wt.subtle} />
              <TextInput style={s.searchInput} placeholder="Search conversations..." placeholderTextColor={wt.subtle} value={search} onChangeText={setSearch} />
            </View>
          </View>
          <View style={s.chips}>
            {CHIPS.map((c) => {
              const on = chip === c.key;
              return (
                <Pressable key={c.key} onPress={() => setChip(c.key)} style={({ hovered }: any) => [s.chip, on && s.chipOn, TRANS, hovered && !on && { borderColor: wt.accent }]}>
                  <Text style={[s.chipText, on && { color: '#fff' }]}>{c.label}</Text>
                  {c.n ? <View style={[s.chipBadge, on && { backgroundColor: 'rgba(255,255,255,.25)' }]}><Text style={[s.chipBadgeText, on && { color: '#fff' }]}>{c.n}</Text></View> : null}
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
            {loading && conversations.length === 0 ? (
              <ActivityIndicator color={wt.accent} style={{ marginTop: 30 }} />
            ) : filtered.length === 0 ? (
              <View style={s.emptyList}>
                <Ionicons name="chatbubbles-outline" size={40} color={wt.subtle} />
                <Text style={s.emptyListTitle}>{search ? 'No matches' : 'No messages yet'}</Text>
                <Text style={s.emptyListSub}>{search ? 'Try a different name.' : 'Apply to a job to start chatting with an employer.'}</Text>
              </View>
            ) : (
              filtered.map((c) => <ConvRow key={c.partner_id} conv={c} active={active?.partner_id === c.partner_id} onPress={() => setActive(c)} />)
            )}
          </ScrollView>

          {/* CareBot card */}
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

        {/* ── MIDDLE: chat ── */}
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
              <View style={s.noChatIcon}><Ionicons name="chatbubbles-outline" size={40} color={wt.accent} /></View>
              <Text style={s.noChatTitle}>Your Messages</Text>
              <Text style={s.noChatSub}>Select a conversation to start chatting, or apply to a job to connect with an employer.</Text>
            </View>
          )}
        </View>

        {/* ── RIGHT: About this employer ── */}
        {active && active.partner_type === 'parent' && (
          <EmployerPanel
            key={active.partner_id}
            conv={active}
            jobs={jobs.filter((j) => String(j.parent_id) === String(active.partner_id))}
            onViewProfile={() => setShowProfile(true)}
            onReport={() => setReportOpen(true)}
            onOpenJob={() => router.push('/(helper)/browse')}
          />
        )}
      </View>

      <ParentProfileModal visible={showProfile} onClose={() => setShowProfile(false)}
        parentData={active ? { parent_id: active.partner_id, parent_name: active.partner_name } : { parent_id: '', parent_name: '' }} />
      <SubmitComplaintModal visible={reportOpen} onClose={() => setReportOpen(false)}
        respondentId={active ? Number(active.partner_id) : undefined} userType="helper" counterpartyLabel={active?.partner_name || 'this employer'} />
    </View>
  );
}

function ConvRow({ conv, active, onPress }: { conv: Conversation; active: boolean; onPress: () => void }) {
  const preview = conv.last_message
    || (conv.application_status ? pendingConnectionLabel(conv.application_status) : 'Say hello!');
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.conv, active && s.convActive, TRANS, hovered && !active && { backgroundColor: wt.lineSoft }]}>
      {conv.partner_photo ? <Image source={{ uri: conv.partner_photo }} style={s.convAva} /> : <View style={[s.convAva, s.convAvaFb]}><Text style={s.convAvaText}>{initials(conv.partner_name)}</Text></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.convTop}>
          <Text style={s.convName} numberOfLines={1}>{conv.partner_name}</Text>
          {conv.partner_type === 'parent' && <View style={s.verPill}><Ionicons name="checkmark-circle" size={10} color={wt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>}
          <View style={{ flex: 1 }} />
          <Text style={s.convTime}>{convTime(conv.last_sent_at)}</Text>
        </View>
        <View style={s.convBottom}>
          <Text style={[s.convPreview, conv.unread_count > 0 && { color: wt.ink, fontFamily: FontFamily.fredokaSemiBold }]} numberOfLines={2}>{preview}</Text>
          {conv.unread_count > 0 && <View style={s.unread}><Text style={s.unreadText}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</Text></View>}
        </View>
      </View>
    </Pressable>
  );
}

function EmployerPanel({ conv, jobs, onViewProfile, onReport, onOpenJob }: {
  conv: Conversation; jobs: JobPost[]; onViewProfile: () => void; onReport: () => void; onOpenJob: () => void;
}) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        const requesterId = raw ? JSON.parse(raw)?.user_id : '';
        const res = await fetch(`${API_URL}/helper/get_parent_profile.php?parent_id=${conv.partner_id}&requester_id=${requesterId}`);
        const json = await res.json();
        if (!cancelled && json.success) setData(json.data);
      } catch { /* keep basic */ }
    })();
    return () => { cancelled = true; };
  }, [conv.partner_id]);

  const user = data?.user ?? {};
  const memberSince = user.created_at ? new Date(String(user.created_at).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : null;
  const verifiedEmp = user.status === 'approved';
  const location = data ? [data.profile?.municipality, data.profile?.province].filter(Boolean).join(', ') : '';

  return (
    <View style={s.empPanel}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
      <Text style={s.empHead}>About this employer</Text>

      <View style={s.empCard}>
        <View style={s.empRow}><Ionicons name="shield-checkmark-outline" size={16} color={wt.green} /><Text style={s.empRowText}>{verifiedEmp ? 'PESO Verified Employer' : 'Employer'}</Text></View>
        {memberSince && <View style={s.empRow}><Ionicons name="people-outline" size={16} color={wt.muted} /><Text style={s.empRowText}>Member since {memberSince}</Text></View>}
        {!!location && <View style={s.empRow}><Ionicons name="location-outline" size={16} color={wt.muted} /><Text style={s.empRowText}>{location}</Text></View>}
      </View>

      {jobs.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <View style={s.empSecHead}>
            <Text style={s.empSecTitle}>Active Jobs ({jobs.length})</Text>
            <Pressable onPress={onOpenJob}><Text style={s.empSecLink}>View all</Text></Pressable>
          </View>
          {jobs.slice(0, 4).map((j) => {
            const match = Math.round(Number(j.match_score ?? 0)); const salary = Number(j.salary_offered);
            return (
              <Pressable key={j.job_post_id} onPress={onOpenJob} style={({ hovered }: any) => [s.jobCard, TRANS, hovered && { borderColor: wt.accent, backgroundColor: '#FFF9F3' }]}>
                <View style={s.jobTop}>
                  <Text style={s.jobTitle} numberOfLines={1}>{j.title}</Text>
                  {match > 0 && <View style={s.matchPill}><Text style={s.matchPillText}>{match}% Match</Text></View>}
                </View>
                <Text style={s.jobSub}>{[j.employment_type, j.work_schedule].filter(Boolean).join(' · ')}</Text>
                {salary > 0 && <Text style={s.jobSalary}>₱{salary.toLocaleString()} <Text style={s.jobSalaryPer}>/ month</Text></Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: 18 }}>
        <Text style={s.empSecTitle}>Quick Actions</Text>
        <Pressable onPress={onViewProfile} style={({ hovered }: any) => [s.qaBtn, TRANS, hovered && { backgroundColor: wt.lineSoft }]}><Text style={s.qaBtnText}>View Full Profile</Text></Pressable>
        <Pressable onPress={onReport} style={({ hovered }: any) => [s.qaBtn, s.qaDanger, TRANS, hovered && { backgroundColor: wt.redSoft }]}><Text style={[s.qaBtnText, { color: wt.red }]}>Report Employer</Text></Pressable>
      </View>
    </ScrollView>
    </View>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.canvas },
  body: { flex: 1, flexDirection: 'row', maxWidth: 1600, width: '100%', alignSelf: 'center' },

  // Left panel
  convPanel: { width: 340, flexGrow: 0, flexShrink: 0, borderRightWidth: 1, borderRightColor: wt.line, backgroundColor: wt.surface },
  convHead: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: wt.ink, letterSpacing: -0.4 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, marginTop: 2, lineHeight: 17 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: wt.raise, borderWidth: 1, borderColor: wt.line, borderRadius: 11, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.ink, outlineStyle: 'none' as any },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: wt.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: wt.ink, borderColor: wt.ink },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.muted },
  chipBadge: { backgroundColor: wt.accent, borderRadius: 999, minWidth: 18, paddingHorizontal: 5, alignItems: 'center' },
  chipBadgeText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  conv: { flexDirection: 'row', gap: 11, padding: 11, borderRadius: 14, marginBottom: 2 },
  convActive: { backgroundColor: wt.accentSoft },
  convAva: { width: 46, height: 46, borderRadius: 23 },
  convAvaFb: { backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  convAvaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.accent },
  convTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  convName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.ink, flexShrink: 1 },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: wt.greenSoft, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  verPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9.5, color: wt.green },
  convTime: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.subtle },
  convBottom: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 3 },
  convPreview: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, lineHeight: 17 },
  unread: { backgroundColor: wt.accent, borderRadius: 999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  emptyList: { alignItems: 'center', paddingVertical: 40, gap: 8, paddingHorizontal: 20 },
  emptyListTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink },
  emptyListSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, textAlign: 'center', lineHeight: 18 },

  botCard: { flexDirection: 'row', gap: 12, alignItems: 'center', margin: 14, padding: 14, backgroundColor: wt.accentSoft, borderRadius: 16 },
  botMascot: { width: 44, height: 44 },
  botTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  botText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted, marginTop: 2, marginBottom: 8 },
  botBtn: { alignSelf: 'flex-start', backgroundColor: wt.feat2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  botBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5 },

  // Middle
  chatWrap: { flex: 1, minWidth: 0, backgroundColor: wt.canvas },
  noChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 50 },
  noChatIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  noChatTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: wt.ink },
  noChatSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.muted, textAlign: 'center', marginTop: 6, lineHeight: 20, maxWidth: 360 },

  // Right panel
  empPanel: { width: 300, flexGrow: 0, flexShrink: 0, borderLeftWidth: 1, borderLeftColor: wt.line, backgroundColor: wt.surface },
  empHead: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink, marginBottom: 14 },
  empCard: { gap: 4 },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  empRowText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.ink },
  empSecHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  empSecTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.ink, marginBottom: 10 },
  empSecLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.accent },
  jobCard: { borderWidth: 1, borderColor: wt.line, borderRadius: 13, padding: 13, marginBottom: 10, backgroundColor: wt.surface },
  jobTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink },
  matchPill: { backgroundColor: wt.greenSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  matchPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: wt.green },
  jobSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginTop: 4 },
  jobSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.accent, marginTop: 4 },
  jobSalaryPer: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted },
  qaBtn: { borderWidth: 1, borderColor: wt.line, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  qaDanger: { borderColor: '#F3C6C6' },
  qaBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink },
});
