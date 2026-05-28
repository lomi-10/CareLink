// app/(helper)/my_applications.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useMyApplications } from '@/hooks/helper';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar, MobileMenu, HelperTabBar } from '@/components/helper/home';
import {
  ApplicationCard,
  ApplicationDetailsModal,
} from '@/components/helper/applications/';
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/shared/';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { createHelperMyApplicationsStyles } from './my_applications.styles';

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
  const { color: c } = useHelperTheme();
  const s = useMemo(() => createHelperMyApplicationsStyles(c), [c]);
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { ready, isWorkMode } = useHelperWorkMode();

  useEffect(() => {
    if (!ready) return;
    if (isWorkMode) router.replace('/(helper)/home');
  }, [ready, isWorkMode, router]);

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
      <ApplicationDetailsModal
        visible={detailsVisible}
        application={selectedApplication}
        onWithdraw={() => selectedApplication && handleWithdraw(selectedApplication.application_id)}
        onClose={() => setDetailsVisible(false)}
        onMessage={() => {
          if (!selectedApplication) return;
          setDetailsVisible(false);
          router.push({
            pathname: '/(helper)/messages',
            params: {
              partner_id:   String(selectedApplication.parent_id ?? ''),
              partner_name: encodeURIComponent(selectedApplication.parent_name ?? ''),
              job_post_id:  String(selectedApplication.job_post_id ?? ''),
            },
          } as any);
        }}
      />
    </>
  );

  if (ready && isWorkMode) {
    return <LoadingSpinner visible message="Opening your work dashboard…" />;
  }

  if (loading) return <LoadingSpinner visible message="Loading applications…" />;

  // ── Stats tiles ──────────────────────────────────────────────────────────────
  const statTiles = [
    { label: 'Total',       value: stats.total,       color: c.ink,     bg: c.surface,      icon: 'layers-outline' as const },
    { label: 'Pending',     value: stats.pending,     color: c.warning, bg: c.warningSoft,  icon: 'time-outline' as const },
    { label: 'Shortlisted', value: stats.shortlisted, color: c.parent,  bg: c.parentSoft,   icon: 'star-outline' as const },
    { label: 'Hired',       value: stats.accepted,    color: c.success, bg: c.successSoft,  icon: 'checkmark-circle-outline' as const },
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
              <Ionicons name={tab.icon} size={13} color={isActive ? '#fff' : c.muted} />
              <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results info */}
      <View style={[s.resultsBar, isDesktop && { paddingHorizontal: 32 }]}>
        <Text style={s.resultsText}>
          <Text style={{ color: c.helper, fontWeight: '800' }}>{applications.length}</Text>
          {' '}application{applications.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' ? ` · ${FILTER_TABS.find(f => f.key === statusFilter)?.label}` : ''}
        </Text>
      </View>

      {/* List */}
      {applications.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconCircle}>
            <Ionicons name="document-text-outline" size={38} color={c.helper} />
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
          keyExtractor={(item, idx) => item?.application_id ? String(item.application_id) : `app-${idx}`}
          renderItem={({ item }) => (
            <ApplicationCard
              application={item}
              onPress={() => openDetails(item)}
              onWithdraw={() => handleWithdraw(item?.application_id)}
            />
          )}
          contentContainerStyle={[s.listPad, isDesktop && s.listPadDesktop]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.helper} />}
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
              <Ionicons name="search-outline" size={18} color={c.helper} />
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
          <Ionicons name="menu" size={26} color={c.ink} />
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
          <Ionicons name="search-outline" size={20} color={c.helper} />
        </TouchableOpacity>
      </View>
      {mainContent}
      <HelperTabBar />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}
