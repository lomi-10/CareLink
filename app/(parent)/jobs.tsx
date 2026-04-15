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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useParentJobs } from '@/hooks/parent';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useUserVerification } from '@/hooks/peso';

import { ConfirmationModal, LoadingSpinner, NotificationModal } from '@/components/shared';
import { MobileMenu, Sidebar } from '@/components/parent/home';
import { JobCard, JobPostModal } from '@/components/parent/jobs';
import { JobDetailsModal } from '@/components/parent/jobs/JobDetailsModal';
import { PendingBanner } from '@/components/parent/verification/PendingBanner';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';

// ─── Filter config ─────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',     label: 'All',     icon: 'apps'                as const, color: theme.color.inkMuted },
  { key: 'open',    label: 'Open',    icon: 'radio-button-on'     as const, color: theme.color.success  },
  { key: 'pending', label: 'Pending', icon: 'hourglass'           as const, color: theme.color.warning  },
  { key: 'filled',  label: 'Filled',  icon: 'checkmark-circle'    as const, color: theme.color.parent   },
  { key: 'closed',  label: 'Closed',  icon: 'stop-circle'         as const, color: theme.color.muted    },
  { key: 'expired', label: 'Expired', icon: 'time'                as const, color: theme.color.danger   },
];

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

  const pendingCount = useMemo(() => jobs.filter(j => j.status === 'Pending').length, [jobs]);

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

  // ── Shared modals ─────────────────────────────────────────────────────────
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

  // ── Stats strip ───────────────────────────────────────────────────────────
  const statsData = [
    { icon: 'briefcase'        as const, label: 'Total',     value: stats.total,            color: theme.color.parent,   bg: theme.color.parentSoft  },
    { icon: 'radio-button-on'  as const, label: 'Open',      value: stats.open,             color: theme.color.success,  bg: theme.color.successSoft },
    { icon: 'hourglass'        as const, label: 'Pending',   value: pendingCount,           color: theme.color.warning,  bg: theme.color.warningSoft },
    { icon: 'checkmark-circle' as const, label: 'Filled',    value: stats.filled,           color: theme.color.info,     bg: theme.color.infoSoft    },
    { icon: 'close-circle'     as const, label: 'Closed',    value: stats.closed,           color: theme.color.muted,    bg: theme.color.surface     },
    { icon: 'people'           as const, label: 'Applicants',value: stats.totalApplications,color: theme.color.parent,   bg: theme.color.parentSoft  },
  ];

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
          <Ionicons name="search-outline" size={18} color={theme.color.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search jobs…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.color.subtle}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={theme.color.subtle} />
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
            Showing <Text style={{ fontWeight: '700', color: theme.color.parent }}>{filteredJobs.length}</Text> job{filteredJobs.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' ? ` · ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}` : ''}
          </Text>
        </View>
      )}

      {/* List / Empty state */}
      {filteredJobs.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="briefcase-outline" size={44} color={theme.color.parent} />
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
              onViewApplications={() => router.push({ pathname: '/(parent)/applications', params: { job_id: item.job_post_id } })}
              onEdit={() => handleEditJob(item)}
              onDelete={() => promptDelete(item.job_post_id, item.title)}
              onUpdateStatus={status => handleUpdateStatus(item.job_post_id, status)}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={theme.color.parent} />}
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
          <Ionicons name="menu" size={26} color={theme.color.ink} />
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── roots ──
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: theme.color.canvasParent },
  mobileRoot:  { flex: 1, backgroundColor: theme.color.canvasParent },

  // ── desktop layout ──
  desktopMain: { flex: 1, overflow: 'hidden' },
  desktopHero: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 40, paddingVertical: 24,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.5 },
  heroSub:   { fontSize: 13, color: theme.color.muted, marginTop: 3 },
  desktopBody: { flex: 1 },

  // ── post button ──
  postBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.parent, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, shadowColor: theme.color.parent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  postBtnDisabled: { backgroundColor: theme.color.subtle, shadowOpacity: 0 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── mobile header ──
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  menuBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.color.surface, alignItems: 'center', justifyContent: 'center' },
  mobileTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileTitle: { fontSize: 17, fontWeight: '800', color: theme.color.ink },
  mobilePendingDot: { backgroundColor: theme.color.warning, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  mobilePendingDotText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  mobileFab: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.color.parent, alignItems: 'center', justifyContent: 'center', shadowColor: theme.color.parent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  mobileFabDisabled: { backgroundColor: theme.color.subtle, shadowOpacity: 0 },

  // ── board content ──
  board: { flex: 1 },

  // ── stats ──
  statsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    alignItems: 'flex-start',   // prevents tiles from stretching when list is empty
  },
  statTile: {
    alignSelf: 'flex-start',    // secondary guard against vertical stretch
    alignItems: 'center', gap: 4,
    padding: 14, borderRadius: 16,
    minWidth: 90,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statNum:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLbl:  { fontSize: 10, fontWeight: '700', color: theme.color.muted, textTransform: 'uppercase', letterSpacing: 0.3 },

  // ── toolbar ──
  toolbar: {
    backgroundColor: theme.color.surfaceElevated,
    paddingTop: 10,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
    gap: 0,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: theme.color.surface,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: theme.color.line,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.color.ink },
  filterRow:   { paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', gap: 8 },
  filterChip:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: theme.color.surface,
    borderWidth: 1.5, borderColor: theme.color.line,
  },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  filterBadge:    { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: 'center' },
  filterBadgeText:{ fontSize: 10, fontWeight: '800' },

  // ── results bar ──
  resultsBar: { paddingHorizontal: 16, paddingVertical: 8 },
  resultsText: { fontSize: 12, color: theme.color.muted },

  // ── list ──
  list: { padding: 16, paddingBottom: 48 },

  // ── empty state ──
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  emptyIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:{ fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: theme.color.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 280 },
  emptyBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.parent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, shadowColor: theme.color.parent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
