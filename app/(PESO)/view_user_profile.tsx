// app/(peso)/view_user_profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import NotificationModal from "../../components/peso/NotificationModal";
import API_URL from "../../constants/api";
import { theme } from "@/constants/theme";
import { formatParentHouseholdType } from "@/constants/parentHousehold";

const DOC_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  "Valid ID":          "card-outline",
  "Barangay Clearance":"home-outline",
  "Police Clearance":  "shield-outline",
  "NBI Clearance":     "document-text-outline",
};

export default function ViewUserProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userIdParam   = Array.isArray(params.user_id)   ? params.user_id[0]   : params.user_id;
  const userTypeParam = Array.isArray(params.user_type) ? params.user_type[0] : params.user_type;

  const [verifierId, setVerifierId]   = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);
  const [userData, setUserData]       = useState<any>(null);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [rejectUserModal, setRejectUserModal] = useState(false);
  const [rejectDocModal, setRejectDocModal]   = useState(false);
  const [rejectReason, setRejectReason]       = useState("");
  const [rejectingDocument, setRejectingDocument] = useState<any>(null);
  const [processing, setProcessing]   = useState(false);

  const [notification, setNotification] = useState({
    visible: false,
    type: "success" as "success" | "error" | "warning" | "info",
    title: "",
    message: "",
    onAction: undefined as (() => void) | undefined,
    actionLabel: undefined as string | undefined,
  });

  // ── parent job posts ────────────────────────────────────────────────────
  const [parentJobs, setParentJobs]             = useState<any[]>([]);
  const [parentJobsLoading, setParentJobsLoading] = useState(false);
  const [processingJobId, setProcessingJobId]   = useState<number | null>(null);
  const [rejectJobModal, setRejectJobModal]      = useState(false);
  const [rejectJobReason, setRejectJobReason]   = useState("");
  const [rejectingJob, setRejectingJob]         = useState<any>(null);

  // ─── always-computed derived state (never conditional) ───────────────────
  const user             = userData?.user             ?? ({} as any);
  const profile          = userData?.profile          ?? ({} as any);
  const docList          = (userData?.documents       ?? []) as any[];
  const helperSpecialties = userData?.helper_specialties ?? null;
  const parentHousehold  = userData?.parent_household ?? null;
  const parentChildren   = userData?.parent_children  ?? [];
  const parentElderly    = userData?.parent_elderly   ?? [];

  const jobsByCategory = useMemo(() => {
    const jobs = (helperSpecialties?.jobs ?? []) as Array<{ title?: string; category?: string }>;
    const map  = new Map<string, string[]>();
    for (const j of jobs) {
      const cat   = (j?.category || "Other").trim() || "Other";
      const title = (j?.title    || "").trim();
      if (!title) continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(title);
    }
    return Array.from(map.entries())
      .map(([category, titles]) => ({
        category,
        titles: Array.from(new Set(titles)).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [helperSpecialties]);

  const hasRejectedDoc  = useMemo(() => docList.some((d: any) => d?.status === "Rejected"), [docList]);
  const hasPendingDoc   = useMemo(() => docList.some((d: any) => d?.status === "Pending"),  [docList]);
  const allDocsVerified = useMemo(
    () => docList.length > 0 && docList.every((d: any) => d?.status === "Verified"),
    [docList]
  );

  const approvalBlockReason = hasRejectedDoc
    ? "One or more documents were rejected. The applicant must re-upload before this account can be approved."
    : hasPendingDoc
    ? "Some documents are still pending. Approve or reject each document first."
    : docList.length === 0
    ? "No documents on file. The applicant must upload required documents."
    : !allDocsVerified
    ? "All submitted documents must be marked Verified before account approval."
    : "";

  const canApproveUser =
    profile?.verification_status === "Pending" && docList.length > 0 && allDocsVerified;

  // ─── init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user_data");
        if (raw) {
          const parsed = JSON.parse(raw);
          const id     = parsed?.user_id ? Number(parsed.user_id) : null;
          setVerifierId(Number.isFinite(id) ? id : null);
        }
      } catch {}
    })();
    fetchUserDetails();
  }, []);

  // Fetch parent's job posts whenever userData is loaded and user is a parent
  useEffect(() => {
    if (userData && userData.user?.user_type === "parent" && userIdParam) {
      fetchParentJobs();
    }
  }, [userData]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setUserData(null);
      if (!userIdParam) { setLoadError("Missing user id."); return; }
      const typeQ = userTypeParam
        ? `&user_type=${encodeURIComponent(String(userTypeParam))}`
        : "";
      const res  = await fetch(
        `${API_URL}/peso/get_user_details.php?user_id=${encodeURIComponent(String(userIdParam))}${typeQ}`
      );
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.success) setUserData(data.data);
      else { setLoadError(data.message || "Failed to load user"); showNotif("error", "Error", data.message || "Failed to load user"); }
    } catch {
      setLoadError("Network error. Please try again.");
      showNotif("error", "Error", "Network error. Please try again.");
    } finally { setLoading(false); }
  };

  const fetchParentJobs = async () => {
    try {
      setParentJobsLoading(true);
      const res  = await fetch(`${API_URL}/peso/get_jobs_for_verification.php?parent_id=${encodeURIComponent(String(userIdParam))}`);
      const data = await res.json();
      if (data.success) setParentJobs(data.data ?? []);
    } catch { /* silent – jobs section just stays empty */ }
    finally  { setParentJobsLoading(false); }
  };

  const handleApproveJob = (job: any) => {
    showNotif(
      "info",
      "Approve Job Post",
      `Approve "${job.title}"? It will become visible to helpers.`,
      "Approve",
      async () => {
        try {
          setProcessingJobId(job.job_post_id);
          const res  = await fetch(`${API_URL}/peso/update_job_status.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_post_id: job.job_post_id, status: "Open", verified_by: verifierId }),
          });
          const data = await res.json();
          if (data.success) {
            setParentJobs((prev) =>
              prev.map((j) => j.job_post_id === job.job_post_id ? { ...j, status: "Open" } : j)
            );
            showNotif("success", "Job Approved", "This job post is now live for helpers.");
          } else {
            showNotif("error", "Failed", data.message || "Failed to approve job.");
          }
        } catch { showNotif("error", "Error", "Network error occurred."); }
        finally   { setProcessingJobId(null); }
      }
    );
  };

  const handleRejectJob = async () => {
    if (!rejectJobReason.trim()) { showNotif("warning", "Reason required", "Please provide a rejection reason."); return; }
    try {
      setProcessingJobId(rejectingJob.job_post_id);
      const res  = await fetch(`${API_URL}/peso/update_job_status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: rejectingJob.job_post_id, status: "Rejected", reason: rejectJobReason, verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setParentJobs((prev) =>
          prev.map((j) => j.job_post_id === rejectingJob.job_post_id ? { ...j, status: "Rejected", rejection_reason: rejectJobReason } : j)
        );
        setRejectJobModal(false);
        setRejectingJob(null);
        setRejectJobReason("");
        showNotif("success", "Job Rejected", "The parent will be notified to revise their posting.");
      } else {
        showNotif("error", "Failed", data.message || "Failed to reject job.");
      }
    } catch { showNotif("error", "Error", "Network error occurred."); }
    finally   { setProcessingJobId(null); }
  };

  // ─── helpers ──────────────────────────────────────────────────────────────
  const showNotif = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => setNotification({ visible: true, type, title, message, actionLabel, onAction });

  const closeNotif = () => setNotification((p) => ({ ...p, visible: false }));

  // ─── actions ──────────────────────────────────────────────────────────────
  const handleApproveUser = () => {
    if (processing) return;
    if (!canApproveUser) { showNotif("warning", "Cannot approve yet", approvalBlockReason); return; }
    showNotif(
      "warning",
      "Verify Account",
      "Are you sure you want to approve this account? This will mark them as PESO Verified.",
      "Approve",
      async () => {
        try {
          setProcessing(true);
          const res  = await fetch(`${API_URL}/peso/verify_user.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userIdParam, action: "approve", verified_by: verifierId }),
          });
          const data = await res.json();
          if (data.success) {
            setUserData((prev: any) =>
              prev ? { ...prev, profile: { ...(prev.profile ?? {}), verification_status: "Verified" } } : prev
            );
            showNotif("success", "Account Approved!", "This user is now PESO Verified.", "Back to List", () => router.back());
          } else {
            showNotif("error", "Failed", data.message || "Failed to approve account.");
          }
        } catch { showNotif("error", "Error", "Network error occurred."); }
        finally   { setProcessing(false); }
      }
    );
  };

  const handleRejectUser = async () => {
    if (!rejectReason.trim()) { showNotif("warning", "Missing reason", "Please provide a rejection reason."); return; }
    try {
      setProcessing(true);
      const res  = await fetch(`${API_URL}/peso/verify_user.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userIdParam, action: "reject", reason: rejectReason, verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectUserModal(false);
        setRejectReason("");
        showNotif("success", "Account Rejected", "The account has been rejected.", "Back to List", () => router.back());
      } else { showNotif("error", "Failed", data.message || "Failed to reject account."); }
    } catch { showNotif("error", "Error", "Network error occurred."); }
    finally   { setProcessing(false); }
  };

  const handleApproveDocument = (doc: any) => {
    showNotif(
      "info",
      "Approve Document",
      `Approve "${doc.document_type}"?`,
      "Approve",
      async () => {
        try {
          const res  = await fetch(`${API_URL}/peso/verify_document.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ document_id: doc.document_id, action: "approve", verified_by: verifierId }),
          });
          const data = await res.json();
          if (data.success) { showNotif("success", "Document Approved", "Document marked as verified."); fetchUserDetails(); }
          else               showNotif("error", "Failed", data.message || "Failed to approve document.");
        } catch { showNotif("error", "Error", "Network error occurred."); }
      }
    );
  };

  const handleRejectDocument = async () => {
    if (!rejectReason.trim()) { showNotif("warning", "Missing reason", "Please provide a rejection reason."); return; }
    try {
      const res  = await fetch(`${API_URL}/peso/verify_document.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: rejectingDocument.document_id, action: "reject", reason: rejectReason, verified_by: verifierId }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectDocModal(false);
        setRejectingDocument(null);
        setRejectReason("");
        showNotif("success", "Document Rejected", "Document has been rejected.");
        fetchUserDetails();
      } else { showNotif("error", "Failed", data.message || "Failed to reject document."); }
    } catch { showNotif("error", "Error", "Network error occurred."); }
  };

  // ─── loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator size="large" color={theme.color.peso} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.fullCenter}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.color.subtle} />
        <Text style={styles.errorTitle}>{loadError ?? "User not found"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchUserDetails}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── status config ────────────────────────────────────────────────────────
  const vs = profile?.verification_status ?? "Unverified";
  const isHelper = user.user_type === "helper";
  const roleAccent = isHelper ? theme.color.helper : theme.color.parent;
  const roleAccentSoft = isHelper ? theme.color.helperSoft : theme.color.parentSoft;

  const vsCfg = {
    Pending:    { bg: theme.color.warning, icon: "time"               as const },
    Verified:   { bg: theme.color.success, icon: "shield-checkmark"   as const },
    Rejected:   { bg: theme.color.danger,  icon: "close-circle"       as const },
    Unverified: { bg: theme.color.muted,   icon: "ellipse-outline"    as const },
  }[vs] ?? { bg: theme.color.muted, icon: "ellipse-outline" as const };

  return (
    <View style={styles.container}>
      <NotificationModal
        visible={notification.visible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        actionLabel={notification.actionLabel}
        onAction={notification.onAction}
        onClose={closeNotif}
      />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={theme.color.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>User Profile</Text>
          <Text style={styles.headerSub}>Review &amp; Verify</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── CHECKLIST NOTICE BANNER ── */}
        {vs === "Pending" && (
          <View
            style={[
              styles.noticeBanner,
              hasRejectedDoc
                ? { backgroundColor: theme.color.dangerSoft, borderColor: theme.color.danger + "33" }
                : hasPendingDoc
                ? { backgroundColor: theme.color.warningSoft, borderColor: theme.color.warning + "33" }
                : canApproveUser
                ? { backgroundColor: theme.color.successSoft, borderColor: theme.color.success + "33" }
                : { backgroundColor: theme.color.infoSoft, borderColor: theme.color.info + "33" },
            ]}
          >
            <View
              style={[
                styles.noticeDot,
                {
                  backgroundColor: hasRejectedDoc
                    ? theme.color.danger
                    : hasPendingDoc
                    ? theme.color.warning
                    : canApproveUser
                    ? theme.color.success
                    : theme.color.info,
                },
              ]}
            >
              <Ionicons
                name={
                  hasRejectedDoc ? "alert-circle" :
                  hasPendingDoc  ? "hourglass-outline" :
                  canApproveUser ? "shield-checkmark" :
                  "information-circle"
                }
                size={18}
                color="#fff"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeBannerTitle, {
                color: hasRejectedDoc ? theme.color.danger : hasPendingDoc ? theme.color.warning : canApproveUser ? theme.color.success : theme.color.info
              }]}>
                {hasRejectedDoc  ? "Documents Rejected"    :
                 hasPendingDoc   ? "Documents Pending"     :
                 canApproveUser  ? "Ready to Approve"      : "Waiting for Documents"}
              </Text>
              <Text style={styles.noticeBannerBody}>
                {hasRejectedDoc  ? "One or more documents were rejected. The applicant must replace rejected files before this account can be approved." :
                 hasPendingDoc   ? "Review every document below — approve or reject — before you can approve the account." :
                 canApproveUser  ? "All documents are verified. You may approve this account when ready." :
                 "Waiting for the applicant to upload required documents."}
              </Text>
            </View>
          </View>
        )}

        {/* ── PROFILE CARD ── */}
        <View style={styles.profileCard}>
          {/* Avatar row */}
          <View style={styles.profileAvatarRow}>
            <View style={[styles.avatarRing, { backgroundColor: roleAccentSoft, borderColor: roleAccent + "55" }]}>
              {profile?.profile_image ? (
                <Image source={{ uri: profile.profile_image }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: roleAccentSoft }]}>
                  <Ionicons name={isHelper ? "person" : "people"} size={42} color={roleAccent} />
                </View>
              )}
            </View>

            <View style={styles.profileMeta}>
              <Text style={styles.profileName}>
                {[user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ")}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>

              <View style={styles.pillsRow}>
                <View style={[styles.pill, { backgroundColor: roleAccentSoft, borderColor: roleAccent + "44" }]}>
                  <Ionicons name={isHelper ? "briefcase-outline" : "people-outline"} size={12} color={roleAccent} />
                  <Text style={[styles.pillText, { color: roleAccent }]}>
                    {isHelper ? "Helper" : "Parent"}
                  </Text>
                </View>
                {user.created_at && (
                  <View style={styles.pillMuted}>
                    <Ionicons name="calendar-outline" size={12} color={theme.color.muted} />
                    <Text style={styles.pillMutedText}>
                      Joined {new Date(user.created_at).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Verification status banner */}
          <View style={[styles.vsBanner, { backgroundColor: vsCfg.bg }]}>
            <Ionicons name={vsCfg.icon} size={18} color="#fff" />
            <Text style={styles.vsBannerText}>{vs}</Text>
          </View>
        </View>

        {/* ── PERSONAL INFORMATION ── */}
        <SectionCard title="Personal Information" icon="person-circle-outline">
          <InfoRow label="Contact"      value={profile?.contact_number || "—"} />
          <InfoRow label="Birth Date"   value={profile?.birth_date     || "—"} />
          <InfoRow label="Gender"       value={profile?.gender         || "—"} />
          <InfoRow label="Civil Status" value={profile?.civil_status   || "—"} />
          <InfoRow label="Religion"     value={profile?.religion       || "—"} last />
        </SectionCard>

        {/* ── ADDRESS ── */}
        <SectionCard title="Address" icon="location-outline">
          <InfoRow label="Province"     value={profile?.province     || "—"} />
          <InfoRow label="Municipality" value={profile?.municipality || "—"} />
          <InfoRow label="Barangay"     value={profile?.barangay     || "—"} />
          <InfoRow label="Full Address" value={profile?.address      || "—"} />
          <InfoRow label="Landmark"     value={profile?.landmark     || "—"} />
          {profile?.latitude && profile?.longitude ? (
            <View style={styles.locationRow}>
              <View style={styles.locationCoords}>
                <Ionicons name="navigate-circle-outline" size={16} color={theme.color.peso} />
                <Text style={styles.locationText}>
                  GPS: {Number(profile.latitude).toFixed(5)}, {Number(profile.longitude).toFixed(5)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => {
                  const url = `https://www.openstreetmap.org/?mlat=${profile.latitude}&mlon=${profile.longitude}#map=16/${profile.latitude}/${profile.longitude}`;
                  Linking.openURL(url);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="map-outline" size={14} color="#fff" />
                <Text style={styles.mapBtnText}>View on Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <InfoRow label="GPS Location" value="Not set — user has not used location search" last />
          )}
        </SectionCard>

        {/* ── WORK INFORMATION (helpers) ── */}
        {isHelper && (
          <SectionCard title="Work Information" icon="briefcase-outline">
            <InfoRow label="Employment Type" value={profile?.employment_type || "—"} />
            <InfoRow label="Work Schedule"   value={profile?.work_schedule   || "—"} />
            <InfoRow label="Expected Salary" value={profile?.expected_salary ? `₱${profile.expected_salary} / ${profile.salary_period || "month"}` : "—"} />
            <InfoRow label="Experience"      value={profile?.experience_years ? `${profile.experience_years} years` : "—"} />
            <InfoRow label="Education"       value={profile?.education_level || "—"} last />
          </SectionCard>
        )}

        {/* ── SPECIALTIES (helpers) ── */}
        {isHelper && (
          <SectionCard title="Specialties" icon="star-outline">
            {/* Jobs by category */}
            <Text style={styles.subLabel}>Jobs by category</Text>
            {jobsByCategory.length > 0 ? (
              <View style={styles.categoryGrid}>
                {jobsByCategory.map((group) => (
                  <View key={group.category} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryTitle}>{group.category}</Text>
                      <View style={styles.categoryCountPill}>
                        <Text style={styles.categoryCountText}>{group.titles.length}</Text>
                      </View>
                    </View>
                    <View style={styles.tagsRow}>
                      {group.titles.map((t) => (
                        <View key={t} style={styles.tag}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyLine}>No jobs selected</Text>
            )}

            {/* Skills */}
            <Text style={[styles.subLabel, { marginTop: 16 }]}>Skills</Text>
            {helperSpecialties?.skills?.length > 0 ? (
              <View style={styles.tagsRow}>
                {helperSpecialties.skills.map((s: string) => (
                  <View key={s} style={[styles.tag, { backgroundColor: theme.color.helperSoft, borderColor: theme.color.helper + "33" }]}>
                    <Text style={[styles.tagText, { color: theme.color.helper }]}>{s}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={styles.emptyLine}>No skills listed</Text>}

            {/* Languages */}
            <Text style={[styles.subLabel, { marginTop: 16 }]}>Languages</Text>
            {helperSpecialties?.languages?.length > 0 ? (
              <View style={styles.tagsRow}>
                {helperSpecialties.languages.map((l: string) => (
                  <View key={l} style={[styles.tag, { backgroundColor: theme.color.infoSoft, borderColor: theme.color.info + "33" }]}>
                    <Text style={[styles.tagText, { color: theme.color.info }]}>{l}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={styles.emptyLine}>No languages listed</Text>}
          </SectionCard>
        )}

        {/* ── HOUSEHOLD (parents) ── */}
        {!isHelper && (
          <SectionCard title="Household Information" icon="home-outline">
            <InfoRow label="Housing Type" value={parentHousehold?.household_type ? formatParentHouseholdType(parentHousehold.household_type) : "—"} />
            <InfoRow label="Household Size" value={String(parentHousehold?.household_size ?? "—")} />
            <InfoRow label="Has Children"   value={parentHousehold ? (parentHousehold.has_children ? "Yes" : "No") : "—"} />
            <InfoRow label="Has Elderly"    value={parentHousehold ? (parentHousehold.has_elderly  ? "Yes" : "No") : "—"} />
            <InfoRow label="Has Pets"       value={parentHousehold ? (parentHousehold.has_pets     ? "Yes" : "No") : "—"} />
            <InfoRow label="Pet Details"    value={parentHousehold?.pet_details || "—"} last />

            {/* Children */}
            <Text style={[styles.subLabel, { marginTop: 16 }]}>Children</Text>
            {parentChildren.length > 0 ? parentChildren.map((c: any) => (
              <View key={String(c.child_id)} style={styles.miniCard}>
                <Text style={styles.miniCardTitle}>{c.gender ?? "Child"} · {c.age ?? "?"} yrs</Text>
                {!!c.special_needs && <Text style={styles.miniCardBody}>{c.special_needs}</Text>}
              </View>
            )) : <Text style={styles.emptyLine}>No children listed</Text>}

            {/* Elderly */}
            <Text style={[styles.subLabel, { marginTop: 14 }]}>Elderly</Text>
            {parentElderly.length > 0 ? parentElderly.map((e: any) => (
              <View key={String(e.elderly_id)} style={styles.miniCard}>
                <Text style={styles.miniCardTitle}>{e.gender ?? "Elder"} · {e.age ?? "?"} yrs</Text>
                <Text style={styles.miniCardBody}>
                  Condition: {e.condition || "N/A"}{"\n"}Care level: {e.care_level || "N/A"}
                </Text>
              </View>
            )) : <Text style={styles.emptyLine}>No elderly listed</Text>}
          </SectionCard>
        )}

        {/* ── DOCUMENTS ── */}
        <SectionCard title="Verification Documents" icon="document-text-outline">
          {docList.length === 0 ? (
            <View style={styles.noDocWrap}>
              <Ionicons name="document-outline" size={40} color={theme.color.subtle} />
              <Text style={styles.noDocText}>No documents uploaded yet</Text>
            </View>
          ) : (
            docList.map((doc: any) => {
              const docIcon = DOC_ICONS[doc.document_type] ?? "document-outline";
              const isPending  = doc.status === "Pending";
              const isVerified = doc.status === "Verified";
              const isRejected = doc.status === "Rejected";
              const docStatusBg   = isVerified ? theme.color.successSoft : isRejected ? theme.color.dangerSoft : theme.color.warningSoft;
              const docStatusText = isVerified ? theme.color.success     : isRejected ? theme.color.danger     : theme.color.warning;
              const docBorder     = isVerified ? theme.color.success + "33" : isRejected ? theme.color.danger + "33" : theme.color.line;

              return (
                <View key={doc.document_id} style={[styles.docCard, { borderColor: docBorder }]}>
                  {/* Doc header */}
                  <View style={styles.docCardTop}>
                    <View style={[styles.docIconWrap, {
                      backgroundColor: isVerified ? theme.color.successSoft : isRejected ? theme.color.dangerSoft : theme.color.pesoSoft,
                    }]}>
                      <Ionicons
                        name={docIcon}
                        size={22}
                        color={isVerified ? theme.color.success : isRejected ? theme.color.danger : theme.color.peso}
                      />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docTitle}>{doc.document_type}</Text>
                      {doc.id_type && <Text style={styles.docSub}>ID type: {doc.id_type}</Text>}
                      <Text style={styles.docDate}>
                        Uploaded {new Date(doc.uploaded_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                      </Text>
                    </View>
                    <View style={[styles.docStatusPill, { backgroundColor: docStatusBg }]}>
                      <Ionicons
                        name={isVerified ? "checkmark-circle" : isRejected ? "close-circle" : "time"}
                        size={13}
                        color={docStatusText}
                      />
                      <Text style={[styles.docStatusText, { color: docStatusText }]}>{doc.status}</Text>
                    </View>
                  </View>

                  {/* Doc actions */}
                  <View style={styles.docActions}>
                    <TouchableOpacity
                      style={styles.docViewBtn}
                      onPress={() => setViewingDocument(doc)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="eye-outline" size={16} color={theme.color.info} />
                      <Text style={styles.docViewBtnText}>View</Text>
                    </TouchableOpacity>

                    {isPending && (
                      <>
                        <TouchableOpacity
                          style={styles.docApproveBtn}
                          onPress={() => handleApproveDocument(doc)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                          <Text style={styles.docActionBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.docRejectBtn}
                          onPress={() => { setRejectingDocument(doc); setRejectReason(""); setRejectDocModal(true); }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#fff" />
                          <Text style={styles.docActionBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {/* Rejection note */}
                  {isRejected && doc.rejection_reason && (
                    <View style={styles.docRejectionNote}>
                      <Ionicons name="information-circle-outline" size={14} color={theme.color.danger} />
                      <Text style={styles.docRejectionText}>Reason: {doc.rejection_reason}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </SectionCard>

        {/* ── JOB POSTS (parents only) ── */}
        {!isHelper && (
          <SectionCard title="Job Posts" icon="briefcase-outline">
            {parentJobsLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <ActivityIndicator size="small" color={theme.color.peso} />
                <Text style={[styles.emptyLine, { marginTop: 8 }]}>Loading job posts…</Text>
              </View>
            ) : parentJobs.length === 0 ? (
              <View style={styles.noDocWrap}>
                <Ionicons name="briefcase-outline" size={40} color={theme.color.subtle} />
                <Text style={styles.noDocText}>No job posts yet</Text>
              </View>
            ) : (
              parentJobs.map((job: any) => {
                const isPendingJob  = job.status === "Pending";
                const isApproved    = job.status === "Open";
                const isRejectedJob = job.status === "Rejected";
                const jobBg   = isApproved ? theme.color.successSoft : isRejectedJob ? theme.color.dangerSoft  : theme.color.warningSoft;
                const jobText = isApproved ? theme.color.success      : isRejectedJob ? theme.color.danger       : theme.color.warning;
                const jobBorder = isApproved ? theme.color.success + "44" : isRejectedJob ? theme.color.danger + "44" : theme.color.line;
                const isProcessing = processingJobId === job.job_post_id;

                return (
                  <View key={String(job.job_post_id)} style={[styles.docCard, { borderColor: jobBorder, marginBottom: 12 }]}>
                    <View style={styles.docCardTop}>
                      <View style={[styles.docIconWrap, { backgroundColor: jobBg }]}>
                        <Ionicons name="briefcase" size={20} color={jobText} />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={styles.docTitle} numberOfLines={2}>{job.title}</Text>
                        <Text style={styles.docSub}>{job.custom_category || job.category_name || "General"}</Text>
                        <Text style={styles.docDate}>
                          Posted {new Date(job.posted_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                          {" · "}₱{Number(job.salary_offered).toLocaleString()}/{job.salary_period}
                        </Text>
                      </View>
                      <View style={[styles.docStatusPill, { backgroundColor: jobBg }]}>
                        <Ionicons
                          name={isApproved ? "checkmark-circle" : isRejectedJob ? "close-circle" : "time"}
                          size={13}
                          color={jobText}
                        />
                        <Text style={[styles.docStatusText, { color: jobText }]}>
                          {isApproved ? "Approved" : job.status}
                        </Text>
                      </View>
                    </View>

                    {isPendingJob && (
                      <View style={styles.docActions}>
                        <TouchableOpacity
                          style={[styles.docApproveBtn, isProcessing && styles.btnDisabled]}
                          onPress={() => !isProcessing && handleApproveJob(job)}
                          disabled={isProcessing}
                          activeOpacity={0.8}
                        >
                          {isProcessing
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={styles.docActionBtnText}>Approve</Text></>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.docRejectBtn, isProcessing && styles.btnDisabled]}
                          onPress={() => { if (!isProcessing) { setRejectingJob(job); setRejectJobReason(""); setRejectJobModal(true); } }}
                          disabled={isProcessing}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#fff" />
                          <Text style={styles.docActionBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {isRejectedJob && job.rejection_reason && (
                      <View style={styles.docRejectionNote}>
                        <Ionicons name="information-circle-outline" size={14} color={theme.color.danger} />
                        <Text style={styles.docRejectionText}>Reason: {job.rejection_reason}</Text>
                      </View>
                    )}
                    {isApproved && job.verified_by_name && (
                      <View style={[styles.docRejectionNote, { backgroundColor: theme.color.successSoft, borderColor: theme.color.success + "33" }]}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={theme.color.success} />
                        <Text style={[styles.docRejectionText, { color: theme.color.success }]}>
                          Verified by {job.verified_by_name}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </SectionCard>
        )}

        {/* ── ACCOUNT ACTIONS ── */}
        {vs === "Pending" && (
          <View style={styles.actionSection}>
            {!canApproveUser && approvalBlockReason !== "" && (
              <View style={styles.actionHintBox}>
                <Ionicons name="information-circle-outline" size={16} color={theme.color.warning} />
                <Text style={styles.actionHintText}>{approvalBlockReason}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.approveBtn, !canApproveUser && styles.btnDisabled]}
              onPress={handleApproveUser}
              disabled={processing || !canApproveUser}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color="#fff" />
              <Text style={styles.actionBtnText}>{processing ? "Processing…" : "Approve Account"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => { setRejectReason(""); setRejectUserModal(true); }}
              disabled={processing}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={22} color="#fff" />
              <Text style={styles.actionBtnText}>Reject Account</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── DOCUMENT VIEWER MODAL ── */}
      <Modal visible={!!viewingDocument} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.docViewerBox}>
            <View style={styles.docViewerHeader}>
              <Text style={styles.docViewerTitle}>{viewingDocument?.document_type}</Text>
              <TouchableOpacity onPress={() => setViewingDocument(null)} hitSlop={10}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
            {viewingDocument?.file_path?.toLowerCase().endsWith(".pdf") ? (
              <View style={styles.docViewerPDF}>
                <Ionicons name="document-text" size={72} color={theme.color.info} />
                <Text style={styles.docViewerPDFTitle}>PDF Document</Text>
                <Text style={styles.docViewerPDFHint}>Open in a browser to view</Text>
              </View>
            ) : (
              <Image source={{ uri: viewingDocument?.file_url }} style={styles.docViewerImg} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

      {/* ── REJECT USER MODAL ── */}
      <Modal visible={rejectUserModal} animationType="slide" transparent>
        <RejectModal
          title="Reject Account"
          subtitle={`Reject ${user.first_name ?? "this user"}'s account?`}
          value={rejectReason}
          onChange={setRejectReason}
          onCancel={() => { setRejectUserModal(false); setRejectReason(""); }}
          onConfirm={handleRejectUser}
          processing={processing}
        />
      </Modal>

      {/* ── REJECT DOCUMENT MODAL ── */}
      <Modal visible={rejectDocModal} animationType="slide" transparent>
        <RejectModal
          title="Reject Document"
          subtitle={`Rejecting: ${rejectingDocument?.document_type ?? "document"}`}
          value={rejectReason}
          onChange={setRejectReason}
          onCancel={() => { setRejectDocModal(false); setRejectingDocument(null); setRejectReason(""); }}
          onConfirm={handleRejectDocument}
          processing={processing}
        />
      </Modal>

      {/* ── REJECT JOB MODAL ── */}
      <Modal visible={rejectJobModal} animationType="slide" transparent>
        <RejectModal
          title="Reject Job Post"
          subtitle={`Rejecting: "${rejectingJob?.title ?? "job post"}"`}
          value={rejectJobReason}
          onChange={setRejectJobReason}
          onCancel={() => { setRejectJobModal(false); setRejectingJob(null); setRejectJobReason(""); }}
          onConfirm={handleRejectJob}
          processing={processingJobId !== null}
        />
      </Modal>
    </View>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={17} color={theme.color.peso} />
        </View>
        <Text style={styles.sectionCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function RejectModal({
  title, subtitle, value, onChange, onCancel, onConfirm, processing,
}: {
  title: string; subtitle: string; value: string; onChange: (v: string) => void;
  onCancel: () => void; onConfirm: () => void; processing: boolean;
}) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.rejectModalBox}>
        <View style={styles.rejectModalIcon}>
          <Ionicons name="warning-outline" size={30} color={theme.color.danger} />
        </View>
        <Text style={styles.rejectModalTitle}>{title}</Text>
        <Text style={styles.rejectModalSub}>{subtitle}</Text>
        <TextInput
          style={styles.rejectInput}
          placeholder="Enter rejection reason…"
          placeholderTextColor={theme.color.subtle}
          value={value}
          onChangeText={onChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        <View style={styles.rejectModalBtns}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmRejectBtn, processing && styles.btnDisabled]}
            onPress={onConfirm}
            disabled={processing}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmRejectBtnText}>{processing ? "Processing…" : "Reject"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },

  fullCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingText: { marginTop: 14, fontSize: 14, color: theme.color.muted, fontWeight: "600" },
  errorTitle: { marginTop: 16, fontSize: 17, fontWeight: "700", color: theme.color.ink, textAlign: "center" },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 24,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  retryBtnText: { fontWeight: "800", color: theme.color.ink, fontSize: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
    ...theme.shadow.nav,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: theme.color.ink },
  headerSub:   { fontSize: 12, color: theme.color.muted, fontWeight: "600", marginTop: 1 },

  scrollContent: { padding: 20, paddingBottom: 40 },

  // notice banner
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeBannerTitle: { fontSize: 14, fontWeight: "900", marginBottom: 4 },
  noticeBannerBody:  { fontSize: 13, color: theme.color.inkMuted, lineHeight: 19 },

  // profile card
  profileCard: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  profileAvatarRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    overflow: "hidden",
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  profileMeta:  { flex: 1 },
  profileName:  { fontSize: 19, fontWeight: "800", color: theme.color.ink, marginBottom: 3 },
  profileEmail: { fontSize: 13, color: theme.color.muted, fontWeight: "500", marginBottom: 8 },
  pillsRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "800" },
  pillMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  pillMutedText: { fontSize: 12, fontWeight: "600", color: theme.color.muted },
  vsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  vsBannerText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // section card
  sectionCard: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.color.pesoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCardTitle: { fontSize: 15, fontWeight: "900", color: theme.color.ink },
  subLabel: { fontSize: 11, fontWeight: "900", color: theme.color.muted, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 10 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  infoLabel: { fontSize: 13, color: theme.color.muted, fontWeight: "600" },
  infoValue: { fontSize: 13, color: theme.color.ink, fontWeight: "700", textAlign: "right", flex: 1, marginLeft: 16 },

  emptyLine: { fontSize: 13, color: theme.color.muted, fontStyle: "italic", paddingVertical: 4 },

  categoryGrid: { gap: 10 },
  categoryCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  categoryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  categoryTitle:  { fontSize: 13, fontWeight: "900", color: theme.color.ink },
  categoryCountPill: {
    backgroundColor: theme.color.pesoSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.color.peso + "22",
  },
  categoryCountText: { fontSize: 11, fontWeight: "900", color: theme.color.peso },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  tagText: { fontSize: 12, fontWeight: "700", color: theme.color.inkMuted },

  miniCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.color.line,
    marginBottom: 8,
  },
  miniCardTitle: { fontSize: 13, fontWeight: "800", color: theme.color.ink, marginBottom: 3 },
  miniCardBody:  { fontSize: 13, color: theme.color.muted, lineHeight: 18 },

  // documents
  noDocWrap: { alignItems: "center", paddingVertical: 24, gap: 10 },
  noDocText: { fontSize: 14, color: theme.color.muted, fontWeight: "600" },

  docCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  docCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 14, fontWeight: "800", color: theme.color.ink, marginBottom: 2 },
  docSub:   { fontSize: 12, color: theme.color.muted, fontWeight: "600", marginBottom: 2 },
  docDate:  { fontSize: 11, color: theme.color.subtle, fontWeight: "600" },
  docStatusPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  docStatusText: { fontSize: 11, fontWeight: "800" },
  docActions: { flexDirection: "row", gap: 8 },
  docViewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.infoSoft,
    borderWidth: 1,
    borderColor: theme.color.info + "33",
  },
  docViewBtnText: { fontSize: 13, fontWeight: "700", color: theme.color.info },
  docApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.success,
  },
  docRejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.danger,
  },
  docActionBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  docRejectionNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.color.dangerSoft,
    borderRadius: theme.radius.sm,
  },
  docRejectionText: { flex: 1, fontSize: 12, color: theme.color.danger, fontWeight: "600", lineHeight: 17 },

  // action section
  actionSection: { gap: 10, marginTop: 4 },
  actionHintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: theme.color.warningSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.warning + "44",
  },
  actionHintText: { flex: 1, fontSize: 13, color: theme.color.warning, fontWeight: "600", lineHeight: 18 },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.success,
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.danger,
  },
  btnDisabled: { opacity: 0.45 },
  actionBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },

  // modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.65)", justifyContent: "center", alignItems: "center" },
  docViewerBox: {
    width: "90%",
    height: "80%",
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
  },
  docViewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: theme.color.inkMuted,
  },
  docViewerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  docViewerImg:   { flex: 1, width: "100%" },
  docViewerPDF:   { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  docViewerPDFTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  docViewerPDFHint:  { color: theme.color.subtle, fontSize: 14 },

  rejectModalBox: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: 24,
    width: "88%",
    maxWidth: 400,
    alignItems: "center",
    ...theme.shadow.card,
  },
  rejectModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.color.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  rejectModalTitle: { fontSize: 19, fontWeight: "900", color: theme.color.ink, marginBottom: 6 },
  rejectModalSub:   { fontSize: 13, color: theme.color.muted, textAlign: "center", marginBottom: 16, lineHeight: 19 },
  rejectInput: {
    width: "100%",
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    fontSize: 14,
    color: theme.color.ink,
    height: 110,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  rejectModalBtns: { flexDirection: "row", gap: 12, width: "100%" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: theme.color.ink },
  confirmRejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.danger,
    alignItems: "center",
  },
  confirmRejectBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // Location row
  locationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: theme.color.line,
    marginTop: 6,
  },
  locationCoords: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: theme.color.muted,
    fontFamily: "monospace",
  },
  mapBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: theme.color.peso,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
  },
  mapBtnText: { fontSize: 12, fontWeight: "700" as const, color: "#fff" },
});
