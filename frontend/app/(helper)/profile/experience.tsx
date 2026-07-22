// app/(helper)/profile/experience.tsx
// Work Experience & References — helper adds past employers with an optional
// contactable reference. Self-contained editor (not the shared modal): loads
// work_history via useHelperProfile, saves it back through helper/update_profile.php.
// PHP: helper/get_profile.php (read), helper/update_profile.php (write)

import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHelperProfile, type WorkHistoryEntry } from '@/hooks/helper';
import { HelperTabBar } from '@/components/helper/home';
import { NotificationModal } from '@/components/shared';
import API_URL from '@/constants/api';

const PAGE_BG = '#FBF5EC', DARK = '#2A1608', MUTED = '#7A5C3E', ORANGE = '#E86019';
const CARD = '#FFFFFF', LINE = '#EFE0CB', RAISE = '#FDF7EE', GREEN = '#059669', RED = '#DC2626';

const isCurrent = (w: WorkHistoryEntry) => w.end_date === null || w.end_date === undefined;

export default function ExperienceScreen() {
  const router = useRouter();
  const { profileData, loading, refresh } = useHelperProfile();
  const { edit } = useLocalSearchParams<{ edit?: string }>();

  const [rows, setRows] = useState<WorkHistoryEntry[]>([]);
  const [years, setYears] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  const workHistory = useMemo(() => profileData?.work_history ?? [], [profileData]);
  const p: any = profileData?.profile ?? {};
  const U: any = profileData?.user ?? {};

  const seed = () => {
    setRows((profileData?.work_history ?? []).map((w) => ({ ...w })));
    setYears(String(p.years_experience ?? p.experience_years ?? ''));
  };
  useEffect(() => { if (edit === '1' && profileData) { seed(); setEditing(true); } /* eslint-disable-next-line */ }, [edit, profileData]);

  const startEdit = () => { seed(); setEditing(true); };
  const addRow = () => setRows((r) => [...r, { employer_name: '', position: '', start_date: '', end_date: null, duties: '', reason_for_leaving: '', employer_contact: '', can_contact: false }]);
  const patch = (i: number, x: Partial<WorkHistoryEntry>) => setRows((r) => r.map((row, k) => (k === i ? { ...row, ...x } : row)));
  const remove = (i: number) => setRows((r) => r.filter((_, k) => k !== i));

  // Real calendar for work-history dates — a native picker, a date input on web.
  // One piece of state tracks which row+field is open.
  const [datePicker, setDatePicker] = useState<{ index: number; field: 'start_date' | 'end_date' } | null>(null);
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseYmd = (v: string) => { const d = new Date((v || '') + 'T00:00:00'); return isNaN(d.getTime()) ? new Date(2020, 0, 1) : d; };

  const dateField = (i: number, field: 'start_date' | 'end_date', value: string, placeholder: string) => {
    if (Platform.OS === 'web') {
      return React.createElement('input', {
        type: 'date',
        value: value || '',
        max: ymd(new Date()),
        onChange: (e: any) => patch(i, { [field]: e.target.value || '' } as Partial<WorkHistoryEntry>),
        style: {
          padding: 11, border: '1.4px solid ' + LINE, borderRadius: 12, fontSize: 14.5, width: '100%',
          fontFamily: 'inherit', backgroundColor: '#fff', color: DARK, boxSizing: 'border-box',
        } as any,
      });
    }
    const isOpen = datePicker?.index === i && datePicker?.field === field;
    return (
      <>
        <TouchableOpacity style={s.dateBtn} onPress={() => setDatePicker({ index: i, field })} activeOpacity={0.85}>
          <Ionicons name="calendar-outline" size={17} color={ORANGE} />
          <Text style={[s.dateBtnText, !value && { color: '#B8956A' }]} numberOfLines={1}>
            {value ? new Date(value + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : placeholder}
          </Text>
        </TouchableOpacity>
        {isOpen && (
          <DateTimePicker
            value={parseYmd(value)} mode="date" display="default"
            maximumDate={new Date()} minimumDate={new Date(1960, 0, 1)}
            onChange={(_, d) => { setDatePicker(null); if (d) patch(i, { [field]: ymd(d) } as Partial<WorkHistoryEntry>); }}
          />
        )}
      </>
    );
  };

  // update_profile.php overwrites EVERY scalar column, so we must resend the full
  // profile (name/contact/bio/address/salary) and only override experience_years +
  // work_history — otherwise the save wipes the rest of the profile. Mirrors the
  // web editor's save() in HelperProfileWeb.tsx exactly.
  const save = async () => {
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const cleaned = rows
        .filter((w) => w.employer_name.trim() && w.position.trim() && w.start_date)
        .map((w) => ({
          employer_name: w.employer_name.trim(),
          position: w.position.trim(),
          start_date: w.start_date,
          end_date: w.end_date || null,
          duties: (w.duties ?? '').trim() || null,
          reason_for_leaving: (w.reason_for_leaving ?? '').trim() || null,
          employer_contact: w.can_contact ? ((w.employer_contact ?? '').trim() || null) : null,
          can_contact: w.can_contact ? 1 : 0,
        }));

      const base: Record<string, string> = {
        user_id: String(user.user_id ?? U.user_id ?? ''), requester_id: String(user.user_id ?? U.user_id ?? ''),
        first_name: U.first_name ?? '', middle_name: U.middle_name ?? '', last_name: U.last_name ?? '', username: U.username ?? '',
        contact_number: p.contact_number ?? '', birth_date: (p.birth_date ?? p.date_of_birth ?? '') || '',
        gender: p.gender ?? '', civil_status: p.civil_status ?? 'Single', religion: p.religion ?? '',
        province: p.province ?? '', municipality: (p.municipality ?? p.city) ?? '', barangay: p.barangay ?? '',
        address: p.address ?? '', landmark: p.landmark ?? '', bio: p.bio ?? '', education_level: p.education_level ?? '',
        employment_type: p.employment_type ?? 'Any', work_schedule: p.work_schedule ?? 'Full-time',
        expected_salary: String(p.expected_salary ?? 6000), salary_period: p.salary_period ?? 'Monthly',
        // overrides:
        experience_years: years || '0',
        work_history: JSON.stringify(cleaned),
      };
      // gender & education_level are nullable enums — sending '' would truncate,
      // so omit them when empty and let the backend keep NULL/its default.
      const OMIT_IF_EMPTY = new Set(['gender', 'education_level']);
      const fd = new FormData();
      Object.entries(base).forEach(([k, v]) => {
        if (OMIT_IF_EMPTY.has(k) && (v ?? '') === '') return;
        fd.append(k, v ?? '');
      });

      const res = await fetch(`${API_URL}/helper/update_profile.php`, { method: 'POST', body: fd });
      const data = JSON.parse(await res.text());
      if (data.success) {
        setNotif({ visible: true, message: 'Work experience saved.', type: 'success' });
        setEditing(false);
        refresh();
      } else {
        setNotif({ visible: true, message: data.message || 'Could not save.', type: 'error' });
      }
    } catch {
      setNotif({ visible: true, message: 'Could not save. Check your connection.', type: 'error' });
    } finally { setSaving(false); }
  };

  const range = (start: string, end?: string | null) => {
    const fmt = (d?: string | null) => { if (!d) return ''; const dt = new Date(String(d).replace(' ', 'T')); return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }); };
    return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={ORANGE} /></View>;
  }

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => (editing ? setEditing(false) : router.back())}>
            <Ionicons name={editing ? 'close' : 'arrow-back'} size={24} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Work Experience</Text>
          {editing ? <View style={{ width: 42 }} /> : (
            <TouchableOpacity style={s.editBtn} onPress={startEdit}>
              <Ionicons name="create-outline" size={16} color={ORANGE} />
              <Text style={s.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {!editing ? (
              // ── Read view ──
              <>
                <View style={s.card}>
                  <Text style={s.cardLabel}>Total Years of Experience</Text>
                  <Text style={s.cardValue}>{Number(p.years_experience) > 0 ? `${p.years_experience} years` : 'Not set'}</Text>
                </View>

                {workHistory.length === 0 ? (
                  <View style={s.empty}>
                    <View style={s.emptyIc}><Ionicons name="briefcase-outline" size={30} color={ORANGE} /></View>
                    <Text style={s.emptyTitle}>Add your work history</Text>
                    <Text style={s.emptySub}>Past employers make you far more trustworthy to families — and you can mark ones happy to be a reference.</Text>
                    <TouchableOpacity style={s.emptyBtn} onPress={startEdit}>
                      <Ionicons name="add" size={18} color="#fff" /><Text style={s.emptyBtnText}>Add work history</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  workHistory.map((w, i) => (
                    <View key={w.history_id ?? i} style={s.card}>
                      <View style={s.whHead}>
                        <Text style={s.whRole}>{w.position}</Text>
                        {w.can_contact && (
                          <View style={s.refBadge}><Ionicons name="call-outline" size={11} color={GREEN} /><Text style={s.refBadgeText}>Reference</Text></View>
                        )}
                      </View>
                      <Text style={s.whEmployer}>{w.employer_name}</Text>
                      <Text style={s.whDates}>{range(w.start_date, w.end_date)}</Text>
                      {!!w.duties && <Text style={s.whDuties}>{w.duties}</Text>}
                    </View>
                  ))
                )}
              </>
            ) : (
              // ── Edit view ──
              <>
                <Text style={s.fLabel}>Total Years of Experience</Text>
                <TextInput style={s.input} value={years} onChangeText={(v) => setYears(v.replace(/[^0-9]/g, ''))} placeholder="3" placeholderTextColor="#B8956A" keyboardType="number-pad" />

                <Text style={s.sectionTitle}>Past Employers</Text>
                {rows.map((w, i) => (
                  <View key={i} style={s.editCard}>
                    <View style={s.editCardTop}>
                      <Text style={s.editCardNum}>Job {i + 1}</Text>
                      <TouchableOpacity onPress={() => remove(i)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={RED} /></TouchableOpacity>
                    </View>
                    <Text style={s.fLabel}>Employer / Family name</Text>
                    <TextInput style={s.input} value={w.employer_name} onChangeText={(v) => patch(i, { employer_name: v })} placeholder="e.g. Dela Cruz Family" placeholderTextColor="#B8956A" />
                    <Text style={s.fLabel}>Your role</Text>
                    <TextInput style={s.input} value={w.position} onChangeText={(v) => patch(i, { position: v })} placeholder="e.g. Yaya / Housekeeper" placeholderTextColor="#B8956A" />
                    <View style={s.dateRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.fLabel}>Start date</Text>
                        {dateField(i, 'start_date', w.start_date, 'Select date')}
                      </View>
                      {!isCurrent(w) && (
                        <View style={{ flex: 1 }}>
                          <Text style={s.fLabel}>End date</Text>
                          {dateField(i, 'end_date', w.end_date ?? '', 'Select date')}
                        </View>
                      )}
                    </View>
                    <Pressable style={s.checkRow} onPress={() => patch(i, { end_date: isCurrent(w) ? '' : null })}>
                      <Ionicons name={isCurrent(w) ? 'checkbox' : 'square-outline'} size={20} color={isCurrent(w) ? ORANGE : MUTED} />
                      <Text style={s.checkText}>I currently work here</Text>
                    </Pressable>
                    <Text style={s.fLabel}>Main duties <Text style={s.opt}>(optional)</Text></Text>
                    <TextInput style={[s.input, s.multiline]} value={w.duties ?? ''} onChangeText={(v) => patch(i, { duties: v })} placeholder="Cooking, laundry, caring for 2 kids" placeholderTextColor="#B8956A" multiline />
                    <Text style={s.fLabel}>Reason for leaving <Text style={s.opt}>(optional)</Text></Text>
                    <TextInput style={s.input} value={w.reason_for_leaving ?? ''} onChangeText={(v) => patch(i, { reason_for_leaving: v })} placeholder="e.g. Contract ended" placeholderTextColor="#B8956A" />
                    <View style={s.refToggle}>
                      <Text style={s.refToggleText}>This employer can be contacted as a reference</Text>
                      <Switch value={!!w.can_contact} onValueChange={(v) => patch(i, { can_contact: v })} trackColor={{ true: ORANGE, false: '#D9C4A6' }} thumbColor="#fff" />
                    </View>
                    {w.can_contact && (
                      <>
                        <Text style={s.fLabel}>Employer contact number <Text style={s.opt}>(optional)</Text></Text>
                        <TextInput style={s.input} value={w.employer_contact ?? ''} onChangeText={(v) => patch(i, { employer_contact: v })} placeholder="0917 123 4567" placeholderTextColor="#B8956A" keyboardType="phone-pad" />
                      </>
                    )}
                  </View>
                ))}

                <TouchableOpacity style={s.addBtn} onPress={addRow}>
                  <Ionicons name="add" size={18} color={ORANGE} /><Text style={s.addText}>Add a past job</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={s.saveText}>Save Work Experience</Text></>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {!editing && <HelperTabBar />}
      </SafeAreaView>

      <NotificationModal visible={notif.visible} message={notif.message} type={notif.type} autoClose duration={1600} onClose={() => setNotif((n) => ({ ...n, visible: false }))} />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: '#fff' },
  barBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  barTitle: { fontFamily: 'Fredoka-SemiBold', fontSize: 17, color: DARK },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 42 },
  editText: { fontFamily: 'Fredoka-SemiBold', fontSize: 14, color: ORANGE },
  scroll: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 16, padding: 15, marginBottom: 12 },
  cardLabel: { fontFamily: 'Fredoka-Regular', fontSize: 12.5, color: MUTED },
  cardValue: { fontFamily: 'Fredoka-SemiBold', fontSize: 16, color: DARK, marginTop: 3 },
  whHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  whRole: { fontFamily: 'Fredoka-SemiBold', fontSize: 15.5, color: DARK, flexShrink: 1 },
  whEmployer: { fontFamily: 'Fredoka-Medium', fontSize: 13.5, color: '#7A4E2A', marginTop: 2 },
  whDates: { fontFamily: 'Fredoka-Regular', fontSize: 12, color: MUTED, marginTop: 2 },
  whDuties: { fontFamily: 'Fredoka-Regular', fontSize: 13, color: '#5C3A1A', marginTop: 6, lineHeight: 18 },
  refBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  refBadgeText: { fontFamily: 'Fredoka-SemiBold', fontSize: 10.5, color: GREEN },

  empty: { alignItems: 'center', paddingVertical: 34, gap: 10 },
  emptyIc: { width: 62, height: 62, borderRadius: 20, backgroundColor: '#FCEBD9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Fredoka-SemiBold', fontSize: 17, color: DARK },
  emptySub: { fontFamily: 'Fredoka-Regular', fontSize: 13.5, color: MUTED, textAlign: 'center', lineHeight: 19, maxWidth: 300 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  emptyBtnText: { fontFamily: 'Fredoka-SemiBold', fontSize: 14, color: '#fff' },

  fLabel: { fontFamily: 'Fredoka-SemiBold', fontSize: 13, color: DARK, marginTop: 12, marginBottom: 6 },
  opt: { fontFamily: 'Fredoka-Regular', fontSize: 11, color: '#B8956A' },
  input: { backgroundColor: '#fff', borderWidth: 1.4, borderColor: LINE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: 'Fredoka-Regular', fontSize: 14.5, color: DARK },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  sectionTitle: { fontFamily: 'Fredoka-SemiBold', fontSize: 15, color: DARK, marginTop: 22, marginBottom: 2 },
  editCard: { backgroundColor: RAISE, borderWidth: 1, borderColor: LINE, borderRadius: 14, padding: 13, marginTop: 12 },
  editCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editCardNum: { fontFamily: 'Fredoka-SemiBold', fontSize: 13.5, color: DARK },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderWidth: 1.4, borderColor: LINE, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 11 },
  dateBtnText: { flex: 1, fontFamily: 'Fredoka-Regular', fontSize: 13.5, color: DARK },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  checkText: { fontFamily: 'Fredoka-Regular', fontSize: 13.5, color: MUTED },
  refToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  refToggleText: { flex: 1, fontFamily: 'Fredoka-SemiBold', fontSize: 13, color: DARK },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.4, borderStyle: 'dashed', borderColor: '#C4A882', borderRadius: 12, paddingVertical: 13, marginTop: 14 },
  addText: { fontFamily: 'Fredoka-SemiBold', fontSize: 14, color: ORANGE },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 15, marginTop: 18 },
  saveText: { fontFamily: 'Fredoka-SemiBold', fontSize: 15, color: '#fff' },
});
