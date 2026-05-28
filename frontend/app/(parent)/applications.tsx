// app/(parent)/applications.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useJobApplications, useParentJobs } from '@/hooks/parent';
import { useAuth, useResponsive } from '@/hooks/shared';
import { ApplicationCard } from '@/components/parent/jobs/ApplicationCard';
import { ApplicantGroupCard } from '@/components/parent/jobs/ApplicantGroupCard';
import { groupApplicationsByHelper, type HelperApplicationGroup } from '@/lib/groupApplicationsByHelper';
import { LoadingSpinner, NotificationModal, ConfirmationModal, InterviewModal } from '@/components/shared/';
import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { HelperProfileModal } from '@/components/parent/browse/';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import { createParentApplicationsStyles } from './applications.styles';

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
  const { color: c } = useParentTheme();
  const s = useMemo(() => createParentApplicationsStyles(c), [c]);
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
  const [selectedGroup,         setSelectedGroup]         = useState<HelperApplicationGroup | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    if (error) setNotification({ visible: true, message: error, type: 'error' });
  }, [error]);

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout  = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const filteredApps = getApplicationsByStatus(activeFilter);
  const groupedApps = useMemo(
    () => groupApplicationsByHelper(filteredApps),
    [filteredApps]
  );

  const jobTitleForApp = (app: { job_post_id: string }) => {
    const j = postedJobs.find((x: any) => String(x.job_post_id) === String(app.job_post_id));
    return j?.title || j?.custom_job_title || 'Job';
  };

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
      if (result.success) {
        setNotification({ visible: true, message: `Application ${action.toLowerCase()} successfully!`, type: 'success' });
        setSelectedGroup((g) => {
          if (!g) return null;
          const newStatus = action;
          const updated = g.applications.map((a) =>
            String(a.application_id) === String(appId) ? { ...a, status: newStatus } : a
          );
          const passesFilter = (a: (typeof updated)[0]) => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'Rejected') return a.status === 'Rejected' || a.status === 'auto_rejected';
            if (activeFilter === 'Accepted') return a.status === 'Accepted' || a.status === 'hired';
            return a.status === activeFilter;
          };
          const next = updated.filter(passesFilter);
          if (next.length === 0) return null;
          return { ...g, applications: next };
        });
      }
    } catch (err: any) {
      setNotification({ visible: true, message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const renderApplicationCard = (item: any) => (
    <ApplicationCard
      application={item}
      jobTitle={jobTitleForApp(item)}
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
          job_post_id:  String(item.job_post_id ?? ''),
        },
      } as any)}
      onManageTasks={
        ['hired', 'Accepted'].includes(String(item.status))
          ? () => router.push({
              pathname: '/(parent)/placement_tasks',
              params: {
                application_id: String(item.application_id),
                helper_name: encodeURIComponent(item.helper_name ?? 'Helper'),
              },
            } as any)
          : undefined
      }
      onViewAttendance={
        ['hired', 'Accepted'].includes(String(item.status))
          ? () => router.push({
              pathname: '/(parent)/placement_attendance',
              params: {
                application_id: String(item.application_id),
                helper_name: encodeURIComponent(item.helper_name ?? 'Helper'),
              },
            } as any)
          : undefined
      }
      onViewLeaveRequests={
        ['hired', 'Accepted'].includes(String(item.status))
          ? () => router.push({
              pathname: '/(parent)/placement_leave_requests',
              params: {
                application_id: String(item.application_id),
                helper_name: encodeURIComponent(item.helper_name ?? 'Helper'),
              },
            } as any)
          : undefined
      }
    />
  );

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
          scheduledBy={Number(userData?.user_id ?? 0)}
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
      <Modal visible={!!selectedGroup} animationType="slide" transparent onRequestClose={() => setSelectedGroup(null)}>
        <View style={s.groupModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedGroup(null)} />
          <View style={s.groupModalSheet}>
            <View style={s.groupModalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.groupModalTitle} numberOfLines={2}>
                  {selectedGroup?.helper_name}
                </Text>
                <Text style={s.groupModalSubtitle}>
                  {selectedGroup?.applications.length === 1
                    ? '1 application to your job posts'
                    : `${selectedGroup?.applications.length ?? 0} applications to your job posts`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedGroup(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={28} color={c.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={s.groupModalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {selectedGroup?.applications.map((item) => (
                <View key={String(item.application_id)} style={{ marginBottom: 12 }}>
                  {renderApplicationCard(item)}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
              <Ionicons name="menu" size={26} color={c.ink} />
            </TouchableOpacity>
            <Text style={s.mobileTitle}>Applications</Text>
            <View style={{ width: 40 }} />
          </View>
        )}
        <View style={s.empty}>
          <View style={s.emptyIconCircle}>
            <Ionicons name="briefcase-outline" size={38} color={c.parent} />
          </View>
          <Text style={s.emptyTitle}>No Jobs Posted Yet</Text>
          <Text style={s.emptySub}>Post a job to start receiving applications from helpers.</Text>
          <TouchableOpacity style={s.postJobBtn} onPress={() => router.push('/(parent)/jobs' as never)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.postJobBtnText}>Post a Job</Text>
          </TouchableOpacity>
        </View>
        <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
        {!isDesktop ? <ParentTabBar /> : null}
      </SafeAreaView>
    );
  }

  // ── Stats (for selected job) ────────────────────────────────────────────────
  const appStats = [
    { label: 'Total',       value: applications.length,                                          color: c.parent,  bg: c.parentSoft,   icon: 'people-outline' as const },
    { label: 'Pending',     value: applications.filter(a => a.status === 'Pending').length,      color: c.warning, bg: c.warningSoft,  icon: 'time-outline' as const },
    { label: 'Shortlisted', value: applications.filter(a => a.status === 'Shortlisted').length,  color: '#7C3AED',           bg: '#F3E8FF',                icon: 'star-outline' as const },
    { label: 'Hired',       value: applications.filter(a => a.status === 'hired' || a.status === 'Accepted').length, color: c.success, bg: c.successSoft,  icon: 'checkmark-circle-outline' as const },
  ];

  const mainContent = (
    <View style={s.content}>
      {/* ── Optional job filter ── */}
      <View style={[s.selectorSection, isDesktop && { paddingHorizontal: 32 }]}>
        {/* "All jobs" pill + job dropdown in one row */}
        <View style={s.dropCard}>
          <Text style={s.dropLabel}>Filter by Job Post <Text style={{ color: c.muted, fontWeight: '400' }}>(optional)</Text></Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.allJobBtn, !selectedJobId && s.allJobBtnActive]}
              onPress={() => { setSelectedJobId(''); setSelectedCategory(''); }}
            >
              <Ionicons name="layers-outline" size={14} color={!selectedJobId ? '#fff' : c.muted} />
              <Text style={[s.allJobBtnText, !selectedJobId && { color: '#fff' }]}>All Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.dropHead, { flex: 1 }, isJobDropdownOpen && s.dropHeadActive]}
              onPress={() => { setIsJobDropdownOpen(v => !v); setIsCategoryDropdownOpen(false); }}
              activeOpacity={0.8}
            >
              <Text style={[s.dropHeadText, !currentJob && { color: c.subtle }]} numberOfLines={1}>
                {currentJob ? currentJob.title : 'Specific job…'}
              </Text>
              <Ionicons name={isJobDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} />
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
              <Ionicons name={f.icon} size={13} color={isActive ? '#fff' : c.muted} />
              <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Application list (one row per helper; tap to see each role) ── */}
      <FlatList
        data={groupedApps}
        keyExtractor={(g) => g.helperId}
        renderItem={({ item: group }) => (
          <ApplicantGroupCard group={group} onPress={() => setSelectedGroup(group)} />
        )}
        contentContainerStyle={[s.listPad, isDesktop && s.listPadDesktop]}
        refreshControl={<RefreshControl refreshing={loadingApps} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconCircle}>
              <Ionicons name="folder-open-outline" size={38} color={c.parent} />
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
                {loadingApps
                  ? 'Loading…'
                  : `${groupedApps.length} helper${groupedApps.length !== 1 ? 's' : ''} · ${filteredApps.length} application${filteredApps.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <TouchableOpacity style={s.viewJobsBtn} onPress={() => router.push('/(parent)/jobs' as never)} activeOpacity={0.8}>
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
          <Ionicons name="menu" size={26} color={c.ink} />
        </TouchableOpacity>
        <View style={s.mobileHeaderCenter}>
          <Text style={s.mobileTitle}>Applications</Text>
          {applications.filter(a => a.status === 'Pending').length > 0 && (
            <View style={s.pendingBadge}>
              <Text style={s.pendingBadgeText}>{applications.filter(a => a.status === 'Pending').length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.jobsIconBtn} onPress={() => router.push('/(parent)/jobs' as never)}>
          <Ionicons name="briefcase-outline" size={20} color={c.parent} />
        </TouchableOpacity>
      </View>
      {mainContent}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
      <ParentTabBar />
    </SafeAreaView>
  );
}
