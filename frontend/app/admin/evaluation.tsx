// app/admin/evaluation.tsx — the Chapter 4 system evaluation.
//
// This is the ISO/IEC 25010 instrument (feedback_questions / feedback_answers),
// not the retired end-of-demo form. Two different things were both
// called "feedback" — see docs/chapter4-evaluation-instrument.md.
//
// It reports what a capstone defense actually needs: a weighted mean per quality
// characteristic with its verbal interpretation, per-item means with the Likert
// distribution, and the verbatim open-ended answers. The weighting happens on
// the server so the number here and the number in the paper cannot disagree.
//
// Deletion exists because the database carries sample responses from testing.
// Leaving those in would put fabricated data into the reported means.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { toCsv, downloadCsv } from '@/lib/exportCsv';

type Item = {
  question_id: number; code: string; question_text: string;
  applies_to: string; iso_characteristic: string;
  n: number; mean: number | null; interpretation: string | null;
  distribution: Record<string, number>;
};
type Char = { characteristic: string; items: number; responses: number; weighted_mean: number | null; interpretation: string | null };
type Open = { answer_id: number; question_text: string; text: string; user_type: string; respondent: string; created_at: string };
type Resp = { user_id: number; name: string; email: string | null; user_type: string; answered: number; last_answer: string };

export default function AdminEvaluation() {
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [adminId, setAdminId] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ scope: string; id: number; label: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const uid = raw ? Number(JSON.parse(raw)?.user_id) : 0;
      setAdminId(uid);
      const res = await fetch(`${API_URL}/admin/get_instrument_results.php?admin_user_id=${uid}`);
      const json = await res.json();
      if (json.success) setData(json); else setNotice(json.message || 'Could not load results.');
    } catch { setNotice('Could not reach the server.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (scope: string, id: number) => {
    setBusy(true); setNotice(null);
    try {
      const body: any = { admin_user_id: adminId, scope };
      if (scope === 'answer') body.answer_id = id;
      if (scope === 'respondent') body.user_id = id;
      const res = await fetch(`${API_URL}/admin/delete_feedback.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      setNotice(json.message);
      if (json.success) await load();
    } catch { setNotice('Could not reach the server.'); }
    finally { setBusy(false); setConfirm(null); }
  };

  const chars: Char[] = data?.characteristics ?? [];
  const items: Item[] = data?.items ?? [];
  const open: Open[] = data?.open_ended ?? [];
  const respondents: Resp[] = data?.respondents ?? [];

  const exportChapter4 = () => {
    // One row per item — the table that goes straight into Chapter 4.
    downloadCsv('chapter4_evaluation.csv', toCsv(
      ['ISO Characteristic', 'Item', 'Question', 'n', 'Weighted Mean', 'Interpretation', '5', '4', '3', '2', '1'],
      items.map((i) => [
        i.iso_characteristic, i.code, i.question_text, i.n, i.mean ?? '', i.interpretation ?? '',
        i.distribution['5'], i.distribution['4'], i.distribution['3'], i.distribution['2'], i.distribution['1'],
      ]),
    ));
  };

  const Bar = ({ mean }: { mean: number | null }) => (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${((mean ?? 0) / 5) * 100}%`, backgroundColor: (mean ?? 0) >= 4.21 ? c.green : (mean ?? 0) >= 3.41 ? c.accent : c.amber }]} />
    </View>
  );

  return (
    <AdminShell active="evaluation" title="System Evaluation">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>

        {loading ? <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 60 }} /> : (
          <>
            <View style={s.introRow}>
              <View style={{ flex: 1, minWidth: 240 }}>
                <Text style={s.h1}>ISO/IEC 25010 evaluation</Text>
                <Text style={s.sub}>
                  Scale: 5 Strongly Agree · 4 Agree · 3 Neutral · 2 Disagree · 1 Strongly Disagree.
                  Means are weighted by response count. Matches docs/chapter4-evaluation-instrument.md.
                </Text>
              </View>
              <Pressable style={s.exportBtn} onPress={exportChapter4}>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={s.exportText}>Export Chapter 4 table</Text>
              </Pressable>
            </View>

            {!!notice && (
              <View style={s.notice}><Ionicons name="information-circle" size={15} color={c.accent} /><Text style={s.noticeText}>{notice}</Text></View>
            )}

            {/* Headline */}
            <View style={s.overallCard}>
              <View>
                <Text style={s.overallLabel}>OVERALL WEIGHTED MEAN</Text>
                <Text style={s.overallValue}>{data?.overall_mean ?? '—'}</Text>
                <Text style={s.overallInterp}>{data?.overall_interpretation ?? 'No responses yet'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.overallLabel}>RESPONSES</Text>
                <Text style={s.overallValue}>{data?.total_responses ?? 0}</Text>
                <Text style={s.overallInterp}>{respondents.length} respondent{respondents.length === 1 ? '' : 's'}</Text>
              </View>
            </View>

            {/* Per characteristic — the table a panel asks about first */}
            <Text style={s.h2}>By quality characteristic</Text>
            {chars.length === 0 ? <Text style={s.empty}>No rating responses yet.</Text> : chars.map((ch) => (
              <View key={ch.characteristic} style={s.charRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.charName}>{ch.characteristic}</Text>
                  <Text style={s.charMeta}>{ch.items} items · {ch.responses} responses</Text>
                  <Bar mean={ch.weighted_mean} />
                </View>
                <View style={{ alignItems: 'flex-end', minWidth: 120 }}>
                  <Text style={s.charMean}>{ch.weighted_mean ?? '—'}</Text>
                  <Text style={s.charInterp}>{ch.interpretation ?? ''}</Text>
                </View>
              </View>
            ))}

            {/* Respondents — and the unit you delete by, for clearing samples */}
            <Text style={s.h2}>Respondents</Text>
            <Text style={s.hint}>
              Remove a respondent to drop every answer they gave. Use this to clear sample or demo
              responses so they do not distort the means above. Deletions are written to the audit trail.
            </Text>
            {respondents.length === 0 ? <Text style={s.empty}>Nobody has answered yet.</Text> : respondents.map((r) => (
              <View key={r.user_id} style={s.respRow}>
                <View style={[s.roleChip, { backgroundColor: r.user_type === 'helper' ? c.accentSoft : c.rowAlt }]}>
                  <Text style={s.roleChipText}>
                    {r.user_type === 'helper' ? 'HELPER' : r.user_type === 'parent' ? 'EMPLOYER' : 'PESO'}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.respName} numberOfLines={1}>{r.name}</Text>
                  <Text style={s.respMeta} numberOfLines={1}>
                    {r.answered} answer{r.answered === 1 ? '' : 's'}
                    {r.email ? ` · ${r.email}` : ''}
                  </Text>
                </View>
                <Pressable
                  style={s.delBtn}
                  disabled={busy}
                  onPress={() => setConfirm({ scope: 'respondent', id: r.user_id, label: `all ${r.answered} answers by ${r.name}` })}
                >
                  <Ionicons name="trash-outline" size={15} color={c.red} />
                  <Text style={s.delText}>Remove</Text>
                </Pressable>
              </View>
            ))}

            {/* Per item */}
            <Text style={s.h2}>Per item</Text>
            {items.map((i) => (
              <View key={i.question_id} style={s.itemRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.itemChar}>{i.iso_characteristic.toUpperCase()}{i.applies_to !== 'all' ? `  ·  ${i.applies_to === 'helper' ? 'HELPERS' : 'EMPLOYERS'} ONLY` : ''}</Text>
                  <Text style={s.itemText}>{i.question_text}</Text>
                  <View style={s.distRow}>
                    {(['5', '4', '3', '2', '1'] as const).map((k) => (
                      <View key={k} style={s.distChip}>
                        <Text style={s.distK}>{k}</Text>
                        <Text style={s.distV}>{i.distribution[k] ?? 0}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', minWidth: 110 }}>
                  <Text style={s.itemMean}>{i.mean ?? '—'}</Text>
                  <Text style={s.itemN}>n = {i.n}</Text>
                  <Text style={s.itemInterp}>{i.interpretation ?? 'No data'}</Text>
                </View>
              </View>
            ))}

            {/* Open-ended — the quotes */}
            <Text style={s.h2}>Open-ended answers</Text>
            {open.length === 0 ? <Text style={s.empty}>No written answers yet.</Text> : open.map((o) => (
              <View key={o.answer_id} style={s.openRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.openQ}>{o.question_text}</Text>
                  <Text style={s.openA}>“{o.text}”</Text>
                  <Text style={s.openWho}>— {o.respondent} ({o.user_type === 'parent' ? 'Household Employer' : o.user_type})</Text>
                </View>
                <Pressable style={s.delBtn} disabled={busy}
                  onPress={() => setConfirm({ scope: 'answer', id: o.answer_id, label: 'this written answer' })}>
                  <Ionicons name="trash-outline" size={15} color={c.red} />
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Deleting research data is confirmed, never one-click. */}
      {!!confirm && (
        <View style={s.overlay}>
          <View style={s.dialog}>
            <View style={s.dialogIcon}><Ionicons name="trash" size={24} color={c.red} /></View>
            <Text style={s.dialogTitle}>Remove {confirm.label}?</Text>
            <Text style={s.dialogBody}>
              This permanently deletes the response and changes the means reported above.
              The deletion is recorded in the audit trail.
            </Text>
            <View style={s.dialogRow}>
              <Pressable style={s.cancelBtn} onPress={() => setConfirm(null)}><Text style={s.cancelText}>Cancel</Text></Pressable>
              <Pressable style={s.confirmBtn} disabled={busy} onPress={() => remove(confirm.scope, confirm.id)}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmText}>Remove</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </AdminShell>
  );
}

const makeStyles = (c: any) => StyleSheet.create({
  introRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  h1: { fontSize: 20, fontWeight: '800', color: c.text },
  sub: { fontSize: 12.5, color: c.muted, marginTop: 4, lineHeight: 18 },
  h2: { fontSize: 15, fontWeight: '800', color: c.text, marginTop: 26, marginBottom: 10 },
  hint: { fontSize: 12, color: c.muted, marginBottom: 10, lineHeight: 17 },
  empty: { fontSize: 13, color: c.subtle, fontStyle: 'italic', paddingVertical: 12 },

  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accent, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16 },
  exportText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },

  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accentSoft, borderRadius: 10, padding: 12, marginBottom: 14 },
  noticeText: { flex: 1, fontSize: 12.5, color: c.text },

  overallCard: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 18 },
  overallLabel: { fontSize: 10, letterSpacing: 0.8, fontWeight: '800', color: c.subtle },
  overallValue: { fontSize: 34, fontWeight: '800', color: c.text, marginTop: 2 },
  overallInterp: { fontSize: 12.5, color: c.muted },

  charRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  charName: { fontSize: 14, fontWeight: '700', color: c.text },
  charMeta: { fontSize: 11.5, color: c.subtle, marginTop: 1 },
  charMean: { fontSize: 22, fontWeight: '800', color: c.text },
  charInterp: { fontSize: 11.5, color: c.muted },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: c.rowAlt, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  respRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  roleChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  roleChipText: { fontSize: 9.5, fontWeight: '800', color: c.text, letterSpacing: 0.5 },
  respName: { fontSize: 13.5, fontWeight: '700', color: c.text },
  respMeta: { fontSize: 11.5, color: c.muted, marginTop: 1 },
  delBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c.red + '66', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 12 },
  delText: { fontSize: 12, fontWeight: '700', color: c.red },

  itemRow: { flexDirection: 'row', gap: 14, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  itemChar: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7, color: c.subtle },
  itemText: { fontSize: 13.5, color: c.text, marginTop: 4, lineHeight: 19 },
  itemMean: { fontSize: 20, fontWeight: '800', color: c.text },
  itemN: { fontSize: 11, color: c.subtle },
  itemInterp: { fontSize: 11, color: c.muted, textAlign: 'right' },
  distRow: { flexDirection: 'row', gap: 6, marginTop: 9 },
  distChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.rowAlt, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  distK: { fontSize: 10, fontWeight: '800', color: c.subtle },
  distV: { fontSize: 11.5, fontWeight: '700', color: c.text },

  openRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  openQ: { fontSize: 11.5, fontWeight: '700', color: c.subtle },
  openA: { fontSize: 13.5, color: c.text, lineHeight: 20, marginTop: 5, fontStyle: 'italic' },
  openWho: { fontSize: 11.5, color: c.muted, marginTop: 5 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 440, backgroundColor: c.panel, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: c.border },
  dialogIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.redSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  dialogTitle: { fontSize: 17, fontWeight: '800', color: c.text, textAlign: 'center', marginTop: 12 },
  dialogBody: { fontSize: 13, color: c.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  dialogRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 11, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  cancelText: { fontSize: 13.5, fontWeight: '700', color: c.text },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 11, backgroundColor: c.red, alignItems: 'center' },
  confirmText: { fontSize: 13.5, fontWeight: '700', color: '#fff' },
});
