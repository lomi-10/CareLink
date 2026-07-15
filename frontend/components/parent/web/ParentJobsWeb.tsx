// components/parent/web/ParentJobsWeb.tsx — desktop "Work Management" screen.
// Three columns: job list → job detail + applicants pipeline → applicant profile.
// No detail pop-ups; post/edit/duplicate + interview reuse the existing form modals,
// confirms and the doc viewer stay modal. pt design system.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useJobApplications, useParentJobs, useParentPortalMode, type JobApplication, type JobPost } from '@/hooks/parent';
import { useAuth } from '@/hooks/shared';
import { useUserVerification } from '@/hooks/peso';
import { computeHelperJobMatch, applicationToMatchable } from '@/lib/parentHelperMatch';
import { formatSalary, formatPayoutSchedule } from '@/lib/salary';
import { ConfirmationModal, InterviewModal, NotificationModal, LoadingSpinner } from '@/components/shared';
import { JobPostModal } from '@/components/parent/jobs';
import { PendingBanner } from '@/components/parent/verification/PendingBanner';
import { ParentTopNav } from './ParentTopNav';
import { pt, ACCENT_GRADIENT } from './parentWebTheme';

const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const initials = (n?: string) => (n || 'H').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
// A job's salary is always a MONTHLY figure; salary_period is only the payout
// schedule, so it's shown as a separate line rather than as "/ Daily". See lib/salary.ts.
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
  Open: { bg: pt.blueSoft, text: pt.blue, icon: 'radio-button-on' },
  Filled: { bg: pt.greenSoft, text: pt.green, icon: 'checkmark-circle' },
  Closed: { bg: pt.lineSoft, text: pt.muted, icon: 'archive' },
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

const PIPELINE = [
  { key: 'all', label: 'All' }, { key: 'Pending', label: 'Pending' }, { key: 'Reviewed', label: 'Reviewed' },
  { key: 'Interview Scheduled', label: 'Interview' }, { key: 'Shortlisted', label: 'Shortlisted' }, { key: 'Accepted', label: 'Hired' },
];
const ARCHIVED_STATUSES = ['Closed', 'Expired', 'Rejected'];

export function ParentJobsWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; job_id?: string }>();
  const isWorkMode = useParentPortalMode();
  const { userData } = useAuth();
  const { verification } = useUserVerification();
  const isPending = verification.status === 'Pending';

  const { jobs, loading: loadingJobs, refresh: refreshJobs, stats: jobStats } = useParentJobs();
  const { applications: allApplications, loading: loadingApps, error: appsError, refresh: refreshApps, updateApplicationStatus } = useJobApplications('');

  const [showArchived, setShowArchived] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedApplicantId, setSelectedApplicantId] = useState('');
  const [profileTab, setProfileTab] = useState<'overview' | 'skills' | 'documents'>('overview');
  const [scope, setScope] = useState<'job' | 'all'>('job');
  const [pipeFilter, setPipeFilter] = useState('all');

  const [editingJob, setEditingJob] = useState<JobPost | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ visible: false, jobId: '', jobTitle: '' });
  const [archiveModal, setArchiveModal] = useState<JobPost | null>(null);
  const [notif, setNotif] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });
  const [sharedDocs, setSharedDocs] = useState<{ document_id: number; document_type: string; status: string; file_url?: string }[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ file_url: string; document_type: string } | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ visible: boolean; appId: string; action: 'Shortlisted' | 'Rejected' | null }>({ visible: false, appId: '', action: null });
  const [interviewTarget, setInterviewTarget] = useState<{ appId: number; helperName: string; jobTitle: string } | null>(null);

  const visibleJobs = useMemo(
    () => jobs.filter((j) => (showArchived ? ARCHIVED_STATUSES.includes(j.status) : !ARCHIVED_STATUSES.includes(j.status))),
    [jobs, showArchived],
  );
  const archivedCount = useMemo(() => jobs.filter((j) => ARCHIVED_STATUSES.includes(j.status)).length, [jobs]);

  useEffect(() => {
    if (visibleJobs.length === 0) { setSelectedJobId(''); return; }
    if (!visibleJobs.some((j) => j.job_post_id === selectedJobId)) setSelectedJobId(visibleJobs[0].job_post_id);
  }, [visibleJobs, selectedJobId]);

  // Deep links: /(parent)/jobs?tab=applicants (from the Applications nav tab) or ?job_id=
  useEffect(() => {
    if (jobs.length === 0) return;
    if (params.job_id) { const j = jobs.find((x) => String(x.job_post_id) === String(params.job_id)); if (j) setSelectedJobId(String(j.job_post_id)); }
    if (params.tab === 'applicants') setScope(params.job_id ? 'job' : 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tab, params.job_id, jobs.length]);

  useEffect(() => { if (appsError) setNotif({ visible: true, msg: appsError, type: 'error' }); }, [appsError]);

  const selectedJob = useMemo(() => jobs.find((j) => j.job_post_id === selectedJobId) ?? null, [jobs, selectedJobId]);
  const jobApplications = useMemo(() => allApplications.filter((a) => String(a.job_post_id) === String(selectedJobId)), [allApplications, selectedJobId]);

  const matchForApp = (app: JobApplication) => computeHelperJobMatch(applicationToMatchable(app), jobs.find((x) => String(x.job_post_id) === String(app.job_post_id)) ?? null);

  const scoped = scope === 'all' ? allApplications : jobApplications;
  const pipelineApps = useMemo(() => {
    if (pipeFilter === 'all') return scoped;
    if (pipeFilter === 'Accepted') return scoped.filter((a) => a.status === 'Accepted' || a.status === 'hired');
    return scoped.filter((a) => a.status === pipeFilter);
  }, [scoped, pipeFilter]);

  const pipeCount = (key: string) => {
    if (key === 'all') return scoped.length;
    if (key === 'Accepted') return scoped.filter((a) => a.status === 'Accepted' || a.status === 'hired').length;
    return scoped.filter((a) => a.status === key).length;
  };

  const selectedApplicant = useMemo(() => scoped.find((a) => a.application_id === selectedApplicantId) ?? null, [scoped, selectedApplicantId]);

  useEffect(() => {
    if (pipelineApps.length === 0) { setSelectedApplicantId(''); return; }
    if (!pipelineApps.some((a) => a.application_id === selectedApplicantId)) setSelectedApplicantId(pipelineApps[0].application_id);
  }, [pipelineApps, selectedApplicantId]);

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

  // ── Actions ──
  const handlePostJob = () => {
    if (!verification.canPostJobs) { setNotif({ visible: true, msg: 'You need to be verified to post jobs.', type: 'error' }); return; }
    setEditingJob(null); setDuplicating(false); setPostOpen(true);
  };
  const handleEditJob = (job: JobPost) => { setEditingJob(job); setDuplicating(false); setPostOpen(true); };
  const handleDuplicateJob = (job: JobPost) => {
    if (!verification.canPostJobs) { setNotif({ visible: true, msg: 'You need to be verified to post jobs.', type: 'error' }); return; }
    setEditingJob(job); setDuplicating(true); setPostOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleteModal((p) => ({ ...p, visible: false }));
      const raw = await AsyncStorage.getItem('user_data'); if (!raw) return;
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/parent/delete_job.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_post_id: deleteModal.jobId, parent_id: user.user_id }) });
      const data = await res.json();
      if (data.success) { setNotif({ visible: true, msg: 'Job post deleted.', type: 'success' }); refreshJobs(); } else throw new Error(data.message);
    } catch (e: any) { setNotif({ visible: true, msg: e.message || 'Failed to delete job post.', type: 'error' }); }
  };

  // "Archive" == close the post: update_job_status.php only accepts Open/Filled/Closed.
  const confirmArchive = async () => {
    const job = archiveModal; setArchiveModal(null);
    if (!job) return;
    const reopening = job.status === 'Closed';
    try {
      const raw = await AsyncStorage.getItem('user_data'); if (!raw) return;
      const user = JSON.parse(raw);
      const res = await fetch(`${API_URL}/parent/update_job_status.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: job.job_post_id, status: reopening ? 'Open' : 'Closed', requester_id: user.user_id, parent_id: user.user_id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to update job post.');
      setNotif({ visible: true, msg: reopening ? 'Job post reopened.' : 'Job post archived.', type: 'success' });
      refreshJobs();
    } catch (e: any) { setNotif({ visible: true, msg: e.message || 'Failed to update job post.', type: 'error' }); }
  };

  const executeStatusUpdate = async () => {
    if (!statusConfirm.action || !statusConfirm.appId) return;
    const action = statusConfirm.action; const appId = statusConfirm.appId;
    setStatusConfirm({ visible: false, appId: '', action: null });
    try {
      const result = await updateApplicationStatus(appId, action);
      if (result.success) setNotif({ visible: true, msg: `Applicant ${action === 'Shortlisted' ? 'shortlisted' : 'rejected'}.`, type: 'success' });
    } catch (err: any) { setNotif({ visible: true, msg: err.message || 'Failed to update status', type: 'error' }); }
  };

  const messageApplicant = (app: JobApplication) => router.push({ pathname: '/(parent)/messages', params: { partner_id: String(app.helper_id), partner_name: encodeURIComponent(app.helper_name ?? ''), job_post_id: String(app.job_post_id ?? '') } } as any);

  if (loadingJobs) return <LoadingSpinner visible message="Loading your work board…" />;

  return (
    <View style={s.root}>
      <ParentTopNav active={params.tab === 'applicants' ? 'applications' : 'jobs'} mode={isWorkMode ? 'work' : 'recruitment'} userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.inner}>
          {isPending && <View style={{ marginBottom: 16 }}><PendingBanner status="Pending" message={verification.message} /></View>}

          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.pageTitle}>Work Management</Text>
              <Text style={s.pageSub}>Manage your job posts and review helper applications.</Text>
            </View>
            <Pressable onPress={handlePostJob} style={({ hovered, pressed }: any) => [TRANS, !verification.canPostJobs && { opacity: 0.5 }, hovered && verification.canPostJobs && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.postBtn}>
                <Ionicons name="add" size={19} color="#fff" /><Text style={s.postBtnText}>Create Job Post</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={s.stats}>
            {statTiles.map((t) => (
              <View key={t.label} style={s.statTile}>
                <View style={s.statIc}><Ionicons name={t.icon} size={16} color={pt.accent} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.statValue}>{t.value}</Text>
                  <Text style={s.statLabel}>{t.label}</Text>
                  <Text style={s.statSub}>{t.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── 3 columns ── */}
          <View style={s.cols}>
            {/* LEFT — job list */}
            <View style={s.colJobs}>
              <View style={s.card}>
                <View style={s.cardHead}>
                  <Text style={s.cardTitle}>{showArchived ? 'Archived Jobs' : 'Your Job Posts'}</Text>
                  <View style={s.countPill}><Text style={s.countPillText}>{visibleJobs.length}</Text></View>
                </View>
                {visibleJobs.length === 0 ? (
                  <View style={s.emptySm}>
                    <View style={s.emptyIcSm}><Ionicons name="briefcase-outline" size={24} color={pt.accent} /></View>
                    <Text style={s.emptySmTitle}>{showArchived ? 'No archived jobs' : 'No job posts yet'}</Text>
                    <Text style={s.emptySmSub}>{showArchived ? 'Archived and expired posts show up here.' : 'Post a job to start receiving applications.'}</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {visibleJobs.map((job) => {
                      const cfg = jobStatusCfg(job.status); const on = job.job_post_id === selectedJobId;
                      return (
                        <Pressable key={job.job_post_id} onPress={() => setSelectedJobId(job.job_post_id)} style={({ hovered }: any) => [s.jobItem, on && s.jobItemOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                          <View style={s.jobThumb}><Ionicons name="briefcase" size={18} color={pt.accent} /></View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.jobItemTitle} numberOfLines={1}>{job.title}</Text>
                            <View style={s.jobItemMeta}>
                              <View style={[s.statusPill, { backgroundColor: cfg.bg }]}><Ionicons name={cfg.icon} size={10} color={cfg.text} /><Text style={[s.statusPillText, { color: cfg.text }]}>{job.status}</Text></View>
                              <Text style={s.jobItemSalary}>{formatSalary(job.salary_offered)}</Text>
                            </View>
                            <Text style={s.jobItemApps}>{job.application_count} Applicant{job.application_count !== 1 ? 's' : ''} · Posted {fmtDate(job.posted_at)}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={pt.subtle} />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              <Pressable onPress={() => setShowArchived((v) => !v)} style={({ hovered }: any) => [s.archiveToggle, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.accentSoft }]}>
                <Ionicons name={showArchived ? 'arrow-back' : 'archive-outline'} size={15} color={pt.accent} />
                <Text style={s.archiveToggleText}>{showArchived ? 'Back to Active Jobs' : `View Archived Jobs${archivedCount > 0 ? ` (${archivedCount})` : ''}`}</Text>
              </Pressable>
            </View>

            {/* MIDDLE — job detail + pipeline */}
            <View style={s.colMid}>
              {!selectedJob ? (
                <View style={[s.card, { paddingVertical: 50 }]}>
                  <View style={s.panelEmpty}>
                    <View style={s.emptyIc}><Ionicons name="briefcase-outline" size={28} color={pt.accent} /></View>
                    <Text style={s.emptyTitle}>Select a job post</Text>
                    <Text style={s.emptySub}>Choose a post on the left to see its details and applicants.</Text>
                  </View>
                </View>
              ) : (
                <View style={s.card}>
                  <Text style={s.midTitle} numberOfLines={2}>{selectedJob.title}</Text>
                  <View style={s.midMeta}>
                    {(() => { const cfg = jobStatusCfg(selectedJob.status); return (
                      <View style={[s.statusPill, { backgroundColor: cfg.bg }]}><Ionicons name={cfg.icon} size={10} color={cfg.text} /><Text style={[s.statusPillText, { color: cfg.text }]}>{selectedJob.status}</Text></View>
                    ); })()}
                    <View style={s.midMetaItem}><Ionicons name="location-outline" size={13} color={pt.muted} /><Text style={s.midMetaText} numberOfLines={1}>{[selectedJob.municipality, selectedJob.province].filter(Boolean).join(', ') || 'Location not set'}</Text></View>
                    <View style={s.midMetaItem}><Ionicons name="cash-outline" size={13} color={pt.muted} /><Text style={s.midSalary}>{formatSalary(selectedJob.salary_offered)}</Text></View>
                    <View style={s.midMetaItem}><Ionicons name="calendar-outline" size={13} color={pt.muted} /><Text style={s.midMetaText}>{formatPayoutSchedule(selectedJob.salary_period)}</Text></View>
                  </View>

                  <View style={s.miniGrid}>
                    <MiniStat value={jobApplications.length} label="Applicants" />
                    <MiniStat value={jobApplications.filter((a) => a.status === 'Shortlisted').length} label="Shortlisted" />
                    <MiniStat value={jobApplications.filter((a) => a.status === 'Interview Scheduled').length} label="Interview" />
                    <MiniStat value={jobApplications.filter((a) => a.status === 'hired' || a.status === 'Accepted').length} label="Hired" />
                  </View>

                  <View style={s.jobActions}>
                    <ActBtn icon="pencil-outline" label="Edit" onPress={() => handleEditJob(selectedJob)} />
                    <ActBtn icon="copy-outline" label="Duplicate" onPress={() => handleDuplicateJob(selectedJob)} />
                    <ActBtn icon="archive-outline" label={selectedJob.status === 'Closed' ? 'Reopen' : 'Archive'} onPress={() => setArchiveModal(selectedJob)} />
                    <ActBtn icon="trash-outline" label="Delete" tone={pt.red} onPress={() => setDeleteModal({ visible: true, jobId: selectedJob.job_post_id, jobTitle: selectedJob.title })} />
                  </View>

                  <View style={s.divider} />

                  <View style={s.pipeHead}>
                    <Text style={s.pipeTitle}>Applicants Pipeline</Text>
                    <View style={s.countPill}><Text style={s.countPillText}>{scoped.length}</Text></View>
                    <View style={{ flex: 1 }} />
                    <View style={s.scopeRow}>
                      {(['job', 'all'] as const).map((k) => (
                        <Pressable key={k} onPress={() => setScope(k)} style={[s.scopeChip, scope === k && s.scopeChipOn]}>
                          <Text style={[s.scopeChipText, scope === k && { color: '#fff' }]}>{k === 'job' ? 'This Job' : 'All Jobs'}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={s.pipeChips}>
                    {PIPELINE.map((f) => {
                      const on = pipeFilter === f.key; const n = pipeCount(f.key);
                      return (
                        <Pressable key={f.key} onPress={() => setPipeFilter(f.key)} style={({ hovered }: any) => [s.pipeChip, on && s.pipeChipOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                          <Text style={[s.pipeChipText, on && { color: '#fff' }]}>{f.label}</Text>
                          <View style={[s.pipeChipCount, on && { backgroundColor: 'rgba(255,255,255,.25)' }]}><Text style={[s.pipeChipCountText, on && { color: '#fff' }]}>{n}</Text></View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {loadingApps && pipelineApps.length === 0 ? (
                    <ActivityIndicator color={pt.accent} style={{ marginTop: 24 }} />
                  ) : pipelineApps.length === 0 ? (
                    <View style={s.emptySm}>
                      <View style={s.emptyIcSm}><Ionicons name="folder-open-outline" size={24} color={pt.accent} /></View>
                      <Text style={s.emptySmTitle}>No applicants here</Text>
                      <Text style={s.emptySmSub}>{pipeFilter !== 'all' ? 'Try a different pipeline stage.' : 'No one has applied to this post yet.'}</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {pipelineApps.map((app) => (
                        <ApplicantCard key={app.application_id} app={app} match={matchForApp(app).score}
                          active={app.application_id === selectedApplicantId}
                          showJob={scope === 'all'}
                          jobTitle={jobs.find((j) => String(j.job_post_id) === String(app.job_post_id))?.title}
                          onPress={() => { setSelectedApplicantId(app.application_id); setProfileTab('overview'); }} />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* RIGHT — applicant profile */}
            <View style={s.colRight}>
              <ApplicantPanel app={selectedApplicant} match={selectedApplicant ? matchForApp(selectedApplicant) : null}
                profileTab={profileTab} onTab={setProfileTab} sharedDocs={sharedDocs} docsLoading={docsLoading}
                onViewDoc={(d) => setViewingDoc(d)} onMessage={messageApplicant}
                onReject={(a) => setStatusConfirm({ visible: true, appId: a.application_id, action: 'Rejected' })}
                onShortlist={(a) => setStatusConfirm({ visible: true, appId: a.application_id, action: 'Shortlisted' })}
                onSchedule={(a) => { const job = jobs.find((j) => String(j.job_post_id) === String(a.job_post_id)); setInterviewTarget({ appId: Number(a.application_id), helperName: a.helper_name, jobTitle: job?.title ?? 'this position' }); }}
                onManage={(a) => router.push({ pathname: '/(parent)/hire/placement_tasks', params: { application_id: String(a.application_id), helper_name: encodeURIComponent(a.helper_name ?? 'Helper') } } as any)} />
            </View>
          </View>
          <View style={{ height: 30 }} />
        </View>
      </ScrollView>

      {/* Modals */}
      <NotificationModal visible={notif.visible} message={notif.msg} type={notif.type} onClose={() => setNotif((p) => ({ ...p, visible: false }))} autoClose duration={1600} />
      <ConfirmationModal visible={deleteModal.visible} title="Delete Job Post?" message={`Delete "${deleteModal.jobTitle}"? This cannot be undone.`} confirmText="Delete" cancelText="Cancel" type="danger" onConfirm={confirmDelete} onCancel={() => setDeleteModal((p) => ({ ...p, visible: false }))} />
      <ConfirmationModal
        visible={!!archiveModal}
        title={archiveModal?.status === 'Closed' ? 'Reopen Job Post?' : 'Archive Job Post?'}
        message={archiveModal?.status === 'Closed'
          ? `Reopen "${archiveModal?.title}"? Helpers will be able to apply again.`
          : `Archive "${archiveModal?.title}"? It closes the post so helpers can no longer apply. You can reopen it later.`}
        confirmText={archiveModal?.status === 'Closed' ? 'Reopen' : 'Archive'} cancelText="Cancel" type={archiveModal?.status === 'Closed' ? 'success' : 'warning'}
        onConfirm={confirmArchive} onCancel={() => setArchiveModal(null)}
      />
      <JobPostModal visible={postOpen} onClose={() => { setPostOpen(false); setDuplicating(false); }} existingJobData={editingJob} duplicate={duplicating} onSaveSuccess={refreshJobs} />
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

function MiniStat({ value, label }: { value: number; label: string }) {
  return <View style={s.miniStat}><Text style={s.miniStatValue}>{value}</Text><Text style={s.miniStatLabel}>{label}</Text></View>;
}
function ActBtn({ icon, label, onPress, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; tone?: string }) {
  const c = tone ?? pt.ink;
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.actBtn, TRANS, hovered && { borderColor: tone ?? pt.accent, backgroundColor: tone ? pt.redSoft : pt.accentSoft }]}>
      <Ionicons name={icon} size={14} color={c} /><Text style={[s.actBtnText, { color: c }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Applicant card (pipeline) ───
function ApplicantCard({ app, match, active, showJob, jobTitle, onPress }: { app: JobApplication; match: number; active: boolean; showJob?: boolean; jobTitle?: string; onPress: () => void }) {
  const role = app.helper_jobs?.[0] || app.helper_categories?.[0] || app.category_name || 'Helper';
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.appCard, active && s.appCardOn, TRANS, hovered && !active && { borderColor: pt.accent }]}>
      <View style={s.appTop}>
        {app.helper_photo ? <Image source={{ uri: app.helper_photo }} style={s.appAva} /> : <View style={[s.appAva, s.avaFb]}><Text style={s.avaText}>{initials(app.helper_name)}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.appName} numberOfLines={1}>{app.helper_name}</Text>
          <Text style={s.appApplied}>Applied {timeAgo(app.applied_at)}</Text>
          {app.verification_status === 'Verified' && (
            <View style={s.verPill}><Ionicons name="shield-checkmark" size={10} color={pt.green} /><Text style={s.verPillText}>PESO Verified</Text></View>
          )}
          <View style={s.appRoleRow}>
            <Ionicons name="star-outline" size={12} color={pt.subtle} />
            <Text style={s.appRole} numberOfLines={1}>{role}</Text>
          </View>
          {showJob && !!jobTitle && <Text style={s.appJob} numberOfLines={1}>for {jobTitle}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={s.matchPill}><Text style={s.matchPillText}>{match}% Match</Text></View>
          <Ionicons name="chevron-forward" size={16} color={pt.subtle} />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Applicant profile panel (right column) ───
function ApplicantPanel({ app, match, profileTab, onTab, sharedDocs, docsLoading, onViewDoc, onMessage, onReject, onShortlist, onSchedule, onManage }: {
  app: JobApplication | null; match: any; profileTab: 'overview' | 'skills' | 'documents'; onTab: (t: 'overview' | 'skills' | 'documents') => void;
  sharedDocs: any[]; docsLoading: boolean; onViewDoc: (d: { file_url: string; document_type: string }) => void;
  onMessage: (a: JobApplication) => void; onReject: (a: JobApplication) => void; onShortlist: (a: JobApplication) => void; onSchedule: (a: JobApplication) => void; onManage: (a: JobApplication) => void;
}) {
  if (!app) {
    return (
      <View style={[s.card, { paddingVertical: 60 }]}>
        <View style={s.panelEmpty}>
          <View style={s.emptyIc}><Ionicons name="person-outline" size={28} color={pt.accent} /></View>
          <Text style={s.emptyTitle}>Select an applicant</Text>
          <Text style={s.emptySub}>Pick someone from the pipeline to see their full profile, match reasons and background.</Text>
        </View>
      </View>
    );
  }
  const a = app as any;
  const first = (a.helper_name || 'this helper').trim().split(/\s+/)[0];
  const location = [a.helper_barangay, a.helper_municipality, a.helper_province].filter(Boolean).join(', ') || 'Not specified';
  const salaryLabel = a.helper_expected_salary ? `₱${Number(a.helper_expected_salary).toLocaleString()} / ${fmtPeriod(a.helper_salary_period)}` : 'Not specified';
  const canDecide = ['Pending', 'Reviewed'].includes(app.status);
  const canSchedule = ['Shortlisted', 'Interview Scheduled'].includes(app.status);
  const isHired = ['hired', 'Accepted'].includes(app.status);
  const stage = appStatusCfg(app.status);
  const cats: string[] = a.helper_categories ?? [];
  const roles: string[] = a.helper_jobs ?? [];
  const skills: string[] = a.helper_skills ?? [];

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.pHero}>
        {a.helper_photo ? <Image source={{ uri: a.helper_photo }} style={s.pAva} /> : <View style={[s.pAva, s.avaFb]}><Text style={[s.avaText, { fontSize: 26 }]}>{initials(a.helper_name)}</Text></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.pName} numberOfLines={1}>{a.helper_name}</Text>
          <View style={s.pBadges}>
            {a.verification_status === 'Verified' && <View style={s.verPillLg}><Ionicons name="shield-checkmark" size={12} color={pt.green} /><Text style={s.verPillLgText}>PESO Verified</Text></View>}
            {a.availability_status === 'Available' && <View style={s.availPill}><Ionicons name="briefcase" size={12} color={pt.blue} /><Text style={s.availPillText}>Available to Work</Text></View>}
            {match && <View style={s.matchPillBig}><Ionicons name="trending-up" size={12} color="#9A6B12" /><Text style={s.matchPillBigText}>{match.score}% Match</Text></View>}
          </View>
        </View>
        <View style={[s.stageChip, { backgroundColor: stage.bg }]}><Ionicons name={stage.icon} size={11} color={stage.color} /><Text style={[s.stageChipText, { color: stage.color }]}>{stage.label}</Text></View>
      </View>

      {/* Info tiles */}
      <View style={s.tiles}>
        <Tile icon="person-outline" value={a.helper_age ? `${a.helper_age}` : '—'} label="Age" />
        <View style={s.tileDiv} /><Tile icon="male-female-outline" value={a.helper_gender || '—'} label="Gender" />
        <View style={s.tileDiv} /><Tile icon="briefcase-outline" value={a.helper_experience_years ? `${a.helper_experience_years} yrs` : 'New'} label="Experience" />
        <View style={s.tileDiv} /><Tile icon="location-outline" value={a.helper_municipality || '—'} label="Location" />
      </View>

      {/* Why we recommend */}
      {match && match.reasons.length > 0 && (
        <View style={s.recCard}>
          <Text style={s.recTitle}>Why we recommend {first}</Text>
          <View style={s.recGrid}>
            {match.reasons.map((r: string, i: number) => (
              <View key={i} style={s.recItem}><Ionicons name="checkmark-circle" size={14} color={pt.green} /><Text style={s.recText}>{r}</Text></View>
            ))}
          </View>
        </View>
      )}

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
        <View style={s.twoCol}>
          <View style={s.twoColItem}>
            <Text style={s.secTitle}>Work Preference</Text>
            <View style={s.detailsCard}>
              <DetailRow label="Preferred Role" value={a.helper_jobs?.[0] || a.helper_categories?.[0] || 'Not specified'} />
              <DetailRow label="Preferred Job Type" value={a.helper_employment_type || 'Any'} />
              <DetailRow label="Expected Salary" value={salaryLabel} />
              <DetailRow label="Availability" value={a.helper_work_schedule || 'Any'} last />
            </View>
          </View>
          <View style={s.twoColItem}>
            <Text style={s.secTitle}>Background</Text>
            <View style={s.detailsCard}>
              <DetailRow label="Civil Status" value={a.helper_civil_status || 'Not specified'} />
              <DetailRow label="Religion" value={a.helper_religion || 'Not specified'} />
              <DetailRow label="Location" value={location} last />
            </View>
            <View style={{ height: 14 }} />
            <Text style={s.secTitle}>About {first}</Text>
            <View style={s.quoteBox}>
              <Text style={s.body}>{a.helper_bio || 'This helper has not added an introduction yet.'}</Text>
            </View>
          </View>
          {!!app.cover_letter && (
            <View style={{ width: '100%' }}>
              <Text style={s.secTitle}>Cover Letter</Text>
              <View style={s.quoteBox}><Text style={s.body}>“{app.cover_letter}”</Text></View>
            </View>
          )}
        </View>
      ) : profileTab === 'skills' ? (
        <View style={{ gap: 16, marginTop: 16 }}>
          {cats.length === 0 && roles.length === 0 && skills.length === 0 ? (
            <Text style={s.emptyText}>No skills or roles listed yet.</Text>
          ) : (
            <>
              {cats.length > 0 && <View><Text style={s.secTitle}>Categories</Text><View style={s.chipsWrap}>{cats.map((c, i) => <View key={i} style={[s.chip, s.chipBlue]}><Text style={[s.chipText, { color: pt.blue }]}>{c}</Text></View>)}</View></View>}
              {roles.length > 0 && <View><Text style={s.secTitle}>Specific Roles</Text><View style={s.chipsWrap}>{roles.map((j, i) => <View key={i} style={[s.chip, s.chipGreen]}><Text style={[s.chipText, { color: pt.green }]}>{j}</Text></View>)}</View></View>}
              {skills.length > 0 && <View><Text style={s.secTitle}>Skills &amp; Abilities</Text><View style={s.chipsWrap}>{skills.map((sk, i) => <View key={i} style={s.chip}><Text style={s.chipText}>{sk}</Text></View>)}</View></View>}
            </>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          {docsLoading ? <ActivityIndicator size="small" color={pt.accent} style={{ marginVertical: 24 }} />
            : sharedDocs.length === 0 ? <Text style={s.emptyText}>No documents have been shared for this application yet.</Text>
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
      <View style={s.pActions}>
        <Pressable onPress={() => onMessage(app)} style={({ hovered }: any) => [s.pActionOutline, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.lineSoft }]}>
          <Ionicons name="chatbubble-outline" size={16} color={pt.ink} /><Text style={s.pActionOutlineText}>Message</Text>
        </Pressable>
        {canSchedule && (
          <Pressable onPress={() => onSchedule(app)} style={({ hovered, pressed }: any) => [{ flex: 1.3 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pActionPrimary}><Ionicons name="calendar-outline" size={16} color="#fff" /><Text style={s.pActionPrimaryText}>Schedule Interview</Text></LinearGradient>
          </Pressable>
        )}
        {canDecide && (
          <>
            <Pressable onPress={() => onShortlist(app)} style={({ hovered }: any) => [s.pActionOutline, { flex: 1 }, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.accentSoft }]}>
              <Ionicons name="star-outline" size={16} color={pt.accent} /><Text style={[s.pActionOutlineText, { color: pt.accent }]}>Shortlist</Text>
            </Pressable>
            <Pressable onPress={() => onReject(app)} style={({ hovered }: any) => [s.pActionOutline, TRANS, hovered && { borderColor: pt.red, backgroundColor: pt.redSoft }]}>
              <Ionicons name="close-circle-outline" size={16} color={pt.red} /><Text style={[s.pActionOutlineText, { color: pt.red }]}>Reject</Text>
            </Pressable>
          </>
        )}
        {isHired && (
          <Pressable onPress={() => onManage(app)} style={({ hovered, pressed }: any) => [{ flex: 1.3 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pActionPrimary}><Ionicons name="checkbox-outline" size={16} color="#fff" /><Text style={s.pActionPrimaryText}>Manage Placement</Text></LinearGradient>
          </Pressable>
        )}
      </View>
      <Text style={s.stageHint}>
        {canDecide ? 'Shortlist to move them forward, or reject if they’re not a fit.'
          : canSchedule ? 'Ready to hire? Agree on terms in Messages — that’s where the contract is generated.'
          : isHired ? 'Hired — manage their tasks and placement.'
          : `Status: ${stage.label} — no action needed at this stage.`}
      </Text>
    </View>
  );
}
function Tile({ icon, value, label }: { icon: any; value: string; label: string }) {
  return <View style={s.tile}><Ionicons name={icon} size={15} color={pt.muted} /><Text style={s.tileValue} numberOfLines={1}>{value}</Text><Text style={s.tileLabel}>{label}</Text></View>;
}
function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[s.drRow, !last && s.drBorder]}><Text style={s.drLabel}>{label}</Text><Text style={s.drValue} numberOfLines={2}>{value}</Text></View>;
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: pt.canvas },
  scroll: { paddingBottom: 10 },
  inner: { maxWidth: 1560, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 22 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 20 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: pt.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.muted, marginTop: 2 },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  postBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: '#fff' },

  stats: { flexDirection: 'row', gap: 14, marginBottom: 18, flexWrap: 'wrap' },
  statTile: { flex: 1, minWidth: 170, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 16, ...shadowSm },
  statIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: pt.ink, letterSpacing: -0.5 },
  statLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  statSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 1 },

  cols: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  colJobs: { width: 300, flexGrow: 0, flexShrink: 0, gap: 12 },
  colMid: { width: 430, flexGrow: 0, flexShrink: 0 },
  colRight: { flex: 1, minWidth: 0 },

  card: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 16, ...shadowSm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: pt.ink },
  countPill: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  countPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#9A6B12' },

  jobItem: { flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 14, padding: 11, cursor: 'pointer' as any },
  jobItemOn: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  jobThumb: { width: 38, height: 38, borderRadius: 11, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  jobItemTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  jobItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, flexWrap: 'wrap' },
  jobItemSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: pt.muted },
  jobItemApps: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.subtle, marginTop: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5 },
  archiveToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.3, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 12, paddingVertical: 12 },
  archiveToggleText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },

  midTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: pt.ink, letterSpacing: -0.3 },
  midMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  midMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  midMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted },
  midSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.accent },

  miniGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  miniStat: { flex: 1, backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  miniStatValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: pt.ink },
  miniStatLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: pt.muted, marginTop: 2 },

  jobActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: pt.line, borderRadius: 10, paddingVertical: 10 },
  actBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },

  divider: { height: 1, backgroundColor: pt.line, marginVertical: 16 },
  pipeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  pipeTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  scopeRow: { flexDirection: 'row', gap: 4, backgroundColor: pt.lineSoft, borderRadius: 9, padding: 3 },
  scopeChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  scopeChipOn: { backgroundColor: pt.caramel },
  scopeChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.muted },
  pipeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  pipeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  pipeChipOn: { backgroundColor: pt.feat2, borderColor: pt.feat2 },
  pipeChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: pt.muted },
  pipeChipCount: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: pt.lineSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  pipeChipCountText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: pt.muted },

  appCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 14, padding: 12, cursor: 'pointer' as any },
  appCardOn: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  appTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  appAva: { width: 46, height: 46, borderRadius: 23 },
  appName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink },
  appApplied: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.subtle, marginTop: 1 },
  appRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  appRole: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted },
  appJob: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.subtle, marginTop: 2 },
  avaFb: { backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.accent },
  matchPill: { backgroundColor: pt.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  matchPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#9A6B12' },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', backgroundColor: pt.greenSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 },
  verPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: pt.green },

  // profile panel
  pHero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pAva: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, borderColor: pt.accentSoft },
  pName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: pt.ink },
  pBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  verPillLg: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pt.greenSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  verPillLgText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.green },
  availPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pt.blueSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  availPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.blue },
  matchPillBig: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pt.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  matchPillBigText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#9A6B12' },
  stageChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  stageChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  tiles: { flexDirection: 'row', alignItems: 'center', backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 14, paddingVertical: 12, marginTop: 16 },
  tile: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  tileDiv: { width: 1, height: 28, backgroundColor: pt.line },
  tileValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  tileLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: pt.muted },

  recCard: { backgroundColor: '#FFFBF0', borderWidth: 1, borderColor: pt.accentSoft, borderRadius: 14, padding: 14, marginTop: 14 },
  recTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink, marginBottom: 9 },
  recGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, flexBasis: '46%', flexGrow: 1, minWidth: 200 },
  recText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.ink, lineHeight: 17 },

  fpTabs: { flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: pt.line, marginTop: 16 },
  fpTab: { paddingVertical: 11 },
  fpTabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.muted },
  fpTabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2.5, backgroundColor: pt.accent, borderRadius: 2 },

  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  twoColItem: { flexBasis: 260, flexGrow: 1, minWidth: 240 },
  secTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink, marginBottom: 8 },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, lineHeight: 19 },
  quoteBox: { backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 12 },
  detailsCard: { backgroundColor: pt.surface, borderRadius: 12, borderWidth: 1, borderColor: pt.line, overflow: 'hidden' },
  drRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 10 },
  drBorder: { borderBottomWidth: 1, borderBottomColor: pt.lineSoft },
  drLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted },
  drValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink, flex: 1, textAlign: 'right' },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: pt.lineSoft, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: pt.line },
  chipGreen: { backgroundColor: pt.greenSoft, borderColor: '#A7E8CE' },
  chipBlue: { backgroundColor: pt.blueSoft, borderColor: '#CFE0FB' },
  chipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 13, padding: 12, marginBottom: 10 },
  docIc: { width: 40, height: 40, borderRadius: 11, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  docStatus: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.green, marginTop: 1 },

  pActions: { flexDirection: 'row', gap: 9, marginTop: 18, flexWrap: 'wrap' },
  pActionOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: pt.line },
  pActionOutlineText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  pActionPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12 },
  pActionPrimaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },
  stageHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.subtle, lineHeight: 17, marginTop: 10 },

  panelEmpty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIc: { width: 60, height: 60, borderRadius: 18, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16.5, color: pt.ink },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  emptySm: { alignItems: 'center', paddingVertical: 26, gap: 8 },
  emptyIcSm: { width: 48, height: 48, borderRadius: 15, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emptySmTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  emptySmSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, textAlign: 'center', lineHeight: 17 },
  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, paddingVertical: 10 },

  docOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  docHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  docHeaderTitle: { flex: 1, color: '#fff', fontSize: 16, fontFamily: FontFamily.fredokaSemiBold },
  docClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  docImgWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  docImg: { width: '100%', height: undefined, aspectRatio: 0.75, borderRadius: 8 },
});
