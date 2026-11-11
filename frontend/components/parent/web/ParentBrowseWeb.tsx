// components/parent/web/ParentBrowseWeb.tsx — desktop "Find Helpers" screen.
// Left: search + category chips + Recommended carousel + Helpers grid.
// Right: a slide-in panel (no modals) that switches between the helper Profile
// (4 tabs) and the inline Invite-to-Apply flow. Mirrors HelperBrowseWeb.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useBrowseHelpers, useParentJobs, type HelperProfile } from '@/hooks/parent';
import type { JobPost } from '@/hooks/parent/useParentJobs';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { useParentPortalMode } from '@/hooks/parent';
import { useJobReferences } from '@/hooks/shared';
import { bestJobForHelper, computeHelperJobMatch } from '@/lib/parentHelperMatch';
import { MatchBreakdown } from './MatchBreakdown';
import { useCareBot } from '@/contexts/CareBotContext';
import { NotificationModal, SubmitComplaintModal } from '@/components/shared';
import { ExperienceVerificationBadge } from '@/components/shared/ExperienceVerificationBadge';
import { ExperienceVerificationNotice } from '@/components/shared/ExperienceVerificationNotice';
import { FilterModal } from '@/components/parent/browse';
import { DirectHirePanel } from './DirectHirePanel';
import { ParentTopNav } from './ParentTopNav';
import { pt } from './parentWebTheme';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const initials = (n?: string) => (n || 'H').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const fmtPeriod = (p?: string) => { const l = (p ?? '').toLowerCase(); return l.startsWith('month') ? 'month' : l.startsWith('day') ? 'day' : l.startsWith('week') ? 'week' : (p || 'month'); };

type Tab = 'overview' | 'experience' | 'skills' | 'documents';
type Panel =
  | { mode: 'profile'; helper: HelperProfile; tab: Tab }
  | { mode: 'directhire'; helper: HelperProfile };

export function ParentBrowseWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const router = useRouter();
  const isWorkMode = useParentPortalMode();
  const { open: openCareBot } = useCareBot();
  const { helpers, filters, loading, updateFilter, resetFilters, refresh } = useBrowseHelpers();
  const { jobs } = useParentJobs();
  const { categories } = useJobReferences();
  const { placements } = useParentActivePlacements();

  const [searchText, setSearchText] = useState('');
  const hiredHelperIds = useMemo(() => new Set(placements.map((p) => String(p.helper_id))), [placements]);

  const availableHelpers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const notHired = helpers.filter((h) => !hiredHelperIds.has(String(h.user_id)));
    if (!q) return notHired;
    return notHired.filter((h) => {
      const hay = [h.full_name, h.municipality, h.province, ...(h.categories ?? []), ...(h.jobs ?? []), ...(h.skills ?? [])]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [helpers, hiredHelperIds, searchText]);

  const matchForHelper = useCallback(
    (helper: HelperProfile) => computeHelperJobMatch(helper, bestJobForHelper(helper, jobs)),
    [jobs],
  );

  // Score helpers against the same best open job used on mobile Browse and Home.
  const rankedHelpers = useMemo(
    () => [...availableHelpers].sort((a, b) =>
      matchForHelper(b).score - matchForHelper(a).score),
    [availableHelpers, matchForHelper],
  );

  const recommendedHelpers = useMemo(
    () => availableHelpers
      .map((helper) => ({ helper, match: matchForHelper(helper) }))
      .filter(({ match }) => match.score > 0)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 4),
    [availableHelpers, matchForHelper],
  );

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notif, setNotif] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });
  const [complaint, setComplaint] = useState<HelperProfile | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const close = () => setPanel(null);

  const openProfile = (helper: HelperProfile) =>
    setPanel({ mode: 'profile', helper, tab: 'overview' });

  // Log a profile view when the parent opens a helper (fire-and-forget).
  const openedId = panel?.mode === 'profile' ? panel.helper.user_id : null;
  useEffect(() => {
    if (!openedId) return;
    AsyncStorage.getItem('user_data').then((raw) => {
      if (!raw) return;
      const { user_id } = JSON.parse(raw);
      fetch(`${API_URL}/parent/log_profile_view.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: user_id, helper_id: openedId }),
      }).catch(() => {});
    });
  }, [openedId]);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'category') return value !== 'all';
    if (key === 'distance') return value !== 20;
    if (key === 'sort') return false;
    return value !== 'all';
  }).length;

  const messageHelper = (helper: HelperProfile) => {
    router.push({
      pathname: '/(parent)/messages',
      params: { partner_id: String(helper.user_id), partner_name: encodeURIComponent(helper.full_name || '') },
    } as any);
  };

  const catChips = [{ id: 'all', name: 'All' }, ...categories.map((c: any) => ({ id: String(c.category_id), name: c.name }))];

  return (
    <View style={s.root}>
      <ParentTopNav active="browse" mode={isWorkMode ? 'work' : 'recruitment'} userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <View style={s.body}>
        {/* ── LEFT: feed ── */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.feed} showsVerticalScrollIndicator={false}>
          <Text style={s.pageTitle}>Find Helpers</Text>
          <Text style={s.pageSub}>Discover verified, trusted helpers ready to join your household.</Text>

          <View style={s.searchRow}>
            <View style={s.search}>
              <Ionicons name="search" size={18} color={pt.subtle} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by name, skill, or location..."
                placeholderTextColor={pt.subtle}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
            <Pressable onPress={() => setFiltersOpen(true)} style={({ hovered }: any) => [s.filterBtn, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.accentSoft }]}>
              <Ionicons name="options-outline" size={17} color={pt.ink} /><Text style={s.filterBtnText}>Filters</Text>
              {activeFilterCount > 0 && <View style={s.filterCount}><Text style={s.filterCountText}>{activeFilterCount}</Text></View>}
            </Pressable>
          </View>

          <View style={s.chips}>
            {catChips.map((c) => {
              const on = filters.category === c.id;
              return (
                <Pressable key={c.id} onPress={() => updateFilter('category', c.id)} style={({ hovered }: any) => [s.chip, on && s.chipOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                  <Text style={[s.chipText, on && { color: '#fff' }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {loading && helpers.length === 0 ? (
            <ActivityIndicator color={pt.accent} style={{ marginTop: 40 }} />
          ) : (
            <>
              {recommendedHelpers.length > 0 && (
                <View style={{ marginTop: 22 }}>
                  <View style={s.secHead}>
                    <View style={s.secHeadLeft}>
                      <Ionicons name="sparkles" size={17} color={pt.accent} />
                      <Text style={s.secTitle}>Top Helpers Near You</Text>
                    </View>
                  </View>
                  <View style={s.recRow}>
                    {recommendedHelpers.map(({ helper, match }, i) => (
                      <RecCard key={helper.profile_id} helper={helper} match={match.score} topReason={match.reasons?.[0]} isTop={i === 0}
                        active={panel?.helper?.profile_id === helper.profile_id} onView={() => openProfile(helper)} />
                    ))}
                  </View>
                </View>
              )}

              {/* All helpers */}
              <View style={{ marginTop: 26 }}>
                <View style={s.secHead}>
                  <View style={s.secHeadLeft}><Ionicons name="people" size={17} color={pt.muted} /><Text style={s.secTitle}>Verified Helpers</Text></View>
                  <Text style={s.resultsText}>
                    {rankedHelpers.length} {rankedHelpers.length === 1 ? 'helper' : 'helpers'}{hiredHelperIds.size > 0 ? ` · ${hiredHelperIds.size} hired hidden` : ''}
                  </Text>
                </View>
                {rankedHelpers.length === 0 ? (
                  <View style={s.empty}>
                    <Ionicons name="people-outline" size={34} color={pt.subtle} />
                    <Text style={s.emptyText}>No helpers found. Try adjusting your filters.</Text>
                    {activeFilterCount > 0 && (
                      <Pressable onPress={resetFilters} style={({ hovered }: any) => [s.resetBtn, TRANS, hovered && { backgroundColor: pt.accentSoft }]}>
                        <Text style={s.resetBtnText}>Reset Filters</Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <View style={s.grid}>
                    {rankedHelpers.map((helper) => {
                      const match = matchForHelper(helper);
                      return (
                        <HelperGridCard key={helper.profile_id} helper={helper} match={match.score}
                          active={panel?.helper?.profile_id === helper.profile_id}
                          onView={() => openProfile(helper)} />
                      );
                    })}
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
              {panel.mode === 'directhire' ? (
                <Pressable onPress={() => setPanel({ mode: 'profile', helper: panel.helper, tab: 'overview' })} style={({ hovered }: any) => [s.panelBack, TRANS, hovered && { opacity: 0.7 }]}>
                  <Ionicons name="arrow-back" size={17} color={pt.accent} /><Text style={s.panelBackText}>Back to Profile</Text>
                </Pressable>
              ) : <View />}
              <Pressable onPress={close} style={({ hovered }: any) => [s.navArrow, TRANS, hovered && { backgroundColor: pt.lineSoft }]}><Ionicons name="close" size={20} color={pt.muted} /></Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
              {panel.mode === 'profile' && (
                <ProfilePanel
                  helper={panel.helper}
                  jobPosts={jobs}
                  tab={panel.tab}
                  onTab={(t) => setPanel((cur) => (cur && cur.mode === 'profile' ? { ...cur, tab: t } : cur))}
                  onDirectHire={() => setPanel({ mode: 'directhire', helper: panel.helper })}
                  onMessage={() => messageHelper(panel.helper)}
                  onReport={() => setComplaint(panel.helper)}
                />
              )}
              {/* Inline in the same pane, without a pop-up. */}
              {panel.mode === 'directhire' && (
                <DirectHirePanel
                  helper={panel.helper}
                  onBack={() => setPanel({ mode: 'profile', helper: panel.helper, tab: 'overview' })}
                  onSent={(name) => { setNotif({ visible: true, msg: `Offer for ${name} sent to PESO for review.`, type: 'success' }); refresh(); }}
                />
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={s.panelEmpty}>
            <View style={s.panelEmptyIcon}><Ionicons name="person-outline" size={28} color={pt.accent} /></View>
            <Text style={s.panelEmptyTitle}>Select a helper</Text>
            <Text style={s.panelEmptySub}>Tap “View Profile” to see full details here — no pop-ups.</Text>
            <View style={s.botCard}>
              <Image source={CAREBOT_ICON} style={s.botMascot} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={s.botTitle}>Not sure who to pick?</Text>
                <Text style={s.botText}>CareBot can help you compare helpers.</Text>
              </View>
              <Pressable onPress={openCareBot} style={({ hovered }: any) => [s.botBtn, TRANS, hovered && { transform: [{ translateY: -1 }] }]}>
                <Ionicons name="chatbubble-ellipses" size={15} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <FilterModal
        visible={filtersOpen}
        filters={filters}
        categories={categories}
        onApply={(nf: any) => { Object.entries(nf).forEach(([k, v]) => updateFilter(k as any, v as any)); setFiltersOpen(false); }}
        onReset={() => { resetFilters(); setFiltersOpen(false); }}
        onClose={() => setFiltersOpen(false)}
      />
      <SubmitComplaintModal
        visible={!!complaint}
        onClose={() => setComplaint(null)}
        respondentId={complaint ? Number(complaint.user_id) : undefined}
        userType="parent"
        counterpartyLabel={complaint?.full_name || 'this helper'}
      />
      <NotificationModal visible={notif.visible} message={notif.msg} type={notif.type} autoClose duration={1600} onClose={() => setNotif((n) => ({ ...n, visible: false }))} />
    </View>
  );
}

// ─── Recommended helper card ───
function RecCard({ helper, match, topReason, isTop, active, onView }: { helper: HelperProfile; match: number; topReason?: string; isTop: boolean; active: boolean; onView: () => void }) {
  const roles = (helper.jobs && helper.jobs.length ? helper.jobs : helper.categories) ?? [];
  return (
    <Pressable onPress={onView} style={({ hovered }: any) => [s.recCard, active && s.recCardActive, TRANS, hovered && !active && s.recCardHover]}>
      <View style={s.recTop}>
        {isTop && <View style={s.topPill}><Ionicons name="trophy" size={11} color={pt.accent} /><Text style={s.topPillText}>Top Match</Text></View>}
        <View style={{ flex: 1 }} />
        {match > 0 && <View style={s.matchPill}><Text style={s.matchPillText}>{match}% Match</Text></View>}
      </View>
      <View style={s.recBody}>
        {helper.profile_image
          ? <Image source={{ uri: helper.profile_image }} style={s.recAva} />
          : <View style={[s.recAva, s.avaFb]}><Text style={s.avaText}>{initials(helper.full_name)}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.recName} numberOfLines={1}>{helper.full_name}</Text>
          <Text style={s.recRoles} numberOfLines={1}>{roles.slice(0, 2).join(' · ') || 'Household Helper'}</Text>
          <View style={s.recLoc}><Ionicons name="location-outline" size={12} color={pt.subtle} /><Text style={s.recLocText} numberOfLines={1}>{helper.municipality || 'Nearby'}</Text></View>
        </View>
      </View>
      {!!topReason && <View style={s.reasonRow}><Ionicons name="checkmark-circle" size={13} color={pt.green} /><Text style={s.reasonText} numberOfLines={1}>{topReason}</Text></View>}
      <View style={s.recBtn}><Text style={s.recBtnText}>View Profile</Text></View>
    </Pressable>
  );
}

// ─── Helper grid card ───
function HelperGridCard({ helper, match, active, onView }: { helper: HelperProfile; match: number; active: boolean; onView: () => void }) {
  const roles = (helper.jobs && helper.jobs.length ? helper.jobs : helper.categories) ?? [];
  const rating = Number(helper.rating_average ?? 0);
  return (
    <Pressable onPress={onView} style={({ hovered }: any) => [s.gCard, active && s.gCardActive, TRANS, hovered && !active && s.recCardHover]}>
      <View style={s.gTop}>
        {helper.profile_image
          ? <Image source={{ uri: helper.profile_image }} style={s.gAva} />
          : <View style={[s.gAva, s.avaFb]}><Text style={s.avaText}>{initials(helper.full_name)}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.gName} numberOfLines={1}>{helper.full_name}</Text>
          {helper.verification_status === 'Verified' && (
            <View style={s.verPill}><Ionicons name="checkmark-circle" size={11} color={pt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>
          )}
          <View style={s.gMeta}>
            {rating > 0 && <><Ionicons name="star" size={12} color={pt.amber} /><Text style={s.gMetaText}>{rating.toFixed(1)}</Text></>}
            {helper.experience_years ? <><Ionicons name="briefcase-outline" size={12} color={pt.subtle} /><Text style={s.gMetaText}>{helper.experience_years}y exp</Text></> : null}
          </View>
        </View>
        {match > 0 && <View style={s.matchPill}><Text style={s.matchPillText}>{match}%</Text></View>}
      </View>
      <View style={s.gCats}>{roles.slice(0, 3).map((c, i) => <Text key={i} style={s.gCat} numberOfLines={1}>{c}</Text>)}</View>
      <View style={s.gActions}>
        <View style={s.gViewBtn}><Text style={s.gViewText}>View Profile</Text></View>
      </View>
    </Pressable>
  );
}

// ─── Helper profile panel (4 tabs) ───
function ProfilePanel({ helper, jobPosts, tab, onTab, onDirectHire, onMessage, onReport }: {
  helper: HelperProfile; jobPosts: JobPost[]; tab: Tab; onTab: (t: Tab) => void; onDirectHire: () => void; onMessage: () => void; onReport: () => void;
}) {
  const h = helper as any;
  const match = computeHelperJobMatch(helper, bestJobForHelper(helper, jobPosts));
  const bio = h.bio || '';
  const categories: string[] = h.categories ?? [];
  const jobs: string[] = h.jobs ?? [];
  const skills: string[] = h.skills ?? [];
  const rating = Number(h.rating_average ?? 0);
  const reviews = Number(h.rating_count ?? 0);
  const expYears = h.experience_years;
  const location = [h.barangay, h.municipality, h.province].filter(Boolean).join(', ');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'experience', label: 'Experience' },
    { key: 'skills', label: 'Skills' },
    { key: 'documents', label: 'Documents' },
  ];

  return (
    <View>
      {/* Header */}
      <View style={s.ppHead}>
        {h.profile_image
          ? <Image source={{ uri: h.profile_image }} style={s.ppAva} />
          : <View style={[s.ppAva, s.avaFb]}><Text style={[s.avaText, { fontSize: 26 }]}>{initials(h.full_name)}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.ppName} numberOfLines={1}>{h.full_name}</Text>
          <View style={s.ppBadges}>
            {h.verification_status === 'Verified'
              ? <View style={s.verPill}><Ionicons name="shield-checkmark" size={11} color={pt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>
              : <View style={[s.verPill, { backgroundColor: pt.amberSoft }]}><Ionicons name="time-outline" size={11} color={pt.amber} /><Text style={[s.verPillText, { color: pt.amber }]}>Pending verification</Text></View>}
            {h.availability_status === 'Available' && <View style={s.availPill}><Ionicons name="briefcase" size={11} color={pt.blue} /><Text style={s.availPillText}>Available</Text></View>}
          </View>
          <View style={s.jpMeta}>
            <Ionicons name="star" size={13} color={pt.amber} /><Text style={s.jpMetaStrong}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
            {reviews > 0 && <Text style={s.jpMetaText}>({reviews} review{reviews !== 1 ? 's' : ''})</Text>}
          </View>
        </View>
      </View>

      {/* Quick stats */}
      <View style={s.tiles}>
        <Tile icon="male-female-outline" value={h.gender || 'Any'} label="Gender" />
        <View style={s.tileDiv} />
        <Tile icon="briefcase-outline" value={expYears ? `${expYears} yrs` : 'New'} label="Experience" />
        <View style={s.tileDiv} />
        <Tile icon="location-outline" value={h.distance != null ? (h.distance < 1 ? `${(h.distance * 1000).toFixed(0)}m` : `${Number(h.distance).toFixed(1)}km`) : (h.municipality || '—')} label="Location" />
      </View>

      {/* Tabs */}
      <View style={s.fpTabs}>
        {tabs.map((t) => (
          <Pressable key={t.key} onPress={() => onTab(t.key)} style={s.fpTab}>
            <Text style={[s.fpTabText, tab === t.key && { color: pt.accent }]}>{t.label}</Text>
            {tab === t.key && <View style={s.fpTabUnderline} />}
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {tab === 'overview' ? (
        <View style={{ gap: 16, marginTop: 16 }}>
          <View style={s.matchCard}>
            <MatchBreakdown
              match={match}
              firstName={(h.full_name || '').split(' ')[0]}
            />
          </View>
          {!!bio && <View><Text style={s.fpSecTitle}>About Me</Text><Text style={s.jpBody}>{bio}</Text></View>}
          <View>
            <Text style={s.fpSecTitle}>Background</Text>
            <View style={s.detailsCard}>
              <DetailRow label="Education" value={h.education_level || 'Not specified'} />
              <DetailRow label="Location" value={location || 'Not specified'} last />
            </View>
          </View>
        </View>
      ) : tab === 'experience' ? (
        <View style={{ gap: 16, marginTop: 16 }}>
          <View>
            <Text style={s.fpSecTitle}>Work Preferences</Text>
            <View style={s.detailsCard}>
              <DetailRow label="Years of Experience" value={expYears ? `${expYears} years` : 'New helper'} />
              <DetailRow label="Preferred Job Type" value={h.employment_type || 'Any'} />
              <DetailRow label="Work Schedule" value={h.work_schedule || 'Any'} />
              <DetailRow label="Expected Salary" value={h.expected_salary ? `₱${Number(h.expected_salary).toLocaleString()} / ${fmtPeriod(h.salary_period)}` : 'Not specified'} last />
            </View>
          </View>
          {jobs.length > 0 && (
            <View>
              <Text style={s.fpSecTitle}>Roles Worked Before</Text>
              <View style={s.chipsWrap}>{jobs.map((j, i) => <View key={i} style={[s.chip, s.chipGreen]}><Text style={[s.chipText, { color: pt.green }]}>{j}</Text></View>)}</View>
            </View>
          )}
          {Array.isArray(h.work_history) && h.work_history.length > 0 && (
            <View>
              <Text style={s.fpSecTitle}>Work History</Text>
              <ExperienceVerificationNotice />
              {h.work_history.map((w: any, i: number) => (
                <View key={i} style={s.whCard}>
                  <View style={s.whHead}>
                    <Text style={s.whRole}>{w.position}</Text>
                    {w.can_contact && (
                      <View style={s.whRefBadge}><Ionicons name="call-outline" size={11} color={pt.green} /><Text style={s.whRefText}>Reference</Text></View>
                    )}
                  </View>
                  <Text style={s.whEmployer}>{w.employer_name}</Text>
                  <Text style={s.whDates}>{whRange(w.start_date, w.end_date)}</Text>
                  <View style={{ marginTop: 8 }}><ExperienceVerificationBadge status={w.experience_review_status} /></View>
                  {!!w.duties && <Text style={s.whDuties}>{w.duties}</Text>}
                  {w.can_contact && !!w.employer_contact && <Text style={s.whContact}>Reference contact: {w.employer_contact}</Text>}
                </View>
              ))}
            </View>
          )}
          {Array.isArray(h.platform_experiences) && h.platform_experiences.length > 0 && (
            <View>
              <Text style={s.fpSecTitle}>Completed CareLink Work</Text>
              <Text style={{ color: pt.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 }}>
                Both the helper and employer confirmed these completed placements.
              </Text>
              {h.platform_experiences.map((w: any) => (
                <View key={w.placement_id} style={s.whCard}>
                  <Text style={s.whRole}>{w.position}</Text>
                  <Text style={s.whEmployer}>{w.employer_name}</Text>
                  <Text style={s.whDates}>{whRange(w.start_date, w.end_date)}</Text>
                  <View style={{ marginTop: 8 }}><ExperienceVerificationBadge status="platform_confirmed" /></View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : tab === 'skills' ? (
        <View style={{ gap: 16, marginTop: 16 }}>
          {categories.length === 0 && jobs.length === 0 && skills.length === 0 ? (
            <Text style={s.jpBody}>No skills or roles listed yet.</Text>
          ) : (
            <>
              {categories.length > 0 && (
                <View><Text style={s.fpSecTitle}>Categories</Text>
                  <View style={s.chipsWrap}>{categories.map((c, i) => <View key={i} style={[s.chip, s.chipBlue]}><Text style={[s.chipText, { color: pt.blue }]}>{c}</Text></View>)}</View>
                </View>
              )}
              {jobs.length > 0 && (
                <View><Text style={s.fpSecTitle}>Specific Roles</Text>
                  <View style={s.chipsWrap}>{jobs.map((j, i) => <View key={i} style={[s.chip, s.chipGreen]}><Text style={[s.chipText, { color: pt.green }]}>{j}</Text></View>)}</View>
                </View>
              )}
              {skills.length > 0 && (
                <View><Text style={s.fpSecTitle}>Skills &amp; Abilities</Text>
                  <View style={s.chipsWrap}>{skills.map((sk, i) => <View key={i} style={s.chip}><Text style={s.chipText}>{sk}</Text></View>)}</View>
                </View>
              )}
            </>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <View style={s.docsLocked}>
            <Ionicons name="lock-closed-outline" size={28} color={pt.muted} />
            <Text style={s.docsLockedTitle}>Documents are private</Text>
            <Text style={s.docsLockedText}>{h.full_name}'s documents are private and are shared only with permission during the hiring process.</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={s.ppActions}>
        <Pressable onPress={onMessage} style={({ hovered }: any) => [s.msgBtn, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.lineSoft }]}>
          <Ionicons name="chatbubble-outline" size={17} color={pt.ink} /><Text style={s.msgBtnText}>Message</Text>
        </Pressable>
        <Pressable onPress={onDirectHire} style={({ hovered }: any) => [s.msgBtn, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.lineSoft }]}>
          <Ionicons name="briefcase-outline" size={17} color={pt.ink} /><Text style={s.msgBtnText}>Hire Directly</Text>
        </Pressable>
      </View>
      <Pressable onPress={onReport} style={({ hovered }: any) => [s.reportBtn, TRANS, hovered && { opacity: 0.7 }]}>
        <Ionicons name="flag-outline" size={13} color={pt.subtle} /><Text style={s.reportText}>Report this helper</Text>
      </Pressable>
    </View>
  );
}
/** "Jan 2022 – Present" range (null end = current job). */
function whRange(start: string, end?: string | null): string {
  const fmt = (d?: string | null) => {
    if (!d) return '';
    const dt = new Date(String(d).replace(' ', 'T'));
    return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
  };
  return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
}

function Tile({ icon, value, label }: { icon: any; value: string; label: string }) {
  return <View style={s.tile}><Ionicons name={icon} size={17} color={pt.muted} /><Text style={s.tileValue} numberOfLines={1}>{value}</Text><Text style={s.tileLabel}>{label}</Text></View>;
}
function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.drRow, !last && s.drBorder]}>
      <Text style={s.drLabel}>{label}</Text>
      <Text style={s.drValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  body: { flex: 1, flexDirection: 'row', maxWidth: 1560, width: '100%', alignSelf: 'center' },
  feed: { paddingHorizontal: 28, paddingTop: 22, paddingBottom: 10 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: pt.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.muted, marginTop: 2, marginBottom: 18 },

  searchRow: { flexDirection: 'row', gap: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 12, paddingHorizontal: 14, height: 46 },
  searchInput: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.ink, outlineStyle: 'none' as any },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 12, paddingHorizontal: 16 },
  filterBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  filterCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: pt.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterCountText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#fff' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 8 },
  chipOn: { backgroundColor: pt.ink, borderColor: pt.ink },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.muted },

  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 },
  secHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  secTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: pt.ink },
  secHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, flexShrink: 1 },
  secLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.accent },
  resultsText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted },

  recRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  recCard: { flexGrow: 1, flexBasis: 230, minWidth: 210, maxWidth: 340, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 14, ...shadowSm, cursor: 'pointer' as any },
  recCardHover: { borderColor: pt.accent, boxShadow: '0 10px 24px rgba(217,164,65,.12)' as any, transform: [{ translateY: -2 }] },
  recCardActive: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  recTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  topPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pt.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  topPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.accent },
  matchPill: { backgroundColor: pt.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  matchPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: '#9A6B12' },
  recBody: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  recAva: { width: 46, height: 46, borderRadius: 23 },
  avaFb: { backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: pt.accent },
  recName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  recRoles: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 1 },
  recLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  recLocText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.subtle },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 10 },
  reasonText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, lineHeight: 18 },
  recBtn: { marginTop: 12, backgroundColor: pt.accent, borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  recBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gCard: { flexGrow: 1, flexBasis: 300, minWidth: 280, maxWidth: 420, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 15, ...shadowSm, cursor: 'pointer' as any },
  gCardActive: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  gTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  gAva: { width: 52, height: 52, borderRadius: 26 },
  gName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: pt.ink },
  gMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 3 },
  gMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginRight: 4 },
  gCats: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 12 },
  gCat: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: pt.ink, backgroundColor: pt.lineSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, maxWidth: 150 },
  gActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  gViewBtn: { flex: 1, backgroundColor: pt.accent, borderRadius: 11, paddingVertical: 10, alignItems: 'center' },
  gViewText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: '#fff' },

  verPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: pt.greenSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginVertical: 3 },
  verPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.green },
  availPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: pt.blueSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginVertical: 3 },
  availPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.blue },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.muted, textAlign: 'center' },
  resetBtn: { marginTop: 4, borderWidth: 1.4, borderColor: pt.accent, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 9 },
  resetBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.accent },

  // Panel
  panel: { width: 460, backgroundColor: pt.surface, borderLeftWidth: 1, borderLeftColor: pt.line, ...({ boxShadow: '-8px 0 24px rgba(120,80,45,.06)' } as any) },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  panelBack: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelBackText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.accent },
  navArrow: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  panelEmpty: { width: 460, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  panelEmptyIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  panelEmptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: pt.ink },
  panelEmptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  botCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 14, width: '100%' },
  botMascot: { width: 42, height: 42 },
  botTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  botText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 1 },
  botBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: pt.accent, alignItems: 'center', justifyContent: 'center' },

  // Profile panel
  ppHead: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  ppAva: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: pt.accentSoft },
  ppName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: pt.ink },
  ppBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  jpMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  jpMetaStrong: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  jpMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted },

  tiles: { flexDirection: 'row', alignItems: 'center', backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 14, paddingVertical: 14, marginBottom: 6 },
  tile: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  tileDiv: { width: 1, height: 32, backgroundColor: pt.line },
  tileValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  tileLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted },

  fpTabs: { flexDirection: 'row', gap: 16, borderBottomWidth: 1, borderBottomColor: pt.line, marginTop: 10 },
  fpTab: { paddingVertical: 12 },
  fpTabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.muted },
  fpTabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2.5, backgroundColor: pt.accent, borderRadius: 2 },
  fpSecTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink, marginBottom: 8 },
  jpBody: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted, lineHeight: 20 },

  matchCard: { backgroundColor: '#FFFBF0', borderRadius: 14, borderWidth: 1, borderColor: pt.accentSoft, padding: 14 },
  matchCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  matchCardIc: { width: 34, height: 34, borderRadius: 10, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  matchCardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  matchCardJob: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 1 },
  matchCardScore: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: pt.accent },

  detailsCard: { backgroundColor: pt.surface, borderRadius: 14, borderWidth: 1, borderColor: pt.line, overflow: 'hidden' },
  drRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  drBorder: { borderBottomWidth: 1, borderBottomColor: pt.line },
  drLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted },
  drValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink, flex: 1, textAlign: 'right', marginLeft: 16 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipGreen: { backgroundColor: pt.greenSoft, borderColor: '#A7E8CE' },
  whCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 12, marginTop: 10 },
  whHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  whRole: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink },
  whRefBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pt.greenSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  whRefText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: pt.green },
  whEmployer: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#7A4E2A', marginTop: 2 },
  whDates: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 2 },
  whDuties: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.ink, marginTop: 6, lineHeight: 17 },
  whContact: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: pt.green, marginTop: 6 },
  chipBlue: { backgroundColor: pt.blueSoft, borderColor: '#CFE0FB' },

  docsLocked: { alignItems: 'center', gap: 10, backgroundColor: pt.raise, borderRadius: 14, borderWidth: 1, borderColor: pt.line, paddingVertical: 30, paddingHorizontal: 20 },
  docsLockedTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  docsLockedText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, textAlign: 'center', lineHeight: 19 },

  ppActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  msgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 13, borderWidth: 1, borderColor: pt.line },
  msgBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  reportText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.subtle },
});
