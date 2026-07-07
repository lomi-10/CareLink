// components/shared/MatchBreakdownModal.tsx
// Shows WHY a job earned its match % — the score + the human-readable reasons
// returned by the shared backend scorer (helper/job_match.php). Opened by tapping
// a job card's match badge on the Home dashboard and the Browse screen.

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const THEMES = {
  helper: { accent: '#E86019', ink: '#2A1608', bg: '#FFFDF9' },
  parent: { accent: '#C88B4A', ink: '#3B2A18', bg: '#FFF9F2' },
};
const MUTED = '#8A6C4E';
const SUCCESS = '#1A7F4B';
const LINE = '#EFE2D0';
const INK = THEMES.helper.ink;     // default for static styles (overridden inline per theme)
const ACCENT = THEMES.helper.accent;

// The seven factors the score is built from (keep in sync with job_match.php).
const FACTORS = [
  { label: 'Specialty / category', max: 25 },
  { label: 'Job roles', max: 15 },
  { label: 'Skills', max: 15 },
  { label: 'Salary fit', max: 15 },
  { label: 'Location', max: 10 },
  { label: 'Experience', max: 10 },
  { label: 'Employer rating', max: 10 },
];

function tier(score: number, accent: string) {
  if (score >= 75) return { label: 'Excellent match', color: SUCCESS };
  if (score >= 50) return { label: 'Good match', color: accent };
  if (score >= 30) return { label: 'Fair match', color: '#B45309' };
  return { label: 'Low match', color: '#9A7B5A' };
}

export default function MatchBreakdownModal({
  visible, onClose, score, reasons, jobTitle, themeKey = 'helper', subjectLabel = 'match',
}: {
  visible: boolean;
  onClose: () => void;
  score: number;
  reasons?: string[];
  jobTitle?: string;
  themeKey?: 'helper' | 'parent';
  subjectLabel?: string; // e.g. "job" or "helper" — used in the lead sentence
}) {
  const th = THEMES[themeKey];
  const s = Math.round(Number(score || 0));
  const t = tier(s, th.accent);
  const list = Array.isArray(reasons) ? reasons.filter(Boolean) : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={[m.card, { backgroundColor: th.bg }]} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={m.header}>
            <Text style={[m.title, { color: th.ink }]}>Match Breakdown</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
          </View>
          {!!jobTitle && <Text style={m.sub} numberOfLines={1}>{jobTitle}</Text>}

          {/* Score ring */}
          <View style={m.scoreWrap}>
            <View style={[m.scoreCircle, { borderColor: t.color }]}>
              <Text style={[m.scoreNum, { color: t.color }]}>{s}%</Text>
            </View>
            <Text style={[m.tier, { color: t.color }]}>{t.label}</Text>
          </View>

          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {/* Why — lead sentence + reasons */}
            <Text style={[m.lead, { color: th.ink }]}>
              Here’s why this {subjectLabel} is a{' '}
              <Text style={{ color: t.color, fontWeight: '900' }}>{t.label.toLowerCase()}</Text>:
            </Text>
            {list.length > 0 ? (
              list.map((r, i) => (
                <View key={i} style={m.reasonRow}>
                  <Ionicons name="checkmark-circle" size={16} color={SUCCESS} />
                  <Text style={[m.reasonText, { color: th.ink }]}>{r}</Text>
                </View>
              ))
            ) : (
              <Text style={m.emptyText}>
                No single factor stood out strongly. Completing profile details (skills, specialties,
                salary, location) improves matching.
              </Text>
            )}

            {/* How it's scored */}
            <Text style={[m.section, { marginTop: 16, color: th.ink }]}>How the score works</Text>
            <Text style={m.help}>
              Out of 100 points, weighted across what matters most to a good placement:
            </Text>
            <View style={m.factorGrid}>
              {FACTORS.map((f) => (
                <View key={f.label} style={m.factorRow}>
                  <Text style={m.factorLabel}>{f.label}</Text>
                  <Text style={[m.factorMax, { color: th.accent }]}>{f.max} pts</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={[m.doneBtn, { backgroundColor: th.ink }]} onPress={onClose} activeOpacity={0.88}>
            <Text style={m.doneText}>Got it</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#FFFDF9', borderRadius: 20, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '900', color: INK },
  sub: { fontSize: 13, color: MUTED, fontWeight: '600', marginTop: 2 },

  scoreWrap: { alignItems: 'center', marginVertical: 14 },
  scoreCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 28, fontWeight: '900' },
  tier: { fontSize: 15, fontWeight: '800', marginTop: 8 },

  lead: { fontSize: 13.5, color: INK, fontWeight: '600', lineHeight: 19, marginBottom: 10 },
  section: { fontSize: 13, fontWeight: '900', color: INK, marginBottom: 8 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  reasonText: { flex: 1, fontSize: 13.5, color: INK, fontWeight: '600' },
  emptyText: { fontSize: 13, color: MUTED, lineHeight: 19 },

  help: { fontSize: 12.5, color: MUTED, lineHeight: 18, marginBottom: 8 },
  factorGrid: { borderWidth: 1, borderColor: LINE, borderRadius: 12, overflow: 'hidden' },
  factorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE },
  factorLabel: { fontSize: 12.5, color: INK, fontWeight: '600' },
  factorMax: { fontSize: 12.5, color: ACCENT, fontWeight: '800' },

  doneBtn: { marginTop: 16, backgroundColor: INK, borderRadius: 13, paddingVertical: 13, alignItems: 'center' },
  doneText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
});
