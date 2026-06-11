// components/helper/applications/ApplicationCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import type { Application } from '@/hooks/helper';

// ── Palette ────────────────────────────────────────────────────────────────────
const DARK    = '#2A1608';
const MUTED   = '#7A5C3E';
const ORANGE  = '#E86019';
const GREEN   = '#059669';
const DIVIDER = '#EDE0D0';
const ICON_BG = '#F5E6CC';
const PAGE_BG = '#FBF5EC';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { color: string; bg: string; label: string }> = {
  Pending:               { color: '#D97706', bg: '#FEF3C7', label: 'Pending Review' },
  Reviewed:              { color: '#2563EB', bg: '#EFF6FF', label: 'Reviewed' },
  Shortlisted:           { color: '#7C3AED', bg: '#EDE9FE', label: 'Shortlisted' },
  'Interview Scheduled': { color: ORANGE,    bg: ICON_BG,   label: 'Interview' },
  Accepted:              { color: GREEN,     bg: '#ECFDF5', label: 'Hired!' },
  contract_pending:      { color: '#D97706', bg: '#FEF3C7', label: 'Contract' },
  hired:                 { color: GREEN,     bg: '#ECFDF5', label: 'Hired' },
  Rejected:              { color: '#DC2626', bg: '#FEF2F2', label: 'Not Selected' },
  auto_rejected:         { color: MUTED,     bg: PAGE_BG,   label: 'Position Closed' },
  Withdrawn:             { color: MUTED,     bg: PAGE_BG,   label: 'Withdrawn' },
};

// ── Progress stepper steps ────────────────────────────────────────────────────
const STEPS = [
  { icon: 'paper-plane-outline' as const },
  { icon: 'eye-outline' as const },
  { icon: 'star-outline' as const },
  { icon: 'calendar-outline' as const },
  { icon: 'checkmark-circle' as const },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'Pending': return 0;
    case 'Reviewed': return 1;
    case 'Shortlisted': return 2;
    case 'Interview Scheduled': return 3;
    case 'Accepted': case 'contract_pending': case 'hired': return 4;
    default: return 0;
  }
}

function initials(name?: string) {
  if (!name?.trim()) return 'E';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  application: Application;
  onPress: () => void;
  onWithdraw: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ApplicationCard({ application, onPress, onWithdraw }: Props) {
  const isTerminal  = ['Rejected', 'auto_rejected', 'Withdrawn'].includes(application.status);
  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(application.status);
  const stepIdx     = getStepIndex(application.status);

  const cfg    = STATUS_MAP[application.status] ?? { color: MUTED, bg: PAGE_BG, label: application.status };
  const salary = Number(application.salary_offered ?? 0);
  const PERIOD: Record<string, string> = { Monthly: 'mo', Daily: 'day', Weekly: 'wk' };
  const period = application.salary_period
    ? `/${PERIOD[application.salary_period] ?? application.salary_period.toLowerCase()}`
    : '';
  const location =
    application.location ||
    [application.municipality, application.province].filter(Boolean).join(', ') ||
    '';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.92}>

      {/* ── Top row: avatar + job info + status badge ── */}
      <View style={s.topRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(application.parent_name)}</Text>
        </View>
        <View style={s.titleWrap}>
          <Text style={s.jobTitle} numberOfLines={1}>{application.job_title}</Text>
          <View style={s.employerRow}>
            <Text style={s.employerName} numberOfLines={1}>{application.parent_name}</Text>
            {application.parent_verified && (
              <Ionicons name="shield-checkmark" size={13} color={GREEN} />
            )}
          </View>
        </View>
        <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* ── Details strip ── */}
      <View style={s.strip}>
        {salary > 0 && (
          <View style={s.stripItem}>
            <Ionicons name="cash-outline" size={12} color={MUTED} />
            <Text style={s.stripText}>₱{salary.toLocaleString()}{period}</Text>
          </View>
        )}
        {!!location && (
          <View style={s.stripItem}>
            <Ionicons name="location-outline" size={12} color={MUTED} />
            <Text style={s.stripText} numberOfLines={1}>{location}</Text>
          </View>
        )}
        {application.employment_type && (
          <View style={s.stripItem}>
            <Ionicons name="briefcase-outline" size={12} color={MUTED} />
            <Text style={s.stripText}>{application.employment_type}</Text>
          </View>
        )}
      </View>

      {/* ── Applied date ── */}
      <Text style={s.dateText}>Applied {application.applied_at}</Text>

      {/* ── Mini progress stepper (non-terminal only) ── */}
      {!isTerminal && (
        <View style={s.stepper}>
          {STEPS.map((step, idx) => {
            const done    = idx < stepIdx;
            const current = idx === stepIdx;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <View style={[s.stepLine, done && s.stepLineDone]} />
                )}
                <View style={[s.stepCircle, done && s.stepCircleDone, current && s.stepCircleCurrent]}>
                  <Ionicons
                    name={done ? 'checkmark' : step.icon}
                    size={9}
                    color={done || current ? '#fff' : MUTED}
                  />
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* ── Footer ── */}
      <View style={s.footer}>
        {canWithdraw && (
          <TouchableOpacity
            style={s.withdrawBtn}
            onPress={(e) => { e.stopPropagation(); onWithdraw(); }}
            hitSlop={4}
          >
            <Ionicons name="arrow-undo-outline" size={13} color="#DC2626" />
            <Text style={s.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={s.detailsBtn}
          onPress={(e) => { e.stopPropagation(); onPress(); }}
        >
          <Text style={s.detailsBtnText}>View Details</Text>
          <Ionicons name="chevron-forward" size={13} color={ORANGE} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    ...Platform.select({
      ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 2 },
      default: { boxShadow: '0 3px 12px rgba(139,94,60,0.08)' } as any,
    }),
  },

  topRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: DIVIDER,
    flexShrink: 0,
  },
  avatarText:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  titleWrap:    { flex: 1, minWidth: 0 },
  jobTitle:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 3 },
  employerRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  employerName: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexShrink: 0 },
  statusText:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  strip:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  stripItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stripText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

  dateText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: '#B0A090', marginBottom: 14 },

  stepper:           { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepLine:          { flex: 1, height: 2, backgroundColor: DIVIDER },
  stepLineDone:      { backgroundColor: DARK },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: DIVIDER,
  },
  stepCircleDone:    { backgroundColor: DARK,   borderColor: DARK },
  stepCircleCurrent: { backgroundColor: ORANGE, borderColor: ORANGE },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingTop: 12,
    gap: 10,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  withdrawText:   { fontFamily: FontFamily.fredokaSemiBold, color: '#DC2626', fontSize: 12 },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  detailsBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: ORANGE, fontSize: 13 },
});
