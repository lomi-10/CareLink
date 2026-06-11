// components/helper/jobs/ParentProfileModal.tsx

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { formatParentHouseholdType } from '@/constants/parentHousehold';
import type { JobPost } from '@/hooks/helper';

// ── Palette ───────────────────────────────────────────────────────────────────
const DARK    = '#2A1608';
const MUTED   = '#7A5C3E';
const ORANGE  = '#E86019';
const GREEN   = '#059669';
const DIVIDER = '#EDE0D0';
const ICON_BG = '#F5E6CC';

type Tab = 'overview' | 'jobs' | 'reviews';

// ── Props ─────────────────────────────────────────────────────────────────────
interface ParentProfileModalProps {
  visible: boolean;
  onClose: () => void;
  parentData: any;
  browseJobs?: JobPost[];
  onOpenJob?: (job: JobPost) => void;
  onToggleSaveJob?: (jobId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const initials = (name: string) => {
  if (!name) return 'E';
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
};

const isTrue = (v: any) => v === 1 || v === '1' || v === true || v === 'true';

function fmtPeriod(p: string) {
  const l = (p ?? '').toLowerCase();
  if (l.startsWith('month')) return 'mo';
  if (l.startsWith('day'))   return 'day';
  if (l.startsWith('week'))  return 'wk';
  return p;
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function SectionHead({ icon, title }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string }) {
  return (
    <View style={ot.sectionHeader}>
      <View style={ot.sectionIconWrap}>
        <Ionicons name={icon} size={14} color={DARK} />
      </View>
      <Text style={ot.sectionTitle}>{title}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, last = false }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[ot.infoRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={14} color={MUTED} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={ot.infoLabel}>{label}</Text>
        <Text style={ot.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ profile, household, children, elderly, documents, setDocViewing }: {
  profile: any; household: any; children: any[]; elderly: any[];
  documents: any[]; setDocViewing: (v: { title: string; url: string } | null) => void;
}) {
  const fullAddress = [profile.barangay, profile.municipality, profile.province]
    .filter(Boolean).join(', ') || null;

  return (
    <View style={ot.root}>
      {profile.bio ? (
        <View style={ot.section}>
          <SectionHead icon="person-outline" title="About" />
          <Text style={ot.bioText}>{profile.bio}</Text>
        </View>
      ) : null}

      {(fullAddress || profile.address) ? (
        <View style={ot.section}>
          <SectionHead icon="location-outline" title="Location" />
          <View style={ot.card}>
            {fullAddress ? <InfoRow icon="map-outline" label="Area" value={fullAddress} last={!profile.address} /> : null}
            {profile.address ? <InfoRow icon="home-outline" label="Address" value={profile.address} last /> : null}
          </View>
        </View>
      ) : null}

      {household && (
        <View style={ot.section}>
          <SectionHead icon="people-outline" title="Household" />
          <View style={ot.card}>
            {household.household_type ? (
              <InfoRow icon="home-outline" label="Housing Type" value={formatParentHouseholdType(household.household_type)} />
            ) : null}
            {household.household_size ? (
              <InfoRow icon="people-outline" label="Size" value={`${household.household_size} Members`} />
            ) : null}
            <InfoRow
              icon="paw-outline"
              label="Pets"
              value={isTrue(household.has_pets) ? (household.pet_details ? `Yes — ${household.pet_details}` : 'Yes') : 'No pets'}
              last
            />
          </View>

          {children.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={ot.subLabel}>Children ({children.length})</Text>
              {children.map((child: any, i: number) => (
                <View key={child.child_id ?? i} style={ot.memberCard}>
                  <View style={ot.memberAvatar}>
                    <Ionicons name="happy-outline" size={15} color={DARK} />
                  </View>
                  <Text style={ot.memberText}>
                    {child.gender ?? 'Unknown'} · {child.age != null ? `${child.age} yrs` : 'Age N/A'}
                    {child.special_needs ? ` · ${child.special_needs}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {elderly.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={ot.subLabel}>Elderly Members ({elderly.length})</Text>
              {elderly.map((el: any, i: number) => (
                <View key={el.elderly_id ?? i} style={ot.memberCard}>
                  <View style={[ot.memberAvatar, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="heart-outline" size={15} color="#D97706" />
                  </View>
                  <Text style={ot.memberText}>
                    {el.gender ?? 'Unknown'} · {el.age != null ? `${el.age} yrs` : 'Age N/A'}
                    {el.condition ? ` · ${el.condition}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {documents.length > 0 && (
        <View style={ot.section}>
          <SectionHead icon="shield-checkmark-outline" title="Verified Documents" />
          <View style={{ gap: 8 }}>
            {documents.map((doc: any, i: number) => (
              <TouchableOpacity
                key={i}
                style={ot.docRow}
                onPress={() => setDocViewing({ title: doc.document_type, url: doc.file_url })}
                activeOpacity={0.8}
              >
                <View style={ot.docIconWrap}>
                  <Ionicons name="document-text" size={16} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ot.docName}>{doc.document_type}</Text>
                  <Text style={ot.docStatus}>✓ Verified by PESO</Text>
                </View>
                <Ionicons name="eye-outline" size={16} color={MUTED} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 24 }} />
    </View>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
function JobsTab({ browseJobs, onOpenJob }: {
  browseJobs?: JobPost[];
  onOpenJob?: (job: JobPost) => void;
}) {
  if (!browseJobs || browseJobs.length === 0) {
    return (
      <View style={jt.empty}>
        <Ionicons name="briefcase-outline" size={36} color={MUTED} />
        <Text style={jt.emptyText}>No active job posts right now</Text>
      </View>
    );
  }

  return (
    <View style={jt.root}>
      <Text style={jt.count}>Active Positions ({browseJobs.length})</Text>
      {browseJobs.map(job => {
        const matchPct = Math.round(Number(job.match_score ?? 0));
        const salary   = Number(job.salary_offered);
        return (
          <TouchableOpacity
            key={job.job_post_id}
            style={jt.card}
            onPress={() => onOpenJob?.(job)}
            activeOpacity={0.85}
          >
            <View style={jt.iconCircle}>
              <Ionicons name="briefcase-outline" size={18} color={DARK} />
            </View>
            <View style={jt.cardBody}>
              <View style={jt.titleRow}>
                <Text style={jt.cardTitle} numberOfLines={1}>{job.title}</Text>
                {matchPct > 0 && (
                  <View style={jt.matchBadge}>
                    <Text style={jt.matchText}>{matchPct}% Match</Text>
                  </View>
                )}
              </View>
              {job.employment_type ? <Text style={jt.cardSub}>• {job.employment_type}</Text> : null}
              {salary > 0 && (
                <Text style={jt.salary}>₱{salary.toLocaleString()}/{fmtPeriod(job.salary_period)}</Text>
              )}
              {(job.municipality || job.province) && (
                <View style={jt.locRow}>
                  <Ionicons name="location-outline" size={11} color={MUTED} />
                  <Text style={jt.locText}>{[job.municipality, job.province].filter(Boolean).join(', ')}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C4A882" />
          </TouchableOpacity>
        );
      })}
      <View style={{ height: 24 }} />
    </View>
  );
}

// ── Reviews Tab ───────────────────────────────────────────────────────────────
function ReviewsTab({ recentReviews, avgRating, reviewCount }: {
  recentReviews: { rating: number; review_text: string; reviewer_name: string }[];
  avgRating: number;
  reviewCount: number;
}) {
  if (reviewCount === 0) {
    return (
      <View style={rt.empty}>
        <Ionicons name="chatbubbles-outline" size={36} color={MUTED} />
        <Text style={rt.emptyText}>No reviews yet</Text>
      </View>
    );
  }

  return (
    <View style={rt.root}>
      <View style={rt.ratingSummary}>
        <Text style={rt.ratingBig}>{avgRating > 0 ? Number(avgRating).toFixed(1) : '—'}</Text>
        <View>
          <View style={{ flexDirection: 'row', gap: 3, marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons
                key={i}
                name={avgRating >= i ? 'star' : avgRating >= i - 0.5 ? 'star-half' : 'star-outline'}
                size={18}
                color={avgRating >= i - 0.4 ? '#F59E0B' : DIVIDER}
              />
            ))}
          </View>
          <Text style={rt.reviewCount}>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {recentReviews.length > 0 ? (
        recentReviews.map((r, i) => (
          <View key={`${r.reviewer_name}-${i}`} style={rt.card}>
            <View style={rt.cardHead}>
              <View style={rt.avatar}>
                <Text style={rt.avatarText}>{r.reviewer_name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={rt.name}>{r.reviewer_name}</Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(j => (
                    <Ionicons key={j} name={Number(r.rating) >= j ? 'star' : 'star-outline'} size={12} color="#F59E0B" />
                  ))}
                </View>
              </View>
            </View>
            {r.review_text ? (
              <Text style={rt.body}>{r.review_text}</Text>
            ) : (
              <Text style={rt.noComment}>No written comment.</Text>
            )}
          </View>
        ))
      ) : (
        <Text style={rt.noComment}>Ratings only — no written reviews to show yet.</Text>
      )}
      <View style={{ height: 24 }} />
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ParentProfileModal({
  visible, onClose, parentData, browseJobs, onOpenJob, onToggleSaveJob,
}: ParentProfileModalProps) {
  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(false);
  const [activeTab,  setActiveTab]  = useState<Tab>('overview');
  const [docViewing, setDocViewing] = useState<{ title: string; url: string } | null>(null);

  const parentId = parentData?.parent_id;

  useEffect(() => {
    if (visible && parentId) {
      fetchProfile();
    } else if (!visible) {
      setData(null);
      setDocViewing(null);
      setActiveTab('overview');
    }
  }, [visible, parentId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/helper/get_parent_profile.php?parent_id=${parentId}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error('ParentProfileModal fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!parentData) return null;

  const profile      = data?.profile      ?? {};
  const user         = data?.user         ?? {};
  const household    = data?.household    ?? null;
  const children     = data?.children     ?? [];
  const elderly      = data?.elderly      ?? [];
  const documents    = data?.documents    ?? [];
  const avgRating    = data?.avg_rating   ?? 0;
  const reviewCount  = data?.review_count ?? 0;
  const activeJobs   = data?.active_jobs  ?? 0;
  const hiredCount   = data?.hired_count  ?? 0;
  const recentReviews = (data?.recent_reviews ?? []) as {
    rating: number; review_text: string; reviewer_name: string;
  }[];

  const name         = user.first_name
    ? `${user.first_name} ${user.last_name}`
    : (parentData.parent_name ?? 'Employer');
  const profileImage = profile.profile_image ?? null;
  const isVerified   = user.status === 'approved';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'jobs',     label: browseJobs && browseJobs.length > 0 ? `Jobs (${browseJobs.length})` : 'Jobs' },
    { key: 'reviews',  label: 'Reviews' },
  ];

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={s.card}>

            {/* ── Gradient header ── */}
            <LinearGradient colors={['#1A0B05', '#2A1608', '#3A1E0A']} style={s.header}>
              <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>

              {profileImage ? (
                <Image source={{ uri: profileImage }} style={s.avatar} contentFit="cover" />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Text style={s.avatarInitials}>{initials(name)}</Text>
                </View>
              )}

              <Text style={s.headerName}>{name}</Text>

              <View style={isVerified ? s.pesoBadge : s.pesoUnverified}>
                <Ionicons name={isVerified ? 'shield-checkmark' : 'warning'} size={12} color={isVerified ? '#fff' : '#FFB3B3'} />
                <Text style={[s.pesoBadgeText, { color: isVerified ? '#fff' : '#FFB3B3' }]}>
                  {isVerified ? 'PESO Verified Employer' : 'Unverified Employer'}
                </Text>
              </View>

              <View style={s.ratingRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Ionicons
                    key={i}
                    name={avgRating >= i ? 'star' : avgRating >= i - 0.5 ? 'star-half' : 'star-outline'}
                    size={14}
                    color={avgRating >= i - 0.4 ? '#F59E0B' : 'rgba(255,255,255,0.3)'}
                  />
                ))}
                <Text style={s.ratingText}>
                  {avgRating > 0 ? `${Number(avgRating).toFixed(1)} ★` : 'No ratings yet'}
                  {reviewCount > 0 ? `, ${reviewCount} reviews` : ''}
                </Text>
              </View>

              <View style={s.statsStrip}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>{activeJobs}</Text>
                  <Text style={s.statLabel}>Active Jobs</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{hiredCount}</Text>
                  <Text style={s.statLabel}>Hired Helpers</Text>
                </View>
              </View>
            </LinearGradient>

            {/* ── Tab bar ── */}
            <View style={s.tabBar}>
              {tabs.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={s.tab}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
                    {tab.label}
                  </Text>
                  {activeTab === tab.key && <View style={s.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Content ── */}
            {loading || !data ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={ORANGE} />
                <Text style={s.loadingText}>Loading profile…</Text>
              </View>
            ) : (
              <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
                {activeTab === 'overview' && (
                  <OverviewTab
                    profile={profile}
                    household={household}
                    children={children}
                    elderly={elderly}
                    documents={documents}
                    setDocViewing={setDocViewing}
                  />
                )}
                {activeTab === 'jobs' && (
                  <JobsTab browseJobs={browseJobs} onOpenJob={onOpenJob} />
                )}
                {activeTab === 'reviews' && (
                  <ReviewsTab
                    recentReviews={recentReviews}
                    avgRating={avgRating}
                    reviewCount={reviewCount}
                  />
                )}
              </ScrollView>
            )}

          </View>
        </View>
      </Modal>

      {/* ── Document viewer ── */}
      {docViewing && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setDocViewing(null)}>
          <SafeAreaView style={s.docViewerRoot}>
            <View style={s.docViewerHeader}>
              <Text style={s.docViewerTitle}>{docViewing.title}</Text>
              <TouchableOpacity onPress={() => setDocViewing(null)} style={s.docViewerClose}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
            <Image
              source={{ uri: docViewing.url }}
              style={s.docViewerImage}
              contentFit="contain"
            />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

// ── Main styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card:    {
    backgroundColor: '#FBF5EC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '95%',
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 24 },
    }),
  },

  // header (dark brown)
  header:         { backgroundColor: DARK, alignItems: 'center', paddingTop: 24, paddingBottom: 24, paddingHorizontal: 24, position: 'relative' },
  backBtn:        { position: 'absolute', top: 18, left: 16, padding: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12 },
  avatar:         { width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: 'rgba(255,255,255,0.28)', marginBottom: 12 },
  avatarFallback: { backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 30, color: '#fff' },
  headerName:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: '#fff', marginBottom: 8, textAlign: 'center' },
  pesoBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', marginBottom: 10 },
  pesoUnverified: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,80,80,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,100,100,0.35)', marginBottom: 10 },
  pesoBadgeText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 16 },
  ratingText:     { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  statsStrip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28, gap: 28 },
  statItem:       { alignItems: 'center', gap: 2 },
  statValue:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: '#fff' },
  statLabel:      { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  statDivider:    { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  // tab bar
  tabBar:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: DIVIDER },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabText:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  tabTextActive:{ color: DARK },
  tabIndicator: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2.5, backgroundColor: DARK, borderRadius: 2 },

  // content
  center:      { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: FontFamily.fredokaRegular, color: MUTED, fontSize: 14 },
  scroll:      { flex: 1 },

  // doc viewer
  docViewerRoot:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  docViewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 24, paddingBottom: 12 },
  docViewerTitle:  { color: '#fff', fontSize: 17, fontFamily: FontFamily.fredokaSemiBold, flex: 1 },
  docViewerClose:  { padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16 },
  docViewerImage:  { flex: 1, marginHorizontal: 16, marginBottom: 40 },
});

// ── Tab-specific styles ───────────────────────────────────────────────────────
const ot = StyleSheet.create({
  root:           { paddingHorizontal: 18, paddingTop: 16 },
  section:        { marginBottom: 20 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIconWrap:{ width: 26, height: 26, borderRadius: 8, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK, textTransform: 'uppercase', letterSpacing: 0.6 },
  bioText:        { fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 21, color: MUTED },
  card:           { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, overflow: 'hidden' },
  infoRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DIVIDER },
  infoLabel:      { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginBottom: 2 },
  infoValue:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, flex: 1 },
  subLabel:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  memberCard:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: DIVIDER, marginBottom: 6 },
  memberAvatar:   { width: 30, height: 30, borderRadius: 15, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  memberText:     { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK, flex: 1 },
  docRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER },
  docIconWrap:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  docName:        { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  docStatus:      { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: GREEN, marginTop: 2 },
});

const jt = StyleSheet.create({
  root:       { paddingHorizontal: 18, paddingTop: 16 },
  count:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED, marginBottom: 12 },
  empty:      { paddingVertical: 48, alignItems: 'center', gap: 12 },
  emptyText:  { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED },
  card:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: DIVIDER },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  cardBody:   { flex: 1, gap: 4 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, flex: 1 },
  matchBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: GREEN + '44' },
  matchText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },
  cardSub:    { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  salary:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE },
  locRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText:    { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
});

const rt = StyleSheet.create({
  root:          { paddingHorizontal: 18, paddingTop: 16 },
  empty:         { paddingVertical: 48, alignItems: 'center', gap: 12 },
  emptyText:     { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED },
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, marginBottom: 16 },
  ratingBig:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 40, color: DARK },
  reviewCount:   { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 4 },
  card:          { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, padding: 14, marginBottom: 10 },
  cardHead:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  name:          { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginBottom: 4 },
  body:          { fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19, color: MUTED },
  noComment:     { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
});
