// components/helper/jobs/ParentEmployerBrowseCard.tsx
// "Families Hiring Near You" employer card shown on the helper browse screen.
// Job section layout adapts: 1 job → full width, 2 → side-by-side, 3+ → horizontal scroll.

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import type { JobPost } from '@/hooks/helper';
import { useBrowseTheme, type BrowseTheme } from '@/app/(helper)/browse/browseJobs.theme';

type Styles = ReturnType<typeof makeStyles>;

const MATCH_REASON_THRESHOLD = 70;
const MAX_SCROLL_JOBS = 8;   // max shown in horizontal scroll

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParentEmployerBrowseCardProps = {
  parentName: string;
  verified: boolean;
  rating: number;
  matchPercent: number;
  matchReasons?: string[];
  jobCount: number;
  openRoleTitles?: string[];    // legacy — no longer rendered, kept for compat
  profileImageUri?: string;
  jobs?: JobPost[];
  onPress: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  if (!name.trim()) return 'P';
  const p = name.trim().split(/\s+/);
  return p.length > 1
    ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase()
    : p[0][0].toUpperCase();
}

function getCategoryIcon(job: JobPost): string {
  const cat = ((job.categories?.[0] ?? job.category_name ?? '')).toLowerCase();
  if (cat.includes('garden'))                        return 'leaf-outline';
  if (cat.includes('child') || cat.includes('baby')) return 'happy-outline';
  if (cat.includes('cook') || cat.includes('food'))  return 'restaurant-outline';
  if (cat.includes('driver'))                        return 'car-outline';
  if (cat.includes('elder') || cat.includes('nurs')) return 'medkit-outline';
  return 'home-outline';
}

function fmtPeriod(p: string) {
  if (p === 'month') return 'mo';
  if (p === 'day')   return 'day';
  if (p === 'week')  return 'wk';
  return p;
}

// ─── Job cell — reused for all layout modes ────────────────────────────────────

interface JobCellProps {
  job: JobPost;
  verified: boolean;
  s: Styles;
  t: BrowseTheme;
}

function JobCell({ job, verified, s, t }: JobCellProps) {
  const matchPct = Math.round(Number(job.match_score ?? 0));
  return (
    <>
      <View style={s.jobHeading}>
        <View style={s.jobIcon}>
          <Ionicons name={getCategoryIcon(job) as any} size={16} color={t.ORANGE} />
        </View>
        <View style={s.jobHeadingText}>
          <Text style={s.jobEyebrow}>OPEN ROLE</Text>
          <Text style={s.jobTitle} numberOfLines={2}>{job.title}</Text>
        </View>
      </View>

      <View style={s.jobPayRow}>
        <Text style={s.salary}>
          ₱{Number(job.salary_offered).toLocaleString()}
        </Text>
        <Text style={s.salaryPeriod}>/ {fmtPeriod(job.salary_period)}</Text>
        {matchPct > 0 && (
          <View style={s.matchMark}>
            <Text style={s.matchMarkText}>{matchPct}% MATCH</Text>
          </View>
        )}
      </View>

      <View style={s.jobDetails}>
        <Ionicons name="location" size={13} color={t.ORANGE} />
        <Text style={s.location} numberOfLines={1}>
          {[job.municipality, job.province].filter(Boolean).join(', ') || 'Location not listed'}
        </Text>
      </View>

      <View style={s.jobMeta}>
        <Text style={s.jobMetaText}>{job.employment_type || 'Any arrangement'}</Text>
        {job.work_schedule ? (
          <>
            <View style={s.metaDivider} />
            <Text style={s.jobMetaText}>{job.work_schedule}</Text>
          </>
        ) : null}
      </View>

      {verified && (
        <View style={s.pesoRow}>
          <Ionicons name="shield-checkmark" size={11} color={t.GREEN} />
          <Text style={s.pesoText}>PESO verified employer</Text>
        </View>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: BrowseTheme) => {
  const { DARK, MUTED, ORANGE, GREEN, CARD_BG, DIVIDER, ICON_BG } = t;
  return StyleSheet.create({
  wrap: { marginBottom: 12 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 16px rgba(139,94,60,0.10)' } as any,
    }),
  },

  // ── Header row ───────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarPh: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: DIVIDER,
  },
  avatarIx: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: DARK },
  headerInfo: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  pesoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  pesoPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText:   { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  distanceRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

  // ── Jobs section border ────────────────────────────────────────────────────
  jobsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
  },

  // ── Full-width cell (1 job) ────────────────────────────────────────────────
  singleCell: {
    padding: 11,
  },

  // ── Side-by-side row (2 jobs) ──────────────────────────────────────────────
  dualRow: {
    flexDirection: 'row',
  },
  dualCell: {
    flex: 1,
    padding: 10,
  },
  dualDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginVertical: 10,
  },

  // ── Horizontal scroll cells (3+ jobs) ─────────────────────────────────────
  scrollContent: {
    // no paddingHorizontal — cells carry their own padding
  },
  scrollCell: {
    width: 175,
    padding: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: DIVIDER,
  },
  scrollCellLast: {
    borderRightWidth: 0,
  },

  // ── Shared job cell internals ──────────────────────────────────────────────
  jobHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  jobIcon: { width: 34, height: 34, borderRadius: 6, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  jobHeadingText: { flex: 1, minWidth: 0 },
  jobEyebrow: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 8, color: MUTED, letterSpacing: 0.8 },
  jobTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, lineHeight: 17 },
  jobPayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingTop: 8, paddingBottom: 7 },
  salary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: ORANGE },
  salaryPeriod: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },
  matchMark: { marginLeft: 'auto', borderLeftWidth: 2, borderLeftColor: GREEN, backgroundColor: '#ECFDF5', paddingHorizontal: 5, paddingVertical: 4 },
  matchMarkText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: GREEN },
  jobDetails: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF8EF', borderLeftWidth: 2, borderLeftColor: ORANGE, paddingHorizontal: 6, paddingVertical: 6 },
  location: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: DARK },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 7 },
  jobMetaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9.5, color: MUTED },
  metaDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: MUTED },
  pesoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  pesoText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: GREEN },

  // ── More hint ────────────────────────────────────────────────────────────────
  moreHint: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
    paddingVertical: 10,
    alignItems: 'center',
  },
  moreHintText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

  // ── Match reasons ─────────────────────────────────────────────────────────────
  reasonsBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
    padding: 12,
    gap: 6,
  },
  reasonsTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 10,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  reasonText: { fontFamily: FontFamily.fredokaRegular, flex: 1, fontSize: 12, color: MUTED, lineHeight: 17 },
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ParentEmployerBrowseCard({
  parentName,
  verified,
  rating,
  matchPercent,
  matchReasons,
  jobCount,
  profileImageUri,
  jobs = [],
  onPress,
}: ParentEmployerBrowseCardProps) {
  const t           = useBrowseTheme();
  const s           = useMemo(() => makeStyles(t), [t]);
  const pct         = Math.min(100, Math.max(0, Math.round(matchPercent)));
  const showReasons = pct >= MATCH_REASON_THRESHOLD && matchReasons && matchReasons.length > 0;
  const distance    = jobs[0]?.distance;

  // Determine how many jobs to display and which layout to use
  const displayJobs  = jobs.slice(0, MAX_SCROLL_JOBS);
  const moreCount    = Math.max(0, jobCount - displayJobs.length);
  const layout: 'single' | 'dual' | 'scroll' =
    displayJobs.length === 1 ? 'single'
    : displayJobs.length === 2 ? 'dual'
    : 'scroll';

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={s.avatarPh}>
              <Text style={s.avatarIx}>{initials(parentName)}</Text>
            </View>
          )}

          <View style={s.headerInfo}>
            <Text style={s.name} numberOfLines={1}>{parentName}</Text>

            {verified && (
              <View style={s.pesoPill}>
                <Ionicons name="shield-checkmark" size={11} color={t.GREEN} />
                <Text style={s.pesoPillText}>PESO Verified</Text>
              </View>
            )}

            {rating > 0 && (
              <View style={s.ratingRow}>
                <Ionicons name="star" size={12} color="#D97706" />
                <Text style={s.ratingText}>
                  {rating.toFixed(1)} ({Math.round(rating * 3)} reviews)
                </Text>
              </View>
            )}

            {distance != null && distance > 0 && (
              <View style={s.distanceRow}>
                <Ionicons name="location-outline" size={12} color={t.MUTED} />
                <Text style={s.distanceText}>
                  {distance < 1 ? '<1' : distance.toFixed(0)} km away
                </Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color={t.SUBTLE} />
        </View>

        {/* ── Job section ── */}
        {displayJobs.length > 0 && (
          <View style={s.jobsSection}>

            {/* 1 job — full width */}
            {layout === 'single' && (
              <View style={s.singleCell}>
                <JobCell job={displayJobs[0]} verified={verified} s={s} t={t} />
              </View>
            )}

            {/* 2 jobs — side by side */}
            {layout === 'dual' && (
              <View style={s.dualRow}>
                <View style={s.dualCell}>
                  <JobCell job={displayJobs[0]} verified={verified} s={s} t={t} />
                </View>
                <View style={s.dualDivider} />
                <View style={s.dualCell}>
                  <JobCell job={displayJobs[1]} verified={verified} s={s} t={t} />
                </View>
              </View>
            )}

            {/* 3+ jobs — horizontal scroll */}
            {layout === 'scroll' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
              >
                {displayJobs.map((job, idx) => (
                  <View
                    key={job.job_post_id}
                    style={[s.scrollCell, idx === displayJobs.length - 1 && s.scrollCellLast]}
                  >
                    <JobCell job={job} verified={verified} s={s} t={t} />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── More jobs hint (only when jobs are capped) ── */}
        {moreCount > 0 && (
          <View style={s.moreHint}>
            <Text style={s.moreHintText}>
              +{moreCount} more role{moreCount !== 1 ? 's' : ''} — tap to see all
            </Text>
          </View>
        )}

        {/* ── Match reasons ── */}
        {showReasons && (
          <View style={s.reasonsBlock}>
            <Text style={s.reasonsTitle}>Why this employer fits you</Text>
            {(matchReasons ?? []).slice(0, 3).map((reason, idx) => (
              <View key={idx} style={s.reasonRow}>
                <Ionicons name="checkmark-circle" size={13} color={t.GREEN} style={{ marginTop: 2 }} />
                <Text style={s.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        )}

      </TouchableOpacity>
    </View>
  );
}
