// components/parent/web/ParentJobsWeb.tsx — desktop "Work Management" screen.
// Two tabs (Jobs Posted · Applicants) as split views: a list column + an inline
// detail/profile panel (no detail pop-ups). Post/Edit job + Schedule interview
// reuse the existing form modals; confirms/doc-viewer stay modal. Mirrors the
// mobile logic in app/(parent)/jobs/index.tsx on the pt design system.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useJobApplications, useParentJobs, type JobApplication, type JobPost } from '@/hooks/parent';
import { useParentPortalMode } from '@/hooks/parent';
import { useAuth } from '@/hooks/shared';
import { useUserVerification } from '@/hooks/peso';
import { computeHelperJobMatch, applicationToMatchable } from '@/lib/parentHelperMatch';
import { ConfirmationModal, InterviewModal, NotificationModal, LoadingSpinner } from '@/components/shared';
import { JobPostModal } from '@/components/parent/jobs';
import { JobDetailsModal } from '@/components/parent/jobs/JobDetailsModal';
import { PendingBanner } from '@/components/parent/verification/PendingBanner';
import { ParentTopNav } from './ParentTopNav';
import { pt, ACCENT_GRADIENT } from './parentWebTheme';

const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const initials = (n?: string) => (n || 'H').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const fmtPeriod = (p?: string) => { const l = (p ?? '').toLowerCase(); return l.startsWith('month') ? 'month' : l.startsWith('day') ? 'day' : l.startsWith('week') ? 'week' : (p || 'month'); };
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
function timeAgo(d?: string | null) {
  if (!d) return 'recently';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const m = Math.floor(days / 30); if (m < 12) return `${m} month${m > 1 ? 's' : ''} ago`;
  return `${Math.floor(m / 12)} year(s) ago`;
}

const JOB_STATUS: Record<string, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Open: { bg: pt.greenSoft, text: pt.green, icon: 'radio-button-on' },
  Filled: { bg: pt.accentSoft, text: '#9A6B12', icon: 'checkmark-circle' },
  Closed: { bg: pt.amberSoft, text: pt.amber, icon: 'stop-circle' },
  Expired: { bg: pt.redSoft, text: pt.red, icon: 'time' },
  Pending: { bg: pt.amberSoft, text: pt.amber, icon: 'hourglass' },
  Rejected: { bg: pt.redSoft, text: pt.red, icon: 'close-circle' },
};
const jobStatusCfg = (s: string) => JOB_STATUS[s] ?? { bg: pt.lineSoft, text: pt.muted, icon: 'ellipse' as const };

const APP_STATUS: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  Pending: { color: pt.amber, bg: pt.amberSoft, icon: 'time', label: 'Needs review' },
  Reviewed: { color: pt.blue, bg: pt.blueSoft, icon: 'eye', label: 'Reviewed' },
  Shortlisted: { color: '#7C3AED', bg: '#F3E8FF', icon: 'star', label: 'Shortlisted' },
  'Interview Scheduled': { color: pt.green, bg: pt.greenSoft, icon: 'calendar', label: 'Interview scheduled' },
  Accepted: { color: pt.green, bg: pt.greenSoft, icon: 'checkmark-circle', label: 'Hired' },
  hired: { color: pt.green, bg: pt.greenSoft, icon: 'checkmark-done', label: 'Hired' },
  contract_pending: { color: pt.amber, bg: pt.amberSoft, icon: 'document-text', label: 'Contract pending' },
  Rejected: { color: pt.red, bg: pt.redSoft, icon: 'close-circle', label: 'Rejected' },
  auto_rejected: { color: pt.subtle, bg: pt.lineSoft, icon: 'briefcase', label: 'Closed (other role)' },
  'Pending Termination': { color: pt.amber, bg: pt.amberSoft, icon: 'document-text', label: 'Ending contract' },
  termination_pending: { color: pt.amber, bg: pt.amberSoft, icon: 'document-text', label: 'Ending contract' },
  Withdrawn: { color: pt.subtle, bg: pt.lineSoft, icon: 'arrow-undo', label: 'Withdrawn' },
};
const appStatusCfg = (s: string) => APP_STATUS[s] ?? { color: pt.muted, bg: pt.lineSoft, icon: 'information-circle' as const, label: s };

const STATUS_FILTERS = [
  { key: 'all', label: 'All' }, { key: 'Pending', label: 'Pending' }, { key: 'Reviewed', label: 'Reviewed' },
  { key: 'Shortlisted', label: 'Shortlisted' }, { key: 'Accepted', label: 'Hired' }, { key: 'Rejected', label: 'Rejected' },
];

export function ParentJobsWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; job_id?: string }>();
  const isWorkMode = useParentPortalMode();
  const { userData } = useAuth();
  const { verification } = useUserVerification();
  const isPending = verification.status === 'Pending';

  const { jobs, loading: loadingJobs, refresh: refreshJobs, stats: jobStats } = useParentJobs();
  const { applications: allApplications, loading: loadingApps, error: appsError, refresh: refreshApps, updateApplicationStatus } = useJobApplications('');

  const [activeTab, setActiveTab] = useState<'jobs' | 'applicants'>('jobs');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedApplicantId, setSelectedApplicantId] = useState('');
  const [profileTab, setProfileTab] = useState<'overview' | 'skills' | 'documents'>('overview');
  const [applicantsScope, setApplicantsScope] = useState<'job' | 'all'>('job');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals / overlays
  const [editingJob, setEditingJob] = useState<JobPost | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<JobPost | null>(null);
  const [deleteModal, setDeleteModal] = useState({ visible: false, jobId: '', jobTitle: '' });
  const [notif, setNotif] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });
  const [sharedDocs, setSharedDocs] = useState<{ document_id: number; document_type: string; status: string; file_url?: string }[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ file_url: string; document_type: string } | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ visible: boolean; appId: string; action: 'Shortlisted' | 'Rejected' | null }>({ visible: false, appId: '', action: null });
  const [interviewTarget, setInterviewTarget] = useState<{ appId: number; helperName: string; jobTitle: string } | null>(null);

  useEffect(() => { if (!selectedJobId && jobs.length > 0) setSelectedJobId(jobs[0].job_post_id); }, [jobs, selectedJobId]);

  // Deep-link params (tab, job_id)
  useEffect(() => {
    if (jobs.length === 0) return;
    if (params.job_id) { const j = jobs.find((x) => String(x.job_post_id) === String(params.job_id)); if (j) setSelectedJobId(String(j.job_post_id)); }
    if (params.tab === 'applicants') { setActiveTab('applicants'); setApplicantsScope(params.job_id ? 'job' : 'all'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tab, params.job_id, jobs.length]);

  useEffect(() => { if (appsError) setNotif({ visible: true, msg: appsError, type: 'error' }); }, [appsError]);

  const selectedJob = useMemo(() => jobs.find((j) => j.job_post_id === selectedJobId) ?? null, [jobs, selectedJobId]);
  const jobApplications = useMemo(() => allApplications.filter((a) => String(a.job_post_id) === String(selectedJobId)), [allApplications, selectedJobId]);

  const matchForApp = (app: JobApplication) => computeHelperJobMatch(applicationToMatchable(app), jobs.find((x) => String(x.job_post_id) === String(app.job_post_id)) ?? null);

  const scopedApplications = applicantsScope === 'all' ? allApplications : jobApplications;
  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return scopedApplications;
    if (statusFilter === 'Rejected') return scopedApplications.filter((a) => a.status === 'Rejected' || a.status === 'auto_rejected');
    if (statusFilter === 'Accepted') return scopedApplications.filter((a) => a.status === 'Accepted' || a.status === 'hired');
    return scopedApplications.filter((a) => a.status === statusFilter);
  }, [scopedApplications, statusFilter]);

  const recentApplicants = useMemo(
    () => [...jobApplications].map((a) => ({ app: a, match: matchForApp(a) })).sort((a, b) => b.match.score - a.match.score).slice(0, 3),
    [jobApplications, jobs],
  );

  const selectedApplicant = useMemo(() => scopedApplications.find((a) => a.application_id === selectedApplicantId) ?? null, [scopedApplications, selectedApplicantId]);

  // Lazy-load shared docs for the Documents tab
  useEffect(() => {
    if (profileTab !== 'documents' || !selectedApplicant) return;
    let cancelled = false;
    (async () => {
      try {
        setDocsLoading(true);
        const res = await fetch(`${API_URL}/parent/get_applicant_profile.php?application_id=${selectedApplicant.application_id}&helper_id=${selectedApplicant.helper_id}&requester_id=${userData?.user_id ?? ''}`);
        const data = await res.json();
        if (!cancelled) setSharedDocs(data.success ? (data.shared_documents ?? []) : []);
      } catch { if (!cancelled) setSharedDocs([]); } finally { if (!cancelled) setDocsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [profileTab, selectedApplicant?.application_id]);

  const statTiles = useMemo(() => {
    const totalApps = allApplications.length;
    const newApps = jobs.reduce((s, j) => s + (j.new_application_count || 0), 0);
    const shortlisted = allApplications.filter((a) => a.status === 'Shortlisted').length;
    const hired = allApplications.filter((a) => a.status === 'hired' || a.status === 'Accepted').length;
    return [
      { icon: 'briefcase' as const, value: jobStats.open, label: 'Active Jobs', sub: `${jobStats.open} open` },
      { icon: 'people' as const, value: totalApps, label: 'Applications', sub: `${newApps} new` },
      { icon: 'star' as const, value: shortlisted, label: 'Shortlisted', sub: `${shortlisted} total` },
      { icon: 'checkmark-circle' as const, value: hired, label: 'Hired', sub: `${hired} hired` },
    ];
  }, [allApplications, jobs, jobStats]);

  // Handlers
  const handlePostJob = () => {
    if (!verification.canPostJobs) { setNotif({ visible: true, msg: 'You need to be verified to post jobs.', type: 'error' }); return; }
    setEditingJob(null); setPostOpen(true);
  };
  const handleEditJob = (job: JobPost) => { setEditingJob(job); setPostOpen(true); };
  const confirmDelete = async () => {
    try {
      setDeleteModal((p) => ({ ...p, visible: false }));
      const raw = await AsyncStorage.getItem('user_data'); if (!raw) return;
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/parent/delete_job.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_post_id: deleteModal.jobId, parent_id: user.user_id }) });
      const data = await res.json();
      if (data.success) { setNotif({ visible: true, msg: 'Job deleted.', type: 'success' }); refreshJobs(); } else throw new Error(data.message);
    } catch (e: any) { setNotif({ visible: true, msg: e.message || 'Failed to delete job.', type: 'error' }); }
  };
  const selectApplicant = (app: JobApplication) => { setSelectedApplicantId(app.application_id); setProfileTab('overview'); };
  const viewApplicantFromJob = (app: JobApplication) => { setSelectedJobId(app.job_post_id); setApplicantsScope('job'); setStatusFilter('all'); setActiveTab('applicants'); selectApplicant(app); };
  const goToApplicants = (jobId: string) => { setSelectedJobId(jobId); setApplicantsScope('job'); setStatusFilter('all'); setActiveTab('applicants'); };
  const executeStatusUpdate = async () => {
    if (!statusConfirm.action || !statusConfirm.appId) return;
    const action = statusConfirm.action; const appId = statusConfirm.appId;
    setStatusConfirm({ visible: false, appId: '', action: null });
    try {
      const result = await updateApplicationStatus(appId, action);
      if (result.success) setNotif({ visible: true, msg: `Application ${action.toLowerCase()} successfully!`, type: 'success' });
    } catch (err: any) { setNotif({ visible: true, msg: err.message || 'Failed to update status', type: 'error' }); }
  };
  const messageApplicant = (app: JobApplication) => router.push({ pathname: '/(parent)/messages', params: { partner_id: String(app.helper_id), partner_name: encodeURIComponent(app.helper_name ?? ''), job_post_id: String(app.job_post_id ?? '') } } as any);

  if (loadingJobs) return <LoadingSpinner visible message="Loading your work board…" />;

  return (
    <View style={s.root}>
      <ParentTopNav active={activeTab === 'applicants' ? 'applications' : 'jobs'} mode={isWorkMode ? 'work' : 'recruitment'} userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.inner}>
          {isPending && <View style={{ marginBottom: 16 }}><PendingBanner status="Pending" message={verification.message} /></View>}

          {/* Header */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.pageTitle}>Work Management</Text>
              <Text style={s.pageSub}>Manage your job posts and review helper applications.</Text>
            </View>
            <Pressable onPress={handlePostJob} style={({ hovered, pressed }: any) => [TRANS, !verification.canPostJobs && { opacity: 0.5 }, hovered && verification.canPostJobs && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.postBtn}>
                <Ionicons name="add" size={19} color="#fff" /><Text style={s.postBtnText}>Post a Job</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Stat strip */}
          <View style={s.stats}>
            {statTiles.map((t) => (
              <View key={t.label} style={s.statTile}>
                <View style={s.statIc}><Ionicons name={t.icon} size={16} color={pt.accent} /></View>
                <Text style={s.statValue}>{t.value}</Text>
                <Text style={s.statLabel}>{t.label}</Text>
                <Text style={s.statSub}>{t.sub}</Text>
              </View>
            ))}
          </View>

          {/* Tab switch */}
          <View style={s.tabSwitch}>
            <Pressable onPress={() => setActiveTab('jobs')} style={[s.tabBtn, activeTab === 'jobs' && s.tabBtnOn]}>
              <Text style={[s.tabBtnText, activeTab === 'jobs' && s.tabBtnTextOn]}>Jobs Posted</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('applicants')} style={[s.tabBtn, activeTab === 'applicants' && s.tabBtnOn]}>
              <Text style={[s.tabBtnText, activeTab === 'applicants' && s.tabBtnTextOn]}>Applicants</Text>
            </Pressable>
          </View>

          {jobs.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIc}><Ionicons name="briefcase-outline" size={36} color={pt.accent} /></View>
              <Text style={s.emptyTitle}>No jobs posted yet</Text>
              <Text style={s.emptySub}>Start by posting your first job and let qualified helpers apply.</Text>
              {verification.canPostJobs && (
                <Pressable onPress={handlePostJob} style={({ hovered }: any) => [s.emptyBtn, TRANS, hovered && { transform: [{ translateY: -2 }] }]}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" /><Text style={s.emptyBtnText}>Post Your First Job</Text>
                </Pressable>
              )}
            </View>
          ) : activeTab === 'jobs' ? (
            <View style={s.splitRow}>
              {/* Job list */}
              <View style={s.listCol}>
                <View style={s.listHead}><Text style={s.listTitle}>Job Posts</Text><View style={s.countPill}><Text style={s.countPillText}>{jobs.length}</Text></View></View>
                {jobs.map((job) => {
                  const cfg = jobStatusCfg(job.status); const on = job.job_post_id === selectedJobId;
                  return (
                    <Pressable key={job.job_post_id} onPress={() => setSelectedJobId(job.job_post_id)} style={({ hovered }: any) => [s.jobItem, on && s.jobItemOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                      <View style={s.jobThumb}><Ionicons name="briefcase" size={18} color={pt.accent} /></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.jobItemTitle} numberOfLines={1}>{job.title}</Text>
                        <View style={s.jobItemMeta}>
                          <View style={[s.statusPill, { backgroundColor: cfg.bg }]}><Ionicons name={cfg.icon} size={10} color={cfg.text} /><Text style={[s.statusPillText, { color: cfg.text }]}>{job.status}</Text></View>
                          <Text style={s.jobItemSalary}>₱{Number(job.salary_offered).toLocaleString()}/{fmtPeriod(job.salary_period).slice(0, 2)}</Text>
                        </View>
                        <Text style={s.jobItemApps}>{job.application_count} applicant{job.application_count !== 1 ? 's' : ''}{job.new_application_count > 0 ? ` · ${job.new_application_count} new` : ''}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {/* Job detail */}
              <View style={s.detailCol}>
                <JobDetailPanel job={selectedJob} apps={jobApplications} recent={recentApplicants}
                  onEdit={handleEditJob} onDelete={(j) => setDeleteModal({ visible: true, jobId: j.job_post_id, jobTitle: j.title })}
                  onViewDetails={(j) => setViewingJob(j)} onViewApplicants={goToApplicants} onViewApplicant={viewApplicantFromJob} />
              </View>
            </View>
          ) : (
            <View>
              {/* Filter bar */}
              <View style={s.filterBar}>
                <View style={s.scopeRow}>
                  <Pressable onPress={() => setApplicantsScope('job')} style={[s.scopeChip, applicantsScope === 'job' && s.scopeChipOn]}>
                    <Ionicons name="briefcase-outline" size={13} color={applicantsScope === 'job' ? '#fff' : pt.muted} /><Text style={[s.scopeChipText, applicantsScope === 'job' && { color: '#fff' }]}>This Job</Text>
                  </Pressable>
                  <Pressable onPress={() => setApplicantsScope('all')} style={[s.scopeChip, applicantsScope === 'all' && s.scopeChipOn]}>
                    <Ionicons name="layers-outline" size={13} color={applicantsScope === 'all' ? '#fff' : pt.muted} /><Text style={[s.scopeChipText, applicantsScope === 'all' && { color: '#fff' }]}>All Jobs</Text>
                  </Pressable>
                </View>
                {applicantsScope === 'job' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {jobs.map((j) => { const on = j.job_post_id === selectedJobId; return (
                      <Pressable key={j.job_post_id} onPress={() => setSelectedJobId(j.job_post_id)} style={[s.jobPickChip, on && s.jobPickChipOn]}>
                        <Text style={[s.jobPickChipText, on && { color: '#fff' }]} numberOfLines={1}>{j.title}</Text>
                      </Pressable>
                    ); })}
                  </ScrollView>
                )}
                <View style={s.statusRow}>
                  {STATUS_FILTERS.map((f) => { const on = statusFilter === f.key; return (
                    <Pressable key={f.key} onPress={() => setStatusFilter(f.key)} style={[s.filterChip, on && s.filterChipOn]}>
                      <Text style={[s.filterChipText, on && { color: '#fff' }]}>{f.label}</Text>
                    </Pressable>
                  ); })}
                </View>
              </View>

              <View style={s.splitRow}>
                {/* Applicant list */}
                <View style={s.listCol}>
                  {loadingApps && filteredApplications.length === 0 ? (
                    <ActivityIndicator color={pt.accent} style={{ marginTop: 30 }} />
                  ) : filteredApplications.length === 0 ? (
                    <View style={s.empty}>
                      <View style={s.emptyIc}><Ionicons name="folder-open-outline" size={32} color={pt.accent} /></View>
                      <Text style={s.emptyTitle}>No applicants found</Text>
                      <Text style={s.emptySub}>{statusFilter !== 'all' ? 'Try a different status filter.' : 'No one has applied yet.'}</Text>
                    </View>
                  ) : (
                    filteredApplications.map((app) => (
                      <ApplicantCard key={app.application_id} app={app} match={matchForApp(app).score} active={app.application_id === selectedApplicantId} onPress={() => selectApplicant(app)} />
                    ))
                  )}
                </View>
                {/* Applicant profile */}
                <View style={s.detailCol}>
                  <ApplicantPanel app={selectedApplicant} match={selectedApplicant ? matchForApp(selectedApplicant) : null}
                    profileTab={profileTab} onTab={setProfileTab} sharedDocs={sharedDocs} docsLoading={docsLoading}
                    onViewDoc={(d) => setViewingDoc(d)} onMessage={messageApplicant}
                    onReject={(a) => setStatusConfirm({ visible: true, appId: a.application_id, action: 'Rejected' })}
                    onShortlist={(a) => setStatusConfirm({ visible: true, appId: a.application_id, action: 'Shortlisted' })}
                    onSchedule={(a) => { const job = jobs.find((j) => String(j.job_post_id) === String(a.job_post_id)); setInterviewTarget({ appId: Number(a.application_id), helperName: a.helper_name, jobTitle: job?.title ?? 'this position' }); }}
                    onManage={(a) => router.push({ pathname: '/(parent)/hire/placement_tasks', params: { application_id: String(a.application_id), helper_name: encodeURIComponent(a.helper_name ?? 'Helper') } } as any)} />
                </View>
              </View>
            </View>
          )}
          <View style={{ height: 30 }} />
        </View>
      </ScrollView>

      {/* Modals */}
      <NotificationModal visible={notif.visible} message={notif.msg} type={notif.type} onClose={() => setNotif((p) => ({ ...p, visible: false }))} autoClose duration={1500} />
      <ConfirmationModal visible={deleteModal.visible} title="Delete Job?" message={`Delete "${deleteModal.jobTitle}"? This cannot be undone.`} confirmText="Delete" cancelText="Cancel" type="danger" onConfirm={confirmDelete} onCancel={() => setDeleteModal((p) => ({ ...p, visible: false }))} />
      <JobPostModal visible={postOpen} onClose={() => setPostOpen(false)} existingJobData={editingJob} onSaveSuccess={refreshJobs} />
      <JobDetailsModal visible={!!viewingJob} job={viewingJob} onClose={() => setViewingJob(null)} />
      {interviewTarget && (
        <InterviewModal visible={!!interviewTarget} onClose={() => setInterviewTarget(null)} applicationId={interviewTarget.appId} helperName={interviewTarget.helperName} jobTitle={interviewTarget.jobTitle} scheduledBy={Number(userData?.user_id ?? 0)}
          onScheduled={() => { setInterviewTarget(null); refreshApps(); setNotif({ visible: true, msg: 'Interview invite sent!', type: 'success' }); }} />
      )}
      <ConfirmationModal visible={statusConfirm.visible} title={statusConfirm.action === 'Shortlisted' ? 'Shortlist Applicant?' : 'Reject Applicant?'}
        message={statusConfirm.action === 'Shortlisted' ? 'Shortlist this applicant? They will be notified.' : 'Reject this applicant? This cannot be undone.'}
        confirmText={statusConfirm.action === 'Shortlisted' ? 'Yes, Shortlist' : 'Yes, Reject'} cancelText="Cancel" type={statusConfirm.action === 'Shortlisted' ? 'success' : 'danger'}
        onConfirm={executeStatusUpdate} onCancel={() => setStatusConfirm({ visible: false, appId: '', action: null })} />
      <Modal visible={!!viewingDoc} transparent animationType="fade" onRequestClose={() => setViewingDoc(null)}>
        <View style={s.docOverlay}>
          <View style={s.docHeader}>
            <Text style={s.docHeaderTitle} numberOfLines={1}>{viewingDoc?.document_type}</Text>
            <Pressable onPress={() => setViewingDoc(null)} style={s.docClose}><Ionicons name="close" size={22} color="#fff" /></Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.docImgWrap} maximumZoomScale={4} minimumZoomScale={1}>
            {viewingDoc && <Image source={{ uri: viewingDoc.file_url }} style={s.docImg} resizeMode="contain" />}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Job detail panel ───
function JobDetailPanel({ job, apps, recent, onEdit, onDelete, onViewDetails, onViewApplicants, onViewApplicant }: {
  job: JobPost | null; apps: JobApplication[]; recent: { app: JobApplication; match: any }[];
  onEdit: (j: JobPost) => void; onDelete: (j: JobPost) => void; onViewDetails: (j: JobPost) => void; onViewApplicants: (id: string) => void; onViewApplicant: (a: JobApplication) => void;
}) {
  if (!job) {
    return (
      <View style={s.detailCard}>
        <View style={s.panelEmpty}>
          <View style={s.panelEmptyIc}><Ionicons name="briefcase-outline" size={30} color={pt.accent} /></View>
          <Text style={s.panelEmptyTitle}>Select a job to see details</Text>
          <Text style={s.panelEmptySub}>Choose a job post from the list to view its details, edit it, or review applicants.</Text>
        </View>
      </View>
    );
  }
  const cfg = jobStatusCfg(job.status);
  const location = [job.barangay, job.municipality, job.province].filter(Boolean).join(', ') || 'Location not set';
  const newCount = apps.filter((a) => a.status === 'Pending').length;
  const shortCount = apps.filter((a) => a.status === 'Shortlisted').length;
  const hiredCount = apps.filter((a) => a.status === 'hired' || a.status === 'Accepted').length;

  return (
    <View style={s.detailCard}>
      <View style={s.dTop}>
        <View style={s.dThumb}><Ionicons name="briefcase" size={28} color={pt.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.dTitle} numberOfLines={2}>{job.title}</Text>
          <View style={s.dMetaRow}>
            <View style={[s.statusPill, { backgroundColor: cfg.bg }]}><Ionicons name={cfg.icon} size={10} color={cfg.text} /><Text style={[s.statusPillText, { color: cfg.text }]}>{job.status}</Text></View>
            <Text style={s.dMetaText}>Posted {fmtDate(job.posted_at)}</Text>
          </View>
          <View style={s.dMetaRow}><Ionicons name="location-outline" size={13} color={pt.muted} /><Text style={s.dMetaText} numberOfLines={1}>{location}</Text></View>
          <Text style={s.dSalary}>₱{Number(job.salary_offered).toLocaleString()} / {fmtPeriod(job.salary_period)}</Text>
        </View>
      </View>

      <View style={s.miniGrid}>
        <MiniStat value={apps.length} label="Total" />
        <MiniStat value={newCount} label="New" color={pt.caramel} />
        <MiniStat value={shortCount} label="Shortlisted" color="#7C3AED" />
        <MiniStat value={hiredCount} label="Hired" color={pt.green} />
      </View>

      <View style={s.dActions}>
        <Pressable onPress={() => onEdit(job)} style={({ hovered }: any) => [s.outlineBtn, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.lineSoft }]}>
          <Ionicons name="pencil-outline" size={15} color={pt.ink} /><Text style={s.outlineBtnText}>Edit</Text>
        </Pressable>
        <Pressable onPress={() => onDelete(job)} style={({ hovered }: any) => [s.outlineBtn, TRANS, hovered && { borderColor: pt.red, backgroundColor: pt.redSoft }]}>
          <Ionicons name="trash-outline" size={15} color={pt.red} /><Text style={[s.outlineBtnText, { color: pt.red }]}>Delete</Text>
        </Pressable>
        <Pressable onPress={() => onViewApplicants(job.job_post_id)} style={({ hovered, pressed }: any) => [{ flex: 1.4 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
          <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.primaryBtn}>
            <Ionicons name="people-outline" size={15} color="#fff" /><Text style={s.primaryBtnText}>View Applicants</Text>
          </LinearGradient>
        </Pressable>
      </View>
      <Pressable onPress={() => onViewDetails(job)} style={({ hovered }: any) => [s.viewDetailsLink, TRANS, hovered && { opacity: 0.7 }]}>
        <Ionicons name="document-text-outline" size={14} color={pt.accent} /><Text style={s.viewDetailsText}>View Full Job Details</Text>
      </Pressable>

      <View style={s.divider} />

      <View style={s.recentHead}><Text style={s.recentTitle}>Recent Applicants</Text>{newCount > 0 && <View style={s.newPill}><Text style={s.newPillText}>{newCount} New</Text></View>}</View>
      {recent.length === 0 ? (
        <Text style={s.recentEmpty}>No applicants yet for this job post.</Text>
      ) : recent.map(({ app, match }, idx) => (
        <Pressable key={app.application_id} onPress={() => onViewApplicant(app)} style={({ hovered }: any) => [s.recentRow, TRANS, hovered && { borderColor: pt.accent, backgroundColor: '#FFFCF6' }]}>
          {app.helper_photo ? <Image source={{ uri: app.helper_photo }} style={s.recentAva} /> : <View style={[s.recentAva, s.avaFb]}><Text style={s.avaText}>{initials(app.helper_name)}</Text></View>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.recentName} numberOfLines={1}>{app.helper_name}</Text>
            <Text style={s.recentMeta} numberOfLines={1}>{app.helper_age ? `${app.helper_age} yrs` : 'Age N/A'}{app.helper_experience_years ? ` · ${app.helper_experience_years}y exp` : ''}</Text>
          </View>
          <View style={[s.matchPill, idx === 0 && { backgroundColor: pt.accent }]}>{idx === 0 && <Ionicons name="star" size={10} color="#fff" />}<Text style={[s.matchPillText, idx === 0 && { color: '#fff' }]}>{match.score}%</Text></View>
        </Pressable>
      ))}
      {apps.length > 3 && <Pressable onPress={() => onViewApplicants(job.job_post_id)}><Text style={s.viewAllLink}>View all {apps.length} applicants →</Text></Pressable>}
    </View>
  );
}
function MiniStat({ value, label, color }: { value: number; label: string; color?: string }) {
  return <View style={s.miniStat}><Text style={[s.miniStatValue, color && { color }]}>{value}</Text><Text style={s.miniStatLabel}>{label}</Text></View>;
}

// ─── Applicant list card ───
function ApplicantCard({ app, match, active, onPress }: { app: JobApplication; match: number; active: boolean; onPress: () => void }) {
  const role = app.helper_jobs?.[0] || app.helper_categories?.[0] || app.category_name || 'Helper';
  const stage = appStatusCfg(app.status);
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.appCard, active && s.appCardOn, TRANS, hovered && !active && { borderColor: pt.accent }]}>
      <View style={s.appTop}>
        {app.helper_photo ? <Image source={{ uri: app.helper_photo }} style={s.appAva} /> : <View style={[s.appAva, s.avaFb]}><Text style={s.avaText}>{initials(app.helper_name)}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.appName} numberOfLines={1}>{app.helper_name}</Text>
          <Text style={s.appApplied}>Applied {timeAgo(app.applied_at)}</Text>
        </View>
        <View style={s.matchPill}><Text style={s.matchPillText}>{match}%</Text></View>
      </View>
      <View style={[s.stageChip, { backgroundColor: stage.bg }]}><Ionicons name={stage.icon} size={11} color={stage.color} /><Text style={[s.stageChipText, { color: stage.color }]}>{stage.label}</Text></View>
      <View style={s.appMid}>
        <Ionicons name="star" size={13} color={pt.amber} /><Text style={s.appRating}>{app.helper_rating_average ? Number(app.helper_rating_average).toFixed(1) : 'New'}{app.helper_rating_count ? ` (${app.helper_rating_count})` : ''}</Text>
        <View style={s.appDot} /><Text style={s.appRole} numberOfLines={1}>{role}{app.helper_experience_years ? ` · ${app.helper_experience_years}y exp` : ''}</Text>
      </View>
      {app.verification_status === 'Verified' && <View style={s.verPill}><Ionicons name="shield-checkmark" size={11} color={pt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>}
    </Pressable>
  );
}

// ─── Applicant profile panel ───
function ApplicantPanel({ app, match, profileTab, onTab, sharedDocs, docsLoading, onViewDoc, onMessage, onReject, onShortlist, onSchedule, onManage }: {
  app: JobApplication | null; match: any; profileTab: 'overview' | 'skills' | 'documents'; onTab: (t: 'overview' | 'skills' | 'documents') => void;
  sharedDocs: any[]; docsLoading: boolean; onViewDoc: (d: { file_url: string; document_type: string }) => void;
  onMessage: (a: JobApplication) => void; onReject: (a: JobApplication) => void; onShortlist: (a: JobApplication) => void; onSchedule: (a: JobApplication) => void; onManage: (a: JobApplication) => void;
}) {
  if (!app) {
    return (
      <View style={s.detailCard}>
        <View style={s.panelEmpty}>
          <View style={s.panelEmptyIc}><Ionicons name="person-outline" size={30} color={pt.accent} /></View>
          <Text style={s.panelEmptyTitle}>Select an applicant</Text>
          <Text style={s.panelEmptySub}>Tap an applicant to see their full profile, match details, and background — right here.</Text>
        </View>
      </View>
    );
  }
  const a = app as any;
  const location = [a.helper_barangay, a.helper_municipality, a.helper_province].filter(Boolean).join(', ') || 'Not specified';
  const salaryLabel = a.helper_expected_salary ? `₱${Number(a.helper_expected_salary).toLocaleString()} / ${fmtPeriod(a.helper_salary_period)}` : 'Not specified';
  const canDecide = ['Pending', 'Reviewed'].includes(app.status);
  const canSchedule = ['Shortlisted', 'Interview Scheduled'].includes(app.status);
  const isHired = ['hired', 'Accepted'].includes(app.status);

  return (
    <View style={s.detailCard}>
      {/* Hero */}
      <View style={s.pHero}>
        {a.helper_photo ? <Image source={{ uri: a.helper_photo }} style={s.pAva} /> : <View style={[s.pAva, s.avaFb]}><Text style={[s.avaText, { fontSize: 26 }]}>{initials(a.helper_name)}</Text></View>}
        <Text style={s.pName}>{a.helper_name}</Text>
        <View style={s.pBadges}>
          {a.verification_status === 'Verified' && <View style={s.verPill}><Ionicons name="shield-checkmark" size={12} color={pt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>}
          {a.availability_status === 'Available' && <View style={s.availPill}><Ionicons name="briefcase" size={12} color={pt.blue} /><Text style={s.availPillText}>Available to Work</Text></View>}
          {match && <View style={s.matchPillBig}><Ionicons name="analytics" size={12} color={pt.accent} /><Text style={s.matchPillBigText}>{match.score}% match</Text></View>}
        </View>
      </View>

      {/* Info tiles */}
      <View style={s.tiles}>
        <Tile icon="person-outline" value={a.helper_age ? `${a.helper_age}` : '—'} label="Age" />
        <View style={s.tileDiv} /><Tile icon="male-female-outline" value={a.helper_gender || '—'} label="Gender" />
        <View style={s.tileDiv} /><Tile icon="briefcase-outline" value={a.helper_experience_years ? `${a.helper_experience_years}y` : 'New'} label="Exp" />
        <View style={s.tileDiv} /><Tile icon="location-outline" value={a.helper_municipality || '—'} label="Location" />
      </View>

      {/* Tabs */}
      <View style={s.fpTabs}>
        {(['overview', 'skills', 'documents'] as const).map((t) => (
          <Pressable key={t} onPress={() => onTab(t)} style={s.fpTab}>
            <Text style={[s.fpTabText, profileTab === t && { color: pt.accent }]}>{t === 'overview' ? 'Overview' : t === 'skills' ? 'Skills' : 'Documents'}</Text>
            {profileTab === t && <View style={s.fpTabUnderline} />}
          </Pressable>
        ))}
      </View>

      {profileTab === 'overview' ? (
        <View style={{ gap: 16, marginTop: 16 }}>
          {match && match.reasons.length > 0 && (
            <View><Text style={s.secTitle}>Why this match</Text>
              <View style={s.matchBox}>{match.reasons.slice(0, 3).map((r: string, i: number) => <View key={i} style={s.reasonRow}><Ionicons name="checkmark-circle" size={14} color={pt.green} /><Text style={s.reasonText}>{r}</Text></View>)}</View>
            </View>
          )}
          {!!a.helper_bio && <View><Text style={s.secTitle}>About Me</Text><Text style={s.body}>{a.helper_bio}</Text></View>}
          <View><Text style={s.secTitle}>Work Preference</Text>
            <View style={s.detailsCard}>
              <DetailRow label="Preferred Role" value={a.helper_jobs?.[0] || a.helper_categories?.[0] || 'Not specified'} />
              <DetailRow label="Preferred Job Type" value={a.helper_employment_type || 'Any'} />
              <DetailRow label="Expected Salary" value={salaryLabel} />
              <DetailRow label="Availability" value={a.helper_work_schedule || 'Any'} last />
            </View>
          </View>
          <View><Text style={s.secTitle}>Background</Text>
            <View style={s.detailsCard}>
              <DetailRow label="Civil Status" value={a.helper_civil_status || 'Not specified'} />
              <DetailRow label="Religion" value={a.helper_religion || 'Not specified'} />
              <DetailRow label="Location" value={location} last />
            </View>
          </View>
          {!!app.cover_letter && <View><Text style={s.secTitle}>Cover Letter</Text><View style={s.quoteBox}><Text style={s.body}>"{app.cover_letter}"</Text></View></View>}
        </View>
      ) : profileTab === 'skills' ? (
        <View style={{ gap: 16, marginTop: 16 }}>
          {a.helper_categories?.length > 0 && <View><Text style={s.secTitle}>Categories</Text><View style={s.chipsWrap}>{a.helper_categories.map((c: string, i: number) => <View key={i} style={[s.chip, s.chipBlue]}><Text style={[s.chipText, { color: pt.blue }]}>{c}</Text></View>)}</View></View>}
          {a.helper_jobs?.length > 0 && <View><Text style={s.secTitle}>Specific Roles</Text><View style={s.chipsWrap}>{a.helper_jobs.map((j: string, i: number) => <View key={i} style={[s.chip, s.chipGreen]}><Text style={[s.chipText, { color: pt.green }]}>{j}</Text></View>)}</View></View>}
          {a.helper_skills?.length > 0 && <View><Text style={s.secTitle}>Skills &amp; Abilities</Text><View style={s.chipsWrap}>{a.helper_skills.map((sk: string, i: number) => <View key={i} style={s.chip}><Text style={s.chipText}>{sk}</Text></View>)}</View></View>}
          {!a.helper_categories?.length && !a.helper_jobs?.length && !a.helper_skills?.length && <Text style={s.recentEmpty}>No skills or roles listed yet.</Text>}
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          {docsLoading ? <ActivityIndicator size="small" color={pt.accent} style={{ marginVertical: 24 }} />
            : sharedDocs.length === 0 ? <Text style={s.recentEmpty}>No documents have been shared for this application yet.</Text>
            : sharedDocs.map((doc) => (
              <Pressable key={doc.document_id} onPress={() => doc.file_url && onViewDoc({ file_url: doc.file_url, document_type: doc.document_type })} disabled={!doc.file_url}
                style={({ hovered }: any) => [s.docRow, TRANS, hovered && doc.file_url && { borderColor: pt.accent }]}>
                <View style={s.docIc}><Ionicons name="document-text-outline" size={18} color={pt.accent} /></View>
                <View style={{ flex: 1, minWidth: 0 }}><Text style={s.docTitle} numberOfLines={1}>{doc.document_type}</Text><Text style={s.docStatus}>{doc.status}</Text></View>
                <Ionicons name="eye-outline" size={18} color={pt.muted} />
              </Pressable>
            ))}
        </View>
      )}

      {/* Actions */}
      <Text style={s.stageLabel}>
        {canDecide ? "Awaiting your decision — shortlist to move them forward, or reject if they're not a fit."
          : canSchedule ? "Shortlisted — schedule an interview when you're ready."
          : isHired ? 'Hired — manage their tasks and placement.'
          : `Status: ${app.status} — no action needed at this stage.`}
      </Text>
      <View style={s.pActions}>
        <Pressable onPress={() => onMessage(app)} style={({ hovered }: any) => [s.pActionOutline, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.lineSoft }]}>
          <Ionicons name="chatbubble-outline" size={16} color={pt.ink} /><Text style={s.pActionOutlineText}>Message</Text>
        </Pressable>
        {canDecide && (
          <>
            <Pressable onPress={() => onReject(app)} style={({ hovered }: any) => [s.pActionOutline, TRANS, hovered && { borderColor: pt.red, backgroundColor: pt.redSoft }]}>
              <Ionicons name="close-outline" size={16} color={pt.red} /><Text style={[s.pActionOutlineText, { color: pt.red }]}>Reject</Text>
            </Pressable>
            <Pressable onPress={() => onShortlist(app)} style={({ hovered, pressed }: any) => [{ flex: 1 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pActionPrimary}><Ionicons name="star" size={16} color="#fff" /><Text style={s.pActionPrimaryText}>Shortlist</Text></LinearGradient>
            </Pressable>
          </>
        )}
        {canSchedule && (
          <Pressable onPress={() => onSchedule(app)} style={({ hovered, pressed }: any) => [{ flex: 1.4 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pActionPrimary}><Ionicons name="calendar-outline" size={16} color="#fff" /><Text style={s.pActionPrimaryText}>Schedule Interview</Text></LinearGradient>
          </Pressable>
        )}
        {isHired && (
          <Pressable onPress={() => onManage(app)} style={({ hovered, pressed }: any) => [{ flex: 1.4 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pActionPrimary}><Ionicons name="checkbox-outline" size={16} color="#fff" /><Text style={s.pActionPrimaryText}>Manage Placement</Text></LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}
function Tile({ icon, value, label }: { icon: any; value: string; label: string }) {
  return <View style={s.tile}><Ionicons name={icon} size={16} color={pt.muted} /><Text style={s.tileValue} numberOfLines={1}>{value}</Text><Text style={s.tileLabel}>{label}</Text></View>;
}
function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[s.drRow, !last && s.drBorder]}><Text style={s.drLabel}>{label}</Text><Text style={s.drValue} numberOfLines={2}>{value}</Text></View>;
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: pt.canvas },
  scroll: { paddingBottom: 10 },
  inner: { maxWidth: 1400, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 22 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: pt.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.muted, marginTop: 2 },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  postBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: '#fff' },

  stats: { flexDirection: 'row', gap: 14, marginBottom: 18, flexWrap: 'wrap' },
  statTile: { flex: 1, minWidth: 150, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 16, ...shadowSm },
  statIc: { width: 34, height: 34, borderRadius: 10, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: pt.ink, letterSpacing: -0.5 },
  statLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink, marginTop: 2 },
  statSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 1 },

  tabSwitch: { flexDirection: 'row', backgroundColor: pt.lineSoft, borderRadius: 12, padding: 4, alignSelf: 'flex-start', marginBottom: 18 },
  tabBtn: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 9 },
  tabBtnOn: { backgroundColor: pt.surface, ...shadowSm },
  tabBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.muted },
  tabBtnTextOn: { color: pt.ink },

  splitRow: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  listCol: { width: 340, flexGrow: 0, flexShrink: 0, gap: 12 },
  detailCol: { flex: 1, minWidth: 0 },

  listHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  listTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: pt.ink },
  countPill: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  countPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#9A6B12' },

  jobItem: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 14, padding: 12, cursor: 'pointer' as any },
  jobItemOn: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  jobThumb: { width: 40, height: 40, borderRadius: 11, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  jobItemTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink },
  jobItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  jobItemSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: pt.muted },
  jobItemApps: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.subtle, marginTop: 3 },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5 },

  detailCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 20, ...shadowSm },
  panelEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  panelEmptyIc: { width: 60, height: 60, borderRadius: 18, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  panelEmptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: pt.ink },
  panelEmptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  dTop: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  dThumb: { width: 60, height: 60, borderRadius: 15, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: pt.ink, letterSpacing: -0.3 },
  dMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  dMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted },
  dSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: pt.accent, marginTop: 8 },

  miniGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  miniStat: { flex: 1, backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  miniStatValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: pt.ink },
  miniStatLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 2 },

  dActions: { flexDirection: 'row', gap: 10 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: pt.line },
  outlineBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12 },
  primaryBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: '#fff' },
  viewDetailsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
  viewDetailsText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },

  divider: { height: 1, backgroundColor: pt.line, marginVertical: 16 },
  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  recentTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: pt.ink },
  newPill: { backgroundColor: pt.caramelSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  newPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: pt.caramel },
  recentEmpty: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted, paddingVertical: 10 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 13, padding: 11, marginBottom: 10 },
  recentAva: { width: 42, height: 42, borderRadius: 21 },
  recentName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  recentMeta: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 2 },
  viewAllLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent, marginTop: 4 },

  avaFb: { backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.accent },
  matchPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: pt.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  matchPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: '#9A6B12' },

  // Filter bar
  filterBar: { gap: 12, marginBottom: 16 },
  scopeRow: { flexDirection: 'row', gap: 8 },
  scopeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  scopeChipOn: { backgroundColor: pt.ink, borderColor: pt.ink },
  scopeChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.muted },
  jobPickChip: { borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, maxWidth: 200 },
  jobPickChipOn: { backgroundColor: pt.accent, borderColor: pt.accent },
  jobPickChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.muted },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: { borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  filterChipOn: { backgroundColor: pt.caramel, borderColor: pt.caramel },
  filterChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.muted },

  // Applicant card
  appCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 15, padding: 14, marginBottom: 12, cursor: 'pointer' as any },
  appCardOn: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  appTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  appAva: { width: 46, height: 46, borderRadius: 23 },
  appName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  appApplied: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.subtle, marginTop: 1 },
  stageChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 10 },
  stageChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  appMid: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  appRating: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink },
  appDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: pt.subtle },
  appRole: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted },

  verPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: pt.greenSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 10 },
  verPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.green },
  availPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: pt.blueSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  availPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.blue },

  // Profile panel
  pHero: { alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: pt.line },
  pAva: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: pt.accentSoft, marginBottom: 10 },
  pName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: pt.ink },
  pBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 },
  matchPillBig: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pt.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  matchPillBigText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: '#9A6B12' },

  tiles: { flexDirection: 'row', alignItems: 'center', backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  tile: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  tileDiv: { width: 1, height: 30, backgroundColor: pt.line },
  tileValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  tileLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted },

  fpTabs: { flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: pt.line, marginTop: 14 },
  fpTab: { paddingVertical: 12 },
  fpTabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.muted },
  fpTabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2.5, backgroundColor: pt.accent, borderRadius: 2 },

  secTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink, marginBottom: 8 },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted, lineHeight: 20 },
  matchBox: { backgroundColor: '#FFFBF0', borderWidth: 1, borderColor: pt.accentSoft, borderRadius: 12, padding: 12, gap: 6 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reasonText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.ink, lineHeight: 18 },
  quoteBox: { backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 13 },

  detailsCard: { backgroundColor: pt.surface, borderRadius: 14, borderWidth: 1, borderColor: pt.line, overflow: 'hidden' },
  drRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  drBorder: { borderBottomWidth: 1, borderBottomColor: pt.line },
  drLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted },
  drValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink, flex: 1, textAlign: 'right', marginLeft: 16 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: pt.lineSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: pt.line },
  chipGreen: { backgroundColor: pt.greenSoft, borderColor: '#A7E8CE' },
  chipBlue: { backgroundColor: pt.blueSoft, borderColor: '#CFE0FB' },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 13, padding: 12, marginBottom: 10 },
  docIc: { width: 40, height: 40, borderRadius: 11, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  docStatus: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.green, marginTop: 1 },

  stageLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, lineHeight: 19, marginTop: 20, marginBottom: 12 },
  pActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pActionOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: pt.line },
  pActionOutlineText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  pActionPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12 },
  pActionPrimaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: '#fff' },

  empty: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyIc: { width: 66, height: 66, borderRadius: 20, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: pt.ink },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted, textAlign: 'center', maxWidth: 360 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pt.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 6 },
  emptyBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  // Doc viewer
  docOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  docHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  docHeaderTitle: { flex: 1, color: '#fff', fontSize: 16, fontFamily: FontFamily.fredokaSemiBold },
  docClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  docImgWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  docImg: { width: '100%', height: undefined, aspectRatio: 0.75, borderRadius: 8 },
});
