// components/helper/applications/ApplicationDetailsModal.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
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

function buildStatusConfig(c: ThemeColor): Record<
  string,
  {
    color: string;
    bg: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle: string;
  }
> {
  return {
    Pending: {
      color: c.warning,
      bg: c.warningSoft,
      icon: 'time-outline',
      title: 'Application Submitted',
      subtitle: 'Your application is waiting to be reviewed by the employer.',
    },
    Reviewed: {
      color: c.info,
      bg: c.infoSoft,
      icon: 'eye-outline',
      title: 'Under Review',
      subtitle: 'The employer has looked at your application.',
    },
    Shortlisted: {
      color: c.parent,
      bg: c.parentSoft,
      icon: 'star-outline',
      title: 'You are Shortlisted!',
      subtitle:
        'Great news — you are among the top candidates. Expect to be contacted soon.',
    },
    'Interview Scheduled': {
      color: c.helper,
      bg: c.helperSoft,
      icon: 'calendar-outline',
      title: 'Interview Scheduled',
      subtitle: 'Check your messages for interview details.',
    },
    Accepted: {
      color: c.success,
      bg: c.successSoft,
      icon: 'checkmark-circle',
      title: 'Congratulations! You are Hired!',
      subtitle: 'The employer has accepted your application for this position.',
    },
    contract_pending: {
      color: c.warning,
      bg: c.warningSoft,
      icon: 'document-text-outline',
      title: 'Contract pending',
      subtitle: 'Review the employment contract in Messages and confirm when you agree.',
    },
    hired: {
      color: c.success,
      bg: c.successSoft,
      icon: 'checkmark-done-outline',
      title: 'Hired — contract confirmed',
      subtitle: 'You and the employer have signed. This position is confirmed.',
    },
    Rejected: {
      color: c.danger,
      bg: c.dangerSoft,
      icon: 'close-circle-outline',
      title: 'Application Declined',
      subtitle: 'The employer has decided to move forward with other candidates.',
    },
    auto_rejected: {
      color: c.muted,
      bg: c.surface,
      icon: 'briefcase-outline',
      title: 'Application closed',
      subtitle:
        'This application was closed because the employer hired you for another of their job posts.',
    },
    Withdrawn: {
      color: c.muted,
      bg: c.surface,
      icon: 'arrow-undo-outline',
      title: 'Application Withdrawn',
      subtitle: 'You withdrew this application.',
    },
  };
}

function createApplicationDetailStyles(c: ThemeColor) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      maxWidth: 640,
      maxHeight: '92%',
      backgroundColor: c.surfaceElevated,
      borderRadius: 24,
      overflow: 'hidden',
      ...theme.shadow.card,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 22,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    jobTitle: { fontSize: 21, fontWeight: '800', color: c.ink, marginBottom: 4, letterSpacing: -0.4 },
    employerName: { fontSize: 14, fontWeight: '600', color: c.muted },
    closeBtn: { padding: 6, backgroundColor: c.surface, borderRadius: 14 },

    scroll: { flex: 1, paddingHorizontal: 22, paddingTop: 4 },

    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: 18,
      marginBottom: 6,
      gap: 14,
    },
    bannerIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    bannerTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
    bannerSub: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

    section: { marginTop: 20 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: c.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },

    infoCard: {
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.line,
      overflow: 'hidden',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
      gap: 10,
    },
    detailIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: c.helperSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailLabel: {
      fontSize: 11,
      color: c.subtle,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    detailValue: { fontSize: 14, fontWeight: '700', color: c.ink, marginTop: 1 },

    letterBox: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: c.surface,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.line,
    },
    letterText: { flex: 1, fontSize: 14, lineHeight: 22, color: c.inkMuted, fontStyle: 'italic' },

    feedbackBox: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: c.helperSoft,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.helper + '30',
    },
    feedbackText: { flex: 1, fontSize: 14, lineHeight: 22, color: c.ink, fontWeight: '500' },

    footer: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: c.line },
    withdrawBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 13,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.danger + '30',
    },
    withdrawText: { color: c.danger, fontSize: 14, fontWeight: '700' },
    closeFullBtn: {
      flex: 1,
      backgroundColor: c.helper,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
    },
    closeFullBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    messageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 13,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: c.helperSoft,
      borderWidth: 1,
      borderColor: c.helper + '40',
    },
    messageBtnText: { color: c.helper, fontSize: 14, fontWeight: '700' },
    interviewCard: {
      backgroundColor: c.parentSoft,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: c.parent + '30',
      marginTop: 14,
    },
    interviewTitle: { fontSize: 14, fontWeight: '800', color: c.parent },
    interviewDate: { fontSize: 16, fontWeight: '700', color: c.ink, marginBottom: 2 },
    interviewType: { fontSize: 13, color: c.muted },
    interviewNotes: { fontSize: 13, color: c.inkMuted, marginTop: 6, fontStyle: 'italic' },
    interviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    interviewBtnTxt: { fontSize: 13, fontWeight: '700' },
    interviewConfirmed: { fontSize: 13, color: c.helper, fontWeight: '700', marginTop: 8 },
  });
}

function DetailRow({
  icon,
  label,
  value,
  styles,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string | number | null | undefined;
  styles: ReturnType<typeof createApplicationDetailStyles>;
  accent: string;
}) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{String(value)}</Text>
      </View>
    </View>
  );
}

export default function ApplicationDetailsModal({
  visible,
  application,
  onWithdraw,
  onClose,
  onMessage,
  onInterviewResponded,
}: Props) {
  const { color: c } = useHelperTheme();
  const s = useMemo(() => createApplicationDetailStyles(c), [c]);
  const STATUS_CONFIG = useMemo(() => buildStatusConfig(c), [c]);
  const [interviewLoading, setInterviewLoading] = useState(false);

  const handleInterviewAction = async (action: 'confirm' | 'decline') => {
    if (!application) return;
    const intv = (application as any).interview;
    if (!intv?.interview_id) return;
    setInterviewLoading(true);
    try {
      await fetch(`${API_URL}/interviews/confirm.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_id: intv.interview_id,
          user_id: (application as any).helper_id,
          action,
        }),
      });
      onInterviewResponded?.();
      onClose();
    } finally {
      setInterviewLoading(false);
    }
  };

  if (!application) return null;

  const cfg = STATUS_CONFIG[application.status] ?? {
    color: c.muted,
    bg: c.surface,
    icon: 'information-circle-outline' as const,
    title: application.status,
    subtitle: '',
  };

  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(application.status);

  const salary = Number(application.salary_offered ?? 0).toLocaleString();
  const salaryLabel = application.salary_period ? `₱${salary} / ${application.salary_period}` : `₱${salary}`;
  const location =
    application.location || [application.municipality, application.province].filter(Boolean).join(', ') || null;

  const accentIcon = c.helper;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.jobTitle} numberOfLines={2}>
                {application.job_title}
              </Text>
              <Text style={s.employerName}>{application.parent_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={c.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
            <View style={[s.banner, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
              <View style={[s.bannerIcon, { backgroundColor: cfg.color + '20' }]}>
                <Ionicons name={cfg.icon} size={26} color={cfg.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: cfg.color }]}>{cfg.title}</Text>
                <Text style={[s.bannerSub, { color: cfg.color + 'CC' }]}>{cfg.subtitle}</Text>
              </View>
            </View>

            {(application as any).interview && (application as any).interview.interview_id && (
              <View style={s.interviewCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Ionicons name="calendar" size={18} color={c.parent} />
                  <Text style={s.interviewTitle}>Interview Scheduled</Text>
                </View>
                <Text style={s.interviewDate}>
                  {new Date((application as any).interview.interview_date).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Text>
                <Text style={s.interviewType}>
                  {(application as any).interview.interview_type}
                  {(application as any).interview.location_or_link
                    ? ` · ${(application as any).interview.location_or_link}`
                    : ''}
                </Text>
                {(application as any).interview.notes ? (
                  <Text style={s.interviewNotes}>{(application as any).interview.notes}</Text>
                ) : null}
                {(application as any).interview.status === 'Scheduled' &&
                  !(application as any).interview.helper_confirmed && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[s.interviewBtn, { backgroundColor: c.helperSoft }]}
                        onPress={() => handleInterviewAction('decline')}
                        disabled={interviewLoading}
                      >
                        <Ionicons name="close" size={15} color={c.danger} />
                        <Text style={[s.interviewBtnTxt, { color: c.danger }]}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.interviewBtn, { flex: 1, backgroundColor: c.helper }]}
                        onPress={() => handleInterviewAction('confirm')}
                        disabled={interviewLoading}
                      >
                        {interviewLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={15} color="#fff" />
                            <Text style={[s.interviewBtnTxt, { color: '#fff' }]}>Confirm Attendance</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                {(application as any).interview.helper_confirmed && (
                  <Text style={s.interviewConfirmed}>✓ You confirmed attendance</Text>
                )}
              </View>
            )}

            <View style={s.section}>
              <Text style={s.sectionTitle}>Job Details</Text>
              <View style={s.infoCard}>
                <DetailRow
                  styles={s}
                  accent={accentIcon}
                  icon="cash-outline"
                  label="Salary Offered"
                  value={salaryLabel}
                />
                <DetailRow styles={s} accent={accentIcon} icon="location-outline" label="Location" value={location} />
                <DetailRow
                  styles={s}
                  accent={accentIcon}
                  icon="briefcase-outline"
                  label="Employment Type"
                  value={application.employment_type}
                />
                <DetailRow styles={s} accent={accentIcon} icon="time-outline" label="Work Schedule" value={application.work_schedule} />
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Application Timeline</Text>
              <View style={s.infoCard}>
                <DetailRow styles={s} accent={accentIcon} icon="calendar-outline" label="Applied On" value={application.applied_at} />
                {application.reviewed_at ? (
                  <DetailRow styles={s} accent={accentIcon} icon="eye-outline" label="Reviewed" value={application.reviewed_at} />
                ) : null}
              </View>
            </View>

            {application.cover_letter ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Your Cover Letter</Text>
                <View style={s.letterBox}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.helper} style={{ marginTop: 2 }} />
                  <Text style={s.letterText}>{application.cover_letter}</Text>
                </View>
              </View>
            ) : null}

            {application.message_from_parent ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Message from Employer</Text>
                <View style={s.feedbackBox}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={c.helper} />
                  <Text style={s.feedbackText}>{application.message_from_parent}</Text>
                </View>
              </View>
            ) : null}

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={s.footer}>
            {canWithdraw && (
              <TouchableOpacity style={s.withdrawBtn} onPress={onWithdraw}>
                <Ionicons name="arrow-undo-outline" size={16} color={c.danger} />
                <Text style={s.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            )}
            {onMessage && (
              <TouchableOpacity style={s.messageBtn} onPress={onMessage}>
                <Ionicons name="chatbubble-outline" size={16} color={c.helper} />
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
