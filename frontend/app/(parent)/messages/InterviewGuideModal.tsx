// app/(parent)/messages/InterviewGuideModal.tsx
// A guided interview helper for parents: standard questions to ask a candidate,
// with fields to record the answers. Saved per application (parent/interview_guide.php)
// so the answers pre-fill the employment contract when the parent hires.

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { CREAM, BROWN, DARK, MUTED, ICON_BG, GOLD } from '@/components/parent/home/parentWarmTheme';

export type InterviewAnswers = {
  salary: string;
  rest_day: string;
  start_date: string;
  experience: string;
  house_rules: string;
  notes: string;
};

const EMPTY: InterviewAnswers = { salary: '', rest_day: '', start_date: '', experience: '', house_rules: '', notes: '' };

const QUESTIONS: { key: keyof InterviewAnswers; q: string; hint: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'salary', q: 'What monthly salary are they expecting?', hint: 'Carries into the contract salary.', placeholder: 'e.g. 9000' },
  { key: 'rest_day', q: 'Which rest day do they prefer?', hint: 'RA 10361 requires at least one day off per week.', placeholder: 'e.g. Sunday' },
  { key: 'start_date', q: 'When can they start?', hint: 'Carries into the contract start date.', placeholder: 'e.g. 2026-08-01' },
  { key: 'experience', q: 'What relevant experience do they have?', hint: 'Ask about past employers and length of service.', placeholder: 'e.g. 2 years as a yaya for 2 kids', multiline: true },
  { key: 'house_rules', q: 'Did you go over your house rules and expectations?', hint: 'Sleeping-in vs out, phone use, tasks, etc.', placeholder: 'Notes on what was agreed…', multiline: true },
  { key: 'notes', q: 'Any concerns, red flags, or other notes?', hint: 'Anything you want to remember before hiring.', placeholder: 'Optional notes…', multiline: true },
];

export function InterviewGuideModal({
  visible, applicationId, helperName, onClose, onSaved,
}: {
  visible: boolean;
  applicationId: number | null;
  helperName: string;
  onClose: () => void;
  onSaved?: (answers: InterviewAnswers) => void;
}) {
  const [answers, setAnswers] = useState<InterviewAnswers>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !applicationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const raw = await AsyncStorage.getItem('user_data');
        const uid = raw ? JSON.parse(raw)?.user_id : '';
        const res = await fetch(`${API_URL}/parent/interview_guide.php?application_id=${applicationId}&requester_id=${uid}`);
        const data = await res.json();
        if (!cancelled && data.success && data.answers) setAnswers({ ...EMPTY, ...data.answers });
        else if (!cancelled) setAnswers(EMPTY);
      } catch { /* fresh */ } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [visible, applicationId]);

  const set = (k: keyof InterviewAnswers) => (v: string) => setAnswers((a) => ({ ...a, [k]: v }));

  const save = async () => {
    if (!applicationId) return;
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const uid = raw ? JSON.parse(raw)?.user_id : '';
      const res = await fetch(`${API_URL}/parent/interview_guide.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, requester_id: uid, answers }),
      });
      const data = await res.json();
      if (data.success) { onSaved?.(answers); onClose(); }
    } catch { /* keep modal open */ } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={g.overlay}>
        <View style={g.sheet}>
          <View style={g.head}>
            <View style={g.headIcon}><Ionicons name="clipboard-outline" size={20} color={BROWN} /></View>
            <View style={{ flex: 1 }}>
              <Text style={g.title}>Interview Guide</Text>
              <Text style={g.sub}>Questions to ask {helperName || 'the helper'} — your answers pre-fill the contract.</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={BROWN} style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {QUESTIONS.map((item, i) => (
                <View key={item.key} style={{ marginBottom: 16 }}>
                  <Text style={g.q}>{i + 1}. {item.q}</Text>
                  <Text style={g.hint}>{item.hint}</Text>
                  <TextInput
                    style={[g.input, item.multiline && g.multiline]}
                    value={answers[item.key]}
                    onChangeText={set(item.key)}
                    placeholder={item.placeholder}
                    placeholderTextColor="#B8956A"
                    multiline={item.multiline}
                    keyboardType={item.key === 'salary' ? 'number-pad' : 'default'}
                  />
                </View>
              ))}
            </ScrollView>
          )}

          <View style={g.footer}>
            <TouchableOpacity style={g.cancelBtn} onPress={onClose}><Text style={g.cancelText}>Close</Text></TouchableOpacity>
            <TouchableOpacity style={[g.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving || loading}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={g.saveText}>Save Notes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const g = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(42,20,9,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CREAM, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: '92%' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  headIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '800', color: DARK },
  sub: { fontSize: 12.5, color: MUTED, marginTop: 2, lineHeight: 17 },
  q: { fontSize: 14, fontWeight: '700', color: DARK },
  hint: { fontSize: 11.5, color: MUTED, marginTop: 2, marginBottom: 7 },
  input: { backgroundColor: '#fff', borderWidth: 1.4, borderColor: '#EFE0CB', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14.5, color: DARK, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#EFE0CB', alignItems: 'center', backgroundColor: '#fff' },
  cancelText: { fontWeight: '700', color: DARK },
  saveBtn: { flex: 1.4, paddingVertical: 14, borderRadius: 14, backgroundColor: GOLD, alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#fff' },
});
