// app/(helper)/my_applications.tsx
import React, { useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useMyApplications } from '@/hooks/helper';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar, MobileMenu } from '@/components/helper/home';
import {
  ApplicationCard,
  ApplicationDetailsModal,
} from '@/components/helper/applications/';
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/shared/';
import { theme } from '@/constants/theme';

const FILTER_TABS = [
  { key: 'all',                   label: 'All',          icon: 'list-outline' as const },
  { key: 'active',                label: 'Active',       icon: 'flash-outline' as const },
  { key: 'Pending',               label: 'Pending',      icon: 'time-outline' as const },
  { key: 'Shortlisted',           label: 'Shortlisted',  icon: 'star-outline' as const },
  { key: 'Accepted',              label: 'Hired',        icon: 'checkmark-circle-outline' as const },
  { key: 'Rejected',              label: 'Rejected',     icon: 'close-circle-outline' as const },
];

export default function MyApplications() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();

  const { applications, stats, loading, statusFilter, setStatusFilter, refresh, withdrawApplication } = useMyApplications();

  const [isMobileMenuOpen,    setIsMobileMenuOpen]    = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [detailsVisible,      setDetailsVisible]      = useState(false);
  const [withdrawModal,       setWithdrawModal]       = useState({ visible: false, applicationId: '' });
  const [notification,        setNotification]        = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const openDetails = (app: any) => { setSelectedApplication(app); setDetailsVisible(true); };

  const handleWithdraw = (appId: string) => {
    setDetailsVisible(false);
    setWithdrawModal({ visible: true, applicationId: appId });
  };

  const confirmWithdraw = async () => {
    try {
      const result = await withdrawApplication(withdrawModal.applicationId);
      if (result.success) {
        setNotification({ visible: true, message: 'Application withdrawn successfully', type: 'success' });
      }
    } catch (error: any) {
      setNotification({ visible: true, message: error.message || 'Failed to withdraw', type: 'error' });
    } finally {
      setWithdrawModal({ visible: false, applicationId: '' });
    }
  };

  const renderModals = () => (
    <>
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification(n => ({ ...n, visible: false }))} autoClose duration={2000} />
      <ConfirmationModal visible={withdrawModal.visible} title="Withdraw Application?" message="Are you sure? This action cannot be undone." confirmText="Withdraw" cancelText="Cancel" type="danger" onConfirm={confirmWithdraw} onCancel={() => setWithdrawModal({ visible: false, applicationId: '' })} />
      <ApplicationDetailsModal visible={detailsVisible} application={selectedApplication} onWithdraw={() => selectedApplication && handleWithdraw(selectedApplication.application_id)} onClose={() => setDetailsVisible(false)} />
    </>
  );

  if (loading) return <LoadingSpinner visible message="Loading applications…" />;

  // ── Stats tiles ──────────────────────────────────────────────────────────────
  const statTiles = [
    { label: 'Total',       value: stats.total,       color: theme.color.ink,     bg: theme.color.surface,      icon: 'layers-outline' as const },
    { label: 'Pending',     value: stats.pending,     color: theme.color.warning, bg: theme.color.warningSoft,  icon: 'time-outline' as const },
    { label: 'Shortlisted', value: stats.shortlisted, color: '#7C3AED',           bg: '#F3E8FF',                icon: 'star-outline' as const },
    { label: 'Hired',       value: stats.accepted,    color: theme.color.success, bg: theme.color.successSoft,  icon: 'checkmark-circle-outline' as const },
  ];

  const mainContent = (
    <View style={s.content}>
      {/* Stats strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.statsScroll, isDesktop && { paddingHorizontal: 32 }]}
      >
        {statTiles.map(t => (
          <View key={t.label} style={[s.statTile, { backgroundColor: t.bg }]}>
            <View style={[s.statIconCircle, { backgroundColor: t.color + '22' }]}>
              <Ionicons name={t.icon} size={18} color={t.color} />
            </View>
            <Text style={[s.statValue, { color: t.color }]}>{t.value}</Text>
            <Text style={s.statLabel}>{t.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.filterScroll, isDesktop && { paddingHorizontal: 32 }]}
      >
        {FILTER_TABS.map(tab => {
          const isActive = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.filterChip, isActive && s.filterChipActive]}
              onPress={() => setStatusFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={tab.icon} size={13} color={isActive ? '#fff' : theme.color.muted} />
              <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results info */}
      <View style={[s.resultsBar, isDesktop && { paddingHorizontal: 32 }]}>
        <Text style={s.resultsText}>
          <Text style={{ color: theme.color.helper, fontWeight: '800' }}>{applications.length}</Text>
          {' '}application{applications.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' ? ` · ${FILTER_TABS.find(f => f.key === statusFilter)?.label}` : ''}
        </Text>
      </View>

      {/* List */}
      {applications.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconCircle}>
            <Ionicons name="document-text-outline" size={38} color={theme.color.helper} />
          </View>
          <Text style={s.emptyTitle}>
            {statusFilter === 'all' ? 'No applications yet' : `No ${FILTER_TABS.find(f => f.key === statusFilter)?.label?.toLowerCase()} applications`}
          </Text>
          <Text style={s.emptySub}>
            {statusFilter === 'all'
              ? 'Start applying to jobs to track them here'
              : 'Try selecting a different filter'}
          </Text>
          {statusFilter === 'all' && (
            <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(helper)/browse_jobs')}>
              <Ionicons name="search-outline" size={16} color="#fff" />
              <Text style={s.browseBtnText}>Browse Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={item => item?.application_id ?? Math.random().toString()}
          renderItem={({ item }) => (
            <ApplicationCard
              application={item}
              onPress={() => openDetails(item)}
              onWithdraw={() => handleWithdraw(item?.application_id)}
            />
          )}
          contentContainerStyle={[s.listPad, isDesktop && s.listPadDesktop]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={[s.root, { flexDirection: 'row' }]}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={s.desktopMain}>
          <View style={s.desktopHeader}>
            <View>
              <Text style={s.pageTitle}>My Applications</Text>
              <Text style={s.pageSubtitle}>Track the status of your job applications</Text>
            </View>
            <TouchableOpacity style={s.browseJobsBtn} onPress={() => router.push('/(helper)/browse_jobs')} activeOpacity={0.8}>
              <Ionicons name="search-outline" size={18} color={theme.color.helper} />
              <Text style={s.browseJobsBtnText}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>
          {mainContent}
        </View>
      </View>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      {renderModals()}
      <View style={s.mobileHeader}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setIsMobileMenuOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={26} color={theme.color.ink} />
        </TouchableOpacity>
        <View style={s.mobileHeaderCenter}>
          <Text style={s.mobileTitle}>My Applications</Text>
          {stats.pending > 0 && (
            <View style={s.pendingBadge}>
              <Text style={s.pendingBadgeText}>{stats.pending}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.searchIconBtn} onPress={() => router.push('/(helper)/browse_jobs')} activeOpacity={0.8}>
          <Ionicons name="search-outline" size={20} color={theme.color.helper} />
        </TouchableOpacity>
      </View>
      {mainContent}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.canvasHelper },
  content: { flex: 1 },

  // ── Desktop ──
  desktopMain:   { flex: 1, backgroundColor: theme.color.canvasHelper },
  desktopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 24, backgroundColor: theme.color.surfaceElevated, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  pageTitle:     { fontSize: 26, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.5 },
  pageSubtitle:  { fontSize: 14, color: theme.color.muted, marginTop: 2 },
  browseJobsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.color.helperSoft, borderWidth: 1, borderColor: theme.color.helper + '30' },
  browseJobsBtnText: { fontSize: 14, fontWeight: '700', color: theme.color.helper },

  // ── Mobile header ──
  mobileHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.color.surfaceElevated, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  menuBtn:            { padding: 6 },
  mobileHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileTitle:        { fontSize: 18, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.3 },
  pendingBadge:       { backgroundColor: theme.color.warning, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  pendingBadgeText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  searchIconBtn:      { padding: 8, backgroundColor: theme.color.helperSoft, borderRadius: 10 },

  // ── Stats ──
  statsScroll: { paddingHorizontal: 16, paddingVertical: 16, gap: 10, flexDirection: 'row', alignItems: 'flex-start' },
  statTile:    { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, gap: 4, minWidth: 80, alignSelf: 'flex-start' },
  statIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue:   { fontSize: 22, fontWeight: '800' },
  statLabel:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: theme.color.muted },

  // ── Filters ──
  filterScroll:      { paddingHorizontal: 16, paddingBottom: 4, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.color.surfaceElevated, borderWidth: 1, borderColor: theme.color.line },
  filterChipActive:  { backgroundColor: theme.color.helper, borderColor: theme.color.helper },
  filterChipText:    { fontSize: 13, fontWeight: '600', color: theme.color.muted },
  filterChipTextActive: { color: '#fff' },

  // ── Results bar ──
  resultsBar:  { paddingHorizontal: 16, paddingVertical: 8 },
  resultsText: { fontSize: 13, color: theme.color.muted, fontWeight: '500' },

  // ── List ──
  listPad:        { padding: 16, paddingBottom: 40 },
  listPadDesktop: { paddingHorizontal: 32, paddingTop: 8, paddingBottom: 60 },

  // ── Empty ──
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconCircle:{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:     { fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 8, textAlign: 'center' },
  emptySub:       { fontSize: 14, color: theme.color.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  browseBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.helper, paddingVertical: 13, paddingHorizontal: 24, borderRadius: 14, shadowColor: theme.color.helper, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  browseBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});
