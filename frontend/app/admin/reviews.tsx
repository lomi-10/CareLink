// app/admin/reviews.tsx — super admin view of peer reviews.
//
// Same data and same privacy rule as the PESO Reviews screen: helpers and
// households see each other's star RATING on profiles; the written text is
// readable only by PESO and super admin. This screen is the super-admin half of
// "only PESO or super admin should be able to see it".
//
// PHP: peso/list_reviews.php (accepts admin_user_id as well as staff_user_id)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { toCsv, downloadCsv } from '@/lib/exportCsv';

type Row = {
  review_id: number; rating: number; review_text: string;
  reviewer_name: string; reviewer_role: string;
  reviewee_name: string; reviewee_role: string;
  job_title: string | null; created_at: string | null;
};
type Filter = 'all' | 'low' | 'helper' | 'parent';

export default function AdminReviews() {
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState({ total: 0, average: null as number | null, low: 0, written: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const load = useCallback(async (f: Filter, query: string) => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const uid = raw ? Number(JSON.parse(raw)?.user_id) : 0;
      const p = new URLSearchParams({ admin_user_id: String(uid) });
      if (query.trim()) p.set('q', query.trim());
      if (f === 'low') p.set('max_rating', '2');
      if (f === 'helper' || f === 'parent') p.set('role', f);
      const res = await fetch(`${API_URL}/peso/list_reviews.php?${p.toString()}`);
      const json = await res.json();
      if (json.success) { setRows(json.reviews ?? []); setSummary(json.summary ?? summary); }
      else setRows([]);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setLoading(true); void load(filter, q); }, [filter]); // eslint-disable-line

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'low', label: '2 stars and below' },
    { key: 'helper', label: 'About helpers' },
    { key: 'parent', label: 'About employers' },
  ];

  return (
    <AdminShell active="reviews" title="Peer Reviews">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(filter, q); setRefreshing(false); }} />}>

        <View style={s.privacy}>
          <Ionicons name="lock-closed" size={15} color={c.accent} />
          <Text style={s.privacyText}>
            Written reviews are visible to PESO and super admin only. Helpers and households see each
            other's star rating, never the words. Do not quote this text back to either party.
          </Text>
        </View>

        <View style={s.statRow}>
          <Stat c={c} label="Total" value={summary.total} />
          <Stat c={c} label="Average" value={summary.average ?? '—'} />
          <Stat c={c} label="2 stars or below" value={summary.low} tone={c.red} />
          <Stat c={c} label="With comments" value={summary.written} />
        </View>

        <View style={s.controls}>
          <View style={s.search}>
            <Ionicons name="search" size={15} color={c.subtle} />
            <TextInput
              style={[s.searchInput, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
              placeholder="Search name or wording…" placeholderTextColor={c.subtle}
              value={q} onChangeText={setQ} onSubmitEditing={() => load(filter, q)} returnKeyType="search"
            />
          </View>
          <Pressable style={s.exportBtn} onPress={() => downloadCsv('peer_reviews.csv', toCsv(
            ['Reviewed', 'Role', 'Rating', 'Review', 'Reviewer', 'Reviewer role', 'Job', 'Date'],
            rows.map((r) => [r.reviewee_name, r.reviewee_role, r.rating, r.review_text, r.reviewer_name, r.reviewer_role, r.job_title ?? '', r.created_at ?? '']),
          ))}>
            <Ionicons name="download-outline" size={15} color="#fff" />
            <Text style={s.exportText}>Export</Text>
          </Pressable>
        </View>

        <View style={s.chips}>
          {FILTERS.map((f) => (
            <Pressable key={f.key} onPress={() => setFilter(f.key)}
              style={[s.chip, filter === f.key && { backgroundColor: c.accent, borderColor: c.accent }]}>
              <Text style={[s.chipText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />
          : rows.length === 0 ? (
            <Text style={s.empty}>
              {summary.total === 0
                ? 'No reviews yet. They appear once a placement ends and both sides rate each other.'
                : 'No review matches this filter.'}
            </Text>
          ) : rows.map((r) => (
            <View key={r.review_id} style={[s.card, r.rating <= 2 && { borderColor: c.red + '66' }]}>
              <View style={s.cardTop}>
                <Text style={s.name} numberOfLines={1}>{r.reviewee_name}</Text>
                <Text style={s.role}>{r.reviewee_role}</Text>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons key={i} name={r.rating >= i ? 'star' : 'star-outline'} size={13} color={c.amber} />
                  ))}
                </View>
                <Text style={[s.ratingNum, r.rating <= 2 && { color: c.red }]}>{r.rating.toFixed(1)}</Text>
              </View>
              <Text style={s.meta} numberOfLines={1}>
                reviewed by {r.reviewer_name} ({r.reviewer_role})
                {r.job_title ? ` · ${r.job_title}` : ''}
                {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}` : ''}
              </Text>
              {r.review_text
                ? <Text style={s.body}>{r.review_text}</Text>
                : <Text style={s.noBody}>Rated, but wrote no comment.</Text>}
            </View>
          ))}
      </ScrollView>
    </AdminShell>
  );
}

function Stat({ c, label, value, tone }: { c: any; label: string; value: any; tone?: string }) {
  const s = makeStyles(c);
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: any) => StyleSheet.create({
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: c.accentSoft, borderRadius: 12, padding: 13, marginBottom: 16 },
  privacyText: { flex: 1, fontSize: 12.5, color: c.text, lineHeight: 18 },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  stat: { flex: 1, minWidth: 140, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14 },
  statLabel: { fontSize: 11, color: c.subtle, fontWeight: '700' },
  statValue: { fontSize: 24, fontWeight: '800', color: c.text, marginTop: 3 },

  controls: { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  search: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: c.text },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.accent, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16 },
  exportText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel },
  chipText: { fontSize: 12.5, fontWeight: '600', color: c.muted },

  empty: { fontSize: 13, color: c.subtle, fontStyle: 'italic', paddingVertical: 24, textAlign: 'center' },
  card: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, marginBottom: 9 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '700', color: c.text },
  role: { fontSize: 11.5, color: c.subtle },
  ratingNum: { fontSize: 12.5, fontWeight: '700', color: c.muted },
  meta: { fontSize: 11.5, color: c.subtle, marginTop: 4 },
  body: { fontSize: 13.5, color: c.text, lineHeight: 20, marginTop: 9 },
  noBody: { fontSize: 12, color: c.subtle, fontStyle: 'italic', marginTop: 9 },
});
