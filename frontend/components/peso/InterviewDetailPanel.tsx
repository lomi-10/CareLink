// components/peso/InterviewDetailPanel.tsx
// PESO oversight of a single interview.
//
// WHY THIS EXISTS (PESO interview, Aug 2026): the Interviews screen was a list
// and nothing else. The cards lit up on hover — because the shared ListRow
// wrapped everything in a Pressable — and then did nothing when clicked. PESO
// reported it as broken, and it was: an interview had no detail view at all.
//
// What they asked for, and what this is:
//
//  1. A PROGRESS TRACKER BETWEEN THE TWO PARTIES. An interview is a two-sided
//     commitment, and the thing an officer needs at a glance is which side is
//     holding it up. So confirmation is shown per-person, side by side, above a
//     four-stage timeline.
//
//  2. AN OUTCOME THAT NOTIFIES BOTH. Recording the result messages the helper
//     and the employer automatically — before this, interviews sat at "Pending"
//     forever and neither side was ever told anything.
//
//  3. A REVIEW ONLY PESO CAN SEE. The officer's candid assessment is kept
//     private and never reaches either party. The panel says so, out loud, at
//     the point of writing — a privacy promise the user can't see is worthless.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { usePesoTheme, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';

type Result = 'Pass' | 'Fail' | 'No Show';
type Party = 'helper' | 'employer' | 'both';

const RESULTS: { key: Result; label: string; sub: string; icon: any; tone: 'ok' | 'bad' | 'warn' }[] = [
  { key: 'Pass', label: 'Went well', sub: 'Employer is moving forward', icon: 'checkmark-circle', tone: 'ok' },
  { key: 'Fail', label: 'Did not go well', sub: 'Employer is not proceeding', icon: 'close-circle', tone: 'bad' },
  { key: 'No Show', label: 'No-show', sub: 'Someone did not attend', icon: 'help-circle', tone: 'warn' },
];

export function InterviewDetailPanel({
  interviewId, onRecorded, onClose, showClose,
}: {
  interviewId: number | null;
  onRecorded: () => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<Result | null>(null);
  const [noShowParty, setNoShowParty] = useState<Party>('helper');

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!interviewId) { setData(null); return; }
    try {
      if (!opts?.silent) { setLoading(true); setError(null); }
      const raw = await AsyncStorage.getItem('user_data');
      const staffId = raw ? JSON.parse(raw)?.user_id : '';
      const res = await fetch(`${API_URL}/peso/get_interview_detail.php?interview_id=${interviewId}&staff_user_id=${encodeURIComponent(String(staffId ?? ''))}`);
      const json = await res.json();
      if (json.success) setData(json);
      else { setData(null); setError(json.message || 'Could not load this interview.'); }
    } catch {
      setData(null); setError('Network connection failed.');
    } finally { if (!opts?.silent) setLoading(false); }
  }, [interviewId]);

  useEffect(() => { void load(); }, [load]);
  // A new interview starts with an empty form — otherwise the previous
  // officer's draft notes would carry onto someone else's record.
  useEffect(() => { setResult(null); setNoShowParty('helper'); }, [interviewId]);

  const submit = async () => {
    if (!result) return;
    try {
      setSaving(true);
      const raw = await AsyncStorage.getItem('user_data');
      const staffId = raw ? JSON.parse(raw)?.user_id : 0;
      const res = await fetch(`${API_URL}/peso/record_interview_outcome.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_id: interviewId,
          result,
          no_show_party: result === 'No Show' ? noShowParty : undefined,
          staff_user_id: staffId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(null);
        await load({ silent: true });
        onRecorded();
      } else {
        setError(json.message || 'Could not record the outcome.');
      }
    } catch { setError('Network connection failed.'); }
    finally { setSaving(false); }
  };

  if (!interviewId) {
    return (
      <View style={[s.panel, s.center]}>
        <View style={s.emptyIcon}><Ionicons name="calendar-outline" size={30} color={c.accent} /></View>
        <Text style={s.emptyTitle}>Select an interview</Text>
        <Text style={s.emptyBody}>Choose one on the left to see how far along it is and record the outcome.</Text>
      </View>
    );
  }
  if (loading) return <View style={[s.panel, s.center]}><ActivityIndicator size="large" color={c.accent} /></View>;
  if (!data) {
    return (
      <View style={[s.panel, s.center]}>
        <Ionicons name="alert-circle-outline" size={44} color={c.subtle} />
        <Text style={s.emptyTitle}>{error ?? 'Interview not found'}</Text>
        <Pressable style={s.retry} onPress={() => load()}><Text style={s.retryText}>Retry</Text></Pressable>
      </View>
    );
  }

  const iv = data.interview, helper = data.helper, employer = data.employer, job = data.job;
  const stages: any[] = data.stages ?? [];
  const reviews: any[] = data.reviews ?? [];
  const partyFeedback: any[] = data.party_feedback ?? [];
  const recorded = iv.result && iv.result !== 'Pending';
  const cancelled = iv.status === 'Cancelled';
  const when = iv.interview_date ? new Date(iv.interview_date) : null;

  const typeIcon = iv.interview_type === 'Video Call' ? 'videocam'
    : iv.interview_type === 'Phone' ? 'call' : 'location';

  const resultTone = iv.result === 'Pass' ? c.ok : iv.result === 'Fail' ? c.bad : iv.result === 'No Show' ? c.warn : c.muted;

  return (
    <View style={s.panel}>
      {/* Header */}
      <View style={s.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>{iv.code} · {String(iv.interview_type ?? '').toUpperCase()}</Text>
          <Text style={s.title} numberOfLines={2}>{job?.title ?? 'Interview'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[s.statusPill, { backgroundColor: resultTone + '1A' }]}>
            <Text style={[s.statusText, { color: resultTone }]}>{recorded ? iv.result : cancelled ? 'Cancelled' : iv.status}</Text>
          </View>
          {showClose && onClose && (
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={20} color={c.muted} /></Pressable>
          )}
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* What to do next — the one line an officer reads first */}
        <View style={[s.nextBox, { borderColor: (recorded ? c.ok : cancelled ? c.muted : c.accent) + '55' }]}>
          <Ionicons
            name={recorded ? 'checkmark-done-circle' : cancelled ? 'close-circle' : 'flag'}
            size={17}
            color={recorded ? c.ok : cancelled ? c.muted : c.accent}
          />
          <Text style={s.nextText}>{data.next_action}</Text>
        </View>

        {/* ── Two-party confirmation ─────────────────────────────────────── */}
        <Text style={s.secLabel}>Between the two parties</Text>
        <View style={s.partyRow}>
          <PartyCard person={employer} role="Household Employer" />
          <View style={s.linkCol}>
            <View style={s.linkLine} />
            <View style={[s.linkBadge, { backgroundColor: helper.confirmed && employer.confirmed ? c.okSoft : c.warnSoft }]}>
              <Ionicons
                name={helper.confirmed && employer.confirmed ? 'link' : 'hourglass-outline'}
                size={14}
                color={helper.confirmed && employer.confirmed ? c.ok : c.warn}
              />
            </View>
            <View style={s.linkLine} />
          </View>
          <PartyCard person={helper} role="Helper" />
        </View>

        {/* ── Progress tracker ───────────────────────────────────────────── */}
        <Text style={[s.secLabel, { marginTop: 20 }]}>Progress</Text>
        <View style={s.tracker}>
          {stages.map((st, i) => {
            const tone = st.state === 'done' ? c.ok
              : st.state === 'active' ? c.accent
              : st.state === 'blocked' ? c.bad : c.subtle;
            const last = i === stages.length - 1;
            return (
              <MotiView
                key={st.key}
                from={{ opacity: 0, translateX: -8 }} animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 280, delay: i * 90 }}
                style={s.stageRow}
              >
                <View style={s.stageRail}>
                  <View style={[s.stageDot, { backgroundColor: st.state === 'todo' ? c.surface : tone, borderColor: tone }]}>
                    {st.state === 'done' && <Ionicons name="checkmark" size={11} color="#fff" />}
                    {st.state === 'active' && <View style={s.stagePulse} />}
                    {st.state === 'blocked' && <Ionicons name="close" size={11} color="#fff" />}
                  </View>
                  {!last && <View style={[s.stageLine, { backgroundColor: st.state === 'done' ? c.ok : c.line }]} />}
                </View>
                <View style={[s.stageBody, last && { paddingBottom: 0 }]}>
                  <Text style={[s.stageLabel, st.state === 'todo' && { color: c.subtle }]}>{st.label}</Text>
                  {!!st.detail && <Text style={s.stageDetail}>{st.detail}</Text>}
                </View>
              </MotiView>
            );
          })}
        </View>

        {/* ── Where and when ─────────────────────────────────────────────── */}
        <Text style={[s.secLabel, { marginTop: 20 }]}>Details</Text>
        <View style={s.detailBox}>
          <DetailRow icon="calendar-outline" label="Date & time"
            value={when ? when.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' }) : '—'} />
          <DetailRow icon={typeIcon} label="Format" value={iv.interview_type || '—'} />
          <DetailRow
            icon={iv.interview_type === 'Video Call' ? 'link-outline' : 'navigate-outline'}
            label={iv.interview_type === 'Video Call' ? 'Meeting link' : iv.interview_type === 'Phone' ? 'Phone number' : 'Location'}
            value={iv.location_or_link || 'Not provided'}
            selectable
          />
          <DetailRow icon="reader-outline" label="Application" value={`#${iv.application_id} · ${iv.application_status}`} last />
        </View>

        {!!iv.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Note from the employer, shown to the helper</Text>
            <Text style={s.notesText}>{iv.notes}</Text>
          </View>
        )}

        {/* ── Record the outcome ─────────────────────────────────────────── */}
        {!cancelled && (
          <>
            <Text style={[s.secLabel, { marginTop: 22 }]}>
              {recorded ? 'Recorded outcome' : 'Record the outcome'}
            </Text>

            {recorded ? (
              <View style={[s.recordedBox, { borderColor: resultTone + '55', backgroundColor: resultTone + '12' }]}>
                <Ionicons name="checkmark-done-circle" size={18} color={resultTone} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.recordedTitle, { color: resultTone }]}>{iv.result}</Text>
                  <Text style={s.recordedSub}>Both parties were notified when this was recorded.</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={s.resultRow}>
                  {RESULTS.map((r) => {
                    const tone = r.tone === 'ok' ? c.ok : r.tone === 'bad' ? c.bad : c.warn;
                    const on = result === r.key;
                    return (
                      <Pressable key={r.key} onPress={() => setResult(r.key)}
                        style={[s.resultCard, { borderColor: on ? tone : c.line }, on && { backgroundColor: tone + '12' }]}>
                        <Ionicons name={r.icon} size={20} color={on ? tone : c.subtle} />
                        <Text style={[s.resultLabel, on && { color: tone }]}>{r.label}</Text>
                        <Text style={s.resultSub}>{r.sub}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {result === 'No Show' && (
                  <View style={s.noShowRow}>
                    <Text style={s.noShowLabel}>Who did not attend?</Text>
                    <View style={s.noShowChips}>
                      {([['helper', helper.name], ['employer', employer.name], ['both', 'Neither party']] as [Party, string][]).map(([k, label]) => (
                        <Pressable key={k} onPress={() => setNoShowParty(k)}
                          style={[s.chip, noShowParty === k && { backgroundColor: c.warn, borderColor: c.warn }]}>
                          <Text style={[s.chipText, noShowParty === k && { color: '#fff' }]} numberOfLines={1}>{label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}


        {/* ── What the two parties said ──────────────────────────────────── */}
        <View style={s.privateHead}>
          <Ionicons name="lock-closed" size={13} color={c.accentInk} />
          <Text style={s.privateTitle}>How it went, from both sides — PESO only</Text>
        </View>
        <Text style={s.privateSub}>
          Both parties are asked to rate the interview once the date has passed. Ratings and comments here are read by
          PESO and super admin only — neither party sees what the other wrote.
        </Text>

        {partyFeedback.length === 0 ? (
          <View style={s.fbEmpty}>
            <Ionicons name="hourglass-outline" size={20} color={c.subtle} />
            <Text style={s.fbEmptyText}>
              {iv.is_past
                ? 'Neither party has answered yet. They were notified when this case was opened.'
                : 'They will be asked once the interview date has passed.'}
            </Text>
          </View>
        ) : (
          <>
            {partyFeedback.map((f: any) => (
              <View key={f.feedback_id} style={s.fbCard}>
                <View style={s.fbTop}>
                  <View style={[s.fbRole, { backgroundColor: f.role === 'helper' ? c.accentSoft : c.infoSoft }]}>
                    <Text style={[s.fbRoleText, { color: f.role === 'helper' ? c.accentInk : c.info }]}>
                      {f.role === 'helper' ? 'HELPER' : 'HOUSEHOLD EMPLOYER'}
                    </Text>
                  </View>
                  <Text style={s.fbName} numberOfLines={1}>{f.name}</Text>
                  <View style={s.fbStars}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Ionicons key={i} name={f.rating >= i ? 'star' : 'star-outline'} size={13} color={c.warn} />
                    ))}
                  </View>
                </View>
                {f.other_attended === false && (
                  <View style={s.fbNoShow}>
                    <Ionicons name="alert-circle" size={12} color={c.bad} />
                    <Text style={s.fbNoShowText}>Reported the other party did not attend</Text>
                  </View>
                )}
                {f.comment
                  ? <Text style={s.fbComment}>{f.comment}</Text>
                  : <Text style={s.fbNone}>Rated, but wrote no comment.</Text>}
              </View>
            ))}
            {/* Both sides answering is what makes a No-show call defensible. */}
            {partyFeedback.length === 1 && (
              <Text style={s.fbNone}>Only one side has answered so far.</Text>
            )}
          </>
        )}

                <Pressable
                  style={[s.submit, (!result || saving) && s.dim]}
                  disabled={!result || saving}
                  onPress={submit}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="send" size={16} color="#fff" />
                      <Text style={s.submitText}>Record outcome & notify both parties</Text>
                    </>
                  )}
                </Pressable>
                {!!error && <Text style={s.errorText}>{error}</Text>}
              </>
            )}
          </>
        )}

        {/* ── Private review history ─────────────────────────────────────── */}
        {reviews.length > 0 && (
          <>
            <View style={[s.privateHead, { marginTop: 22 }]}>
              <Ionicons name="lock-closed" size={13} color={c.accentInk} />
              <Text style={s.privateTitle}>PESO review history — not visible to either party</Text>
            </View>
            {reviews.map((rv) => (
              <View key={rv.review_id} style={s.reviewCard}>
                <View style={s.reviewTop}>
                  <Text style={[s.reviewResult, {
                    color: rv.result === 'Pass' ? c.ok : rv.result === 'Fail' ? c.bad : c.warn,
                  }]}>{rv.result}{rv.no_show_party ? ` · ${rv.no_show_party}` : ''}</Text>
                  <Text style={s.reviewMeta}>
                    {rv.reviewer_name || 'PESO'} · {rv.created_at ? new Date(rv.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : ''}
                  </Text>
                </View>
                {rv.private_notes
                  ? <Text style={s.reviewNotes}>{rv.private_notes}</Text>
                  : <Text style={s.reviewNone}>No notes were written.</Text>}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────
function PartyCard({ person, role }: { person: any; role: string }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const ok = !!person?.confirmed;
  return (
    <View style={s.party}>
      {person?.photo
        ? <Image source={{ uri: person.photo }} style={s.partyAvatar} />
        : <View style={[s.partyAvatar, s.partyAvatarFb]}><Ionicons name={role === 'Helper' ? 'person' : 'people'} size={20} color={c.subtle} /></View>}
      <Text style={s.partyRole}>{role.toUpperCase()}</Text>
      <Text style={s.partyName} numberOfLines={1}>{person?.name || '—'}</Text>
      {person?.location ? <Text style={s.partyMeta} numberOfLines={1}>{person.location}</Text> : null}
      <View style={[s.confirmPill, { backgroundColor: ok ? c.okSoft : c.warnSoft }]}>
        <Ionicons name={ok ? 'checkmark-circle' : 'time-outline'} size={12} color={ok ? c.ok : c.warn} />
        <Text style={[s.confirmText, { color: ok ? c.ok : c.warn }]}>{ok ? 'Confirmed' : 'Not confirmed'}</Text>
      </View>
      {person?.verification_status !== 'Verified' && (
        <Text style={s.partyWarn}>Not PESO verified</Text>
      )}
    </View>
  );
}

function DetailRow({ icon, label, value, last, selectable }: {
  icon: any; label: string; value: string; last?: boolean; selectable?: boolean;
}) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[s.detailRow, last && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={15} color={c.accent} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue} selectable={selectable} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  panel: { flex: 1, backgroundColor: c.surface },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
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

  nextBox: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1.4, borderRadius: radius.md, padding: 12, marginBottom: 18, backgroundColor: c.canvas },
  nextText: { flex: 1, fontFamily: font.semibold, fontSize: 12.5, color: c.ink, lineHeight: 18 },

  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  party: { flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 10, gap: 3 },
  partyAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft, marginBottom: 4 },
  partyAvatarFb: { alignItems: 'center', justifyContent: 'center' },
  partyRole: { fontFamily: font.semibold, fontSize: 9, letterSpacing: 0.8, color: c.subtle },
  partyName: { fontFamily: font.semibold, fontSize: 13.5, color: c.ink, textAlign: 'center' },
  partyMeta: { fontFamily: font.regular, fontSize: 11, color: c.subtle, textAlign: 'center' },
  confirmPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, marginTop: 5 },
  confirmText: { fontFamily: font.semibold, fontSize: 10.5 },
  partyWarn: { fontFamily: font.semibold, fontSize: 10, color: c.warn, marginTop: 3 },
  linkCol: { alignItems: 'center', width: 34 },
  linkLine: { width: 1.5, flex: 1, minHeight: 16, backgroundColor: c.line },
  linkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginVertical: 3 },

  tracker: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 14 },
  stageRow: { flexDirection: 'row', gap: 11 },
  stageRail: { alignItems: 'center', width: 20 },
  stageDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stagePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  stageLine: { width: 2, flex: 1, minHeight: 18, marginVertical: 2 },
  stageBody: { flex: 1, minWidth: 0, paddingBottom: 16 },
  stageLabel: { fontFamily: font.semibold, fontSize: 13, color: c.ink },
  stageDetail: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 2, lineHeight: 16.5 },

  detailBox: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, paddingHorizontal: 13 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  detailLabel: { fontFamily: font.regular, fontSize: 12.5, color: c.muted, minWidth: 96 },
  detailValue: { flex: 1, fontFamily: font.semibold, fontSize: 12.5, color: c.ink, textAlign: 'right' },

  notesBox: { backgroundColor: c.sunken, borderRadius: radius.md, padding: 12, marginTop: 12 },
  notesLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: c.subtle, marginBottom: 5 },
  notesText: { fontFamily: font.regular, fontSize: 12.5, color: c.ink, lineHeight: 18 },

  resultRow: { flexDirection: 'row', gap: 9 },
  resultCard: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: c.canvas, borderWidth: 1.6, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 8 },
  resultLabel: { fontFamily: font.semibold, fontSize: 12.5, color: c.ink, textAlign: 'center' },
  resultSub: { fontFamily: font.regular, fontSize: 10, color: c.subtle, textAlign: 'center', lineHeight: 14 },

  noShowRow: { marginTop: 12 },
  noShowLabel: { fontFamily: font.semibold, fontSize: 12, color: c.muted, marginBottom: 7 },
  noShowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, maxWidth: 190 },
  chipText: { fontFamily: font.semibold, fontSize: 12, color: c.ink },

  fbEmpty: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 13 },
  fbEmptyText: { flex: 1, fontFamily: font.regular, fontSize: 12.5, color: c.muted, lineHeight: 18 },
  fbCard: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 12, marginBottom: 9 },
  fbTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' },
  fbRole: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  fbRoleText: { fontFamily: font.semibold, fontSize: 9, letterSpacing: 0.6 },
  fbName: { flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 13, color: c.ink },
  fbStars: { flexDirection: 'row', gap: 1 },
  fbComment: { fontFamily: font.regular, fontSize: 12.5, color: c.ink, lineHeight: 18 },
  fbNone: { fontFamily: font.regular, fontSize: 12, color: c.subtle, fontStyle: 'italic' },
  fbNoShow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.badSoft, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 7, alignSelf: 'flex-start' },
  fbNoShowText: { fontFamily: font.semibold, fontSize: 11, color: c.bad },
  privateHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 4 },
  privateTitle: { fontFamily: font.semibold, fontSize: 12, color: c.accentInk },
  privateSub: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, lineHeight: 16.5, marginBottom: 9 },
  input: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 13, minHeight: 92, fontFamily: font.regular, fontSize: 13.5, color: c.ink, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },

  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.accent, borderRadius: radius.md, paddingVertical: 14, marginTop: 14 },
  submitText: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5 },
  dim: { opacity: 0.45 },
  errorText: { fontFamily: font.regular, fontSize: 12, color: c.bad, marginTop: 8, textAlign: 'center' },

  recordedBox: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1.4, borderRadius: radius.lg, padding: 14 },
  recordedTitle: { fontFamily: font.display, fontSize: 15 },
  recordedSub: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 2 },

  reviewCard: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 12, marginBottom: 9 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5 },
  reviewResult: { fontFamily: font.semibold, fontSize: 12.5 },
  reviewMeta: { fontFamily: font.regular, fontSize: 11, color: c.subtle, flexShrink: 1, textAlign: 'right' },
  reviewNotes: { fontFamily: font.regular, fontSize: 12.5, color: c.ink, lineHeight: 18 },
  reviewNone: { fontFamily: font.regular, fontSize: 12, color: c.subtle, fontStyle: 'italic' },
});
