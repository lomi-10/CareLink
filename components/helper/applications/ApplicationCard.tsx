// components/helper/applications/ApplicationCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import type { Application } from '@/hooks/helper';

interface Props {
  application: Application;
  onPress: () => void;
  onWithdraw: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
  'Pending':            { color: theme.color.warning,  bg: theme.color.warningSoft,  icon: 'time-outline',          label: 'Pending Review' },
  'Reviewed':           { color: theme.color.info,     bg: theme.color.infoSoft,     icon: 'eye-outline',           label: 'Reviewed' },
  'Shortlisted':        { color: '#7C3AED',            bg: '#F3E8FF',                icon: 'star-outline',          label: 'Shortlisted' },
  'Interview Scheduled':{ color: theme.color.helper,   bg: theme.color.helperSoft,   icon: 'calendar-outline',      label: 'Interview' },
  'Accepted':           { color: theme.color.success,  bg: theme.color.successSoft,  icon: 'checkmark-circle',      label: 'Hired!' },
  'Rejected':           { color: theme.color.danger,   bg: theme.color.dangerSoft,   icon: 'close-circle-outline',  label: 'Not Selected' },
  'Withdrawn':          { color: theme.color.muted,    bg: theme.color.surface,      icon: 'arrow-undo-outline',    label: 'Withdrawn' },
};

const LEFT_ACCENT: Record<string, string> = {
  'Accepted':    theme.color.success,
  'Shortlisted': '#7C3AED',
  'Rejected':    theme.color.danger,
  'Withdrawn':   theme.color.subtle,
};

export default function ApplicationCard({ application, onPress, onWithdraw }: Props) {
  const cfg = STATUS_CONFIG[application.status] ?? {
    color: theme.color.muted, bg: theme.color.surface,
    icon: 'information-circle-outline' as const, label: application.status,
  };
  const accent = LEFT_ACCENT[application.status];
  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(application.status);

  const salary = Number(application.salary_offered ?? 0).toLocaleString();
  const PERIOD_LABEL: Record<string, string> = { Monthly: 'mo', Daily: 'day', Weekly: 'wk' };
  const period = application.salary_period ? `/${PERIOD_LABEL[application.salary_period] ?? application.salary_period.toLowerCase()}` : '';
  const location = application.location || [application.municipality, application.province].filter(Boolean).join(', ') || 'Location N/A';

  return (
    <TouchableOpacity
      style={[s.card, accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : {}]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* ── Title row ── */}
      <View style={s.topRow}>
        <View style={s.titleWrap}>
          <Text style={s.jobTitle} numberOfLines={1}>{application.job_title}</Text>
          <View style={s.employerRow}>
            <View style={s.employerDot}>
              <Text style={s.employerDotText}>
                {application.parent_name?.charAt(0).toUpperCase() ?? 'E'}
              </Text>
            </View>
            <Text style={s.employerName} numberOfLines={1}>{application.parent_name}</Text>
            {application.parent_verified && (
              <Ionicons name="shield-checkmark" size={13} color={theme.color.helper} />
            )}
          </View>
        </View>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* ── Category / Job type ── */}
      {(application.category_name || (application.job_names && application.job_names.length > 0)) && (
        <View style={s.catJobRow}>
          {application.category_name && (
            <View style={s.catJobItem}>
              <Ionicons name="grid-outline" size={11} color={theme.color.muted} />
              <Text style={s.catJobLabel}>Category:</Text>
              <Text style={s.catJobValue}>{application.category_name}</Text>
            </View>
          )}
          {application.job_names && application.job_names.length > 0 && (
            <View style={s.catJobItem}>
              <Ionicons name="briefcase-outline" size={11} color={theme.color.muted} />
              <Text style={s.catJobLabel}>Job:</Text>
              <Text style={s.catJobValue} numberOfLines={1}>{application.job_names.join(', ')}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Details strip ── */}
      <View style={s.strip}>
        <View style={s.stripItem}>
          <Ionicons name="cash-outline" size={13} color={theme.color.helper} />
          <Text style={s.stripText}>₱{salary}{period}</Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripItem}>
          <Ionicons name="location-outline" size={13} color={theme.color.muted} />
          <Text style={s.stripText} numberOfLines={1}>{location}</Text>
        </View>
        {application.employment_type ? (
          <>
            <View style={s.stripDivider} />
            <View style={s.stripItem}>
              <Ionicons name="briefcase-outline" size={13} color={theme.color.muted} />
              <Text style={s.stripText}>{application.employment_type}</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* ── Applied date ── */}
      <Text style={s.dateText}>Applied {application.applied_at}</Text>

      {/* ── Footer ── */}
      <View style={s.footer}>
        {canWithdraw && (
          <TouchableOpacity
            style={s.withdrawBtn}
            onPress={(e) => { e.stopPropagation(); onWithdraw(); }}
            hitSlop={4}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={theme.color.danger} />
            <Text style={s.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.detailsBtn}
          onPress={(e) => { e.stopPropagation(); onPress(); }}
        >
          <Text style={s.detailsBtnText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.color.helper} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  topRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  titleWrap:    { flex: 1, paddingRight: 10 },
  jobTitle:     { fontSize: 17, fontWeight: '800', color: theme.color.ink, marginBottom: 5, letterSpacing: -0.3 },
  employerRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  employerDot:  { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center' },
  employerDotText: { fontSize: 10, fontWeight: '800', color: theme.color.parent },
  employerName: { fontSize: 13, color: theme.color.inkMuted, fontWeight: '600' },

  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  catJobRow:   { flexDirection: 'column', gap: 3, marginBottom: 8 },
  catJobItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catJobLabel: { fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', letterSpacing: 0.3 },
  catJobValue: { flex: 1, fontSize: 12, fontWeight: '600', color: theme.color.inkMuted },

  strip:        { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.color.surface, padding: 10, borderRadius: 10, marginBottom: 10, gap: 8 },
  stripItem:    { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  stripText:    { fontSize: 12, fontWeight: '600', color: theme.color.inkMuted },
  stripDivider: { width: 1, height: 14, backgroundColor: theme.color.line },

  dateText: { fontSize: 12, color: theme.color.subtle, marginBottom: 14, fontWeight: '500' },

  footer:       { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.color.line, paddingTop: 14, gap: 10 },
  withdrawBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9, backgroundColor: theme.color.dangerSoft, borderWidth: 1, borderColor: theme.color.danger + '30' },
  withdrawText: { color: theme.color.danger, fontSize: 13, fontWeight: '700' },
  detailsBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingVertical: 9 },
  detailsBtnText: { color: theme.color.helper, fontSize: 13, fontWeight: '700' },
});
