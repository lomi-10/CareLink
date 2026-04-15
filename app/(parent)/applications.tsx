// app/(parent)/applications.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useJobApplications, useParentJobs } from '@/hooks/parent';
import { useAuth, useResponsive } from '@/hooks/shared';
import { ApplicationCard } from '@/components/parent/jobs/ApplicationCard';
import { LoadingSpinner, NotificationModal, ConfirmationModal, InterviewModal } from '@/components/shared/';
import { Sidebar, MobileMenu } from '@/components/parent/home';
import { HelperProfileModal } from '@/components/parent/browse/';
import { theme } from '@/constants/theme';

const STATUS_FILTERS = [
  { key: 'all',         label: 'All',         icon: 'list-outline' as const },
  { key: 'Pending',     label: 'Pending',     icon: 'time-outline' as const },
  { key: 'Reviewed',    label: 'Reviewed',    icon: 'eye-outline' as const },
  { key: 'Shortlisted', label: 'Shortlisted', icon: 'star-outline' as const },
  { key: 'Accepted',    label: 'Hired',       icon: 'checkmark-circle-outline' as const },
  { key: 'Rejected',    label: 'Rejected',    icon: 'close-circle-outline' as const },
];

export default function JobApplications() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const params = useLocalSearchParams<{ job_id?: string }>();

  const { jobs: postedJobs, loading: loadingJobs } = useParentJobs();
  const [selectedCategory,         setSelectedCategory]         = useState('');
  const [selectedJobId,             setSelectedJobId]            = useState('');
  const [isCategoryDropdownOpen,    setIsCategoryDropdownOpen]   = useState(false);
  const [isJobDropdownOpen,         setIsJobDropdownOpen]        = useState(false);

  const parentCategories = Array.from(new Set(postedJobs.map((j: any) => j.category_name))).filter(Boolean) as string[];
  const availableJobs    = postedJobs.filter((j: any) => j.category_name === selectedCategory);
  const currentJob       = postedJobs.find((j: any) => j.job_post_id === selectedJobId);

  // Pre-select job when navigated from jobs.tsx with a job_id param
  useEffect(() => {
    if (params.job_id && postedJobs.length > 0) {
      const job = postedJobs.find((j: any) => String(j.job_post_id) === String(params.job_id));
      if (job) {
        setSelectedCategory(job.category_name || '');
        setSelectedJobId(String(job.job_post_id));
      }
    }
  }, [params.job_id, postedJobs]);

  useEffect(() => {
    if (selectedCategory) {
      const still = availableJobs.find((j: any) => j.job_post_id === selectedJobId);
      if (!still) setSelectedJobId('');
    }
  }, [selectedCategory, postedJobs]);

  const { applications, loading: loadingApps, error, refresh, getApplicationsByStatus, updateApplicationStatus } = useJobApplications(selectedJobId);

  const [isMobileMenuOpen,      setIsMobileMenuOpen]      = useState(false);
  const [activeFilter,          setActiveFilter]          = useState('all');
  const [profileModalVisible,   setProfileModalVisible]   = useState(false);
  const [selectedHelper,        setSelectedHelper]        = useState<any>(null);
  const [notification,          setNotification]          = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [statusConfirm,         setStatusConfirm]         = useState<{ visible: boolean; appId: string; action: 'Shortlisted' | 'Rejected' | null }>({ visible: false, appId: '', action: null });
  const [confirmLogoutVisible,  setConfirmLogoutVisible]  = useState(false);
  const [successLogoutVisible,  setSuccessLogoutVisible]  = useState(false);
  const [interviewTarget,       setInterviewTarget]       = useState<{ appId: number; helperName: string; jobTitle: string } | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    if (error) setNotification({ visible: true, message: error, type: 'error' });
  }, [error]);

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const handleViewProfile = (app: any) => {
    setSelectedHelper({
      ...app,
      profile_id: app.profile_id,
      user_id: app.helper_id,
      full_name: app.helper_name,
      profile_image: app.helper_photo,
      age: app.helper_age,
      gender: app.helper_gender,
      email: app.helper_email,
      phone: app.helper_phone,
      categories: app.helper_categories || [],
      verification_status: app.verification_status || 'Pending',
      availability_status: app.availability_status || 'Available',
      experience_years: app.helper_experience_years,
      rating_average: app.helper_rating_average,
      bio: app.helper_bio,
    });
    setProfileModalVisible(true);
  };

  const executeStatusUpdate = async () => {
    if (!statusConfirm.action || !statusConfirm.appId) return;
    const action = statusConfirm.action;
    const appId  = statusConfirm.appId;
    setStatusConfirm({ visible: false, appId: '', action: null });
    try {
      const result = await updateApplicationStatus(appId, action);
      if (result.success) setNotification({ visible: true, message: `Application ${action.toLowerCase()} successfully!`, type: 'success' });
    } catch (err: any) {
      setNotification({ visible: true, message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const renderModals = () => (
    <>
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification(n => ({ ...n, visible: false }))} autoClose duration={2000} />
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <HelperProfileModal
        visible={profileModalVisible}
        helper={selectedHelper}
        onClose={() => setProfileModalVisible(false)}
        onInvite={() => {
          setProfileModalVisible(false);
          if (selectedHelper) {
            router.push({
              pathname: '/(parent)/messages',
              params: {
                partner_id:   String(selectedHelper.helper_id ?? selectedHelper.user_id),
                partner_name: encodeURIComponent(selectedHelper.helper_name ?? selectedHelper.full_name ?? ''),
                job_post_id:  selectedJobId,
              },
            } as any);
          }
        }}
      />
      {interviewTarget && (
        <InterviewModal
          visible={!!interviewTarget}
          onClose={() => setInterviewTarget(null)}
          applicationId={interviewTarget.appId}
          helperName={interviewTarget.helperName}
          jobTitle={interviewTarget.jobTitle}
          scheduledBy={userData?.user_id ?? 0}
          onScheduled={() => { setInterviewTarget(null); refresh(); setNotification({ visible: true, message: 'Interview invite sent!', type: 'success' }); }}
        />
      )}
      <ConfirmationModal
        visible={statusConfirm.visible}
        title={statusConfirm.action === 'Shortlisted' ? 'Shortlist Applicant?' : 'Reject Applicant?'}
        message={statusConfirm.action === 'Shortlisted' ? 'Shortlist this applicant? They will be notified.' : 'Reject this applicant? This cannot be undone.'}
        confirmText={statusConfirm.action === 'Shortlisted' ? 'Yes, Shortlist' : 'Yes, Reject'}
        cancelText="Cancel"
        type={statusConfirm.action === 'Shortlisted' ? 'success' : 'danger'}
        onConfirm={executeStatusUpdate}
        onCancel={() => setStatusConfirm({ visible: false, appId: '', action: null })}
      />
    </>
  );

  if (loadingJobs) return <LoadingSpinner visible message="Loading…" />;

  // ── Empty — no jobs posted ──────────────────────────────────────────────────
  if (postedJobs.length === 0) {
    return (
      <SafeAreaView style={[s.root, isDesktop && { flexDirection: 'row' }]}>
        {renderModals()}
        {isDesktop && <Sidebar onLogout={initiateLogout} />}
        {!isDesktop && (
          <View style={s.mobileHeader}>
            <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={s.menuBtn}>
              <Ionicons name="menu" size={26} color={theme.color.ink} />
            </TouchableOpacity>
            <Text style={s.mobileTitle}>Applications</Text>
            <View style={{ width: 40 }} />
          </View>
        )}
        <View style={s.empty}>
          <View style={s.emptyIconCircle}>
            <Ionicons name="briefcase-outline" size={38} color={theme.color.parent} />
          </View>
          <Text style={s.emptyTitle}>No Jobs Posted Yet</Text>
          <Text style={s.emptySub}>Post a job to start receiving applications from helpers.</Text>
          <TouchableOpacity style={s.postJobBtn} onPress={() => router.push('/(parent)/jobs')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.postJobBtnText}>Post a Job</Text>
          </TouchableOpacity>
        </View>
        <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
      </SafeAreaView>
    );
  }

  const filteredApps = getApplicationsByStatus(activeFilter);

  // ── Stats (for selected job) ────────────────────────────────────────────────
  const appStats = [
    { label: 'Total',       value: applications.length,                                          color: theme.color.parent,  bg: theme.color.parentSoft,   icon: 'people-outline' as const },
    { label: 'Pending',     value: applications.filter(a => a.status === 'Pending').length,      color: theme.color.warning, bg: theme.color.warningSoft,  icon: 'time-outline' as const },
    { label: 'Shortlisted', value: applications.filter(a => a.status === 'Shortlisted').length,  color: '#7C3AED',           bg: '#F3E8FF',                icon: 'star-outline' as const },
    { label: 'Hired',       value: applications.filter(a => a.status === 'Accepted').length,     color: theme.color.success, bg: theme.color.successSoft,  icon: 'checkmark-circle-outline' as const },
  ];

  const mainContent = (
    <View style={s.content}>
      {/* ── Optional job filter ── */}
      <View style={[s.selectorSection, isDesktop && { paddingHorizontal: 32 }]}>
        {/* "All jobs" pill + job dropdown in one row */}
        <View style={s.dropCard}>
          <Text style={s.dropLabel}>Filter by Job Post <Text style={{ color: theme.color.muted, fontWeight: '400' }}>(optional)</Text></Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.allJobBtn, !selectedJobId && s.allJobBtnActive]}
              onPress={() => { setSelectedJobId(''); setSelectedCategory(''); }}
            >
              <Ionicons name="layers-outline" size={14} color={!selectedJobId ? '#fff' : theme.color.muted} />
              <Text style={[s.allJobBtnText, !selectedJobId && { color: '#fff' }]}>All Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.dropHead, { flex: 1 }, isJobDropdownOpen && s.dropHeadActive]}
              onPress={() => { setIsJobDropdownOpen(v => !v); setIsCategoryDropdownOpen(false); }}
              activeOpacity={0.8}
            >
              <Text style={[s.dropHeadText, !currentJob && { color: theme.color.subtle }]} numberOfLines={1}>
                {currentJob ? currentJob.title : 'Specific job…'}
              </Text>
              <Ionicons name={isJobDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.color.muted} />
            </TouchableOpacity>
          </View>
          {isJobDropdownOpen && (
            <View style={s.dropList}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {postedJobs.map((j: any) => (
                  <TouchableOpacity key={j.job_post_id} style={[s.dropItem, currentJob?.job_post_id === j.job_post_id && s.dropItemActive]} onPress={() => { setSelectedJobId(j.job_post_id); setIsJobDropdownOpen(false); }}>
                    <Text style={[s.dropItemText, currentJob?.job_post_id === j.job_post_id && s.dropItemTextActive]} numberOfLines={1}>{j.title}</Text>
                    <Text style={s.dropItemSub}>{j.category_name} · {j.status}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* ── Stats strip ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.statsScroll, isDesktop && { paddingHorizontal: 32 }]}
      >
        {appStats.map(t => (
          <View key={t.label} style={[s.statTile, { backgroundColor: t.bg }]}>
            <View style={[s.statIconCircle, { backgroundColor: t.color + '22' }]}>
              <Ionicons name={t.icon} size={16} color={t.color} />
            </View>
            <Text style={[s.statValue, { color: t.color }]}>{t.value}</Text>
            <Text style={s.statLabel}>{t.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.filterScroll, isDesktop && { paddingHorizontal: 32 }]}
      >
        {STATUS_FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, isActive && s.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={f.icon} size={13} color={isActive ? '#fff' : theme.color.muted} />
              <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Application list ── */}
      <FlatList
        data={filteredApps}
        keyExtractor={item => item.application_id}
        renderItem={({ item }) => (
          <ApplicationCard
            application={item}
            onViewProfile={() => handleViewProfile(item)}
            onShortlist={() => setStatusConfirm({ visible: true, appId: item.application_id, action: 'Shortlisted' })}
            onReject={() => setStatusConfirm({ visible: true, appId: item.application_id, action: 'Rejected' })}
            onScheduleInterview={() => {
              const jobForApp = postedJobs.find((j: any) => String(j.job_post_id) === String(item.job_post_id));
              setInterviewTarget({
                appId: Number(item.application_id),
                helperName: item.helper_name,
                jobTitle: jobForApp?.title ?? currentJob?.title ?? 'this position',
              });
            }}
            onMessage={() => router.push({
              pathname: '/(parent)/messages',
              params: {
                partner_id:   String(item.helper_id),
                partner_name: encodeURIComponent(item.helper_name ?? ''),
                job_post_id:  selectedJobId,
              },
            } as any)}
          />
        )}
        contentContainerStyle={[s.listPad, isDesktop && s.listPadDesktop]}
        refreshControl={<RefreshControl refreshing={loadingApps} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconCircle}>
              <Ionicons name="folder-open-outline" size={38} color={theme.color.parent} />
            </View>
            <Text style={s.emptyTitle}>No applications found</Text>
            <Text style={s.emptySub}>
              {activeFilter !== 'all' ? 'Try selecting a different status filter' : 'No one has applied yet'}
            </Text>
          </View>
        }
      />
    </View>
  );

  // ── Desktop ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={[s.root, { flexDirection: 'row' }]}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={s.desktopMain}>
          <View style={s.desktopHeader}>
            <View>
              <Text style={s.pageTitle}>Review Applications</Text>
              <Text style={s.pageSubtitle}>
                {loadingApps ? 'Loading…' : `${filteredApps.length} application${filteredApps.length !== 1 ? 's' : ''} shown`}
              </Text>
            </View>
            <TouchableOpacity style={s.viewJobsBtn} onPress={() => router.push('/(parent)/jobs')} activeOpacity={0.8}>
              <Ionicons name="briefcase-outline" size={17} color="#fff" />
              <Text style={s.viewJobsBtnText}>View Jobs</Text>
            </TouchableOpacity>
          </View>
          {mainContent}
        </View>
      </View>
    );
  }

  // ── Mobile ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      {renderModals()}
      <View style={s.mobileHeader}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setIsMobileMenuOpen(true)}>
          <Ionicons name="menu" size={26} color={theme.color.ink} />
        </TouchableOpacity>
        <View style={s.mobileHeaderCenter}>
          <Text style={s.mobileTitle}>Applications</Text>
          {applications.filter(a => a.status === 'Pending').length > 0 && (
            <View style={s.pendingBadge}>
              <Text style={s.pendingBadgeText}>{applications.filter(a => a.status === 'Pending').length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.jobsIconBtn} onPress={() => router.push('/(parent)/jobs')}>
          <Ionicons name="briefcase-outline" size={20} color={theme.color.parent} />
        </TouchableOpacity>
      </View>
      {mainContent}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: theme.color.canvasParent },
  content: { flex: 1 },

  // ── Desktop ──
  desktopMain:   { flex: 1 },
  desktopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 24, backgroundColor: theme.color.surfaceElevated, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  pageTitle:     { fontSize: 26, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.5 },
  pageSubtitle:  { fontSize: 14, color: theme.color.muted, marginTop: 2 },
  viewJobsBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.parent, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, shadowColor: theme.color.parent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  viewJobsBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Mobile header ──
  mobileHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.color.surfaceElevated, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  menuBtn:            { padding: 6 },
  mobileHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileTitle:        { fontSize: 18, fontWeight: '800', color: theme.color.ink },
  pendingBadge:       { backgroundColor: theme.color.warning, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  pendingBadgeText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  jobsIconBtn:        { padding: 8, backgroundColor: theme.color.parentSoft, borderRadius: 10 },

  // ── Selector ──
  selectorSection: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4, gap: 12 },
  dropCard:  { backgroundColor: theme.color.surfaceElevated, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.color.line, ...theme.shadow.nav },
  dropLabel: { fontSize: 11, fontWeight: '800', color: theme.color.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  dropHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.line, padding: 13, borderRadius: 10 },
  dropHeadActive:   { borderColor: theme.color.parent, backgroundColor: theme.color.parentSoft },
  dropHeadDisabled: { opacity: 0.5 },
  dropHeadText:     { flex: 1, fontSize: 15, fontWeight: '600', color: theme.color.ink },
  dropHeadSub:      { fontSize: 12, color: theme.color.muted, marginTop: 2, fontWeight: '500' },
  dropList:  { marginTop: 8, backgroundColor: theme.color.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden' },
  dropItem:  { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  dropItemActive: { backgroundColor: theme.color.parentSoft },
  dropItemText:   { fontSize: 14, fontWeight: '600', color: theme.color.inkMuted },
  dropItemTextActive: { color: theme.color.parent, fontWeight: '700' },
  dropItemSub:    { fontSize: 12, color: theme.color.subtle, marginTop: 2 },

  // ── Stats ──
  statsScroll:    { paddingHorizontal: 16, paddingVertical: 14, gap: 10, flexDirection: 'row', alignItems: 'flex-start' },
  statTile:       { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, gap: 4, minWidth: 80, alignSelf: 'flex-start' },
  statIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue:      { fontSize: 20, fontWeight: '800' },
  statLabel:      { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: theme.color.muted },

  // ── All jobs toggle ──
  allJobBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: theme.color.line, backgroundColor: theme.color.surface },
  allJobBtnActive:  { backgroundColor: theme.color.parent, borderColor: theme.color.parent },
  allJobBtnText:    { fontSize: 13, fontWeight: '700', color: theme.color.muted },

  // ── Filters ──
  filterScroll:         { paddingHorizontal: 16, paddingBottom: 4, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.color.surfaceElevated, borderWidth: 1, borderColor: theme.color.line },
  filterChipActive:     { backgroundColor: theme.color.parent, borderColor: theme.color.parent },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: theme.color.muted },
  filterChipTextActive: { color: '#fff' },

  // ── List ──
  listPad:        { padding: 16, paddingBottom: 40 },
  listPadDesktop: { paddingHorizontal: 32, paddingBottom: 60 },

  // ── Empty ──
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  emptyIconCircle:{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:     { fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 8, textAlign: 'center' },
  emptySub:       { fontSize: 14, color: theme.color.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  postJobBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.parent, paddingVertical: 13, paddingHorizontal: 24, borderRadius: 14 },
  postJobBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
