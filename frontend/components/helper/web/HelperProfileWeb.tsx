// components/helper/web/HelperProfileWeb.tsx — desktop web profile for the helper.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperProfile, useHelperStats } from '@/hooks/helper';
import { useCareBot } from '@/contexts/CareBotContext';
import { Donut } from '@/components/peso/reports/Charts';
import { HelperTopNav } from './HelperTopNav';
import { wt, FEATURE_GRADIENT, ACCENT_GRADIENT } from './webTheme';

const REQUIRED_DOCS = ['Valid ID', 'Barangay Clearance'];

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

  // Real "boost your profile" checklist derived from what's actually missing.
  const boosts = useMemo(() => ([
    { label: 'Add a profile photo', done: !!avatar, route: '/(helper)/profile/personal?edit=1' },
    { label: 'Write your bio', done: !!(p.bio && String(p.bio).trim()), route: '/(helper)/profile/personal?edit=1' },
    { label: 'Add your skills & roles', done: skills.length > 0 && roles.length > 0, route: '/(helper)/profile/skills?edit=1' },
    { label: 'Upload your documents', done: REQUIRED_DOCS.every((d) => docs.some((x) => x.document_type === d)), route: '/(helper)/profile/documents' },
  ]), [avatar, p.bio, skills.length, roles.length, docs]);

  // Achievements computed from real signals (earned vs locked).
  const achievements = [
    { label: 'PESO Verified', icon: 'shield-checkmark' as const, color: wt.green, fill: wt.greenSoft, earned: verified },
    { label: 'Complete Profile', icon: 'star' as const, color: wt.accent, fill: wt.accentSoft, earned: completeness >= 90 },
    { label: 'Active Applicant', icon: 'flash' as const, color: wt.purple, fill: wt.purpleSoft, earned: (stats.applications ?? 0) >= 5 },
    { label: 'Highly Rated', icon: 'trophy' as const, color: wt.blue, fill: wt.blueSoft, earned: rating >= 4.5 },
  ];

  const salary = p.expected_salary ? `₱${Number(p.expected_salary).toLocaleString()} or negotiable` : 'Negotiable';
  const location = [p.city ?? p.municipality, p.province].filter(Boolean).join(', ') || 'Not set';

  return (
    <View style={s.root}>
      <HelperTopNav active="dashboard" userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.grid}>
          {/* LEFT */}
          <View style={s.col}>
            {/* Hero */}
            <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
              <View style={s.heroTop}>
                <View style={s.avaWrap}>
                  {avatar ? <Image source={{ uri: avatar }} style={s.ava} /> : <View style={[s.ava, s.avaFb]}><Ionicons name="person" size={54} color="rgba(255,255,255,.5)" /></View>}
                  <TouchableOpacity style={s.avaCam} onPress={() => go('/(helper)/profile/personal?edit=1')}><Ionicons name="camera" size={16} color="#fff" /></TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{userName || 'Helper'}</Text>
                  <View style={s.verPill}><Ionicons name="shield-checkmark" size={13} color={wt.green} /><Text style={s.verPillText}>{verified ? 'PESO Verified Helper' : 'Profile not yet verified'}</Text></View>
                  {roles.length > 0 && <Text style={s.roles}>{roles.slice(0, 4).join('  ·  ')}</Text>}
                  <View style={s.rateRow}>
                    {[1, 2, 3, 4, 5].map((i) => <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={16} color="#FFC24B" />)}
                    <Text style={s.rateText}>{rating > 0 ? rating.toFixed(1) : '—'} Employer Trust Score</Text>
                  </View>
                </View>
                {p.bio ? (
                  <View style={s.quote}>
                    <Ionicons name="chatbox-ellipses" size={18} color={wt.accent} />
                    <Text style={s.quoteText} numberOfLines={4}>{p.bio}</Text>
                  </View>
                ) : null}
              </View>
              <View style={s.heroDiv} />
              <View style={s.heroBottom}>
                <Donut segments={[{ label: 'done', value: completeness, color: wt.accent }, { label: 'left', value: Math.max(0, 100 - completeness), color: 'rgba(255,255,255,.14)' }]} size={78} stroke={9} centerValue={`${completeness}%`} />
                <View style={{ flex: 1 }}>
                  <Text style={s.hbTitle}>Profile Completion</Text>
                  <Text style={s.hbText}>{completeness >= 100 ? 'Your profile is complete!' : 'Almost there! Complete remaining sections to get more job matches.'}</Text>
                  <View style={s.hbBar}><View style={[s.hbBarFill, { width: `${Math.min(100, completeness)}%` }]} /></View>
                </View>
                <View style={s.heroBtns}>
                  <TouchableOpacity onPress={() => go('/(helper)/profile/personal?edit=1')} activeOpacity={0.9}>
                    <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.editBtn}><Ionicons name="create-outline" size={16} color="#fff" /><Text style={s.editBtnText}>Edit Profile</Text></LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.shareBtn} activeOpacity={0.85}><Ionicons name="share-social-outline" size={16} color="#fff" /><Text style={s.shareBtnText}>Share Profile</Text></TouchableOpacity>
                </View>
              </View>
            </LinearGradient>

            {/* Stat cards */}
            <View style={s.statsRow}>
              <PStat icon="briefcase" fill={wt.accentSoft} color={wt.accent} value={stats.applications ?? 0} label="Applications" link="View all" onPress={() => go('/(helper)/applications')} />
              <PStat icon="eye" fill={wt.greenSoft} color={wt.green} value={stats.profile_views ?? 0} label="Profile Views" link="View analytics" onPress={() => go('/(helper)/profile')} />
              <PStat icon="bookmark" fill={wt.accentSoft} color="#8A4B23" value={stats.saved_jobs ?? 0} label="Saved Jobs" link="View saved" onPress={() => go('/(helper)/browse/saved_jobs')} />
              <PStat icon="star" fill={wt.amberSoft} color={wt.amber} value={rating > 0 ? rating.toFixed(1) : '—'} label="Rating" link={`${reviews} reviews`} onPress={() => go('/(helper)/profile')} />
            </View>

            {/* Skills & Work prefs */}
            <View style={s.twoCol}>
              <View style={[s.card, { flex: 1 }]}>
                <View style={s.head}><Text style={s.headTitle}>🛠️ Skills & Expertise</Text><TouchableOpacity onPress={() => go('/(helper)/profile/skills?edit=1')}><Text style={s.headLink}>Manage Skills</Text></TouchableOpacity></View>
                {skills.length === 0 ? (
                  <Text style={s.empty}>No skills yet. Tap Manage Skills to add what you can do.</Text>
                ) : (
                  <View style={s.skillGrid}>
                    {skills.slice(0, 7).map((sk) => (
                      <View key={sk} style={s.skill}><View style={s.skillIc}><Ionicons name="sparkles" size={18} color={wt.accent} /></View><Text style={s.skillLabel} numberOfLines={1}>{sk}</Text></View>
                    ))}
                    <TouchableOpacity style={s.skillAdd} onPress={() => go('/(helper)/profile/skills?edit=1')}><Ionicons name="add" size={22} color={wt.subtle} /><Text style={s.skillAddText}>Add Skill</Text></TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={[s.card, { flex: 1 }]}>
                <View style={s.head}><Text style={s.headTitle}>Work Preferences</Text><TouchableOpacity onPress={() => go('/(helper)/profile/personal?edit=1')}><Text style={s.headLink}>Edit</Text></TouchableOpacity></View>
                <Pref icon="briefcase-outline" label="Work Type" value={[p.work_schedule, p.employment_type].filter(Boolean).join(' · ') || 'Not set'} />
                <Pref icon="people-outline" label="Preferred Roles" value={roles.slice(0, 3).join(', ') || 'Not set'} />
                <Pref icon="location-outline" label="Preferred Location" value={location} />
                <Pref icon="cash-outline" label="Preferred Salary" value={salary} />
                <Pref icon="time-outline" label="Availability" value={p.employment_type ? 'Immediately' : 'Not set'} last />
              </View>
            </View>

            {/* Documents */}
            <View style={s.card}>
              <View style={s.head}><Text style={s.headTitle}>🗂️ Documents & Verification</Text><TouchableOpacity onPress={() => go('/(helper)/profile/documents')}><Text style={s.headLink}>View All</Text></TouchableOpacity></View>
              {docs.length === 0 ? (
                <Text style={s.empty}>No documents uploaded yet. Upload your Valid ID and Barangay Clearance to get verified.</Text>
              ) : (
                <View style={s.docGrid}>
                  {docs.map((d) => {
                    const ok = d.status === 'Verified';
                    const rej = d.status === 'Rejected';
                    return (
                      <View key={d.document_type} style={s.docRow}>
                        <Ionicons name={ok ? 'checkmark-circle' : rej ? 'close-circle' : 'time'} size={18} color={ok ? wt.green : rej ? wt.red : wt.amber} />
                        <Text style={s.docName}>{d.document_type}</Text>
                        <Text style={[s.docStatus, { color: ok ? wt.green : rej ? wt.red : wt.amber }]}>{ok ? 'Verified' : rej ? 'Rejected' : 'Pending'}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* RIGHT */}
          <View style={s.rail}>
            {/* Verification status */}
            <View style={s.card}>
              <View style={s.head}><Text style={s.headTitleSm}>Verification Status</Text></View>
              <View style={[s.verBox, { backgroundColor: verified ? wt.greenSoft : wt.amberSoft }]}>
                <View style={[s.verIc, { backgroundColor: verified ? wt.green : wt.amber }]}><Ionicons name="shield-checkmark" size={20} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.verTitle, { color: verified ? wt.green : wt.amber }]}>{verified ? 'PESO Verified' : 'Pending Verification'}</Text>
                  <Text style={s.verSub}>{verified ? 'Your identity has been verified by PESO.' : 'Complete your profile and upload documents for review.'}</Text>
                </View>
              </View>
              {verified && (
                <TouchableOpacity style={s.certBtn} onPress={() => go('/(helper)/profile/documents')}><Ionicons name="download-outline" size={15} color={wt.accent} /><Text style={s.certBtnText}>View Certificate</Text></TouchableOpacity>
              )}
            </View>

            {/* CareBot coach */}
            <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.feature}>
              <View style={s.botHead}><View style={s.botIc}><Ionicons name="chatbubbles" size={20} color="#fff" /></View><Text style={s.featTitle}>CareBot AI Coach</Text></View>
              <Text style={s.featText}>I can help you improve your profile and find the right opportunities!</Text>
              {['How can I improve my profile?', 'Find jobs that match me', 'Interview tips & preparation', 'Resume & work preference tips'].map((q) => (
                <TouchableOpacity key={q} style={s.botRow} onPress={openCareBot} activeOpacity={0.8}>
                  <Text style={s.botRowText}>{q}</Text><Ionicons name="chevron-forward" size={16} color={wt.featMut} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={openCareBot} activeOpacity={0.9} style={{ marginTop: 10 }}>
                <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.featBtn}><Text style={s.featBtnText}>Chat with CareBot</Text></LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {/* Boost your profile */}
            <View style={s.card}>
              <Text style={[s.headTitleSm, { marginBottom: 12 }]}>Boost your profile</Text>
              {boosts.map((b) => (
                <TouchableOpacity key={b.label} style={s.boostRow} onPress={() => go(b.route)} activeOpacity={0.8}>
                  <Ionicons name={b.done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={b.done ? wt.green : wt.subtle} />
                  <Text style={[s.boostText, b.done && { color: wt.muted, textDecorationLine: 'line-through' }]}>{b.label}</Text>
                  {!b.done && <Ionicons name="chevron-forward" size={15} color={wt.subtle} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Achievements */}
            <View style={s.card}>
              <View style={s.head}><Text style={s.headTitleSm}>Achievements</Text></View>
              <View style={s.achGrid}>
                {achievements.map((a) => (
                  <View key={a.label} style={[s.ach, !a.earned && { opacity: 0.4 }]}>
                    <View style={[s.achIc, { backgroundColor: a.fill }]}><Ionicons name={a.icon} size={20} color={a.color} /></View>
                    <Text style={s.achLabel} numberOfLines={2}>{a.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function PStat({ icon, fill, color, value, label, link, onPress }: any) {
  return (
    <View style={s.pstat}>
      <View style={[s.pstatIc, { backgroundColor: fill }]}><Ionicons name={icon} size={22} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.pstatVal}>{value}</Text>
        <Text style={s.pstatLabel}>{label}</Text>
      </View>
      <TouchableOpacity onPress={onPress}><Text style={s.pstatLink}>{link}</Text></TouchableOpacity>
    </View>
  );
}
function Pref({ icon, label, value, last }: any) {
  return (
    <View style={[s.pref, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={17} color={wt.accent} />
      <View style={{ flex: 1 }}>
        <Text style={s.prefLabel}>{label}</Text>
        <Text style={s.prefValue}>{value}</Text>
      </View>
    </View>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.canvas },
  scroll: { paddingBottom: 20 },
  grid: { flexDirection: 'row', gap: 20, maxWidth: 1440, width: '100%', alignSelf: 'center', paddingHorizontal: 34, paddingTop: 22 },
  col: { flex: 1, gap: 18, minWidth: 0 },
  rail: { width: 340, gap: 18 },

  hero: { borderRadius: 22, padding: 26, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  avaWrap: { position: 'relative' },
  ava: { width: 118, height: 118, borderRadius: 59, borderWidth: 4, borderColor: wt.accent },
  avaFb: { backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  avaCam: { position: 'absolute', right: 2, bottom: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: wt.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: wt.feat2 },
  name: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 30, letterSpacing: -0.5 },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginVertical: 8 },
  verPillText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5 },
  roles: { color: wt.featMut, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, marginBottom: 8 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rateText: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, marginLeft: 6 },
  quote: { width: 220, backgroundColor: 'rgba(0,0,0,.18)', borderRadius: 14, padding: 14, gap: 8 },
  quoteText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  heroDiv: { height: 1, backgroundColor: 'rgba(255,255,255,.12)', marginVertical: 20 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  hbTitle: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
  hbText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, lineHeight: 18, marginVertical: 6, maxWidth: 320 },
  hbBar: { height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.14)', overflow: 'hidden', maxWidth: 300 },
  hbBarFill: { height: '100%', borderRadius: 999, backgroundColor: wt.accent },
  heroBtns: { gap: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  editBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.3)' },
  shareBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 14 },
  pstat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 16, padding: 16, ...shadowSm },
  pstatIc: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pstatVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: wt.ink },
  pstatLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted },
  pstatLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: wt.accent },

  twoCol: { flexDirection: 'row', gap: 18 },
  card: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 20, padding: 20, ...shadowSm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.ink },
  headTitleSm: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink },
  headLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent },
  empty: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.muted, lineHeight: 19 },

  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skill: { width: '22%', alignItems: 'center', gap: 7 },
  skillIc: { width: 52, height: 52, borderRadius: 15, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  skillLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: wt.ink, textAlign: 'center' },
  skillAdd: { width: '22%', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.4, borderColor: wt.line, borderStyle: 'dashed', borderRadius: 15, height: 52 },
  skillAddText: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: wt.subtle },

  pref: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: wt.lineSoft },
  prefLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted },
  prefValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink, marginTop: 1 },

  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  docRow: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 9 },
  docName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  docStatus: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },

  verBox: { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 14 },
  verIc: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  verSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginTop: 2, lineHeight: 17 },
  certBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderWidth: 1, borderColor: wt.line, borderRadius: 11, paddingVertical: 11 },
  certBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent },

  feature: { borderRadius: 20, padding: 20, overflow: 'hidden' },
  botHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  botIc: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  featTitle: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
  featText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  botRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,.07)', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 8 },
  botRowText: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5 },
  featBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12 },
  featBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },

  boostRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  boostText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },

  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ach: { width: '22%', alignItems: 'center', gap: 6 },
  achIc: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  achLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: wt.ink, textAlign: 'center', lineHeight: 13 },
});
