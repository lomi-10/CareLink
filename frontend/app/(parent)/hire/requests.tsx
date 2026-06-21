// app/(parent)/hire/requests.tsx
// Parent Work Mode — Unified Requests screen (Leave · Termination · Overtime)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, DARK, MUTED,
  DIVIDER, ICON_BG, GREEN, DANGER,
} from '@/components/parent/home/parentWarmTheme';
import { ParentWorkModeTabBar } from '@/components/parent/home';
import { useAuth } from '@/hooks/shared';
import { useParentActivePlacements, type ActivePlacement } from '@/hooks/parent/useParentActivePlacements';
import {
  fetchLeaveRequests, respondToLeaveRequest, labelForLeaveReasonCode,
  type LeaveRequestRow,
} from '@/lib/leaveRequestsApi';
import {
  fetchTerminationDetails, isTerminationPendingStatus,
  type TerminationDetailsResponse,
} from '@/lib/terminationApi';
import { ConfirmationModal, NotificationModal } from '@/components/shared';

// ── Palette ───────────────────────────────────────────────────────────────
const ORANGE      = '#D97706';
const ORANGE_BG   = '#FEF3C7';
const ORANGE_LITE = '#FFF9EE';
const BLUE        = '#2563EB';
const BLUE_BG     = '#EFF6FF';
const RED_BG      = '#FEE2E2';
const GREEN_BG    = '#DCFCE7';
const CARD_GR     = ['#FFFDF9', '#FEF5E0'] as const;

// ── Types ─────────────────────────────────────────────────────────────────
type ReqType = 'leave' | 'termination' | 'overtime';
type FilterTab = 'all' | ReqType;

type UnifiedRequest = {
  key: string;
  type: ReqType;
  placement: ActivePlacement;
  status: 'pending' | 'approved' | 'declined';
  sortDate: string;
  // leave
  leaveRow?: LeaveRequestRow;
  // termination
  termRow?: TerminationDetailsResponse;
};

// ── Utils ─────────────────────────────────────────────────────────────────
function fmtDate(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  try {
    const d = new Date(ymd.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ymd; }
}

function fmtDateLong(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  try {
    const d = new Date(ymd.replace(/-/g, '/'));
    if (isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return ymd; }
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function isToday(ymd: string): boolean {
  const t = new Date();
  const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  return ymd === today;
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ photo, name, color }: { photo?: string | null; name: string; color: string }) {
  return photo ? (
    <Image source={{ uri: photo }} style={[s.avatar, { borderColor: color }]} contentFit="cover" />
  ) : (
    <View style={[s.avatar, s.avatarFb, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <Text style={[s.avatarText, { color }]}>{getInitials(name)}</Text>
    </View>
  );
}

// ── Type badge ─────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: ReqType }) {
  const cfg = {
    leave:       { label: 'Leave Request',       icon: 'calendar-outline' as const, color: BLUE,    bg: BLUE_BG },
    termination: { label: 'Termination Request', icon: 'exit-outline'     as const, color: DANGER,  bg: RED_BG },
    overtime:    { label: 'Overtime Request',    icon: 'time-outline'     as const, color: ORANGE,  bg: ORANGE_BG },
  }[type];
  return (
    <View style={[s.typeBadge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[s.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s2 = status.toLowerCase();
  const color = s2 === 'approved' ? GREEN : s2 === 'declined' ? DANGER : ORANGE;
  const bg    = s2 === 'approved' ? GREEN_BG : s2 === 'declined' ? RED_BG : ORANGE_BG;
  return (
    <View style={[s.statusBadge, { backgroundColor: bg }]}>
      <Text style={[s.statusBadgeText, { color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

// ── Pending card ────────────────────────────────────────────────────────────
function PendingCard({ req, onReview }: { req: UnifiedRequest; onReview: () => void }) {
  const avatarColor = req.type === 'leave' ? BLUE : req.type === 'termination' ? DANGER : ORANGE;
  const { placement } = req;

  const mainLine = (() => {
    if (req.type === 'leave' && req.leaveRow) {
      const d = req.leaveRow.date;
      return isToday(d) ? `Today, ${fmtDateLong(d)}` : fmtDateLong(d);
    }
    if (req.type === 'termination' && req.termRow) {
      return req.termRow.termination_last_day
        ? `Effective: ${fmtDateLong(req.termRow.termination_last_day)}`
        : 'Effective date TBD';
    }
    return '—';
  })();

  const reasonLine = (() => {
    if (req.type === 'leave' && req.leaveRow) {
      const code = req.leaveRow.reason_code;
      const note = req.leaveRow.helper_note;
      const label = labelForLeaveReasonCode(code ?? '');
      return note ? `${label} — ${note}` : label;
    }
    if (req.type === 'termination' && req.termRow) {
      return req.termRow.termination_reason_label ?? req.termRow.termination_reason ?? 'Personal reason';
    }
    return '';
  })();

  const metaLeft = (() => {
    if (req.type === 'termination' && req.termRow?.termination_notice_date) {
      return { label: 'Requested on', value: fmtDate(req.termRow.termination_notice_date) };
    }
    if (req.leaveRow?.created_at) {
      return { label: 'Requested on', value: fmtDate(req.leaveRow.created_at.slice(0, 10)) };
    }
    return null;
  })();

  const metaRight = (() => {
    if (req.type === 'leave') return { label: 'Schedule impact', value: '1 day' };
    if (req.type === 'termination') return { label: 'Type', value: 'Contract end' };
    return null;
  })();

  return (
    <LinearGradient colors={CARD_GR} style={s.reqCard}>
      <View style={s.reqCardTop}>
        <Avatar photo={placement.helper_photo} name={placement.helper_name} color={avatarColor} />
        <View style={s.reqCardBody}>
          <View style={s.reqCardNameRow}>
            <Text style={s.reqCardName} numberOfLines={1}>{placement.helper_name}</Text>
            <StatusBadge status="pending" />
          </View>
          <TypeBadge type={req.type} />
          <Text style={s.reqCardMain}>{mainLine}</Text>
          {reasonLine ? <Text style={s.reqCardReason} numberOfLines={2}>Reason: {reasonLine}</Text> : null}
        </View>
      </View>

      {(metaLeft || metaRight) && (
        <View style={s.reqCardMeta}>
          <View style={s.reqCardMetaCol}>
            {metaLeft && <>
              <Text style={s.reqCardMetaLabel}>{metaLeft.label}</Text>
              <Text style={s.reqCardMetaValue}>{metaLeft.value}</Text>
            </>}
          </View>
          {metaRight && (
            <View style={s.reqCardMetaCol}>
              <Text style={s.reqCardMetaLabel}>{metaRight.label}</Text>
              <Text style={s.reqCardMetaValue}>{metaRight.value}</Text>
            </View>
          )}
          <TouchableOpacity style={s.reviewBtn} onPress={onReview} activeOpacity={0.85}>
            <Text style={s.reviewBtnText}>Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

// ── History card ────────────────────────────────────────────────────────────
function HistoryCard({ req, onPress }: { req: UnifiedRequest; onPress: () => void }) {
  const avatarColor = req.type === 'leave' ? BLUE : req.type === 'termination' ? DANGER : ORANGE;
  const { placement } = req;

  const dateLine = (() => {
    if (req.type === 'leave' && req.leaveRow) return fmtDateLong(req.leaveRow.date);
    if (req.type === 'termination' && req.termRow?.termination_last_day) {
      return `Effective: ${fmtDateLong(req.termRow.termination_last_day)}`;
    }
    return '—';
  })();

  const respondedAt = req.leaveRow?.responded_at?.slice(0, 10) ?? null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={s.histCard}>
        <Avatar photo={placement.helper_photo} name={placement.helper_name} color={avatarColor} />
        <View style={s.histBody}>
          <View style={s.histNameRow}>
            <Text style={s.histName} numberOfLines={1}>{placement.helper_name}</Text>
            <StatusBadge status={req.status} />
          </View>
          <TypeBadge type={req.type} />
          <Text style={s.histDate}>{dateLine}</Text>
          {respondedAt ? (
            <Text style={s.histResponded}>
              {req.status === 'approved' ? 'Approved' : 'Declined'} on {fmtDate(respondedAt)}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={MUTED} />
      </View>
    </TouchableOpacity>
  );
}

// ── Filter tab ──────────────────────────────────────────────────────────────
function FilterChip({ label, count, active, onPress }: {
  label: string; count: number; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.filterChip, active && s.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
        {label}{count > 0 ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function RequestsScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const parentId = userData ? Number(userData.user_id) : 0;

  const { placements, loading: placementsLoading, refresh: refreshPlacements } = useParentActivePlacements();

  const [leavesMap,      setLeavesMap]      = useState<Map<number, LeaveRequestRow[]>>(new Map());
  const [termMap,        setTermMap]        = useState<Map<number, TerminationDetailsResponse>>(new Map());
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [activeTab,      setActiveTab]      = useState<FilterTab>('all');

  // Leave respond state
  const [busyId,         setBusyId]         = useState<number | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<{ id: number; name: string } | null>(null);
  const [confirmDecline, setConfirmDecline] = useState<{ id: number; name: string } | null>(null);
  const [successMsg,     setSuccessMsg]     = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!parentId || placements.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      const newLeaves = new Map<number, LeaveRequestRow[]>();
      const newTerm   = new Map<number, TerminationDetailsResponse>();

      await Promise.all(placements.map(async p => {
        const appId = Number(p.application_id);
        // Fetch leave requests for every placement
        const lr = await fetchLeaveRequests(appId, parentId, 'parent').catch(() => null);
        if (lr?.success && lr.data) newLeaves.set(appId, lr.data);
        // Fetch termination details only if status is termination_pending
        if (isTerminationPendingStatus(String(p.status))) {
          const tr = await fetchTerminationDetails(appId, parentId, 'parent').catch(() => null);
          if (tr?.success) newTerm.set(appId, tr);
        }
      }));

      setLeavesMap(new Map(newLeaves));
      setTermMap(new Map(newTerm));
    } finally {
      setLoading(false);
    }
  }, [parentId, placements]);

  useEffect(() => {
    if (!placementsLoading) void loadData();
  }, [loadData, placementsLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refreshPlacements(); await loadData(); } finally { setRefreshing(false); }
  }, [refreshPlacements, loadData]);

  // Build unified list
  const allRequests = useMemo<UnifiedRequest[]>(() => {
    const list: UnifiedRequest[] = [];
    for (const p of placements) {
      const appId = Number(p.application_id);
      // Leave rows
      const leaveRows = leavesMap.get(appId) ?? [];
      for (const lr of leaveRows) {
        list.push({
          key: `leave-${lr.id}`,
          type: 'leave',
          placement: p,
          status: lr.status as 'pending' | 'approved' | 'declined',
          sortDate: lr.created_at ?? lr.date,
          leaveRow: lr,
        });
      }
      // Termination row
      const tr = termMap.get(appId);
      if (tr) {
        list.push({
          key: `term-${appId}`,
          type: 'termination',
          placement: p,
          status: 'pending',
          sortDate: tr.termination_notice_date ?? '',
          termRow: tr,
        });
      }
    }
    return list.sort((a, b) => (b.sortDate ?? '').localeCompare(a.sortDate ?? ''));
  }, [placements, leavesMap, termMap]);

  const pending  = useMemo(() => allRequests.filter(r => r.status === 'pending'),  [allRequests]);
  const history  = useMemo(() => allRequests.filter(r => r.status !== 'pending'),  [allRequests]);

  const counts = useMemo(() => ({
    all:         pending.length,
    leave:       pending.filter(r => r.type === 'leave').length,
    overtime:    0,
    termination: pending.filter(r => r.type === 'termination').length,
  }), [pending]);

  const visiblePending = useMemo(() =>
    activeTab === 'all' ? pending : pending.filter(r => r.type === activeTab),
    [pending, activeTab]);

  const visibleHistory = useMemo(() =>
    activeTab === 'all' ? history : history.filter(r => r.type === activeTab),
    [history, activeTab]);

  const handleLeaveRespond = useCallback(async (id: number, action: 'approved' | 'declined') => {
    setBusyId(id);
    try {
      const res = await respondToLeaveRequest(id, parentId, action);
      if (res.success) {
        setSuccessMsg(action === 'approved' ? 'Leave request approved.' : 'Leave request declined.');
        await loadData();
      }
    } finally {
      setBusyId(null);
      setConfirmApprove(null);
      setConfirmDecline(null);
    }
  }, [parentId, loadData]);

  const handleReview = useCallback((req: UnifiedRequest) => {
    if (req.type === 'leave') {
      router.push({
        pathname: '/(parent)/hire/placement_leave_requests' as never,
        params: {
          application_id: String(req.placement.application_id),
          helper_name: encodeURIComponent(req.placement.helper_name),
        },
      });
    } else if (req.type === 'termination') {
      router.push({
        pathname: '/(parent)/hire/helper_profile' as never,
        params: {
          application_id: String(req.placement.application_id),
          helper_id: String(req.placement.helper_id),
          helper_name: encodeURIComponent(req.placement.helper_name),
          helper_photo: req.placement.helper_photo ? encodeURIComponent(req.placement.helper_photo) : '',
          job_title: encodeURIComponent(req.placement.job_title),
          status: encodeURIComponent(req.placement.status),
          salary_offered: String(req.placement.salary_offered ?? ''),
          salary_period: encodeURIComponent(req.placement.salary_period ?? ''),
          helper_phone: encodeURIComponent(req.placement.helper_phone ?? ''),
        },
      });
    }
  }, [router]);

  const isLoading = loading || placementsLoading;

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Requests</Text>
        <View style={s.headerBtn} />
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={s.filterBar}
      >
        {([
          { key: 'all',         label: 'All' },
          { key: 'leave',       label: 'Leave' },
          { key: 'overtime',    label: 'Overtime' },
          { key: 'termination', label: 'Termination' },
        ] as { key: FilterTab; label: string }[]).map(tab => (
          <FilterChip
            key={tab.key}
            label={tab.label}
            count={counts[tab.key as keyof typeof counts]}
            active={activeTab === tab.key}
            onPress={() => setActiveTab(tab.key)}
          />
        ))}
      </ScrollView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={BROWN} />
        }
      >
        {isLoading ? (
          <ActivityIndicator color={BROWN} style={{ marginTop: 48 }} size="large" />
        ) : (
          <>
            {/* Pending section */}
            <Text style={s.sectionLabel}>Pending Your Review</Text>
            {visiblePending.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={36} color={MUTED} />
                <Text style={s.emptyTitle}>All caught up!</Text>
                <Text style={s.emptySub}>No pending requests to review.</Text>
              </View>
            ) : (
              <View style={s.cardList}>
                {visiblePending.map(req => (
                  <PendingCard
                    key={req.key}
                    req={req}
                    onReview={() => handleReview(req)}
                  />
                ))}
              </View>
            )}

            {/* History section */}
            {visibleHistory.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 8 }]}>History</Text>
                <View style={s.histList}>
                  {visibleHistory.map((req, idx) => (
                    <React.Fragment key={req.key}>
                      <HistoryCard
                        req={req}
                        onPress={() => handleReview(req)}
                      />
                      {idx < visibleHistory.length - 1 && <View style={s.histDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <ParentWorkModeTabBar />

      {/* Confirm approve */}
      <ConfirmationModal
        visible={!!confirmApprove}
        title="Approve Leave"
        message={`Approve the leave request from ${confirmApprove?.name ?? 'this helper'}?`}
        confirmText="Approve" cancelText="Cancel" type="default"
        onConfirm={() => confirmApprove && void handleLeaveRespond(confirmApprove.id, 'approved')}
        onCancel={() => setConfirmApprove(null)}
      />
      {/* Confirm decline */}
      <ConfirmationModal
        visible={!!confirmDecline}
        title="Decline Leave"
        message={`Decline the leave request from ${confirmDecline?.name ?? 'this helper'}?`}
        confirmText="Decline" cancelText="Cancel" type="danger"
        onConfirm={() => confirmDecline && void handleLeaveRespond(confirmDecline.id, 'declined')}
        onCancel={() => setConfirmDecline(null)}
      />
      {/* Success */}
      <NotificationModal
        visible={!!successMsg}
        message={successMsg ?? ''}
        type="success"
        autoClose duration={1800}
        onClose={() => setSuccessMsg(null)}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  android: { elevation: 2 },
  default: { boxShadow: '0 2px 8px rgba(139,90,43,0.08)' } as any,
});

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DIVIDER, backgroundColor: BG,
  },
  headerBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },

  // Filter bar
  filterBar:  { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: DIVIDER, backgroundColor: BG },
  filterRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: ICON_BG, borderWidth: 1, borderColor: DIVIDER,
  },
  filterChipActive: { backgroundColor: BROWN, borderColor: BROWN },
  filterChipText:   { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },
  filterChipTextActive: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff' },

  // Section
  sectionLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginTop: 20, marginBottom: 10 },
  cardList:     { gap: 12 },

  // Pending card
  reqCard:      { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: DIVIDER, ...CARD_SHADOW },
  reqCardTop:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  reqCardBody:  { flex: 1, gap: 4 },
  reqCardNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reqCardName:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, flex: 1, marginRight: 8 },
  reqCardMain:  { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK, marginTop: 2 },
  reqCardReason:{ fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 1 },
  reqCardMeta:  { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 10, gap: 8 },
  reqCardMetaCol: { flex: 1, gap: 1 },
  reqCardMetaLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },
  reqCardMetaValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK },

  // Review button
  reviewBtn:     { backgroundColor: BROWN, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, alignSelf: 'flex-end' },
  reviewBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },

  // Avatar
  avatar:     { width: 44, height: 44, borderRadius: 22, borderWidth: 2, flexShrink: 0 },
  avatarFb:   { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15 },

  // Type badge
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
  typeBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  // Status badge
  statusBadge:     { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  statusBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  // History
  histList:    { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, overflow: 'hidden', ...CARD_SHADOW },
  histCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  histDivider: { height: 1, backgroundColor: DIVIDER, marginHorizontal: 14 },
  histBody:    { flex: 1, gap: 3 },
  histNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  histName:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, flex: 1 },
  histDate:    { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: DARK, marginTop: 1 },
  histResponded: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 1 },

  // Empty
  emptyCard:  { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  emptySub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },
});
