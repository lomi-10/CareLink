import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';

const MATCH_REASON_DISPLAY_THRESHOLD = 70;
const MAX_MATCH_REASONS_SHOWN = 4;

export type ParentEmployerBrowseCardProps = {
  parentName: string;
  verified: boolean;
  rating: number;
  /** 0–100 from job match scores */
  matchPercent: number;
  /** Deduped reasons from top-matching job(s); shown only when matchPercent ≥ 70 */
  matchReasons?: string[];
  jobCount: number;
  /** Open role titles for this employer (browse context); shown under header row */
  openRoleTitles?: string[];
  onPress: () => void;
};

function initials(name: string) {
  if (!name.trim()) return 'P';
  const p = name.trim().split(/\s+/);
  return p.length > 1 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : p[0][0].toUpperCase();
}

const MAX_OPEN_ROLE_TITLES_SHOWN = 4;

function cardStyles(c: ThemeColor) {
  return StyleSheet.create({
    wrap: { marginBottom: 12 },
    card: {
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surfaceElevated,
      ...theme.shadow.card,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    avatarPh: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.helperSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarIx: { fontSize: 17, fontWeight: '800', color: c.helper },
    mid: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    name: { fontSize: 16, fontWeight: '800', color: c.ink, flexShrink: 1 },
    sub: { fontSize: 12, color: c.muted, marginTop: 4, fontWeight: '600' },
    right: { alignItems: 'flex-end', gap: 6 },
    pctPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: c.warningSoft,
      borderWidth: 1,
      borderColor: c.warning + '44',
    },
    pctText: { fontSize: 13, fontWeight: '900', color: c.warning },
    stars: { flexDirection: 'row', gap: 2 },
    chevron: { marginLeft: 4 },
    jobsBlock: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    jobsBlockTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    jobTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 },
    jobTitleBullet: { fontSize: 12, fontWeight: '800', color: c.helper, marginTop: 1, width: 14 },
    jobTitleText: { flex: 1, fontSize: 13, fontWeight: '700', color: c.ink, lineHeight: 18 },
    moreRolesHint: { fontSize: 12, fontWeight: '700', color: c.muted, marginTop: 2, marginLeft: 20 },
    reasonsBlock: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.line,
    },
    reasonsTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
    reasonText: { flex: 1, fontSize: 12, color: c.muted, lineHeight: 17, fontWeight: '600' },
  });
}

export function ParentEmployerBrowseCard({
  parentName,
  verified,
  rating,
  matchPercent,
  matchReasons,
  jobCount,
  profileImageUri,
  openRoleTitles = [],
  onPress,
}: ParentEmployerBrowseCardProps) {
  const { color: c } = useHelperTheme();
  const s = useMemo(() => cardStyles(c), [c]);
  const pct = Math.min(100, Math.max(0, Math.round(matchPercent)));
  const showReasons =
    pct >= MATCH_REASON_DISPLAY_THRESHOLD && matchReasons && matchReasons.length > 0;
  const reasonsToShow = showReasons ? (matchReasons ?? []).slice(0, MAX_MATCH_REASONS_SHOWN) : [];
  const titles = openRoleTitles.filter((t) => t.trim());
  const titlesShown = titles.slice(0, MAX_OPEN_ROLE_TITLES_SHOWN);
  const moreCount = titles.length - titlesShown.length;

  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>
        <View style={s.cardRow}>
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri }} style={s.avatar} />
          ) : (
            <View style={s.avatarPh}>
              <Text style={s.avatarIx}>{initials(parentName)}</Text>
            </View>
          )}
          <View style={s.mid}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {parentName}
              </Text>
              {verified ? (
                <Ionicons name="shield-checkmark" size={16} color={c.success} />
              ) : (
                <Ionicons name="alert-circle-outline" size={16} color={c.subtle} />
              )}
            </View>
            <Text style={s.sub} numberOfLines={1}>
              {jobCount} open role{jobCount !== 1 ? 's' : ''}
              {rating > 0 ? ` · ${rating.toFixed(1)}★ avg` : ' · No reviews yet'}
            </Text>
          </View>
          <View style={s.right}>
            <View style={s.pctPill}>
              <Text style={s.pctText}>{pct}% match</Text>
            </View>
            <View style={s.stars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={rating >= i - 0.25 ? 'star' : 'star-outline'}
                  size={12}
                  color={rating >= i - 0.25 ? theme.color.warning : theme.color.lineStrong}
                />
              ))}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.muted} style={s.chevron} />
        </View>
        {titlesShown.length > 0 ? (
          <View style={s.jobsBlock}>
            <Text style={s.jobsBlockTitle}>Open roles</Text>
            {titlesShown.map((title, idx) => (
              <View key={`${idx}-${title.slice(0, 32)}`} style={s.jobTitleRow}>
                <Text style={s.jobTitleBullet}>•</Text>
                <Text style={s.jobTitleText} numberOfLines={2}>
                  {title}
                </Text>
              </View>
            ))}
            {moreCount > 0 ? (
              <Text style={s.moreRolesHint}>+{moreCount} more role{moreCount !== 1 ? 's' : ''}</Text>
            ) : null}
          </View>
        ) : null}
        {showReasons ? (
          <View style={s.reasonsBlock}>
            <Text style={s.reasonsTitle}>Why this employer fits you</Text>
            {reasonsToShow.map((reason, idx) => (
              <View key={`${idx}-${reason.slice(0, 24)}`} style={s.reasonRow}>
                <Ionicons name="checkmark-circle" size={14} color={c.success} style={{ marginTop: 1 }} />
                <Text style={s.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}
