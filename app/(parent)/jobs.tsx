// app/(parent)/jobs.tsx

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useParentJobs } from '@/hooks/parent';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useUserVerification } from '@/hooks/peso';

import { ConfirmationModal, LoadingSpinner, NotificationModal } from '@/components/shared';
import { MobileMenu, Sidebar, ParentTabBar } from '@/components/parent/home';
import { JobCard, JobPostModal } from '@/components/parent/jobs';
import { JobDetailsModal } from '@/components/parent/jobs/JobDetailsModal';
import { PendingBanner } from '@/components/parent/verification/PendingBanner';
import API_URL from '@/constants/api';
import { useParentTheme } from '@/contexts/ParentThemeContext';

import { createParentJobsStyles } from './jobs.styles';

export default function MyJobs() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { jobs, loading, refresh, stats } = useParentJobs();
  const { verification } = useUserVerification();
  const isPending = verification.status === 'Pending';

  const [editingJob, setEditingJob]       = useState<any>(null);
  const [isMobileMenuOpen, setMobileMenu] = useState(false);
  const [activeFilter, setActiveFilter]   = useState('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [viewingJob, setViewingJob]       = useState<any>(null);

  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [deleteModal, setDeleteModal]   = useState({ visible: false, jobId: '', jobTitle: '' });
  const [confirmLogoutVisible, setConfirmLogout] = useState(false);
  const [successLogoutVisible, setSuccessLogout] = useState(false);

  const { color: c } = useParentTheme();
  const s = useMemo(() => createParentJobsStyles(c), [c]);
  const FILTERS = useMemo(
    () => [
      { key: 'all',     label: 'All',     icon: 'apps'                as const, color: c.inkMuted },
      { key: 'open',    label: 'Open',    icon: 'radio-button-on'     as const, color: c.success  },
      { key: 'pending', label: 'Pending', icon: 'hourglass'           as const, color: c.warning  },
      { key: 'filled',  label: 'Filled',  icon: 'checkmark-circle'    as const, color: c.parent   },
      { key: 'closed',  label: 'Closed',  icon: 'stop-circle'         as const, color: c.muted    },
      { key: 'expired', label: 'Expired', icon: 'time'                as const, color: c.danger   },
    ],
    [c],
  );

  const pendingCount = useMemo(() => jobs.filter(j => j.status === 'Pending').length, [jobs]);

  const statsData = useMemo(
    () => [
      { icon: 'briefcase'        as const, label: 'Total',     value: stats.total,            color: c.parent,   bg: c.parentSoft  },
      { icon: 'radio-button-on'  as const, label: 'Open',      value: stats.open,             color: c.success,  bg: c.successSoft },
      { icon: 'hourglass'        as const, label: 'Pending',   value: pendingCount,           color: c.warning,  bg: c.warningSoft },
      { icon: 'checkmark-circle' as const, label: 'Filled',    value: stats.filled,           color: c.info,     bg: c.infoSoft    },
      { icon: 'close-circle'     as const, label: 'Closed',    value: stats.closed,           color: c.muted,    bg: c.surface     },
      { icon: 'people'           as const, label: 'Applicants',value: stats.totalApplications,color: c.parent,   bg: c.parentSoft  },
    ],
    [c, stats, pendingCount],
  );

  const filteredJobs = useMemo(() => jobs.filter(job => {
    const matchFilter  = activeFilter === 'all' || job.status.toLowerCase() === activeFilter;
    const q            = searchQuery.toLowerCase();
    const matchSearch  = !q
      || job.title.toLowerCase().includes(q)
      || (job.category_name && job.category_name.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  }), [jobs, activeFilter, searchQuery]);

  const initiateLogout = () => { setMobileMenu(false); setConfirmLogout(true); };
  const executeLogout  = () => { setConfirmLogout(false); setSuccessLogout(true); };

  const handlePostJob = () => {
    if (!verification.canPostJobs) {
      setNotification({ visible: true, message: 'You need to be verified to post jobs.', type: 'error' });
      return;
    }
    setEditingJob(null);
    setIsPostModalVisible(true);
  };

  const handleEditJob  = (job: any) => { setEditingJob(job); setIsPostModalVisible(true); };
  const promptDelete   = (jobId: string, jobTitle: string) => setDeleteModal({ visible: true, jobId, jobTitle });

  const confirmDelete = async () => {
    try {
      setDeleteModal(p => ({ ...p, visible: false }));
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/parent/delete_job.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: deleteModal.jobId, parent_id: user.user_id }),
      });
      const data = await res.json();
      if (data.success) { setNotification({ visible: true, message: 'Job deleted.', type: 'success' }); refresh(); }
      else throw new Error(data.message);
    } catch (e: any) {
      setNotification({ visible: true, message: e.message || 'Failed to delete job.', type: 'error' });
    }
  };

  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    try {
      const res  = await fetch(`${API_URL}/parent/update_job_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: jobId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { setNotification({ visible: true, message: `Job marked as ${newStatus}.`, type: 'success' }); refresh(); }
      else throw new Error(data.message);
    } catch (e: any) {
      setNotification({ visible: true, message: e.message || 'Failed to update status.', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner visible message="Loading jobs…" />;

  const renderModals = () => (
    <>
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogout(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose duration={1500} onClose={() => { setSuccessLogout(false); handleLogout(); }} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification(p => ({ ...p, visible: false }))} autoClose duration={1500} />
      <ConfirmationModal visible={deleteModal.visible} title="Delete Job?" message={`Delete "${deleteModal.jobTitle}"? This cannot be undone.`} confirmText="Delete" cancelText="Cancel" type="danger" onConfirm={confirmDelete} onCancel={() => setDeleteModal(p => ({ ...p, visible: false }))} />
      <JobPostModal visible={isPostModalVisible} onClose={() => setIsPostModalVisible(false)} existingJobData={editingJob} onSaveSuccess={refresh} />
      <JobDetailsModal visible={!!viewingJob} job={viewingJob} onClose={() => setViewingJob(null)} />
    </>
  );

  // ── Job board content ─────────────────────────────────────────────────────
  const boardContent = (
    <View style={s.board}>
      {isPending && <PendingBanner status="Pending" message={verification.message} />}

      {/* Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.statsScroll}
      >
        {statsData.map(stat => (
          <View key={stat.label} style={[s.statTile, { backgroundColor: stat.bg }]}>
            <View style={[s.statIconWrap, { backgroundColor: stat.color + '22' }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.statLbl}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Toolbar: search + filters */}
      <View style={s.toolbar}>
        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={c.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search jobs…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={c.subtle}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={c.subtle} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {FILTERS.map(f => {
            const count  = f.key === 'all' ? jobs.length : jobs.filter(j => j.status.toLowerCase() === f.key).length;
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, active && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={f.icon} size={13} color={active ? '#fff' : f.color} />
                <Text style={[s.filterChipText, { color: active ? '#fff' : f.color }]}>{f.label}</Text>
                {count > 0 && (
                  <View style={[s.filterBadge, { backgroundColor: active ? 'rgba(255,255,255,0.28)' : f.color + '22' }]}>
                    <Text style={[s.filterBadgeText, { color: active ? '#fff' : f.color }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results count */}
      {filteredJobs.length > 0 && (
        <View style={s.resultsBar}>
          <Text style={s.resultsText}>
            Showing <Text style={{ fontWeight: '700', color: c.parent }}>{filteredJobs.length}</Text> job{filteredJobs.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' ? ` · ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}` : ''}
          </Text>
        </View>
      )}

      {/* List / Empty state */}
      {filteredJobs.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="briefcase-outline" size={44} color={c.parent} />
          </View>
          <Text style={s.emptyTitle}>
            {activeFilter === 'all' ? 'No jobs posted yet' : `No ${activeFilter} jobs found`}
          </Text>
          <Text style={s.emptyBody}>
            {activeFilter === 'all'
              ? 'Start by posting your first job and let qualified helpers apply.'
              : `Try a different filter or clear your search.`}
          </Text>
          {activeFilter === 'all' && verification.canPostJobs && (
            <TouchableOpacity style={s.emptyBtn} onPress={handlePostJob} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.emptyBtnText}>Post Your First Job</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.job_post_id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onViewDetails={() => setViewingJob(item)}
              onViewApplications={() =>
                router.push({
                  pathname: '/(parent)/applications',
                  params: { job_id: item.job_post_id },
                } as never)
              }
              onEdit={() => handleEditJob(item)}
              onDelete={() => promptDelete(item.job_post_id, item.title)}
              onUpdateStatus={status => handleUpdateStatus(item.job_post_id, status)}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={c.parent} />}
        />
      )}
    </View>
  );

  // ── Desktop ───────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={s.desktopMain}>
          {/* Page hero */}
          <View style={s.desktopHero}>
            <View>
              <Text style={s.heroTitle}>My Job Board</Text>
              <Text style={s.heroSub}>Manage all your job postings in one place</Text>
            </View>
            <TouchableOpacity
              style={[s.postBtn, !verification.canPostJobs && s.postBtnDisabled]}
              onPress={handlePostJob}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={s.postBtnText}>Post New Job</Text>
            </TouchableOpacity>
          </View>
          <View style={s.desktopBody}>
            {boardContent}
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.mobileRoot}>
      {renderModals()}

      {/* Mobile header */}
      <View style={s.mobileHeader}>
        <TouchableOpacity style={s.menuBtn} onPress={() => setMobileMenu(true)}>
          <Ionicons name="menu" size={26} color={c.ink} />
        </TouchableOpacity>

        <View style={s.mobileTitleWrap}>
          <Text style={s.mobileTitle}>My Job Board</Text>
          {pendingCount > 0 && (
            <View style={s.mobilePendingDot}>
              <Text style={s.mobilePendingDotText}>{pendingCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.mobileFab, !verification.canPostJobs && s.mobileFabDisabled]}
          onPress={handlePostJob}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {boardContent}

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setMobileMenu(false)} handleLogout={initiateLogout} />
      <ParentTabBar />
    </SafeAreaView>
  );
}
