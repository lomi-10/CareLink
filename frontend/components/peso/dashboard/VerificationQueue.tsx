// components/peso/dashboard/VerificationQueue.tsx
// "Verification Queue" panel — Helpers/Employers tab preview with Review action.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { QueueEntry, VerificationQueue as QueueData } from '@/lib/pesoDashboardApi';

type Tab = 'helpers' | 'employers';

export function VerificationQueue({ queue, router }: { queue: QueueData; router: ReturnType<typeof useRouter> }) {
  const [tab, setTab] = useState<Tab>('helpers');
  const entries = tab === 'helpers' ? queue.helpers : queue.employers;

  return (
    <View style={s.panel}>
      <View style={s.headRow}>
        <Text style={s.panelTitle}>Verification Queue</Text>
      </View>
      <View style={s.tabRow}>
        <Tab label="Helpers" count={queue.helpers_total} active={tab === 'helpers'} onPress={() => setTab('helpers')} />
        <Tab label="Employers" count={queue.employers_total} active={tab === 'employers'} onPress={() => setTab('employers')} />
      </View>

      {entries.length === 0 ? (
        <Text style={s.emptyText}>No one waiting on this list right now.</Text>
      ) : (
        entries.map((entry) => (
          <QueueRow
            key={entry.user_id}
            entry={entry}
            onReview={() => router.push({
              pathname: '/(peso)/users/view_profile',
              params: { user_id: String(entry.user_id), user_type: tab === 'helpers' ? 'helper' : 'parent' },
            } as never)}
          />
        ))
      )}

      <TouchableOpacity onPress={() => router.push('/(peso)/users' as never)} activeOpacity={0.7}>
        <Text style={s.viewAll}>View all {tab} →</Text>
      </TouchableOpacity>
    </View>
  );
}

function Tab({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.tabChip, active && s.tabChipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[s.tabChipText, active && s.tabChipTextActive]}>{label}</Text>
      <View style={[s.tabCount, active && s.tabCountActive]}>
        <Text style={[s.tabCountText, active && s.tabCountTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

function QueueRow({ entry, onReview }: { entry: QueueEntry; onReview: () => void }) {
  const initials = entry.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  return (
    <View style={s.row}>
      {entry.profile_image ? (
        <Image source={{ uri: entry.profile_image }} style={s.avatar} contentFit="cover" />
      ) : (
        <View style={[s.avatar, s.avatarFallback]}>
          <Text style={s.avatarInitials}>{initials}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>{entry.name}</Text>
        <Text style={s.code}>Helper ID: {entry.code}</Text>
        <View style={s.tagRow}>
          {entry.tags.map((t) => (
            <View key={t} style={s.tag}>
              <Text style={s.tagText}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={s.submitted}>Submitted {entry.submitted_label}</Text>
      </View>
      <TouchableOpacity style={s.reviewBtn} onPress={onReview} activeOpacity={0.8}>
        <Text style={s.reviewBtnText}>Review</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    flex: 1, minWidth: 300, backgroundColor: theme.color.surfaceElevated, borderRadius: theme.radius.lg,
    padding: 18, borderWidth: 1, borderColor: theme.color.line, ...theme.shadow.card,
  },
  headRow: { marginBottom: 12 },
  panelTitle: { fontSize: 15, fontWeight: '800', color: theme.color.ink },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.line,
  },
  tabChipActive: { backgroundColor: '#FFF4E5', borderColor: theme.color.peso },
  tabChipText: { fontSize: 12, fontWeight: '700', color: theme.color.muted },
  tabChipTextActive: { color: theme.color.peso },
  tabCount: { backgroundColor: theme.color.line, borderRadius: 8, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  tabCountActive: { backgroundColor: theme.color.peso },
  tabCountText: { fontSize: 10, fontWeight: '700', color: theme.color.muted },
  tabCountTextActive: { color: '#fff' },

  emptyText: { fontSize: 13, color: theme.color.muted, paddingVertical: 16, textAlign: 'center' },

  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.color.line },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: theme.color.pesoSoft, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 13, fontWeight: '700', color: theme.color.peso },
  name: { fontSize: 13, fontWeight: '700', color: theme.color.ink },
  code: { fontSize: 11, color: theme.color.subtle, marginTop: 1 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  tag: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.line, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '600', color: theme.color.muted },
  submitted: { fontSize: 10, color: theme.color.subtle, marginTop: 5 },
  reviewBtn: { alignSelf: 'flex-start', backgroundColor: '#FFF4E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  reviewBtnText: { fontSize: 12, fontWeight: '700', color: theme.color.peso },

  viewAll: { fontSize: 12, fontWeight: '700', color: theme.color.peso, marginTop: 12, textAlign: 'left' },
});
