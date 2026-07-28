// app/(parent)/home/ParentWorkDashboard.tsx
// Work Mode dashboard ("Work Home") — mobile. Fintech-calm, mirroring the helper
// side: ONE hero (identity + total monthly payroll), a "needs your attention" row
// (leave + helper requests together), compact active-helper cards, and a tucked
// "Manage" list. Attendance/tasks detail live on their own screens, not here.
import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { FontFamily } from '@/constants/GlobalStyles';
import {
  BROWN, DARK, MUTED, SUBTLE, DIVIDER, ICON_BG, GREEN, DANGER, SURFACE,
} from '@/components/parent/home/parentWarmTheme';
import { useParentWorkDashboard, type PlacementDashData } from '@/hooks/parent/useParentWorkDashboard';
import type { LeaveRequestRow } from '@/lib/leaveRequestsApi';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';

// ─── Palette ─────────────────────────────────────────────────────────────────
const HERO_GRADIENT = ['#F6D9AE', '#E2A968', '#C5853E'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toMonthly(salary: number | undefined, period: string | undefined): number {
  if (!salary) return 0;
  const p = (period ?? '').toLowerCase();
  if (p === 'daily') return salary * 26;
  if (p === 'weekly') return Math.round(salary * 4.33);
  return salary;
}
function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
function formatPeso(amount: number): string {
  return '₱' + Math.round(amount).toLocaleString('en-PH');
}
function formatLeaveDate(ymd: string): string {
  try {
    const d = new Date(ymd.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ymd; }
}

function Avatar({ uri, name, size = 44, radius = 12 }: { uri?: string | null; name: string; size?: number; radius?: number }) {
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: Math.round(size * 0.34), color: BROWN }}>{getInitials(name)}</Text>
    </View>
  );
}

// ─── Combined "needs attention" item (leave or helper/termination request) ───
type AttentionItem =
  | { kind: 'leave'; key: string; placement: ActivePlacement; leave: LeaveRequestRow }
  | { kind: 'request'; key: string; placement: ActivePlacement };

function AttentionRow({ item, onPress }: { item: AttentionItem; onPress: () => void }) {
  const p = item.placement;
  const sub = item.kind === 'leave'
    ? `Leave requested · ${formatLeaveDate(item.leave.date)}`
    : `Wants to end the placement${p.termination_last_day ? ` · ${p.termination_last_day}` : ''}`;
  return (
    <TouchableOpacity style={s.attnRow} onPress={onPress} activeOpacity={0.8}>
      <Avatar uri={p.helper_photo} name={p.helper_name} size={38} radius={10} />
      <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
        <Text style={s.attnName} numberOfLines={1}>{p.helper_name}</Text>
        <Text style={s.attnSub} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={[s.attnPill, item.kind === 'request' && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
        <Text style={[s.attnPillText, item.kind === 'request' && { color: DANGER }]}>Review</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Compact active-helper card ───────────────────────────────────────────────
function HelperCard({ data, onPress }: { data: PlacementDashData; onPress: () => void }) {
  const { placement: p, checkedIn, checkInAt } = data;
  const timeStr = checkInAt ? (() => {
    try { return new Date(checkInAt.replace(' ', 'T')).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
    catch { return null; }
  })() : null;
  return (
    <TouchableOpacity style={s.helperCard} onPress={onPress} activeOpacity={0.85}>
      <Avatar uri={p.helper_photo} name={p.helper_name} size={46} radius={13} />
      <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
        <Text style={s.helperName} numberOfLines={1}>{p.helper_name}</Text>
        <Text style={s.helperRole} numberOfLines={1}>{p.job_title}</Text>
        <View style={s.checkRow}>
          <View style={[s.checkDot, { backgroundColor: checkedIn ? GREEN : SUBTLE }]} />
          <Text style={s.checkText}>{checkedIn ? `Checked in${timeStr ? ` · ${timeStr}` : ''}` : 'Not checked in'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color={SUBTLE} />
    </TouchableOpacity>
  );
}

function ManageRow({ icon, label, onPress, danger, last }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean; last?: boolean;
}) {
  return (
    <TouchableOpacity style={[s.manageRow, !last && s.manageRowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.manageIcon, { backgroundColor: (danger ? DANGER : BROWN) + '18' }]}>
        <Ionicons name={icon} size={17} color={danger ? DANGER : BROWN} />
      </View>
      <Text style={[s.manageLabel, danger && { color: DANGER }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type Props = { userName: string; profileImage: string | null; onSwitchToRecruitment: () => void };

export default function ParentWorkDashboard({ userName, profileImage, onSwitchToRecruitment }: Props) {
  const router = useRouter();
  const { perPlacement, loading, refresh } = useParentWorkDashboard();

  const payrollTotal = useMemo(
    () => perPlacement.reduce((sum, d) => sum + toMonthly(d.placement.salary_offered, d.placement.salary_period), 0),
    [perPlacement],
  );

  const attentionItems = useMemo((): AttentionItem[] => {
    const leaves: AttentionItem[] = perPlacement.flatMap((d) =>
      d.pendingLeaves.map((l) => ({ kind: 'leave' as const, key: `l-${l.id}`, placement: d.placement, leave: l })));
    const requests: AttentionItem[] = perPlacement
      .filter((d) => d.placement.status === 'termination_pending')
      .map((d) => ({ kind: 'request' as const, key: `r-${d.placement.application_id}`, placement: d.placement }));
    return [...requests, ...leaves];
  }, [perPlacement]);

  const first = (userName || 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Unified hero: identity + total payroll ── */}
      <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.circle1} />
        <View style={s.circle2} />

        <View style={s.heroIdentity}>
          <View style={s.heroAvatarWrap}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={s.heroAvatar} contentFit="cover" />
            ) : (
              <View style={[s.heroAvatar, s.heroAvatarFb]}><Ionicons name="person" size={26} color={BROWN} /></View>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.kickerBadge}>
              <Ionicons name="briefcase" size={10} color="#fff" />
              <Text style={s.kickerText}>WORK MODE</Text>
            </View>
            <Text style={s.heroGreeting}>{greeting},</Text>
            <Text style={s.heroName} numberOfLines={1}>{first} 👋</Text>
          </View>
        </View>

        <View style={s.heroDivider} />

        <View>
          <Text style={s.heroLabel}>TOTAL MONTHLY PAYROLL</Text>
          <Text style={s.heroAmount}>{formatPeso(payrollTotal)}</Text>
          <Text style={s.heroSub}>
            Across {perPlacement.length} active helper{perPlacement.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>

      <Text style={s.explainer}>
        Manage pay, rest days, and day-to-day coordination for your helpers. Attendance tracking is optional.
      </Text>

      {/* ── Needs your attention ── */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Needs your attention</Text>
          {attentionItems.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(parent)/hire/requests' as never)}>
              <Text style={s.viewAllLink}>View all ({attentionItems.length}) ›</Text>
            </TouchableOpacity>
          )}
        </View>
        {attentionItems.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={26} color={MUTED} />
            <Text style={s.emptyCardText}>Nothing needs your attention right now.</Text>
          </View>
        ) : (
          attentionItems.slice(0, 4).map((item) => (
            <AttentionRow key={item.key} item={item} onPress={() => router.push('/(parent)/hire/requests' as never)} />
          ))
        )}
      </View>

      {/* ── Active helpers (compact) ── */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Active helpers</Text>
          <TouchableOpacity onPress={() => router.push('/(parent)/hire' as never)}>
            <Text style={s.viewAllLink}>View all ›</Text>
          </TouchableOpacity>
        </View>
        {perPlacement.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyCardText}>No active helpers yet. Switch to Recruitment Mode to find one.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={onSwitchToRecruitment} activeOpacity={0.85}>
              <Text style={s.emptyBtnText}>Go to Recruitment Mode</Text>
            </TouchableOpacity>
          </View>
        ) : (
          perPlacement.map((d) => (
            <HelperCard
              key={d.placement.application_id}
              data={d}
              onPress={() => router.push({
                pathname: '/(parent)/hire/helper_profile' as never,
                params: {
                  application_id: String(d.placement.application_id),
                  helper_id: String(d.placement.helper_id),
                  helper_name: encodeURIComponent(d.placement.helper_name),
                  helper_photo: d.placement.helper_photo ? encodeURIComponent(d.placement.helper_photo) : '',
                  job_title: encodeURIComponent(d.placement.job_title),
                  status: encodeURIComponent(d.placement.status),
                  salary_offered: String(d.placement.salary_offered ?? ''),
                  salary_period: encodeURIComponent(d.placement.salary_period ?? ''),
                  helper_phone: d.placement.helper_phone ? encodeURIComponent(d.placement.helper_phone) : '',
                },
              })}
            />
          ))
        )}
      </View>

      {/* ── Manage (tucked links) ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Manage</Text>
        <View style={s.manageCard}>
          <ManageRow icon="people-outline" label="Helper Management" onPress={() => router.push('/(parent)/hire' as never)} />
          <ManageRow icon="clipboard-outline" label="Tasks" onPress={() => router.push('/(parent)/hire/placement_tasks' as never)} />
          <ManageRow icon="time-outline" label="Placement History" onPress={() => router.push('/(parent)/hire/history' as never)} />
          <ManageRow icon="swap-horizontal-outline" label="Switch to Recruitment Mode" onPress={onSwitchToRecruitment} last />
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { paddingBottom: 24 },

  hero: {
    marginHorizontal: 12, marginTop: 4, marginBottom: 10,
    borderRadius: 22, padding: 20, overflow: 'hidden',
  },
  circle1: { position: 'absolute', right: -34, top: -34, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.14)' },
  circle2: { position: 'absolute', right: 70, bottom: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(139,90,43,0.10)' },

  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatarWrap: {},
  heroAvatar: { width: 52, height: 52, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  heroAvatarFb: { backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  kickerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BROWN, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start', marginBottom: 5 },
  kickerText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: '#fff', letterSpacing: 1.1 },
  heroGreeting: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#5A4327' },
  heroName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: DARK },

  heroDivider: { height: 1, backgroundColor: 'rgba(139,90,43,0.18)', marginVertical: 16 },

  heroLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, letterSpacing: 1, color: '#5A4327' },
  heroAmount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 36, color: DARK, marginTop: 6, letterSpacing: -0.5 },
  heroSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: '#5A4327', marginTop: 2 },

  explainer: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, textAlign: 'center', marginHorizontal: 20, marginBottom: 16, lineHeight: 17 },

  section: { marginHorizontal: 12, marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 10 },
  viewAllLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: BROWN },

  // Attention row
  attnRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE,
    borderRadius: 14, padding: 11, borderWidth: 1, borderColor: DIVIDER, marginBottom: 8,
  },
  attnName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK },
  attnSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED, marginTop: 1 },
  attnPill: { backgroundColor: ICON_BG, borderWidth: 1, borderColor: DIVIDER, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  attnPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN },

  // Helper card
  helperCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE,
    borderRadius: 16, padding: 12, borderWidth: 1, borderColor: DIVIDER, marginBottom: 8,
  },
  helperName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: DARK },
  helperRole: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  checkDot: { width: 6, height: 6, borderRadius: 3 },
  checkText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

  // Manage
  manageCard: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, paddingHorizontal: 4 },
  manageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 10 },
  manageRowBorder: { borderBottomWidth: 1, borderBottomColor: DIVIDER },
  manageIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  manageLabel: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },

  // Empty states
  emptyCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: DIVIDER, gap: 8 },
  emptyCardText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  emptyBtn: { marginTop: 4, backgroundColor: BROWN, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  emptyBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },
});
