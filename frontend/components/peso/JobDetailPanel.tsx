// components/peso/JobDetailPanel.tsx
// PESO job-verification detail — right pane on desktop, modal on mobile.
//
// REDESIGN (Aug 2026, from the PESO interview):
//
// 1. PRIORITY FIRST. The compliance checklist — the actual decision material —
//    used to sit at the very bottom, below a description that can run 900px.
//    An officer had to scroll past everything to reach the one thing they were
//    there to judge. The Priority Review band now leads: a verdict line and
//    four tiles (salary legality, employer standing, completeness, statutory
//    benefits). Everything below it is supporting context.
//
// 2. NO MORE DEAD COLUMN. Description and Job Details were siblings in a row,
//    so the row took the height of the tallest child and the short fact-list
//    card stretched with 600px of empty space beside the text. Fixed two ways:
//    the row no longer stretches its children (alignItems: flex-start), and the
//    right column stacks three short cards against the one tall one. The
//    description is also clamped with a Show more, so it cannot run away again.
//
// 3. DOCUMENTS TAB. An employer's ID can be altered after approval. Judging a
//    posting without being able to see the household's credentials meant
//    leaving this screen mid-decision.
//
// 4. FLAGGING. An officer who spots forged details can raise a flag, and
//    optionally withdraw the account's verification (peso/flag_credential.php).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput,
  Modal, Pressable, Image, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { usePesoTheme, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';
import { useJobReferences } from '@/hooks/shared';
import { CredentialBadge, credentialStateFor } from '../shared/CredentialBadge';
import { CredentialReviewSection } from './CredentialReviewSection';
import { DocumentViewerModal } from './DocumentViewerModal';
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { NotificationModal } from '../shared/NotificationModal';

const isTrue = (v: any) => v === 1 || v === '1' || v === true;

/** RA 10361 (Batas Kasambahay) reference points used by the compliance tiles.
 *  SALARY_FLOOR is CareLink's own posting standard, set above the regional
 *  statutory minimum; SSS_THRESHOLD is from Sec. 30, where the employer
 *  shoulders the full premium below this monthly wage. */
const SALARY_FLOOR = 6500;
const SSS_THRESHOLD = 5000;

type TabKey = 'review' | 'documents';

export function JobDetailPanel({
  jobId, onStatusChanged, onClose, showClose,
}: {
  jobId: number | null;
  onStatusChanged: () => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [verifierId, setVerifierId] = useState<number | null>(null);
  const { languages } = useJobReferences();

  const [tab, setTab] = useState<TabKey>('review');
  const [descOpen, setDescOpen] = useState(false);
  // The panel is a right pane on desktop and a full-screen modal on mobile, so
  // it can't read the window — it has to measure itself.
  const [paneWidth, setPaneWidth] = useState(0);
  const narrow = paneWidth > 0 && paneWidth < 720;

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [reasonModal, setReasonModal] = useState<null | 'reject' | 'changes'>(null);
  const [reason, setReason] = useState('');
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [viewBack, setViewBack] = useState(false);
  const [flagDoc, setFlagDoc] = useState<any>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagRevoke, setFlagRevoke] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        if (raw) { const p = JSON.parse(raw); const id = p?.user_id ? Number(p.user_id) : null; setVerifierId(Number.isFinite(id) ? id : null); }
      } catch {}
    })();
  }, []);

  /** Reloads THIS panel's job. Extracted so an approve/reject can refresh the
   *  record it just changed — see submitStatus(). */
  const loadJob = useCallback(async (opts?: { silent?: boolean }) => {
    if (!jobId) { setJob(null); return; }
    try {
      if (!opts?.silent) setLoading(true);
      const raw = await AsyncStorage.getItem('user_data');
      const staffId = raw ? JSON.parse(raw)?.user_id : '';
      const res = await fetch(`${API_URL}/peso/get_job_details.php?job_post_id=${jobId}&staff_user_id=${encodeURIComponent(String(staffId ?? ''))}`);
      const data = await res.json();
      if (data.success) setJob(data.data); else setJob(null);
    } catch { setJob(null); } finally { if (!opts?.silent) setLoading(false); }
  }, [jobId]);

  useEffect(() => { void loadJob(); }, [loadJob]);
  // A new posting starts on Review with the description collapsed — otherwise
  // the panel keeps whatever the previous job was left on.
  useEffect(() => { setTab('review'); setDescOpen(false); }, [jobId]);

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
        // Reload THIS panel too, not just the list behind it.
        //
        // Without this the panel kept rendering the stale 'Pending' job, so the
        // Approve button stayed live and the same post could be approved over
        // and over — it only corrected when the officer clicked a different
        // card, which remounted the panel. Awaited BEFORE `processing` is
        // released so there is no window where the button is pressable again
        // but still showing the old status.
        await loadJob({ silent: true });
      } else {
        setNotification({ visible: true, message: data.message || 'Action failed.', type: 'error' });
      }
    } catch {
      setNotification({ visible: true, message: 'Network connection failed.', type: 'error' });
    } finally { setProcessing(false); setReasonModal(null); setReason(''); setConfirmVisible(false); }
  };

  const submitFlag = async () => {
    if (!flagReason.trim()) return;
    try {
      setProcessing(true);
      const res = await fetch(`${API_URL}/peso/flag_credential.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: flagDoc?.document_id,
          user_id: job?.parent_id,
          reason: flagReason.trim(),
          revoke_verification: flagRevoke,
          flagged_by: verifierId,
        }),
      });
      const data = await res.json();
      setNotification({ visible: true, message: data.message || (data.success ? 'Flag recorded.' : 'Could not record the flag.'), type: data.success ? 'success' : 'error' });
      if (data.success) { await loadJob({ silent: true }); onStatusChanged(); }
    } catch {
      setNotification({ visible: true, message: 'Network connection failed.', type: 'error' });
    } finally { setProcessing(false); setFlagDoc(null); setFlagReason(''); setFlagRevoke(false); }
  };

  if (!jobId) {
    return (
      <View style={[s.panel, s.emptyPanel]}>
        <View style={s.emptyIcon}><Ionicons name="reader-outline" size={30} color={c.accent} /></View>
        <Text style={s.emptyTitle}>Select a job to review</Text>
        <Text style={s.emptyBody}>Choose a posting from the list to see its priority checks, employer credentials and compliance detail.</Text>
      </View>
    );
  }
  if (loading || !job) {
    return <View style={[s.panel, s.emptyPanel]}><ActivityIndicator size="large" color={c.accent} /></View>;
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const category = job.custom_category || job.category_name;
  const isPending = job.status === 'Pending';
  const statusMeta = job.status === 'Open' ? { label: 'Approved', c: c.ok, icon: 'checkmark-circle' as const }
    : job.status === 'Rejected' ? { label: 'Rejected', c: c.bad, icon: 'close-circle' as const }
    : job.status === 'Pending' ? { label: 'Pending review', c: c.warn, icon: 'time' as const }
    : { label: job.status, c: c.muted, icon: 'ellipse-outline' as const };
  const lang = languages.find(l => l.language_id?.toString() === job.preferred_language_id?.toString())?.language_name || 'Any';
  const salary = Number(job.salary_offered) || 0;

  const docs: any[] = Array.isArray(job.employer_documents) ? job.employer_documents : [];
  const flags: any[] = Array.isArray(job.employer_flags) ? job.employer_flags : [];
  const sealedDocs = docs.filter((d) => credentialStateFor(d) === 'sealed');
  const empVerified = job.employer_verification === 'Verified';

  const benefits = [
    { on: isTrue(job.provides_sss), label: 'SSS' },
    { on: isTrue(job.provides_philhealth), label: 'PhilHealth' },
    { on: isTrue(job.provides_pagibig), label: 'Pag-IBIG' },
  ];
  const benefitCount = benefits.filter((b) => b.on).length;

  const checklist: { label: string; ok: boolean; detail: string }[] = [
    { label: 'Complete job information', ok: !!(job.title && job.description && job.employment_type && salary > 0), detail: 'Title, description, employment type and salary are all present.' },
    { label: 'Valid contact information', ok: !!(job.parent_email || job.parent_phone), detail: 'The employer can be reached to follow up.' },
    { label: `Salary meets the ₱${SALARY_FLOOR.toLocaleString()} floor`, ok: salary >= SALARY_FLOOR, detail: 'CareLink posting standard, set above the regional minimum under RA 10361.' },
    { label: 'No discriminatory content', ok: true, detail: 'Requires an officer read — flag with Request Changes if the wording excludes on protected grounds.' },
    { label: 'Terms and conditions set', ok: !!(job.employment_type && job.work_schedule), detail: 'Work schedule and employment type are stated.' },
    { label: 'Employer account verified', ok: empVerified, detail: empVerified ? 'PESO has verified this household.' : 'This household is not PESO Verified. Check the Documents tab.' },
  ];
  const failing = checklist.filter((i) => !i.ok);

  const memberSince = job.parent_since ? new Date(job.parent_since).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const startDate = job.start_date ? new Date(job.start_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified';

  const verdict = flags.length > 0
    ? { tone: c.bad, icon: 'alert-circle' as const, title: `${flags.length} open credential flag${flags.length !== 1 ? 's' : ''} on this employer`, body: 'Resolve the flag before letting this posting go live.' }
    : !isPending
      ? { tone: statusMeta.c, icon: statusMeta.icon, title: `This posting is ${statusMeta.label.toLowerCase()}`, body: job.verified_by_name ? `Decided by ${job.verified_by_name}.` : 'No further action needed.' }
      : failing.length === 0
        ? { tone: c.ok, icon: 'shield-checkmark' as const, title: 'All compliance checks passed', body: 'Nothing is blocking approval. Read the description before deciding.' }
        : { tone: c.warn, icon: 'alert-circle' as const, title: `${failing.length} item${failing.length !== 1 ? 's' : ''} need${failing.length === 1 ? 's' : ''} attention`, body: failing.map((f) => f.label).join(' · ') };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.panel} onLayout={(e) => setPaneWidth(e.nativeEvent.layout.width)}>
      {/* Header */}
      <View style={s.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.headTitle} numberOfLines={2}>{job.title || 'Untitled Job'}</Text>
          <View style={s.headMetaRow}>
            <View style={[s.statusPill, { backgroundColor: statusMeta.c + '1A' }]}>
              <Ionicons name={statusMeta.icon} size={12} color={statusMeta.c} />
              <Text style={[s.statusPillText, { color: statusMeta.c }]}>{statusMeta.label}</Text>
            </View>
            {!!category && <Text style={s.headCat}>{category}</Text>}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Text style={s.jobId}>JOB-{String(job.job_post_id).padStart(4, '0')}</Text>
          {showClose && onClose ? (
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={8}><Ionicons name="close" size={20} color={c.muted} /></TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {([['review', 'Review'], ['documents', `Documents${docs.length ? ` (${docs.length})` : ''}`]] as [TabKey, string][]).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.tabActive]}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
            {key === 'documents' && flags.length > 0 && <View style={s.tabDot} />}
          </Pressable>
        ))}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {tab === 'review' ? (
          <>
            {/* ── PRIORITY REVIEW ─────────────────────────────────────────── */}
            <MotiView
              from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 320 }}
              style={[s.priority, { borderColor: verdict.tone + '55' }]}
            >
              <LinearGradient
                colors={dark ? [verdict.tone + '22', 'transparent'] : [verdict.tone + '14', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.priorityRail} pointerEvents="none">
                <View style={[StyleSheet.absoluteFill, { backgroundColor: verdict.tone }]} />
              </View>

              <View style={s.priorityHead}>
                <View style={[s.priorityIcon, { backgroundColor: verdict.tone + '1F' }]}>
                  <Ionicons name={verdict.icon} size={18} color={verdict.tone} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.priorityEyebrow}>Priority review</Text>
                  <Text style={[s.priorityTitle, { color: verdict.tone }]}>{verdict.title}</Text>
                  <Text style={s.priorityBody}>{verdict.body}</Text>
                </View>
              </View>

              <View style={s.tileRow}>
                <PriorityTile
                  icon="cash-outline" label="Offered salary"
                  value={`₱${salary.toLocaleString()}`}
                  sub={salary >= SALARY_FLOOR ? `At or above the ₱${SALARY_FLOOR.toLocaleString()} floor` : `Below the ₱${SALARY_FLOOR.toLocaleString()} floor`}
                  tone={salary >= SALARY_FLOOR ? c.ok : c.bad} narrow={narrow}
                />
                <PriorityTile
                  icon="shield-checkmark-outline" label="Employer"
                  value={job.employer_verification || 'Unverified'}
                  sub={sealedDocs.length ? `${sealedDocs.length} PESO seal${sealedDocs.length !== 1 ? 's' : ''} on file` : 'No sealed credentials'}
                  tone={flags.length ? c.bad : empVerified ? c.ok : c.warn} narrow={narrow}
                  onPress={() => setTab('documents')}
                />
                <PriorityTile
                  icon="checkmark-done-outline" label="Compliance"
                  value={`${checklist.length - failing.length}/${checklist.length}`}
                  sub={failing.length ? `${failing.length} unmet` : 'All checks met'}
                  tone={failing.length ? c.warn : c.ok} narrow={narrow}
                />
                <PriorityTile
                  icon="medkit-outline" label="Statutory benefits"
                  value={`${benefitCount}/3`}
                  sub={salary < SSS_THRESHOLD ? 'Employer shoulders premiums (RA 10361 §30)' : 'SSS · PhilHealth · Pag-IBIG'}
                  tone={benefitCount === 3 ? c.ok : benefitCount > 0 ? c.warn : c.muted} narrow={narrow}
                />
              </View>
            </MotiView>

            {/* ── Employer ────────────────────────────────────────────────── */}
            <Block title="Employer" icon="people-outline">
              <View style={[s.employerRow, narrow && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                {job.parent_photo ? (
                  <Image source={{ uri: job.parent_photo }} style={s.employerAvatar} />
                ) : (
                  <View style={[s.employerAvatar, s.employerAvatarFb]}><Ionicons name="person" size={24} color={c.subtle} /></View>
                )}
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={s.employerName}>{job.parent_name || 'Employer'}</Text>
                  <MetaLine icon="location-outline" text={[job.barangay, job.municipality, job.province].filter(Boolean).join(', ') || '—'} />
                  {memberSince ? <MetaLine icon="calendar-outline" text={`Member since ${memberSince}`} /> : null}
                </View>
                <View style={s.employerContact}>
                  {job.parent_phone ? <MetaLine icon="call-outline" text={job.parent_phone} /> : null}
                  <MetaLine icon="mail-outline" text={job.parent_email || '—'} />
                </View>
              </View>

              {sealedDocs.length > 0 && (
                <View style={s.sealStrip}>
                  {sealedDocs.map((d, i) => (
                    <CredentialBadge key={d.document_id} documentType={d.document_type} state="sealed" size="sm" dark={dark} delay={i * 70} style={{ flexGrow: 1, minWidth: 150 }} />
                  ))}
                </View>
              )}
            </Block>

            {/* ── Description + the short cards beside it ─────────────────── */}
            {/* alignItems flex-start is what stops the short column from
                stretching to the description's height. */}
            <View style={[s.twoCol, narrow && { flexDirection: 'column' }]}>
              <Block title="Job description" icon="document-text-outline" style={narrow ? undefined : { flex: 1.35 }}>
                <Text style={s.body} numberOfLines={descOpen ? undefined : 12}>
                  {job.description || 'No description provided.'}
                </Text>
                {(job.description?.length ?? 0) > 420 && (
                  <Pressable onPress={() => setDescOpen((v) => !v)} style={s.moreBtn}>
                    <Text style={s.moreText}>{descOpen ? 'Show less' : 'Show full description'}</Text>
                    <Ionicons name={descOpen ? 'chevron-up' : 'chevron-down'} size={14} color={c.accent} />
                  </Pressable>
                )}
              </Block>

              <View style={narrow ? undefined : { flex: 1, gap: 12 }}>
                <Block title="Job details" icon="briefcase-outline">
                  <KV icon="briefcase-outline" label="Employment type" value={job.employment_type || '—'} />
                  <KV icon="time-outline" label="Work schedule" value={job.work_schedule || '—'} />
                  <KV icon="cafe-outline" label="Days off" value={parseDaysOff(job.days_off)} />
                  <KV icon="calendar-outline" label="Preferred start" value={startDate} last />
                </Block>

                <Block title="Compensation & benefits" icon="wallet-outline">
                  <Text style={s.salValue}>₱{salary.toLocaleString()}<Text style={s.salPer}> / {job.salary_period || 'monthly'}</Text></Text>
                  <View style={s.perksRow}>
                    <Perk ok={isTrue(job.provides_meals)} label="Free meals" />
                    <Perk ok={isTrue(job.provides_accommodation)} label="Accommodation" />
                    {benefits.map((b) => <Perk key={b.label} ok={b.on} label={b.label} green />)}
                  </View>
                </Block>

                <Block title="Requirements" icon="options-outline">
                  <View style={s.reqGrid}>
                    <ReqItem icon="language-outline" label="Language" value={lang} />
                    <ReqItem icon="person-outline" label="Age range" value={job.min_age && job.max_age ? `${job.min_age}–${job.max_age} yrs` : 'Any'} />
                    <ReqItem icon="heart-outline" label="Religion" value={job.preferred_religion || 'Any'} />
                    <ReqItem icon="star-outline" label="Experience" value={job.min_experience_years ? `${job.min_experience_years}+ yr(s)` : 'Any'} />
                  </View>
                </Block>
              </View>
            </View>

            {/* ── Full checklist ─────────────────────────────────────────── */}
            <Block title="Compliance checklist" icon="list-outline">
              {checklist.map((item, i) => (
                <View key={item.label} style={[s.checkRow, i === checklist.length - 1 && { borderBottomWidth: 0 }]}>
                  <Ionicons name={item.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={item.ok ? c.ok : c.warn} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.checkText, !item.ok && { color: c.warn }]}>{item.label}</Text>
                    <Text style={s.checkDetail}>{item.detail}</Text>
                  </View>
                </View>
              ))}
            </Block>

            {job.status === 'Rejected' && job.rejection_reason ? (
              <View style={s.note}>
                <Ionicons name="information-circle-outline" size={16} color={c.bad} />
                <Text style={[s.noteText, { color: c.bad }]}>Reason: {job.rejection_reason}</Text>
              </View>
            ) : null}
            {job.status === 'Open' && job.verified_by_name ? (
              <View style={[s.note, { backgroundColor: c.okSoft }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={c.ok} />
                <Text style={[s.noteText, { color: c.ok }]}>Verified by {job.verified_by_name}</Text>
              </View>
            ) : null}
          </>
        ) : (
          /* ── DOCUMENTS TAB ───────────────────────────────────────────── */
          <CredentialReviewSection
            role="parent"
            documents={docs}
            flags={flags}
            onView={(d, side) => { setViewBack(side === 'back'); setViewingDoc(d); }}
            onFlag={(d) => { setFlagDoc(d); setFlagReason(''); setFlagRevoke(false); }}
          />
        )}
      </ScrollView>

      {/* Footer actions */}
      {isPending ? (
        <View style={[s.footer, narrow && { flexDirection: 'column' }]}>
          <TouchableOpacity style={[s.actBtn, s.rejectBtn, processing && s.dim]} disabled={processing} onPress={() => { setReason(''); setReasonModal('reject'); }}>
            <Ionicons name="close-circle-outline" size={18} color="#fff" /><Text style={s.actText}>Reject job</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actBtn, s.changesBtn, processing && s.dim]} disabled={processing} onPress={() => { setReason(''); setReasonModal('changes'); }}>
            <Ionicons name="create-outline" size={18} color={c.ink} /><Text style={[s.actText, { color: c.ink }]}>Request changes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actBtn, s.approveBtn, processing && s.dim]} disabled={processing} onPress={() => setConfirmVisible(true)}>
            {processing ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.actText}>Approve job</Text></>}
          </TouchableOpacity>
        </View>
      ) : showClose && onClose ? (
        <View style={s.footer}>
          <TouchableOpacity style={[s.actBtn, { backgroundColor: c.ink, flex: 1 }]} onPress={onClose}><Text style={s.actText}>Close</Text></TouchableOpacity>
        </View>
      ) : null}

      <ConfirmationModal
        visible={confirmVisible}
        title="Approve job post?"
        message={failing.length
          ? `${failing.length} compliance check${failing.length !== 1 ? 's are' : ' is'} still unmet. Approving makes this visible to all verified helpers.`
          : 'This will make the job visible to all verified helpers.'}
        confirmText="Yes, approve"
        type="success"
        onConfirm={() => submitStatus('Open')}
        onCancel={() => setConfirmVisible(false)}
      />

      {/* Reject / request-changes */}
      <Modal visible={!!reasonModal} transparent animationType="fade" onRequestClose={() => setReasonModal(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{reasonModal === 'changes' ? 'Request changes' : 'Reject job post'}</Text>
            <Text style={s.sheetSub}>
              {reasonModal === 'changes'
                ? 'Tell the employer what to fix. They can revise and repost for review.'
                : 'Provide a reason so the employer knows why this was rejected.'}
            </Text>
            {failing.length > 0 && (
              <Pressable onPress={() => setReason(failing.map((f) => f.label).join('\n'))} style={s.prefill}>
                <Ionicons name="sparkles-outline" size={13} color={c.accent} />
                <Text style={s.prefillText}>Use the {failing.length} unmet check{failing.length !== 1 ? 's' : ''}</Text>
              </Pressable>
            )}
            <TextInput
              style={s.input}
              placeholder={reasonModal === 'changes' ? 'e.g. Please clarify the work schedule and add rest days.' : 'e.g. Salary below the CareLink standard; incomplete duties.'}
              placeholderTextColor={c.subtle}
              value={reason} onChangeText={setReason} multiline numberOfLines={4} textAlignVertical="top"
            />
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setReasonModal(null)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, !reason.trim() && s.dim, reasonModal === 'changes' && { backgroundColor: c.warn }]}
                disabled={!reason.trim()}
                onPress={() => submitStatus('Rejected', (reasonModal === 'changes' ? 'Changes requested: ' : '') + reason.trim())}
              >
                <Text style={s.confirmText}>{reasonModal === 'changes' ? 'Send to employer' : 'Confirm reject'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Flag a credential */}
      <Modal visible={!!flagDoc} transparent animationType="fade" onRequestClose={() => setFlagDoc(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.flagHead}>
              <View style={s.flagHeadIcon}><Ionicons name="flag" size={20} color={c.bad} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sheetTitle}>Flag this credential</Text>
                <Text style={s.sheetSub}>{flagDoc?.document_type} · {job.parent_name}</Text>
              </View>
            </View>

            <Text style={s.fieldLabel}>What looks wrong?</Text>
            <View style={s.presetRow}>
              {['Details do not match the profile', 'Document appears edited', 'Expired or superseded', 'Issued to a different person', 'Unreadable or partially obscured'].map((p) => {
                const active = flagReason.split('\n').map((x) => x.trim()).includes(p);
                return (
                  <Pressable key={p} onPress={() => {
                    const parts = flagReason.split('\n').map((x) => x.trim()).filter(Boolean);
                    setFlagReason(active ? parts.filter((x) => x !== p).join('\n') : [...parts, p].join('\n'));
                  }} style={[s.preset, active && { backgroundColor: c.bad, borderColor: c.bad }]}>
                    {active && <Ionicons name="checkmark" size={11} color="#fff" />}
                    <Text style={[s.presetText, active && { color: '#fff' }]}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              style={s.input}
              placeholder="Add detail. This is shown to the account holder and kept on the record."
              placeholderTextColor={c.subtle}
              value={flagReason} onChangeText={setFlagReason} multiline numberOfLines={3} textAlignVertical="top"
            />

            <Pressable onPress={() => setFlagRevoke((v) => !v)} style={[s.revokeRow, flagRevoke && { borderColor: c.bad, backgroundColor: c.badSoft }]}>
              <Switch
                value={flagRevoke} onValueChange={setFlagRevoke}
                trackColor={{ false: c.line, true: c.bad }} thumbColor="#fff"
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.revokeTitle, flagRevoke && { color: c.bad }]}>Also withdraw PESO verification</Text>
                <Text style={s.revokeSub}>
                  {flagRevoke
                    ? 'The account returns to Rejected and must be re-reviewed. They keep access so they can re-upload.'
                    : 'Leave off to record the concern without changing their status.'}
                </Text>
              </View>
            </Pressable>

            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setFlagDoc(null)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, (!flagReason.trim() || processing) && s.dim]} disabled={!flagReason.trim() || processing} onPress={submitFlag}>
                <Text style={s.confirmText}>{flagRevoke ? 'Flag & withdraw' : 'Record flag'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen document review. No approve/reject here — a job-verification
          officer inspects the employer's credentials to judge the POSTING; the
          document decision itself belongs on User Verification. Flagging an
          altered document is available, because that is what this tab is for. */}
      <DocumentViewerModal
        visible={!!viewingDoc}
        doc={viewingDoc}
        side={viewBack ? 'back' : 'front'}
        onChangeSide={(sd) => setViewBack(sd === 'back')}
        onClose={() => setViewingDoc(null)}
        onFlag={() => {
          setFlagDoc(viewingDoc); setFlagReason(''); setFlagRevoke(false); setViewingDoc(null);
        }}
        processing={processing}
      />

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
function Block({ title, icon, children, style }: { title: string; icon: any; children: React.ReactNode; style?: any }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[s.card, style]}>
      <View style={s.cardHead}>
        <Ionicons name={icon} size={14} color={c.accent} />
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PriorityTile({ icon, label, value, sub, tone, narrow, onPress }: {
  icon: any; label: string; value: string; sub: string; tone: string; narrow: boolean; onPress?: () => void;
}) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const inner = (
    <View style={[s.tile, { borderColor: tone + '33' }, narrow && { flexBasis: '46%' }]}>
      <View style={s.tileHead}>
        <Ionicons name={icon} size={12} color={tone} />
        <Text style={s.tileLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[s.tileValue, { color: tone }]} numberOfLines={1}>{value}</Text>
      <Text style={s.tileSub} numberOfLines={2}>{sub}</Text>
      {onPress && <Ionicons name="arrow-forward" size={12} color={c.subtle} style={s.tileArrow} />}
    </View>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress} style={({ hovered }: any) => [{ flexGrow: 1, flexBasis: 150 }, hovered && { opacity: 0.85 }]}>{inner}</Pressable>;
}

function MetaLine({ icon, text }: { icon: any; text: string }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return <View style={s.metaLine}><Ionicons name={icon} size={13} color={c.muted} /><Text style={s.metaText} numberOfLines={1}>{text}</Text></View>;
}
function KV({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[s.kv, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={15} color={c.accent} />
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function ReqItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.reqItem}>
      <Ionicons name={icon} size={15} color={c.info} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.reqLabel}>{label}</Text>
        <Text style={s.reqValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}
function Perk({ ok, label, green }: { ok: boolean; label: string; green?: boolean }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const tone = ok ? (green ? c.ok : c.warn) : c.subtle;
  return (
    <View style={[s.perk, { borderColor: tone + '44' }]}>
      <Ionicons name={ok ? 'checkmark' : 'close'} size={11} color={tone} />
      <Text style={[s.perkText, { color: ok ? c.ink : c.subtle }]}>{label}</Text>
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

const makeStyles = (c: PesoColors) => StyleSheet.create({
  panel: { flex: 1, backgroundColor: c.surface, overflow: 'hidden' },
  emptyPanel: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: font.display, fontSize: 16, color: c.ink },
  emptyBody: { fontFamily: font.regular, fontSize: 13, color: c.muted, textAlign: 'center', maxWidth: 300, lineHeight: 19 },

  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, gap: 12 },
  headTitle: { fontFamily: font.display, fontSize: 19, color: c.ink, letterSpacing: -0.3, marginBottom: 7 },
  headMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  headCat: { fontFamily: font.semibold, fontSize: 12, color: c.accentInk },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { fontFamily: font.semibold, fontSize: 11.5 },
  jobId: { fontFamily: font.semibold, fontSize: 11.5, color: c.subtle, letterSpacing: 0.4 },
  closeBtn: { padding: 4 },

  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: c.line },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: c.accent },
  tabText: { fontFamily: font.semibold, fontSize: 13.5, color: c.muted },
  tabTextActive: { color: c.accent },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.bad },

  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  // Priority band
  priority: { borderRadius: radius.lg, borderWidth: 1.4, padding: 14, paddingLeft: 17, marginBottom: 12, overflow: 'hidden' },
  priorityRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  priorityHead: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', marginBottom: 13 },
  priorityIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  priorityEyebrow: { fontFamily: font.semibold, fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase', color: c.subtle, marginBottom: 2 },
  priorityTitle: { fontFamily: font.display, fontSize: 15.5, letterSpacing: -0.2 },
  priorityBody: { fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3, lineHeight: 18 },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tile: { flexGrow: 1, flexBasis: 150, backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 11 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: c.subtle, flexShrink: 1 },
  tileValue: { fontFamily: font.display, fontSize: 19, marginTop: 4, fontVariant: ['tabular-nums'] },
  tileSub: { fontFamily: font.regular, fontSize: 10.5, color: c.muted, marginTop: 2, lineHeight: 14.5 },
  tileArrow: { position: 'absolute', top: 10, right: 10 },

  card: { backgroundColor: c.canvas, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  cardTitle: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  body: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 21, color: c.muted },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, alignSelf: 'flex-start' },
  moreText: { fontFamily: font.semibold, fontSize: 12.5, color: c.accent },

  // The row that used to stretch its children.
  twoCol: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },

  employerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  employerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: c.accentSoft },
  employerAvatarFb: { alignItems: 'center', justifyContent: 'center' },
  employerName: { fontFamily: font.semibold, fontSize: 15, color: c.ink, marginBottom: 3 },
  employerContact: { gap: 3, minWidth: 175 },
  sealStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontFamily: font.regular, fontSize: 12.5, color: c.muted, flexShrink: 1 },

  kv: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  kvLabel: { flex: 1, fontFamily: font.regular, fontSize: 12.5, color: c.muted },
  kvValue: { fontFamily: font.semibold, fontSize: 12.5, color: c.ink, maxWidth: '54%' },

  reqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1, flexBasis: '44%', minWidth: 120 },
  reqLabel: { fontFamily: font.semibold, fontSize: 9.5, color: c.subtle, textTransform: 'uppercase', letterSpacing: 0.4 },
  reqValue: { fontFamily: font.semibold, fontSize: 12.5, color: c.ink },

  salValue: { fontFamily: font.display, fontSize: 25, color: c.accent, marginBottom: 10, fontVariant: ['tabular-nums'] },
  salPer: { fontFamily: font.regular, fontSize: 13, color: c.muted },
  perksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, borderWidth: 1, backgroundColor: c.surface },
  perkText: { fontFamily: font.semibold, fontSize: 11.5 },

  checkRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  checkText: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  checkDetail: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 2, lineHeight: 16.5 },

  note: { flexDirection: 'row', gap: 8, backgroundColor: c.badSoft, padding: 12, borderRadius: radius.md, marginBottom: 8 },
  noteText: { flex: 1, fontFamily: font.semibold, fontSize: 12.5 },


  footer: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: radius.md },
  rejectBtn: { backgroundColor: c.bad },
  changesBtn: { backgroundColor: c.surface, borderWidth: 1.4, borderColor: c.lineStrong },
  approveBtn: { backgroundColor: c.ok },
  dim: { opacity: 0.5 },
  actText: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5 },

  overlay: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 540, backgroundColor: c.surface, borderRadius: radius.xl, padding: 22 },
  sheetTitle: { fontFamily: font.display, fontSize: 18, color: c.ink },
  sheetSub: { fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3, marginBottom: 14, lineHeight: 18 },
  fieldLabel: { fontFamily: font.semibold, fontSize: 12, color: c.muted, marginBottom: 8 },
  prefill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.accentSoft, marginBottom: 11 },
  prefillText: { fontFamily: font.semibold, fontSize: 12, color: c.accentInk },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  presetText: { fontFamily: font.regular, fontSize: 11.5, color: c.ink },
  input: { backgroundColor: c.canvas, borderRadius: radius.md, padding: 13, fontFamily: font.regular, fontSize: 13.5, color: c.ink, minHeight: 88, borderWidth: 1, borderColor: c.line },
  flagHead: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', marginBottom: 6 },
  flagHeadIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.badSoft, alignItems: 'center', justifyContent: 'center' },
  revokeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 12, padding: 12, borderRadius: radius.md, borderWidth: 1.4, borderColor: c.line },
  revokeTitle: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  revokeSub: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 2, lineHeight: 16 },
  sheetActions: { flexDirection: 'row', gap: 11, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: c.line },
  cancelText: { fontFamily: font.semibold, fontSize: 13.5, color: c.muted },
  confirmBtn: { flex: 1.5, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: c.bad },
  confirmText: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5 },

});
