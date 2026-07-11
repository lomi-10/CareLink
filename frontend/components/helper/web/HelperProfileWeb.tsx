// components/helper/web/HelperProfileWeb.tsx — desktop web profile for the helper.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperProfile, useHelperStats } from '@/hooks/helper';
import { useCareBot } from '@/contexts/CareBotContext';
import { Donut } from '@/components/peso/reports/Charts';
import { HelperTopNav } from './HelperTopNav';
import { wt, FEATURE_GRADIENT, ACCENT_GRADIENT } from './webTheme';

const TRANS = { transitionDuration: '160ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const REQUIRED_DOCS = ['Valid ID', 'Barangay Clearance'];

type SectionStatus = 'complete' | 'verified' | 'optional' | 'incomplete';

export function HelperProfileWeb({ userName, avatar, onLogout }: { userName: string; avatar: string | null; onLogout: () => void }) {
  const router = useRouter();
  const { open: openCareBot } = useCareBot();
  const { profileData } = useHelperProfile();
  const { stats } = useHelperStats();

  const p: any = profileData?.profile ?? {};
  const roles: string[] = profileData?.mappedSpecialties?.jobs ?? [];
  const skills: string[] = profileData?.mappedSpecialties?.skills ?? [];
  const docs: any[] = profileData?.documents ?? [];
  const completeness = profileData?.profile_completeness ?? 0;
  const verified = p.verification_status === 'Verified';
  const rating = Number(p.rating_average ?? 0);
  const reviews = Number(p.rating_count ?? 0);
  const go = (path: string) => router.push(path as never);

  const personalDone = !!(p.contact_number && (p.city || p.municipality || p.address));
  const skillsDone   = roles.length > 0 && skills.length > 0;
  const prefsDone    = !!(p.employment_type || p.work_schedule || p.expected_salary);
  const docsVerified = REQUIRED_DOCS.every((d) => docs.some((x) => x.document_type === d && x.status === 'Verified'));
  const docsUploaded = REQUIRED_DOCS.every((d) => docs.some((x) => x.document_type === d));
  const expDone      = Number(p.years_experience) > 0;

  const sections = useMemo(() => ([
    { key: 'personal', title: 'Personal Information', desc: 'Basic information about you and how employers can contact you.', icon: 'person' as const, color: wt.accent, fill: wt.accentSoft, status: (personalDone ? 'complete' : 'incomplete') as SectionStatus, route: '/(helper)/profile/personal', prompt: 'contact details' },
    { key: 'skills', title: 'Skills & Expertise', desc: 'Add the skills you have so employers can find the right match.', icon: 'sparkles' as const, color: wt.purple, fill: wt.purpleSoft, status: (skillsDone ? 'complete' : 'incomplete') as SectionStatus, route: '/(helper)/profile/skills?edit=1', prompt: 'skills & roles' },
    { key: 'prefs', title: 'Work Preferences', desc: 'Set your preferred roles, salary, location and availability.', icon: 'briefcase' as const, color: wt.accent, fill: wt.accentSoft, status: (prefsDone ? 'complete' : 'incomplete') as SectionStatus, route: '/(helper)/profile/personal?edit=1', prompt: 'work preferences' },
    { key: 'docs', title: 'Documents', desc: 'Upload and manage your documents and IDs for verification.', icon: 'document-text' as const, color: wt.green, fill: wt.greenSoft, status: (docsVerified ? 'verified' : docsUploaded ? 'complete' : 'incomplete') as SectionStatus, route: '/(helper)/profile/documents', prompt: 'documents' },
    { key: 'experience', title: 'Experience', desc: 'Add your previous work experience and the families you worked with.', icon: 'bag-handle' as const, color: '#8A4B23', fill: wt.accentSoft, status: (expDone ? 'complete' : 'incomplete') as SectionStatus, route: '/(helper)/profile/personal?edit=1', prompt: 'work experience' },
    { key: 'references', title: 'References', desc: 'Add personal or employer references to build trust with employers.', icon: 'people' as const, color: '#DB2777', fill: '#FCE7F1', status: 'optional' as SectionStatus, route: '/(helper)/profile/personal?edit=1', prompt: 'references' },
  ]), [personalDone, skillsDone, prefsDone, docsVerified, docsUploaded, expDone]);

  const incomplete = sections.filter((x) => x.status === 'incomplete');
  const nextItem = incomplete[0];
  const location = [p.city ?? p.municipality, p.province].filter(Boolean).join(', ') || 'Location not set';
  const expLabel = Number(p.years_experience) > 0 ? `${p.years_experience} year${Number(p.years_experience) === 1 ? '' : 's'} experience` : 'New helper';

  return (
    <View style={s.root}>
      <HelperTopNav active="dashboard" userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.wrap}>
          <Text style={s.pageTitle}>My Profile</Text>
          <Text style={s.pageSub}>Manage your information and increase your chances of getting hired.</Text>

          <View style={s.grid}>
            {/* LEFT */}
            <View style={s.col}>
              {/* Hero */}
              <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
                <OutlineBtn label="Edit Profile" icon="create-outline" style={s.editBtn} onPress={() => go('/(helper)/profile/personal?edit=1')} />
                <View style={s.heroTop}>
                  <Pressable onPress={() => go('/(helper)/profile/personal?edit=1')} style={s.avaWrap}>
                    {avatar ? <Image source={{ uri: avatar }} style={s.ava} /> : <View style={[s.ava, s.avaFb]}><Ionicons name="person" size={52} color="rgba(255,255,255,.5)" /></View>}
                    <View style={s.avaCam}><Ionicons name="camera" size={16} color="#fff" /></View>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{userName || 'Helper'}</Text>
                    <View style={s.verPill}><Ionicons name="checkmark-circle" size={14} color={wt.green} /><Text style={s.verPillText}>{verified ? 'PESO Verified Helper' : 'Not yet verified'}</Text></View>
                    {roles.length > 0 && (
                      <View style={s.rolesRow}>
                        {roles.slice(0, 4).map((r, i) => (
                          <View key={r} style={s.roleItem}>
                            {i > 0 && <View style={s.roleDot} />}
                            <Text style={s.roleText}>{r}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={s.metaRow}>
                      <View style={s.metaItem}><Ionicons name="location-outline" size={14} color={wt.featMut} /><Text style={s.metaText}>{location}</Text></View>
                      <View style={s.metaDivider} />
                      <View style={s.metaItem}><Ionicons name="time-outline" size={14} color={wt.featMut} /><Text style={s.metaText}>{expLabel}</Text></View>
                    </View>
                  </View>
                  {p.bio ? (
                    <View style={s.quote}>
                      <Text style={s.quoteMark}>“</Text>
                      <Text style={s.quoteText} numberOfLines={4}>{p.bio}</Text>
                      <Ionicons name="heart" size={16} color={wt.accent} style={{ alignSelf: 'flex-end' }} />
                    </View>
                  ) : null}
                </View>

                <View style={s.heroDiv} />

                <View style={s.heroBottom}>
                  <Donut segments={[{ label: 'done', value: completeness, color: wt.accent }, { label: 'left', value: Math.max(0, 100 - completeness), color: 'rgba(255,255,255,.12)' }]} size={92} stroke={10} centerValue={`${completeness}%`} />
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={s.hbTitle}>Profile Completion</Text>
                    <Text style={s.hbText}>{completeness >= 100 ? 'Your profile is complete — great job!' : `Almost there! Complete ${incomplete.length || 1} more section${incomplete.length === 1 ? '' : 's'} to make your profile more attractive.`}</Text>
                    <View style={s.hbBar}><View style={[s.hbBarFill, { width: `${Math.min(100, completeness)}%` }]} /></View>
                  </View>
                  {nextItem ? (
                    <View style={s.nextCard}>
                      <Ionicons name="clipboard-outline" size={20} color={wt.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.nextTitle}>Complete {incomplete.length} more item{incomplete.length === 1 ? '' : 's'}</Text>
                        <Text style={s.nextSub}>Add your {nextItem.prompt} to boost your profile.</Text>
                      </View>
                      <OutlineBtn label="Complete Now" icon="arrow-forward" iconRight compact onPress={() => go(nextItem.route)} />
                    </View>
                  ) : null}
                </View>
              </LinearGradient>

              {/* Profile sections */}
              <Text style={s.sectionsTitle}>Profile Sections</Text>
              <View style={s.sections}>
                {sections.map((sec) => {
                  const st = statusMeta(sec.status);
                  return (
                    <Pressable key={sec.key} onPress={() => go(sec.route)} style={({ hovered, pressed }: any) => [s.secCard, TRANS, hovered && s.secCardHover, pressed && s.secCardPress]}>
                      <View style={s.secTop}>
                        <View style={[s.secIc, { backgroundColor: sec.fill }]}><Ionicons name={sec.icon} size={22} color={sec.color} /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.secTitle}>{sec.title}</Text>
                          <Text style={s.secDesc}>{sec.desc}</Text>
                        </View>
                      </View>
                      <View style={s.secFoot}>
                        <View style={s.secStatus}><Ionicons name={st.icon} size={15} color={st.color} /><Text style={[s.secStatusText, { color: st.color }]}>{st.label}</Text></View>
                        <Ionicons name="chevron-forward" size={18} color={wt.subtle} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Tip */}
              <View style={s.tip}>
                <Ionicons name="bulb-outline" size={19} color={wt.accent} />
                <Text style={s.tipText}>Tip: Profiles with complete information get 3× more interview requests. </Text>
                <Pressable onPress={() => go('/(helper)/profile/personal?edit=1')} style={({ hovered }: any) => [hovered && { opacity: 0.75 }]}>
                  <Text style={s.tipLink}>Continue improving your profile →</Text>
                </Pressable>
              </View>
            </View>

            {/* RIGHT */}
            <View style={s.rail}>
              {/* Quick overview */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Quick Overview</Text>
                <View style={s.ovGrid}>
                  <MiniStat icon="briefcase" fill={wt.accentSoft} color={wt.accent} value={stats.applications ?? 0} label="Applications" link="View all" onPress={() => go('/(helper)/applications')} />
                  <MiniStat icon="eye" fill={wt.greenSoft} color={wt.green} value={stats.profile_views ?? 0} label="Profile Views" link="This month" onPress={() => go('/(helper)/profile')} />
                  <MiniStat icon="bookmark" fill={wt.accentSoft} color="#8A4B23" value={stats.saved_jobs ?? 0} label="Saved Jobs" link="View saved" onPress={() => go('/(helper)/browse/saved_jobs')} />
                  <MiniStat icon="star" fill={wt.amberSoft} color={wt.amber} value={rating > 0 ? rating.toFixed(1) : '—'} label="Rating" link={`${reviews} reviews`} onPress={() => go('/(helper)/profile')} />
                </View>
              </View>

              {/* Verification */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Verification Status</Text>
                <View style={[s.verBox, { backgroundColor: verified ? wt.greenSoft : wt.amberSoft }]}>
                  <View style={[s.verIc, { backgroundColor: verified ? wt.green : wt.amber }]}><Ionicons name="shield-checkmark" size={22} color="#fff" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.verTitle, { color: verified ? wt.green : wt.amber }]}>{verified ? 'PESO Verified' : 'Pending Verification'}</Text>
                    <Text style={s.verSub}>{verified ? 'Your identity has been verified by PESO.' : 'Complete your profile and upload documents for review.'}</Text>
                  </View>
                </View>
                {verified && (
                  <View style={s.certRow}>
                    <View><Text style={s.certLabel}>Verified since</Text><Text style={s.certDate}>May 12, 2026</Text></View>
                    <OutlineBtn label="View Certificate" icon="open-outline" iconRight small accent onPress={() => go('/(helper)/profile/documents')} />
                  </View>
                )}
              </View>

              {/* CareBot */}
              <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.feature}>
                <View style={s.botHead}>
                  <View style={s.botIc}><Ionicons name="chatbubbles" size={19} color="#fff" /></View>
                  <Text style={s.featTitle}>CareBot Assistant</Text>
                  <View style={s.botAi}><Text style={s.botAiText}>AI</Text></View>
                </View>
                <Text style={s.featText}>Need help improving your profile or finding the right job?</Text>
                <Pressable onPress={openCareBot} style={({ hovered, pressed }: any) => [{ alignSelf: 'flex-start' }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { transform: [{ translateY: 0 }], opacity: 0.9 }]}>
                  <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.botBtn}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
                    <Text style={s.botBtnText}>Chat with CareBot</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function statusMeta(st: SectionStatus): { label: string; color: string; icon: keyof typeof Ionicons.glyphMap } {
  if (st === 'verified') return { label: 'Verified', color: wt.green, icon: 'checkmark-circle' };
  if (st === 'complete') return { label: 'Complete', color: wt.green, icon: 'checkmark-circle' };
  if (st === 'optional') return { label: 'Optional', color: wt.accent, icon: 'ellipse-outline' };
  return { label: 'Incomplete', color: wt.amber, icon: 'alert-circle-outline' };
}

function MiniStat({ icon, fill, color, value, label, link, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={({ hovered, pressed }: any) => [s.mini, TRANS, hovered && s.miniHover, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[s.miniIc, { backgroundColor: fill }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={s.miniVal}>{value}</Text>
      <Text style={s.miniLabel}>{label}</Text>
      <Text style={s.miniLink}>{link}</Text>
    </Pressable>
  );
}

function OutlineBtn({ label, icon, iconRight, onPress, style, compact, small, accent }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        s.oBtn, small && s.oBtnSm, compact && s.oBtnCompact, accent && s.oBtnAccent, TRANS,
        hovered && (accent ? s.oBtnAccentHover : s.oBtnHover),
        pressed && s.oBtnPress, style,
      ]}
    >
      {({ hovered }: any) => (
        <>
          {icon && !iconRight ? <Ionicons name={icon} size={small ? 14 : 16} color={accent ? (hovered ? '#fff' : wt.accent) : '#fff'} /> : null}
          <Text style={[s.oBtnText, small && { fontSize: 12.5 }, accent && { color: hovered ? '#fff' : wt.accent }]}>{label}</Text>
          {icon && iconRight ? <Ionicons name={icon} size={small ? 14 : 16} color={accent ? (hovered ? '#fff' : wt.accent) : '#fff'} /> : null}
        </>
      )}
    </Pressable>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.canvas },
  scroll: { paddingBottom: 20 },
  wrap: { maxWidth: 1440, width: '100%', alignSelf: 'center', paddingHorizontal: 34, paddingTop: 22 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: wt.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.muted, marginTop: 2, marginBottom: 20 },
  grid: { flexDirection: 'row', gap: 20 },
  col: { flex: 1, gap: 18, minWidth: 0 },
  rail: { width: 360, gap: 18 },

  // Hero
  hero: { borderRadius: 22, padding: 28, overflow: 'hidden', position: 'relative' },
  editBtn: { position: 'absolute', top: 24, right: 26, zIndex: 5 },
  heroTop: { flexDirection: 'row', gap: 22, alignItems: 'flex-start' },
  avaWrap: { position: 'relative' },
  ava: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: wt.accent },
  avaFb: { backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  avaCam: { position: 'absolute', right: 2, bottom: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: wt.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: wt.feat2 },
  name: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 32, letterSpacing: -0.5 },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(22,163,74,.16)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, marginVertical: 9 },
  verPillText: { color: wt.green, fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5 },
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 9 },
  roleItem: { flexDirection: 'row', alignItems: 'center' },
  roleDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: wt.accent, marginHorizontal: 9 },
  roleText: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 13.5 },
  metaDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,.18)' },
  quote: { width: 230, paddingLeft: 18, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,.14)' },
  quoteMark: { color: wt.accent, fontFamily: FontFamily.fredokaSemiBold, fontSize: 30, lineHeight: 30 },
  quoteText: { color: wt.featInk, fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 21, marginTop: -4 },
  heroDiv: { height: 1, backgroundColor: 'rgba(255,255,255,.12)', marginVertical: 22 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  hbTitle: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17 },
  hbText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19, marginVertical: 7 },
  hbBar: { height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.14)', overflow: 'hidden' },
  hbBarFill: { height: '100%', borderRadius: 999, backgroundColor: wt.accent },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,.2)', borderRadius: 14, padding: 14, maxWidth: 380, flex: 1 },
  nextTitle: { color: wt.accent, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },
  nextSub: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 12, marginTop: 2 },

  // Outline button
  oBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11, borderWidth: 1.4, borderColor: 'rgba(255,255,255,.35)', backgroundColor: 'rgba(255,255,255,.06)' },
  oBtnSm: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  oBtnCompact: { paddingHorizontal: 15, paddingVertical: 10 },
  oBtnHover: { backgroundColor: 'rgba(255,255,255,.16)', transform: [{ translateY: -2 }] },
  oBtnPress: { transform: [{ translateY: 0 }], opacity: 0.85 },
  oBtnAccent: { borderColor: wt.accent, backgroundColor: 'transparent' },
  oBtnAccentHover: { backgroundColor: wt.accent, transform: [{ translateY: -2 }] },
  oBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },

  // Sections
  sectionsTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: wt.ink, marginTop: 4 },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  secCard: { width: '31.5%', backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 18, padding: 18, ...shadowSm, cursor: 'pointer' as any },
  secCardHover: { borderColor: wt.accent, backgroundColor: '#FFF9F3', transform: [{ translateY: -3 }], boxShadow: '0 10px 26px rgba(232,100,26,.12)' as any },
  secCardPress: { transform: [{ translateY: -1 }] },
  secTop: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  secIc: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink, marginBottom: 3 },
  secDesc: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, lineHeight: 17 },
  secFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: wt.lineSoft, paddingTop: 12 },
  secStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secStatusText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },

  // Tip
  tip: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, marginTop: 2 },
  tipText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.muted },
  tipLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.accent },

  // Right cards
  card: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 20, padding: 20, ...shadowSm },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.ink, marginBottom: 16 },

  ovGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mini: { width: '46%', flexGrow: 1, backgroundColor: wt.raise, borderWidth: 1, borderColor: wt.line, borderRadius: 14, padding: 14, cursor: 'pointer' as any },
  miniHover: { borderColor: wt.accent, backgroundColor: '#FFF9F3', transform: [{ translateY: -2 }] },
  miniIc: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  miniVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: wt.ink },
  miniLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginTop: 1 },
  miniLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: wt.accent, marginTop: 4 },

  verBox: { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 14 },
  verIc: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15 },
  verSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginTop: 2, lineHeight: 17 },
  certRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  certLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted },
  certDate: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.ink, marginTop: 1 },

  feature: { borderRadius: 20, padding: 20, overflow: 'hidden' },
  botHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  botIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  featTitle: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
  botAi: { backgroundColor: 'rgba(255,255,255,.16)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  botAiText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, letterSpacing: 0.5 },
  featText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, lineHeight: 20, marginBottom: 14 },
  botBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  botBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
});
