// components/helper/applications/ApplicationDetailsModal.tsx
import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import API_URL from '@/constants/api';
import type { Application } from '@/hooks/helper';

interface Props {
  visible: boolean;
  application: Application | null;
  onWithdraw: () => void;
  onClose: () => void;
  onMessage?: () => void;
  onInterviewResponded?: () => void;
}

const STATUS_CONFIG: Record<string, {
  color: string; bg: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; subtitle: string;
}> = {
  'Pending': {
    color: theme.color.warning, bg: theme.color.warningSoft,
    icon: 'time-outline',
    title: 'Application Submitted',
    subtitle: 'Your application is waiting to be reviewed by the employer.',
  },
  'Reviewed': {
    color: theme.color.info, bg: theme.color.infoSoft,
    icon: 'eye-outline',
    title: 'Under Review',
    subtitle: 'The employer has looked at your application.',
  },
  'Shortlisted': {
    color: '#7C3AED', bg: '#F3E8FF',
    icon: 'star-outline',
    title: 'You are Shortlisted!',
    subtitle: 'Great news — you are among the top candidates. Expect to be contacted soon.',
  },
  'Interview Scheduled': {
    color: theme.color.helper, bg: theme.color.helperSoft,
    icon: 'calendar-outline',
    title: 'Interview Scheduled',
    subtitle: 'Check your messages for interview details.',
  },
  'Accepted': {
    color: theme.color.success, bg: theme.color.successSoft,
    icon: 'checkmark-circle',
    title: 'Congratulations! You are Hired!',
    subtitle: 'The employer has accepted your application for this position.',
  },
  'Rejected': {
    color: theme.color.danger, bg: theme.color.dangerSoft,
    icon: 'close-circle-outline',
    title: 'Application Declined',
    subtitle: 'The employer has decided to move forward with other candidates.',
  },
  'Withdrawn': {
    color: theme.color.muted, bg: theme.color.surface,
    icon: 'arrow-undo-outline',
    title: 'Application Withdrawn',
    subtitle: 'You withdrew this application.',
  },
};

function DetailRow({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string | number | null | undefined;
}) {
  if (!value && value !== 0) return null;
  return (
    <View style={s.detailRow}>
      <View style={s.detailIconWrap}>
        <Ionicons name={icon} size={14} color={theme.color.helper} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{String(value)}</Text>
      </View>
    </View>
  );
}

export default function ApplicationDetailsModal({ visible, application, onWithdraw, onClose, onMessage, onInterviewResponded }: Props) {
  const [interviewLoading, setInterviewLoading] = useState(false);

  if (!application) return null;

  const handleInterviewAction = async (action: 'confirm' | 'decline') => {
    const intv = (application as any).interview;
    if (!intv?.interview_id) return;
    setInterviewLoading(true);
    try {
      await fetch(`${API_URL}/interviews/confirm.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_id: intv.interview_id, user_id: (application as any).helper_id, action }),
      });
      onInterviewResponded?.();
      onClose();
    } finally {
      setInterviewLoading(false);
    }
  };

  const cfg = STATUS_CONFIG[application.status] ?? {
    color: theme.color.muted, bg: theme.color.surface,
    icon: 'information-circle-outline' as const,
    title: application.status, subtitle: '',
  };

  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(application.status);

  const salary = Number(application.salary_offered ?? 0).toLocaleString();
  const salaryLabel = application.salary_period ? `₱${salary} / ${application.salary_period}` : `₱${salary}`;
  const location = application.location
    || [application.municipality, application.province].filter(Boolean).join(', ')
    || null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.jobTitle} numberOfLines={2}>{application.job_title}</Text>
              <Text style={s.employerName}>{application.parent_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={theme.color.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

            {/* ── Status banner ── */}
            <View style={[s.banner, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
              <View style={[s.bannerIcon, { backgroundColor: cfg.color + '20' }]}>
                <Ionicons name={cfg.icon} size={26} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: cfg.color }]}>{cfg.title}</Text>
                <Text style={[s.bannerSub, { color: cfg.color + 'CC' }]}>{cfg.subtitle}</Text>
              </View>
            </View>

            {/* ── Interview card (if scheduled) ── */}
            {(application as any).interview && (application as any).interview.interview_id && (
              <View style={s.interviewCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="calendar" size={18} color={theme.color.parent} />
                  <Text style={s.interviewTitle}>Interview Scheduled</Text>
                </View>
                <Text style={s.interviewDate}>
                  {new Date((application as any).interview.interview_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
                <Text style={s.interviewType}>
                  {(application as any).interview.interview_type}
                  {(application as any).interview.location_or_link ? ` · ${(application as any).interview.location_or_link}` : ''}
                </Text>
                {(application as any).interview.notes ? (
                  <Text style={s.interviewNotes}>{(application as any).interview.notes}</Text>
                ) : null}
                {(application as any).interview.status === 'Scheduled' && !(application as any).interview.helper_confirmed && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[s.interviewBtn, { backgroundColor: theme.color.helperSoft }]}
                      onPress={() => handleInterviewAction('decline')}
                      disabled={interviewLoading}
                    >
                      <Ionicons name="close" size={15} color={theme.color.danger} />
                      <Text style={[s.interviewBtnTxt, { color: theme.color.danger }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.interviewBtn, { flex: 1, backgroundColor: theme.color.helper }]}
                      onPress={() => handleInterviewAction('confirm')}
                      disabled={interviewLoading}
                    >
                      {interviewLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><Ionicons name="checkmark" size={15} color="#fff" /><Text style={[s.interviewBtnTxt, { color: '#fff' }]}>Confirm Attendance</Text></>
                      }
                    </TouchableOpacity>
                  </View>
                )}
                {(application as any).interview.helper_confirmed && (
                  <Text style={s.interviewConfirmed}>✓ You confirmed attendance</Text>
                )}
              </View>
            )}

            {/* ── Job details ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Job Details</Text>
              <View style={s.infoCard}>
                <DetailRow icon="cash-outline"      label="Salary Offered"    value={salaryLabel} />
                <DetailRow icon="location-outline"  label="Location"          value={location} />
                <DetailRow icon="briefcase-outline" label="Employment Type"   value={application.employment_type} />
                <DetailRow icon="time-outline"      label="Work Schedule"     value={application.work_schedule} />
              </View>
            </View>

            {/* ── Application timeline ── */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Application Timeline</Text>
              <View style={s.infoCard}>
                <DetailRow icon="calendar-outline"  label="Applied On"        value={application.applied_at} />
                {application.reviewed_at ? (
                  <DetailRow icon="eye-outline"     label="Reviewed"          value={application.reviewed_at} />
                ) : null}
              </View>
            </View>

            {/* ── Cover letter ── */}
            {application.cover_letter ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Your Cover Letter</Text>
                <View style={s.letterBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.color.helper} style={{ marginTop: 2 }} />
                  <Text style={s.letterText}>{application.cover_letter}</Text>
                </View>
              </View>
            ) : null}

            {/* ── Message from employer ── */}
            {application.message_from_parent ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Message from Employer</Text>
                <View style={s.feedbackBox}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={theme.color.helper} />
                  <Text style={s.feedbackText}>{application.message_from_parent}</Text>
                </View>
              </View>
            ) : null}

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* ── Footer ── */}
          <View style={s.footer}>
            {canWithdraw && (
              <TouchableOpacity style={s.withdrawBtn} onPress={onWithdraw}>
                <Ionicons name="arrow-undo-outline" size={16} color={theme.color.danger} />
                <Text style={s.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            )}
            {onMessage && (
              <TouchableOpacity style={s.messageBtn} onPress={onMessage}>
                <Ionicons name="chatbubble-outline" size={16} color={theme.color.helper} />
                <Text style={s.messageBtnText}>Message</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.closeFullBtn} onPress={onClose}>
              <Text style={s.closeFullBtnText}>Close</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.color.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card:    { width: '100%', maxWidth: 640, maxHeight: '92%', backgroundColor: theme.color.surfaceElevated, borderRadius: 24, overflow: 'hidden', ...theme.shadow.card },

  header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 22, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  jobTitle:     { fontSize: 21, fontWeight: '800', color: theme.color.ink, marginBottom: 4, letterSpacing: -0.4 },
  employerName: { fontSize: 14, fontWeight: '600', color: theme.color.muted },
  closeBtn:     { padding: 6, backgroundColor: theme.color.surface, borderRadius: 14 },

  scroll: { flex: 1, paddingHorizontal: 22, paddingTop: 4 },

  banner:     { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 18, marginBottom: 6, gap: 14 },
  bannerIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bannerTitle:{ fontSize: 15, fontWeight: '800', marginBottom: 3 },
  bannerSub:  { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  section:      { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: theme.color.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  infoCard:    { backgroundColor: theme.color.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden' },
  detailRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.color.line, gap: 10 },
  detailIconWrap: { width: 28, height: 28, borderRadius: 7, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 11, color: theme.color.subtle, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: 14, fontWeight: '700', color: theme.color.ink, marginTop: 1 },

  letterBox:   { flexDirection: 'row', gap: 10, backgroundColor: theme.color.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.color.line },
  letterText:  { flex: 1, fontSize: 14, lineHeight: 22, color: theme.color.inkMuted, fontStyle: 'italic' },

  feedbackBox: { flexDirection: 'row', gap: 10, backgroundColor: theme.color.helperSoft, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.color.helper + '30' },
  feedbackText:{ flex: 1, fontSize: 14, lineHeight: 22, color: theme.color.ink, fontWeight: '500' },

  footer:         { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: theme.color.line },
  withdrawBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, backgroundColor: theme.color.dangerSoft, borderWidth: 1, borderColor: theme.color.danger + '30' },
  withdrawText:   { color: theme.color.danger, fontSize: 14, fontWeight: '700' },
  closeFullBtn:   { flex: 1, backgroundColor: theme.color.helper, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  closeFullBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  messageBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, backgroundColor: theme.color.helperSoft, borderWidth: 1, borderColor: theme.color.helper + '40' },
  messageBtnText: { color: theme.color.helper, fontSize: 14, fontWeight: '700' },
  interviewCard:  { backgroundColor: theme.color.parentSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.color.parent + '30', marginTop: 14 },
  interviewTitle: { fontSize: 14, fontWeight: '800', color: theme.color.parent },
  interviewDate:  { fontSize: 16, fontWeight: '700', color: theme.color.ink, marginBottom: 2 },
  interviewType:  { fontSize: 13, color: theme.color.muted },
  interviewNotes: { fontSize: 13, color: theme.color.inkMuted, marginTop: 6, fontStyle: 'italic' },
  interviewBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  interviewBtnTxt:{ fontSize: 13, fontWeight: '700' },
  interviewConfirmed: { fontSize: 13, color: theme.color.helper, fontWeight: '700', marginTop: 8 },
});
