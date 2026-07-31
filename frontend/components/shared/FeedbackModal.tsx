// components/shared/FeedbackModal.tsx
// Feedback about CareLink itself — kept deliberately short, because a long form
// at the end of a test session just doesn't get filled in. The full ISO 25010
// instrument is administered separately on paper
// (see docs/chapter4-evaluation-instrument.md); this captures the headline
// numbers and the two questions worth quoting while the session is fresh.
//
// With `clearDemoDataOnSubmit`, it also runs the end-of-demo handover: submit →
// clear this tester's activity with the seeded demo employers → sign out with an
// explanation that the next sign-in is the real thing.

import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontFamily } from '@/constants/GlobalStyles';
import API_URL from '@/constants/api';
import { useAuth } from '@/hooks/shared';

type Role = 'helper' | 'parent' | 'peso';

const LIKERT = [
  { key: 'ease_of_use', label: 'It was easy to use' },
  { key: 'trust',       label: 'I felt my information was safe' },
  { key: 'would_use',   label: 'I would use CareLink for real' },
] as const;

const SCALE = [
  { v: 1, short: 'No' },
  { v: 2, short: '' },
  { v: 3, short: 'Maybe' },
  { v: 4, short: '' },
  { v: 5, short: 'Yes' },
];

export default function FeedbackModal({
  visible, onClose, role, accent = '#E86019',
  context = 'general', clearDemoDataOnSubmit = false,
}: {
  visible: boolean;
  onClose: () => void;
  role: Role;
  accent?: string;
  context?: string;
  /** End-of-demo: clear seeded-employer activity and sign out after submitting. */
  clearDemoDataOnSubmit?: boolean;
}) {
  const { handleLogout } = useAuth();
  const [stars, setStars] = useState(0);
  const [likert, setLikert] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState('');
  const [confusing, setConfusing] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setStars(0); setLikert({}); setLiked(''); setConfusing('');
    setError(null); setDone(false); setBusy(false);
  };

  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (stars < 1) { setError('Please tap a star rating first.'); return; }
    setBusy(true);
    setError(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const userId = String(user.user_id ?? '');
      if (!userId) throw new Error('Please sign in again.');

      const res = await fetch(`${API_URL}/shared/submit_feedback.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId, requester_id: userId, user_type: role,
          overall_rating: stars,
          ease_of_use: likert.ease_of_use ?? null,
          trust: likert.trust ?? null,
          would_use: likert.would_use ?? null,
          liked_most: liked, confusing_part: confusing,
          context,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not save your feedback.');

      if (clearDemoDataOnSubmit) {
        // Best-effort: the feedback is already saved, so a reset failure must not
        // look like the whole submission failed. Worst case a tester keeps some
        // demo rows, which the operator can clear later.
        try {
          await fetch(`${API_URL}/shared/demo_reset.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, requester_id: userId }),
          });
        } catch { /* ignore */ }
      }
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Could not save your feedback.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    reset();
    onClose();
    if (clearDemoDataOnSubmit) await handleLogout();
  };

  // ── Thank-you / handover ──
  if (done) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
        <View style={s.overlay}>
          <View style={s.card}>
            <View style={[s.iconWrap, { backgroundColor: accent + '18' }]}>
              <Ionicons name="checkmark-circle" size={40} color={accent} />
            </View>
            <Text style={s.title}>Thank you!</Text>
            {clearDemoDataOnSubmit ? (
              <>
                <Text style={s.body}>
                  Your answers are saved, and the practice jobs and messages you saw have been cleared
                  from your account.
                </Text>
                <Text style={[s.body, { marginTop: 4 }]}>
                  Please sign in again to use the real CareLink. Your profile and documents are still
                  there — only the practice activity is gone.
                </Text>
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: accent }]} onPress={finish} activeOpacity={0.88}>
                  <Text style={s.primaryText}>Sign out</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.body}>Your feedback helps make CareLink better for everyone.</Text>
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: accent }]} onPress={finish} activeOpacity={0.88}>
                  <Text style={s.primaryText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // ── Form ──
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>How was CareLink?</Text>
              <Text style={s.sub}>Honest answers help most — including the bad ones.</Text>
            </View>
            <TouchableOpacity onPress={close} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color="#9A7B5A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ alignSelf: 'stretch' }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={s.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => { setStars(n); setError(null); }} hitSlop={6} accessibilityLabel={`${n} stars`}>
                  <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={34} color={n <= stars ? '#F59E0B' : '#D9C4A6'} />
                </TouchableOpacity>
              ))}
            </View>

            {LIKERT.map((row) => (
              <View key={row.key} style={s.likertBlock}>
                <Text style={s.likertLabel}>{row.label}</Text>
                <View style={s.likertRow}>
                  {SCALE.map((opt) => {
                    const on = likert[row.key] === opt.v;
                    return (
                      <TouchableOpacity
                        key={opt.v}
                        style={[s.likertDot, on && { backgroundColor: accent, borderColor: accent }]}
                        onPress={() => setLikert((p) => ({ ...p, [row.key]: opt.v }))}
                        accessibilityLabel={`${row.label}: ${opt.v} of 5`}
                      >
                        <Text style={[s.likertDotText, on && { color: '#fff' }]}>{opt.v}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={s.likertEnds}>
                  <Text style={s.likertEndText}>No</Text>
                  <Text style={s.likertEndText}>Yes</Text>
                </View>
              </View>
            ))}

            <Text style={s.qLabel}>What did you like most?</Text>
            <TextInput
              style={s.input} value={liked} onChangeText={setLiked} multiline
              placeholder="Anything that worked well for you" placeholderTextColor="#B8956A"
            />

            <Text style={s.qLabel}>What was confusing or hard?</Text>
            <TextInput
              style={s.input} value={confusing} onChangeText={setConfusing} multiline
              placeholder="Where did you get stuck?" placeholderTextColor="#B8956A"
            />

            {!!error && <Text style={s.error}>{error}</Text>}

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: accent }, busy && { opacity: 0.6 }]}
              onPress={submit} disabled={busy} activeOpacity={0.88}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Send feedback</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%', maxWidth: 420, maxHeight: '88%',
    backgroundColor: '#FFFDF9', borderRadius: 22, padding: 22, alignItems: 'center',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, alignSelf: 'stretch', marginBottom: 14 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: '#2A1608' },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#9A7B5A', marginTop: 3 },

  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 14 },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: '#7A5C3E', textAlign: 'center', lineHeight: 21 },

  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },

  likertBlock: { marginBottom: 16 },
  likertLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#2A1608', marginBottom: 8 },
  likertRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  likertDot: {
    flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: '#EDE0D0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  likertDotText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#7A5C3E' },
  likertEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  likertEndText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: '#B8956A' },

  qLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#2A1608', marginTop: 6, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#EDE0D0', borderRadius: 12, padding: 12,
    fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: '#2A1608',
    minHeight: 70, textAlignVertical: 'top', backgroundColor: '#fff',
    marginBottom: 12,
    ...Platform.select({ web: { outlineStyle: 'none' } as any, default: {} }),
  },
  error: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#DC2626', marginBottom: 10, textAlign: 'center' },

  primaryBtn: { alignSelf: 'stretch', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 6, marginBottom: 4 },
  primaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },
});
