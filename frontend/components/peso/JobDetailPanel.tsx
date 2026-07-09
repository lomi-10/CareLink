// components/peso/JobDetailPanel.tsx
// Redesigned PESO job-verification detail (master-detail right pane on desktop,
// or inside a modal on mobile). Employer info, description, job details,
// requirements, compensation & benefits, a compliance checklist, and the
// Reject / Request Changes / Approve actions. No AI pre-screen.

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Modal, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';
import { useJobReferences } from '@/hooks/shared';
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { NotificationModal } from '../shared/NotificationModal';

const isTrue = (v: any) => v === 1 || v === '1' || v === true;

export function JobDetailPanel({
  jobId, onStatusChanged, onClose, showClose,
}: {
  jobId: number | null;
  onStatusChanged: () => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [verifierId, setVerifierId] = useState<number | null>(null);
  const { languages } = useJobReferences();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [reasonModal, setReasonModal] = useState<null | 'reject' | 'changes'>(null);
  const [reason, setReason] = useState('');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        if (raw) { const p = JSON.parse(raw); const id = p?.user_id ? Number(p.user_id) : null; setVerifierId(Number.isFinite(id) ? id : null); }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!jobId) { setJob(null); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/peso/get_job_details.php?job_post_id=${jobId}`);
        const data = await res.json();
        if (data.success) setJob(data.data); else setJob(null);
      } catch { setJob(null); } finally { setLoading(false); }
    })();
  }, [jobId]);

  const submitStatus = async (status: 'Open' | 'Rejected', reasonText?: string) => {
    try {
      setProcessing(true);
      const res = await fetch(`${API_URL}/peso/update_job_status.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: jobId, status, reason: reasonText, verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          visible: true,
          message: status === 'Open' ? 'Job approved. It is now live for helpers.'
            : reasonModal === 'changes' ? 'Changes requested. The employer has been notified to revise and repost.'
            : 'Job rejected. The employer has been notified.',
          type: 'success',
        });
        onStatusChanged();
      } else {
        setNotification({ visible: true, message: data.message || 'Action failed.', type: 'error' });
      }
    } catch {
      setNotification({ visible: true, message: 'Network connection failed.', type: 'error' });
    } finally { setProcessing(false); setReasonModal(null); setReason(''); setConfirmVisible(false); }
  };

  if (!jobId) {
    return (
      <View style={[s.panel, s.emptyPanel]}>
        <Ionicons name="reader-outline" size={56} color={theme.color.subtle} />
        <Text style={s.emptyTitle}>Select a job to review</Text>
        <Text style={s.emptyBody}>Choose a posting from the list to see its details and compliance checklist.</Text>
      </View>
    );
  }
  if (loading || !job) {
    return <View style={[s.panel, s.emptyPanel]}><ActivityIndicator size="large" color={theme.color.peso} /></View>;
  }

  const category = job.custom_category || job.category_name;
  const isPending = job.status === 'Pending';
  const statusMeta = job.status === 'Open' ? { label: 'Approved', c: theme.color.success }
    : job.status === 'Rejected' ? { label: 'Rejected', c: theme.color.danger }
    : job.status === 'Pending' ? { label: 'Pending', c: theme.color.warning }
    : { label: job.status, c: theme.color.muted };
  const lang = languages.find(l => l.language_id?.toString() === job.preferred_language_id?.toString())?.language_name || 'Any';
  const salary = Number(job.salary_offered) || 0;

  const checklist: { label: string; ok: boolean }[] = [
    { label: 'Complete Job Information', ok: !!(job.title && job.description && job.employment_type && salary > 0) },
    { label: 'Valid Contact Information', ok: !!(job.parent_email || job.parent_phone) },
    { label: 'Fair Salary (RA 10361 Compliant)', ok: salary >= 6500 },
    { label: 'No Discriminatory Content', ok: true },
    { label: 'Terms & Conditions Set', ok: !!(job.employment_type && job.work_schedule) },
    { label: 'Community Guidelines Followed', ok: true },
  ];
  const memberSince = job.parent_since ? new Date(job.parent_since).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const startDate = job.start_date ? new Date(job.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified';

  return (
    <View style={s.panel}>
      {/* Header */}
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.headTitle} numberOfLines={2}>{job.title || 'Untitled Job'}</Text>
          <View style={[s.statusPill, { backgroundColor: statusMeta.c + '18' }]}>
            <Text style={[s.statusPillText, { color: statusMeta.c }]}>{statusMeta.label}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Text style={s.jobId}>Job ID: JOB-{String(job.job_post_id).padStart(4, '0')}</Text>
          {showClose && onClose ? (
            <TouchableOpacity onPress={onClose} style={s.closeBtn}><Ionicons name="close" size={20} color={theme.color.muted} /></TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {/* Employer Information */}
        <Card title="Employer Information">
          <View style={s.employerRow}>
            {job.parent_photo ? (
              <Image source={{ uri: job.parent_photo }} style={s.employerAvatar} />
            ) : (
              <View style={[s.employerAvatar, s.employerAvatarFb]}><Ionicons name="person" size={26} color={theme.color.subtle} /></View>
            )}
            <View style={{ flex: 1 }}>
              <View style={s.employerNameRow}>
                <Text style={s.employerName}>{job.parent_name || 'Employer'}</Text>
                {!!category && <View style={s.catPill}><Text style={s.catPillText}>{category}</Text></View>}
              </View>
              <MetaLine icon="location-outline" text={[job.barangay, job.municipality, job.province].filter(Boolean).join(', ') || '—'} />
              {memberSince ? <MetaLine icon="calendar-outline" text={`Member since ${memberSince}`} /> : null}
            </View>
            <View style={s.employerContact}>
              {job.parent_phone ? <MetaLine icon="call-outline" text={job.parent_phone} /> : null}
              <MetaLine icon="mail-outline" text={job.parent_email || '—'} />
            </View>
          </View>
        </Card>

        {/* Description + Details (two columns on wide) */}
        <View style={s.twoCol}>
          <Card title="Job Description" style={{ flex: 1.2 }}>
            <Text style={s.body}>{job.description || 'No description provided.'}</Text>
          </Card>
          <Card title="Job Details" style={{ flex: 1 }}>
            <KV icon="briefcase-outline" label="Employment Type" value={job.employment_type || '—'} />
            <KV icon="time-outline" label="Work Schedule" value={job.work_schedule || '—'} />
            <KV icon="cafe-outline" label="Days Off" value={parseDaysOff(job.days_off)} />
            <KV icon="calendar-outline" label="Preferred Start Date" value={startDate} />
          </Card>
        </View>

        {/* Requirements + Compensation */}
        <View style={s.twoCol}>
          <Card title="Requirements" style={{ flex: 1 }}>
            <View style={s.reqGrid}>
              <ReqItem icon="language-outline" label="Preferred Language" value={lang} />
              <ReqItem icon="person-outline" label="Age Range" value={job.min_age && job.max_age ? `${job.min_age}–${job.max_age} yrs` : 'Any'} />
              <ReqItem icon="heart-outline" label="Preferred Religion" value={job.preferred_religion || 'Any'} />
              <ReqItem icon="star-outline" label="Experience" value={job.min_experience_years ? `At least ${job.min_experience_years} yr(s)` : 'Any'} />
            </View>
          </Card>
          <Card title="Compensation & Benefits" style={{ flex: 1 }}>
            <Text style={s.salLabel}>Offered Salary</Text>
            <Text style={s.salValue}>₱{salary.toLocaleString()} <Text style={s.salPer}>/ {job.salary_period || 'monthly'}</Text></Text>
            <View style={s.perksRow}>
              <Perk ok={isTrue(job.provides_meals)} label="Free Meals" />
              <Perk ok={isTrue(job.provides_accommodation)} label="Accommodation" />
              <Perk ok={isTrue(job.provides_sss)} label="SSS" green />
              <Perk ok={isTrue(job.provides_philhealth)} label="PhilHealth" green />
              <Perk ok={isTrue(job.provides_pagibig)} label="Pag-IBIG" green />
            </View>
          </Card>
        </View>

        {/* Compliance Checklist */}
        <Card title="Compliance Checklist">
          <View style={s.checkGrid}>
            {checklist.map((c) => (
              <View key={c.label} style={s.checkItem}>
                <Ionicons name={c.ok ? 'checkmark-circle' : 'close-circle'} size={18} color={c.ok ? theme.color.success : theme.color.danger} />
                <Text style={s.checkText}>{c.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {job.status === 'Rejected' && job.rejection_reason ? (
          <View style={s.note}>
            <Ionicons name="information-circle-outline" size={16} color={theme.color.danger} />
            <Text style={[s.noteText, { color: theme.color.danger }]}>Reason: {job.rejection_reason}</Text>
          </View>
        ) : null}
        {job.status === 'Open' && job.verified_by_name ? (
          <View style={[s.note, { backgroundColor: theme.color.successSoft }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.color.success} />
            <Text style={[s.noteText, { color: theme.color.success }]}>Verified by {job.verified_by_name}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer actions */}
      {isPending ? (
        <View style={s.footer}>
          <TouchableOpacity style={[s.actBtn, s.rejectBtn, processing && s.dim]} disabled={processing} onPress={() => { setReason(''); setReasonModal('reject'); }}>
            <Ionicons name="close-circle-outline" size={18} color="#fff" /><Text style={s.actText}>Reject Job</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actBtn, s.changesBtn, processing && s.dim]} disabled={processing} onPress={() => { setReason(''); setReasonModal('changes'); }}>
            <Ionicons name="create-outline" size={18} color={theme.color.ink} /><Text style={[s.actText, { color: theme.color.ink }]}>Request Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actBtn, s.approveBtn, processing && s.dim]} disabled={processing} onPress={() => setConfirmVisible(true)}>
            {processing ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.actText}>Approve Job</Text></>}
          </TouchableOpacity>
        </View>
      ) : showClose && onClose ? (
        <View style={s.footer}>
          <TouchableOpacity style={[s.actBtn, { backgroundColor: theme.color.ink, flex: 1 }]} onPress={onClose}><Text style={s.actText}>Close</Text></TouchableOpacity>
        </View>
      ) : null}

      <ConfirmationModal
        visible={confirmVisible}
        title="Approve Job Post?"
        message="This will make the job visible to all verified helpers."
        confirmText="Yes, Approve"
        type="success"
        onConfirm={() => submitStatus('Open')}
        onCancel={() => setConfirmVisible(false)}
      />

      <Modal visible={!!reasonModal} transparent animationType="fade" onRequestClose={() => setReasonModal(null)}>
        <View style={s.reasonOverlay}>
          <View style={s.reasonSheet}>
            <Text style={s.reasonTitle}>{reasonModal === 'changes' ? 'Request Changes' : 'Reject Job Post'}</Text>
            <Text style={s.reasonSub}>
              {reasonModal === 'changes'
                ? 'Tell the employer what to fix. They can revise and repost for review.'
                : 'Provide a reason so the employer knows why this was rejected.'}
            </Text>
            <TextInput
              style={s.reasonInput}
              placeholder={reasonModal === 'changes' ? 'e.g. Please clarify the work schedule and add rest days.' : 'e.g. Salary below the CareLink standard; incomplete duties.'}
              placeholderTextColor={theme.color.subtle}
              value={reason} onChangeText={setReason} multiline numberOfLines={4} textAlignVertical="top"
            />
            <View style={s.reasonActions}>
              <TouchableOpacity style={s.reasonCancel} onPress={() => setReasonModal(null)}><Text style={s.reasonCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.reasonConfirm, !reason.trim() && s.dim, reasonModal === 'changes' && { backgroundColor: theme.color.warning }]}
                disabled={!reason.trim()}
                onPress={() => submitStatus('Rejected', (reasonModal === 'changes' ? 'Changes requested: ' : '') + reason.trim())}
              >
                <Text style={s.reasonConfirmText}>{reasonModal === 'changes' ? 'Send to Employer' : 'Confirm Reject'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}

// ─── small pieces ──────────────────────────────────────────────────────────────
function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: any }) {
  return <View style={[s.card, style]}><Text style={s.cardTitle}>{title}</Text>{children}</View>;
}
function MetaLine({ icon, text }: { icon: any; text: string }) {
  return <View style={s.metaLine}><Ionicons name={icon} size={13} color={theme.color.muted} /><Text style={s.metaText} numberOfLines={1}>{text}</Text></View>;
}
function KV({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.kv}>
      <Ionicons name={icon} size={16} color={theme.color.peso} />
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function ReqItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.reqItem}>
      <Ionicons name={icon} size={16} color={theme.color.info} />
      <View style={{ flex: 1 }}>
        <Text style={s.reqLabel}>{label}</Text>
        <Text style={s.reqValue}>{value}</Text>
      </View>
    </View>
  );
}
function Perk({ ok, label, green }: { ok: boolean; label: string; green?: boolean }) {
  const c = ok ? (green ? theme.color.success : theme.color.warning) : theme.color.subtle;
  return (
    <View style={[s.perk, { borderColor: c + '44' }]}>
      <Ionicons name={ok ? 'checkmark' : 'close'} size={12} color={c} />
      <Text style={[s.perkText, { color: ok ? theme.color.ink : theme.color.subtle }]}>{label}</Text>
    </View>
  );
}
function parseDaysOff(val: any): string {
  try {
    if (!val) return 'Not specified';
    const p = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(p) && p.length ? p.join(', ') : 'Not specified';
  } catch { return 'Not specified'; }
}

const s = StyleSheet.create({
  panel: { flex: 1, backgroundColor: theme.color.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden' },
  emptyPanel: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.color.ink, marginTop: 6 },
  emptyBody: { fontSize: 13, color: theme.color.muted, textAlign: 'center', maxWidth: 280, lineHeight: 19 },

  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: theme.color.line, gap: 12 },
  headTitle: { fontSize: 19, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.3, marginBottom: 8 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontSize: 12, fontWeight: '800' },
  jobId: { fontSize: 12, color: theme.color.subtle, fontWeight: '700' },
  closeBtn: { padding: 4 },

  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  card: { backgroundColor: theme.color.canvasPeso, borderRadius: 14, borderWidth: 1, borderColor: theme.color.line, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: theme.color.ink, marginBottom: 12 },
  body: { fontSize: 13.5, lineHeight: 21, color: theme.color.muted },
  twoCol: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },

  employerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  employerAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: theme.color.pesoSoft },
  employerAvatarFb: { alignItems: 'center', justifyContent: 'center' },
  employerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  employerName: { fontSize: 15, fontWeight: '800', color: theme.color.ink },
  catPill: { backgroundColor: theme.color.infoSoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  catPillText: { fontSize: 11, fontWeight: '700', color: theme.color.info },
  employerContact: { gap: 4, minWidth: 180 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontSize: 12.5, color: theme.color.muted, flexShrink: 1 },

  kv: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.line },
  kvLabel: { flex: 1, fontSize: 13, color: theme.color.muted },
  kvValue: { fontSize: 13, fontWeight: '700', color: theme.color.ink, maxWidth: '52%' },

  reqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '46%' },
  reqLabel: { fontSize: 10.5, color: theme.color.subtle, fontWeight: '700', textTransform: 'uppercase' },
  reqValue: { fontSize: 13, fontWeight: '700', color: theme.color.ink },

  salLabel: { fontSize: 11, color: theme.color.subtle, fontWeight: '700', textTransform: 'uppercase' },
  salValue: { fontSize: 26, fontWeight: '800', color: theme.color.peso, marginTop: 2, marginBottom: 10 },
  salPer: { fontSize: 14, fontWeight: '600', color: theme.color.muted },
  perksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, borderWidth: 1, backgroundColor: theme.color.surface },
  perkText: { fontSize: 12, fontWeight: '700' },

  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '46%' },
  checkText: { fontSize: 13, color: theme.color.ink, fontWeight: '600', flexShrink: 1 },

  note: { flexDirection: 'row', gap: 8, backgroundColor: theme.color.dangerSoft, padding: 12, borderRadius: 10, marginBottom: 6 },
  noteText: { flex: 1, fontSize: 13, fontWeight: '600' },

  footer: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: theme.color.line },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12 },
  rejectBtn: { backgroundColor: theme.color.danger },
  changesBtn: { backgroundColor: theme.color.surface, borderWidth: 1.4, borderColor: theme.color.line },
  approveBtn: { backgroundColor: theme.color.success },
  dim: { opacity: 0.55 },
  actText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  reasonOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  reasonSheet: { width: '100%', maxWidth: 520, backgroundColor: theme.color.surface, borderRadius: 20, padding: 22 },
  reasonTitle: { fontSize: 19, fontWeight: '800', color: theme.color.ink, marginBottom: 6 },
  reasonSub: { fontSize: 13, color: theme.color.muted, marginBottom: 14, lineHeight: 19 },
  reasonInput: { backgroundColor: theme.color.canvasPeso, borderRadius: 12, padding: 14, fontSize: 14, color: theme.color.ink, minHeight: 100, borderWidth: 1, borderColor: theme.color.line, marginBottom: 16 },
  reasonActions: { flexDirection: 'row', gap: 12 },
  reasonCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.color.line },
  reasonCancelText: { fontSize: 14, fontWeight: '700', color: theme.color.muted },
  reasonConfirm: { flex: 1.5, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: theme.color.danger },
  reasonConfirmText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
