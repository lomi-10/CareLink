// components/peso/ComplaintCasePanel.tsx
// The PESO case file for one complaint.
//
// FROM THE PESO INTERVIEW (Aug 2026), four things were wrong with the old pane:
//
//  1. "What happened" was one blob. An officer needs the four separate
//     questions a report has to answer, so the panel is organised as
//     DETAILS (the what) · WHEN · WHERE · HOW, with when and where as real
//     fields rather than something buried in prose.
//
//  2. Resolve/Dismiss was the entire vocabulary for work that is a sequence.
//     Replaced with an action log — action taken, action to be taken (with a
//     committed date), referrals — that drives the case status.
//
//  3. Nobody outside the office could see progress. Every non-internal entry
//     appears on the complainant's and the respondent's own tracker and
//     notifies them.
//
//  4. The real ladder is Barangay -> PESO -> DOLE. Barangay is not integrated;
//     the officer refers by hand and records it, and the ladder shows that
//     honestly rather than implying a system step exists.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { usePesoTheme, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';
import { SafetyFlagBadge } from '../shared/SafetyFlagBadge';

type ActionType =
  | 'under_review' | 'referred_barangay' | 'referred_dole'
  | 'action_planned' | 'action_taken' | 'resolved' | 'dismissed';

const ACTIONS: { key: ActionType; label: string; hint: string; icon: any; tone: 'accent' | 'info' | 'ok' | 'bad' | 'warn' }[] = [
  { key: 'under_review',      label: 'Mark under review',   hint: 'Case opened and being looked at',         icon: 'eye-outline',           tone: 'info' },
  { key: 'action_planned',    label: 'Action to be taken',  hint: 'What PESO will do, and by when',          icon: 'calendar-outline',      tone: 'warn' },
  { key: 'action_taken',      label: 'Action taken',        hint: 'Something PESO has already done',         icon: 'checkmark-done-outline',tone: 'accent' },
  { key: 'referred_barangay', label: 'Referred to barangay',hint: 'You forwarded it to the barangay by hand',icon: 'home-outline',          tone: 'info' },
  { key: 'referred_dole',     label: 'Referred to DOLE',    hint: 'Beyond PESO’s authority',                 icon: 'business-outline',      tone: 'info' },
  { key: 'resolved',          label: 'Resolve case',        hint: 'Finding confirmed and case closed',       icon: 'shield-checkmark-outline', tone: 'ok' },
  { key: 'dismissed',         label: 'Dismiss case',        hint: 'Not upheld — closed without a finding',   icon: 'close-circle-outline',  tone: 'bad' },
];

const TL_ICON: Record<string, any> = {
  received: 'mail-open-outline', under_review: 'eye-outline',
  referred_barangay: 'home-outline', referred_dole: 'business-outline',
  action_planned: 'calendar-outline', action_taken: 'checkmark-done-outline',
  resolved: 'shield-checkmark', dismissed: 'close-circle',
};

export function ComplaintCasePanel({
  complaintId, onChanged, onClose, showClose,
}: {
  complaintId: number | null;
  onChanged: () => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<number>(0);

  const [actionOpen, setActionOpen] = useState<ActionType | null>(null);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [internal, setInternal] = useState(false);

  const [flagOpen, setFlagOpen] = useState(false);
  const [flagLevel, setFlagLevel] = useState<'caution' | 'serious'>('caution');
  const [flagReason, setFlagReason] = useState('');
  const [flagNote, setFlagNote] = useState('');
  const [liftOpen, setLiftOpen] = useState(false);
  const [liftReason, setLiftReason] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        if (raw) setStaffId(Number(JSON.parse(raw)?.user_id) || 0);
      } catch {}
    })();
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!complaintId) { setData(null); return; }
    try {
      if (!opts?.silent) { setLoading(true); setError(null); }
      const raw = await AsyncStorage.getItem('user_data');
      const uid = raw ? JSON.parse(raw)?.user_id : '';
      const res = await fetch(`${API_URL}/peso/get_complaint_detail.php?complaint_id=${complaintId}&staff_user_id=${encodeURIComponent(String(uid ?? ''))}`);
      const json = await res.json();
      if (json.success) setData(json);
      else { setData(null); setError(json.message || 'Could not load this case.'); }
    } catch { setData(null); setError('Could not reach the server.'); }
    finally { if (!opts?.silent) setLoading(false); }
  }, [complaintId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setActionOpen(null); setTitle(''); setDetail(''); setDueDate(''); setInternal(false); }, [complaintId]);

  const submitAction = async () => {
    if (!actionOpen || !title.trim()) return;
    try {
      setBusy(true);
      const res = await fetch(`${API_URL}/peso/add_complaint_action.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: complaintId, staff_user_id: staffId,
          action_type: actionOpen, title: title.trim(), detail: detail.trim(),
          due_date: dueDate.trim(), internal,
          escalation_stage: actionOpen === 'referred_barangay' ? 'barangay'
            : actionOpen === 'referred_dole' ? 'dole' : undefined,
        }),
      });
      const json = await res.json();
      setError(json.success ? null : (json.message || 'Could not record that.'));
      if (json.success) {
        setActionOpen(null); setTitle(''); setDetail(''); setDueDate(''); setInternal(false);
        await load({ silent: true });
        onChanged();
      }
    } catch { setError('Could not reach the server.'); }
    finally { setBusy(false); }
  };

  const submitFlag = async () => {
    if (!flagReason.trim()) return;
    try {
      setBusy(true);
      const res = await fetch(`${API_URL}/peso/set_safety_flag.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'issue', user_id: data?.respondent?.user_id, complaint_id: complaintId,
          level: flagLevel, public_reason: flagReason.trim(), internal_note: flagNote.trim(),
          staff_user_id: staffId,
        }),
      });
      const json = await res.json();
      setError(json.success ? null : (json.message || 'Could not issue the marking.'));
      if (json.success) { setFlagOpen(false); setFlagReason(''); setFlagNote(''); await load({ silent: true }); onChanged(); }
    } catch { setError('Could not reach the server.'); }
    finally { setBusy(false); }
  };

  const submitLift = async () => {
    if (!liftReason.trim()) return;
    try {
      setBusy(true);
      const res = await fetch(`${API_URL}/peso/set_safety_flag.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lift', safety_flag_id: data?.safety_flag?.safety_flag_id,
          lift_reason: liftReason.trim(), staff_user_id: staffId,
        }),
      });
      const json = await res.json();
      setError(json.success ? null : (json.message || 'Could not lift the marking.'));
      if (json.success) { setLiftOpen(false); setLiftReason(''); await load({ silent: true }); onChanged(); }
    } catch { setError('Could not reach the server.'); }
    finally { setBusy(false); }
  };

  if (!complaintId) {
    return (
      <View style={[s.panel, s.center]}>
        <View style={s.emptyIcon}><Ionicons name="folder-open-outline" size={30} color={c.accent} /></View>
        <Text style={s.emptyTitle}>Select a case</Text>
        <Text style={s.emptyBody}>Choose a complaint on the left to see the full case file and record what PESO has done.</Text>
      </View>
    );
  }
  if (loading) return <View style={[s.panel, s.center]}><ActivityIndicator size="large" color={c.accent} /></View>;
  if (!data) {
    return (
      <View style={[s.panel, s.center]}>
        <Ionicons name="alert-circle-outline" size={44} color={c.subtle} />
        <Text style={s.emptyTitle}>{error ?? 'Case not found'}</Text>
        <Pressable style={s.retry} onPress={() => load()}><Text style={s.retryText}>Retry</Text></Pressable>
      </View>
    );
  }

  const cm = data.complaint, comp = data.complainant, resp = data.respondent;
  const timeline: any[] = data.timeline ?? [];
  const ladder: any[] = data.escalation ?? [];
  const flag = data.safety_flag;
  const closed = cm.status === 'Resolved' || cm.status === 'Dismissed';
  const statusTone = cm.status === 'Resolved' ? c.ok : cm.status === 'Dismissed' ? c.muted : c.warn;

  const when = cm.incident_at
    ? new Date(String(cm.incident_at).replace(' ', 'T')).toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' })
    : null;
  const filed = cm.created_at
    ? new Date(String(cm.created_at).replace(' ', 'T')).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  return (
    <View style={s.panel}>
      {/* Header */}
      <View style={s.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>{cm.reference} · {cm.category}</Text>
          <Text style={s.title} numberOfLines={2}>{cm.subject}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[s.statusPill, { backgroundColor: statusTone + '1A' }]}>
            <Text style={[s.statusText, { color: statusTone }]}>
              {cm.status === 'Escalated_PESO' ? 'With PESO' : cm.status}
            </Text>
          </View>
          {showClose && onClose && (
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={20} color={c.muted} /></Pressable>
          )}
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 26 }} showsVerticalScrollIndicator={false}>
        {!!error && (
          <View style={s.errBox}><Ionicons name="alert-circle" size={15} color={c.bad} /><Text style={s.errText}>{error}</Text></View>
        )}

        {/* ── The four questions ───────────────────────────────────────── */}
        <Text style={s.secLabel}>The incident</Text>
        <View style={s.factGrid}>
          <Fact icon="document-text-outline" label="Details — what happened" value={cm.subject} wide />
          <Fact icon="time-outline" label="When it happened"
            value={when ?? 'Not stated by the reporter'} muted={!when} />
          <Fact icon="location-outline" label="Where it happened"
            value={cm.incident_address ?? 'Not stated by the reporter'} muted={!cm.incident_address} />
        </View>

        <View style={s.howBox}>
          <View style={s.howHead}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={c.accent} />
            <Text style={s.howTitle}>How it happened — in the reporter’s own words</Text>
          </View>
          <Text style={s.howText}>{cm.description || 'No description was given.'}</Text>
        </View>

        <View style={s.metaRow}>
          <Text style={s.metaItem}>Filed {filed}</Text>
          {!!cm.job_title && <Text style={s.metaItem}>· Placement: {cm.job_title}</Text>}
          {!!cm.evidence_file && <Text style={s.metaItem}>· Evidence attached</Text>}
        </View>

        {/* ── Parties ─────────────────────────────────────────────────── */}
        <Text style={[s.secLabel, { marginTop: 20 }]}>The people involved</Text>
        <View style={s.partyRow}>
          <PartyCard title="REPORTED BY" p={comp} />
          <View style={s.arrowCol}><Ionicons name="arrow-forward" size={16} color={c.subtle} /></View>
          <PartyCard title="REPORTED PARTY" p={resp} showHistory />
        </View>

        {!!flag && (
          <View style={{ marginTop: 12 }}>
            <SafetyFlagBadge flag={flag} />
            <Pressable style={s.liftBtn} onPress={() => { setLiftReason(''); setLiftOpen(true); }}>
              <Ionicons name="backspace-outline" size={14} color={c.muted} />
              <Text style={s.liftText}>Lift this marking</Text>
            </Pressable>
          </View>
        )}

        {/* ── Escalation ladder ───────────────────────────────────────── */}
        <Text style={[s.secLabel, { marginTop: 20 }]}>Escalation</Text>
        <View style={s.ladder}>
          {ladder.map((st, i) => {
            const tone = st.state === 'active' ? c.accent : st.state === 'done' ? c.ok : c.subtle;
            return (
              <View key={st.key} style={s.ladderStep}>
                <View style={[s.ladderDot, { borderColor: tone, backgroundColor: st.state === 'todo' ? c.surface : tone }]}>
                  {st.state === 'done' && <Ionicons name="checkmark" size={10} color="#fff" />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.ladderLabel, st.state === 'todo' && { color: c.subtle }]}>{st.label}</Text>
                  <Text style={s.ladderNote}>{st.note}</Text>
                </View>
                {i < ladder.length - 1 && <View style={s.ladderLine} />}
              </View>
            );
          })}
        </View>

        {/* ── Tracker ─────────────────────────────────────────────────── */}
        <View style={s.trackHead}>
          <Text style={s.secLabel}>Case tracker</Text>
          <View style={s.sharedChip}>
            <Ionicons name="people-outline" size={11} color={c.info} />
            <Text style={s.sharedChipText}>Both parties see this</Text>
          </View>
        </View>

        <View style={s.tracker}>
          {timeline.map((t, i) => {
            const last = i === timeline.length - 1;
            const tone = t.action_type === 'resolved' ? c.ok
              : t.action_type === 'dismissed' ? c.muted
              : t.action_type === 'action_planned' ? c.warn : c.accent;
            return (
              <MotiView
                key={t.action_id}
                from={{ opacity: 0, translateX: -6 }} animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 240, delay: Math.min(i * 60, 300) }}
                style={s.tRow}
              >
                <View style={s.tRail}>
                  <View style={[s.tDot, { backgroundColor: tone + '1F', borderColor: tone }]}>
                    <Ionicons name={TL_ICON[t.action_type] ?? 'ellipse-outline'} size={11} color={tone} />
                  </View>
                  {!last && <View style={s.tLine} />}
                </View>
                <View style={[s.tBody, last && { paddingBottom: 0 }]}>
                  <View style={s.tTitleRow}>
                    <Text style={s.tTitle}>{t.title}</Text>
                    {/* An internal note is visually separated so an officer can
                        never mistake a private note for something the parties saw. */}
                    {t.internal && (
                      <View style={s.internalChip}>
                        <Ionicons name="lock-closed" size={9} color={c.muted} />
                        <Text style={s.internalText}>Internal</Text>
                      </View>
                    )}
                  </View>
                  {!!t.detail && <Text style={s.tDetail}>{t.detail}</Text>}
                  <Text style={s.tMeta}>
                    {t.actor_name || 'PESO'}
                    {t.created_at ? ` · ${new Date(String(t.created_at).replace(' ', 'T')).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                    {t.due_date ? ` · due ${new Date(String(t.due_date)).toLocaleDateString('en-PH', { dateStyle: 'medium' })}` : ''}
                  </Text>
                </View>
              </MotiView>
            );
          })}
        </View>

        {/* ── Record an action ────────────────────────────────────────── */}
        <Text style={[s.secLabel, { marginTop: 22 }]}>Record what PESO did</Text>
        <View style={s.actionGrid}>
          {ACTIONS.filter((a) => !(closed && (a.key === 'resolved' || a.key === 'dismissed'))).map((a) => {
            const tone = a.tone === 'ok' ? c.ok : a.tone === 'bad' ? c.bad : a.tone === 'warn' ? c.warn : a.tone === 'info' ? c.info : c.accent;
            return (
              <Pressable
                key={a.key}
                onPress={() => { setActionOpen(a.key); setTitle(''); setDetail(''); setDueDate(''); setInternal(false); }}
                style={({ hovered }: any) => [s.actionCard, hovered && { borderColor: tone, backgroundColor: tone + '0D' }]}
              >
                <Ionicons name={a.icon} size={17} color={tone} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.actionLabel}>{a.label}</Text>
                  <Text style={s.actionHint}>{a.hint}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Public marking ──────────────────────────────────────────── */}
        {!!resp?.user_id && !flag && (
          <>
            <Text style={[s.secLabel, { marginTop: 22 }]}>Public marking</Text>
            <View style={s.flagBox}>
              <Text style={s.flagLead}>
                A marking is shown to everyone who browses this {String(resp.role ?? 'account').toLowerCase()}.
                It can only be issued once this case is <Text style={s.flagStrong}>resolved</Text> with a confirmed finding —
                never on an allegation.
              </Text>
              <Pressable
                disabled={cm.status !== 'Resolved'}
                onPress={() => { setFlagLevel('caution'); setFlagReason(''); setFlagNote(''); setFlagOpen(true); }}
                style={[s.flagBtn, cm.status !== 'Resolved' && { opacity: 0.45 }]}
              >
                <Ionicons name="warning-outline" size={16} color={c.bad} />
                <Text style={s.flagBtnText}>
                  {cm.status === 'Resolved' ? 'Place a public marking' : 'Available once the case is resolved'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Action modal */}
      <Modal visible={!!actionOpen} transparent animationType="fade" onRequestClose={() => setActionOpen(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{ACTIONS.find((a) => a.key === actionOpen)?.label}</Text>
            <Text style={s.sheetSub}>{ACTIONS.find((a) => a.key === actionOpen)?.hint}</Text>

            <Text style={s.fieldLabel}>In one line</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle}
              placeholder="e.g. Mediation held at the PESO office" placeholderTextColor={c.subtle} />

            <Text style={s.fieldLabel}>Detail (optional)</Text>
            <TextInput style={[s.input, s.multiline]} value={detail} onChangeText={setDetail}
              placeholder="What was discussed, agreed, or required next…" placeholderTextColor={c.subtle}
              multiline numberOfLines={3} textAlignVertical="top" />

            {actionOpen === 'action_planned' && (
              <>
                <Text style={s.fieldLabel}>Target date</Text>
                <TextInput style={s.input} value={dueDate} onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD" placeholderTextColor={c.subtle} />
                <Text style={s.fieldHint}>A commitment without a date is not a commitment — both parties will see this.</Text>
              </>
            )}

            <Pressable onPress={() => setInternal((v) => !v)} style={[s.internalRow, internal && { borderColor: c.warn, backgroundColor: c.warnSoft }]}>
              <Switch value={internal} onValueChange={setInternal} trackColor={{ false: c.line, true: c.warn }} thumbColor="#fff" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.internalTitle, internal && { color: c.warn }]}>Keep internal</Text>
                <Text style={s.internalSub}>
                  {internal
                    ? 'Only PESO will see this. Neither party is notified.'
                    : 'Both parties will see this on their tracker and be notified.'}
                </Text>
              </View>
            </Pressable>

            <View style={s.sheetActions}>
              <Pressable style={s.cancel} onPress={() => setActionOpen(null)}><Text style={s.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[s.confirm, (!title.trim() || busy) && { opacity: 0.5 }]} disabled={!title.trim() || busy} onPress={submitAction}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmText}>Record</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Public marking modal */}
      <Modal visible={flagOpen} transparent animationType="fade" onRequestClose={() => setFlagOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.warnHead}>
              <View style={s.warnIcon}><Ionicons name="warning" size={20} color={c.bad} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sheetTitle}>Place a public marking</Text>
                <Text style={s.sheetSub}>On {resp?.name} · {resp?.role}</Text>
              </View>
            </View>

            {/* The consequence, stated before the form. This is the most damaging
                action in the system and the officer should read it every time. */}
            <View style={s.consequence}>
              <Text style={s.consequenceText}>
                Everyone browsing CareLink will see this marking on {resp?.name}’s profile.
                For a helper it can end their ability to find work. Only the line you write below is shown —
                never the complaint text and never who reported it.
              </Text>
            </View>

            <Text style={s.fieldLabel}>Level</Text>
            <View style={s.levelRow}>
              {(['caution', 'serious'] as const).map((lv) => (
                <Pressable key={lv} onPress={() => setFlagLevel(lv)}
                  style={[s.levelCard, flagLevel === lv && { borderColor: lv === 'serious' ? c.bad : c.warn, backgroundColor: (lv === 'serious' ? c.bad : c.warn) + '12' }]}>
                  <Text style={[s.levelTitle, flagLevel === lv && { color: lv === 'serious' ? c.bad : c.warn }]}>
                    {lv === 'serious' ? 'Serious' : 'Caution'}
                  </Text>
                  <Text style={s.levelHint}>
                    {lv === 'serious' ? 'Confirmed and severe' : 'Confirmed but limited'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.fieldLabel}>Public reason — the only text others will see</Text>
            <TextInput style={s.input} value={flagReason} onChangeText={setFlagReason} maxLength={200}
              placeholder="e.g. Confirmed non-payment of agreed wages" placeholderTextColor={c.subtle} />
            <Text style={s.fieldHint}>{flagReason.length}/200 · Keep it factual. No names, no narrative.</Text>

            <Text style={s.fieldLabel}>Internal note (PESO only)</Text>
            <TextInput style={[s.input, s.multiline]} value={flagNote} onChangeText={setFlagNote}
              placeholder="Context behind the decision…" placeholderTextColor={c.subtle}
              multiline numberOfLines={2} textAlignVertical="top" />

            <View style={s.sheetActions}>
              <Pressable style={s.cancel} onPress={() => setFlagOpen(false)}><Text style={s.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[s.danger, (!flagReason.trim() || busy) && { opacity: 0.5 }]} disabled={!flagReason.trim() || busy} onPress={submitFlag}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmText}>Place marking</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lift modal */}
      <Modal visible={liftOpen} transparent animationType="fade" onRequestClose={() => setLiftOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Lift the marking</Text>
            <Text style={s.sheetSub}>It stops being shown to other users. The record of it stays.</Text>
            <TextInput style={[s.input, s.multiline, { marginTop: 12 }]} value={liftReason} onChangeText={setLiftReason}
              placeholder="Why is it being lifted?" placeholderTextColor={c.subtle}
              multiline numberOfLines={3} textAlignVertical="top" />
            <View style={s.sheetActions}>
              <Pressable style={s.cancel} onPress={() => setLiftOpen(false)}><Text style={s.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[s.confirm, (!liftReason.trim() || busy) && { opacity: 0.5 }]} disabled={!liftReason.trim() || busy} onPress={submitLift}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmText}>Lift</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────
function Fact({ icon, label, value, wide, muted }: {
  icon: any; label: string; value: string; wide?: boolean; muted?: boolean;
}) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[s.fact, wide && { flexBasis: '100%' }]}>
      <View style={s.factHead}>
        <Ionicons name={icon} size={13} color={c.accent} />
        <Text style={s.factLabel}>{label}</Text>
      </View>
      <Text style={[s.factValue, muted && { color: c.subtle, fontFamily: font.regular }]}>{value}</Text>
    </View>
  );
}

function PartyCard({ title, p, showHistory }: { title: string; p: any; showHistory?: boolean }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  if (!p?.name) {
    return <View style={s.party}><Text style={s.partyRole}>{title}</Text><Text style={s.partyMeta}>Not recorded</Text></View>;
  }
  const repeat = showHistory && (p.prior_complaints ?? 0) > 0;
  return (
    <View style={s.party}>
      <Text style={s.partyRole}>{title}</Text>
      <Text style={s.partyName} numberOfLines={1}>{p.name}</Text>
      <Text style={s.partyMeta}>{p.role}{p.location ? ` · ${p.location}` : ''}</Text>
      {!!p.phone && <Text style={s.partyMeta}>{p.phone}</Text>}
      {!!p.email && <Text style={s.partyMeta} numberOfLines={1}>{p.email}</Text>}
      {/* Prior history is the single most useful thing an officer can know here:
          a first complaint and a fifth are different cases. */}
      {showHistory && (
        <View style={[s.historyChip, repeat && { backgroundColor: c.warnSoft }]}>
          <Ionicons name={repeat ? 'repeat' : 'checkmark-circle-outline'} size={11} color={repeat ? c.warn : c.ok} />
          <Text style={[s.historyText, { color: repeat ? c.warn : c.ok }]}>
            {repeat
              ? `${p.prior_complaints} other complaint${p.prior_complaints === 1 ? '' : 's'} · ${p.prior_upheld} upheld`
              : 'No other complaints on record'}
          </Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  panel: { flex: 1, backgroundColor: c.surface },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: font.display, fontSize: 16, color: c.ink, textAlign: 'center' },
  emptyBody: { fontFamily: font.regular, fontSize: 13, color: c.muted, textAlign: 'center', maxWidth: 300, lineHeight: 19 },
  retry: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: radius.md, borderWidth: 1, borderColor: c.line },
  retryText: { fontFamily: font.semibold, color: c.ink },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: c.line },
  eyebrow: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1, color: c.subtle, marginBottom: 3 },
  title: { fontFamily: font.display, fontSize: 18, color: c.ink, letterSpacing: -0.3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontFamily: font.semibold, fontSize: 11.5 },

  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  secLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: c.subtle, marginBottom: 10 },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.badSoft, borderRadius: radius.md, padding: 11, marginBottom: 12 },
  errText: { flex: 1, fontFamily: font.semibold, fontSize: 12, color: c.bad },

  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: { flexGrow: 1, flexBasis: 200, minWidth: 170, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 12 },
  factHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  factLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: c.subtle },
  factValue: { fontFamily: font.semibold, fontSize: 13.5, color: c.ink, lineHeight: 19 },

  howBox: { backgroundColor: c.sunken, borderRadius: radius.lg, padding: 14, marginTop: 10 },
  howHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  howTitle: { fontFamily: font.semibold, fontSize: 11.5, color: c.accentInk },
  howText: { fontFamily: font.regular, fontSize: 13.5, color: c.ink, lineHeight: 20 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  metaItem: { fontFamily: font.regular, fontSize: 11.5, color: c.subtle },

  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  party: { flex: 1, minWidth: 0, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 13, gap: 2 },
  arrowCol: { width: 26, alignItems: 'center' },
  partyRole: { fontFamily: font.semibold, fontSize: 9, letterSpacing: 0.8, color: c.subtle, marginBottom: 3 },
  partyName: { fontFamily: font.semibold, fontSize: 14, color: c.ink },
  partyMeta: { fontFamily: font.regular, fontSize: 11.5, color: c.muted },
  historyChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: c.okSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 7 },
  historyText: { fontFamily: font.semibold, fontSize: 10.5 },

  liftBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: c.line },
  liftText: { fontFamily: font.semibold, fontSize: 11.5, color: c.muted },

  ladder: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 13, gap: 2 },
  ladderStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  ladderDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  ladderLabel: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  ladderNote: { fontFamily: font.regular, fontSize: 11, color: c.subtle, marginTop: 1 },
  ladderLine: { position: 'absolute', left: 8, top: 26, width: 2, height: 14, backgroundColor: c.line },

  trackHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 20 },
  sharedChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.infoSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginBottom: 10 },
  sharedChipText: { fontFamily: font.semibold, fontSize: 10.5, color: c.info },
  tracker: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 14 },
  tRow: { flexDirection: 'row', gap: 11 },
  tRail: { alignItems: 'center', width: 24 },
  tDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: c.line, marginVertical: 2 },
  tBody: { flex: 1, minWidth: 0, paddingBottom: 14 },
  tTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  tTitle: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  internalChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.sunken, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  internalText: { fontFamily: font.semibold, fontSize: 9.5, color: c.muted },
  tDetail: { fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3, lineHeight: 18 },
  tMeta: { fontFamily: font.regular, fontSize: 10.5, color: c.subtle, marginTop: 4 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  actionCard: { flexGrow: 1, flexBasis: 220, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.canvas, borderWidth: 1.4, borderColor: c.line, borderRadius: radius.md, padding: 12 },
  actionLabel: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  actionHint: { fontFamily: font.regular, fontSize: 11, color: c.subtle, marginTop: 1 },

  flagBox: { backgroundColor: c.badSoft, borderWidth: 1, borderColor: c.bad + '33', borderRadius: radius.lg, padding: 14 },
  flagLead: { fontFamily: font.regular, fontSize: 12.5, color: c.ink, lineHeight: 19 },
  flagStrong: { fontFamily: font.semibold },
  flagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.bad + '66', backgroundColor: c.surface },
  flagBtnText: { fontFamily: font.semibold, fontSize: 13, color: c.bad },

  overlay: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: c.surface, borderRadius: radius.xl, padding: 22 },
  sheetTitle: { fontFamily: font.display, fontSize: 18, color: c.ink },
  sheetSub: { fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3, lineHeight: 18 },
  fieldLabel: { fontFamily: font.semibold, fontSize: 12, color: c.muted, marginTop: 14, marginBottom: 6 },
  fieldHint: { fontFamily: font.regular, fontSize: 11, color: c.subtle, marginTop: 5, lineHeight: 15.5 },
  input: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 12, fontFamily: font.regular, fontSize: 13.5, color: c.ink },
  multiline: { minHeight: 76 },
  internalRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 14, padding: 12, borderRadius: radius.md, borderWidth: 1.4, borderColor: c.line },
  internalTitle: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  internalSub: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 2, lineHeight: 16 },
  sheetActions: { flexDirection: 'row', gap: 11, marginTop: 18 },
  cancel: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: c.line },
  cancelText: { fontFamily: font.semibold, fontSize: 13.5, color: c.muted },
  confirm: { flex: 1.4, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent },
  danger: { flex: 1.4, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bad },
  confirmText: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5 },

  warnHead: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  warnIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.badSoft, alignItems: 'center', justifyContent: 'center' },
  consequence: { backgroundColor: c.badSoft, borderWidth: 1, borderColor: c.bad + '33', borderRadius: radius.md, padding: 12, marginTop: 14 },
  consequenceText: { fontFamily: font.regular, fontSize: 12.5, color: c.ink, lineHeight: 18.5 },
  levelRow: { flexDirection: 'row', gap: 9 },
  levelCard: { flex: 1, borderWidth: 1.6, borderColor: c.line, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  levelTitle: { fontFamily: font.semibold, fontSize: 13.5, color: c.ink },
  levelHint: { fontFamily: font.regular, fontSize: 10.5, color: c.subtle, marginTop: 2, textAlign: 'center' },
});
