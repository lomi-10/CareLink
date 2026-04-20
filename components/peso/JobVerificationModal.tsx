// components/peso/JobVerificationModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';
import { useJobReferences } from '@/hooks/shared';
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { NotificationModal } from '../shared/NotificationModal';

interface JobVerificationModalProps {
  visible: boolean;
  jobId: number | null;
  onClose: () => void;
  onStatusChanged: () => void;
}

export function JobVerificationModal({ visible, jobId, onClose, onStatusChanged }: JobVerificationModalProps) {
  const [job, setJob]               = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [processing, setProcessing] = useState(false);
  const [verifierId, setVerifierId] = useState<number | null>(null);
  const { languages }               = useJobReferences();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmAction, setConfirmAction]   = useState<'Open' | 'Rejected' | null>(null);
  const [rejectReason, setRejectReason]     = useState('');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        if (raw) {
          const parsed = JSON.parse(raw);
          const id = parsed?.user_id ? Number(parsed.user_id) : null;
          setVerifierId(Number.isFinite(id) ? id : null);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (visible && jobId) {
      fetchJobDetails();
    } else {
      setJob(null);
      setRejectReason('');
    }
  }, [visible, jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/peso/get_job_details.php?job_post_id=${jobId}`);
      const data = await res.json();
      if (data.success) setJob(data.data);
    } catch (e) {
      console.error('JobVerificationModal fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  const promptApprove = () => {
    setConfirmAction('Open');
    setConfirmVisible(true);
  };

  const promptReject = () => {
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const executeApprove = async () => {
    setConfirmVisible(false);
    try {
      setProcessing(true);
      const res  = await fetch(`${API_URL}/peso/update_job_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: jobId, status: 'Open', verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ visible: true, message: 'Job post approved. It is now live for helpers.', type: 'success' });
        onStatusChanged();
        setTimeout(() => onClose(), 1800);
      } else {
        setNotification({ visible: true, message: data.message || 'Failed to approve job.', type: 'error' });
      }
    } catch {
      setNotification({ visible: true, message: 'Network connection failed.', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const executeReject = async () => {
    if (!rejectReason.trim()) {
      setNotification({ visible: true, message: 'Please provide a rejection reason.', type: 'info' });
      return;
    }
    setRejectModalVisible(false);
    try {
      setProcessing(true);
      const res  = await fetch(`${API_URL}/peso/update_job_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: jobId, status: 'Rejected', reason: rejectReason, verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ visible: true, message: 'Job post rejected. The parent has been notified.', type: 'success' });
        onStatusChanged();
        setTimeout(() => onClose(), 1800);
      } else {
        setNotification({ visible: true, message: data.message || 'Failed to reject job.', type: 'error' });
      }
    } catch {
      setNotification({ visible: true, message: 'Network connection failed.', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const lang      = languages.find(l => l.language_id.toString() === job?.preferred_language_id?.toString())?.language_name || 'Any';
  const category  = job?.custom_category || job?.category_name;
  const isTrue    = (v: any) => v === 1 || v === '1' || v === true;
  const isPending = job?.status === 'Pending';

  const parseDaysOff = (val: any): string => {
    try {
      if (!val) return 'Not specified';
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(', ') : 'Not specified';
    } catch { return 'Not specified'; }
  };

  const skillList: string[] = (() => {
    const sn = job?.skill_names;
    if (typeof sn === 'string' && sn.trim()) return sn.split(',').map((s: string) => s.trim());
    return [];
  })();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>

          {loading || !job ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={theme.color.peso} />
              <Text style={s.loadingText}>Loading details…</Text>
            </View>
          ) : (
            <>
              {/* ── Header ── */}
              <View style={s.header}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.title} numberOfLines={2}>{job.title || 'Untitled Job'}</Text>
                  <View style={s.badgeRow}>
                    {/* status badge */}
                    <View style={[s.badge,
                      job.status === 'Pending'  ? s.bgWarn    :
                      job.status === 'Open'     ? s.bgSuccess :
                      s.bgDanger
                    ]}>
                      <Ionicons
                        name={job.status === 'Open' ? 'checkmark-circle' : job.status === 'Pending' ? 'time' : 'close-circle'}
                        size={12} color="#fff"
                      />
                      <Text style={s.badgeText}>{job.status === 'Open' ? 'Approved' : job.status}</Text>
                    </View>
                    {!!category && (
                      <View style={s.categoryPill}>
                        <Text style={s.categoryText}>{category}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                  <Ionicons name="close" size={22} color={theme.color.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

                {/* Employer */}
                <Section title="Employer">
                  <DetailRow icon="person-circle-outline" label="Name"    value={job.parent_name} />
                  <DetailRow icon="location-outline"      label="Address" value={[job.barangay, job.municipality, job.province].filter(Boolean).join(', ') || '—'} />
                </Section>

                {/* Role & Schedule */}
                <Section title="Role & Schedule">
                  <DetailRow icon="briefcase-outline" label="Employment Type" value={job.employment_type || '—'} />
                  <DetailRow icon="time-outline"      label="Work Schedule"   value={job.work_schedule || '—'} />
                  {job.work_hours   && <DetailRow icon="alarm-outline"    label="Working Hours" value={job.work_hours} />}
                  {job.start_date   && <DetailRow icon="calendar-outline" label="Start Date"    value={job.start_date} />}
                  <DetailRow icon="cafe-outline" label="Days Off" value={parseDaysOff(job.days_off)} />
                </Section>

                {/* Description */}
                <Section title="Job Description">
                  <Text style={s.bodyText}>{job.description || 'No description provided.'}</Text>
                </Section>

                {/* Skills */}
                {skillList.length > 0 && (
                  <Section title="Required Skills">
                    <View style={s.tagsRow}>
                      {skillList.map((skill, i) => (
                        <View key={i} style={s.skillTag}>
                          <Text style={s.skillTagText}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                    {job.custom_skills ? (
                      <View style={[s.infoBox, { marginTop: 8 }]}>
                        <Text style={s.bodyText}>{job.custom_skills}</Text>
                      </View>
                    ) : null}
                  </Section>
                )}

                {/* Requirements */}
                <Section title="Candidate Requirements">
                  <RequirementRow icon="language-outline" label="Preferred Language" value={lang} />
                  {job.preferred_religion
                    ? <RequirementRow icon="heart-outline" label="Preferred Religion" value={job.preferred_religion} />
                    : null}
                  <RequirementRow icon="person-outline" label="Age Range"  value={job.min_age && job.max_age ? `${job.min_age}–${job.max_age} yrs` : 'Any'} />
                  <RequirementRow icon="star-outline"   label="Experience" value={job.min_experience_years ? `At least ${job.min_experience_years} yr(s)` : 'Any'} />
                  {isTrue(job.require_police_clearance) && (
                    <View style={s.specialReq}>
                      <Ionicons name="shield-checkmark" size={16} color={theme.color.success} />
                      <Text style={[s.specialReqText, { color: theme.color.success }]}>Police Clearance Required</Text>
                    </View>
                  )}
                  {isTrue(job.prefer_tesda_nc2) && (
                    <View style={[s.specialReq, { backgroundColor: theme.color.infoSoft }]}>
                      <Ionicons name="school" size={16} color={theme.color.info} />
                      <Text style={[s.specialReqText, { color: theme.color.info }]}>TESDA NC II Preferred</Text>
                    </View>
                  )}
                </Section>

                {/* Compensation & Benefits */}
                <Section title="Compensation & Benefits">
                  <View style={s.salaryBox}>
                    <Text style={s.salaryLabel}>Offered Salary</Text>
                    <Text style={s.salaryValue}>₱{Number(job.salary_offered).toLocaleString()}</Text>
                    <Text style={s.salaryPer}>per {job.salary_period}</Text>
                  </View>

                  {/* Perks */}
                  <View style={s.perksRow}>
                    {isTrue(job.provides_meals)         && <PerkChip icon="restaurant"       label="Free Meals" />}
                    {isTrue(job.provides_accommodation)  && <PerkChip icon="home"             label="Accommodation" />}
                    {isTrue(job.provides_sss)            && <PerkChip icon="checkmark-circle" label="SSS" color={theme.color.success} />}
                    {isTrue(job.provides_philhealth)     && <PerkChip icon="checkmark-circle" label="PhilHealth" color={theme.color.success} />}
                    {isTrue(job.provides_pagibig)        && <PerkChip icon="checkmark-circle" label="Pag-IBIG" color={theme.color.success} />}
                    {Number(job.vacation_days) > 0       && <PerkChip icon="airplane"         label={`${job.vacation_days} Vacation Days`} color={theme.color.info} />}
                    {Number(job.sick_days) > 0           && <PerkChip icon="medkit"           label={`${job.sick_days} Sick Leaves`} color={theme.color.danger} />}
                  </View>

                  {job.benefits ? (
                    <View style={s.infoBox}>
                      <Text style={s.infoBoxLabel}>Other Benefits</Text>
                      <Text style={s.bodyText}>{job.benefits}</Text>
                    </View>
                  ) : null}
                </Section>

                {/* Contract Terms */}
                {(job.contract_duration || job.probation_period) && (
                  <Section title="Contract Terms">
                    <View style={s.contractGrid}>
                      <View style={s.contractTile}>
                        <Text style={s.contractLabel}>Duration</Text>
                        <Text style={s.contractValue}>{job.contract_duration || 'Not specified'}</Text>
                      </View>
                      <View style={s.contractTile}>
                        <Text style={s.contractLabel}>Probation</Text>
                        <Text style={s.contractValue}>{job.probation_period || 'None'}</Text>
                      </View>
                    </View>
                  </Section>
                )}

                {/* Rejection reason (if rejected) */}
                {job.status === 'Rejected' && job.rejection_reason && (
                  <View style={s.rejectedNote}>
                    <Ionicons name="information-circle-outline" size={16} color={theme.color.danger} />
                    <Text style={s.rejectedNoteText}>Rejection reason: {job.rejection_reason}</Text>
                  </View>
                )}

                {/* Verified by */}
                {job.status === 'Open' && job.verified_by_name && (
                  <View style={s.verifiedNote}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={theme.color.success} />
                    <Text style={s.verifiedNoteText}>Verified by {job.verified_by_name}</Text>
                  </View>
                )}

                <View style={{ height: 12 }} />
              </ScrollView>

              {/* ── Footer ── */}
              <View style={s.footer}>
                {!isPending ? (
                  <TouchableOpacity style={s.closeFullBtn} onPress={onClose}>
                    <Text style={s.closeFullBtnText}>Close</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, s.rejectBtn, processing && s.disabled]}
                      onPress={promptReject}
                      disabled={processing}
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#fff" />
                      <Text style={s.btnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, s.approveBtn, processing && s.disabled]}
                      onPress={promptApprove}
                      disabled={processing}
                    >
                      {processing
                        ? <ActivityIndicator color="#fff" />
                        : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={s.btnText}>Approve</Text></>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Approve Confirmation ── */}
      <ConfirmationModal
        visible={confirmVisible}
        title="Approve Job Post?"
        message="This will make the job visible to all verified helpers."
        confirmText="Yes, Approve"
        type="success"
        onConfirm={executeApprove}
        onCancel={() => setConfirmVisible(false)}
      />

      {/* ── Reject Reason Modal ── */}
      <Modal visible={rejectModalVisible} transparent animationType="slide">
        <View style={s.rejectOverlay}>
          <View style={s.rejectSheet}>
            <Text style={s.rejectSheetTitle}>Reject Job Post</Text>
            <Text style={s.rejectSheetSub}>
              Please provide a reason so the parent knows what to revise.
            </Text>
            <TextInput
              style={s.rejectInput}
              placeholder="e.g. Incomplete job description, salary below minimum…"
              placeholderTextColor={theme.color.subtle}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={s.rejectActions}>
              <TouchableOpacity
                style={s.rejectCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={s.rejectCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.rejectConfirmBtn, !rejectReason.trim() && s.disabled]}
                onPress={executeReject}
                disabled={!rejectReason.trim()}
              >
                <Ionicons name="close-circle-outline" size={18} color="#fff" />
                <Text style={s.rejectConfirmText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Notification ── */}
      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification((p) => ({ ...p, visible: false }))}
      />
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <View style={s.detailIconWrap}>
        <Ionicons name={icon} size={16} color={theme.color.peso} />
      </View>
      <View>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function RequirementRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={s.reqRow}>
      <View style={s.reqIconWrap}>
        <Ionicons name={icon} size={15} color={theme.color.info} />
      </View>
      <View>
        <Text style={s.reqLabel}>{label}</Text>
        <Text style={s.reqValue}>{value}</Text>
      </View>
    </View>
  );
}

function PerkChip({ icon, label, color = theme.color.warning }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color?: string }) {
  return (
    <View style={[s.perkChip, { borderColor: color + '33' }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[s.perkChipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card:       { width: '100%', maxWidth: 660, maxHeight: '92%', backgroundColor: theme.color.surface, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, elevation: 12 },
  center:     { padding: 60, alignItems: 'center', gap: 12 },
  loadingText:{ color: theme.color.muted, fontSize: 14 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 22, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  title:      { fontSize: 22, fontWeight: '800', color: theme.color.ink, marginBottom: 10, letterSpacing: -0.3 },
  badgeRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bgWarn:     { backgroundColor: theme.color.warning },
  bgSuccess:  { backgroundColor: theme.color.success },
  bgDanger:   { backgroundColor: theme.color.danger },
  badgeText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  categoryPill: { backgroundColor: theme.color.infoSoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.color.info + '33' },
  categoryText: { fontSize: 12, fontWeight: '700', color: theme.color.info },
  closeBtn:   { padding: 6, backgroundColor: theme.color.surface, borderRadius: 16 },

  scroll:     { paddingHorizontal: 22, paddingTop: 6 },
  section:    { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: theme.color.ink, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  bodyText:   { fontSize: 14, lineHeight: 22, color: theme.color.muted },

  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  detailIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.color.pesoSoft, alignItems: 'center', justifyContent: 'center' },
  detailLabel:  { fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:  { fontSize: 14, fontWeight: '600', color: theme.color.ink },

  reqRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.color.canvasPeso, padding: 10, borderRadius: 10, marginBottom: 8 },
  reqIconWrap:{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.color.infoSoft, alignItems: 'center', justifyContent: 'center' },
  reqLabel:   { fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase' },
  reqValue:   { fontSize: 13, fontWeight: '600', color: theme.color.ink },
  specialReq: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.successSoft, padding: 10, borderRadius: 10, marginBottom: 8 },
  specialReqText: { fontSize: 13, fontWeight: '700' },

  salaryBox:  { backgroundColor: theme.color.peso, padding: 20, borderRadius: 16, alignItems: 'center' },
  salaryLabel:{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  salaryValue:{ color: '#fff', fontSize: 30, fontWeight: '800', marginVertical: 4 },
  salaryPer:  { color: 'rgba(255,255,255,0.75)', fontSize: 13 },

  tagsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  skillTag:   { backgroundColor: theme.color.pesoSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: theme.color.peso + '33' },
  skillTagText: { fontSize: 12, fontWeight: '600', color: theme.color.peso },
  infoBox:    { backgroundColor: theme.color.canvasPeso, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.color.line },
  infoBoxLabel: { fontSize: 11, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', marginBottom: 4 },

  perksRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  perkChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.color.canvasPeso, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  perkChipText: { fontSize: 12, fontWeight: '600' },

  contractGrid: { flexDirection: 'row', gap: 12 },
  contractTile: { flex: 1, backgroundColor: theme.color.canvasPeso, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.color.line },
  contractLabel:{ fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', marginBottom: 4 },
  contractValue:{ fontSize: 14, fontWeight: '700', color: theme.color.ink },

  rejectedNote:{ flexDirection: 'row', gap: 8, backgroundColor: theme.color.dangerSoft, padding: 12, borderRadius: 10, marginBottom: 12 },
  rejectedNoteText: { flex: 1, fontSize: 13, color: theme.color.danger, fontWeight: '600' },
  verifiedNote:{ flexDirection: 'row', gap: 8, backgroundColor: theme.color.successSoft, padding: 12, borderRadius: 10, marginBottom: 12 },
  verifiedNoteText: { flex: 1, fontSize: 13, color: theme.color.success, fontWeight: '600' },

  footer:       { padding: 18, borderTopWidth: 1, borderTopColor: theme.color.line },
  actionRow:    { flexDirection: 'row', gap: 12 },
  actionBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  rejectBtn:    { backgroundColor: theme.color.danger },
  approveBtn:   { backgroundColor: theme.color.success },
  disabled:     { opacity: 0.55 },
  btnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
  closeFullBtn: { backgroundColor: theme.color.ink, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeFullBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  rejectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    ...Platform.select({
      web: { justifyContent: 'center', padding: 20 },
      default: { justifyContent: 'flex-end' },
    }),
  },
  rejectSheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: theme.color.surface,
    padding: 24,
    paddingBottom: 36,
    ...Platform.select({
      web: { borderRadius: 24, maxHeight: '90%' as const },
      default: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    }),
  },
  rejectSheetTitle: { fontSize: 20, fontWeight: '800', color: theme.color.ink, marginBottom: 6 },
  rejectSheetSub:{ fontSize: 13, color: theme.color.muted, marginBottom: 16 },
  rejectInput:  { backgroundColor: theme.color.canvasPeso, borderRadius: 12, padding: 14, fontSize: 14, color: theme.color.ink, minHeight: 100, borderWidth: 1, borderColor: theme.color.line, marginBottom: 16 },
  rejectActions: { flexDirection: 'row', gap: 12 },
  rejectCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.color.surface, alignItems: 'center', borderWidth: 1, borderColor: theme.color.line },
  rejectCancelText: { fontSize: 15, fontWeight: '600', color: theme.color.muted },
  rejectConfirmBtn: { flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.color.danger },
  rejectConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
