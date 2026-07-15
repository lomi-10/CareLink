// components/helper/web/HelperBrowseWeb.tsx — desktop "Find Jobs" screen.
// Left: search + category chips + Recommended carousel + Families grid.
// Right: a slide-in panel (no modals) that switches between Job Details,
// Household Details (3 tabs), and the inline Application form.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useBrowseJobs, type JobPost } from '@/hooks/helper';
import { useJobReferences } from '@/hooks/shared/useJobReferences';
import { formatParentHouseholdType } from '@/constants/parentHousehold';
import { NotificationModal } from '@/components/shared';
import { AdvancedSearchModal } from '@/components/helper/jobs';
import { groupJobsByParent } from '@/app/(helper)/browse/browseHelpers';
import { HelperTopNav } from './HelperTopNav';
import { wt, FEATURE_GRADIENT, ACCENT_GRADIENT } from './webTheme';

const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const isTrue = (v: any) => v === 1 || v === '1' || v === true || v === 'true';
const fmtPeriod = (p: string) => { const l = (p ?? '').toLowerCase(); return l.startsWith('month') ? 'month' : l.startsWith('day') ? 'day' : l.startsWith('week') ? 'week' : p; };
const initials = (n: string) => (n || 'E').trim().split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

function generateCoverLetter(job: JobPost): string {
  return `Dear ${job.parent_name || 'Employer'},

I am writing to express my strong interest in the ${job.title} position you have posted. I believe my skills and experience make me a great fit for this role.

I have experience in ${job.categories?.join(', ') || 'household work'} and I am confident I can perform the duties required. I am hardworking, reliable, and eager to contribute to your household.

I would welcome the opportunity to discuss how I can be of service to you and your family. Thank you for considering my application!

Sincerely,
[Your Name]`;
}

type Tab = 'overview' | 'jobs' | 'reviews';
type Panel =
  | { mode: 'job'; job: JobPost }
  | { mode: 'family'; parentId: string; parentName: string; tab: Tab }
  | { mode: 'apply'; job: JobPost };

const CAT_ICON = (name: string): keyof typeof Ionicons.glyphMap => {
  const c = name.toLowerCase();
  if (c.includes('cook')) return 'restaurant-outline';
  if (c.includes('yaya') || c.includes('nanny') || c.includes('child')) return 'happy-outline';
  if (c.includes('laundry')) return 'shirt-outline';
  if (c.includes('elder') || c.includes('care')) return 'medkit-outline';
  if (c.includes('house') || c.includes('clean')) return 'home-outline';
  return 'construct-outline';
};

export function HelperBrowseWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const router = useRouter();
  const { jobs, filters, updateFilter, resetFilters, refresh, toggleSaveJob, savedCount, loading } = useBrowseJobs();
  const { categories } = useJobReferences();

  const parentGroups = useMemo(() => groupJobsByParent(jobs), [jobs]);
  const topRecommended = useMemo(
    () => [...jobs].filter((j) => Number(j.match_score ?? 0) > 0).sort((a, b) => Number(b.match_score ?? 0) - Number(a.match_score ?? 0)).slice(0, 3),
    [jobs],
  );

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notif, setNotif] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });
  // Single panel — selecting a card simply replaces what's shown (no history stack).
  const [panel, setPanel] = useState<Panel | null>(null);
  const close = () => setPanel(null);

  const openJob = (job: JobPost) => setPanel({ mode: 'job', job });
  const openFamily = (parentId: string, parentName: string) => setPanel({ mode: 'family', parentId, parentName, tab: 'overview' });

  // Parent profile fetch (shared by job + family panels)
  const currentParentId = panel ? (panel.mode === 'family' ? panel.parentId : panel.job.parent_id) : null;
  const [pp, setPp] = useState<{ id: string; data: any } | null>(null);
  const [ppLoading, setPpLoading] = useState(false);
  useEffect(() => {
    if (!currentParentId) return;
    if (pp?.id === currentParentId) return;
    let cancelled = false;
    (async () => {
      setPpLoading(true);
      try {
        const raw = await AsyncStorage.getItem('user_data');
        const requesterId = raw ? JSON.parse(raw)?.user_id : '';
        const res = await fetch(`${API_URL}/helper/get_parent_profile.php?parent_id=${currentParentId}&requester_id=${requesterId}`);
        const json = await res.json();
        if (!cancelled && json.success) setPp({ id: String(currentParentId), data: json.data });
      } catch { /* keep basic info */ } finally { if (!cancelled) setPpLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [currentParentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const parentJobs = (pid: string) => parentGroups.find((g) => g.parent_id === String(pid))?.jobs ?? [];

  const catChips = [{ id: 'all', name: 'All' }, ...categories.map((c: any) => ({ id: String(c.category_id), name: c.name }))];

  return (
    <View style={s.root}>
      <HelperTopNav active="jobs" userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <View style={s.body}>
        {/* ── LEFT: feed ── */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.feed} showsVerticalScrollIndicator={false}>
          <Text style={s.pageTitle}>Find Jobs</Text>
          <Text style={s.pageSub}>Discover jobs and trusted families looking for helpers.</Text>

          <View style={s.searchRow}>
            <View style={s.search}>
              <Ionicons name="search" size={18} color={wt.subtle} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by job title, skills, or location..."
                placeholderTextColor={wt.subtle}
                value={filters.search_query}
                onChangeText={(v) => updateFilter('search_query', v)}
              />
            </View>
            <Pressable onPress={() => setFiltersOpen(true)} style={({ hovered }: any) => [s.filterBtn, TRANS, hovered && { borderColor: wt.accent, backgroundColor: wt.accentSoft }]}>
              <Ionicons name="options-outline" size={17} color={wt.ink} /><Text style={s.filterBtnText}>Filters</Text>
            </Pressable>
          </View>

          <View style={s.chips}>
            {catChips.map((c) => {
              const on = filters.category === c.id;
              return (
                <Pressable key={c.id} onPress={() => updateFilter('category', c.id)} style={({ hovered }: any) => [s.chip, on && s.chipOn, TRANS, hovered && !on && { borderColor: wt.accent }]}>
                  <Text style={[s.chipText, on && { color: '#fff' }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {loading && jobs.length === 0 ? (
            <ActivityIndicator color={wt.accent} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Recommended */}
              {topRecommended.length > 0 && (
                <View style={{ marginTop: 22 }}>
                  <View style={s.secHead}>
                    <View style={s.secHeadLeft}><Ionicons name="sparkles" size={17} color={wt.accent} /><Text style={s.secTitle}>Recommended for You</Text></View>
                  </View>
                  <View style={s.recRow}>
                    {topRecommended.map((job) => (
                      <RecCard key={job.job_post_id} job={job} active={panel?.mode !== 'family' && (panel as any)?.job?.job_post_id === job.job_post_id} onView={() => openJob(job)} onSave={() => toggleSaveJob(job.job_post_id)} />
                    ))}
                  </View>
                </View>
              )}

              {/* Families */}
              <View style={{ marginTop: 26 }}>
                <View style={s.secHead}>
                  <View style={s.secHeadLeft}><Ionicons name="people" size={17} color={wt.muted} /><Text style={s.secTitle}>Families Hiring Near You</Text></View>
                </View>
                {parentGroups.length === 0 ? (
                  <View style={s.empty}><Ionicons name="search-outline" size={34} color={wt.subtle} /><Text style={s.emptyText}>No jobs found. Try adjusting your filters.</Text></View>
                ) : (
                  <View style={s.famGrid}>
                    {parentGroups.map((g) => (
                      <FamilyCard key={g.parent_id} g={g} active={panel?.mode === 'family' && panel.parentId === g.parent_id} onView={() => openFamily(g.parent_id, g.parent_name)} />
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>

        {/* ── RIGHT: detail panel ── */}
        {panel ? (
          <View style={s.panel}>
            <View style={s.panelHead}>
              {panel.mode === 'family' ? (
                <Pressable onPress={close} style={({ hovered }: any) => [s.panelBack, TRANS, hovered && { opacity: 0.7 }]}>
                  <Ionicons name="arrow-back" size={17} color={wt.accent} /><Text style={s.panelBackText}>Back to Browse Jobs</Text>
                </Pressable>
              ) : <View />}
              <Pressable onPress={close} style={({ hovered }: any) => [s.navArrow, TRANS, hovered && { backgroundColor: wt.lineSoft }]}><Ionicons name="close" size={20} color={wt.muted} /></Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
              {panel.mode === 'job' && (
                <JobPanel job={panel.job} pp={pp?.id === panel.job.parent_id ? pp.data : null}
                  onViewHousehold={() => openFamily(panel.job.parent_id, panel.job.parent_name || 'Employer')}
                  onApply={() => setPanel({ mode: 'apply', job: panel.job })}
                  onToggleSave={() => toggleSaveJob(panel.job.job_post_id)} />
              )}
              {panel.mode === 'family' && (
                <FamilyPanel
                  parentName={panel.parentName}
                  data={pp?.id === panel.parentId ? pp.data : null}
                  loading={ppLoading || pp?.id !== panel.parentId}
                  jobs={parentJobs(panel.parentId)}
                  tab={panel.tab}
                  onTab={(t) => setPanel((cur) => (cur && cur.mode === 'family' ? { ...cur, tab: t } : cur))}
                  onOpenJob={openJob}
                />
              )}
              {panel.mode === 'apply' && (
                <ApplyPanel job={panel.job} onCancel={() => setPanel({ mode: 'job', job: panel.job })}
                  onSubmitted={() => { const j = panel.job; setNotif({ visible: true, msg: 'Application submitted successfully!', type: 'success' }); refresh(); setPanel({ mode: 'job', job: j }); }} />
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={s.panelEmpty}>
            <View style={s.panelEmptyIcon}><Ionicons name="briefcase-outline" size={28} color={wt.accent} /></View>
            <Text style={s.panelEmptyTitle}>Select a job or family</Text>
            <Text style={s.panelEmptySub}>Tap “View Job” or “View Family” to see full details here — no pop-ups.</Text>
          </View>
        )}
      </View>

      <AdvancedSearchModal visible={filtersOpen} filters={filters} categories={categories}
        onApply={(nf: any) => Object.entries(nf).forEach(([k, v]) => updateFilter(k as any, v as any))}
        onClose={() => setFiltersOpen(false)} />
      <NotificationModal visible={notif.visible} message={notif.msg} type={notif.type} autoClose duration={1600} onClose={() => setNotif((n) => ({ ...n, visible: false }))} />
    </View>
  );
}

// ─── Recommended job card ───
function RecCard({ job, active, onView, onSave }: { job: JobPost; active: boolean; onView: () => void; onSave: () => void }) {
  const match = Math.round(Number(job.match_score ?? 0));
  const salary = Number(job.salary_offered);
  return (
    <Pressable onPress={onView} style={({ hovered }: any) => [s.recCard, active && s.recCardActive, TRANS, hovered && !active && s.recCardHover]}>
      <View style={s.recTop}>
        {match > 0 && <View style={s.matchPill}><Text style={s.matchPillText}>{match}% Match</Text></View>}
        <View style={{ flex: 1 }} />
        <Pressable onPress={(e: any) => { e.stopPropagation?.(); onSave(); }} hitSlop={8}><Ionicons name={job.is_saved ? 'heart' : 'heart-outline'} size={19} color={job.is_saved ? wt.red : wt.subtle} /></Pressable>
      </View>
      <View style={s.recBody}>
        <View style={s.recIc}><Ionicons name={CAT_ICON(job.categories?.[0] ?? job.title)} size={20} color={wt.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.recTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.recFam} numberOfLines={1}>{job.parent_name || 'Employer'}</Text>
          <View style={s.recLoc}><Ionicons name="location-outline" size={12} color={wt.subtle} /><Text style={s.recLocText} numberOfLines={1}>{[job.municipality, job.province].filter(Boolean).join(', ')}</Text></View>
        </View>
      </View>
      {salary > 0 && <Text style={s.recSalary}>₱{salary.toLocaleString()} <Text style={s.recSalaryPer}>/ {fmtPeriod(job.salary_period)}</Text></Text>}
      <View style={s.recTags}>
        {!!job.employment_type && <View style={s.recTag}><Ionicons name="home-outline" size={11} color={wt.muted} /><Text style={s.recTagText}>{job.employment_type}</Text></View>}
        {!!job.work_schedule && <View style={s.recTag}><Ionicons name="time-outline" size={11} color={wt.muted} /><Text style={s.recTagText}>{job.work_schedule}</Text></View>}
      </View>
      <View style={s.recBtn}><Text style={s.recBtnText}>View Job</Text></View>
    </Pressable>
  );
}

// ─── Family card ───
function FamilyCard({ g, active, onView }: { g: any; active: boolean; onView: () => void }) {
  const cats = Array.from(new Set(g.jobs.flatMap((j: JobPost) => j.categories ?? []))).slice(0, 3) as string[];
  const dist = g.jobs.find((j: JobPost) => j.distance != null)?.distance;
  return (
    <Pressable onPress={onView} style={({ hovered }: any) => [s.famCard, active && s.famCardActive, TRANS, hovered && !active && s.recCardHover]}>
      <View style={s.famTop}>
        {g.parent_profile_image ? <Image source={{ uri: g.parent_profile_image }} style={s.famAva} /> : <View style={[s.famAva, s.famAvaFb]}><Text style={s.famAvaText}>{initials(g.parent_name)}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.famName} numberOfLines={1}>{g.parent_name}</Text>
          {g.parent_verified && <View style={s.verPill}><Ionicons name="checkmark-circle" size={11} color={wt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>}
          <View style={s.famMeta}>
            {g.parent_rating > 0 && <><Ionicons name="star" size={12} color={wt.amber} /><Text style={s.famMetaText}>{Number(g.parent_rating).toFixed(1)}</Text></>}
            {dist != null && <><Ionicons name="location-outline" size={12} color={wt.subtle} /><Text style={s.famMetaText}>{dist} km away</Text></>}
          </View>
        </View>
      </View>
      <Text style={s.famJobs}>{g.jobs.length} Active Job{g.jobs.length !== 1 ? 's' : ''}</Text>
      <View style={s.famCats}>{cats.map((c) => <Text key={c} style={s.famCat}>{c}</Text>)}</View>
      <View style={s.famBtn}><Text style={s.famBtnText}>View Family</Text></View>
    </Pressable>
  );
}

// ─── Job details panel ───
function JobPanel({ job, pp, onViewHousehold, onApply, onToggleSave }: { job: JobPost; pp: any; onViewHousehold: () => void; onApply: () => void; onToggleSave: () => void }) {
  const [saved, setSaved] = useState(!!job.is_saved);
  const [moreDesc, setMoreDesc] = useState(false);
  const match = Math.round(Number(job.match_score ?? 0));
  const salary = Number(job.salary_offered);
  const location = [job.municipality, job.province].filter(Boolean).join(', ');
  const rating = Number(pp?.avg_rating ?? job.parent_rating ?? 0);
  const reviews = Number(pp?.review_count ?? 0);
  const memberSince = pp?.user?.created_at ? new Date(String(pp.user.created_at).replace(' ', 'T')) : null;
  const perks = [
    isTrue(job.provides_meals) && { icon: 'restaurant-outline', label: 'With free meals' },
    isTrue(job.provides_accommodation) && { icon: 'bed-outline', label: 'Accommodation' },
    isTrue(job.provides_sss) && { icon: 'checkmark-circle-outline', label: 'SSS' },
  ].filter(Boolean) as { icon: any; label: string }[];
  const reqs = [
    (job.min_age || job.max_age) && `${job.min_age ?? 18} – ${job.max_age ?? 55} years old`,
    job.min_experience_years && `At least ${job.min_experience_years} year(s) of experience`,
    isTrue(job.require_police_clearance) && 'Police clearance required',
    isTrue(job.prefer_tesda_nc2) && 'TESDA NC II preferred',
    ...(job.skills ?? []).map((sk) => `Can do ${sk.toLowerCase()}`),
  ].filter(Boolean) as string[];
  const desc = job.description || 'The employer will share more details about this role during the interview.';

  return (
    <View>
      <View style={s.jpTop}>
        <View style={{ flex: 1 }}>
          {match > 0 && <View style={[s.matchPill, { alignSelf: 'flex-start', marginBottom: 8 }]}><Text style={s.matchPillText}>{match}% Match</Text></View>}
          <Text style={s.jpTitle}>{job.title}</Text>
          <View style={s.jpFamRow}>
            <Text style={s.jpFam}>{job.parent_name || 'Employer'}</Text>
            {job.parent_verified && <View style={s.verPill}><Ionicons name="checkmark-circle" size={11} color={wt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>}
          </View>
          <View style={s.jpMeta}>
            <Ionicons name="star" size={13} color={wt.amber} /><Text style={s.jpMetaStrong}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
            {reviews > 0 && <Text style={s.jpMetaText}>({reviews} reviews)</Text>}
            {memberSince && <Text style={s.jpMetaText}>· Member since {memberSince.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}</Text>}
          </View>
        </View>
        {job.parent_profile_image
          ? <Image source={{ uri: job.parent_profile_image }} style={s.jpAva} />
          : <View style={[s.jpAva, s.famAvaFb]}><Text style={s.famAvaText}>{initials(job.parent_name || 'E')}</Text></View>}
      </View>

      {/* Salary */}
      <View style={s.jpCard}>
        <Text style={s.jpSalary}>₱{salary > 0 ? salary.toLocaleString() : '—'} <Text style={s.jpSalaryPer}>/ {fmtPeriod(job.salary_period)}</Text></Text>
        <View style={s.jpTags}>
          {!!job.employment_type && <View style={s.jpTag}><Ionicons name="home-outline" size={13} color={wt.muted} /><Text style={s.jpTagText}>{job.employment_type}</Text></View>}
          {!!job.work_schedule && <View style={s.jpTag}><Ionicons name="time-outline" size={13} color={wt.muted} /><Text style={s.jpTagText}>{job.work_schedule}</Text></View>}
          {perks.map((p) => <View key={p.label} style={s.jpTag}><Ionicons name={p.icon} size={13} color={wt.muted} /><Text style={s.jpTagText}>{p.label}</Text></View>)}
        </View>
      </View>

      {/* Location */}
      {!!location && (
        <View style={s.jpCard}>
          <View style={s.jpRowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={s.jpCardLabel}>Location</Text>
              <Text style={s.jpCardValue}>{location}</Text>
              {job.distance != null && <View style={s.recLoc}><Ionicons name="navigate-outline" size={12} color={wt.subtle} /><Text style={s.recLocText}>{job.distance} km from your location</Text></View>}
            </View>
            <View style={s.mapThumb}><Ionicons name="location" size={22} color={wt.accent} /></View>
          </View>
        </View>
      )}

      {/* Overview */}
      <View style={s.jpSection}>
        <Text style={s.jpSecTitle}>Job Overview</Text>
        <Text style={s.jpBody} numberOfLines={moreDesc ? undefined : 3}>{desc}</Text>
        {desc.length > 120 && <Pressable onPress={() => setMoreDesc((v) => !v)}><Text style={s.jpLink}>{moreDesc ? 'View less' : 'View more'} </Text></Pressable>}
      </View>

      {/* Requirements */}
      {reqs.length > 0 && (
        <View style={s.jpSection}>
          <Text style={s.jpSecTitle}>Requirements</Text>
          {reqs.slice(0, 4).map((r) => <View key={r} style={s.reqRow}><Ionicons name="checkmark-circle" size={16} color={wt.green} /><Text style={s.reqText}>{r}</Text></View>)}
          {reqs.length > 4 && <Text style={s.jpLink}>View all requirements</Text>}
        </View>
      )}

      {/* View household */}
      <Pressable onPress={onViewHousehold} style={({ hovered }: any) => [s.householdBtn, TRANS, hovered && { backgroundColor: wt.lineSoft, borderColor: wt.accent }]}>
        <Ionicons name="people-outline" size={16} color={wt.ink} /><Text style={s.householdBtnText}>View household details</Text><Ionicons name="chevron-forward" size={15} color={wt.subtle} />
      </Pressable>

      {/* Apply */}
      <View style={s.applyRow}>
        <Pressable onPress={onApply} style={({ hovered, pressed }: any) => [{ flex: 1 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
          <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.applyBtn}>
            <Ionicons name="paper-plane" size={16} color="#fff" /><Text style={s.applyBtnText}>Apply for this Job</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={() => { setSaved((v) => !v); onToggleSave(); }} style={({ hovered }: any) => [s.saveBtn, TRANS, hovered && { borderColor: wt.accent }]}><Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? wt.red : wt.muted} /></Pressable>
      </View>
    </View>
  );
}

// ─── Household details panel (3 tabs) ───
function FamilyPanel({ parentName, data, loading, jobs, tab, onTab, onOpenJob }: {
  parentName: string; data: any; loading: boolean; jobs: JobPost[]; tab: Tab; onTab: (t: Tab) => void; onOpenJob: (j: JobPost) => void;
}) {
  const profile = data?.profile ?? {};
  const user = data?.user ?? {};
  const household = data?.household ?? null;
  const children = data?.children ?? [];
  const elderly = data?.elderly ?? [];
  const documents = data?.documents ?? [];
  const rating = Number(data?.avg_rating ?? 0);
  const reviews = Number(data?.review_count ?? 0);
  const recentReviews = data?.recent_reviews ?? [];
  const name = user.first_name ? `${user.first_name} ${user.last_name}` : parentName;
  const verifiedEmp = user.status === 'approved';
  const memberSince = user.created_at ? new Date(String(user.created_at).replace(' ', 'T')) : null;
  const location = [profile.barangay, profile.municipality, profile.province].filter(Boolean).join(', ');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'jobs', label: `Jobs (${jobs.length})` },
    { key: 'reviews', label: `Reviews (${reviews})` },
  ];

  return (
    <View>
      {/* Header */}
      <View style={s.fpHead}>
        {profile.profile_image ? <Image source={{ uri: profile.profile_image }} style={s.fpAva} /> : <View style={[s.fpAva, s.famAvaFb]}><Text style={s.famAvaText}>{initials(name)}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.fpName} numberOfLines={1}>{name}</Text>
          <View style={verifiedEmp ? s.verPill : [s.verPill, { backgroundColor: wt.redSoft }]}><Ionicons name={verifiedEmp ? 'shield-checkmark' : 'warning'} size={11} color={verifiedEmp ? wt.green : wt.red} /><Text style={[s.verPillText, !verifiedEmp && { color: wt.red }]}>{verifiedEmp ? 'PESO Verified Employer' : 'Unverified'}</Text></View>
          <View style={s.jpMeta}>
            <Ionicons name="star" size={13} color={wt.amber} /><Text style={s.jpMetaStrong}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
            {reviews > 0 && <Text style={s.jpMetaText}>({reviews} reviews)</Text>}
          </View>
          {memberSince && <Text style={s.jpMetaText}>Member since {memberSince.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}</Text>}
          {!!location && <View style={s.recLoc}><Ionicons name="location-outline" size={12} color={wt.subtle} /><Text style={s.recLocText}>{location}</Text></View>}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.fpTabs}>
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={() => onTab(t.key)} style={s.fpTab}>
            <Text style={[s.fpTabText, tab === t.key && { color: wt.accent }]}>{t.label}</Text>
            {tab === t.key && <View style={s.fpTabUnderline} />}
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={wt.accent} style={{ marginTop: 30 }} />
      ) : tab === 'overview' ? (
        <View style={{ gap: 18, marginTop: 16 }}>
          {!!profile.bio && <View><Text style={s.fpSecTitle}>About the Household</Text><Text style={s.jpBody}>{profile.bio}</Text></View>}
          {household && (
            <View style={s.hhGrid}>
              <HhCell icon="home-outline" label="House Type" value={household.household_type ? formatParentHouseholdType(household.household_type) : '—'} />
              <HhCell icon="people-outline" label="Family Members" value={household.household_size ? `${household.household_size} Members` : '—'} />
              {children.length > 0 && <HhCell icon="happy-outline" label="Children" value={`${children.length} (${children.map((c: any) => c.age != null ? `Age ${c.age}` : '').filter(Boolean).join(', ') || 'ages n/a'})`} />}
              <HhCell icon="paw-outline" label="Pets" value={isTrue(household.has_pets) ? (household.pet_details || 'Yes') : 'No pets'} />
            </View>
          )}
          {elderly.length > 0 && (
            <View><Text style={s.fpSecTitle}>Elderly Members ({elderly.length})</Text>
              {elderly.map((el: any, i: number) => <Text key={i} style={s.jpBody}>{el.gender ?? 'Member'} · {el.age != null ? `${el.age} yrs` : 'age n/a'}{el.condition ? ` · ${el.condition}` : ''}</Text>)}
            </View>
          )}
          {documents.length > 0 && (
            <View><Text style={s.fpSecTitle}>Verified Documents</Text>
              <View style={{ gap: 8 }}>
                {documents.map((d: any, i: number) => (
                  <View key={i} style={s.docChip}><Ionicons name="document-text" size={15} color={wt.green} /><View style={{ flex: 1 }}><Text style={s.docChipName}>{d.document_type}</Text><Text style={s.docChipStatus}>✓ Verified by PESO</Text></View></View>
                ))}
              </View>
            </View>
          )}
          {!!location && (
            <View><Text style={s.fpSecTitle}>Location</Text>
              <View style={s.mapWide}><Ionicons name="location" size={26} color={wt.accent} /><Text style={s.mapWideText}>{location}</Text><Text style={s.mapWideSub}>Exact address provided upon hiring</Text></View>
            </View>
          )}
        </View>
      ) : tab === 'jobs' ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          <Text style={s.fpSecTitle}>Jobs Posted ({jobs.length})</Text>
          {jobs.length === 0 ? <Text style={s.jpBody}>No active job posts right now.</Text> : jobs.map((job) => {
            const match = Math.round(Number(job.match_score ?? 0)); const salary = Number(job.salary_offered);
            return (
              <Pressable key={job.job_post_id} onPress={() => onOpenJob(job)} style={({ hovered }: any) => [s.jobRow, TRANS, hovered && { borderColor: wt.accent, backgroundColor: '#FFF9F3' }]}>
                <View style={s.recIc}><Ionicons name={CAT_ICON(job.categories?.[0] ?? job.title)} size={18} color={wt.accent} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.jobRowTop}><Text style={s.jobRowTitle} numberOfLines={1}>{job.title}</Text>{match > 0 && <View style={s.matchPill}><Text style={s.matchPillText}>{match}%</Text></View>}</View>
                  <Text style={s.jobRowSub}>{[job.employment_type, job.work_schedule].filter(Boolean).join(' · ')}</Text>
                  {salary > 0 && <Text style={s.recSalary}>₱{salary.toLocaleString()} <Text style={s.recSalaryPer}>/ {fmtPeriod(job.salary_period)}</Text></Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color={wt.subtle} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 12, marginTop: 16 }}>
          <View style={s.ratingSummary}><Text style={s.ratingBig}>{rating > 0 ? rating.toFixed(1) : '—'}</Text><View><View style={{ flexDirection: 'row', gap: 2 }}>{[1, 2, 3, 4, 5].map((i) => <Ionicons key={i} name={rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline'} size={16} color={rating >= i - 0.4 ? wt.amber : wt.line} />)}</View><Text style={s.jpMetaText}>{reviews} review{reviews !== 1 ? 's' : ''}</Text></View></View>
          {recentReviews.length === 0 ? <Text style={s.jpBody}>No written reviews yet.</Text> : recentReviews.map((r: any, i: number) => (
            <View key={i} style={s.reviewCard}>
              <View style={s.reviewHead}><View style={s.reviewAva}><Text style={s.famAvaText}>{(r.reviewer_name?.[0] ?? '?').toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={s.reviewName}>{r.reviewer_name}</Text><View style={{ flexDirection: 'row', gap: 2 }}>{[1, 2, 3, 4, 5].map((j) => <Ionicons key={j} name={Number(r.rating) >= j ? 'star' : 'star-outline'} size={11} color={wt.amber} />)}</View></View></View>
              {!!r.review_text && <Text style={s.jpBody}>{r.review_text}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
function HhCell({ icon, label, value }: { icon: any; label: string; value: string }) {
  return <View style={s.hhCell}><View style={s.hhIc}><Ionicons name={icon} size={16} color={wt.accent} /></View><View style={{ flex: 1 }}><Text style={s.hhLabel}>{label}</Text><Text style={s.hhValue} numberOfLines={2}>{value}</Text></View></View>;
}

// ─── Inline application panel ───
function ApplyPanel({ job, onCancel, onSubmitted }: { job: JobPost; onCancel: () => void; onSubmitted: () => void }) {
  const [letter, setLetter] = useState('');
  const [docs, setDocs] = useState<{ document_id: number; document_type: string }[]>([]);
  const [selDocs, setSelDocs] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const salary = Number(job.salary_offered);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        if (!raw) return;
        const user = JSON.parse(raw);
        const res = await fetch(`${API_URL}/helper/get_documents.php?user_id=${user.user_id}&requester_id=${user.user_id}`);
        const data = await res.json();
        const list = (data?.data?.documents ?? data?.documents ?? []).filter((d: any) => d.status === 'Verified').map((d: any) => ({ document_id: d.document_id, document_type: d.document_type }));
        if (!cancelled) setDocs(list);
      } catch { /* optional */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async () => {
    if (letter.trim().length < 50) { setError('Please write a cover letter (min 50 characters).'); return; }
    setSubmitting(true); setError(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = JSON.parse(raw || '{}');
      const res = await fetch(`${API_URL}/helper/apply_job.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: job.job_post_id, helper_id: user.user_id, cover_letter: letter.trim(), shared_document_ids: selDocs, requester_id: user.user_id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to submit application');
      onSubmitted();
    } catch (e: any) { setError(e.message || 'Failed to submit application'); } finally { setSubmitting(false); }
  };

  return (
    <View>
      <Text style={s.jpTitle}>Apply for this Job</Text>
      <View style={[s.jpCard, { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }]}>
        <View style={s.recIc}><Ionicons name="briefcase" size={20} color={wt.accent} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.jobRowTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.jobRowSub}>{job.parent_name || 'Employer'}{salary > 0 ? ` · ₱${salary.toLocaleString()}/${fmtPeriod(job.salary_period)}` : ''}</Text>
        </View>
      </View>

      <View style={{ marginTop: 18 }}>
        <Text style={s.fpSecTitle}>Cover Letter *</Text>
        <Text style={s.jobRowSub}>Write your own or generate one, then review it before submitting.</Text>
        <Pressable onPress={() => { setLetter(generateCoverLetter(job)); setError(null); }} style={({ hovered }: any) => [s.genBtn, TRANS, hovered && { backgroundColor: wt.accentSoft }]}>
          <Ionicons name="sparkles-outline" size={15} color={wt.accent} /><Text style={s.genBtnText}>Generate Cover Letter</Text>
        </Pressable>
        <TextInput style={[s.letterInput, error && { borderColor: wt.red }]} multiline value={letter} onChangeText={(v) => { setLetter(v); setError(null); }} maxLength={1000}
          placeholder="Tell the employer about your experience and why you're interested…" placeholderTextColor={wt.subtle} textAlignVertical="top" />
        <Text style={[s.charCount, letter.length < 50 && letter.length > 0 && { color: wt.accent }]}>{letter.length}/1000{letter.length > 0 && letter.length < 50 ? '  · min 50 chars' : ''}</Text>
        {error && <View style={s.errRow}><Ionicons name="alert-circle" size={14} color={wt.red} /><Text style={s.errText}>{error}</Text></View>}
      </View>

      {docs.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={s.fpSecTitle}>Share Documents (optional)</Text>
          <Text style={s.jobRowSub}>Choose which verified documents this employer can view.</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {docs.map((d) => {
              const on = selDocs.includes(d.document_id);
              return (
                <Pressable key={d.document_id} onPress={() => setSelDocs((a) => on ? a.filter((x) => x !== d.document_id) : [...a, d.document_id])} style={[s.docPick, on && { borderColor: wt.accent, backgroundColor: '#FFF9F3' }]}>
                  <Ionicons name="document-text-outline" size={17} color={on ? wt.accent : wt.muted} /><Text style={[s.docPickText, on && { color: wt.ink }]}>{d.document_type}</Text>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={19} color={on ? wt.accent : wt.subtle} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={s.applyRow}>
        <Pressable onPress={onCancel} style={({ hovered }: any) => [s.cancelBtn, TRANS, hovered && { backgroundColor: wt.lineSoft }]}><Text style={s.cancelBtnText}>Cancel</Text></Pressable>
        <Pressable disabled={submitting} onPress={submit} style={({ hovered, pressed }: any) => [{ flex: 1.5 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
          <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.applyBtn}>
            {submitting ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="paper-plane" size={16} color="#fff" /><Text style={s.applyBtnText}>Submit Application</Text></>}
          </LinearGradient>
        </Pressable>
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

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { borderWidth: 1, borderColor: wt.line, backgroundColor: wt.surface, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 },
  chipOn: { backgroundColor: wt.ink, borderColor: wt.ink },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.muted },

  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  secHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.ink },

  recRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  recCard: { flexGrow: 1, flexBasis: 240, minWidth: 220, maxWidth: 360, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 16, padding: 14, ...shadowSm, cursor: 'pointer' as any },
  recCardHover: { borderColor: wt.accent, boxShadow: '0 10px 24px rgba(232,100,26,.10)' as any, transform: [{ translateY: -2 }] },
  recCardActive: { borderColor: wt.accent, backgroundColor: '#FFFCF8' },
  recTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  matchPill: { backgroundColor: wt.greenSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  matchPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: wt.green },
  recBody: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  recIc: { width: 42, height: 42, borderRadius: 12, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  recTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink },
  recFam: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, marginTop: 1 },
  recLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  recLocText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.subtle },
  recSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.accent, marginTop: 12 },
  recSalaryPer: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted },
  recTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  recTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: wt.lineSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  recTagText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.muted },
  recBtn: { marginTop: 12, backgroundColor: wt.accent, borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  recBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  famGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  famCard: { flexGrow: 1, flexBasis: 240, minWidth: 220, maxWidth: 360, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 16, padding: 14, ...shadowSm, cursor: 'pointer' as any },
  famCardActive: { borderColor: wt.accent, backgroundColor: '#FFFCF8' },
  famTop: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  famAva: { width: 48, height: 48, borderRadius: 24 },
  famAvaFb: { backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  famAvaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.accent },
  famName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: wt.greenSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginVertical: 3 },
  verPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: wt.green },
  famMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  famMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginRight: 4 },
  famJobs: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.muted, marginTop: 12 },
  famCats: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  famCat: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: wt.ink, backgroundColor: wt.lineSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  famBtn: { marginTop: 12, borderWidth: 1.4, borderColor: wt.accent, borderRadius: 11, paddingVertical: 10, alignItems: 'center' },
  famBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.accent },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.muted },

  // Panel
  panel: { width: 460, backgroundColor: wt.surface, borderLeftWidth: 1, borderLeftColor: wt.line, ...({ boxShadow: '-8px 0 24px rgba(120,80,45,.06)' } as any) },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  panelBack: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelBackText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.accent },
  navArrow: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  panelEmpty: { width: 460, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
  panelEmptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  panelEmptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: wt.ink },
  panelEmptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  // Job panel
  jpTop: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  jpTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: wt.ink, letterSpacing: -0.4 },
  jpFamRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  jpFam: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.muted },
  jpMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  jpMetaStrong: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  jpMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted },
  jpAva: { width: 74, height: 74, borderRadius: 16 },
  jpCard: { backgroundColor: wt.raise, borderWidth: 1, borderColor: wt.line, borderRadius: 14, padding: 16, marginBottom: 12 },
  jpSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: wt.accent, letterSpacing: -0.5 },
  jpSalaryPer: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.muted },
  jpTags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 },
  jpTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  jpTagText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: wt.muted },
  jpRowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jpCardLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  jpCardValue: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.muted, marginTop: 2 },
  mapThumb: { width: 74, height: 60, borderRadius: 12, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  jpSection: { marginBottom: 16 },
  jpSecTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink, marginBottom: 8 },
  jpBody: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.muted, lineHeight: 20 },
  jpLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent, marginTop: 6 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reqText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.ink },
  householdBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: wt.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14 },
  householdBtnText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink },
  applyRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 13 },
  applyBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5 },
  saveBtn: { width: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: wt.line, borderRadius: 13 },

  // Family panel
  fpHead: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  fpAva: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: wt.accentSoft },
  fpName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: wt.ink },
  fpTabs: { flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: wt.line },
  fpTab: { paddingVertical: 12 },
  fpTabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.muted },
  fpTabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2.5, backgroundColor: wt.accent, borderRadius: 2 },
  fpSecTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: wt.ink, marginBottom: 8 },
  hhGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  hhCell: { width: '47%', flexGrow: 1, flexDirection: 'row', gap: 10, backgroundColor: wt.raise, borderWidth: 1, borderColor: wt.line, borderRadius: 12, padding: 12 },
  hhIc: { width: 34, height: 34, borderRadius: 10, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  hhLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.muted },
  hhValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink, marginTop: 1 },
  docChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: wt.greenSoft, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10 },
  docChipName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  docChipStatus: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.green, marginTop: 1 },
  mapWide: { height: 120, borderRadius: 14, backgroundColor: wt.lineSoft, alignItems: 'center', justifyContent: 'center', gap: 3 },
  mapWideText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  mapWideSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.subtle },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 13, padding: 13 },
  jobRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobRowTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.ink },
  jobRowSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginTop: 2 },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: wt.raise, borderWidth: 1, borderColor: wt.line, borderRadius: 14, padding: 14 },
  ratingBig: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 34, color: wt.ink },
  reviewCard: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 13, padding: 13 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAva: { width: 34, height: 34, borderRadius: 17, backgroundColor: wt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  reviewName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },

  // Apply panel
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: wt.accentSoft, borderWidth: 1, borderColor: wt.accent, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, marginTop: 10, marginBottom: 10 },
  genBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent },
  letterInput: { borderWidth: 1.4, borderColor: wt.line, borderRadius: 12, padding: 13, minHeight: 150, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.ink, backgroundColor: wt.raise, outlineStyle: 'none' as any },
  charCount: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginTop: 6, alignSelf: 'flex-end' },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: wt.redSoft, borderRadius: 10, padding: 10 },
  errText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: wt.red, flex: 1 },
  docPick: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: wt.surface, borderWidth: 1.4, borderColor: wt.line, borderRadius: 12, padding: 12 },
  docPickText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.muted },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 13, borderWidth: 1, borderColor: wt.line },
  cancelBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.muted },
});
