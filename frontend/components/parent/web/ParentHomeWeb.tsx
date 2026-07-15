// components/parent/web/ParentHomeWeb.tsx — desktop recruitment dashboard body.
// Layout: left context sidebar (mode card · quick actions · CareBot) + bento main
// (greeting · 5 KPIs · hiring pipeline / today's interviews / recommended · recent
// applicants). Single gold accent, initials avatars unless a real photo exists.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentRecommendations, useParentRecentApplicants, useParentUpcomingInterviews, useParentJobs } from '@/hooks/parent';
import { computeHelperJobMatch, pickPrimaryOpenJob } from '@/lib/parentHelperMatch';
import { useCareBot } from '@/contexts/CareBotContext';
import { pt, ACCENT_GRADIENT } from './parentWebTheme';
import { ParentHeroCard } from './ParentHeroCard';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
type Stats = {
  active_job_posts: number; total_applicants: number; active_placements: number;
  saved_helpers: number; pending_applications: number; shortlisted_count: number;
};
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
const initials = (n: string) => (n || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
function fmtTime(v: string) { const d = new Date(String(v).replace(' ', 'T')); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }); }
function fmtDay(v: string, today: boolean) {
  if (today) return 'Today';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  Pending: { label: 'New', bg: pt.accentSoft, color: pt.caramel },
  Reviewed: { label: 'Reviewed', bg: pt.blueSoft, color: pt.blue },
  Shortlisted: { label: 'Shortlisted', bg: pt.greenSoft, color: pt.green },
  'Interview Scheduled': { label: 'Interview', bg: pt.blueSoft, color: pt.blue },
  Accepted: { label: 'Hired', bg: pt.greenSoft, color: pt.green },
  hired: { label: 'Hired', bg: pt.greenSoft, color: pt.green },
  contract_pending: { label: 'Contract', bg: pt.amberSoft, color: pt.amber },
};

export function ParentHomeWeb({
  userName, avatar, verified, completeness, stats, onSwitchMode, banners,
}: {
  userName: string; avatar: string | null; verified: boolean; completeness: number;
  stats: Stats; onSwitchMode: (m: 'recruitment' | 'work') => void; banners?: React.ReactNode;
}) {
  const router = useRouter();
  const { open: openCareBot } = useCareBot();
  const { recommendations, loading: recLoading } = useParentRecommendations();
  const { applicants, total: applicantTotal, loading: appLoading } = useParentRecentApplicants(6);
  const { interviews, loading: ivLoading } = useParentUpcomingInterviews(4);
  const { jobs } = useParentJobs();
  const first = (userName || 'there').split(' ')[0];

  // recommended_helpers.php ranks WHICH helpers to surface using its own server-side
  // score (hiring history / distance / rating). That answers a different question than
  // the per-job formula Browse Helpers and the applicants pipeline show, so displaying
  // the server number here made one helper read 75% on the dashboard and 58% on Browse.
  // Keep the server's picks, but re-score + re-sort with the shared formula so the
  // percentage means the same thing on every screen.
  const referenceJob = useMemo(() => pickPrimaryOpenJob(jobs), [jobs]);
  const recs = useMemo(
    () => recommendations
      .map((h) => ({ h, score: computeHelperJobMatch(h, referenceJob).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2),
    [recommendations, referenceJob],
  );
  const go = (p: string) => router.push(p as never);

  const ivToday = interviews.filter((i) => i.is_today).length;
  const KPIS = [
    { icon: 'briefcase-outline' as const, value: stats.active_job_posts, label: 'Active Job Posts', link: 'View all jobs', to: '/(parent)/jobs' },
    { icon: 'people-outline' as const, value: stats.total_applicants, label: 'Total Applicants', link: 'View all', to: '/(parent)/jobs?tab=applicants' },
    { icon: 'calendar-outline' as const, value: ivToday, label: 'Interviews Today', link: 'View schedule', to: '/(parent)/jobs?tab=applicants' },
    { icon: 'checkmark-circle-outline' as const, value: stats.active_placements, label: 'Helpers Hired', link: 'View hired', to: '/(parent)/hire' },
    { icon: 'bookmark-outline' as const, value: stats.saved_helpers, label: 'Saved Helpers', link: 'View saved', to: '/(parent)/browse' },
  ];

  // Hiring pipeline stage (0..4) from the stats we have.
  const stage = stats.active_placements > 0 ? 4 : stats.shortlisted_count > 0 ? 3 : interviews.length > 0 ? 2 : stats.total_applicants > 0 ? 1 : 0;
  const progress = Math.round(((stage + 1) / 5) * 100);
  const STEPS = [
    { label: 'Job Posted', sub: `${stats.active_job_posts} Active`, icon: 'briefcase' as const },
    { label: 'Applicants', sub: `${stats.total_applicants} Received`, icon: 'people' as const },
    { label: 'Interviews', sub: `${interviews.length} Scheduled`, icon: 'calendar' as const },
    { label: 'Selection', sub: `${stats.shortlisted_count} Shortlisted`, icon: 'star' as const },
    { label: 'Contract', sub: stats.active_placements > 0 ? `${stats.active_placements} Signed` : 'Pending', icon: 'document-text' as const },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.page}>
        {/* ── LEFT context sidebar ── */}
        <View style={s.sidebar}>
          {/* Current mode */}
          <View style={s.card}>
            <Text style={s.eyebrow}>Current Mode</Text>
            <View style={s.modeRow}>
              <View style={s.modeIc}><Ionicons name="people" size={20} color={pt.accent} /></View>
              <Text style={s.modeName}>Recruitment Mode</Text>
            </View>
            <Text style={s.modeDesc}>Find and hire trusted helpers for your household.</Text>
            <Pressable onPress={() => onSwitchMode('work')} style={({ hovered }: any) => [s.switchBtn, TRANS, hovered && { backgroundColor: pt.accentSoft }]}>
              <Text style={s.switchBtnText}>Switch to Work Mode</Text>
              <Ionicons name="arrow-forward" size={15} color={pt.accent} />
            </Pressable>
          </View>

          {/* Quick actions (no AI Match yet) */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Quick Actions</Text>
            <View style={s.qa}>
              <QA icon="add-circle" label="Post a Job" primary onPress={() => go('/(parent)/jobs')} />
              <QA icon="search" label="Browse Helpers" onPress={() => go('/(parent)/browse')} />
              <QA icon="people" label="View Applicants" onPress={() => go('/(parent)/jobs?tab=applicants')} />
              <QA icon="chatbubble" label="Messages" onPress={() => go('/(parent)/messages')} />
            </View>
          </View>

          {/* CareBot help */}
          <View style={s.botCard}>
            <Image source={CAREBOT_ICON} style={s.botMascot} resizeMode="contain" />
            <Text style={s.botTitle}>Need help?</Text>
            <Text style={s.botText}>Chat with CareBot about hiring, contracts & the Kasambahay Law.</Text>
            <Pressable onPress={openCareBot} style={({ hovered, pressed }: any) => [{ alignSelf: 'stretch' }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.botBtn}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={pt.ink} />
                <Text style={s.botBtnText}>Chat with CareBot</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* ── MAIN ── */}
        <View style={s.main}>
          {banners ? <View style={{ gap: 12 }}>{banners}</View> : null}

          {/* Hero name card */}
          <ParentHeroCard
            badge={{ icon: 'heart', label: 'FAMILY FIRST' }}
            greeting={greeting()}
            name={first}
            tagline="Let’s find trusted and verified helpers for your family."
            avatar={avatar}
            verified={verified}
            primary={{ label: 'Post a Job', icon: 'add-circle-outline', onPress: () => go('/(parent)/jobs') }}
            secondary={{ label: 'Browse Helpers', icon: 'search-outline', onPress: () => go('/(parent)/browse') }}
          />

          {/* KPI row */}
          <View style={s.kpis}>
            {KPIS.map((k) => (
              <Pressable key={k.label} onPress={() => go(k.to)} style={({ hovered }: any) => [s.kpi, TRANS, hovered && s.kpiHover]}>
                <View style={s.kpiIc}><Ionicons name={k.icon} size={20} color={pt.accent} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.kpiLabel} numberOfLines={1}>{k.label}</Text>
                  <Text style={s.kpiVal}>{k.value}</Text>
                  <Text style={s.kpiLink} numberOfLines={1}>{k.link} →</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* 3-col content */}
          <View style={s.row3}>
            {/* Hiring pipeline */}
            <View style={[s.card, s.colWide]}>
              <Text style={s.cardTitle}>Hiring Pipeline</Text>
              <View style={s.pipeline}>
                {STEPS.map((st, i) => {
                  const done = i < stage, cur = i === stage;
                  return (
                    <React.Fragment key={st.label}>
                      {i > 0 && <View style={[s.pipeLine, i <= stage && { backgroundColor: pt.accent }]} />}
                      <View style={s.pipeStep}>
                        <View style={[s.pipeCircle, done && s.pipeDone, cur && s.pipeCur]}>
                          <Ionicons name={done ? 'checkmark' : st.icon} size={16} color={done || cur ? '#fff' : pt.subtle} />
                        </View>
                        <Text style={[s.pipeLabel, (done || cur) && { color: pt.ink }]}>{st.label}</Text>
                        <Text style={[s.pipeSub, cur && { color: pt.accent, fontFamily: FontFamily.fredokaSemiBold }]}>{st.sub}</Text>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
              <View style={s.progWrap}>
                <View style={s.progIc}><Ionicons name="stats-chart" size={16} color={pt.accent} /></View>
                <View style={{ flex: 1 }}>
                  <View style={s.progHead}><Text style={s.progTitle}>Overall Hiring Progress</Text><Text style={s.progPct}>{progress}%</Text></View>
                  <View style={s.bar}><View style={[s.barFill, { width: `${progress}%` }]} /></View>
                  <Text style={s.progNote}>You’re making great progress — keep going.</Text>
                </View>
              </View>
            </View>

            {/* Today's interviews */}
            <View style={[s.card, s.col]}>
              <View style={s.head}><Text style={s.cardTitle}>Interviews</Text><Pressable onPress={() => go('/(parent)/jobs?tab=applicants')}><Text style={s.headLink}>View all</Text></Pressable></View>
              {ivLoading ? <View style={s.center}><ActivityIndicator color={pt.accent} /></View>
                : interviews.length === 0 ? (
                  <View style={s.emptyWrap}><View style={s.emptyIc}><Ionicons name="calendar-outline" size={22} color={pt.accent} /></View><Text style={s.emptyText}>No interviews scheduled. Shortlist an applicant to set one up.</Text></View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {interviews.map((iv) => (
                      <Pressable key={iv.interview_id} onPress={() => go('/(parent)/messages')} style={({ hovered }: any) => [s.ivRow, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.raise }]}>
                        {iv.profile_image ? <Image source={{ uri: iv.profile_image }} style={s.ivAva} /> : <View style={[s.ivAva, s.avaFb]}><Text style={s.avaInit}>{initials(iv.full_name)}</Text></View>}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.ivName} numberOfLines={1}>{iv.full_name}</Text>
                          <Text style={s.ivJob} numberOfLines={1}>{iv.job_title}</Text>
                          <View style={s.ivMeta}>
                            <Ionicons name={/video|online/i.test(iv.interview_type) ? 'videocam-outline' : 'location-outline'} size={12} color={pt.caramel} />
                            <Text style={s.ivType} numberOfLines={1}>{iv.interview_type}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.ivTime}>{fmtTime(iv.interview_date)}</Text>
                          <Text style={s.ivDay}>{fmtDay(iv.interview_date, iv.is_today)}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
            </View>

            {/* Recommended helpers */}
            <View style={[s.card, s.col]}>
              <View style={s.head}><Text style={s.cardTitle}>Recommended</Text><Pressable onPress={() => go('/(parent)/browse')}><Text style={s.headLink}>See all</Text></Pressable></View>
              {recLoading ? <View style={s.center}><ActivityIndicator color={pt.accent} /></View>
                : recs.length === 0 ? (
                  <View style={s.emptyWrap}><View style={s.emptyIc}><Ionicons name="people-outline" size={22} color={pt.accent} /></View><Text style={s.emptyText}>Post a job to see matched helpers.</Text></View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {recs.map(({ h, score }: any) => {
                      const pct = Math.round(score);
                      const loc = [h.municipality, h.province].filter(Boolean).join(', ');
                      return (
                        <Pressable key={h.user_id} onPress={() => go('/(parent)/browse')} style={({ hovered }: any) => [s.recRow, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.raise }]}>
                          {h.profile_image ? <Image source={{ uri: h.profile_image }} style={s.recAva} /> : <View style={[s.recAva, s.avaFb]}><Text style={s.avaInit}>{initials(h.full_name)}</Text></View>}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View style={s.recTop}>
                              <Text style={s.recName} numberOfLines={1}>{h.full_name}</Text>
                              {pct > 0 && <View style={s.matchPill}><Text style={s.matchPillText}>{pct >= 80 ? 'Top Match' : `${pct}%`}</Text></View>}
                            </View>
                            {h.is_verified ? <View style={s.recVer}><Ionicons name="shield-checkmark" size={10} color={pt.green} /><Text style={s.recVerText}>PESO Verified</Text></View> : null}
                            <Text style={s.recMeta} numberOfLines={1}>{[Number(h.experience_years) > 0 ? `${h.experience_years} yrs exp` : null, loc].filter(Boolean).join(' · ')}</Text>
                            {Number(h.expected_salary) > 0 && <Text style={s.recPay}>₱{Number(h.expected_salary).toLocaleString()} <Text style={s.recPayPer}>/ month</Text></Text>}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
            </View>
          </View>

          {/* Recent applicants */}
          <View style={s.card}>
            <View style={s.head}><Text style={s.cardTitle}>Recent Applicants</Text><Pressable onPress={() => go('/(parent)/jobs?tab=applicants')}><Text style={s.headLink}>View all</Text></Pressable></View>
            {appLoading ? <View style={s.center}><ActivityIndicator color={pt.accent} /></View>
              : applicants.length === 0 ? (
                <Text style={s.emptyText}>No applicants yet. Post a job to start receiving applications.</Text>
              ) : (
                <View style={s.applicants}>
                  {applicants.map((a) => {
                    const st = STATUS_META[a.status] ?? { label: a.status, bg: pt.lineSoft, color: pt.muted };
                    return (
                      <Pressable key={a.application_id} onPress={() => go('/(parent)/jobs?tab=applicants')} style={({ hovered }: any) => [s.appCard, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.raise }]}>
                        {a.profile_image ? <Image source={{ uri: a.profile_image }} style={s.appAva} /> : <View style={[s.appAva, s.avaFb]}><Text style={s.avaInit}>{initials(a.full_name)}</Text></View>}
                        <Text style={s.appName} numberOfLines={1}>{a.full_name}</Text>
                        <Text style={s.appRole} numberOfLines={1}>{a.role}</Text>
                        <View style={[s.appStatus, { backgroundColor: st.bg }]}><Text style={[s.appStatusText, { color: st.color }]}>{st.label}</Text></View>
                      </Pressable>
                    );
                  })}
                  {applicantTotal > applicants.length && (
                    <Pressable onPress={() => go('/(parent)/jobs?tab=applicants')} style={({ hovered }: any) => [s.moreCard, TRANS, hovered && { borderColor: pt.accent }]}>
                      <Text style={s.moreNum}>+{applicantTotal - applicants.length}</Text>
                      <Text style={s.moreText}>More Applicants</Text>
                    </Pressable>
                  )}
                </View>
              )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function QA({ icon, label, onPress, primary }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.qaItem, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.accentSoft }]}>
      <View style={[s.qaIc, primary && { backgroundColor: pt.accent }]}><Ionicons name={icon} size={19} color={primary ? '#fff' : pt.accent} /></View>
      <Text style={s.qaLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const shadowSm = { boxShadow: '0 2px 10px rgba(139,90,43,.06)' } as any;
const s = StyleSheet.create({
  scroll: { paddingBottom: 34 },
  page: { flexDirection: 'row', gap: 20, maxWidth: 1480, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 22, flexWrap: 'wrap' },
  sidebar: { width: 236, flexShrink: 0, flexGrow: 0, gap: 16 },
  main: { flex: 1, minWidth: 480, gap: 18 },

  card: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 18, ...shadowSm },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: pt.ink, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.accent },
  center: { paddingVertical: 26, alignItems: 'center' },

  // Mode card
  eyebrow: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  modeIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  modeName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  modeDesc: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, lineHeight: 18, marginBottom: 14 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.4, borderColor: pt.accent, borderRadius: 11, paddingVertical: 10, minHeight: 44 },
  switchBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },

  // Quick actions
  qa: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qaItem: { width: '47%', flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 13, borderWidth: 1, borderColor: pt.line, backgroundColor: pt.raise, minHeight: 44 },
  qaIc: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pt.accentSoft },
  qaLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: pt.ink, textAlign: 'center' },

  // CareBot
  botCard: { backgroundColor: pt.accentSoft, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#F1DFB6', alignItems: 'center' },
  botMascot: { width: 52, height: 52, marginBottom: 8 },
  botTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  botText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, textAlign: 'center', lineHeight: 17, marginTop: 4, marginBottom: 14 },
  botBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 11, minHeight: 44 },
  botBtnText: { color: pt.ink, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },

  // Greeting
  hi: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: pt.ink, letterSpacing: -0.5 },
  hiSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.muted, marginTop: 2 },

  // KPI row
  kpis: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  kpi: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 16, ...shadowSm, cursor: 'pointer' as any },
  kpiHover: { borderColor: pt.accent, transform: [{ translateY: -2 }] },
  kpiIc: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: pt.accentSoft },
  kpiLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted },
  kpiVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: pt.ink, marginVertical: 1 },
  kpiLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: pt.accent },

  // 3-col content
  row3: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  colWide: { flex: 1.4, minWidth: 360 },
  col: { flex: 1, minWidth: 260 },

  // Pipeline
  pipeline: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  pipeStep: { flex: 1, minWidth: 0, alignItems: 'center' },
  pipeLine: { width: 18, height: 2, backgroundColor: pt.line, marginTop: 19 },
  pipeCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: pt.lineSoft, borderWidth: 2, borderColor: pt.line, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  pipeDone: { backgroundColor: pt.accent, borderColor: pt.accent },
  pipeCur: { backgroundColor: pt.caramel, borderColor: pt.caramel },
  pipeLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: pt.muted, textAlign: 'center' },
  pipeSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: pt.subtle, textAlign: 'center', marginTop: 1 },
  progWrap: { flexDirection: 'row', gap: 12, backgroundColor: pt.raise, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: pt.line },
  progIc: { width: 34, height: 34, borderRadius: 10, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  progHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  progTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  progPct: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },
  bar: { height: 8, borderRadius: 999, backgroundColor: pt.lineSoft, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999, backgroundColor: pt.accent },
  progNote: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 6 },

  // Interviews
  ivRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 10 },
  ivAva: { width: 40, height: 40, borderRadius: 20 },
  ivName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  ivJob: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted },
  ivMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ivType: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.caramel },
  ivTime: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  ivDay: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.subtle },

  // Recommended
  recRow: { flexDirection: 'row', gap: 11, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 11 },
  recAva: { width: 46, height: 46, borderRadius: 23 },
  recTop: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'space-between' },
  recName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  matchPill: { backgroundColor: pt.greenSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  matchPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: pt.green },
  recVer: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  recVerText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: pt.green },
  recMeta: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 3 },
  recPay: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent, marginTop: 3 },
  recPayPer: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: pt.muted },

  // Recent applicants
  applicants: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  appCard: { width: 130, flexGrow: 1, maxWidth: 160, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: pt.line, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8 },
  appAva: { width: 52, height: 52, borderRadius: 26, marginBottom: 2 },
  appName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink, textAlign: 'center' },
  appRole: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, textAlign: 'center' },
  appStatus: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 3 },
  appStatusText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5 },
  moreCard: { width: 130, flexGrow: 1, maxWidth: 160, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: pt.line, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14, backgroundColor: pt.accentSoft },
  moreNum: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: pt.accent },
  moreText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted, textAlign: 'center' },

  // shared avatar fallback + empties
  avaFb: { backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avaInit: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.caramel },
  emptyWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyIc: { width: 48, height: 48, borderRadius: 14, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
});
