// app/(parent)/jobs/index.tsx
// "Work Management" — merged Job Posts + Applications screen.
// PHP: parent/get_posted_jobs.php, parent/get_job_applications.php, parent/delete_job.php,
//      parent/update_job_status.php, parent/update_application_status.php,
//      parent/post_job.php / edit_job.php (JobPostModal), interviews/schedule.php (InterviewModal)

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useJobApplications, useParentJobs, type JobApplication, type JobPost } from '@/hooks/parent';
import { computeHelperJobMatch, applicationToMatchable } from '@/lib/parentHelperMatch';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { useUserVerification } from '@/hooks/peso';

import { ConfirmationModal, InterviewModal, LoadingSpinner, NotificationModal } from '@/components/shared';
import { MobileMenu, Sidebar, ParentTabBar } from '@/components/parent/home';
import { JobPostModal } from '@/components/parent/jobs';
import { JobDetailsModal } from '@/components/parent/jobs/JobDetailsModal';
import { PendingBanner } from '@/components/parent/verification/PendingBanner';
import API_URL from '@/constants/api';

import {
  w, BROWN, CARAMEL, GOLD, DARK, MUTED, GREEN, SUCCESS_BG, WARNING_BG, DANGER, DANGER_BG, ICON_BG,
} from './work.styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_APPEARANCE: Record<string, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Open:     { bg: SUCCESS_BG, text: GREEN,  icon: 'radio-button-on' },
  Filled:   { bg: ICON_BG,    text: BROWN,  icon: 'checkmark-circle' },
  Closed:   { bg: WARNING_BG, text: '#B45309', icon: 'stop-circle' },
  Expired:  { bg: DANGER_BG,  text: DANGER, icon: 'time' },
  Pending:  { bg: WARNING_BG, text: '#B45309', icon: 'hourglass' },
  Rejected: { bg: DANGER_BG,  text: DANGER, icon: 'close-circle' },
};

function statusAppearance(status: string) {
  return STATUS_APPEARANCE[status] ?? { bg: ICON_BG, text: MUTED, icon: 'ellipse' as const };
}

const STATUS_FILTERS = [
  { key: 'all',         label: 'All',         icon: 'list-outline' as const },
  { key: 'Pending',     label: 'Pending',     icon: 'time-outline' as const },
  { key: 'Reviewed',    label: 'Reviewed',    icon: 'eye-outline' as const },
  { key: 'Shortlisted', label: 'Shortlisted', icon: 'star-outline' as const },
  { key: 'Accepted',    label: 'Hired',       icon: 'checkmark-circle-outline' as const },
  { key: 'Rejected',    label: 'Rejected',    icon: 'close-circle-outline' as const },
];

/** Friendlier copy + colors for an application's pipeline stage — shown as a chip on applicant cards. */
const APPLICATION_STATUS_APPEARANCE: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Pending:               { color: '#D97706', bg: '#FEF3C7', icon: 'time',             label: 'Needs review' },
  Reviewed:              { color: '#2563EB', bg: '#DBEAFE', icon: 'eye',              label: 'Reviewed' },
  Shortlisted:           { color: '#7C3AED', bg: '#F3E8FF', icon: 'star',             label: 'Shortlisted' },
  'Interview Scheduled': { color: '#059669', bg: '#D1FAE5', icon: 'calendar',         label: 'Interview scheduled' },
  Accepted:              { color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle', label: 'Hired' },
  hired:                 { color: '#059669', bg: '#D1FAE5', icon: 'checkmark-done',   label: 'Hired' },
  contract_pending:      { color: '#D97706', bg: '#FEF3C7', icon: 'document-text',    label: 'Contract pending' },
  Rejected:              { color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle',     label: 'Rejected' },
  auto_rejected:         { color: '#6B7280', bg: '#F3F4F6', icon: 'briefcase',        label: 'Closed (other role)' },
  'Pending Termination': { color: '#B45309', bg: '#FEF3C7', icon: 'document-text',    label: 'Ending contract' },
  termination_pending:   { color: '#B45309', bg: '#FEF3C7', icon: 'document-text',    label: 'Ending contract' },
  Withdrawn:             { color: '#6B7280', bg: '#F3F4F6', icon: 'arrow-undo',       label: 'Withdrawn' },
};
function applicationStatusAppearance(status: string) {
  return APPLICATION_STATUS_APPEARANCE[status] ?? { color: MUTED, bg: ICON_BG, icon: 'information-circle' as const, label: status };
}

function getInitials(name?: string) {
  if (!name) return 'H';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Relative "Applied X days ago" copy for applicant cards. */
function timeAgo(dateStr?: string | null) {
  if (!dateStr) return 'recently';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkManagement() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; job_id?: string }>();
  const { isDesktop } = useResponsive();
  const { handleLogout, userData } = useAuth();
  const { unreadCount } = useNotifications('parent');
  const { verification } = useUserVerification();
  const isPending = verification.status === 'Pending';

  const { jobs, loading: loadingJobs, refresh: refreshJobs, stats: jobStats } = useParentJobs();
  const {
    applications: allApplications,
    loading: loadingApps,
    error: appsError,
    refresh: refreshApps,
    updateApplicationStatus,
  } = useJobApplications('');

  // ── Top-level UI state ──
  const [activeTab, setActiveTab]         = useState<'jobs' | 'applicants'>('jobs');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [mobileView, setMobileView]       = useState<'list' | 'detail'>('list');
  const [isMobileMenuOpen, setMobileMenu] = useState(false);

  // Default-select the first job once jobs load
  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) setSelectedJobId(jobs[0].job_post_id);
  }, [jobs, selectedJobId]);

  // Honor deep-link params, e.g. router.push({ pathname: '/(parent)/jobs', params: { tab: 'applicants', job_id } })
  useEffect(() => {
    if (jobs.length === 0) return;
    if (params.job_id) {
      const job = jobs.find(j => String(j.job_post_id) === String(params.job_id));
      if (job) { setSelectedJobId(String(job.job_post_id)); setMobileView('detail'); }
    }
    if (params.tab === 'applicants') {
      setActiveTab('applicants');
      setApplicantsScope(params.job_id ? 'job' : 'all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tab, params.job_id, jobs.length]);

  const selectedJob = useMemo(
    () => jobs.find(j => j.job_post_id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const jobApplications = useMemo(
    () => allApplications.filter(a => String(a.job_post_id) === String(selectedJobId)),
    [allApplications, selectedJobId],
  );

  // Same computeHelperJobMatch formula used on Browse Helpers / Dashboard, scored against
  // the specific job this application belongs to, so the percentage matches across screens.
  const matchForApp = (app: JobApplication) => {
    const job = jobs.find(x => String(x.job_post_id) === String(app.job_post_id)) ?? null;
    return computeHelperJobMatch(applicationToMatchable(app), job);
  };

  const recentApplicants = useMemo(
    () => [...jobApplications]
      .map(a => ({ app: a, match: matchForApp(a) }))
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 3),
    [jobApplications, jobs],
  );

  // ── Applicants tab scope (this job vs all jobs) + status filter ──
  const [applicantsScope, setApplicantsScope] = useState<'job' | 'all'>('job');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');

  const scopedApplications = applicantsScope === 'all' ? allApplications : jobApplications;
  const filteredApplications = useMemo(() => {
    if (activeStatusFilter === 'all') return scopedApplications;
    if (activeStatusFilter === 'Rejected') return scopedApplications.filter(a => a.status === 'Rejected' || a.status === 'auto_rejected');
    if (activeStatusFilter === 'Accepted') return scopedApplications.filter(a => a.status === 'Accepted' || a.status === 'hired');
    return scopedApplications.filter(a => a.status === activeStatusFilter);
  }, [scopedApplications, activeStatusFilter]);

  const jobTitleForApp = (app: JobApplication) => {
    const j = jobs.find(x => String(x.job_post_id) === String(app.job_post_id));
    return j?.title || j?.custom_job_title || 'Job';
  };

  // ── Modal / overlay state ──
  const [editingJob, setEditingJob]               = useState<JobPost | null>(null);
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [viewingJob, setViewingJob]               = useState<JobPost | null>(null);
  const [deleteModal, setDeleteModal]             = useState({ visible: false, jobId: '', jobTitle: '' });
  const [notification, setNotification]          = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [confirmLogoutVisible, setConfirmLogout] = useState(false);
  const [successLogoutVisible, setSuccessLogout] = useState(false);
  // Inline applicant profile panel (replaces the old "Applicant Profile" modal)
  const [selectedApplicantId, setSelectedApplicantId] = useState('');
  const [profileTab, setProfileTab] = useState<'overview' | 'skills' | 'documents'>('overview');
  const [applicantMobileView, setApplicantMobileView] = useState<'list' | 'detail'>('list');
  const [sharedDocs, setSharedDocs] = useState<{ document_id: number; document_type: string; status: string; file_url?: string }[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ file_url: string; document_type: string } | null>(null);
  const [statusConfirm, setStatusConfirm]         = useState<{ visible: boolean; appId: string; action: 'Shortlisted' | 'Rejected' | null }>({ visible: false, appId: '', action: null });
  const [interviewTarget, setInterviewTarget]     = useState<{ appId: number; helperName: string; jobTitle: string } | null>(null);

  // The applicant currently shown in the inline profile panel — looked up from the
  // scoped list so the selection survives status-filter changes.
  const selectedApplicant = useMemo(
    () => scopedApplications.find(a => a.application_id === selectedApplicantId) ?? null,
    [scopedApplications, selectedApplicantId],
  );

  // Lazily fetch documents the applicant has shared for this application when the
  // "Documents" tab of the inline profile panel is opened.
  useEffect(() => {
    if (profileTab !== 'documents' || !selectedApplicant) return;
    let cancelled = false;
    (async () => {
      try {
        setDocsLoading(true);
        const res = await fetch(`${API_URL}/parent/get_applicant_profile.php?application_id=${selectedApplicant.application_id}&helper_id=${selectedApplicant.helper_id}&requester_id=${userData?.user_id ?? ''}`);
        const data = await res.json();
        if (!cancelled) setSharedDocs(data.success ? (data.shared_documents ?? []) : []);
      } catch {
        if (!cancelled) setSharedDocs([]);
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileTab, selectedApplicant?.application_id]);

  useEffect(() => {
    if (appsError) setNotification({ visible: true, message: appsError, type: 'error' });
  }, [appsError]);

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

  const handleEditJob = (job: JobPost) => { setEditingJob(job); setIsPostModalVisible(true); };

  const promptDelete = (jobId: string, jobTitle: string) => setDeleteModal({ visible: true, jobId, jobTitle });

  const confirmDelete = async () => {
    try {
      setDeleteModal(p => ({ ...p, visible: false }));
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/parent/delete_job.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: deleteModal.jobId, parent_id: user.user_id }),
      });
      const data = await res.json();
      if (data.success) { setNotification({ visible: true, message: 'Job deleted.', type: 'success' }); refreshJobs(); }
      else throw new Error(data.message);
    } catch (e: any) {
      setNotification({ visible: true, message: e.message || 'Failed to delete job.', type: 'error' });
    }
  };

  // Selecting an applicant shows their profile inline (right panel on desktop,
  // drill-down on mobile) — replaces the old "Applicant Profile" modal.
  const handleSelectApplicant = (app: JobApplication) => {
    setSelectedApplicantId(app.application_id);
    setProfileTab('overview');
    setApplicantMobileView('detail');
  };

  // From "Recent Applicants" on the Jobs tab — jump to the Applicants tab with
  // that applicant's profile already open.
  const handleViewProfile = (app: JobApplication) => {
    setSelectedJobId(app.job_post_id);
    setApplicantsScope('job');
    setActiveStatusFilter('all');
    setActiveTab('applicants');
    handleSelectApplicant(app);
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
      }
    } catch (err: any) {
      setNotification({ visible: true, message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const goToApplicantsForJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setApplicantsScope('job');
    setActiveStatusFilter('all');
    setActiveTab('applicants');
  };

  // ── Stats row data ──
  const statsRowData = useMemo(() => {
    const totalApplications = allApplications.length;
    const newApplications   = jobs.reduce((sum, j) => sum + (j.new_application_count || 0), 0);
    const shortlisted       = allApplications.filter(a => a.status === 'Shortlisted').length;
    const hired             = allApplications.filter(a => a.status === 'hired' || a.status === 'Accepted').length;
    return [
      { key: 'active',  icon: 'briefcase'         as const, color: BROWN,  bg: ICON_BG,    value: jobStats.open,   label: 'Active Jobs',  sub: `${jobStats.open} open` },
      { key: 'apps',    icon: 'people'            as const, color: '#C8623F', bg: '#F6DCCB', value: totalApplications, label: 'Applications', sub: `${newApplications} new` },
      { key: 'short',   icon: 'star'              as const, color: '#7C3AED', bg: '#F3E8FF', value: shortlisted,    label: 'Shortlisted',  sub: `${shortlisted} total` },
      { key: 'hired',   icon: 'checkmark-circle'  as const, color: GREEN,   bg: SUCCESS_BG, value: hired,           label: 'Hired',        sub: `${hired} hired` },
    ];
  }, [allApplications, jobs, jobStats]);

  // ────────────────────────────────────────────────────────────────────────
  // Sub-renders
  // ────────────────────────────────────────────────────────────────────────

  const renderStatsRow = () => (
    <View style={w.statsRow}>
      {statsRowData.map(stat => (
        <View key={stat.key} style={w.statTile}>
          <View style={[w.statIconWrap, { backgroundColor: stat.bg }]}>
            <Ionicons name={stat.icon} size={16} color={stat.color} />
          </View>
          <Text style={w.statValue}>{stat.value}</Text>
          <Text style={w.statLabel}>{stat.label}</Text>
          <Text style={w.statSub}>{stat.sub}</Text>
        </View>
      ))}
    </View>
  );

  const renderTabSwitch = () => (
    <View style={w.tabSwitchWrap}>
      <View style={w.tabSwitch}>
        <TouchableOpacity
          style={[w.tabBtn, activeTab === 'jobs' && w.tabBtnActive]}
          onPress={() => { setActiveTab('jobs'); setMobileView('list'); }}
          activeOpacity={0.85}
        >
          <Text style={[w.tabBtnText, activeTab === 'jobs' && w.tabBtnTextActive]}>Jobs Posted</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[w.tabBtn, activeTab === 'applicants' && w.tabBtnActive]}
          onPress={() => setActiveTab('applicants')}
          activeOpacity={0.85}
        >
          <Text style={[w.tabBtnText, activeTab === 'applicants' && w.tabBtnTextActive]}>Applicants</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderJobListItem = (job: JobPost) => {
    const appearance = statusAppearance(job.status);
    const active = job.job_post_id === selectedJobId;
    return (
      <TouchableOpacity
        key={job.job_post_id}
        style={[w.jobListItem, active && w.jobListItemActive]}
        onPress={() => { setSelectedJobId(job.job_post_id); setMobileView('detail'); }}
        activeOpacity={0.85}
      >
        <View style={w.jobThumb}>
          <Ionicons name="briefcase" size={20} color={BROWN} />
        </View>
        <View style={w.jobItemBody}>
          <Text style={w.jobItemTitle} numberOfLines={1}>{job.title}</Text>
          <View style={w.jobItemMetaRow}>
            <View style={[w.statusPill, { backgroundColor: appearance.bg }]}>
              <Ionicons name={appearance.icon} size={10} color={appearance.text} />
              <Text style={[w.statusPillText, { color: appearance.text }]}>{job.status}</Text>
            </View>
            <Text style={w.jobItemSalary}>₱{Number(job.salary_offered).toLocaleString()}/{(job.salary_period ?? 'mo').toLowerCase().slice(0, 3)}</Text>
          </View>
          <Text style={w.jobItemApplicants}>
            {job.application_count} applicant{job.application_count !== 1 ? 's' : ''}
            {job.new_application_count > 0 ? ` · ${job.new_application_count} new` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </TouchableOpacity>
    );
  };

  const renderJobDetailPanel = () => {
    if (!selectedJob) {
      return (
        <View style={w.detailCard}>
          <View style={w.detailEmptyWrap}>
            <View style={w.emptyIconCircle}>
              <Ionicons name="briefcase-outline" size={34} color={BROWN} />
            </View>
            <Text style={w.detailEmptyTitle}>Select a job to see details</Text>
            <Text style={w.detailEmptySub}>Choose a job post from the list to view its details, edit it, or review applicants.</Text>
          </View>
        </View>
      );
    }

    const appearance = statusAppearance(selectedJob.status);
    const location = [selectedJob.barangay, selectedJob.municipality, selectedJob.province].filter(Boolean).join(', ') || 'Location not set';
    const newCount = jobApplications.filter(a => a.status === 'Pending').length;
    const shortlistedCount = jobApplications.filter(a => a.status === 'Shortlisted').length;
    const hiredCount = jobApplications.filter(a => a.status === 'hired' || a.status === 'Accepted').length;

    return (
      <View style={w.detailCard}>
        {/* Header */}
        <View style={w.detailTopRow}>
          <View style={w.detailThumb}>
            <Ionicons name="briefcase" size={30} color={BROWN} />
          </View>
          <View style={w.detailHeaderInfo}>
            <Text style={w.detailTitle} numberOfLines={2}>{selectedJob.title}</Text>
            <View style={w.detailMetaRow}>
              <View style={[w.statusPill, { backgroundColor: appearance.bg }]}>
                <Ionicons name={appearance.icon} size={10} color={appearance.text} />
                <Text style={[w.statusPillText, { color: appearance.text }]}>{selectedJob.status}</Text>
              </View>
              <Text style={w.detailMetaText}>Posted {formatDate(selectedJob.posted_at)}</Text>
            </View>
            <View style={w.detailMetaRow}>
              <Ionicons name="location-outline" size={13} color={MUTED} />
              <Text style={w.detailMetaText} numberOfLines={1}>{location}</Text>
            </View>
            <Text style={w.detailSalary}>
              ₱{Number(selectedJob.salary_offered).toLocaleString()} / {(selectedJob.salary_period ?? 'Monthly').toLowerCase()}
            </Text>
          </View>
        </View>

        {/* Mini stats */}
        <View style={w.miniStatsGrid}>
          <View style={w.miniStatTile}>
            <Text style={w.miniStatValue}>{jobApplications.length}</Text>
            <Text style={w.miniStatLabel}>Total</Text>
          </View>
          <View style={w.miniStatTile}>
            <Text style={[w.miniStatValue, { color: '#C8623F' }]}>{newCount}</Text>
            <Text style={w.miniStatLabel}>New</Text>
          </View>
          <View style={w.miniStatTile}>
            <Text style={[w.miniStatValue, { color: '#7C3AED' }]}>{shortlistedCount}</Text>
            <Text style={w.miniStatLabel}>Shortlisted</Text>
          </View>
          <View style={w.miniStatTile}>
            <Text style={[w.miniStatValue, { color: GREEN }]}>{hiredCount}</Text>
            <Text style={w.miniStatLabel}>Hired</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={w.detailActionsRow}>
          <TouchableOpacity style={w.outlineBtn} onPress={() => handleEditJob(selectedJob)} activeOpacity={0.85}>
            <Ionicons name="pencil-outline" size={15} color={BROWN} />
            <Text style={w.outlineBtnText}>Edit Job</Text>
          </TouchableOpacity>
          <TouchableOpacity style={w.primaryBtn} onPress={() => goToApplicantsForJob(selectedJob.job_post_id)} activeOpacity={0.85}>
            <Ionicons name="people-outline" size={15} color="#FFFFFF" />
            <Text style={w.primaryBtnText}>View Applicants</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={w.viewDetailsLink} onPress={() => setViewingJob(selectedJob)} activeOpacity={0.7}>
          <Ionicons name="document-text-outline" size={14} color={BROWN} />
          <Text style={w.viewDetailsLinkText}>View Job Details</Text>
        </TouchableOpacity>

        <View style={w.sectionDivider} />

        {/* Recent applicants */}
        <View style={w.recentHeaderRow}>
          <Text style={w.recentTitle}>Recent Applicants</Text>
          {newCount > 0 && (
            <Text style={w.recentCountPill}>{`${newCount} New`}</Text>
          )}
        </View>

        {recentApplicants.length === 0 ? (
          <Text style={w.recentEmptyText}>No applicants yet for this job post.</Text>
        ) : (
          recentApplicants.map(({ app, match }, idx) => (
            <TouchableOpacity key={app.application_id} style={w.applicantRow} onPress={() => handleViewProfile(app)} activeOpacity={0.8}>
              {app.helper_photo ? (
                <Image source={{ uri: app.helper_photo }} style={w.applicantAvatar} contentFit="cover" />
              ) : (
                <View style={w.applicantAvatarFallback}>
                  <Text style={w.applicantInitials}>{getInitials(app.helper_name)}</Text>
                </View>
              )}
              <View style={w.applicantBody}>
                <Text style={w.applicantName} numberOfLines={1}>{app.helper_name}</Text>
                <Text style={w.applicantMeta} numberOfLines={1}>
                  {app.helper_age ? `${app.helper_age} yrs` : 'Age N/A'}
                  {app.helper_experience_years ? ` · ${app.helper_experience_years} yr${app.helper_experience_years !== 1 ? 's' : ''} exp` : ''}
                </Text>
                {match.reasons[0] && (
                  <Text style={w.applicantReasonText} numberOfLines={1}>{match.reasons[0]}</Text>
                )}
              </View>
              <View style={[w.matchBadge, idx === 0 && w.matchBadgeTop]}>
                {idx === 0 && <Ionicons name="star" size={10} color="#FFFFFF" />}
                <Text style={[w.matchBadgeText, idx === 0 && w.matchBadgeTextTop]}>{match.score}% match</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {jobApplications.length > 3 && (
          <TouchableOpacity style={w.viewAllLink} onPress={() => goToApplicantsForJob(selectedJob.job_post_id)} activeOpacity={0.7}>
            <Text style={w.viewAllLinkText}>View all {jobApplications.length} applicants →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderJobsPostedTab = () => {
    if (jobs.length === 0) {
      return (
        <View style={w.empty}>
          <View style={w.emptyIconCircle}>
            <Ionicons name="briefcase-outline" size={38} color={BROWN} />
          </View>
          <Text style={w.emptyTitle}>No jobs posted yet</Text>
          <Text style={w.emptySub}>Start by posting your first job and let qualified helpers apply.</Text>
          {verification.canPostJobs && (
            <TouchableOpacity style={w.emptyBtn} onPress={handlePostJob} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={w.emptyBtnText}>Post Your First Job</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (isDesktop) {
      return (
        <View style={w.splitRow}>
          <View style={w.jobListCol}>
            <View style={w.jobListHeaderRow}>
              <Text style={w.jobListTitle}>Job Posts</Text>
              <Text style={w.jobListCount}>{jobs.length}</Text>
            </View>
            {jobs.map(renderJobListItem)}
          </View>
          <View style={w.detailCol}>
            {renderJobDetailPanel()}
          </View>
        </View>
      );
    }

    // ── Mobile: drill-down between list and detail ──
    if (mobileView === 'detail' && selectedJob) {
      return (
        <>
          <TouchableOpacity style={w.backRow} onPress={() => setMobileView('list')} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={16} color={BROWN} />
            <Text style={w.backRowText}>Back to job list</Text>
          </TouchableOpacity>
          <View style={w.jobListColMobile}>
            {renderJobDetailPanel()}
          </View>
        </>
      );
    }

    return (
      <View style={w.jobListColMobile}>
        <View style={w.jobListHeaderRow}>
          <Text style={w.jobListTitle}>Job Posts</Text>
          <Text style={w.jobListCount}>{jobs.length}</Text>
        </View>
        {jobs.map(renderJobListItem)}
      </View>
    );
  };

  // ── Applicants tab: compact card for the left-hand applicant list ──
  const renderApplicantListCard = (item: JobApplication) => {
    const active = item.application_id === selectedApplicantId;
    const match  = matchForApp(item);
    const role   = item.helper_jobs?.[0] || item.helper_categories?.[0] || item.category_name || 'Helper';
    const stage  = applicationStatusAppearance(item.status);
    return (
      <TouchableOpacity
        key={item.application_id}
        style={[w.appCard, active && w.appCardActive]}
        onPress={() => handleSelectApplicant(item)}
        activeOpacity={0.85}
      >
        <View style={w.appCardTopRow}>
          {item.helper_photo ? (
            <Image source={{ uri: item.helper_photo }} style={w.appCardAvatar} contentFit="cover" />
          ) : (
            <View style={w.appCardAvatarFallback}>
              <Text style={w.appCardInitials}>{getInitials(item.helper_name)}</Text>
            </View>
          )}
          <View style={w.appCardInfo}>
            <Text style={w.appCardName} numberOfLines={1}>{item.helper_name}</Text>
            <Text style={w.appCardApplied}>Applied {timeAgo(item.applied_at)}</Text>
          </View>
          <View style={w.appCardMatchBadge}>
            <Text style={w.appCardMatchText}>{match.score}% match</Text>
          </View>
        </View>

        <View style={[w.appCardStageChip, { backgroundColor: stage.bg, alignSelf: 'flex-start' }]}>
          <Ionicons name={stage.icon} size={11} color={stage.color} />
          <Text style={[w.appCardStageChipText, { color: stage.color }]}>{stage.label}</Text>
        </View>

        <View style={w.appCardMidRow}>
          <Ionicons name="star" size={13} color={GOLD} />
          <Text style={w.appCardRatingText}>
            {item.helper_rating_average ? Number(item.helper_rating_average).toFixed(1) : 'New'}
            {item.helper_rating_count ? ` (${item.helper_rating_count})` : ''}
          </Text>
          <View style={w.appCardDot} />
          <Text style={w.appCardRoleText} numberOfLines={1}>
            {role}{item.helper_experience_years ? ` · ${item.helper_experience_years} yr${item.helper_experience_years !== 1 ? 's' : ''} exp` : ''}
          </Text>
        </View>

        {match.reasons[0] && (
          <View style={w.appCardReasonRow}>
            <Ionicons name="sparkles-outline" size={11} color={CARAMEL} />
            <Text style={w.appCardReasonText} numberOfLines={1}>{match.reasons[0]}</Text>
          </View>
        )}

        <View style={w.appCardBadgeRow}>
          {item.verification_status === 'Verified' && (
            <View style={[w.miniBadge, w.miniBadgeGreen]}>
              <Ionicons name="shield-checkmark" size={11} color={GREEN} />
              <Text style={[w.miniBadgeText, { color: GREEN }]}>PESO Verified</Text>
            </View>
          )}
          {(item as any).availability_status === 'Available' && (
            <View style={[w.miniBadge, w.miniBadgeBlue]}>
              <Ionicons name="briefcase" size={11} color="#1D4ED8" />
              <Text style={[w.miniBadgeText, { color: '#1D4ED8' }]}>Available</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Applicants tab: inline "Applicant Profile" panel — shown automatically on selection ──
  const renderApplicantDetailPanel = () => {
    if (!selectedApplicant) {
      return (
        <View style={w.detailCard}>
          <View style={w.detailEmptyWrap}>
            <View style={w.emptyIconCircle}>
              <Ionicons name="person-outline" size={34} color={BROWN} />
            </View>
            <Text style={w.detailEmptyTitle}>Select an applicant</Text>
            <Text style={w.detailEmptySub}>Tap an applicant from the list to see their full profile, match details, and background — right here.</Text>
          </View>
        </View>
      );
    }

    const a = selectedApplicant as any;
    const match = matchForApp(selectedApplicant);
    const location = [a.helper_barangay, a.helper_municipality, a.helper_province].filter(Boolean).join(', ') || 'Not specified';
    const salaryLabel = a.helper_expected_salary
      ? `₱${Number(a.helper_expected_salary).toLocaleString()} / ${(a.helper_salary_period ?? 'Monthly').toLowerCase()}`
      : 'Not specified';
    const canDecide  = ['Pending', 'Reviewed'].includes(selectedApplicant.status);
    const canSchedule = ['Shortlisted', 'Interview Scheduled'].includes(selectedApplicant.status);
    const isHired    = ['hired', 'Accepted'].includes(selectedApplicant.status);

    return (
      <View style={w.detailCard}>
        {/* Hero */}
        <View style={w.profileHero}>
          {a.helper_photo ? (
            <Image source={{ uri: a.helper_photo }} style={w.profileAvatar} contentFit="cover" />
          ) : (
            <View style={w.profileAvatarFallback}>
              <Text style={w.profileInitials}>{getInitials(a.helper_name)}</Text>
            </View>
          )}
          <Text style={w.profileName}>{a.helper_name}</Text>
          <View style={w.profileBadgesRow}>
            {a.verification_status === 'Verified' && (
              <View style={[w.miniBadge, w.miniBadgeGreen]}>
                <Ionicons name="shield-checkmark" size={12} color={GREEN} />
                <Text style={[w.miniBadgeText, { color: GREEN }]}>PESO Verified</Text>
              </View>
            )}
            {a.availability_status === 'Available' && (
              <View style={[w.miniBadge, w.miniBadgeBlue]}>
                <Ionicons name="briefcase" size={12} color="#1D4ED8" />
                <Text style={[w.miniBadgeText, { color: '#1D4ED8' }]}>Available to Work</Text>
              </View>
            )}
            <View style={[w.miniBadge, w.miniBadgeMatch]}>
              <Ionicons name="analytics" size={12} color={BROWN} />
              <Text style={[w.miniBadgeText, { color: BROWN }]}>{match.score}% match</Text>
            </View>
          </View>
        </View>

        {/* Quick info tiles */}
        <View style={w.infoTilesRow}>
          <View style={w.infoTile}>
            <Ionicons name="person-outline" size={16} color={MUTED} />
            <Text style={w.infoTileValue}>{a.helper_age ? `${a.helper_age}` : '—'}</Text>
            <Text style={w.infoTileLabel}>Age</Text>
          </View>
          <View style={w.infoTile}>
            <Ionicons name="male-female-outline" size={16} color={MUTED} />
            <Text style={w.infoTileValue}>{a.helper_gender || '—'}</Text>
            <Text style={w.infoTileLabel}>Gender</Text>
          </View>
          <View style={w.infoTile}>
            <Ionicons name="briefcase-outline" size={16} color={MUTED} />
            <Text style={w.infoTileValue}>{a.helper_experience_years ? `${a.helper_experience_years} yrs` : 'New'}</Text>
            <Text style={w.infoTileLabel}>Experience</Text>
          </View>
          <View style={w.infoTile}>
            <Ionicons name="school-outline" size={16} color={MUTED} />
            <Text style={w.infoTileValue} numberOfLines={1}>{a.helper_education_level || '—'}</Text>
            <Text style={w.infoTileLabel}>Education</Text>
          </View>
          <View style={w.infoTile}>
            <Ionicons name="location-outline" size={16} color={MUTED} />
            <Text style={w.infoTileValue} numberOfLines={1}>{a.helper_municipality || '—'}</Text>
            <Text style={w.infoTileLabel}>Location</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={w.profileTabsRow}>
          {([
            { key: 'overview',  label: 'Overview' },
            { key: 'skills',    label: 'Skills' },
            { key: 'documents', label: 'Documents' },
          ] as const).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[w.profileTabBtn, profileTab === tab.key && w.profileTabBtnActive]}
              onPress={() => setProfileTab(tab.key)}
              activeOpacity={0.85}
            >
              <Text style={[w.profileTabText, profileTab === tab.key && w.profileTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Overview ── */}
        {profileTab === 'overview' && (
          <View>
            <View style={w.profileSection}>
              <Text style={w.profileSectionTitle}>Why this match</Text>
              <View style={w.matchReasonsBox}>
                {match.reasons.slice(0, 3).map((reason, i) => (
                  <View key={i} style={w.matchReasonRow}>
                    <Ionicons name="sparkles-outline" size={14} color={BROWN} />
                    <Text style={w.matchReasonText}>{reason}</Text>
                  </View>
                ))}
              </View>
            </View>

            {a.helper_bio ? (
              <View style={w.profileSection}>
                <Text style={w.profileSectionTitle}>About Me</Text>
                <View style={w.bioBox}>
                  <Text style={w.bioText}>{a.helper_bio}</Text>
                </View>
              </View>
            ) : null}

            <View style={w.profileSection}>
              <Text style={w.profileSectionTitle}>Work Preference</Text>
              <View style={w.detailsList}>
                <View style={w.detailItem}>
                  <Text style={w.detailLabel}>Preferred Role</Text>
                  <Text style={w.detailValue} numberOfLines={1}>{a.helper_jobs?.[0] || a.helper_categories?.[0] || 'Not specified'}</Text>
                </View>
                <View style={w.detailItem}>
                  <Text style={w.detailLabel}>Preferred Job Type</Text>
                  <Text style={w.detailValue}>{a.helper_employment_type || 'Any'}</Text>
                </View>
                <View style={w.detailItem}>
                  <Text style={w.detailLabel}>Expected Salary</Text>
                  <Text style={w.detailValue}>{salaryLabel}</Text>
                </View>
                <View style={[w.detailItem, w.detailItemLast]}>
                  <Text style={w.detailLabel}>Availability</Text>
                  <Text style={w.detailValue}>{a.helper_work_schedule || 'Any'}</Text>
                </View>
              </View>
            </View>

            <View style={w.profileSection}>
              <Text style={w.profileSectionTitle}>Background</Text>
              <View style={w.detailsList}>
                <View style={w.detailItem}>
                  <Text style={w.detailLabel}>Civil Status</Text>
                  <Text style={w.detailValue}>{a.helper_civil_status || 'Not specified'}</Text>
                </View>
                <View style={w.detailItem}>
                  <Text style={w.detailLabel}>Religion</Text>
                  <Text style={w.detailValue}>{a.helper_religion || 'Not specified'}</Text>
                </View>
                <View style={[w.detailItem, w.detailItemLast]}>
                  <Text style={w.detailLabel}>Location</Text>
                  <Text style={[w.detailValue, w.detailValueRight]} numberOfLines={2}>{location}</Text>
                </View>
              </View>
            </View>

            {selectedApplicant.cover_letter ? (
              <View style={w.profileSection}>
                <Text style={w.profileSectionTitle}>Cover Letter</Text>
                <View style={w.bioBox}>
                  <Text style={w.bioText}>"{selectedApplicant.cover_letter}"</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Skills ── */}
        {profileTab === 'skills' && (
          <View style={w.profileSection}>
            {a.helper_categories?.length > 0 && (
              <View style={w.skillGroup}>
                <Text style={w.skillGroupLabel}>Categories</Text>
                <View style={w.chipsWrap}>
                  {a.helper_categories.map((c: string, i: number) => (
                    <View key={`cat-${i}`} style={[w.skillChip, w.skillChipBlue]}>
                      <Text style={[w.skillChipText, { color: '#1D4ED8' }]}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {a.helper_jobs?.length > 0 && (
              <View style={w.skillGroup}>
                <Text style={w.skillGroupLabel}>Specific Roles</Text>
                <View style={w.chipsWrap}>
                  {a.helper_jobs.map((j: string, i: number) => (
                    <View key={`job-${i}`} style={[w.skillChip, w.skillChipGreen]}>
                      <Text style={[w.skillChipText, { color: GREEN }]}>{j}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {a.helper_skills?.length > 0 && (
              <View style={w.skillGroup}>
                <Text style={w.skillGroupLabel}>Skills & Abilities</Text>
                <View style={w.chipsWrap}>
                  {a.helper_skills.map((s: string, i: number) => (
                    <View key={`skill-${i}`} style={w.skillChip}>
                      <Text style={w.skillChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {!a.helper_categories?.length && !a.helper_jobs?.length && !a.helper_skills?.length && (
              <Text style={w.recentEmptyText}>No skills or roles listed yet.</Text>
            )}
          </View>
        )}

        {/* ── Documents ── */}
        {profileTab === 'documents' && (
          <View style={w.profileSection}>
            {docsLoading ? (
              <ActivityIndicator size="small" color={CARAMEL} style={{ marginVertical: 24 }} />
            ) : sharedDocs.length === 0 ? (
              <Text style={w.recentEmptyText}>No documents have been shared for this application yet.</Text>
            ) : (
              sharedDocs.map(doc => (
                <TouchableOpacity
                  key={doc.document_id}
                  style={w.docRow}
                  activeOpacity={0.75}
                  onPress={() => doc.file_url && setViewingDoc({ file_url: doc.file_url, document_type: doc.document_type })}
                  disabled={!doc.file_url}
                >
                  <View style={w.docIconWrap}>
                    <Ionicons name="document-text-outline" size={18} color={BROWN} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={w.docTitle} numberOfLines={1}>{doc.document_type}</Text>
                    <Text style={w.docStatus}>{doc.status}</Text>
                  </View>
                  <Ionicons name="eye-outline" size={18} color={MUTED} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Actions */}
        <Text style={w.profileStageLabel}>
          {canDecide
            ? "Awaiting your decision — shortlist to move them forward, or reject if they're not a fit."
            : canSchedule
            ? "Shortlisted — schedule an interview when you're ready to move forward."
            : isHired
            ? 'Hired — manage their tasks and placement below.'
            : `Status: ${selectedApplicant.status} — no action needed at this stage.`}
        </Text>
        <View style={w.profileActionsRow}>
          <TouchableOpacity
            style={w.profileActionOutline}
            onPress={() => router.push({
              pathname: '/(parent)/messages',
              params: {
                partner_id:   String(selectedApplicant.helper_id),
                partner_name: encodeURIComponent(selectedApplicant.helper_name ?? ''),
                job_post_id:  String(selectedApplicant.job_post_id ?? ''),
              },
            } as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-outline" size={16} color={BROWN} />
            <Text style={w.profileActionOutlineText}>Message</Text>
          </TouchableOpacity>

          {canDecide && (
            <>
              <TouchableOpacity
                style={w.profileActionOutline}
                onPress={() => setStatusConfirm({ visible: true, appId: selectedApplicant.application_id, action: 'Rejected' })}
                activeOpacity={0.85}
              >
                <Ionicons name="close-outline" size={16} color={DANGER} />
                <Text style={[w.profileActionOutlineText, { color: DANGER }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={w.profileActionPrimary}
                onPress={() => setStatusConfirm({ visible: true, appId: selectedApplicant.application_id, action: 'Shortlisted' })}
                activeOpacity={0.85}
              >
                <Ionicons name="star" size={16} color="#FFFFFF" />
                <Text style={w.profileActionPrimaryText}>Shortlist</Text>
              </TouchableOpacity>
            </>
          )}

          {canSchedule && (
            <TouchableOpacity
              style={w.profileActionPrimary}
              onPress={() => {
                const job = jobs.find(j => String(j.job_post_id) === String(selectedApplicant.job_post_id));
                setInterviewTarget({
                  appId: Number(selectedApplicant.application_id),
                  helperName: selectedApplicant.helper_name,
                  jobTitle: job?.title ?? 'this position',
                });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={w.profileActionPrimaryText}>Schedule Interview</Text>
            </TouchableOpacity>
          )}

          {isHired && (
            <TouchableOpacity
              style={w.profileActionPrimary}
              onPress={() => router.push({ pathname: '/(parent)/hire/placement_tasks', params: { application_id: String(selectedApplicant.application_id), helper_name: encodeURIComponent(selectedApplicant.helper_name ?? 'Helper') } } as any)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkbox-outline" size={16} color="#FFFFFF" />
              <Text style={w.profileActionPrimaryText}>Manage Placement</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderApplicantsTab = () => {
    if (jobs.length === 0) {
      return (
        <View style={w.empty}>
          <View style={w.emptyIconCircle}>
            <Ionicons name="briefcase-outline" size={38} color={BROWN} />
          </View>
          <Text style={w.emptyTitle}>No Jobs Posted Yet</Text>
          <Text style={w.emptySub}>Post a job to start receiving applications from helpers.</Text>
          <TouchableOpacity style={w.emptyBtn} onPress={handlePostJob} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={w.emptyBtnText}>Post a Job</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const filterBar = (
      <>
        <View style={w.applicantsHeader}>
          {/* Scope: this job vs all jobs */}
          <View style={w.scopeRow}>
            <TouchableOpacity
              style={[w.scopeChip, applicantsScope === 'job' && w.scopeChipActive]}
              onPress={() => setApplicantsScope('job')}
              activeOpacity={0.85}
            >
              <Ionicons name="briefcase-outline" size={13} color={applicantsScope === 'job' ? '#FFFFFF' : MUTED} />
              <Text style={[w.scopeChipText, applicantsScope === 'job' && w.scopeChipTextActive]}>This Job</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[w.scopeChip, applicantsScope === 'all' && w.scopeChipActive]}
              onPress={() => setApplicantsScope('all')}
              activeOpacity={0.85}
            >
              <Ionicons name="layers-outline" size={13} color={applicantsScope === 'all' ? '#FFFFFF' : MUTED} />
              <Text style={[w.scopeChipText, applicantsScope === 'all' && w.scopeChipTextActive]}>All Jobs</Text>
            </TouchableOpacity>
          </View>

          {/* Job picker — only relevant when scoped to a single job */}
          {applicantsScope === 'job' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={w.jobPickerRow}>
              {jobs.map(j => {
                const active = j.job_post_id === selectedJobId;
                return (
                  <TouchableOpacity
                    key={j.job_post_id}
                    style={[w.jobPickerChip, active && w.jobPickerChipActive]}
                    onPress={() => setSelectedJobId(j.job_post_id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[w.jobPickerChipText, active && w.jobPickerChipTextActive]} numberOfLines={1}>{j.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Status filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={w.filterScroll}>
          {STATUS_FILTERS.map(f => {
            const active = activeStatusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[w.filterChip, active && w.filterChipActive]}
                onPress={() => setActiveStatusFilter(f.key)}
                activeOpacity={0.85}
              >
                <Ionicons name={f.icon} size={13} color={active ? '#FFFFFF' : MUTED} />
                <Text style={[w.filterChipText, active && w.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </>
    );

    const applicantList = (
      <View style={[w.listPad, isDesktop && w.listPadDesktop]}>
        {filteredApplications.length === 0 ? (
          <View style={w.empty}>
            <View style={w.emptyIconCircle}>
              <Ionicons name="folder-open-outline" size={38} color={BROWN} />
            </View>
            <Text style={w.emptyTitle}>No applicants found</Text>
            <Text style={w.emptySub}>
              {activeStatusFilter !== 'all' ? 'Try selecting a different status filter.' : 'No one has applied yet.'}
            </Text>
          </View>
        ) : (
          filteredApplications.map(app => (
            <View key={app.application_id} style={{ marginBottom: 12 }}>
              {renderApplicantListCard(app)}
            </View>
          ))
        )}
      </View>
    );

    // ── Desktop: split view — list on the left, profile panel on the right ──
    if (isDesktop) {
      return (
        <View>
          {filterBar}
          <View style={w.splitRow}>
            <View style={w.jobListCol}>
              {applicantList}
            </View>
            <View style={w.detailCol}>
              {renderApplicantDetailPanel()}
            </View>
          </View>
        </View>
      );
    }

    // ── Mobile: drill-down between list and inline profile ──
    if (applicantMobileView === 'detail' && selectedApplicant) {
      return (
        <>
          <TouchableOpacity style={w.backRow} onPress={() => setApplicantMobileView('list')} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={16} color={BROWN} />
            <Text style={w.backRowText}>Back to applicants</Text>
          </TouchableOpacity>
          <View style={w.jobListColMobile}>
            {renderApplicantDetailPanel()}
          </View>
        </>
      );
    }

    return (
      <View>
        {filterBar}
        {applicantList}
      </View>
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // Modals
  // ────────────────────────────────────────────────────────────────────────

  const renderModals = () => (
    <>
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogout(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose duration={1500} onClose={() => { setSuccessLogout(false); handleLogout(); }} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification(p => ({ ...p, visible: false }))} autoClose duration={1500} />
      <ConfirmationModal visible={deleteModal.visible} title="Delete Job?" message={`Delete "${deleteModal.jobTitle}"? This cannot be undone.`} confirmText="Delete" cancelText="Cancel" type="danger" onConfirm={confirmDelete} onCancel={() => setDeleteModal(p => ({ ...p, visible: false }))} />
      <JobPostModal visible={isPostModalVisible} onClose={() => setIsPostModalVisible(false)} existingJobData={editingJob} onSaveSuccess={refreshJobs} />
      <JobDetailsModal visible={!!viewingJob} job={viewingJob} onClose={() => setViewingJob(null)} />
      {interviewTarget && (
        <InterviewModal
          visible={!!interviewTarget}
          onClose={() => setInterviewTarget(null)}
          applicationId={interviewTarget.appId}
          helperName={interviewTarget.helperName}
          jobTitle={interviewTarget.jobTitle}
          scheduledBy={Number(userData?.user_id ?? 0)}
          onScheduled={() => { setInterviewTarget(null); refreshApps(); setNotification({ visible: true, message: 'Interview invite sent!', type: 'success' }); }}
        />
      )}
      <Modal visible={!!viewingDoc} transparent animationType="fade" onRequestClose={() => setViewingDoc(null)}>
        <View style={docViewer.overlay}>
          <SafeAreaView style={docViewer.safeArea}>
            <View style={docViewer.header}>
              <Text style={docViewer.headerTitle} numberOfLines={1}>{viewingDoc?.document_type}</Text>
              <TouchableOpacity style={docViewer.closeBtn} onPress={() => setViewingDoc(null)} activeOpacity={0.8}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={docViewer.imageWrap}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              {viewingDoc && (
                <Image
                  source={{ uri: viewingDoc.file_url }}
                  style={docViewer.image}
                  contentFit="contain"
                />
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

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

  // ────────────────────────────────────────────────────────────────────────
  // Layout
  // ────────────────────────────────────────────────────────────────────────

  if (loadingJobs) return <LoadingSpinner visible message="Loading your work board…" />;

  const refreshAll = () => { refreshJobs(); refreshApps(); };

  const content = (
    <ScrollView
      contentContainerStyle={[w.scroll, isDesktop && w.scrollDesktop]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loadingApps} onRefresh={refreshAll} tintColor={CARAMEL} />}
    >
      {isPending && (
        <View style={w.bannerWrap}>
          <PendingBanner status="Pending" message={verification.message} />
        </View>
      )}

      <View style={w.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={w.headerTitle}>Work Management</Text>
          <Text style={w.headerSub}>Manage your jobs and helper applications</Text>
        </View>
        <TouchableOpacity
          style={[w.postBtn, !verification.canPostJobs && w.postBtnDisabled]}
          onPress={handlePostJob}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Post a new job"
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {renderStatsRow()}
      {renderTabSwitch()}

      {activeTab === 'jobs' ? renderJobsPostedTab() : renderApplicantsTab()}
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <View style={[w.page, { flexDirection: 'row' }]}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        {content}
      </View>
    );
  }

  return (
    <View style={[w.page]}>
      {renderModals()}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={w.bar}>
          <TouchableOpacity style={w.barBtn} onPress={() => setMobileMenu(true)}>
            <Ionicons name="menu" size={26} color={DARK} />
          </TouchableOpacity>
          <Text style={w.barTitle}>Work Management</Text>
          <TouchableOpacity
            style={[w.barBtn, { position: 'relative' }]}
            onPress={() => router.push('/(parent)/notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={24} color={BROWN} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7,
                backgroundColor: CARAMEL, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {content}

        <ParentTabBar />
      </SafeAreaView>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setMobileMenu(false)} handleLogout={initiateLogout} />
    </View>
  );
}

const docViewer = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Fredoka-SemiBold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 0.75,
    borderRadius: 8,
  },
});
