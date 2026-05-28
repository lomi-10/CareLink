// components/helper/applications/ApplicationCard.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import type { Application } from '@/hooks/helper';

function buildStatusConfig(c: ThemeColor) {
  return {
    Pending: {
      color: c.warning,
      bg: c.warningSoft,
      icon: 'time-outline' as const,
      label: 'Pending Review',
    },
    Reviewed: { color: c.info, bg: c.infoSoft, icon: 'eye-outline' as const, label: 'Reviewed' },
    Shortlisted: {
      color: c.parent,
      bg: c.parentSoft,
      icon: 'star-outline' as const,
      label: 'Shortlisted',
    },
    'Interview Scheduled': {
      color: c.helper,
      bg: c.helperSoft,
      icon: 'calendar-outline' as const,
      label: 'Interview',
    },
    Accepted: {
      color: c.success,
      bg: c.successSoft,
      icon: 'checkmark-circle' as const,
      label: 'Hired!',
    },
    contract_pending: {
      color: c.warning,
      bg: c.warningSoft,
      icon: 'document-text-outline' as const,
      label: 'Contract',
    },
    hired: {
      color: c.success,
      bg: c.successSoft,
      icon: 'checkmark-done-outline' as const,
      label: 'Hired',
    },
    Rejected: {
      color: c.danger,
      bg: c.dangerSoft,
      icon: 'close-circle-outline' as const,
      label: 'Not Selected',
    },
    auto_rejected: {
      color: c.muted,
      bg: c.surface,
      icon: 'briefcase-outline' as const,
      label: 'Closed (other role)',
    },
    Withdrawn: {
      color: c.muted,
      bg: c.surface,
      icon: 'arrow-undo-outline' as const,
      label: 'Withdrawn',
    },
  } as const;
}

function buildLeftAccent(c: ThemeColor): Record<string, string> {
  return {
    Accepted: c.success,
    hired: c.success,
    contract_pending: c.warning,
    Shortlisted: c.parent,
    Rejected: c.danger,
    auto_rejected: c.subtle,
    Withdrawn: c.subtle,
  };
}

function createApplicationCardStyles(c: ThemeColor) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: c.line,
      ...theme.shadow.card,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    titleWrap: { flex: 1, paddingRight: 10 },
    jobTitle: { fontSize: 17, fontWeight: '800', color: c.ink, marginBottom: 5, letterSpacing: -0.3 },
    employerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    employerDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.parentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    employerDotText: { fontSize: 10, fontWeight: '800', color: c.parent },
    employerName: { fontSize: 13, color: c.inkMuted, fontWeight: '600' },

    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: '700' },

    catJobRow: { flexDirection: 'column', gap: 3, marginBottom: 8 },
    catJobItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    catJobLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.subtle,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    catJobValue: { flex: 1, fontSize: 12, fontWeight: '600', color: c.inkMuted },

    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      padding: 10,
      borderRadius: 10,
      marginBottom: 10,
      gap: 8,
    },
    stripItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    stripText: { fontSize: 12, fontWeight: '600', color: c.inkMuted },
    stripDivider: { width: 1, height: 14, backgroundColor: c.line },

    dateText: { fontSize: 12, color: c.subtle, marginBottom: 14, fontWeight: '500' },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: c.line,
      paddingTop: 14,
      gap: 10,
    },
    withdrawBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 9,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.danger + '30',
    },
    withdrawText: { color: c.danger, fontSize: 13, fontWeight: '700' },
    detailsBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      paddingVertical: 9,
    },
    detailsBtnText: { color: c.helper, fontSize: 13, fontWeight: '700' },
  });
}

interface Props {
  application: Application;
  onPress: () => void;
  onWithdraw: () => void;
}

export default function ApplicationCard({ application, onPress, onWithdraw }: Props) {
  const { color: c } = useHelperTheme();
  const s = useMemo(() => createApplicationCardStyles(c), [c]);
  const STATUS_CONFIG = useMemo(() => buildStatusConfig(c), [c]);
  const LEFT_ACCENT = useMemo(() => buildLeftAccent(c), [c]);

  const st = application.status as keyof typeof STATUS_CONFIG;
  const cfg =
    STATUS_CONFIG[st] ?? {
      color: c.muted,
      bg: c.surface,
      icon: 'information-circle-outline' as const,
      label: application.status,
    };
  const accent = LEFT_ACCENT[application.status];
  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(application.status);

  const salary = Number(application.salary_offered ?? 0).toLocaleString();
  const PERIOD_LABEL: Record<string, string> = { Monthly: 'mo', Daily: 'day', Weekly: 'wk' };
  const period = application.salary_period
    ? `/${PERIOD_LABEL[application.salary_period] ?? application.salary_period.toLowerCase()}`
    : '';
  const location =
    application.location ||
    [application.municipality, application.province].filter(Boolean).join(', ') ||
    'Location N/A';

  return (
    <TouchableOpacity
      style={[s.card, accent ? { borderLeftColor: accent, borderLeftWidth: 4 } : {}]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={s.topRow}>
        <View style={s.titleWrap}>
          <Text style={s.jobTitle} numberOfLines={1}>
            {application.job_title}
          </Text>
          <View style={s.employerRow}>
            <View style={s.employerDot}>
              <Text style={s.employerDotText}>{application.parent_name?.charAt(0).toUpperCase() ?? 'E'}</Text>
            </View>
            <Text style={s.employerName} numberOfLines={1}>
              {application.parent_name}
            </Text>
            {application.parent_verified && (
              <Ionicons name="shield-checkmark" size={13} color={c.helper} />
            )}
          </View>
        </View>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {(application.category_name || (application.job_names && application.job_names.length > 0)) && (
        <View style={s.catJobRow}>
          {application.category_name && (
            <View style={s.catJobItem}>
              <Ionicons name="grid-outline" size={11} color={c.muted} />
              <Text style={s.catJobLabel}>Category:</Text>
              <Text style={s.catJobValue}>{application.category_name}</Text>
            </View>
          )}
          {application.job_names && application.job_names.length > 0 && (
            <View style={s.catJobItem}>
              <Ionicons name="briefcase-outline" size={11} color={c.muted} />
              <Text style={s.catJobLabel}>Job:</Text>
              <Text style={s.catJobValue} numberOfLines={1}>
                {application.job_names.join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={s.strip}>
        <View style={s.stripItem}>
          <Ionicons name="cash-outline" size={13} color={c.helper} />
          <Text style={s.stripText}>
            ₱{salary}
            {period}
          </Text>
        </View>
        <View style={s.stripDivider} />
        <View style={s.stripItem}>
          <Ionicons name="location-outline" size={13} color={c.muted} />
          <Text style={s.stripText} numberOfLines={1}>
            {location}
          </Text>
        </View>
        {application.employment_type ? (
          <>
            <View style={s.stripDivider} />
            <View style={s.stripItem}>
              <Ionicons name="briefcase-outline" size={13} color={c.muted} />
              <Text style={s.stripText}>{application.employment_type}</Text>
            </View>
          </>
        ) : null}
      </View>

      <Text style={s.dateText}>Applied {application.applied_at}</Text>

      <View style={s.footer}>
        {canWithdraw && (
          <TouchableOpacity
            style={s.withdrawBtn}
            onPress={(e) => {
              e.stopPropagation();
              onWithdraw();
            }}
            hitSlop={4}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={c.danger} />
            <Text style={s.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.detailsBtn}
          onPress={(e) => {
            e.stopPropagation();
            onPress();
          }}
        >
          <Text style={s.detailsBtnText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={c.helper} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
