// app/(helper)/browse/RecommendedJobCard.tsx
// Horizontal-scroll card shown in the "Recommended for You" section.

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import type { JobPost } from '@/hooks/helper';
import MatchBreakdownModal from '@/components/shared/MatchBreakdownModal';
import { fmtPeriod, fmtTag, getCategoryIcon } from './browseHelpers';
import { useBrowseTheme, type BrowseTheme } from './browseJobs.theme';

// ─── Warm background tones per card slot (no green) ──────────────────────────
export const REC_TOPS = ['#F5E3C8', '#EDD9C2', '#F0E0CC'] as const;
// Elements that always sit on the warm peach "hero" top stay dark in both themes.
const TOP_INK = '#2A1608';

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (t: BrowseTheme) => {
  const { CARD_BG, DARK, GREEN, MUTED, ORANGE, DIVIDER, ICON_BG } = t;
  return StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 16px rgba(139,94,60,0.10)' } as any,
    }),
  },

  // Warm photo-like top area
  top: {
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GREEN,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 5,
  },
  matchText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  newBadge: {
    backgroundColor: '#1A5C40',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  newBadgeText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: TOP_INK,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info area
  body: { padding: 13, gap: 7 },
  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
    color: DARK,
    lineHeight: 20,
  },
  familyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  familyName: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: MUTED,
    flex: 1,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1, backgroundColor: ICON_BG, paddingHorizontal: 8, paddingVertical: 7, borderLeftWidth: 3, borderLeftColor: ORANGE },
  locationIcon: { width: 25, height: 25, borderRadius: 4, backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center' },
  locationInfo: { flex: 1, minWidth: 0 },
  locationText: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 10,
    color: DARK,
    flex: 1,
  },
  locationDistance: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: DARK },
  salary: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 17,
    color: DARK,
    marginTop: 2,
  },
  salaryPeriod: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  jobMetaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: MUTED },
  metaDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: MUTED },
  viewBtn: {
    backgroundColor: ORANGE,
    borderRadius: 7,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  viewBtnText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  job: JobPost;
  topColor: string;
  onPress: () => void;
  onSave: () => void;
}

export function RecommendedJobCard({ job, topColor, onPress, onSave }: Props) {
  const t = useBrowseTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const pct  = Math.round(Number(job.match_score ?? 0));
  const icon = getCategoryIcon(job) as any;
  const [showMatch, setShowMatch] = useState(false);

  const location = [job.municipality, job.province].filter(Boolean).join(', ');

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.92} onPress={() => setShowMatch(true)}>

      {/* ── Warm top area ── */}
      <View style={[s.top, { backgroundColor: topColor }]}>
        <View style={s.topBadgeRow}>
          {pct > 0 && (
            <TouchableOpacity style={s.matchBadge} onPress={() => setShowMatch(true)} activeOpacity={0.75}>
              <Text style={s.matchText}>{pct}% Match</Text>
              <Ionicons name="information-circle" size={12} color="#fff" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          )}
          {job.is_new && (
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>New</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.heartBtn} onPress={onSave} hitSlop={8}>
          <Ionicons
            name={job.is_saved ? 'heart' : 'heart-outline'}
            size={17}
            color={job.is_saved ? '#DC2626' : TOP_INK}
          />
        </TouchableOpacity>
        <View style={s.iconCircle}>
          <Ionicons name={icon} size={22} color="#FFFFFF" />
        </View>
      </View>

      {/* ── Info body ── */}
      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>{job.title}</Text>

        <View style={s.familyRow}>
          <Text style={s.familyName} numberOfLines={1}>
            {job.parent_name ?? 'Employer'}
          </Text>
          {job.parent_verified && (
            <Ionicons name="shield-checkmark" size={13} color={t.GREEN} />
          )}
        </View>

        <View style={s.locationRow}>
          <View style={s.locationIcon}>
            <Ionicons name="location" size={13} color={t.ORANGE} />
          </View>
          <View style={s.locationInfo}>
            <Text style={s.locationDistance}>Location</Text>
            <Text style={s.locationText} numberOfLines={1}>{location || 'Location not listed'}</Text>
          </View>
        </View>

        <View>
          <Text style={s.salary}>₱{Number(job.salary_offered).toLocaleString()}</Text>
          <Text style={s.salaryPeriod}>{fmtPeriod(job.salary_period)}</Text>
        </View>

        <View style={s.jobMeta}>
          <Text style={s.jobMetaText}>{fmtTag(job.employment_type || 'Any arrangement')}</Text>
          {job.categories?.[0] ? (
            <>
              <View style={s.metaDivider} />
              <Text style={s.jobMetaText} numberOfLines={1}>{job.categories[0]}</Text>
            </>
          ) : null}
        </View>

        <TouchableOpacity style={s.viewBtn} onPress={onPress} activeOpacity={0.88}>
          <Text style={s.viewBtnText}>View Job</Text>
        </TouchableOpacity>
      </View>

      <MatchBreakdownModal
        visible={showMatch}
        onClose={() => setShowMatch(false)}
        score={pct}
        reasons={job.match_reasons}
        jobTitle={job.title}
        subjectLabel="job"
      />
    </TouchableOpacity>
  );
}
