// app/(helper)/applications/index.tsx
// PHP: helper/get_applications.php (via useMyApplications), v1/applications/sign_contract.php, v1/applications/termination_initiate.php, interviews/schedule.php
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FontFamily } from '@/constants/GlobalStyles';
import { useMyApplications, useHelperProfile } from '@/hooks/helper';
import { HelperApplicationsWeb } from '@/components/helper/web/HelperApplicationsWeb';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { Sidebar, MobileMenu, HelperTabBar } from '@/components/helper/home';
import {
  ApplicationCard,
  ApplicationDetailsModal,
} from '@/components/helper/applications/';
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/shared/';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { createHelperMyApplicationsStyles } from './my_applications.styles';

// ── Palette ───────────────────────────────────────────────────────────────────
const DARK    = '#2A1608';
const MUTED   = '#7A5C3E';
const ORANGE  = '#E86019';

const FILTER_TABS = [
  { key: 'all',         label: 'All',         icon: 'list-outline' as const },
  { key: 'active',      label: 'Active',      icon: 'flash-outline' as const },
  { key: 'Pending',     label: 'Pending',     icon: 'time-outline' as const },
  { key: 'Shortlisted', label: 'Shortlisted', icon: 'star-outline' as const },
  { key: 'Accepted',    label: 'Hired',       icon: 'checkmark-circle-outline' as const },
  { key: 'Rejected',    label: 'Rejected',    icon: 'close-circle-outline' as const },
];

const ACTIVE_STATUSES = ['Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled'];

const STATUS_LABELS: Record<string, string> = {
  Pending: 'Pending Review',
  Reviewed: 'Reviewed',
  Shortlisted: 'Shortlisted',
  'Interview Scheduled': 'Interview',
  Accepted: 'Hired!',
  contract_pending: 'Contract',
  hired: 'Hired',
  Rejected: 'Not Selected',
  auto_rejected: 'Position Closed',
  Withdrawn: 'Withdrawn',
};

function initials(name?: string) {
  if (!name?.trim()) return 'E';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

export default function MyApplications() {
  const router = useRouter();
  const s = useMemo(() => createHelperMyApplicationsStyles(), []);
  const { isDesktop } = useResponsive();
  const { handleLogout, getFullName } = useAuth();
  const { profileData } = useHelperProfile();
  const { unreadCount } = useNotifications('helper');
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
  const [searchQuery,          setSearchQuery]          = useState('');

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

  // ── Local search filter ──────────────────────────────────────────────────────
  const visibleApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.trim().toLowerCase();
    return applications.filter((a: any) =>
      (a.job_title ?? '').toLowerCase().includes(q) ||
      (a.parent_name ?? '').toLowerCase().includes(q),
    );
  }, [applications, searchQuery]);

  // ── Featured "active" application — most recent non-terminal one ─────────────
  const featuredApp = useMemo(
    () => applications.find((a: any) => ACTIVE_STATUSES.includes(a.status)),
    [applications],
  );
  const featuredLocation = featuredApp
    ? (featuredApp.location || [featuredApp.municipality, featuredApp.province].filter(Boolean).join(', '))
    : '';

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

  // ── Stats (dark-brown card) ──────────────────────────────────────────────────
  const statTiles = [
    { label: 'Total',       value: stats.total },
    { label: 'Pending',     value: stats.pending },
    { label: 'Shortlisted', value: stats.shortlisted },
    { label: 'Hired',       value: stats.accepted },
  ];

  // Header content rendered above the application list (search, stats, featured, filters)
  const listHeader = (
    <View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={MUTED} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by job title or employer…"
          placeholderTextColor="#B0A090"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={6}>
            <Ionicons name="close-circle" size={18} color={MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats — dark brown card */}
      <View style={s.statsCard}>
        {statTiles.map((t, idx) => (
          <React.Fragment key={t.label}>
            {idx > 0 && <View style={s.statDivider} />}
            <View style={s.statItem}>
              <Text style={s.statValue}>{t.value}</Text>
              <Text style={s.statLabel}>{t.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Featured active application */}
      {featuredApp && (
        <View style={s.featuredSection}>
          <Text style={s.featuredLabel}>Active Application</Text>
          <TouchableOpacity style={s.featuredCard} onPress={() => openDetails(featuredApp)} activeOpacity={0.9}>
            <View style={s.featuredTop}>
              <View style={s.featuredAvatar}>
                <Text style={s.featuredAvatarText}>{initials(featuredApp.parent_name)}</Text>
              </View>
              <View style={s.featuredInfo}>
                <Text style={s.featuredJobTitle} numberOfLines={1}>{featuredApp.job_title}</Text>
                <Text style={s.featuredEmployer} numberOfLines={1}>{featuredApp.parent_name}</Text>
              </View>
              <View style={s.featuredBadge}>
                <Text style={s.featuredBadgeText}>{STATUS_LABELS[featuredApp.status] ?? featuredApp.status}</Text>
              </View>
            </View>
            <View style={s.featuredMeta}>
              {!!featuredApp.applied_at && (
                <View style={s.featuredMetaItem}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={s.featuredMetaText}>Applied {featuredApp.applied_at}</Text>
                </View>
              )}
              {!!featuredLocation && (
                <View style={s.featuredMetaItem}>
                  <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.55)" />
                  <Text style={s.featuredMetaText} numberOfLines={1}>{featuredLocation}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* "All Applications" section header */}
      <View style={s.sectionHeader}>
        <Ionicons name="document-text-outline" size={15} color={DARK} />
        <Text style={s.sectionHeaderText}>All Applications</Text>
        <View style={s.sectionHeaderCount}>
          <Text style={s.sectionHeaderCountText}>{visibleApplications.length}</Text>
        </View>
      </View>

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
              <Ionicons name={tab.icon} size={13} color={isActive ? '#fff' : MUTED} />
              <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results info */}
      <View style={[s.resultsBar, isDesktop && { paddingHorizontal: 32 }]}>
        <Text style={s.resultsText}>
          <Text style={{ fontFamily: FontFamily.fredokaSemiBold, color: ORANGE }}>{visibleApplications.length}</Text>
          {' '}application{visibleApplications.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' ? ` · ${FILTER_TABS.find(f => f.key === statusFilter)?.label}` : ''}
          {searchQuery.trim() ? ` · matching "${searchQuery.trim()}"` : ''}
        </Text>
      </View>
    </View>
  );

  const listEmpty = (
    <View style={s.empty}>
      <View style={s.emptyIconCircle}>
        <Ionicons name="document-text-outline" size={38} color={ORANGE} />
      </View>
      <Text style={s.emptyTitle}>
        {searchQuery.trim()
          ? 'No matching applications'
          : statusFilter === 'all' ? 'No applications yet' : `No ${FILTER_TABS.find(f => f.key === statusFilter)?.label?.toLowerCase()} applications`}
      </Text>
      <Text style={s.emptySub}>
        {searchQuery.trim()
          ? 'Try a different search term'
          : statusFilter === 'all'
            ? 'Start applying to jobs to track them here'
            : 'Try selecting a different filter'}
      </Text>
      {statusFilter === 'all' && !searchQuery.trim() && (
        <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(helper)/browse')}>
          <Ionicons name="search-outline" size={16} color="#fff" />
          <Text style={s.browseBtnText}>Browse Jobs</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const applicationsList = (
    <FlatList
      data={visibleApplications}
      keyExtractor={(item, idx) => item?.application_id ? String(item.application_id) : `app-${idx}`}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      renderItem={({ item }) => (
        <ApplicationCard
          application={item}
          onPress={() => openDetails(item)}
          onWithdraw={() => handleWithdraw(item?.application_id)}
        />
      )}
      contentContainerStyle={[s.listPad, isDesktop && s.listPadDesktop]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={ORANGE} />}
      showsVerticalScrollIndicator={false}
    />
  );

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={{ flex: 1 }}>
        <HelperApplicationsWeb
          userName={getFullName()}
          avatar={(profileData?.profile?.profile_image as string) ?? null}
          verified={profileData?.profile?.verification_status === 'Verified'}
          onLogout={initiateLogout}
        />
        <ConfirmationModal
          visible={confirmLogoutVisible} title="Log Out"
          message="Are you sure you want to log out?"
          confirmText="Log Out" cancelText="Cancel" type="danger"
          onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)}
        />
        <NotificationModal
          visible={successLogoutVisible} message="Logged Out Successfully!"
          type="success" autoClose duration={1500}
          onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }}
        />
      </View>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      {renderModals()}
      <View style={s.mobileHeader}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setIsMobileMenuOpen(true)} activeOpacity={0.7}>
          <Ionicons name="menu" size={26} color={DARK} />
        </TouchableOpacity>
        <View style={s.mobileHeaderCenter}>
          <Text style={s.mobileTitle}>My Applications</Text>
        </View>
        <TouchableOpacity style={s.searchIconBtn} onPress={() => router.push('/(helper)/notifications')} activeOpacity={0.8}>
          <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={20} color={ORANGE} />
          {unreadCount > 0 && (
            <View style={s.notifBadge}>
              <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {applicationsList}
      <HelperTabBar />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}
