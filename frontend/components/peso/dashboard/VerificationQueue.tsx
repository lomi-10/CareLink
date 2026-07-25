// components/peso/dashboard/VerificationQueue.tsx
// "Verification Queue" panel — Helpers/Employers tab preview with Review action.
// Theme-aware (light/dark), animated entrance, hover feedback on tabs + buttons.
import { Image } from 'expo-image';
import type { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimateIn } from '@/components/peso/ui';
import { usePesoTheme, shadow, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';
import type { QueueEntry, VerificationQueue as QueueData } from '@/lib/pesoDashboardApi';

type Tab = 'helpers' | 'employers';

export function VerificationQueue({ queue, router }: { queue: QueueData; router: ReturnType<typeof useRouter> }) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c, dark), [c, dark]);
  const [tab, setTab] = useState<Tab>('helpers');
  const entries = tab === 'helpers' ? queue.helpers : queue.employers;

  return (
    <AnimateIn delay={80} style={s.panel}>
      <View style={s.headRow}>
        <Text style={s.panelTitle}>Verification Queue</Text>
      </View>
      <View style={s.tabRow}>
        <TabChip label="Helpers" count={queue.helpers_total} active={tab === 'helpers'} onPress={() => setTab('helpers')} />
        <TabChip label="Employers" count={queue.employers_total} active={tab === 'employers'} onPress={() => setTab('employers')} />
      </View>

      {entries.length === 0 ? (
        <Text style={s.emptyText}>No one waiting on this list right now.</Text>
      ) : (
        entries.map((entry) => (
          <QueueRow
            key={entry.user_id}
            entry={entry}
            onReview={() => router.push({
              pathname: '/(peso)/users',
              params: { focus: String(entry.user_id), focus_type: tab === 'helpers' ? 'helper' : 'parent' },
            } as never)}
          />
        ))
      )}

      <Pressable onPress={() => router.push('/(peso)/users' as never)}>
        {({ hovered }: any) => <Text style={[s.viewAll, hovered && s.viewAllHover]}>View all {tab} →</Text>}
      </Pressable>
    </AnimateIn>
  );
}

function TabChip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c, dark), [c, dark]);
  return (
    <Pressable onPress={onPress}
      style={({ hovered }: any) => [s.tabChip, active && s.tabChipActive, hovered && !active && s.tabChipHover]}>
      <Text style={[s.tabChipText, active && s.tabChipTextActive]}>{label}</Text>
      <View style={[s.tabCount, active && s.tabCountActive]}>
        <Text style={[s.tabCountText, active && s.tabCountTextActive]}>{count}</Text>
      </View>
    </Pressable>
  );
}

function QueueRow({ entry, onReview }: { entry: QueueEntry; onReview: () => void }) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c, dark), [c, dark]);
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
      <Pressable onPress={onReview} style={({ hovered }: any) => [s.reviewBtn, hovered && s.reviewBtnHover]}>
        <Text style={s.reviewBtnText}>Review</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: PesoColors, dark: boolean) => StyleSheet.create({
  panel: {
    flex: 1, minWidth: 300, backgroundColor: c.surface, borderRadius: radius.lg,
    padding: 18, borderWidth: 1, borderColor: c.line, ...shadow('sm', dark),
  },
  headRow: { marginBottom: 12 },
  panelTitle: { fontSize: 15, fontFamily: font.display, color: c.ink },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: c.sunken, borderWidth: 1, borderColor: c.line,
    ...(({ transitionDuration: '140ms' }) as any),
  },
  tabChipActive: { backgroundColor: c.accentSoft, borderColor: c.accent },
  tabChipHover: { borderColor: c.accent, backgroundColor: c.raise },
  tabChipText: { fontSize: 12, fontFamily: font.semibold, color: c.muted },
  tabChipTextActive: { color: c.accentInk },
  tabCount: { backgroundColor: c.line, borderRadius: 8, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  tabCountActive: { backgroundColor: c.accent },
  tabCountText: { fontSize: 10, fontFamily: font.semibold, color: c.muted },
  tabCountTextActive: { color: '#fff' },

  emptyText: { fontSize: 13, color: c.muted, paddingVertical: 16, textAlign: 'center', fontFamily: font.regular },

  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 13, fontFamily: font.semibold, color: c.accent },
  name: { fontSize: 13, fontFamily: font.semibold, color: c.ink },
  code: { fontSize: 11, color: c.subtle, marginTop: 1, fontFamily: font.regular },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  tag: { backgroundColor: c.sunken, borderWidth: 1, borderColor: c.line, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, fontFamily: font.semibold, color: c.muted },
  submitted: { fontSize: 10, color: c.subtle, marginTop: 5, fontFamily: font.regular },
  reviewBtn: { alignSelf: 'flex-start', backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, ...(({ transitionDuration: '140ms' }) as any) },
  reviewBtnHover: { backgroundColor: c.accent2 },
  reviewBtnText: { fontSize: 12, fontFamily: font.semibold, color: c.onAccent },

  viewAll: { fontSize: 12, fontFamily: font.semibold, color: c.accent, marginTop: 12, textAlign: 'left', ...(({ transitionDuration: '140ms' }) as any) },
  viewAllHover: { color: c.accentInk },
});
