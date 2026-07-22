// components/helper/web/HelperHomeWeb.tsx — desktop dashboard for the helper Home.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useRecommendations, useMyApplications } from '@/hooks/helper';
import { useCareBot } from '@/contexts/CareBotContext';
import { HelperTopNav } from './HelperTopNav';
import { wt, FEATURE_GRADIENT, ACCENT_GRADIENT } from './webTheme';

type Stats = { applications: number; saved_jobs: number; profile_views: number };

const CAT_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; fill: string; color: string }> = {
  cook:      { icon: 'restaurant-outline', fill: wt.accentSoft, color: '#8A4B23' },
  yaya:      { icon: 'happy-outline',      fill: wt.purpleSoft, color: wt.purple },
  babysit:   { icon: 'happy-outline',      fill: wt.purpleSoft, color: wt.purple },
  garden:    { icon: 'leaf-outline',       fill: wt.greenSoft,  color: wt.green },
  laundry:   { icon: 'shirt-outline',      fill: wt.amberSoft,  color: wt.amber },
  house:     { icon: 'home-outline',       fill: wt.greenSoft,  color: wt.green },
  default:   { icon: 'briefcase-outline',  fill: wt.accentSoft, color: wt.accent },
};
function catStyle(name?: string) {
  const n = (name || '').toLowerCase();
  for (const k of Object.keys(CAT_ICON)) if (k !== 'default' && n.includes(k)) return CAT_ICON[k];
  return CAT_ICON.default;
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  Pending:               { label: 'Pending Review',       bg: wt.amberSoft, color: wt.amber },
  Reviewed:              { label: 'Reviewed',             bg: wt.blueSoft,  color: wt.blue },
  Shortlisted:           { label: 'Shortlisted',          bg: wt.blueSoft,  color: wt.blue },
  'Interview Scheduled': { label: 'Interview Scheduled',  bg: wt.blueSoft,  color: wt.blue },
  Accepted:              { label: 'Accepted',             bg: wt.greenSoft, color: wt.green },
  hired:                 { label: 'Hired',                bg: wt.greenSoft, color: wt.green },
  Rejected:              { label: 'Application Rejected',  bg: wt.redSoft,   color: wt.red },
  auto_rejected:         { label: 'Application Rejected',  bg: wt.redSoft,   color: wt.red },
};

export function HelperHomeWeb({
  userName, avatar, verified, completeness, stats, onLogout, onBrowse, banners,
}: {
  userName: string;
  avatar: string | null;
  verified: boolean;
  completeness: number;
  stats: Stats;
  onLogout: () => void;
  onBrowse: () => void;
  banners?: React.ReactNode;
}) {
  const router = useRouter();
  const { open: openCareBot } = useCareBot();
  const { recommendations, loading: recLoading, toggleSaveJob } = useRecommendations();
  const { applications } = useMyApplications();
  const first = (userName || 'Helper').split(' ')[0];
  const recent = useMemo(() => applications.slice(0, 3), [applications]);
  const recs = useMemo(() => recommendations.slice(0, 4), [recommendations]);

  const go = (p: string) => router.push(p as never);

  return (
    <View style={s.root}>
      <HelperTopNav active="dashboard" userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {banners ? <View style={s.banners}>{banners}</View> : null}
        <View style={s.grid}>
          {/* LEFT */}
          <View style={s.col}>
            {/* Hero */}
            <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
              {verified && (
                <View style={s.heroPill}>
                  <Ionicons name="shield-checkmark" size={13} color="#fff" />
                  <Text style={s.heroPillText}>PESO VERIFIED</Text>
                </View>
              )}
              <Text style={s.heroHi}>{greeting()},</Text>
              <Text style={s.heroName}>{first} 👋</Text>
              <Text style={s.heroSub}>Your next opportunity is just around the corner.</Text>
              {recs.length > 0 && (
                <View style={s.heroMatch}>
                  <Ionicons name="star" size={16} color="#FFC24B" />
                  <Text style={s.heroMatchText}>{recs.length} new jobs match your profile today!</Text>
                </View>
              )}
              <View style={s.heroBtns}>
                <TouchableOpacity onPress={onBrowse} activeOpacity={0.9}>
                  <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroPrimary}>
                    <Ionicons name="briefcase-outline" size={17} color="#fff" />
                    <Text style={s.heroPrimaryText}>Browse Jobs</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={s.heroGhost} onPress={() => go('/(helper)/applications')} activeOpacity={0.85}>
                  <Ionicons name="document-text-outline" size={17} color="#fff" />
                  <Text style={s.heroGhostText}>See My Applications</Text>
                </TouchableOpacity>
              </View>
              <View style={s.heroAva}>
                {avatar ? <Image source={{ uri: avatar }} style={s.heroAvaImg} /> : <View style={[s.heroAvaImg, s.heroAvaFb]}><Ionicons name="person" size={54} color="rgba(255,255,255,.5)" /></View>}
                {verified && <View style={s.heroAvaChk}><Ionicons name="checkmark" size={18} color="#fff" /></View>}
              </View>
            </LinearGradient>

            {/* Stat strip */}
            <View style={s.stats}>
              <Stat icon="briefcase" fill={wt.accentSoft} color={wt.accent} value={stats.applications} label="Applications" link="View all" onPress={() => go('/(helper)/applications')} />
              <Stat icon="bookmark" fill={wt.accentSoft} color="#8A4B23" value={stats.saved_jobs} label="Saved Jobs" link="View all" onPress={() => go('/(helper)/browse/saved_jobs')} />
              <Stat icon="eye" fill={wt.greenSoft} color={wt.green} value={stats.profile_views} label="Profile Views" link="View all" onPress={() => go('/(helper)/profile')} />
              <Stat icon="trending-up" fill={wt.purpleSoft} color={wt.purple} value={`${completeness}%`} label="Profile Strength" link="Improve" onPress={() => go('/(helper)/profile')} last />
            </View>

            {/* Recommended */}
            <View style={s.card}>
              <View style={s.head}>
                <Text style={s.headTitle}>✨ Recommended for You</Text>
                <TouchableOpacity onPress={onBrowse}><Text style={s.headLink}>See all jobs →</Text></TouchableOpacity>
              </View>
              {recLoading ? (
                <View style={s.center}><ActivityIndicator color={wt.accent} /></View>
              ) : recs.length === 0 ? (
                <Text style={s.empty}>No strong matches yet. Add more skills or roles to your profile to see recommendations.</Text>
              ) : (
                <View style={s.jobs}>
                  {recs.map((job: any) => {
                    const cs = catStyle(job.category_name || job.title);
                    const pct = Math.round(Number(job.match_score ?? 0));
                    const top = pct >= 85;
                    return (
                      <Pressable key={job.job_post_id} onPress={onBrowse} style={({ hovered }: any) => [s.job, TRANS, hovered && s.jobHover]}>
                        {({ hovered }: any) => (
                          <>
                            <View style={s.jobTop}>
                              <View style={s.jobMatch}>
                                {top && <Ionicons name="star" size={11} color={wt.green} />}
                                <Text style={s.jobMatchText}>{top ? `Top Match · ${pct}%` : `${pct}% Match`}</Text>
                              </View>
                              <Pressable onPress={(e: any) => { e.stopPropagation?.(); toggleSaveJob(job.job_post_id); }} hitSlop={8}>
                                <Ionicons name={job.is_saved ? 'heart' : 'heart-outline'} size={18} color={job.is_saved ? wt.red : wt.subtle} />
                              </Pressable>
                            </View>
                            <View style={[s.jobIc, { backgroundColor: hovered ? wt.accent : cs.fill }]}><Ionicons name={cs.icon} size={22} color={hovered ? '#fff' : cs.color} /></View>
                            <Text style={[s.jobTitle, hovered && { color: wt.accent }]} numberOfLines={1}>{job.title || job.category_name || 'Job'}</Text>
                            <View style={s.jobEmp}>
                              <Text style={s.jobEmpText} numberOfLines={1}>{job.parent_name || 'Employer'}</Text>
                              {job.parent_verified ? <View style={s.jobPv}><Ionicons name="shield-checkmark" size={11} color={wt.green} /><Text style={s.jobPvText}>PESO Verified</Text></View> : null}
                            </View>
                            <View style={s.jobLoc}><Ionicons name="location-outline" size={12} color={wt.muted} /><Text style={s.jobLocText} numberOfLines={1}>{[job.municipality, job.province].filter(Boolean).join(', ') || '—'}</Text></View>
                            <Text style={s.jobPay}>₱{Number(job.salary_offered).toLocaleString()} <Text style={s.jobPayPer}>/ {job.salary_period || 'month'}</Text></Text>
                            <View style={s.jobTags}>
                              <Text style={s.tag}>{/^live-out/i.test(job.employment_type || '') ? 'Stay-out' : 'Stay-in'}</Text>
                              <Text style={s.tag}>{Number(job.min_experience_years) > 0 ? 'With experience' : 'No experience'}</Text>
                            </View>
                            <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.jobBtn, hovered && s.jobBtnHover]}>
                              <Text style={s.jobBtnText}>View Details</Text>
                              <Ionicons name="arrow-forward" size={15} color="#fff" style={{ marginLeft: 6, opacity: hovered ? 1 : 0 }} />
                            </LinearGradient>
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Recent applications */}
            <View style={s.card}>
              <View style={s.head}>
                <Text style={s.headTitle}>📋 Recent Applications</Text>
                <TouchableOpacity onPress={() => go('/(helper)/applications')}><Text style={s.headLink}>View all applications →</Text></TouchableOpacity>
              </View>
              {recent.length === 0 ? (
                <Text style={s.empty}>You haven’t applied to any jobs yet. Browse jobs to get started.</Text>
              ) : (
                <View style={s.appsRow}>
                  {recent.map((app: any) => {
                    const cs = catStyle(app.job_title);
                    const p = STATUS_PILL[app.status] ?? { label: app.status, bg: wt.lineSoft, color: wt.muted };
                    return (
                      <View key={app.application_id} style={s.arow}>
                        <View style={[s.aic, { backgroundColor: cs.fill }]}><Ionicons name={cs.icon} size={19} color={cs.color} /></View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.arowTitle} numberOfLines={1}>{app.job_title}</Text>
                          <Text style={s.arowSub} numberOfLines={1}>{app.parent_name}</Text>
                        </View>
                        <Text style={s.arowWhen}>Applied on{'\n'}{new Date(app.applied_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        <View style={[s.st, { backgroundColor: p.bg }]}><Text style={[s.stText, { color: p.color }]}>{p.label}</Text></View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* RIGHT */}
          <View style={s.rail}>
            {/* Profile progress */}
            <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.feature}>
              <View style={s.featHead}>
                <Text style={s.featTitle}>Profile Progress</Text>
                <Text style={s.featPct}>{completeness}% Complete</Text>
              </View>
              <View style={s.bar}><LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.barFill, { width: `${Math.min(100, completeness)}%` }]} /></View>
              <Text style={s.featText}>{completeness >= 90 ? 'Great — you’re verification-ready! Keep your profile fresh for more views.' : 'Almost there! Complete your profile to get more employer views.'}</Text>
              <TouchableOpacity onPress={() => go('/(helper)/profile')} activeOpacity={0.9}>
                <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.featBtn}>
                  <Text style={s.featBtnText}>Complete My Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {/* Quick actions */}
            <View style={s.card}>
              <Text style={[s.headTitle, { marginBottom: 14 }]}>Quick Actions</Text>
              <View style={s.qa}>
                <QA icon="search-outline" fill={wt.greenSoft} color={wt.green} label="Find Jobs" onPress={onBrowse} />
                <QA icon="document-text-outline" fill={wt.accentSoft} color={wt.accent} label="My Applications" onPress={() => go('/(helper)/applications')} />
                <QA icon="chatbubble-outline" fill={wt.purpleSoft} color={wt.purple} label="Messages" onPress={() => go('/(helper)/messages')} />
                <QA icon="person-outline" fill={wt.amberSoft} color={wt.amber} label="My Profile" onPress={() => go('/(helper)/profile')} />
                <QA icon="bookmark-outline" fill={wt.redSoft} color={wt.red} label="Saved Jobs" onPress={() => go('/(helper)/browse/saved_jobs')} />
                <QA icon="calendar-outline" fill={wt.blueSoft} color={wt.blue} label="My Schedule" onPress={() => go('/(helper)/work')} />
              </View>
            </View>

            {/* CareBot */}
            <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.feature}>
              <View style={s.botHead}>
                <View style={s.botIc}><Ionicons name="chatbubbles" size={20} color="#fff" /></View>
                <Text style={s.featTitle}>CareBot Assistant</Text>
                <View style={s.botAi}><Text style={s.botAiText}>AI</Text></View>
              </View>
              <Text style={s.featText}>Need help with jobs, hiring, attendance, or Kasambahay Law basics?</Text>
              <TouchableOpacity onPress={openCareBot} activeOpacity={0.9} style={{ alignSelf: 'flex-start' }}>
                <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.featBtn, { paddingHorizontal: 18 }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
                  <Text style={s.featBtnText}>  Chat with CareBot</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* Tip bar */}
        <View style={s.tip}>
          <Ionicons name="bulb-outline" size={20} color={wt.accent} />
          <Text style={s.tipText}>Tip of the day: Helpers with complete profiles get 3× more interview requests. </Text>
          <TouchableOpacity onPress={() => go('/(helper)/profile')}><Text style={s.tipLink}>Update your profile now →</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, fill, color, value, label, link, onPress, last }: any) {
  return (
    <View style={[s.stat, last && { borderRightWidth: 0 }]}>
      <View style={[s.statIc, { backgroundColor: fill }]}><Ionicons name={icon} size={22} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.statVal}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <TouchableOpacity onPress={onPress}><Text style={s.statLink}>{link}</Text></TouchableOpacity>
    </View>
  );
}
function QA({ icon, fill, color, label, onPress }: any) {
  return (
    <TouchableOpacity style={s.qaItem} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.qaIc, { backgroundColor: fill }]}><Ionicons name={icon} size={20} color={color} /></View>
      <Text style={s.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.canvas },
  scroll: { paddingBottom: 30 },
  banners: { maxWidth: 1440, width: '100%', alignSelf: 'center', paddingHorizontal: 34, paddingTop: 22, gap: 12 },
  grid: { flexDirection: 'row', gap: 20, maxWidth: 1440, width: '100%', alignSelf: 'center', paddingHorizontal: 34, paddingTop: 22 },
  col: { flex: 1, gap: 18, minWidth: 0 },
  rail: { width: 340, gap: 18 },

  // Hero
  hero: { borderRadius: 22, padding: 30, overflow: 'hidden', position: 'relative' },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16 },
  heroPillText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, letterSpacing: 0.4 },
  heroHi: { color: 'rgba(255,255,255,.9)', fontFamily: FontFamily.fredokaRegular, fontSize: 16 },
  heroName: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 34, letterSpacing: -0.6, marginVertical: 2 },
  heroSub: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 15, marginBottom: 12 },
  heroMatch: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 20 },
  heroMatchText: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },
  heroBtns: { flexDirection: 'row', gap: 12 },
  heroPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 12 },
  heroPrimaryText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  heroGhost: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 13, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.3)' },
  heroGhostText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  heroAva: { position: 'absolute', right: 44, top: '50%', transform: [{ translateY: -75 }] },
  heroAvaImg: { width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: 'rgba(255,255,255,.25)' },
  heroAvaFb: { backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  heroAvaChk: { position: 'absolute', right: 6, bottom: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: wt.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: wt.feat2 },

  // Stat strip
  stats: { flexDirection: 'row', backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 6, ...shadowSm },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: wt.line },
  statIc: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: wt.ink },
  statLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, marginTop: 1 },
  statLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: wt.accent },

  // Cards
  card: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 20, padding: 22, ...shadowSm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: wt.ink },
  headLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent },
  center: { padding: 30, alignItems: 'center' },
  empty: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.muted, lineHeight: 20, paddingVertical: 8 },

  // Jobs
  jobs: { flexDirection: 'row', gap: 14 },
  job: { flex: 1, borderWidth: 1, borderColor: wt.line, borderRadius: 16, padding: 14, backgroundColor: wt.raise, minWidth: 0, cursor: 'pointer' as any },
  jobHover: { borderColor: wt.accent, borderWidth: 1.6, backgroundColor: wt.surface, boxShadow: '0 14px 30px rgba(232,100,26,.18)' as any, transform: [{ translateY: -4 }] },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  jobMatch: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: wt.greenSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  jobMatchText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: wt.green },
  jobIc: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  jobTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: wt.ink },
  jobEmp: { flexDirection: 'row', alignItems: 'center', gap: 5, marginVertical: 4, flexWrap: 'wrap' },
  jobEmpText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted },
  jobPv: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  jobPvText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: wt.green },
  jobLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7 },
  jobLocText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, flex: 1 },
  jobPay: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.accent },
  jobPayPer: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted },
  jobTags: { flexDirection: 'row', gap: 6, marginVertical: 9, flexWrap: 'wrap' },
  tag: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.muted, borderWidth: 1, borderColor: wt.line, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  jobBtn: { borderRadius: 11, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  jobBtnHover: { boxShadow: '0 6px 16px rgba(60,30,10,.32)' as any, transform: [{ translateY: -1 }] },
  jobBtnText: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },

  // Recent apps
  appsRow: { flexDirection: 'row', gap: 12 },
  arow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: wt.line, borderRadius: 14, padding: 12, backgroundColor: wt.raise, minWidth: 0 },
  aic: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  arowTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink },
  arowSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted },
  arowWhen: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.muted, textAlign: 'right' },
  st: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  stText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  // Feature cards
  feature: { borderRadius: 20, padding: 22, overflow: 'hidden' },
  featHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  featTitle: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
  featPct: { color: wt.featMut, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },
  bar: { height: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.14)', overflow: 'hidden', marginBottom: 14 },
  barFill: { height: '100%', borderRadius: 999 },
  featText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, lineHeight: 20, marginBottom: 16 },
  featBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12 },
  featBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },

  // Quick actions
  qa: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qaItem: { width: '31%', alignItems: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  qaIc: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.ink, textAlign: 'center' },

  // CareBot
  botHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  botIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  botAi: { backgroundColor: 'rgba(255,255,255,.16)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  botAiText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, letterSpacing: 0.5 },

  // Tip
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 1440, width: '100%', alignSelf: 'center', marginTop: 20, marginHorizontal: 34, paddingHorizontal: 26, paddingVertical: 15, borderRadius: 16, backgroundColor: wt.accentSoft },
  tipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink },
  tipLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.accent },
});
