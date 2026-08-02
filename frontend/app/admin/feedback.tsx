// app/admin/feedback.tsx
// Every piece of feedback users have left about CareLink itself.
//
// Source is the system_feedback table (the in-app form), NOT placement_reviews —
// that one is helpers and employers rating each other and it feeds matching.
// This is people rating the SYSTEM, which is what the capstone's Chapter 4
// evaluation reports on.
//
// The averages use the same 5-point interpretation scale as the written
// instrument (docs/chapter4-evaluation-instrument.md), so the screen and the
// paper can't disagree.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminTheme } from '@/contexts/AdminThemeContext';

type Item = {
  feedback_id: number; name: string; email: string | null;
  user_type: 'helper' | 'parent' | 'peso';
  overall_rating: number;
  ease_of_use: number | null; trust: number | null; would_use: number | null;
  liked_most: string | null; confusing_part: string | null;
  context: string; created_at: string;
};

type Summary = {
  total: number;
  overall: number | null; ease_of_use: number | null;
  trust: number | null; would_use: number | null;
};

/** Standard 5-point capstone interpretation bands. */
function verbal(v: number | null): string {
  if (v === null) return '—';
  if (v >= 4.2) return 'Excellent';
  if (v >= 3.4) return 'Very Good';
  if (v >= 2.6) return 'Good';
  if (v >= 1.8) return 'Fair';
  return 'Poor';
}

const ROLE_LABEL: Record<string, string> = { helper: 'Helper', parent: 'Employer', peso: 'PESO staff' };

export default function AdminFeedbackScreen() {
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byRole, setByRole] = useState<{ user_type: string; count: number; average: number }[]>([]);
  const [role, setRole] = useState<'' | 'helper' | 'parent' | 'peso'>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const id = String((raw ? JSON.parse(raw) : {})?.user_id ?? '');
      if (!id) { setError('Please sign in again.'); return; }
      const res = await fetch(
        `${API_URL}/admin/get_feedback.php?admin_user_id=${id}${role ? `&role=${role}` : ''}`,
      );
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Could not load feedback.'); return; }
      setItems(data.feedback ?? []);
      setSummary(data.summary ?? null);
      setByRole(data.by_role ?? []);
      setError(null);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { void load(); }, [load]);

  const filters: { key: '' | 'helper' | 'parent' | 'peso'; label: string }[] = [
    { key: '', label: 'Everyone' },
    { key: 'helper', label: 'Helpers' },
    { key: 'parent', label: 'Employers' },
    { key: 'peso', label: 'PESO staff' },
  ];

  return (
    <AdminShell
      active="feedback"
      title="User Feedback"
      subtitle="What people say about CareLink itself"
    >
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={c.accent} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.accent} />}
          showsVerticalScrollIndicator={false}
        >
          {!!error && (
            <View style={[s.card, { borderColor: '#DC2626' }]}>
              <Text style={[s.body, { color: '#DC2626' }]}>{error}</Text>
            </View>
          )}

          {/* Headline averages — computed over ALL responses, so they don't
              shift while someone clicks between role filters. */}
          <View style={s.statRow}>
            <Stat c={c} label="Responses" value={String(summary?.total ?? 0)} sub="total" />
            <Stat c={c} label="Overall" value={summary?.overall?.toFixed(2) ?? '—'} sub={verbal(summary?.overall ?? null)} />
            <Stat c={c} label="Easy to use" value={summary?.ease_of_use?.toFixed(2) ?? '—'} sub={verbal(summary?.ease_of_use ?? null)} />
            <Stat c={c} label="Felt safe" value={summary?.trust?.toFixed(2) ?? '—'} sub={verbal(summary?.trust ?? null)} />
            <Stat c={c} label="Would use" value={summary?.would_use?.toFixed(2) ?? '—'} sub={verbal(summary?.would_use ?? null)} />
          </View>

          {byRole.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Average by role</Text>
              {byRole.map((r) => (
                <View key={r.user_type} style={s.roleRow}>
                  <Text style={s.roleName}>{ROLE_LABEL[r.user_type] ?? r.user_type}</Text>
                  <Text style={s.roleCount}>{r.count} response{r.count === 1 ? '' : 's'}</Text>
                  <Text style={s.roleAvg}>{r.average.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.filterRow}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key || 'all'}
                style={[s.chip, role === f.key && { backgroundColor: c.accent, borderColor: c.accent }]}
                onPress={() => setRole(f.key)}
                activeOpacity={0.85}
              >
                <Text style={[s.chipText, role === f.key && { color: '#fff' }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {items.length === 0 ? (
            <View style={s.card}>
              <View style={s.empty}>
                <Ionicons name="chatbox-ellipses-outline" size={38} color={c.subtle} />
                <Text style={s.body}>No feedback yet.</Text>
                <Text style={s.hint}>
                  Responses appear here as users submit the in-app feedback form.
                </Text>
              </View>
            </View>
          ) : (
            items.map((f) => (
              <View key={f.feedback_id} style={s.card}>
                <View style={s.head}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name} numberOfLines={1}>{f.name}</Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {ROLE_LABEL[f.user_type] ?? f.user_type}
                      {f.context === 'demo_end' ? ' · test session' : ''}
                      {' · '}
                      {new Date(String(f.created_at).replace(' ', 'T')).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </Text>
                  </View>
                  <View style={s.stars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= f.overall_rating ? 'star' : 'star-outline'}
                        size={14}
                        color={n <= f.overall_rating ? '#F59E0B' : c.subtle}
                      />
                    ))}
                  </View>
                </View>

                <View style={s.miniRow}>
                  <Mini c={c} label="Easy" v={f.ease_of_use} />
                  <Mini c={c} label="Safe" v={f.trust} />
                  <Mini c={c} label="Would use" v={f.would_use} />
                </View>

                {!!f.liked_most?.trim() && (
                  <Quote c={c} icon="thumbs-up-outline" label="Liked most" text={f.liked_most} />
                )}
                {!!f.confusing_part?.trim() && (
                  <Quote c={c} icon="help-circle-outline" label="Confusing or hard" text={f.confusing_part} />
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </AdminShell>
  );
}

function Stat({ c, label, value, sub }: { c: any; label: string; value: string; sub: string }) {
  const s = makeStyles(c);
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

function Mini({ c, label, v }: { c: any; label: string; v: number | null }) {
  const s = makeStyles(c);
  return (
    <View style={s.mini}>
      <Text style={s.miniLabel}>{label}</Text>
      <Text style={s.miniValue}>{v === null ? '—' : `${v}/5`}</Text>
    </View>
  );
}

function Quote({ c, icon, label, text }: { c: any; icon: any; label: string; text: string }) {
  const s = makeStyles(c);
  return (
    <View style={s.quote}>
      <View style={s.quoteHead}>
        <Ionicons name={icon} size={13} color={c.muted} />
        <Text style={s.quoteLabel}>{label}</Text>
      </View>
      <Text style={s.quoteText}>{text}</Text>
    </View>
  );
}

const makeStyles = (c: any) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  card: { backgroundColor: c.panel, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: c.text, marginBottom: 10 },
  body: { fontSize: 13.5, color: c.text },
  hint: { fontSize: 12.5, color: c.muted, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 26 },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexGrow: 1, minWidth: 130, backgroundColor: c.panel, borderRadius: 14,
    borderWidth: 1, borderColor: c.border, padding: 13,
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 24, fontWeight: '800', color: c.text, marginTop: 4 },
  statSub: { fontSize: 11.5, color: c.subtle, marginTop: 2 },

  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  roleName: { flex: 1, fontSize: 13, fontWeight: '700', color: c.text },
  roleCount: { fontSize: 12, color: c.muted },
  roleAvg: { fontSize: 14, fontWeight: '800', color: c.accent, minWidth: 44, textAlign: 'right' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: c.border },
  chipText: { fontSize: 12.5, fontWeight: '700', color: c.muted },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 14, fontWeight: '800', color: c.text },
  meta: { fontSize: 11.5, color: c.muted, marginTop: 2 },
  stars: { flexDirection: 'row', gap: 1 },

  miniRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  mini: { flex: 1, backgroundColor: c.panel2, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  miniLabel: { fontSize: 10.5, color: c.muted, fontWeight: '700' },
  miniValue: { fontSize: 13, fontWeight: '800', color: c.text, marginTop: 2 },

  quote: { marginTop: 12, backgroundColor: c.panel2, borderRadius: 10, padding: 11 },
  quoteHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  quoteLabel: { fontSize: 10.5, fontWeight: '800', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  quoteText: { fontSize: 13, color: c.text, lineHeight: 19 },
});
