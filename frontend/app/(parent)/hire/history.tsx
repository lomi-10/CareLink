import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BROWN, DARK, MUTED, DIVIDER, ICON_BG, GREEN, SUCCESS_BG, DANGER,
} from '@/components/parent/home/parentWarmTheme';
import { ParentWorkModeTabBar } from '@/components/parent/home';
import { PlacementReviewModal, SubmitComplaintModal } from '@/components/shared';
import { useParentPlacementHistory, type PlacementHistoryItem } from '@/hooks/parent/useParentPlacementHistory';
import { useResponsive } from '@/hooks/shared';
import { Sidebar } from '@/components/parent/home';
import { useAuth } from '@/hooks/shared';

const AMBER  = '#D97706';
const AMBER_BG = '#FEF3C7';
const HERO_GR = ['#F6D9AE', '#E2A968', '#C5853E'] as const;
const CARD_GR = ['#FFFDF9', '#FEF5E0'] as const;

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function formatDateShort(ymd: string | null) {
  if (!ymd) return '—';
  try {
    return new Date(ymd.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch { return ymd; }
}

function calcDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  try {
    const s = new Date(start.replace(/-/g, '/'));
    const e = new Date(end.replace(/-/g, '/'));
    const months = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 1) return 'Less than 1 mo';
    if (months === 1) return '1 mo';
    if (months < 12) return `${months} mo`;
    const yrs = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${yrs} yr ${rem} mo` : `${yrs} yr`;
  } catch { return ''; }
}

function StatusBadge({ status }: { status: string }) {
  const isTerminated = status === 'terminated' || status === 'termination_pending' || status === 'pending_termination';
  if (isTerminated) {
    return (
      <View style={[hst.badge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
        <Ionicons name="close-circle" size={10} color={DANGER} />
        <Text style={[hst.badgeText, { color: DANGER }]}>Terminated</Text>
      </View>
    );
  }
  return (
    <View style={[hst.badge, { backgroundColor: SUCCESS_BG, borderColor: '#A7F3D0' }]}>
      <Ionicons name="checkmark-circle" size={10} color={GREEN} />
      <Text style={[hst.badgeText, { color: GREEN }]}>Completed</Text>
    </View>
  );
}

export default function PlacementHistoryScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { placements, loading, refresh } = useParentPlacementHistory();

  const [reviewTarget, setReviewTarget] = useState<{ applicationId: number; helperName: string; jobTitle: string } | null>(null);
  const [complaintTarget, setComplaintTarget] = useState<{ applicationId: number; helperName: string } | null>(null);

  const stats = useMemo(() => ({
    total: placements.length,
    completed: placements.filter(p => p.status !== 'terminated' && p.status !== 'termination_pending' && p.status !== 'pending_termination').length,
    terminated: placements.filter(p => p.status === 'terminated' || p.status === 'termination_pending' || p.status === 'pending_termination').length,
  }), [placements]);

  const renderCard = ({ item: p }: { item: PlacementHistoryItem }) => {
    const duration = calcDuration(p.employment_start_date, p.ended_on);
    const dateRange = [formatDateShort(p.employment_start_date), formatDateShort(p.ended_on)].filter(Boolean).join(' – ');
    return (
      <LinearGradient colors={CARD_GR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={hst.card}>
        {/* Helper info */}
        <View style={hst.cardTop}>
          {p.helper_photo ? (
            <Image source={{ uri: p.helper_photo }} style={hst.avatar} contentFit="cover" />
          ) : (
            <View style={hst.avatarFallback}>
              <Text style={hst.avatarInitials}>{getInitials(p.helper_name)}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={hst.name} numberOfLines={1}>{p.helper_name}</Text>
            <Text style={hst.role} numberOfLines={1}>{p.job_title}</Text>
            <View style={hst.metaRow}>
              <Ionicons name="calendar-outline" size={11} color={MUTED} />
              <Text style={hst.meta}>{dateRange}{duration ? `  ·  ${duration}` : ''}</Text>
            </View>
          </View>
          <StatusBadge status={p.status} />
        </View>

        {/* Salary if available */}
        {p.confirmed_salary != null && (
          <View style={hst.salaryRow}>
            <Ionicons name="wallet-outline" size={12} color={MUTED} />
            <Text style={hst.salaryText}>
              ₱{p.confirmed_salary.toLocaleString('en-PH')} / {(p.salary_period ?? 'mo').toLowerCase()}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={hst.actionsRow}>
          <TouchableOpacity
            style={hst.btnPrimary}
            activeOpacity={0.8}
            onPress={() => setReviewTarget({ applicationId: p.application_id, helperName: p.helper_name, jobTitle: p.job_title })}
          >
            <Ionicons name="star-outline" size={14} color="#fff" />
            <Text style={hst.btnPrimaryText}>Rate & Review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={hst.btnOutline}
            activeOpacity={0.8}
            onPress={() => setComplaintTarget({ applicationId: p.application_id, helperName: p.helper_name })}
          >
            <Ionicons name="flag-outline" size={14} color={DANGER} />
            <Text style={hst.btnOutlineText}>Complaint</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  const header = (
    <View>
      {/* Hero */}
      <LinearGradient colors={HERO_GR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={hst.hero}>
        <View style={hst.heroCircle1} />
        <View style={hst.heroCircle2} />
        <View style={hst.heroKicker}>
          <Ionicons name="time" size={11} color="#fff" />
          <Text style={hst.heroKickerText}>PLACEMENT HISTORY</Text>
        </View>
        <Text style={hst.heroTitle}>Your Hired Helpers</Text>
        <Text style={hst.heroSub}>A complete record of every helper you've worked with.</Text>
        {/* Stats band */}
        <View style={hst.statsBand}>
          {[
            { label: 'Total', value: stats.total, color: BROWN, bg: 'rgba(139,90,43,0.18)' },
            { label: 'Completed', value: stats.completed, color: GREEN, bg: 'rgba(5,150,105,0.18)' },
            { label: 'Terminated', value: stats.terminated, color: DANGER, bg: 'rgba(220,38,38,0.15)' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={hst.statDivider} />}
              <View style={hst.statTile}>
                <View style={[hst.statIconWrap, { backgroundColor: s.bg }]}>
                  <Text style={[hst.statValue, { color: s.color }]}>{s.value}</Text>
                </View>
                <Text style={hst.statLabel}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* Section label */}
      <View style={hst.sectionLabelRow}>
        <Text style={hst.sectionLabel}>All Records</Text>
        <Text style={hst.sectionCount}>{placements.length}</Text>
      </View>
    </View>
  );

  const content = (
    <FlatList
      data={placements}
      keyExtractor={item => String(item.application_id)}
      renderItem={renderCard}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? (
          <View style={hst.empty}>
            <ActivityIndicator size="large" color={BROWN} />
          </View>
        ) : (
          <View style={hst.empty}>
            <View style={hst.emptyIconWrap}>
              <Ionicons name="time-outline" size={40} color={BROWN} />
            </View>
            <Text style={hst.emptyTitle}>No history yet</Text>
            <Text style={hst.emptyText}>Placements will appear here once a contract has ended.</Text>
          </View>
        )
      }
      contentContainerStyle={hst.list}
      showsVerticalScrollIndicator={false}
      onRefresh={refresh}
      refreshing={loading}
    />
  );

  if (isDesktop) {
    return (
      <View style={[hst.page, { flexDirection: 'row' }]}>
        <Sidebar onLogout={() => {}} />
        <View style={{ flex: 1 }}>
          <View style={hst.desktopBar}>
            <TouchableOpacity onPress={() => router.back()} style={hst.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={BROWN} />
              <Text style={hst.backText}>Back</Text>
            </TouchableOpacity>
          </View>
          {content}
        </View>
        <PlacementReviewModal
          visible={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          applicationId={reviewTarget?.applicationId ?? 0}
          userType="parent"
          counterpartyName={reviewTarget?.helperName ?? ''}
          jobTitle={reviewTarget?.jobTitle}
          accentColor={BROWN}
          onSubmitted={() => void refresh()}
        />
        <SubmitComplaintModal
          visible={!!complaintTarget}
          onClose={() => setComplaintTarget(null)}
          applicationId={complaintTarget?.applicationId ?? 0}
          userType="parent"
          counterpartyLabel={complaintTarget?.helperName}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={hst.page}>
      {/* Mobile bar */}
      <View style={hst.bar}>
        <TouchableOpacity onPress={() => router.back()} style={hst.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={DARK} />
        </TouchableOpacity>
        <Text style={hst.barTitle}>Placement History</Text>
        <View style={{ width: 36 }} />
      </View>

      {content}
      <ParentWorkModeTabBar />

      <PlacementReviewModal
        visible={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        applicationId={reviewTarget?.applicationId ?? 0}
        userType="parent"
        counterpartyName={reviewTarget?.helperName ?? ''}
        jobTitle={reviewTarget?.jobTitle}
        accentColor={BROWN}
        onSubmitted={() => void refresh()}
      />
      <SubmitComplaintModal
        visible={!!complaintTarget}
        onClose={() => setComplaintTarget(null)}
        applicationId={complaintTarget?.applicationId ?? 0}
        userType="parent"
        counterpartyLabel={complaintTarget?.helperName}
      />
    </SafeAreaView>
  );
}

const hst = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FDF8F2' },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FDF8F2', borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  barTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK },
  desktopBar: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
    backgroundColor: '#FDF8F2',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
  list: { paddingBottom: 100 },

  // Hero
  hero: {
    marginHorizontal: 12, marginTop: 12, marginBottom: 4,
    borderRadius: 22, paddingTop: 22, paddingHorizontal: 20, overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute', right: -34, top: -34,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroCircle2: {
    position: 'absolute', right: 70, bottom: 40,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(139,90,43,0.10)',
  },
  heroKicker: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BROWN, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, alignSelf: 'flex-start', marginBottom: 10,
  },
  heroKickerText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: '#fff', letterSpacing: 1.2 },
  heroTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: DARK, marginBottom: 4 },
  heroSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#5A4327', marginBottom: 18, lineHeight: 17 },
  statsBand: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.55)',
    marginHorizontal: -20, paddingHorizontal: 4, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)',
  },
  statTile: { flex: 1, alignItems: 'center' },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
  statLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(139,90,43,0.2)', marginVertical: 6 },

  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  sectionCount: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN,
    backgroundColor: ICON_BG, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },

  // Card
  card: {
    marginHorizontal: 12, marginBottom: 12, borderRadius: 18,
    padding: 14, borderWidth: 1, borderColor: DIVIDER,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 14, flexShrink: 0 },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: BROWN },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  role: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10 },
  salaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ICON_BG, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, marginBottom: 10, alignSelf: 'flex-start',
  },
  salaryText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: BROWN, borderRadius: 10, paddingVertical: 10,
  },
  btnPrimaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#fff' },
  btnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: DANGER, borderRadius: 10, paddingVertical: 10,
    backgroundColor: '#FFF5F5',
  },
  btnOutlineText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DANGER },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, marginBottom: 6 },
  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
});
