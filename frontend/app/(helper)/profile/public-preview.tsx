// app/(helper)/profile/public-preview.tsx
// Read-only preview of how this helper's profile appears to parents — styled as a
// proper résumé: a gradient hero band, then a two-column CV layout on desktop
// (sidebar + main with a work-experience timeline), single-column on mobile.
// PHP: helper/get_profile.php (via useHelperProfile) — same data parents see.

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHelperProfile } from '@/hooks/helper';
import { useResponsive } from '@/hooks/shared/useResponsive';
import { HelperTabBar } from '@/components/helper/home';
import { useProfileTheme, HERO_GRADIENT } from './profile.theme';
import { createStyles } from './public-preview.styles';

export default function PublicProfilePreview() {
  const router = useRouter();
  const t = useProfileTheme();
  const { PAGE_BG, ORANGE, DARK, MUTED, GREEN } = t;
  const { isDesktop } = useResponsive();
  const s = useMemo(() => createStyles(t), [t]);
  const { profileData, loading, getFullName } = useHelperProfile();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const { profile, mappedSpecialties } = profileData ?? {
    profile: null, mappedSpecialties: { jobs: [], skills: [], languages: [] },
  };

  const fullName    = getFullName();
  const photoUri    = profile?.profile_image ?? null;
  const isVerified  = profile?.verification_status === 'Verified';
  const location    = [profile?.city, profile?.province].filter(Boolean).join(', ');
  const jobRoles    = mappedSpecialties?.jobs ?? [];
  const skills      = mappedSpecialties?.skills ?? [];
  const languages   = mappedSpecialties?.languages ?? [];
  const workHistory = profileData?.work_history ?? [];
  const titleLine   = jobRoles.slice(0, 3).join('   ·   ');

  const ratingAvg   = Number((profile as any)?.rating_average ?? 0);
  const ratingCount = Number((profile as any)?.rating_count ?? 0);

  // ── Reusable section shell (icon chip + title, then content) ──
  const section = (icon: any, title: string, node: React.ReactNode) => (
    <View style={s.card}>
      <View style={s.secHead}>
        <View style={s.secIcon}><Ionicons name={icon} size={15} color={ORANGE} /></View>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {node}
    </View>
  );

  // Missing fields aren't hidden — they show a bold accent nudge so the helper
  // sees exactly what's left to complete (this is their own résumé preview).
  const nudge = (text: string) => (
    <View style={s.nudgeRow}>
      <Ionicons name="alert-circle" size={15} color={ORANGE} />
      <Text style={s.nudgeText}>{text}</Text>
    </View>
  );

  const chips = (items: string[], empty: string) =>
    items.length ? (
      <View style={s.tagWrap}>
        {items.map((x, i) => <View key={i} style={s.tag}><Text style={s.tagText}>{x}</Text></View>)}
      </View>
    ) : nudge(empty);

  const detailGrid = (rows: { label: string; value: string; missing?: boolean }[]) => (
    <View style={s.detailGrid}>
      {rows.map((d) => (
        <View key={d.label} style={s.detailBlock}>
          <Text style={s.detailLabel}>{d.label}</Text>
          <Text style={[s.detailValue, d.missing && s.detailValueMissing]}>{d.value}</Text>
        </View>
      ))}
    </View>
  );

  const p: any = profile ?? {};
  const personalNode = detailGrid([
    { label: 'Age', value: p.age ? `${p.age} yrs old` : 'Add birth date', missing: !p.age },
    { label: 'Gender', value: p.gender || 'Not set', missing: !p.gender },
    { label: 'Civil Status', value: p.civil_status || 'Not set', missing: !p.civil_status },
    { label: 'Religion', value: p.religion || 'Not set', missing: !p.religion },
    { label: 'Education', value: p.education_level || 'Not set', missing: !p.education_level },
  ]);

  const detailsNode = detailGrid([
    { label: 'Experience', value: Number(p.years_experience) > 0 ? `${p.years_experience} years` : 'Not set', missing: !(Number(p.years_experience) > 0) },
    { label: 'Employment Type', value: p.employment_type || 'Not set', missing: !p.employment_type },
    { label: 'Work Schedule', value: p.work_schedule || 'Not set', missing: !p.work_schedule },
    { label: 'Expected Salary', value: p.expected_salary
        ? `₱${Number(p.expected_salary).toLocaleString('en-PH')} / ${p.salary_period?.toLowerCase() || 'month'}`
        : 'Not set', missing: !p.expected_salary },
  ]);

  const experienceNode = (
    <View>
      {workHistory.map((w, i) => (
        <View key={w.history_id ?? i} style={s.tlRow}>
          <View style={s.tlGutter}>
            <View style={s.tlDot} />
            {i < workHistory.length - 1 && <View style={s.tlLine} />}
          </View>
          <View style={[s.tlBody, i === workHistory.length - 1 && { paddingBottom: 0 }]}>
            <View style={s.tlHead}>
              <Text style={s.tlRole}>{w.position}</Text>
              {w.can_contact && (
                <View style={s.refBadge}>
                  <Ionicons name="call-outline" size={11} color={GREEN} />
                  <Text style={s.refText}>Reference</Text>
                </View>
              )}
            </View>
            <Text style={s.tlEmployer}>{w.employer_name}</Text>
            <Text style={s.tlDates}>{workRange(w.start_date, w.end_date)}</Text>
            {!!w.duties && <Text style={s.tlDuties}>{w.duties}</Text>}
          </View>
        </View>
      ))}
    </View>
  );

  const aboutCard = section('document-text-outline', 'About',
    profile?.bio ? <Text style={s.bioText}>{profile.bio}</Text> : nudge('Add a short bio to introduce yourself — families read this first.'));
  const personalCard = section('person-outline', 'Personal Information', personalNode);
  const detailsCard = section('briefcase-outline', 'Work Details', detailsNode);
  const experienceCard = section('time-outline', 'Work Experience',
    workHistory.length > 0 ? experienceNode : nudge('Add past employers to build trust and show your track record.'));
  const rolesCard = section('construct-outline', 'Job Roles', chips(jobRoles, 'Add the job roles you can do so families can find you.'));
  const skillsCard = section('sparkles-outline', 'Skills', chips(skills, 'Add your skills to stand out from other helpers.'));
  const languagesCard = section('chatbubbles-outline', 'Languages', chips(languages, 'Add the languages you speak.'));

  const hero = (
    <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroGrad}>
      <View style={[s.heroInner, isDesktop && s.heroInnerDesktop]}>
        <View style={s.heroAvatarWrap}>
          {photoUri
            ? <Image source={{ uri: photoUri }} style={s.heroPhoto} contentFit="cover" />
            : <View style={[s.heroPhoto, s.heroPhotoFb]}><Ionicons name="person" size={44} color="rgba(255,255,255,0.65)" /></View>}
        </View>
        <View style={[s.heroText, isDesktop && { alignItems: 'flex-start' }]}>
          <Text style={[s.heroName, isDesktop && s.heroNameDesktop]} numberOfLines={2}>{fullName}</Text>
          {!!titleLine && <Text style={[s.heroTitleLine, !isDesktop && { textAlign: 'center' }]} numberOfLines={2}>{titleLine}</Text>}
          <View style={[s.heroMetaRow, !isDesktop && { justifyContent: 'center' }]}>
            {location ? (
              <View style={s.heroChip}><Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" /><Text style={s.heroChipText}>{location}</Text></View>
            ) : null}
            {isVerified && (
              <View style={[s.heroChip, s.heroChipVerified]}><Ionicons name="shield-checkmark" size={13} color="#fff" /><Text style={s.heroChipText}>PESO Verified</Text></View>
            )}
            <View style={s.heroChip}>
              <Ionicons name="star" size={13} color="#F5C451" />
              <Text style={s.heroChipText}>{ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount})` : 'New helper'}</Text>
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Public Profile Preview</Text>
          <View style={s.barSpacer} />
        </View>

        <ScrollView contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]} showsVerticalScrollIndicator={false}>
          <View style={[{ gap: 14 }, isDesktop && s.webWrap]}>
            {/* Notice */}
            <View style={s.noticeBanner}>
              <Ionicons name="eye-outline" size={18} color={ORANGE} />
              <Text style={s.noticeText}>
                This is your résumé on CareLink — exactly what families see when they view your profile or review your application. Keep it complete to stand out.
              </Text>
            </View>

            {hero}

            {isDesktop ? (
              <View style={s.row2}>
                <View style={s.sidebar}>
                  {personalCard}
                  {detailsCard}
                  {skillsCard}
                  {languagesCard}
                </View>
                <View style={s.main}>
                  {aboutCard}
                  {experienceCard}
                  {rolesCard}
                </View>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                {aboutCard}
                {personalCard}
                {detailsCard}
                {experienceCard}
                {rolesCard}
                {skillsCard}
                {languagesCard}
              </View>
            )}
          </View>
        </ScrollView>

        {!isDesktop && <HelperTabBar />}
      </SafeAreaView>
    </View>
  );
}

/** "Jan 2022 – Present" style range from ISO dates (null end = current). */
function workRange(start: string, end?: string | null): string {
  const fmt = (d?: string | null) => {
    if (!d) return '';
    const dt = new Date(String(d).replace(' ', 'T'));
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
  };
  const st = fmt(start);
  return end ? `${st} – ${fmt(end)}` : `${st} – Present`;
}
