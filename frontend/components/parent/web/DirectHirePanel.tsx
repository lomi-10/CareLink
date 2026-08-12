// components/parent/web/DirectHirePanel.tsx
//
// Direct hire offer — the WEB version.
//
// Deliberately NOT the mobile modal. This renders inline in the browse screen's
// right-hand pane, alongside ProfilePanel and InvitePanel, because the point of
// the web layout is that a detail view never becomes a pop-up you scroll
// through. (The pane's own empty state says "no pop-ups" — this honours that.)
//
// The terms are laid out in PAIRS across the pane's width — title+start,
// salary+arrangement, hours beside it — so the full set fits with little or no
// scrolling. On desktop the scarce resource is vertical space, not horizontal,
// and stacking mobile-style wastes the half of the pane that is already there.
//
// Why it still asks for the full terms at all: see create_direct_hire_offer.php.
// Short version — the terms ARE the protection; skipping them would mean the
// helper accepts blind, which RA 10361 exists to prevent.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useMasterData } from '@/hooks/parent';
import { pt, ACCENT_GRADIENT } from './parentWebTheme';

const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;

/** Mirrors DIRECT_HIRE_MIN_MONTHLY on the server. */
const MIN_MONTHLY = 7000;

const PERIODS    = ['Monthly', 'Weekly', 'Daily'] as const;
const EMPLOYMENT = ['Stay-in', 'Stay-out', 'Any'] as const;
const SCHEDULE   = ['Full-time', 'Part-time', 'Any'] as const;

export function DirectHirePanel({ helper, onSent, onBack }: {
  helper: any;
  onSent: (name: string) => void;
  onBack: () => void;
}) {
  const { masterCategories, masterJobs, loadingMaster } = useMasterData();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [jobIds, setJobIds] = useState<number[]>([]);
  const [salary, setSalary] = useState('');
  const [period, setPeriod] = useState<typeof PERIODS[number]>('Monthly');
  const [employment, setEmployment] = useState('');
  const [schedule, setSchedule] = useState('');
  const [startDate, setStartDate] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const helperName = helper?.full_name || helper?.helper_name || 'this helper';
  const roles = useMemo(
    () => masterJobs.filter((j: any) => Number(j.category_id) === Number(categoryId)),
    [masterJobs, categoryId],
  );

  const send = async () => {
    const n = Number(String(salary).replace(/[^0-9.]/g, ''));
    if (!title.trim())  return setError('Give the job a short title.');
    if (!categoryId)    return setError('Choose the kind of work.');
    if (!employment)    return setError('Choose stay-in or stay-out.');
    if (!schedule)      return setError('Choose full-time or part-time.');
    if (!n || n <= 0)   return setError('State the salary you are offering.');
    if (period === 'Monthly' && n < MIN_MONTHLY) {
      return setError(`Monthly salary must be at least ₱${MIN_MONTHLY.toLocaleString()}.`);
    }

    setSending(true); setError('');
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/parent/create_direct_hire_offer.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: user.user_id, requester_id: user.user_id, helper_id: helper?.user_id,
          title: title.trim(), category_id: categoryId, job_ids: jobIds,
          salary: n, salary_period: period,
          employment_type: employment, work_schedule: schedule,
          start_date: startDate.trim() || undefined,
          description: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not send the offer.');
      setSent(true);
      onSent(helperName);
    } catch (e: any) {
      setError(e?.message || 'Could not send the offer.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={d.done}>
        <Ionicons name="shield-checkmark" size={40} color={pt.accent} />
        <Text style={d.doneTitle}>Offer sent to PESO</Text>
        <Text style={d.doneSub}>
          PESO is reviewing your terms — usually less than a day. {helperName} receives the offer
          once the terms are approved, and you&apos;ll be notified either way.
        </Text>
        <Pressable onPress={onBack} style={({ hovered }: any) => [d.backBtn, TRANS, hovered && { borderColor: pt.accent }]}>
          <Text style={d.backText}>Back to profile</Text>
        </Pressable>
      </View>
    );
  }

  const Chips = ({ items, value, onPick, small }: {
    items: readonly string[]; value: string; onPick: (v: string) => void; small?: boolean;
  }) => (
    <View style={d.chips}>
      {items.map((it) => {
        const on = value === it;
        return (
          <Pressable key={it} onPress={() => onPick(it)}
            style={({ hovered }: any) => [small ? d.chipSm : d.chip, on && d.chipOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
            <Text style={[d.chipText, on && d.chipTextOn]}>{it}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={d.wrap}>
      <Text style={d.title}>Direct hire offer</Text>
      <Text style={d.sub}>A private offer to {helperName} — never posted publicly.</Text>

      <View style={d.notice}>
        <Ionicons name="information-circle" size={15} color={pt.ink} />
        <Text style={d.noticeText}>
          These terms are required so the helper knows exactly what they&apos;re accepting.
          PESO checks them against the Kasambahay Law before the helper ever sees the offer.
        </Text>
      </View>

      {/* Paired rows — this is what keeps the whole form on one screen. */}
      <View style={d.grid}>
        <View style={d.col}>
          <Text style={d.label}>Job title *</Text>
          <TextInput style={d.input} value={title} onChangeText={setTitle}
            placeholder="Househelp for a family of four" placeholderTextColor={pt.subtle} />
        </View>
        <View style={d.col}>
          <Text style={d.label}>Preferred start</Text>
          <TextInput style={d.input} value={startDate} onChangeText={setStartDate}
            placeholder="Sept 1, or ASAP" placeholderTextColor={pt.subtle} />
        </View>
      </View>

      <Text style={d.label}>Kind of work *</Text>
      {loadingMaster ? <ActivityIndicator color={pt.accent} /> : (
        <View style={d.chips}>
          {masterCategories.map((c: any) => {
            const on = Number(categoryId) === Number(c.category_id);
            return (
              <Pressable key={c.category_id}
                onPress={() => { setCategoryId(Number(c.category_id)); setJobIds([]); }}
                style={({ hovered }: any) => [d.chip, on && d.chipOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                <Text style={[d.chipText, on && d.chipTextOn]}>{c.category_name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {roles.length > 0 && (
        <>
          <Text style={d.label}>Duties (optional)</Text>
          <View style={d.chips}>
            {roles.map((j: any) => {
              const on = jobIds.includes(Number(j.job_id));
              return (
                <Pressable key={j.job_id}
                  onPress={() => setJobIds((p) => on ? p.filter((x) => x !== Number(j.job_id)) : [...p, Number(j.job_id)])}
                  style={({ hovered }: any) => [d.chip, on && d.chipOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                  <Text style={[d.chipText, on && d.chipTextOn]}>{j.job_title}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <View style={d.grid}>
        <View style={d.col}>
          <Text style={d.label}>Salary *</Text>
          <TextInput style={d.input} value={salary} inputMode="numeric"
            onChangeText={(v) => setSalary(v.replace(/[^0-9]/g, ''))}
            placeholder="8000" placeholderTextColor={pt.subtle} />
          <View style={{ marginTop: 6 }}>
            <Chips items={PERIODS} value={period} onPick={(v) => setPeriod(v as any)} small />
          </View>
        </View>
        <View style={d.col}>
          <Text style={d.label}>Arrangement *</Text>
          <Chips items={EMPLOYMENT} value={employment} onPick={setEmployment} small />
          <Text style={[d.label, { marginTop: 10 }]}>Hours *</Text>
          <Chips items={SCHEDULE} value={schedule} onPick={setSchedule} small />
        </View>
      </View>

      <Text style={d.hint}>
        CareLink&apos;s minimum is ₱{MIN_MONTHLY.toLocaleString()}/month, above the legal floor.
        SSS, PhilHealth and Pag-IBIG are on top.
      </Text>

      <Text style={d.label}>Anything else (optional)</Text>
      <TextInput style={[d.input, { minHeight: 58, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} multiline
        placeholder="Benefits, rest days, or anything the helper should know." placeholderTextColor={pt.subtle} />

      {!!error && (
        <View style={d.errRow}>
          <Ionicons name="alert-circle" size={14} color={pt.red} />
          <Text style={d.errText}>{error}</Text>
        </View>
      )}

      <Pressable disabled={sending} onPress={send}
        style={({ hovered, pressed }: any) => [{ marginTop: 14 }, TRANS, sending && { opacity: 0.5 }, hovered && !sending && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
        <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={d.sendBtn}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="paper-plane" size={16} color="#fff" />
              <Text style={d.sendText}>Send for PESO review</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const d = StyleSheet.create({
  wrap: { padding: 20 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: pt.ink },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 2, marginBottom: 12 },

  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: pt.accentSoft, borderRadius: 10, padding: 10, marginBottom: 10 },
  noticeText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.ink, lineHeight: 16 },

  grid: { flexDirection: 'row', gap: 14 },
  col: { flex: 1, minWidth: 0 },

  label: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink, marginBottom: 5, marginTop: 8 },
  input: {
    backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 9, fontSize: 13.5, color: pt.ink,
    fontFamily: FontFamily.fredokaRegular, outlineStyle: 'none' as any,
  },
  hint: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.subtle, marginTop: 8, lineHeight: 15 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  chipSm: { borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  chipOn: { backgroundColor: pt.accent, borderColor: pt.accent },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: pt.muted },
  chipTextOn: { color: '#fff' },

  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  errText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.red },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13 },
  sendText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  done: { padding: 26, alignItems: 'center' },
  doneTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: pt.ink, marginTop: 10 },
  doneSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  backBtn: { marginTop: 16, borderWidth: 1, borderColor: pt.line, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
});
