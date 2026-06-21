// components/helper/applications/ApplicationDetailsModal.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import type { Application } from '@/hooks/helper';

interface HelperDocument {
  document_id: number;
  document_type: string;
  status: string;
}


// ── Palette ────────────────────────────────────────────────────────────────────
const DARK    = '#2A1608';
const MUTED   = '#7A5C3E';
const ORANGE  = '#E86019';
const GREEN   = '#059669';
const DIVIDER = '#EDE0D0';
const ICON_BG = '#F5E6CC';
const PAGE_BG = '#FBF5EC';

// ── Progress stepper ─────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Applied',     icon: 'paper-plane-outline' as const },
  { label: 'Reviewed',    icon: 'eye-outline' as const },
  { label: 'Shortlisted', icon: 'star-outline' as const },
  { label: 'Interview',   icon: 'calendar-outline' as const },
  { label: 'Hired',       icon: 'checkmark-circle' as const },
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

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  color: string; bg: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; subtitle: string;
}> = {
  Pending:               { color: '#D97706', bg: '#FEF3C7', icon: 'time-outline',              label: 'Pending Review',              subtitle: 'Your application is waiting to be reviewed by the employer.' },
  Reviewed:              { color: '#2563EB', bg: '#EFF6FF', icon: 'eye-outline',               label: 'Under Review',                subtitle: 'The employer has looked at your application.' },
  Shortlisted:           { color: '#7C3AED', bg: '#EDE9FE', icon: 'star-outline',              label: 'You Are Shortlisted!',         subtitle: 'Great news — you are among the top candidates. Expect to be contacted soon.' },
  'Interview Scheduled': { color: ORANGE,    bg: ICON_BG,   icon: 'calendar-outline',          label: 'Interview Scheduled',          subtitle: 'Check your messages for interview details.' },
  Accepted:              { color: GREEN,     bg: '#ECFDF5', icon: 'checkmark-circle',          label: "Congratulations! You're Hired!", subtitle: 'The employer has accepted your application for this position.' },
  contract_pending:      { color: '#D97706', bg: '#FEF3C7', icon: 'document-text-outline',     label: 'Contract Pending',             subtitle: 'Review the employment contract in Messages and confirm when you agree.' },
  hired:                 { color: GREEN,     bg: '#ECFDF5', icon: 'checkmark-done-outline',    label: 'Hired — Contract Confirmed',   subtitle: 'You and the employer have signed. This position is confirmed.' },
  Rejected:              { color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle-outline',      label: 'Application Declined',         subtitle: 'The employer has decided to move forward with other candidates.' },
  auto_rejected:         { color: MUTED,     bg: PAGE_BG,   icon: 'briefcase-outline',         label: 'Application Closed',           subtitle: 'This application was closed because the employer hired you for another of their job posts.' },
  Withdrawn:             { color: MUTED,     bg: PAGE_BG,   icon: 'arrow-undo-outline',        label: 'Application Withdrawn',        subtitle: 'You withdrew this application.' },
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  application: Application | null;
  onWithdraw: () => void;
  onClose: () => void;
  onMessage?: () => void;
  onInterviewResponded?: () => void;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <View style={d.infoRow}>
      <View style={d.infoIconWrap}>
        <Ionicons name={icon} size={14} color={ORANGE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={d.infoLabel}>{label}</Text>
        <Text style={d.infoValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ApplicationDetailsModal({
  visible, application, onWithdraw, onClose, onMessage, onInterviewResponded,
}: Props) {
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [coverOpen,        setCoverOpen]        = useState(false);

  // ── Edit mode state ──
  const [editMode,       setEditMode]       = useState(false);
  const [editCover,      setEditCover]      = useState('');
  const [docs,           setDocs]           = useState<HelperDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [docsLoading,    setDocsLoading]    = useState(false);
  const [saveLoading,    setSaveLoading]    = useState(false);
  const [saveError,      setSaveError]      = useState<string | null>(null);

  // Reset edit state when modal closes or application changes
  useEffect(() => {
    if (!visible) { setEditMode(false); setSaveError(null); }
  }, [visible]);

  useEffect(() => {
    setEditMode(false);
    setSaveError(null);
  }, [application?.application_id]);

  const openEdit = useCallback(() => {
    if (!application) return;
    setEditCover(application.cover_letter ?? '');
    setSaveError(null);
    setEditMode(true);
    // Fetch verified docs for this helper
    setDocsLoading(true);
    fetch(`${API_URL}/helper/get_documents.php?user_id=${application.helper_id}`)
      .then(r => r.json())
      .then(data => {
        const raw = data.data?.documents ?? data.documents ?? [];
        const verifiedDocs: HelperDocument[] = (raw as HelperDocument[]).filter(
          (d) => d.status === 'Verified'
        );
        setDocs(verifiedDocs);
        // Pre-select docs that were already shared, filtered to only those still Verified
        const verifiedIds = new Set(verifiedDocs.map(d => d.document_id));
        const preSelected = (application.shared_document_ids ?? []).filter(id => verifiedIds.has(id));
        setSelectedDocIds(preSelected);
      })
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }, [application]);

  const toggleDoc = (id: number) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSaveEdit = async () => {
    if (!application) return;
    const trimmed = editCover.trim();
    if (trimmed.length < 50) { setSaveError('Cover letter must be at least 50 characters.'); return; }
    if (trimmed.length > 1000) { setSaveError('Cover letter must not exceed 1000 characters.'); return; }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_URL}/helper/update_application.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: Number(application.application_id),
          helper_id: Number(application.helper_id),
          cover_letter: trimmed,
          shared_document_ids: selectedDocIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditMode(false);
        (application as any).cover_letter = trimmed;
        (application as any).shared_document_ids = selectedDocIds;
      } else {
        setSaveError(data.message ?? 'Failed to update application.');
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

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
    color: MUTED, bg: PAGE_BG, icon: 'information-circle-outline' as const,
    label: application.status, subtitle: '',
  };
  const stepIdx     = getStepIndex(application.status);
  const isTerminal  = ['Rejected', 'auto_rejected', 'Withdrawn'].includes(application.status);
  const canWithdraw = ['Pending', 'Reviewed', 'Shortlisted'].includes(application.status);

  const salary = Number(application.salary_offered ?? 0);
  const salaryLabel = salary > 0
    ? `₱${salary.toLocaleString()}${application.salary_period ? ` / ${application.salary_period}` : ''}`
    : null;
  const location = application.location
    || [application.municipality, application.province].filter(Boolean).join(', ')
    || null;

  const interview = (application as any).interview;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={d.overlay}>
        <View style={d.sheet}>

          <View style={d.handle} />

          {/* ── Header ── */}
          <View style={d.header}>
            <View style={{ flex: 1, paddingRight: 40 }}>
              <Text style={d.jobTitle} numberOfLines={2}>{application.job_title}</Text>
              <View style={d.employerRow}>
                <Text style={d.employerName} numberOfLines={1}>{application.parent_name}</Text>
                {application.parent_verified && (
                  <View style={d.pesoBadge}>
                    <Ionicons name="shield-checkmark" size={10} color={GREEN} />
                    <Text style={d.pesoBadgeText}>PESO Verified</Text>
                  </View>
                )}
              </View>
              <View style={[d.statusBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                <Text style={[d.statusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={d.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView style={d.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Application Progress ── */}
            {!isTerminal && (
              <View style={d.progressSection}>
                <Text style={d.sectionTitle}>Application Progress</Text>
                <View style={d.stepper}>
                  {STEPS.map((step, idx) => {
                    const done    = idx < stepIdx;
                    const current = idx === stepIdx;
                    return (
                      <React.Fragment key={step.label}>
                        {idx > 0 && <View style={[d.stepLine, done && d.stepLineDone]} />}
                        <View style={d.stepItem}>
                          <View style={[d.stepCircle, done && d.stepCircleDone, current && d.stepCircleCurrent]}>
                            <Ionicons
                              name={done ? 'checkmark' : step.icon}
                              size={13}
                              color={done || current ? '#fff' : MUTED}
                            />
                          </View>
                          <Text
                            style={[d.stepLabel, done && d.stepLabelDone, current && d.stepLabelCurrent]}
                            numberOfLines={1}
                          >
                            {step.label}
                          </Text>
                        </View>
                      </React.Fragment>
                    );
                  })}
                </View>
                <View style={[d.statusBanner, { backgroundColor: cfg.bg, borderColor: cfg.color + '30' }]}>
                  <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                  <Text style={[d.statusBannerText, { color: cfg.color }]}>{cfg.subtitle}</Text>
                </View>
              </View>
            )}

            {/* ── Terminal status banner ── */}
            {isTerminal && (
              <View style={[d.terminalBanner, { backgroundColor: cfg.bg, borderColor: cfg.color + '30' }]}>
                <Ionicons name={cfg.icon} size={24} color={cfg.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[d.terminalTitle, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={[d.terminalSub, { color: cfg.color + 'CC' }]}>{cfg.subtitle}</Text>
                </View>
              </View>
            )}

            {/* ── Interview card ── */}
            {interview?.interview_id && (
              <View style={d.interviewCard}>
                <View style={d.interviewHeader}>
                  <Ionicons name="calendar" size={18} color={ORANGE} />
                  <Text style={d.interviewTitle}>Interview Scheduled</Text>
                </View>
                <Text style={d.interviewDate}>
                  {new Date(interview.interview_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
                <Text style={d.interviewType}>
                  {interview.interview_type}
                  {interview.location_or_link ? ` · ${interview.location_or_link}` : ''}
                </Text>
                {interview.notes ? <Text style={d.interviewNotes}>{interview.notes}</Text> : null}

                {interview.status === 'Scheduled' && !interview.helper_confirmed && (
                  <View style={d.interviewActions}>
                    <TouchableOpacity
                      style={d.interviewDecline}
                      onPress={() => handleInterviewAction('decline')}
                      disabled={interviewLoading}
                    >
                      <Ionicons name="close" size={14} color="#DC2626" />
                      <Text style={d.interviewDeclineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={d.interviewConfirmBtn}
                      onPress={() => handleInterviewAction('confirm')}
                      disabled={interviewLoading}
                    >
                      {interviewLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={d.interviewConfirmText}>Confirm Attendance</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {interview.helper_confirmed && (
                  <Text style={d.interviewConfirmedText}>✓ You confirmed attendance</Text>
                )}
              </View>
            )}

            {/* ── Job Details + Timeline (two columns) ── */}
            <View style={d.twoCol}>
              <View style={d.infoCard}>
                <Text style={d.cardTitle}>Job Details</Text>
                <InfoRow icon="cash-outline"       label="Salary"     value={salaryLabel} />
                <InfoRow icon="location-outline"   label="Location"   value={location} />
                <InfoRow icon="briefcase-outline"  label="Employment" value={application.employment_type} />
                <InfoRow icon="time-outline"       label="Schedule"   value={application.work_schedule} />
              </View>
              <View style={d.infoCard}>
                <Text style={d.cardTitle}>Timeline</Text>
                <InfoRow icon="calendar-outline" label="Applied On" value={application.applied_at} />
                <InfoRow icon="eye-outline"      label="Reviewed"   value={application.reviewed_at} />
              </View>
            </View>

            {/* ── Cover Letter (collapsible) ── */}
            {!!application.cover_letter && (
              <View style={d.section}>
                <TouchableOpacity style={d.collapsibleHeader} onPress={() => setCoverOpen(p => !p)} activeOpacity={0.8}>
                  <View style={d.collapsibleLeft}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={ORANGE} />
                    <Text style={d.collapsibleTitle}>Your Cover Letter</Text>
                  </View>
                  <Ionicons name={coverOpen ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
                </TouchableOpacity>
                {coverOpen && (
                  <View style={d.coverBox}>
                    <Text style={d.coverText}>{application.cover_letter}</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Message from employer ── */}
            {!!application.message_from_parent && (
              <View style={d.section}>
                <Text style={d.sectionLabel}>Message from Employer</Text>
                <View style={d.messageBox}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={ORANGE} style={{ marginTop: 2 }} />
                  <Text style={d.messageText}>{application.message_from_parent}</Text>
                </View>
              </View>
            )}

            {/* ── Edit Application Form ── */}
            {editMode && (
              <View style={d.editSection}>
                <Text style={d.editSectionTitle}>Edit Your Application</Text>

                <Text style={d.editFieldLabel}>Cover Letter</Text>
                <TextInput
                  style={d.editInput}
                  value={editCover}
                  onChangeText={setEditCover}
                  multiline
                  numberOfLines={6}
                  placeholder="Write your cover letter here (min 50 characters)..."
                  placeholderTextColor={MUTED + '88'}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={d.editCharCount}>{editCover.trim().length}/1000</Text>

                <Text style={[d.editFieldLabel, { marginTop: 16 }]}>Attach Verified Documents (optional)</Text>
                {docsLoading ? (
                  <ActivityIndicator size="small" color={ORANGE} style={{ marginTop: 8 }} />
                ) : docs.length === 0 ? (
                  <Text style={d.editNoDocsText}>No verified documents available to attach.</Text>
                ) : (
                  <View style={d.editDocList}>
                    {docs.map(doc => {
                      const checked = selectedDocIds.includes(doc.document_id);
                      return (
                        <TouchableOpacity
                          key={doc.document_id}
                          style={d.editDocRow}
                          onPress={() => toggleDoc(doc.document_id)}
                          activeOpacity={0.8}
                        >
                          <View style={[d.editCheckbox, checked && d.editCheckboxChecked]}>
                            {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                          <Text style={d.editDocName}>{doc.document_type}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {saveError ? (
                  <View style={d.editErrorBox}>
                    <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                    <Text style={d.editErrorText}>{saveError}</Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* ── Footer ── */}
          <View style={d.footer}>
            {editMode ? (
              <>
                <TouchableOpacity style={d.cancelEditBtn} onPress={() => { setEditMode(false); setSaveError(null); }} disabled={saveLoading}>
                  <Text style={d.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={d.saveEditBtn} onPress={handleSaveEdit} disabled={saveLoading}>
                  {saveLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={15} color="#fff" />
                      <Text style={d.saveEditText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {application.status === 'Pending' && (
                  <TouchableOpacity style={d.editAppBtn} onPress={openEdit}>
                    <Ionicons name="create-outline" size={15} color={ORANGE} />
                    <Text style={d.editAppBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}
                {canWithdraw && (
                  <TouchableOpacity style={d.withdrawBtn} onPress={onWithdraw}>
                    <Ionicons name="arrow-undo-outline" size={15} color="#DC2626" />
                    <Text style={d.withdrawText}>Withdraw</Text>
                  </TouchableOpacity>
                )}
                {onMessage && (
                  <TouchableOpacity style={d.messageBtn} onPress={onMessage}>
                    <Ionicons name="chatbubble-outline" size={15} color={ORANGE} />
                    <Text style={d.messageBtnText}>Message</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={d.closeFullBtn} onPress={onClose}>
                  <Text style={d.closeFullBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const d = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: PAGE_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '93%',
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 24 },
    }),
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: DIVIDER, marginTop: 12, marginBottom: 4 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  jobTitle:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginBottom: 5 },
  employerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  employerName:{ fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, flexShrink: 1 },
  pesoBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  pesoBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: GREEN },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
  },

  scroll: { flex: 1 },

  // ── Progress section ──
  progressSection: { margin: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: DIVIDER },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  stepper:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepItem:  { alignItems: 'center', width: 48 },
  stepLine:  { flex: 1, height: 2, backgroundColor: DIVIDER, marginTop: 15 },
  stepLineDone: { backgroundColor: DARK },
  stepCircle: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: DIVIDER, marginBottom: 5,
  },
  stepCircleDone:    { backgroundColor: DARK,   borderColor: DARK },
  stepCircleCurrent: { backgroundColor: ORANGE, borderColor: ORANGE },
  stepLabel:        { fontFamily: FontFamily.fredokaRegular, fontSize: 9, color: MUTED, textAlign: 'center' },
  stepLabelDone:    { color: DARK },
  stepLabelCurrent: { fontFamily: FontFamily.fredokaSemiBold, color: ORANGE },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  statusBannerText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, flex: 1, lineHeight: 18 },

  // ── Terminal banner ──
  terminalBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  terminalTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, marginBottom: 3 },
  terminalSub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 18 },

  // ── Interview card ──
  interviewCard: { marginHorizontal: 16, marginBottom: 4, backgroundColor: ICON_BG, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: ORANGE + '44' },
  interviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  interviewTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: ORANGE },
  interviewDate:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 2 },
  interviewType:  { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },
  interviewNotes: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, marginTop: 6, fontStyle: 'italic' },
  interviewActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  interviewDecline: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#FEF2F2' },
  interviewDeclineText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#DC2626' },
  interviewConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: ORANGE },
  interviewConfirmText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },
  interviewConfirmedText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: GREEN, marginTop: 10 },

  // ── Two-column info ──
  twoCol: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12 },
  infoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: DIVIDER },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  infoIconWrap: { width: 26, height: 26, borderRadius: 8, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginTop: 1 },

  // ── Cover letter ──
  section: { marginHorizontal: 16, marginTop: 12 },
  sectionLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER },
  collapsibleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapsibleTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  coverBox: { backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: DIVIDER, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: -1 },
  coverText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, lineHeight: 20, fontStyle: 'italic' },

  // ── Message from employer ──
  messageBox: { flexDirection: 'row', gap: 10, backgroundColor: ICON_BG, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: ORANGE + '30' },
  messageText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK, lineHeight: 20 },

  // ── Footer ──
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: DIVIDER, backgroundColor: '#fff' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  withdrawText: { fontFamily: FontFamily.fredokaSemiBold, color: '#DC2626', fontSize: 13 },
  messageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: ICON_BG, borderWidth: 1, borderColor: ORANGE + '40' },
  messageBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: ORANGE, fontSize: 13 },
  closeFullBtn: { flex: 1, backgroundColor: DARK, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  closeFullBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 14 },
  editAppBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: ICON_BG, borderWidth: 1, borderColor: ORANGE + '40' },
  editAppBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: ORANGE, fontSize: 13 },
  cancelEditBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: PAGE_BG, borderWidth: 1, borderColor: DIVIDER },
  cancelEditText: { fontFamily: FontFamily.fredokaSemiBold, color: MUTED, fontSize: 13 },
  saveEditBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: ORANGE, paddingVertical: 12, borderRadius: 12 },
  saveEditText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 14 },

  // ── Edit form ──
  editSection: { margin: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: DIVIDER },
  editSectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 16 },
  editFieldLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  editInput: {
    borderWidth: 1, borderColor: DIVIDER, borderRadius: 12, padding: 12,
    fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK,
    backgroundColor: PAGE_BG, minHeight: 120, lineHeight: 20,
  },
  editCharCount: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 4 },
  editNoDocsText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, fontStyle: 'italic', marginTop: 4 },
  editDocList: { gap: 2 },
  editDocRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: PAGE_BG, borderWidth: 1, borderColor: DIVIDER },
  editCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: DIVIDER, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  editCheckboxChecked: { backgroundColor: ORANGE, borderColor: ORANGE },
  editDocName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  editErrorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  editErrorText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#DC2626', flex: 1 },
});
