// app/(parent)/hire/WorkModeHelpersScreen.tsx
// Parent Work Mode — Helper Management screen (Helpers tab in Work Mode tab bar)
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, RefreshControl, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, GOLD, DARK, MUTED, SUBTLE,
  DIVIDER, ICON_BG, GREEN, DANGER, WARNING_BG,
} from '@/components/parent/home/parentWarmTheme';
import { ParentWorkModeTabBar, MobileMenu } from '@/components/parent/home';
import { MobileHeader } from '@/components/helper/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useParentWorkDashboard, type PlacementDashData } from '@/hooks/parent/useParentWorkDashboard';
import { useAuth, useNotifications } from '@/hooks/shared';
import type { LeaveRequestRow } from '@/lib/leaveRequestsApi';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';

// ── Palette ──────────────────────────────────────────────────────────────
const HERO_GR   = ['#F6D9AE', '#E2A968', '#C5853E'] as const;
const CARD_GR   = ['#FFFDF9', '#FEF5E0'] as const;
const STAT_GR   = ['#FEF3DC', '#F8E2A0'] as const;
const REQ_GR    = ['#FFFAF2', '#FEF0D0'] as const;
const ORANGE    = '#D97706';
const CREAM_BG  = '#FEF9EE';

// ── Utils ────────────────────────────────────────────────────────────────
function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

function formatLeaveDate(ymd: string): string {
  try {
    const d = new Date(ymd.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ymd; }
}

function formatSalaryShort(amount: number | undefined, period: string | undefined): string {
  if (!amount) return '—';
  const n = Number(amount);
  if (isNaN(n)) return '—';
  const abbr = { daily: '/day', weekly: '/wk', monthly: '/mo' }[period ?? 'monthly'] ?? '/mo';
  return `₱${n.toLocaleString('en-PH')}${abbr}`;
}

function toMonthly(amount: number, period: string): number {
  if (period === 'daily') return amount * 26;
  if (period === 'weekly') return amount * 4.33;
  return amount;
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function contractLabel(status: string): { text: string; color: string } {
  const s = String(status).toLowerCase();
  if (s === 'hired' || s === 'accepted') return { text: 'Active', color: GREEN };
  if (s.includes('termination')) return { text: 'Ending', color: DANGER };
  return { text: status, color: MUTED };
}

// ── Hero stat pill ───────────────────────────────────────────────────────
function HeroStatPill({ icon, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={s.heroPill}>
      <Ionicons name={icon} size={14} color={DARK} />
      <Text style={s.heroPillNum}>{value}</Text>
      <Text style={s.heroPillLbl}>{label}</Text>
    </View>
  );
}

// ── Workforce stat tile ──────────────────────────────────────────────────
function StatTile({ icon, value, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
}) {
  return (
    <LinearGradient colors={STAT_GR} style={s.statTile}>
      <View style={s.statIconWrap}>
        <Ionicons name={icon} size={14} color={BROWN} />
      </View>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={2}>{label}</Text>
    </LinearGradient>
  );
}

// ── Mini stat chip ───────────────────────────────────────────────────────
function MiniChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.miniChip}>
      <Text style={[s.miniChipVal, color ? { color } : null]}>{value}</Text>
      <Text style={s.miniChipLbl}>{label}</Text>
    </View>
  );
}

// ── Helper Request row ───────────────────────────────────────────────────
function RequestRow({ leave, placement, onReview }: {
  leave: LeaveRequestRow;
  placement: ActivePlacement;
  onReview: () => void;
}) {
  const initials = getInitials(placement.helper_name);
  return (
    <LinearGradient colors={REQ_GR} style={s.reqRow}>
      <View style={s.reqAccent} />
      {placement.helper_photo ? (
        <Image source={{ uri: placement.helper_photo }} style={s.reqAvatar} contentFit="cover" />
      ) : (
        <View style={[s.reqAvatar, s.reqAvatarFb]}>
          <Text style={s.reqAvatarText}>{initials}</Text>
        </View>
      )}
      <View style={s.reqBody}>
        <Text style={s.reqName} numberOfLines={1}>{placement.helper_name}</Text>
        <View style={s.reqTypePill}>
          <Ionicons name="calendar-outline" size={11} color={BROWN} />
          <Text style={s.reqTypeText}>Leave Request</Text>
        </View>
        <Text style={s.reqDate}>{formatLeaveDate(leave.date)}</Text>
      </View>
      <TouchableOpacity style={s.reqReviewBtn} onPress={onReview} activeOpacity={0.85}>
        <Text style={s.reqReviewText}>Review</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ── Active Helper card ───────────────────────────────────────────────────
function HelperCard({ data, onPress }: { data: PlacementDashData; onPress: () => void }) {
  const { placement, checkedIn, checkInAt, tasksTotal, tasksDone, pendingLeaves } = data;
  const ct = contractLabel(placement.status);
  const initials = getInitials(placement.helper_name);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.86}>
      <LinearGradient colors={CARD_GR} style={s.helperCard}>
        {/* Photo */}
        <View style={s.helperPhotoWrap}>
          {placement.helper_photo ? (
            <Image source={{ uri: placement.helper_photo }} style={s.helperPhoto} contentFit="cover" />
          ) : (
            <View style={[s.helperPhoto, s.helperPhotoFb]}>
              <Text style={s.helperPhotoText}>{initials}</Text>
            </View>
          )}
          {/* Check-in dot indicator */}
          <View style={[s.checkinDot, { backgroundColor: checkedIn ? GREEN : ORANGE }]} />
        </View>

        {/* Info column */}
        <View style={s.helperInfo}>
          <Text style={s.helperName} numberOfLines={1}>{placement.helper_name}</Text>
          <Text style={s.helperJobTitle} numberOfLines={1}>{placement.job_title}</Text>

          {/* Check-in status */}
          <View style={[s.checkinBadge, checkedIn ? s.checkinBadgeIn : s.checkinBadgeOut]}>
            <Ionicons
              name={checkedIn ? 'checkmark-circle' : 'time-outline'}
              size={11}
              color={checkedIn ? GREEN : ORANGE}
            />
            <Text style={[s.checkinText, { color: checkedIn ? GREEN : ORANGE }]}>
              {checkedIn
                ? `Checked In${checkInAt ? ` · ${formatTime(checkInAt)}` : ''}`
                : 'Not Checked In'}
            </Text>
          </View>

          {/* Mini stats row */}
          <View style={s.miniRow}>
            <MiniChip
              label="Tasks"
              value={tasksTotal > 0 ? `${tasksDone}/${tasksTotal}` : '—'}
            />
            <View style={s.miniDivider} />
            <MiniChip
              label="Leave"
              value={pendingLeaves.length > 0 ? `${pendingLeaves.length}` : '0'}
              color={pendingLeaves.length > 0 ? ORANGE : undefined}
            />
            <View style={s.miniDivider} />
            <MiniChip
              label="Salary"
              value={formatSalaryShort(placement.salary_offered, placement.salary_period)}
            />
            <View style={s.miniDivider} />
            <MiniChip label="Contract" value={ct.text} color={ct.color} />
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────
type SortKey = 'checkin' | 'name';

export function WorkModeHelpersScreen() {
  const router = useRouter();
  const { handleLogout } = useAuth();
  const { unreadCount } = useNotifications('parent');
  const { perPlacement, stats, loading, refresh } = useParentWorkDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('checkin');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  }, [refresh]);

  // Flatten pending leave requests across all placements
  const allRequests = useMemo(
    () => perPlacement.flatMap(pd =>
      pd.pendingLeaves.map(leave => ({ leave, placement: pd.placement }))
    ),
    [perPlacement],
  );

  // Sorted helper list
  const sortedHelpers = useMemo(() => {
    const arr = [...perPlacement];
    if (sortKey === 'name') {
      arr.sort((a, b) => a.placement.helper_name.localeCompare(b.placement.helper_name));
    } else {
      arr.sort((a, b) => (b.checkedIn ? 1 : 0) - (a.checkedIn ? 1 : 0));
    }
    return arr;
  }, [perPlacement, sortKey]);

  // Total monthly payroll
  const totalPayroll = useMemo(() =>
    perPlacement.reduce((sum, pd) => {
      const amt = Number(pd.placement.salary_offered ?? 0);
      const per = pd.placement.salary_period ?? 'monthly';
      return sum + toMonthly(amt, per);
    }, 0),
    [perPlacement],
  );

  const payrollStr = totalPayroll > 0
    ? `₱${Math.round(totalPayroll).toLocaleString('en-PH')}`
    : '₱0';

  const showEmpty = !loading && perPlacement.length === 0;

  return (
    <SafeAreaView style={s.root}>
      <MobileHeader
        onMenuPress={() => setMenuOpen(true)}
        subtitle="My Helpers"
        notificationCount={unreadCount}
        onNotificationPress={() => router.push('/(parent)/notifications')}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={BROWN}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero gradient card ──────────────────────────────────── */}
        <LinearGradient
          colors={HERO_GR}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroContent}>
            <View style={s.heroTextCol}>
              <View style={s.heroEyebrowRow}>
                <Ionicons name="home" size={13} color="rgba(59,42,24,0.7)" />
                <Text style={s.heroEyebrow}>HOUSEHOLD OVERVIEW</Text>
              </View>
              <Text style={s.heroTitle}>Your Household{'\n'}Team</Text>
              <Text style={s.heroSub}>
                Manage your active helpers and{'\n'}daily household operations.
              </Text>
              <View style={s.heroPillsRow}>
                <HeroStatPill icon="people" value={stats.activeHelpers} label="Active" />
                <HeroStatPill icon="checkmark-circle" value={stats.checkedInToday} label="Checked In" />
              </View>
            </View>
            <Image
              source={require('@/assets/landing/family-role.png')}
              style={s.heroImg}
              contentFit="cover"
            />
          </View>
        </LinearGradient>

        {/* ── Helper Requests ─────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Helper Requests</Text>
            {allRequests.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(parent)/hire/requests' as never)}
              >
                <Text style={s.viewAllLink}>View all ({allRequests.length}) ›</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && allRequests.length === 0 ? (
            <ActivityIndicator color={BROWN} style={{ marginVertical: 16 }} />
          ) : allRequests.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={30} color={MUTED} />
              <Text style={s.emptyCardText}>No pending requests</Text>
            </View>
          ) : (
            allRequests.slice(0, 3).map(({ leave, placement }) => (
              <RequestRow
                key={`${placement.application_id}-${leave.id}`}
                leave={leave}
                placement={placement}
                onReview={() => router.push('/(parent)/hire/requests' as never)}
              />
            ))
          )}
        </View>

        {/* ── Workforce Overview ──────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Workforce Overview</Text>
          <View style={s.statGrid}>
            <StatTile
              icon="people-outline"
              value={stats.activeHelpers}
              label="Active Helpers"
            />
            <StatTile
              icon="checkmark-done-circle-outline"
              value={`${stats.checkedInToday}/${stats.activeHelpers}`}
              label="Checked In Today"
            />
            <StatTile
              icon="clipboard-outline"
              value={stats.pendingTasksTotal}
              label="Tasks Pending"
            />
            <StatTile
              icon="wallet-outline"
              value={payrollStr}
              label="Monthly Payroll"
            />
          </View>
        </View>

        {/* ── All Active Helpers ──────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>All Active Helpers</Text>
            <TouchableOpacity
              style={s.sortToggle}
              onPress={() => setSortKey(k => k === 'checkin' ? 'name' : 'checkin')}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-vertical-outline" size={13} color={BROWN} />
              <Text style={s.sortToggleText}>
                Sort: {sortKey === 'checkin' ? 'Check-in' : 'Name'}
              </Text>
            </TouchableOpacity>
          </View>

          {loading && sortedHelpers.length === 0 ? (
            <ActivityIndicator color={BROWN} style={{ marginTop: 24 }} />
          ) : showEmpty ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={30} color={MUTED} />
              <Text style={s.emptyCardText}>No active helpers yet</Text>
              <Text style={s.emptyCardSub}>Hire a helper from the recruitment portal to see them here.</Text>
            </View>
          ) : (
            sortedHelpers.map(pd => (
              <HelperCard
                key={pd.placement.application_id}
                data={pd}
                onPress={() =>
                  router.push({
                    pathname: '/(parent)/hire/helper_profile' as never,
                    params: {
                      application_id: String(pd.placement.application_id),
                      helper_id:      String(pd.placement.helper_id),
                      helper_name:    encodeURIComponent(pd.placement.helper_name),
                      helper_photo:   pd.placement.helper_photo ? encodeURIComponent(pd.placement.helper_photo) : '',
                      job_title:      encodeURIComponent(pd.placement.job_title),
                      status:         encodeURIComponent(pd.placement.status),
                      salary_offered: String(pd.placement.salary_offered ?? ''),
                      salary_period:  encodeURIComponent(pd.placement.salary_period ?? ''),
                      helper_phone:   pd.placement.helper_phone ? encodeURIComponent(pd.placement.helper_phone) : '',
                    },
                  })
                }
              />
            ))
          )}
        </View>

      </ScrollView>

      <ParentWorkModeTabBar />

      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        handleLogout={() => { setMenuOpen(false); setConfirmLogout(true); }}
        notificationUnread={unreadCount}
      />
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out" cancelText="Cancel" type="danger"
        onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged out successfully"
        type="success" autoClose duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10 },
  android: { elevation: 3 },
  default: { boxShadow: '0 3px 12px rgba(139,90,43,0.10)' } as any,
});

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100, gap: 16 },

  // ── Hero ──
  heroCard: {
    borderRadius: 22, overflow: 'hidden',
    ...CARD_SHADOW,
  },
  heroContent:  { flexDirection: 'row', alignItems: 'flex-end' },
  heroTextCol:  { flex: 1, padding: 20, paddingBottom: 18 },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  heroEyebrow:  {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 10,
    color: 'rgba(59,42,24,0.65)', letterSpacing: 1.2,
  },
  heroTitle:    {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 26,
    color: DARK, lineHeight: 32, marginBottom: 6,
  },
  heroSub:      {
    fontFamily: FontFamily.fredokaRegular, fontSize: 13,
    color: 'rgba(59,42,24,0.72)', lineHeight: 19, marginBottom: 16,
  },
  heroPillsRow: { flexDirection: 'row', gap: 8 },
  heroPill:     {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10,
  },
  heroPillNum:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  heroPillLbl:  { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: 'rgba(59,42,24,0.72)' },
  heroImg:      { width: 120, height: 148, borderRadius: 0, flexShrink: 0 },

  // ── Section ──
  section:      { gap: 10 },
  sectionHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  viewAllLink:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },

  // ── Stat grid ──
  statGrid:     { flexDirection: 'row', gap: 6 },
  statTile:     {
    flex: 1, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
    gap: 3, borderWidth: 1, borderColor: DIVIDER, ...CARD_SHADOW,
  },
  statIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center',
  },
  statValue:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  statLabel:    { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, textAlign: 'center', lineHeight: 13 },

  // ── Request row ──
  reqRow:       {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, overflow: 'hidden',
    paddingVertical: 12, paddingRight: 12,
    borderWidth: 1, borderColor: DIVIDER, ...CARD_SHADOW,
  },
  reqAccent:    { width: 4, alignSelf: 'stretch', backgroundColor: CARAMEL },
  reqAvatar:    { width: 42, height: 42, borderRadius: 21 },
  reqAvatarFb:  { backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  reqAvatarText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
  reqBody:      { flex: 1, minWidth: 0 },
  reqName:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 3 },
  reqTypePill:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  reqTypeText:  { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: BROWN },
  reqDate:      { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  reqReviewBtn: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: BROWN,
  },
  reqReviewText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },

  // ── Helper card ──
  helperCard:   {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: DIVIDER, ...CARD_SHADOW,
  },
  helperPhotoWrap: { position: 'relative' },
  helperPhoto:  { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: DIVIDER },
  helperPhotoFb:{ backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  helperPhotoText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: BROWN },
  checkinDot:   {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 2, borderColor: CREAM_BG,
  },

  helperInfo:   { flex: 1, minWidth: 0, gap: 2 },
  helperName:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  helperJobTitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 2 },

  checkinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 },
  checkinBadgeIn:  { backgroundColor: '#DCFCE7' },
  checkinBadgeOut: { backgroundColor: '#FEF3C7' },
  checkinText:  { fontFamily: FontFamily.fredokaRegular, fontSize: 11 },

  miniRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  miniChip:     { alignItems: 'center', paddingHorizontal: 7 },
  miniChipVal:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: DARK },
  miniChipLbl:  { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, marginTop: 1 },
  miniDivider:  { width: 1, height: 22, backgroundColor: DIVIDER },

  // Sort toggle
  sortToggle:   {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: ICON_BG, borderRadius: 10, borderWidth: 1, borderColor: DIVIDER,
  },
  sortToggleText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN },

  // Empty card
  emptyCard:    {
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20,
    gap: 8, borderRadius: 16, backgroundColor: 'rgba(255,248,240,0.8)',
    borderWidth: 1, borderColor: DIVIDER,
  },
  emptyCardText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  emptyCardSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: SUBTLE, textAlign: 'center', lineHeight: 18 },
});
