// components/parent/hire/DirectHireOfferModal.tsx
//
// "Send Direct Hire Offer" — for an employer who already knows the helper they
// want and doesn't need to publish a job post and wait for applicants.
//
// WHY THIS STILL ASKS FOR THE FULL TERMS:
// It would be easy to make this a one-tap "I'll hire you" button. That is the
// wrong shortcut. A job post is not paperwork for CareLink's benefit — it is
// what forces the employer to state salary, arrangement and duties BEFORE the
// helper commits. Remove it and the helper accepts blind, which is the exact
// situation the Kasambahay Law (RA 10361) exists to prevent.
//
// So this collects the same terms a public post would, and creates a real job
// post behind the scenes. What it skips is the PUBLICNESS, not the protections:
// PESO still reviews it, the same contract is generated, both parties still
// sign. It is faster, not lighter — and the copy says so plainly, because an
// employer who expects a shortcut should understand why there isn't one.

import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontFamily } from '@/constants/GlobalStyles';
import API_URL from '@/constants/api';
import { useMasterData } from '@/hooks/parent';

const BROWN = '#8B5A2B';
const DARK  = '#2A1608';
const MUTED = '#7A5C3E';
const LINE  = '#EFE0CB';
const INPUT = '#FDF5E8';

/** CareLink's fair-pay floor — mirrors DIRECT_HIRE_MIN_MONTHLY on the server. */
const MIN_MONTHLY = 7000;

const EMPLOYMENT = ['Stay-in', 'Stay-out', 'Any'] as const;
const SCHEDULE   = ['Full-time', 'Part-time', 'Any'] as const;
const PERIODS    = ['Monthly', 'Weekly', 'Daily'] as const;

export function DirectHireOfferModal({
  visible, onClose, helperId, helperName, onSent,
}: {
  visible: boolean;
  onClose: () => void;
  helperId: number | string | null;
  helperName?: string;
  onSent?: () => void;
}) {
  const { masterCategories, masterJobs, loadingMaster } = useMasterData();

  const [title, setTitle]       = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [jobIds, setJobIds]     = useState<number[]>([]);
  const [salary, setSalary]     = useState('');
  const [period, setPeriod]     = useState<typeof PERIODS[number]>('Monthly');
  const [employment, setEmployment] = useState<typeof EMPLOYMENT[number] | ''>('');
  const [schedule, setSchedule] = useState<typeof SCHEDULE[number] | ''>('');
  const [startDate, setStartDate] = useState('');
  const [duties, setDuties]     = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sent, setSent]         = useState(false);

  const rolesForCategory = useMemo(
    () => masterJobs.filter((j: any) => Number(j.category_id) === Number(categoryId)),
    [masterJobs, categoryId],
  );

  const reset = () => {
    setTitle(''); setCategoryId(null); setJobIds([]); setSalary('');
    setPeriod('Monthly'); setEmployment(''); setSchedule('');
    setStartDate(''); setDuties(''); setError(null); setSent(false); setBusy(false);
  };
  const close = () => { reset(); onClose(); };

  const toggleRole = (id: number) =>
    setJobIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const validate = (): string | null => {
    if (!title.trim())     return 'Give the job a short title, e.g. “Househelp for a family of four”.';
    if (!categoryId)       return 'Choose the kind of work this is.';
    if (!employment)       return 'Choose stay-in or stay-out.';
    if (!schedule)         return 'Choose full-time or part-time.';
    const n = Number(salary.replace(/[^0-9.]/g, ''));
    if (!n || n <= 0)      return 'State the salary you are offering.';
    if (period === 'Monthly' && n < MIN_MONTHLY) {
      return `Monthly salary must be at least ₱${MIN_MONTHLY.toLocaleString()}.`;
    }
    return null;
  };

  const send = async () => {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const id  = String((raw ? JSON.parse(raw) : {})?.user_id ?? '');
      if (!id) throw new Error('Please sign in again.');

      const res = await fetch(`${API_URL}/parent/create_direct_hire_offer.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: id, requester_id: id, helper_id: helperId,
          title: title.trim(),
          category_id: categoryId,
          job_ids: jobIds,
          salary: Number(salary.replace(/[^0-9.]/g, '')),
          salary_period: period,
          employment_type: employment,
          work_schedule: schedule,
          start_date: startDate.trim() || undefined,
          description: duties.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not send the offer.');
      setSent(true);
      onSent?.();
    } catch (e: any) {
      setError(e?.message || 'Could not send the offer.');
    } finally {
      setBusy(false);
    }
  };

  // ── Sent confirmation ──
  if (sent) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={s.overlay}>
          <View style={[s.card, { alignItems: 'center' }]}>
            <View style={s.okIcon}><Ionicons name="shield-checkmark" size={34} color={BROWN} /></View>
            <Text style={s.title}>Offer sent to PESO</Text>
            <Text style={[s.body, { textAlign: 'center' }]}>
              PESO is reviewing your terms — this usually takes less than a day.
              {'\n\n'}
              {helperName ? `${helperName} will receive the offer` : 'The helper will receive it'} as
              soon as the terms are approved, and can then accept or decline. You&apos;ll be notified either way.
            </Text>
            <TouchableOpacity style={s.primaryBtn} onPress={close} activeOpacity={0.88}>
              <Text style={s.primaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Direct hire offer</Text>
              <Text style={s.sub}>{helperName ? `A private offer to ${helperName}.` : 'A private offer to this helper.'}</Text>
            </View>
            <TouchableOpacity onPress={close} hitSlop={10}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
          </View>

          {/* Says plainly why the form exists, so the terms don't feel like busywork. */}
          <View style={s.notice}>
            <Ionicons name="information-circle" size={16} color={BROWN} />
            <Text style={s.noticeText}>
              These terms are required so the helper knows exactly what they&apos;re accepting.
              PESO reviews them against the Kasambahay Law before the helper sees the offer.
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Job title <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle}
              placeholder="e.g. Househelp for a family of four" placeholderTextColor="#B8956A" />

            <Text style={s.label}>Kind of work <Text style={s.req}>*</Text></Text>
            {loadingMaster ? <ActivityIndicator color={BROWN} style={{ marginVertical: 8 }} /> : (
              <View style={s.chipWrap}>
                {masterCategories.map((c: any) => {
                  const on = Number(categoryId) === Number(c.category_id);
                  return (
                    <TouchableOpacity key={c.category_id}
                      style={[s.chip, on && s.chipOn]}
                      onPress={() => { setCategoryId(Number(c.category_id)); setJobIds([]); }}>
                      <Text style={[s.chipText, on && s.chipTextOn]}>{c.category_name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {rolesForCategory.length > 0 && (
              <>
                <Text style={s.label}>Specific duties <Text style={s.opt}>(optional)</Text></Text>
                <View style={s.chipWrap}>
                  {rolesForCategory.map((j: any) => {
                    const on = jobIds.includes(Number(j.job_id));
                    return (
                      <TouchableOpacity key={j.job_id} style={[s.chip, on && s.chipOn]} onPress={() => toggleRole(Number(j.job_id))}>
                        <Text style={[s.chipText, on && s.chipTextOn]}>{j.job_title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={s.label}>Salary <Text style={s.req}>*</Text></Text>
            <View style={s.row}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={salary}
                onChangeText={(v) => setSalary(v.replace(/[^0-9]/g, ''))}
                placeholder="8000" placeholderTextColor="#B8956A" keyboardType="number-pad"
              />
              <View style={[s.chipWrap, { flex: 1, marginBottom: 0 }]}>
                {PERIODS.map((p) => (
                  <TouchableOpacity key={p} style={[s.chipSm, period === p && s.chipOn]} onPress={() => setPeriod(p)}>
                    <Text style={[s.chipText, period === p && s.chipTextOn]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={s.hint}>CareLink&apos;s minimum is ₱{MIN_MONTHLY.toLocaleString()}/month, above the legal floor. SSS, PhilHealth and Pag-IBIG are on top.</Text>

            <Text style={s.label}>Arrangement <Text style={s.req}>*</Text></Text>
            <View style={s.chipWrap}>
              {EMPLOYMENT.map((e) => (
                <TouchableOpacity key={e} style={[s.chip, employment === e && s.chipOn]} onPress={() => setEmployment(e)}>
                  <Text style={[s.chipText, employment === e && s.chipTextOn]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Hours <Text style={s.req}>*</Text></Text>
            <View style={s.chipWrap}>
              {SCHEDULE.map((w) => (
                <TouchableOpacity key={w} style={[s.chip, schedule === w && s.chipOn]} onPress={() => setSchedule(w)}>
                  <Text style={[s.chipText, schedule === w && s.chipTextOn]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Preferred start <Text style={s.opt}>(optional)</Text></Text>
            <TextInput style={s.input} value={startDate} onChangeText={setStartDate}
              placeholder="e.g. Sept 1, or As soon as possible" placeholderTextColor="#B8956A" />

            <Text style={s.label}>Anything else <Text style={s.opt}>(optional)</Text></Text>
            <TextInput style={[s.input, { minHeight: 78, textAlignVertical: 'top' }]} value={duties} onChangeText={setDuties}
              placeholder="Benefits, rest days, or anything the helper should know." placeholderTextColor="#B8956A" multiline />

            {!!error && <Text style={s.error}>{error}</Text>}
          </ScrollView>

          <TouchableOpacity style={[s.primaryBtn, busy && { opacity: 0.6 }]} onPress={send} disabled={busy} activeOpacity={0.88}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="paper-plane" size={16} color="#fff" />
                <Text style={s.primaryText}>Send for PESO review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { width: '100%', maxWidth: 480, maxHeight: '92%', backgroundColor: '#FFFDF9', borderRadius: 22, padding: 20 },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: DARK },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, marginTop: 2 },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, lineHeight: 21, marginBottom: 18 },

  okIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F5E6CC', alignItems: 'center', justifyContent: 'center', marginBottom: 14, marginTop: 6 },

  notice: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FDF5E8', borderRadius: 12, padding: 11, marginBottom: 14 },
  noticeText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: BROWN, lineHeight: 17 },

  label: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK, marginBottom: 6, marginTop: 4 },
  req: { color: '#C4552A' },
  opt: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#B8956A' },
  input: {
    backgroundColor: INPUT, borderWidth: 1, borderColor: LINE, borderRadius: 11,
    paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: DARK,
    fontFamily: FontFamily.fredokaRegular, marginBottom: 10,
    ...Platform.select({ web: { outlineStyle: 'none' } as any, default: {} }),
  },
  hint: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: '#B8956A', marginTop: 6, marginBottom: 4, lineHeight: 16 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: LINE, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipSm: { borderWidth: 1, borderColor: LINE, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  chipOn: { backgroundColor: BROWN, borderColor: BROWN },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: MUTED },
  chipTextOn: { color: '#fff' },

  error: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#DC2626', marginTop: 8, marginBottom: 4 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BROWN, borderRadius: 14, paddingVertical: 15, marginTop: 14, alignSelf: 'stretch',
  },
  primaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },
});
