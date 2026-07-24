// components/helper/web/HelperApplicationsWeb.tsx — desktop "My Applications".
// Left: search + dark stat strip + status chips + application cards.
// Right: a slide-in detail panel with Overview / Timeline / Application tabs.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useMyApplications, type Application } from '@/hooks/helper';
import { NotificationModal, ConfirmationModal } from '@/components/shared';
import { ParentProfileModal } from '@/components/helper/jobs';
import { HelperTopNav } from './HelperTopNav';
import { wt, FEATURE_GRADIENT, ACCENT_GRADIENT } from './webTheme';

const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const initials = (n: string) => (n || 'E').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();

type Tab = 'overview' | 'timeline' | 'application';
type StatusMeta = { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string; sub: string };

const STATUS: Record<string, StatusMeta> = {
  Pending: { color: wt.amber, bg: wt.amberSoft, icon: 'time-outline', label: 'Pending Review', sub: 'Your application is waiting to be reviewed by the employer.' },
  Reviewed: { color: wt.blue, bg: wt.blueSoft, icon: 'eye-outline', label: 'Under Review', sub: 'The employer has looked at your application.' },
  Shortlisted: { color: wt.purple, bg: wt.purpleSoft, icon: 'star-outline', label: 'You are shortlisted!', sub: 'Great news — you are among the top candidates.' },
  'Interview Scheduled': { color: wt.accent, bg: wt.accentSoft, icon: 'calendar-outline', label: 'Interview Scheduled', sub: 'Check your messages for interview details.' },
  Accepted: { color: wt.green, bg: wt.greenSoft, icon: 'checkmark-circle', label: "Congratulations! You're hired!", sub: 'The employer has accepted your application.' },
  contract_pending: { color: wt.amber, bg: wt.amberSoft, icon: 'document-text-outline', label: 'Contract Pending', sub: 'Review and confirm the contract in Messages.' },
  hired: { color: wt.green, bg: wt.greenSoft, icon: 'checkmark-done-outline', label: 'Hired — Contract Confirmed', sub: 'You and the employer have signed. Position confirmed.' },
  Rejected: { color: wt.red, bg: wt.redSoft, icon: 'close-circle-outline', label: 'Application Declined', sub: 'The employer moved forward with other candidates.' },
  auto_rejected: { color: wt.muted, bg: wt.lineSoft, icon: 'briefcase-outline', label: 'Application Closed', sub: 'Closed because the employer hired you for another post.' },
  Withdrawn: { color: wt.muted, bg: wt.lineSoft, icon: 'arrow-undo-outline', label: 'Application Withdrawn', sub: 'You withdrew this application.' },
};
const meta = (st: string): StatusMeta => STATUS[st] ?? { color: wt.muted, bg: wt.lineSoft, icon: 'information-circle-outline', label: st, sub: '' };

const STEPS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Applied', label: 'Applied', icon: 'paper-plane-outline' },
  { key: 'Reviewed', label: 'Reviewed', icon: 'eye-outline' },
  { key: 'Shortlisted', label: 'Shortlisted', icon: 'star-outline' },
  { key: 'Interview', label: 'Interview', icon: 'calendar-outline' },
  { key: 'Hired', label: 'Hired', icon: 'checkmark-circle' },
];
const stepIndex = (st: string) => ({ Pending: 0, Reviewed: 1, Shortlisted: 2, 'Interview Scheduled': 3, Accepted: 4, contract_pending: 4, hired: 4 } as any)[st] ?? 0;

const ACTIVE = ['Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled'];
const HIRED = ['hired', 'Accepted', 'contract_pending'];
const REJECTED = ['Rejected', 'auto_rejected'];

function timeAgo(v?: string) {
  if (!v) return '';
  const d = new Date(String(v).replace(' ', 'T'));
  if (isNaN(d.getTime())) return v;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDate(v?: string) {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function HelperApplicationsWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const router = useRouter();
  const { allApplications, stats, loading, refresh, withdrawApplication } = useMyApplications();
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<'all' | 'active' | 'Pending' | 'Shortlisted' | 'hired' | 'Rejected'>('all');
  const [newestFirst, setNewestFirst] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [notif, setNotif] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });
  const [confirmWithdraw, setConfirmWithdraw] = useState<Application | null>(null);
  const [viewEmployer, setViewEmployer] = useState<{ parent_id: string; parent_name: string } | null>(null);

  const count = (pred: (a: Application) => boolean) => allApplications.filter(pred).length;
  const counts = {
    all: allApplications.length,
    active: count((a) => ACTIVE.includes(a.status)),
    Pending: count((a) => a.status === 'Pending'),
    Shortlisted: count((a) => a.status === 'Shortlisted'),
    hired: count((a) => HIRED.includes(a.status)),
    Rejected: count((a) => REJECTED.includes(a.status)),
  };

  const list = useMemo(() => {
    let arr = [...allApplications];
    if (chip === 'active') arr = arr.filter((a) => ACTIVE.includes(a.status));
    else if (chip === 'hired') arr = arr.filter((a) => HIRED.includes(a.status));
    else if (chip === 'Rejected') arr = arr.filter((a) => REJECTED.includes(a.status));
    else if (chip !== 'all') arr = arr.filter((a) => a.status === chip);
    const q = query.trim().toLowerCase();
    if (q) arr = arr.filter((a) => (a.job_title ?? '').toLowerCase().includes(q) || (a.parent_name ?? '').toLowerCase().includes(q));
    arr.sort((a, b) => {
      const da = new Date(String(a.applied_at).replace(' ', 'T')).getTime() || 0;
      const db = new Date(String(b.applied_at).replace(' ', 'T')).getTime() || 0;
      return newestFirst ? db - da : da - db;
    });
    return arr;
  }, [allApplications, chip, query, newestFirst]);

  const selected = allApplications.find((a) => a.application_id === selId) ?? null;
  useEffect(() => { if (selId && !selected) setSelId(null); }, [selId, selected]);
  const open = (a: Application) => { setSelId(a.application_id); setTab('overview'); };

  const doWithdraw = async (a: Application) => {
    setConfirmWithdraw(null);
    try {
      const r = await withdrawApplication(a.application_id);
      if (r.success) setNotif({ visible: true, msg: 'Application withdrawn.', type: 'success' });
    } catch (e: any) { setNotif({ visible: true, msg: e.message || 'Failed to withdraw.', type: 'error' }); }
  };
  const message = (a: Application) => router.push({ pathname: '/(helper)/messages', params: { partner_id: String(a.parent_id ?? ''), partner_name: encodeURIComponent(a.parent_name ?? ''), job_post_id: String(a.job_post_id ?? '') } } as any);

  const CHIPS: { key: typeof chip; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: counts.all }, { key: 'active', label: 'Active', n: counts.active },
    { key: 'Pending', label: 'Pending', n: counts.Pending }, { key: 'Shortlisted', label: 'Shortlisted', n: counts.Shortlisted },
    { key: 'hired', label: 'Hired', n: counts.hired }, { key: 'Rejected', label: 'Rejected', n: counts.Rejected },
  ];

  return (
    <View style={s.root}>
      <HelperTopNav active="applications" userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <View style={s.body}>
        {/* LEFT */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.feed} showsVerticalScrollIndicator={false}>
          <Text style={s.pageTitle}>My Applications</Text>
          <Text style={s.pageSub}>Track the status of your job applications.</Text>

          <View style={s.searchRow}>
            <View style={s.search}>
              <Ionicons name="search" size={18} color={wt.subtle} />
              <TextInput style={s.searchInput} placeholder="Search by job title or employer..." placeholderTextColor={wt.subtle} value={query} onChangeText={setQuery} />
            </View>
            <Pressable onPress={() => setNewestFirst((v) => !v)} style={({ hovered }: any) => [s.filterBtn, TRANS, hovered && { borderColor: wt.accent, backgroundColor: wt.accentSoft }]}>
              <Ionicons name={newestFirst ? 'arrow-down' : 'arrow-up'} size={16} color={wt.ink} /><Text style={s.filterBtnText}>{newestFirst ? 'Newest' : 'Oldest'}</Text>
            </Pressable>
          </View>

          {/* Stat strip */}
          <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.stats}>
            <Stat n={stats.total} label="Total" />
            <View style={s.statDiv} />
            <Stat n={counts.Pending} label="Pending" />
            <View style={s.statDiv} />
            <Stat n={counts.Shortlisted} label="Shortlisted" />
            <View style={s.statDiv} />
            <Stat n={counts.hired} label="Hired" />
          </LinearGradient>

          {/* Chips */}
          <View style={s.chips}>
            {CHIPS.map((c) => {
              const on = chip === c.key;
              return (
                <Pressable key={c.key} onPress={() => setChip(c.key)} style={({ hovered }: any) => [s.chip, on && s.chipOn, TRANS, hovered && !on && { borderColor: wt.accent }]}>
                  <Text style={[s.chipText, on && { color: '#fff' }]}>{c.label} ({c.n})</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.countLabel}>{list.length} Application{list.length !== 1 ? 's' : ''}</Text>

          {loading && allApplications.length === 0 ? (
            <ActivityIndicator color={wt.accent} style={{ marginTop: 30 }} />
          ) : list.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="document-text-outline" size={28} color={wt.accent} /></View>
              <Text style={s.emptyTitle}>No applications here</Text>
              <Text style={s.emptySub}>When you apply to jobs, they’ll show up here so you can track them.</Text>
              <Pressable onPress={() => router.push('/(helper)/browse')} style={({ hovered }: any) => [s.browseBtn, TRANS, hovered && { transform: [{ translateY: -2 }] }]}><Text style={s.browseBtnText}>Find Jobs</Text></Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {list.map((a) => <AppCard key={a.application_id} app={a} active={selId === a.application_id} onPress={() => open(a)} />)}
            </View>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>

        {/* RIGHT */}
        {selected ? (
          <DetailPanel key={selected.application_id} app={selected} tab={tab} onTab={setTab} onClose={() => setSelId(null)}
            onWithdraw={() => setConfirmWithdraw(selected)} onMessage={() => message(selected)}
            onViewEmployer={() => setViewEmployer({ parent_id: selected.parent_id, parent_name: selected.parent_name })}
            onSaved={refresh} />
        ) : (
          <View style={s.panelEmpty}>
            <View style={s.panelEmptyIcon}><Ionicons name="reader-outline" size={28} color={wt.accent} /></View>
            <Text style={s.panelEmptyTitle}>Select an application</Text>
            <Text style={s.panelEmptySub}>Tap an application on the left to see its status, timeline, and details here.</Text>
          </View>
        )}
      </View>

      <ConfirmationModal visible={!!confirmWithdraw} title="Withdraw Application?" message="Are you sure? This action cannot be undone."
        confirmText="Withdraw" cancelText="Cancel" type="danger" onConfirm={() => confirmWithdraw && doWithdraw(confirmWithdraw)} onCancel={() => setConfirmWithdraw(null)} />
      <ParentProfileModal visible={!!viewEmployer} onClose={() => setViewEmployer(null)}
        parentData={viewEmployer ?? { parent_id: '', parent_name: '' }} />
      <NotificationModal visible={notif.visible} message={notif.msg} type={notif.type} autoClose duration={1600} onClose={() => setNotif((n) => ({ ...n, visible: false }))} />
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return <View style={s.stat}><Text style={s.statNum}>{n}</Text><Text style={s.statLabel}>{label}</Text></View>;
}

function AppCard({ app, active, onPress }: { app: Application; active: boolean; onPress: () => void }) {
  const m = meta(app.status);
  const salary = Number(app.salary_offered);
  const location = app.location || [app.municipality, app.province].filter(Boolean).join(', ');
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.card, active && s.cardActive, TRANS, hovered && !active && s.cardHover]}>
      <View style={s.cardTop}>
        <View style={s.cardAva}><Text style={s.cardAvaText}>{initials(app.parent_name)}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardTitle} numberOfLines={1}>{app.job_title}</Text>
          <View style={s.cardFamRow}>
            <Text style={s.cardFam} numberOfLines={1}>{app.parent_name}</Text>
            {app.parent_verified && <View style={s.verPill}><Ionicons name="checkmark-circle" size={10} color={wt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>}
          </View>
        </View>
        <View style={[s.statusPill, { backgroundColor: m.bg }]}><Ionicons name={m.icon} size={12} color={m.color} /><Text style={[s.statusPillText, { color: m.color }]}>{app.status === 'Pending' ? 'Pending' : m.label}</Text></View>
        <Ionicons name="chevron-forward" size={16} color={wt.subtle} />
      </View>
      <View style={s.cardMeta}>
        {salary > 0 && <View style={s.cardMetaItem}><Ionicons name="cash-outline" size={13} color={wt.subtle} /><Text style={s.cardMetaText}>₱{salary.toLocaleString()} / {app.salary_period}</Text></View>}
        {!!location && <View style={s.cardMetaItem}><Ionicons name="location-outline" size={13} color={wt.subtle} /><Text style={s.cardMetaText}>{location}</Text></View>}
        {!!app.employment_type && <View style={s.cardMetaItem}><Ionicons name="home-outline" size={13} color={wt.subtle} /><Text style={s.cardMetaText}>{app.employment_type}</Text></View>}
      </View>
      <Text style={s.cardApplied}>Applied {timeAgo(app.applied_at)}</Text>
    </Pressable>
  );
}

function DetailPanel({ app, tab, onTab, onClose, onWithdraw, onMessage, onViewEmployer, onSaved }: {
  app: Application; tab: Tab; onTab: (t: Tab) => void; onClose: () => void;
  onWithdraw: () => void; onMessage: () => void; onViewEmployer: () => void; onSaved: () => void;
}) {
  const m = meta(app.status);
  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(app.status);
  const salary = Number(app.salary_offered);
  const location = app.location || [app.municipality, app.province].filter(Boolean).join(', ');
  const idx = stepIndex(app.status);
  const isTerminal = REJECTED.includes(app.status) || app.status === 'Withdrawn';

  // employer "member since" + shared documents
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [docs, setDocs] = useState<{ document_id: number; document_type: string; status: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        const requesterId = raw ? JSON.parse(raw)?.user_id : '';
        const [pRes, dRes] = await Promise.all([
          fetch(`${API_URL}/helper/get_parent_profile.php?parent_id=${app.parent_id}&requester_id=${requesterId}`),
          fetch(`${API_URL}/helper/get_documents.php?user_id=${app.helper_id}&requester_id=${requesterId}`),
        ]);
        const pJson = await pRes.json(); const dJson = await dRes.json();
        if (cancelled) return;
        if (pJson?.success && pJson.data?.user?.created_at) setMemberSince(new Date(String(pJson.data.user.created_at).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }));
        const list = (dJson?.data?.documents ?? dJson?.documents ?? []) as any[];
        setDocs(list.map((d) => ({ document_id: d.document_id, document_type: d.document_type, status: d.status })));
      } catch { /* keep basic */ }
    })();
    return () => { cancelled = true; };
  }, [app.application_id]);

  const sharedIds = app.shared_document_ids ?? [];
  const sharedDocs = docs.filter((d) => sharedIds.includes(d.document_id));

  return (
    <View style={s.panel}>
      <View style={s.panelHead}>
        <View style={{ flex: 1 }} />
        {canWithdraw && (
          <Pressable onPress={onWithdraw} style={({ hovered }: any) => [s.withdrawTop, TRANS, hovered && { backgroundColor: wt.redSoft }]}>
            <Ionicons name="arrow-undo-outline" size={14} color={wt.red} /><Text style={s.withdrawTopText}>Withdraw Application</Text>
          </Pressable>
        )}
        <Pressable onPress={onClose} style={({ hovered }: any) => [s.closeBtn, TRANS, hovered && { backgroundColor: wt.lineSoft }]}><Ionicons name="close" size={20} color={wt.muted} /></Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {/* Title + status */}
        <View style={s.dpTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.dpTitle}>{app.job_title}</Text>
            {/* Job titles are concise (the category when several roles are picked);
                the specific roles are listed here so nothing is lost. */}
            {Array.isArray((app as any).job_names) && (app as any).job_names.length > 0 && (
              <View style={s.rolesWrap}>
                {(app as any).job_names.map((r: string, i: number) => (
                  <View key={i} style={s.roleChip}><Text style={s.roleChipText}>{r}</Text></View>
                ))}
              </View>
            )}
            <View style={s.cardFamRow}>
              <Text style={s.dpFam}>{app.parent_name}</Text>
              {app.parent_verified && <View style={s.verPill}><Ionicons name="checkmark-circle" size={10} color={wt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>}
            </View>
            <View style={[s.statusPill, { backgroundColor: m.bg, alignSelf: 'flex-start', marginTop: 8 }]}><Ionicons name={m.icon} size={13} color={m.color} /><Text style={[s.statusPillText, { color: m.color }]}>{m.label}</Text></View>
            <Text style={s.dpApplied}>Applied {timeAgo(app.applied_at)}</Text>
          </View>
          <View style={s.dpAva}><Text style={s.dpAvaText}>{initials(app.parent_name)}</Text></View>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {(['overview', 'timeline', 'application'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => onTab(t)} style={s.tab}>
              <Text style={[s.tabText, tab === t && { color: wt.accent }]}>{t[0].toUpperCase() + t.slice(1)}</Text>
              {tab === t && <View style={s.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {tab === 'overview' && (
          <View style={{ marginTop: 16 }}>
            {/* Reject reason, when the employer gave one (stored in parent_notes). */}
            {REJECTED.includes(app.status) && !!((app as any).parent_notes ?? (app as any).message_from_parent) && (
              <View style={s.feedbackCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={wt.red} />
                  <Text style={s.feedbackTitle}>Feedback from the employer</Text>
                </View>
                <Text style={s.feedbackText}>{(app as any).parent_notes ?? (app as any).message_from_parent}</Text>
              </View>
            )}
            <View style={s.twoCol}>
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>Job Details</Text>
                <InfoRow icon="cash-outline" label="Salary" value={salary > 0 ? `₱${salary.toLocaleString()} / ${app.salary_period}` : '—'} />
                <InfoRow icon="location-outline" label="Location" value={location || '—'} />
                <InfoRow icon="briefcase-outline" label="Employment" value={app.employment_type || '—'} />
                <InfoRow icon="time-outline" label="Schedule" value={app.work_schedule || '—'} />
                <InfoRow icon="calendar-outline" label="Applied On" value={fmtDate(app.applied_at) || '—'} last />
              </View>
              <View style={[s.infoCard, { backgroundColor: wt.raise }]}>
                <Text style={s.infoCardTitle}>About the Employer</Text>
                <View style={s.empRow}><Ionicons name="shield-checkmark-outline" size={15} color={wt.green} /><Text style={s.empRowText}>{app.parent_verified ? 'PESO Verified Employer' : 'Employer'}</Text></View>
                {memberSince && <View style={s.empRow}><Ionicons name="people-outline" size={15} color={wt.muted} /><Text style={s.empRowText}>Member since {memberSince}</Text></View>}
                {(app.parent_rating ?? 0) > 0 && <View style={s.empRow}><Ionicons name="star" size={15} color={wt.amber} /><Text style={s.empRowText}>{Number(app.parent_rating).toFixed(1)} rating</Text></View>}
                <Pressable onPress={onViewEmployer} style={({ hovered }: any) => [s.empBtn, TRANS, hovered && { backgroundColor: wt.accentSoft }]}>
                  <Text style={s.empBtnText}>View Employer Profile</Text><Ionicons name="chevron-forward" size={15} color={wt.accent} />
                </Pressable>
              </View>
            </View>

            {!!app.cover_letter && <CoverLetter text={app.cover_letter} />}
            {sharedDocs.length > 0 && (
              <View style={s.section}>
                <Text style={s.secTitle}>Application Documents</Text>
                <View style={{ gap: 8 }}>
                  {sharedDocs.map((d) => (
                    <View key={d.document_id} style={s.docRow}>
                      <Ionicons name="document-text" size={16} color={wt.green} /><Text style={s.docName}>{d.document_type}</Text>
                      <View style={s.docVerified}><Text style={s.docVerifiedText}>{d.status === 'Verified' ? 'Verified' : d.status}</Text></View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {tab === 'timeline' && (
          <View style={{ marginTop: 18 }}>
            {isTerminal ? (
              <View style={[s.termBanner, { backgroundColor: m.bg }]}><Ionicons name={m.icon} size={22} color={m.color} /><View style={{ flex: 1 }}><Text style={[s.termTitle, { color: m.color }]}>{m.label}</Text><Text style={s.termSub}>{m.sub}</Text></View></View>
            ) : (
              <>
                <View style={[s.statusBanner, { backgroundColor: m.bg }]}><Ionicons name={m.icon} size={17} color={m.color} /><Text style={[s.statusBannerText, { color: m.color }]}>{m.sub}</Text></View>
                <View style={{ marginTop: 6 }}>
                  {STEPS.map((step, i) => {
                    const done = i < idx, cur = i === idx;
                    const date = step.key === 'Applied' ? fmtDate(app.applied_at) : step.key === 'Reviewed' ? fmtDate(app.reviewed_at) : null;
                    return (
                      <View key={step.key} style={s.tlRow}>
                        <View style={s.tlRail}>
                          <View style={[s.tlDot, done && { backgroundColor: wt.green, borderColor: wt.green }, cur && { backgroundColor: wt.accent, borderColor: wt.accent }]}>
                            <Ionicons name={done ? 'checkmark' : step.icon} size={13} color={done || cur ? '#fff' : wt.subtle} />
                          </View>
                          {i < STEPS.length - 1 && <View style={[s.tlLine, i < idx && { backgroundColor: wt.green }]} />}
                        </View>
                        <View style={{ flex: 1, paddingBottom: 18 }}>
                          <Text style={[s.tlLabel, (done || cur) && { color: wt.ink }]}>{step.label}</Text>
                          {date ? <Text style={s.tlDate}>{date}</Text> : cur ? <Text style={s.tlDate}>In progress</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
            {!!app.message_from_parent && (
              <View style={s.section}><Text style={s.secTitle}>Message from Employer</Text><View style={s.msgBox}><Ionicons name="chatbubble-ellipses" size={17} color={wt.accent} /><Text style={s.msgText}>{app.message_from_parent}</Text></View></View>
            )}
          </View>
        )}

        {tab === 'application' && (
          <ApplicationTab app={app} docs={docs} sharedIds={sharedIds} onSaved={onSaved} />
        )}
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <Pressable onPress={onMessage} style={({ hovered }: any) => [s.msgBtn, TRANS, hovered && { backgroundColor: wt.accentSoft }]}>
          <Ionicons name="chatbubble-outline" size={16} color={wt.accent} /><Text style={s.msgBtnText}>Message Employer</Text>
        </Pressable>
        {canWithdraw ? (
          <Pressable onPress={onWithdraw} style={({ hovered, pressed }: any) => [{ flex: 1 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.footerPrimary}><Ionicons name="arrow-undo-outline" size={16} color="#fff" /><Text style={s.footerPrimaryText}>Withdraw Application</Text></LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={onClose} style={s.footerClose}><Text style={s.footerCloseText}>Close</Text></Pressable>
        )}
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, !last && s.infoRowDiv]}>
      <View style={s.infoIc}><Ionicons name={icon} size={14} color={wt.accent} /></View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function CoverLetter({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.section}>
      <Text style={s.secTitle}>Your Cover Letter</Text>
      <View style={s.coverBox}>
        <Text style={s.coverText} numberOfLines={open ? undefined : 4}>{text}</Text>
        {text.length > 160 && <Pressable onPress={() => setOpen((v) => !v)}><Text style={s.coverMore}>{open ? 'Read less' : 'Read more'} <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={wt.accent} /></Text></Pressable>}
      </View>
    </View>
  );
}

// Application tab — full cover letter + shared docs; editable while Pending.
function ApplicationTab({ app, docs, sharedIds, onSaved }: { app: Application; docs: any[]; sharedIds: number[]; onSaved: () => void }) {
  const editable = app.status === 'Pending';
  const [edit, setEdit] = useState(false);
  const [cover, setCover] = useState(app.cover_letter ?? '');
  const [sel, setSel] = useState<number[]>(sharedIds);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const verifiedDocs = docs.filter((d) => d.status === 'Verified');

  const save = async () => {
    if (cover.trim().length < 50) { setErr('Cover letter must be at least 50 characters.'); return; }
    setSaving(true); setErr(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const requesterId = raw ? JSON.parse(raw)?.user_id : null;
      const res = await fetch(`${API_URL}/helper/update_application.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: Number(app.application_id), helper_id: Number(app.helper_id), cover_letter: cover.trim(), shared_document_ids: sel, requester_id: requesterId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to update.');
      (app as any).cover_letter = cover.trim(); (app as any).shared_document_ids = sel;
      setEdit(false); onSaved();
    } catch (e: any) { setErr(e.message || 'Failed to update.'); } finally { setSaving(false); }
  };

  if (edit) {
    return (
      <View style={{ marginTop: 16 }}>
        <Text style={s.secTitle}>Edit Your Application</Text>
        <TextInput style={s.editInput} multiline value={cover} onChangeText={(v) => { setCover(v); setErr(null); }} maxLength={1000} textAlignVertical="top" placeholder="Write your cover letter (min 50 characters)…" placeholderTextColor={wt.subtle} />
        <Text style={s.charCount}>{cover.trim().length}/1000</Text>
        {verifiedDocs.length > 0 && (
          <>
            <Text style={[s.secTitle, { marginTop: 14 }]}>Attach Verified Documents</Text>
            <View style={{ gap: 8 }}>
              {verifiedDocs.map((d) => {
                const on = sel.includes(d.document_id);
                return (
                  <Pressable key={d.document_id} onPress={() => setSel((a) => on ? a.filter((x) => x !== d.document_id) : [...a, d.document_id])} style={[s.docPick, on && { borderColor: wt.accent, backgroundColor: '#FFF9F3' }]}>
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={19} color={on ? wt.accent : wt.subtle} /><Text style={s.docPickText}>{d.document_type}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
        {err && <View style={s.errRow}><Ionicons name="alert-circle" size={14} color={wt.red} /><Text style={s.errText}>{err}</Text></View>}
        <View style={s.applyRow}>
          <Pressable onPress={() => { setEdit(false); setCover(app.cover_letter ?? ''); setErr(null); }} style={s.cancelBtn}><Text style={s.cancelBtnText}>Cancel</Text></Pressable>
          <Pressable disabled={saving} onPress={save} style={({ hovered, pressed }: any) => [{ flex: 1.4 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.footerPrimary}>{saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.footerPrimaryText}>Save Changes</Text>}</LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const shared = docs.filter((d) => sharedIds.includes(d.document_id));
  return (
    <View style={{ marginTop: 16 }}>
      <View style={s.secRow}>
        <Text style={s.secTitle}>Your Cover Letter</Text>
        {editable && <Pressable onPress={() => setEdit(true)} style={({ hovered }: any) => [s.editLink, TRANS, hovered && { backgroundColor: wt.accentSoft }]}><Ionicons name="create-outline" size={14} color={wt.accent} /><Text style={s.editLinkText}>Edit</Text></Pressable>}
      </View>
      <View style={s.coverBox}><Text style={s.coverText}>{app.cover_letter || 'No cover letter.'}</Text></View>
      <View style={s.section}>
        <Text style={s.secTitle}>Shared Documents</Text>
        {shared.length === 0 ? <Text style={s.coverText}>No documents shared with this employer.</Text> : (
          <View style={{ gap: 8 }}>
            {shared.map((d) => <View key={d.document_id} style={s.docRow}><Ionicons name="document-text" size={16} color={wt.green} /><Text style={s.docName}>{d.document_type}</Text><View style={s.docVerified}><Text style={s.docVerifiedText}>{d.status}</Text></View></View>)}
          </View>
        )}
      </View>
    </View>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.canvas },
  body: { flex: 1, flexDirection: 'row', maxWidth: 1560, width: '100%', alignSelf: 'center' },
  feed: { paddingHorizontal: 28, paddingTop: 22, paddingBottom: 10 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: wt.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.muted, marginTop: 2, marginBottom: 18 },

  searchRow: { flexDirection: 'row', gap: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 12, paddingHorizontal: 14, height: 46 },
  searchInput: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.ink, outlineStyle: 'none' as any },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 12, paddingHorizontal: 16 },
  filterBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink },

  stats: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 10, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: wt.featInk },
  statLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.featMut },
  statDiv: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,.14)' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { borderWidth: 1, borderColor: wt.line, backgroundColor: wt.surface, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 },
  chipOn: { backgroundColor: wt.ink, borderColor: wt.ink },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.muted },
  countLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.muted, marginTop: 14, marginBottom: 4 },

  card: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 16, padding: 16, ...shadowSm, cursor: 'pointer' as any },
  cardHover: { borderColor: wt.accent, boxShadow: '0 10px 24px rgba(232,100,26,.10)' as any, transform: [{ translateY: -2 }] },
  cardActive: { borderColor: wt.accent, backgroundColor: '#FFFCF8' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAva: { width: 46, height: 46, borderRadius: 14, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  cardAvaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.accent },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.ink },
  cardFamRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  // "Roles included" chips — the specifics behind a concise job title
  feedbackCard: { backgroundColor: wt.redSoft, borderRadius: 12, padding: 14, marginBottom: 14 },
  feedbackTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.red },
  feedbackText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.ink, lineHeight: 20 },
  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  roleChip: { backgroundColor: wt.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  roleChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: wt.accent },
  cardFam: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: wt.greenSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  verPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: wt.green },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  cardMeta: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: wt.lineSoft },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted },
  cardApplied: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.subtle, marginTop: 8 },

  empty: { alignItems: 'center', paddingVertical: 46, gap: 8 },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: wt.ink },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.muted, textAlign: 'center', maxWidth: 320, lineHeight: 19 },
  browseBtn: { marginTop: 10, backgroundColor: wt.accent, borderRadius: 11, paddingHorizontal: 22, paddingVertical: 11 },
  browseBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  // Panel
  panel: { width: 540, backgroundColor: wt.surface, borderLeftWidth: 1, borderLeftColor: wt.line, ...({ boxShadow: '-8px 0 24px rgba(120,80,45,.06)' } as any) },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  withdrawTop: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#F3C6C6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  withdrawTopText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.red },
  closeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  panelEmpty: { width: 540, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 50 },
  panelEmptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  panelEmptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: wt.ink },
  panelEmptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  dpTop: { flexDirection: 'row', gap: 12, marginTop: 2 },
  dpTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: wt.ink, letterSpacing: -0.4 },
  dpFam: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.muted },
  dpApplied: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.subtle, marginTop: 8 },
  dpAva: { width: 72, height: 72, borderRadius: 36, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dpAvaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: wt.accent },

  tabs: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: wt.line, marginTop: 16 },
  tab: { paddingVertical: 12 },
  tabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.muted },
  tabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2.5, backgroundColor: wt.accent, borderRadius: 2 },

  twoCol: { flexDirection: 'row', gap: 12 },
  infoCard: { flex: 1, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 14, padding: 14 },
  infoCardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.ink, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  infoRowDiv: { borderBottomWidth: 1, borderBottomColor: wt.lineSoft },
  infoIc: { width: 28, height: 28, borderRadius: 8, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, flex: 1 },
  infoValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.ink, maxWidth: '52%', textAlign: 'right' },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 },
  empRowText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.ink },
  empBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.4, borderColor: wt.accent, borderRadius: 11, paddingVertical: 10, marginTop: 10 },
  empBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent },

  section: { marginTop: 16 },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: wt.ink, marginBottom: 8 },
  coverBox: { backgroundColor: wt.raise, borderWidth: 1, borderColor: wt.line, borderRadius: 12, padding: 14 },
  coverText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.muted, lineHeight: 20 },
  coverMore: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent, marginTop: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: wt.raise, borderWidth: 1, borderColor: wt.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11 },
  docName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  docVerified: { backgroundColor: wt.greenSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  docVerifiedText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: wt.green },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 13, marginBottom: 14 },
  statusBannerText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 18 },
  termBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 15 },
  termTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15 },
  termSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, marginTop: 2, lineHeight: 17 },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { alignItems: 'center', width: 30 },
  tlDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: wt.line, backgroundColor: wt.lineSoft, alignItems: 'center', justifyContent: 'center' },
  tlLine: { width: 2, flex: 1, marginVertical: 2, backgroundColor: wt.line, borderRadius: 1 },
  tlLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.muted, marginTop: 4 },
  tlDate: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.subtle, marginTop: 2 },
  msgBox: { flexDirection: 'row', gap: 10, backgroundColor: wt.accentSoft, borderRadius: 12, padding: 13 },
  msgText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.ink, lineHeight: 19 },

  editInput: { borderWidth: 1.4, borderColor: wt.line, borderRadius: 12, padding: 13, minHeight: 140, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.ink, backgroundColor: wt.raise, outlineStyle: 'none' as any },
  charCount: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, alignSelf: 'flex-end', marginTop: 6 },
  docPick: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: wt.surface, borderWidth: 1.4, borderColor: wt.line, borderRadius: 12, padding: 12 },
  docPickText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: wt.redSoft, borderRadius: 10, padding: 10 },
  errText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.red },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  editLinkText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent },

  applyRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: wt.line },
  cancelBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.muted },

  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: wt.line },
  msgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.4, borderColor: wt.accent, borderRadius: 13, paddingVertical: 13, paddingHorizontal: 16 },
  msgBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.accent },
  footerPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 13 },
  footerPrimaryText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  footerClose: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 13, backgroundColor: wt.ink },
  footerCloseText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
});
