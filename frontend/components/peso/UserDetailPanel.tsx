// components/peso/UserDetailPanel.tsx
// Embedded user-review panel for the PESO User Verification two-pane screen.
// Tabs: Overview (profile info) · Documents (with AI pre-verification) · Jobs Posted.
// Reuses peso/get_user_details.php, get_jobs_for_verification.php, verify_user.php,
// verify_document.php, update_job_status.php.

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Image, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import NotificationModal from "./NotificationModal";
import API_URL from "@/constants/api";
import { theme } from "@/constants/theme";
import { formatParentHouseholdType } from "@/constants/parentHousehold";

const DOC_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  "Valid ID": "card-outline",
  "Barangay Clearance": "home-outline",
  "Police Clearance": "shield-outline",
  "TESDA NC2": "ribbon-outline",
  "NBI Clearance": "document-text-outline",
};

type TabKey = "overview" | "documents" | "jobs";

function legitLabel(v: number) { return v >= 90 ? "High" : v >= 70 ? "Medium" : "Low"; }
function clarityLabel(v: number) { return v >= 85 ? "Very Clear" : v >= 60 ? "Readable" : "Low"; }
function scoreColor(v: number) { return v >= 85 ? theme.color.success : v >= 60 ? theme.color.warning : theme.color.danger; }

export default function UserDetailPanel({
  userId, userType, onChanged, onClose,
}: {
  userId: number | string;
  userType?: string;
  onChanged?: () => void;
  onClose?: () => void;
}) {
  const [verifierId, setVerifierId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [viewBack, setViewBack] = useState(false);
  const [rejectUserModal, setRejectUserModal] = useState(false);
  const [rejectDocModal, setRejectDocModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingDocument, setRejectingDocument] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const [parentJobs, setParentJobs] = useState<any[]>([]);
  const [parentJobsLoading, setParentJobsLoading] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<number | null>(null);
  const [rejectJobModal, setRejectJobModal] = useState(false);
  const [rejectJobReason, setRejectJobReason] = useState("");
  const [rejectingJob, setRejectingJob] = useState<any>(null);

  const [notification, setNotification] = useState({
    visible: false, type: "success" as "success" | "error" | "warning" | "info",
    title: "", message: "", onAction: undefined as (() => void) | undefined,
    actionLabel: undefined as string | undefined,
  });
  const showNotif = (type: typeof notification.type, title: string, message: string, actionLabel?: string, onAction?: () => void) =>
    setNotification({ visible: true, type, title, message, actionLabel, onAction });
  const closeNotif = () => setNotification((p) => ({ ...p, visible: false }));

  // ── derived ──
  const user = userData?.user ?? ({} as any);
  const profile = userData?.profile ?? ({} as any);
  const docList = (userData?.documents ?? []) as any[];
  const helperSpecialties = userData?.helper_specialties ?? null;
  const parentHousehold = userData?.parent_household ?? null;
  const isHelper = (userType ?? user.user_type) === "helper";
  const vs = profile?.verification_status ?? "Unverified";

  const jobsByCategory = useMemo(() => {
    const jobs = (helperSpecialties?.jobs ?? []) as Array<{ title?: string; category?: string }>;
    const map = new Map<string, string[]>();
    for (const j of jobs) {
      const cat = (j?.category || "Other").trim() || "Other";
      const title = (j?.title || "").trim();
      if (!title) continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(title);
    }
    return Array.from(map.entries()).map(([category, titles]) => ({
      category, titles: Array.from(new Set(titles)).sort((a, b) => a.localeCompare(b)),
    }));
  }, [helperSpecialties]);

  const hasRejectedDoc = useMemo(() => docList.some((d) => d?.status === "Rejected"), [docList]);
  const hasPendingDoc = useMemo(() => docList.some((d) => d?.status === "Pending"), [docList]);
  const allDocsVerified = useMemo(() => docList.length > 0 && docList.every((d) => d?.status === "Verified"), [docList]);
  const canApproveUser = vs === "Pending" && docList.length > 0 && allDocsVerified;
  const approvalBlockReason = hasRejectedDoc
    ? "One or more documents were rejected. The applicant must re-upload before approval."
    : hasPendingDoc ? "Some documents are still pending. Approve or reject each document first."
    : docList.length === 0 ? "No documents on file. The applicant must upload required documents."
    : !allDocsVerified ? "All submitted documents must be marked Verified before approval." : "";

  // ── init / fetch ──
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user_data");
        if (raw) { const id = Number(JSON.parse(raw)?.user_id); setVerifierId(Number.isFinite(id) ? id : null); }
      } catch {}
    })();
  }, []);

  useEffect(() => { setTab("overview"); fetchUserDetails(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userData && userData.user?.user_type === "parent") fetchParentJobs();
  }, [userData]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserDetails = async () => {
    try {
      setLoading(true); setLoadError(null); setUserData(null);
      const typeQ = userType ? `&user_type=${encodeURIComponent(String(userType))}` : "";
      const raw = await AsyncStorage.getItem("user_data");
      const staffUserId = raw ? JSON.parse(raw)?.user_id : "";
      const res = await fetch(`${API_URL}/peso/get_user_details.php?user_id=${encodeURIComponent(String(userId))}${typeQ}&staff_user_id=${encodeURIComponent(String(staffUserId))}`);
      const data = JSON.parse(await res.text());
      if (data.success) setUserData(data.data);
      else setLoadError(data.message || "Failed to load user");
    } catch { setLoadError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const fetchParentJobs = async () => {
    try {
      setParentJobsLoading(true);
      const res = await fetch(`${API_URL}/peso/get_jobs_for_verification.php?parent_id=${encodeURIComponent(String(userId))}`);
      const data = await res.json();
      if (data.success) setParentJobs(data.data ?? []);
    } catch {} finally { setParentJobsLoading(false); }
  };

  // ── actions ──
  const handleApproveUser = () => {
    if (processing) return;
    if (!canApproveUser) { showNotif("warning", "Cannot approve yet", approvalBlockReason); return; }
    showNotif("warning", "Verify Account", "Approve this account? This will mark them as PESO Verified.", "Approve", async () => {
      try {
        setProcessing(true);
        const res = await fetch(`${API_URL}/peso/verify_user.php`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, action: "approve", verified_by: verifierId }),
        });
        const data = await res.json();
        if (data.success) {
          setUserData((prev: any) => prev ? { ...prev, profile: { ...(prev.profile ?? {}), verification_status: "Verified" } } : prev);
          onChanged?.();
          showNotif("success", "Account Approved!", "This user is now PESO Verified.");
        } else showNotif("error", "Failed", data.message || "Failed to approve account.");
      } catch { showNotif("error", "Error", "Network error occurred."); }
      finally { setProcessing(false); }
    });
  };

  const handleRejectUser = async () => {
    if (!rejectReason.trim()) { showNotif("warning", "Missing reason", "Please provide a rejection reason."); return; }
    try {
      setProcessing(true);
      const res = await fetch(`${API_URL}/peso/verify_user.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action: "reject", reason: rejectReason, verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectUserModal(false); setRejectReason("");
        setUserData((prev: any) => prev ? { ...prev, profile: { ...(prev.profile ?? {}), verification_status: "Rejected" } } : prev);
        onChanged?.();
        showNotif("success", "Account Rejected", "The account has been rejected.");
      } else showNotif("error", "Failed", data.message || "Failed to reject account.");
    } catch { showNotif("error", "Error", "Network error occurred."); }
    finally { setProcessing(false); }
  };

  const handleApproveDocument = (doc: any) => {
    showNotif("info", "Approve Document", `Approve "${doc.document_type}"?`, "Approve", async () => {
      try {
        const res = await fetch(`${API_URL}/peso/verify_document.php`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: doc.document_id, action: "approve", verified_by: verifierId }),
        });
        const data = await res.json();
        if (data.success) { showNotif("success", "Document Approved", "Document marked as verified."); fetchUserDetails(); onChanged?.(); }
        else showNotif("error", "Failed", data.message || "Failed to approve document.");
      } catch { showNotif("error", "Error", "Network error occurred."); }
    });
  };

  const handleRejectDocument = async () => {
    if (!rejectReason.trim()) { showNotif("warning", "Missing reason", "Please provide a rejection reason."); return; }
    try {
      const res = await fetch(`${API_URL}/peso/verify_document.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: rejectingDocument.document_id, action: "reject", reason: rejectReason, verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectDocModal(false); setRejectingDocument(null); setRejectReason("");
        showNotif("success", "Document Rejected", "Document has been rejected."); fetchUserDetails(); onChanged?.();
      } else showNotif("error", "Failed", data.message || "Failed to reject document.");
    } catch { showNotif("error", "Error", "Network error occurred."); }
  };

  const handleApproveJob = (job: any) => {
    showNotif("info", "Approve Job Post", `Approve "${job.title}"? It will become visible to helpers.`, "Approve", async () => {
      try {
        setProcessingJobId(job.job_post_id);
        const res = await fetch(`${API_URL}/peso/update_job_status.php`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_post_id: job.job_post_id, status: "Open", verified_by: verifierId }),
        });
        const data = await res.json();
        if (data.success) { setParentJobs((p) => p.map((j) => j.job_post_id === job.job_post_id ? { ...j, status: "Open" } : j)); showNotif("success", "Job Approved", "This job post is now live for helpers."); }
        else showNotif("error", "Failed", data.message || "Failed to approve job.");
      } catch { showNotif("error", "Error", "Network error occurred."); }
      finally { setProcessingJobId(null); }
    });
  };

  const handleRejectJob = async () => {
    if (!rejectJobReason.trim()) { showNotif("warning", "Reason required", "Please provide a rejection reason."); return; }
    try {
      setProcessingJobId(rejectingJob.job_post_id);
      const res = await fetch(`${API_URL}/peso/update_job_status.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: rejectingJob.job_post_id, status: "Rejected", reason: rejectJobReason, verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setParentJobs((p) => p.map((j) => j.job_post_id === rejectingJob.job_post_id ? { ...j, status: "Rejected", rejection_reason: rejectJobReason } : j));
        setRejectJobModal(false); setRejectingJob(null); setRejectJobReason("");
        showNotif("success", "Job Rejected", "The parent will be notified to revise their posting.");
      } else showNotif("error", "Failed", data.message || "Failed to reject job.");
    } catch { showNotif("error", "Error", "Network error occurred."); }
    finally { setProcessingJobId(null); }
  };

  const requestMoreInfo = () => showNotif("info", "Request More Info",
    "To ask the applicant for clarifications or a clearer document, message them directly from Messages. Rejecting a specific document also notifies them with your reason.");

  // ── render ──
  if (loading) {
    return <View style={st.center}><ActivityIndicator size="large" color={theme.color.peso} /><Text style={st.muted}>Loading profile…</Text></View>;
  }
  if (!userData) {
    return (
      <View style={st.center}>
        <Ionicons name="alert-circle-outline" size={56} color={theme.color.subtle} />
        <Text style={st.errTitle}>{loadError ?? "User not found"}</Text>
        <TouchableOpacity style={st.retryBtn} onPress={fetchUserDetails}><Text style={st.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  const roleAccent = isHelper ? theme.color.helper : theme.color.parent;
  const roleAccentSoft = isHelper ? theme.color.helperSoft : theme.color.parentSoft;
  const STATUS_VISUAL: Record<string, { bg: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
    Pending: { bg: theme.color.warning, icon: "time" },
    Verified: { bg: theme.color.success, icon: "shield-checkmark" },
    Rejected: { bg: theme.color.danger, icon: "close-circle" },
    Unverified: { bg: theme.color.muted, icon: "ellipse-outline" },
  };
  const vsCfg = STATUS_VISUAL[vs] ?? STATUS_VISUAL.Unverified;
  const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ") || user.name || "—";
  const addressFull = [profile?.address, profile?.barangay, profile?.municipality, profile?.province].filter(Boolean).join(", ") || "—";
  const aiChecked = docList.some((d) => d?.ai_verification_status && d.ai_verification_status !== "Unchecked");

  return (
    <View style={st.panel}>
      <NotificationModal
        visible={notification.visible} type={notification.type} title={notification.title}
        message={notification.message} actionLabel={notification.actionLabel} onAction={notification.onAction} onClose={closeNotif}
      />

      {/* Header */}
      <View style={st.header}>
        <View style={[st.avatarRing, { backgroundColor: roleAccentSoft, borderColor: roleAccent + "55" }]}>
          {profile?.profile_image ? <Image source={{ uri: profile.profile_image }} style={st.avatarImg} />
            : <Ionicons name={isHelper ? "person" : "people"} size={28} color={roleAccent} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.name} numberOfLines={1}>{fullName}</Text>
          <View style={st.chipRow}>
            <View style={[st.roleChip, { backgroundColor: roleAccentSoft }]}>
              <Ionicons name={isHelper ? "briefcase" : "people"} size={11} color={roleAccent} />
              <Text style={[st.roleChipText, { color: roleAccent }]}>{isHelper ? "Helper" : "Parent"}</Text>
            </View>
            {user.created_at && (
              <Text style={st.joined}>Joined {new Date(user.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</Text>
            )}
          </View>
        </View>
        <View style={[st.statusPill, { backgroundColor: vsCfg.bg }]}>
          <Ionicons name={vsCfg.icon} size={12} color="#fff" />
          <Text style={st.statusPillText}>{vs}</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} hitSlop={8} style={st.closeBtn}><Ionicons name="close" size={20} color={theme.color.muted} /></TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={st.tabsRow}>
        {([["overview", "Overview"], ["documents", `Documents (${docList.length})`], ["jobs", "Jobs Posted"]] as [TabKey, string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={[st.tab, tab === key && st.tabActive]} onPress={() => setTab(key)} activeOpacity={0.8}>
            <Text style={[st.tabText, tab === key && st.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            {vs === "Pending" && approvalBlockReason !== "" && (
              <View style={st.noticeBox}>
                <Ionicons name="information-circle" size={16} color={theme.color.warning} />
                <Text style={st.noticeText}>{approvalBlockReason}</Text>
              </View>
            )}

            <Section title="Personal Information" icon="person-circle-outline">
              <InfoGrid items={[
                { label: "Full Name", value: fullName },
                { label: "Email Address", value: user.email || "—" },
                { label: "Phone Number", value: profile?.contact_number || "—" },
                { label: "Date of Birth", value: profile?.birth_date || "—" },
                { label: "Gender", value: profile?.gender || "—" },
                { label: "Civil Status", value: profile?.civil_status || "—" },
                { label: "Religion", value: profile?.religion || "—" },
              ]} />
              <View style={st.addressRow}>
                <Ionicons name="location-outline" size={15} color={theme.color.peso} />
                <View style={{ flex: 1 }}>
                  <Text style={st.infoLabel}>Address</Text>
                  <Text style={st.infoValue}>{addressFull}</Text>
                </View>
              </View>
            </Section>

            {isHelper ? (
              <>
                <Section title="Work Information" icon="briefcase-outline">
                  <InfoGrid items={[
                    { label: "Employment Type", value: profile?.employment_type || "—" },
                    { label: "Work Schedule", value: profile?.work_schedule || "—" },
                    { label: "Expected Salary", value: profile?.expected_salary ? `₱${profile.expected_salary} / ${profile.salary_period || "month"}` : "—" },
                    { label: "Experience", value: profile?.experience_years ? `${profile.experience_years} years` : "—" },
                    { label: "Education", value: profile?.education_level || "—" },
                  ]} />
                </Section>
                <Section title="Specialties" icon="star-outline">
                  <TagBlock label="Job roles" tags={jobsByCategory.flatMap((g) => g.titles)} accent={theme.color.helper} accentSoft={theme.color.helperSoft} />
                  <TagBlock label="Skills" tags={helperSpecialties?.skills ?? []} accent={theme.color.peso} accentSoft={theme.color.pesoSoft} />
                  <TagBlock label="Languages" tags={helperSpecialties?.languages ?? []} accent={theme.color.info} accentSoft={theme.color.infoSoft} />
                </Section>
              </>
            ) : (
              <Section title="Household Information" icon="home-outline">
                <InfoGrid items={[
                  { label: "Housing Type", value: parentHousehold?.household_type ? formatParentHouseholdType(parentHousehold.household_type) : "—" },
                  { label: "Household Size", value: String(parentHousehold?.household_size ?? "—") },
                  { label: "Has Children", value: parentHousehold ? (parentHousehold.has_children ? "Yes" : "No") : "—" },
                  { label: "Has Elderly", value: parentHousehold ? (parentHousehold.has_elderly ? "Yes" : "No") : "—" },
                  { label: "Has Pets", value: parentHousehold ? (parentHousehold.has_pets ? "Yes" : "No") : "—" },
                ]} />
              </Section>
            )}
          </>
        )}

        {/* ── DOCUMENTS ── */}
        {tab === "documents" && (
          <>
            <View style={st.docHeaderRow}>
              <Text style={st.sectionTitle}>Documents Submitted</Text>
              {aiChecked && (
                <View style={st.aiBadge}>
                  <Ionicons name="sparkles" size={11} color={theme.color.success} />
                  <Text style={st.aiBadgeText}>AI Pre-Verification Completed</Text>
                </View>
              )}
            </View>

            {docList.length === 0 ? (
              <View style={st.emptyBox}><Ionicons name="document-outline" size={40} color={theme.color.subtle} /><Text style={st.muted}>No documents uploaded yet</Text></View>
            ) : docList.map((doc) => {
              const isPending = doc.status === "Pending", isVerified = doc.status === "Verified", isRejected = doc.status === "Rejected";
              const sBg = isVerified ? theme.color.successSoft : isRejected ? theme.color.dangerSoft : theme.color.warningSoft;
              const sText = isVerified ? theme.color.success : isRejected ? theme.color.danger : theme.color.warning;
              const legit = doc.ai_legitimacy_score != null ? Math.round(Number(doc.ai_legitimacy_score)) : null;
              const clarity = doc.ai_confidence_score != null ? Math.round(Number(doc.ai_confidence_score)) : null;
              return (
                <View key={doc.document_id} style={[st.docCard, { borderColor: sText + "33" }]}>
                  <View style={st.docTop}>
                    <View style={[st.docIcon, { backgroundColor: sBg }]}>
                      <Ionicons name={DOC_ICONS[doc.document_type] ?? "document-outline"} size={20} color={sText} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.docTitle}>{doc.document_type}</Text>
                      {!!doc.id_type && <Text style={st.docSub}>{doc.id_type}</Text>}
                      <Text style={st.docDate}>Uploaded {new Date(doc.uploaded_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}</Text>
                    </View>
                    <View style={[st.docStatusPill, { backgroundColor: sBg }]}>
                      <Ionicons name={isVerified ? "checkmark-circle" : isRejected ? "close-circle" : "time"} size={12} color={sText} />
                      <Text style={[st.docStatusText, { color: sText }]}>{doc.status}</Text>
                    </View>
                  </View>

                  {(legit != null || clarity != null) && (
                    <View style={st.scoreRow}>
                      {legit != null && (
                        <View style={[st.scoreBox, { backgroundColor: theme.color.successSoft }]}>
                          <Text style={st.scoreLabel}>Legitimacy</Text>
                          <Text style={[st.scoreVal, { color: scoreColor(legit) }]}>{legit}%</Text>
                          <Text style={st.scoreTag}>{legitLabel(legit)}</Text>
                        </View>
                      )}
                      {clarity != null && (
                        <View style={[st.scoreBox, { backgroundColor: theme.color.pesoSoft }]}>
                          <Text style={st.scoreLabel}>Clarity</Text>
                          <Text style={[st.scoreVal, { color: scoreColor(clarity) }]}>{clarity}%</Text>
                          <Text style={st.scoreTag}>{clarityLabel(clarity)}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {Array.isArray(doc.ai_fields) && doc.ai_fields.length > 0 && (
                    <View style={st.exBox}>
                      <Text style={st.exTitle}>AI-Extracted Details</Text>
                      {doc.ai_fields.map((f: any, i: number) => (
                        f?.label && f?.value ? (
                          <View key={`${f.label}-${i}`} style={st.exRow}>
                            <Text style={st.exLabel}>{f.label}</Text>
                            <Text style={st.exValue} numberOfLines={2}>{String(f.value)}</Text>
                          </View>
                        ) : null
                      ))}
                    </View>
                  )}

                  <View style={st.docActions}>
                    <TouchableOpacity style={st.docViewBtn} onPress={() => { setViewBack(false); setViewingDocument(doc); }} activeOpacity={0.8}>
                      <Ionicons name="eye-outline" size={15} color={theme.color.info} /><Text style={st.docViewText}>{doc.file_url_back ? 'Front' : 'View'}</Text>
                    </TouchableOpacity>
                    {!!doc.file_url_back && (
                      <TouchableOpacity style={st.docViewBtn} onPress={() => { setViewBack(true); setViewingDocument(doc); }} activeOpacity={0.8}>
                        <Ionicons name="eye-outline" size={15} color={theme.color.info} /><Text style={st.docViewText}>Back</Text>
                      </TouchableOpacity>
                    )}
                    {isPending && (
                      <>
                        <TouchableOpacity style={st.docApprove} onPress={() => handleApproveDocument(doc)} activeOpacity={0.85}>
                          <Ionicons name="checkmark-circle-outline" size={15} color="#fff" /><Text style={st.docActionText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={st.docReject} onPress={() => { setRejectingDocument(doc); setRejectReason(""); setRejectDocModal(true); }} activeOpacity={0.85}>
                          <Ionicons name="close-circle-outline" size={15} color="#fff" /><Text style={st.docActionText}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {isRejected && doc.rejection_reason && (
                    <View style={st.docNote}><Ionicons name="information-circle-outline" size={13} color={theme.color.danger} /><Text style={st.docNoteText}>Reason: {doc.rejection_reason}</Text></View>
                  )}
                </View>
              );
            })}

            {aiChecked && docList.length > 0 && (
              <View style={st.aiSummary}>
                <View style={st.aiSummaryHead}>
                  <Ionicons name="shield-checkmark" size={16} color={theme.color.peso} />
                  <Text style={st.aiSummaryTitle}>AI Verification Summary</Text>
                </View>
                <Text style={st.aiSummarySub}>Our AI analyzed the submitted documents and extracted key information.</Text>
                {[
                  "All required documents are present",
                  "Information was read from each document",
                  docList.some((d) => (d.ai_warnings ?? []).length > 0) ? "Some documents were flagged for review" : "No signs of tampering detected",
                ].map((t, i) => (
                  <View key={i} style={st.aiCheck}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.color.success} /><Text style={st.aiCheckText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── JOBS POSTED ── */}
        {tab === "jobs" && (
          isHelper ? (
            <View style={st.emptyBox}><Ionicons name="briefcase-outline" size={40} color={theme.color.subtle} /><Text style={st.muted}>Helpers don’t post jobs.</Text></View>
          ) : parentJobsLoading ? (
            <View style={st.emptyBox}><ActivityIndicator size="small" color={theme.color.peso} /><Text style={st.muted}>Loading job posts…</Text></View>
          ) : parentJobs.length === 0 ? (
            <View style={st.emptyBox}><Ionicons name="briefcase-outline" size={40} color={theme.color.subtle} /><Text style={st.muted}>No job posts yet.</Text></View>
          ) : parentJobs.map((job) => {
            const isPendingJob = job.status === "Pending", isApproved = job.status === "Open", isRejectedJob = job.status === "Rejected";
            const jBg = isApproved ? theme.color.successSoft : isRejectedJob ? theme.color.dangerSoft : theme.color.warningSoft;
            const jText = isApproved ? theme.color.success : isRejectedJob ? theme.color.danger : theme.color.warning;
            const isProc = processingJobId === job.job_post_id;
            return (
              <View key={String(job.job_post_id)} style={[st.docCard, { borderColor: jText + "33" }]}>
                <View style={st.docTop}>
                  <View style={[st.docIcon, { backgroundColor: jBg }]}><Ionicons name="briefcase" size={18} color={jText} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.docTitle} numberOfLines={2}>{job.title}</Text>
                    <Text style={st.docSub}>{job.custom_category || job.category_name || "General"}</Text>
                    <Text style={st.docDate}>Posted {new Date(job.posted_at).toLocaleDateString("en-PH", { dateStyle: "medium" })} · ₱{Number(job.salary_offered).toLocaleString()}/{job.salary_period}</Text>
                  </View>
                  <View style={[st.docStatusPill, { backgroundColor: jBg }]}>
                    <Ionicons name={isApproved ? "checkmark-circle" : isRejectedJob ? "close-circle" : "time"} size={12} color={jText} />
                    <Text style={[st.docStatusText, { color: jText }]}>{isApproved ? "Approved" : job.status}</Text>
                  </View>
                </View>
                {isPendingJob && (
                  <View style={st.docActions}>
                    <TouchableOpacity style={[st.docApprove, isProc && { opacity: 0.6 }]} onPress={() => !isProc && handleApproveJob(job)} disabled={isProc} activeOpacity={0.85}>
                      {isProc ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={15} color="#fff" /><Text style={st.docActionText}>Approve</Text></>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.docReject, isProc && { opacity: 0.6 }]} onPress={() => { if (!isProc) { setRejectingJob(job); setRejectJobReason(""); setRejectJobModal(true); } }} disabled={isProc} activeOpacity={0.85}>
                      <Ionicons name="close-circle-outline" size={15} color="#fff" /><Text style={st.docActionText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isRejectedJob && job.rejection_reason && (
                  <View style={st.docNote}><Ionicons name="information-circle-outline" size={13} color={theme.color.danger} /><Text style={st.docNoteText}>Reason: {job.rejection_reason}</Text></View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Footer actions */}
      {vs === "Pending" && (
        <View style={st.footer}>
          <TouchableOpacity style={st.infoBtn} onPress={requestMoreInfo} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.color.ink} /><Text style={st.infoBtnText}>Request More Info</Text>
          </TouchableOpacity>
          <View style={st.footerRow}>
            <TouchableOpacity style={st.rejectBtn} onPress={() => { setRejectReason(""); setRejectUserModal(true); }} disabled={processing} activeOpacity={0.85}>
              <Ionicons name="close-circle-outline" size={16} color={theme.color.danger} /><Text style={st.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.approveBtn, !canApproveUser && { opacity: 0.5 }]} onPress={handleApproveUser} disabled={processing || !canApproveUser} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={st.approveBtnText} numberOfLines={1}>{processing ? "Processing…" : "Approve"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Document viewer */}
      <Modal visible={!!viewingDocument} animationType="fade" transparent>
        <View style={st.overlay}>
          <View style={st.viewerBox}>
            <View style={st.viewerHead}>
              <Text style={st.viewerTitle}>{viewingDocument?.document_type}{viewBack ? ' — Back' : viewingDocument?.file_url_back ? ' — Front' : ''}</Text>
              <TouchableOpacity onPress={() => setViewingDocument(null)} hitSlop={10}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </View>
            {viewingDocument?.file_path?.toLowerCase().endsWith(".pdf") ? (
              <View style={st.viewerPdf}><Ionicons name="document-text" size={64} color={theme.color.info} /><Text style={st.viewerPdfText}>PDF Document — open in a browser to view</Text></View>
            ) : (
              <Image source={{ uri: viewBack ? viewingDocument?.file_url_back : viewingDocument?.file_url }} style={st.viewerImg} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

      {/* Reject modals */}
      <Modal visible={rejectUserModal} animationType="slide" transparent>
        <RejectModal title="Reject Account" subtitle={`Reject ${user.first_name ?? "this user"}'s account?`} value={rejectReason} onChange={setRejectReason}
          presets={["ID does not match the details provided", "Submitted documents are unclear or unreadable", "Information is incomplete or inconsistent", "Suspected fake or invalid credentials", "Duplicate account"]}
          onCancel={() => { setRejectUserModal(false); setRejectReason(""); }} onConfirm={handleRejectUser} processing={processing} />
      </Modal>
      <Modal visible={rejectDocModal} animationType="slide" transparent>
        <RejectModal title="Reject Document" subtitle={`Rejecting: ${rejectingDocument?.document_type ?? "document"}`} value={rejectReason} onChange={setRejectReason}
          presets={["Image is blurry or unreadable", "Document is expired", "Wrong document type uploaded", "Details don't match the profile", "Photo is cropped or incomplete"]}
          onCancel={() => { setRejectDocModal(false); setRejectingDocument(null); setRejectReason(""); }} onConfirm={handleRejectDocument} processing={processing} />
      </Modal>
      <Modal visible={rejectJobModal} animationType="slide" transparent>
        <RejectModal title="Reject Job Post" subtitle={`Rejecting: "${rejectingJob?.title ?? "job post"}"`} value={rejectJobReason} onChange={setRejectJobReason}
          presets={["Salary is below the legal minimum", "Job description is unclear or incomplete", "Requirements appear discriminatory", "Suspected fraudulent posting", "Duties are outside domestic work"]}
          onCancel={() => { setRejectJobModal(false); setRejectingJob(null); setRejectJobReason(""); }} onConfirm={handleRejectJob} processing={processingJobId !== null} />
      </Modal>
    </View>
  );
}

// ── small components ──
function Section({ title, icon, children }: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; children: React.ReactNode }) {
  return (
    <View style={st.section}>
      <View style={st.sectionHead}>
        <View style={st.sectionIcon}><Ionicons name={icon} size={15} color={theme.color.peso} /></View>
        <Text style={st.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={st.grid}>
      {items.map((it) => (
        <View key={it.label} style={st.gridItem}>
          <Text style={st.infoLabel}>{it.label}</Text>
          <Text style={st.infoValue}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

function TagBlock({ label, tags, accent, accentSoft }: { label: string; tags: string[]; accent: string; accentSoft: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={st.subLabel}>{label}</Text>
      {tags.length ? (
        <View style={st.tagsRow}>
          {tags.map((t) => <View key={t} style={[st.tag, { backgroundColor: accentSoft }]}><Text style={[st.tagText, { color: accent }]}>{t}</Text></View>)}
        </View>
      ) : <Text style={st.muted}>None listed</Text>}
    </View>
  );
}

function RejectModal({ title, subtitle, value, onChange, onCancel, onConfirm, processing, presets = [] }: {
  title: string; subtitle: string; value: string; onChange: (v: string) => void; onCancel: () => void; onConfirm: () => void; processing: boolean; presets?: string[];
}) {
  // Tapping a preset fills the box (and stays editable). Appends when the officer
  // wants to combine a few; removes on second tap so it works like a toggle.
  const applyPreset = (p: string) => {
    const parts = value.split('\n').map((s) => s.trim()).filter(Boolean);
    if (parts.includes(p)) onChange(parts.filter((s) => s !== p).join('\n'));
    else onChange([...parts, p].join('\n'));
  };
  return (
    <View style={st.overlay}>
      <View style={st.rejectBox}>
        <View style={st.rejectIcon}><Ionicons name="warning-outline" size={28} color={theme.color.danger} /></View>
        <Text style={st.rejectTitle}>{title}</Text>
        <Text style={st.rejectSub}>{subtitle}</Text>
        {presets.length > 0 && (
          <>
            <Text style={st.rejectPresetLabel}>Tap a common reason, or write your own:</Text>
            <View style={st.rejectChips}>
              {presets.map((p) => {
                const active = value.split('\n').map((s) => s.trim()).includes(p);
                return (
                  <TouchableOpacity key={p} style={[st.rejectChip, active && st.rejectChipActive]} onPress={() => applyPreset(p)} activeOpacity={0.8}>
                    {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                    <Text style={[st.rejectChipText, active && st.rejectChipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
        <TextInput style={st.rejectInput} placeholder="Enter reason…" placeholderTextColor={theme.color.subtle} value={value} onChangeText={onChange} multiline numberOfLines={4} textAlignVertical="top" />
        <View style={st.rejectBtns}>
          <TouchableOpacity style={st.cancelBtn} onPress={onCancel} activeOpacity={0.8}><Text style={st.cancelText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[st.confirmReject, processing && { opacity: 0.6 }]} onPress={onConfirm} disabled={processing} activeOpacity={0.85}>
            <Text style={st.confirmRejectText}>{processing ? "…" : "Reject"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  panel: { flex: 1, backgroundColor: theme.color.surfaceElevated },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  muted: { color: theme.color.muted, fontSize: 13, fontWeight: "600", textAlign: "center" },
  errTitle: { fontSize: 16, fontWeight: "800", color: theme.color.ink, textAlign: "center" },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.line },
  retryText: { fontWeight: "800", color: theme.color.ink },

  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  avatarRing: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  name: { fontSize: 17, fontWeight: "900", color: theme.color.ink },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  roleChipText: { fontSize: 11, fontWeight: "800" },
  joined: { fontSize: 11, color: theme.color.muted, fontWeight: "600" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusPillText: { color: "#fff", fontSize: 11.5, fontWeight: "800" },
  closeBtn: { padding: 4 },

  tabsRow: { flexDirection: "row", paddingHorizontal: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  tab: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: theme.color.peso },
  tabText: { fontSize: 13.5, fontWeight: "700", color: theme.color.muted },
  tabTextActive: { color: theme.color.peso },

  scroll: { padding: 16, paddingBottom: 24 },

  noticeBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.color.warningSoft, borderRadius: theme.radius.md, padding: 11, marginBottom: 14 },
  noticeText: { flex: 1, fontSize: 12, color: theme.color.inkMuted, fontWeight: "600", lineHeight: 17 },

  section: { backgroundColor: theme.color.surface, borderRadius: theme.radius.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.color.line },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.color.pesoSoft, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: theme.color.ink },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridItem: { width: "50%", paddingVertical: 7, paddingRight: 8 },
  infoLabel: { fontSize: 11, color: theme.color.muted, fontWeight: "700", marginBottom: 2 },
  infoValue: { fontSize: 13.5, color: theme.color.ink, fontWeight: "600" },
  addressRow: { flexDirection: "row", gap: 8, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.color.line },

  subLabel: { fontSize: 12, fontWeight: "800", color: theme.color.muted, marginBottom: 6 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: "700" },

  docHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: theme.color.successSoft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  aiBadgeText: { fontSize: 11, fontWeight: "800", color: theme.color.success },

  docCard: { borderWidth: 1, borderRadius: theme.radius.lg, padding: 13, marginBottom: 12, backgroundColor: theme.color.surface },
  docTop: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  docIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  docTitle: { fontSize: 14, fontWeight: "800", color: theme.color.ink },
  docSub: { fontSize: 11.5, color: theme.color.muted, fontWeight: "600", marginTop: 1 },
  docDate: { fontSize: 11, color: theme.color.subtle, marginTop: 2 },
  docStatusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  docStatusText: { fontSize: 11, fontWeight: "800" },

  scoreRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  scoreBox: { flex: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10 },
  scoreLabel: { fontSize: 10.5, fontWeight: "700", color: theme.color.muted },
  scoreVal: { fontSize: 19, fontWeight: "900", marginTop: 1 },
  scoreTag: { fontSize: 10.5, fontWeight: "700", color: theme.color.muted },

  docActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  docViewBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.color.info + "55" },
  docViewText: { fontSize: 12.5, fontWeight: "800", color: theme.color.info },
  docApprove: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: theme.color.success },
  docReject: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: theme.color.danger },
  docActionText: { color: "#fff", fontSize: 12.5, fontWeight: "800" },
  docNote: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 10, backgroundColor: theme.color.dangerSoft, borderRadius: 8, padding: 8 },
  docNoteText: { flex: 1, fontSize: 11.5, color: theme.color.danger, fontWeight: "600" },

  aiSummary: { backgroundColor: theme.color.pesoSoft, borderRadius: theme.radius.lg, padding: 14, marginTop: 4 },
  aiSummaryHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiSummaryTitle: { fontSize: 13.5, fontWeight: "800", color: theme.color.ink },
  aiSummarySub: { fontSize: 12, color: theme.color.inkMuted, marginTop: 4, marginBottom: 8, lineHeight: 17 },
  aiCheck: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 3 },
  aiCheckText: { fontSize: 12.5, color: theme.color.ink, fontWeight: "600" },

  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 10 },

  footer: { gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: theme.color.line, backgroundColor: theme.color.surfaceElevated },
  footerRow: { flexDirection: "row", gap: 8 },
  infoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: theme.color.line },
  infoBtnText: { fontSize: 12.5, fontWeight: "800", color: theme.color.ink },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 11, borderWidth: 1.5, borderColor: theme.color.danger + "55" },
  rejectBtnText: { fontSize: 13, fontWeight: "800", color: theme.color.danger },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 11, backgroundColor: theme.color.success },
  approveBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },

  exBox: { marginTop: 12, backgroundColor: theme.color.surfaceElevated, borderRadius: 10, padding: 11, borderWidth: 1, borderColor: theme.color.line },
  exTitle: { fontSize: 11, fontWeight: "800", color: theme.color.muted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 7 },
  exRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.line },
  exLabel: { fontSize: 12, color: theme.color.muted, fontWeight: "600", flexShrink: 0, maxWidth: "45%" },
  exValue: { fontSize: 12.5, color: theme.color.ink, fontWeight: "700", flex: 1, textAlign: "right" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 20 },
  viewerBox: { width: "100%", maxWidth: 560, backgroundColor: "#111", borderRadius: theme.radius.lg, overflow: "hidden" },
  viewerHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  viewerTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  viewerImg: { width: "100%", height: 440, backgroundColor: "#000" },
  viewerPdf: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  viewerPdfText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  rejectBox: { width: "100%", maxWidth: 400, backgroundColor: theme.color.surfaceElevated, borderRadius: theme.radius.lg, padding: 22, alignItems: "center" },
  rejectIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.color.dangerSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  rejectTitle: { fontSize: 17, fontWeight: "900", color: theme.color.ink },
  rejectSub: { fontSize: 13, color: theme.color.muted, textAlign: "center", marginTop: 4, marginBottom: 14 },
  rejectPresetLabel: { alignSelf: "stretch", fontSize: 12, fontWeight: "700", color: theme.color.muted, marginBottom: 8 },
  rejectChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, alignSelf: "stretch", marginBottom: 12 },
  rejectChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: theme.color.line, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: theme.color.surface },
  rejectChipActive: { backgroundColor: theme.color.danger, borderColor: theme.color.danger },
  rejectChipText: { fontSize: 12, fontWeight: "600", color: theme.color.ink },
  rejectChipTextActive: { color: "#fff" },
  rejectInput: { alignSelf: "stretch", minHeight: 90, borderWidth: 1, borderColor: theme.color.line, borderRadius: theme.radius.md, padding: 12, fontSize: 13.5, color: theme.color.ink, backgroundColor: theme.color.surface },
  rejectBtns: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 11, borderWidth: 1, borderColor: theme.color.line, alignItems: "center" },
  cancelText: { fontSize: 13.5, fontWeight: "800", color: theme.color.ink },
  confirmReject: { flex: 1, paddingVertical: 12, borderRadius: 11, backgroundColor: theme.color.danger, alignItems: "center" },
  confirmRejectText: { fontSize: 13.5, fontWeight: "800", color: "#fff" },
});
