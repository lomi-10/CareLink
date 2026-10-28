import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import API_URL from "@/constants/api";
import { loadAuthToken } from "@/lib/authFetch";
import { radius, usePesoTheme } from "@/contexts/PesoThemeContext";
import { generateNsrpPdf, NsrpPrefill } from "@/lib/nsrpPdf";
import NotificationModal from "./NotificationModal";

type ManagementAction = "unverify" | "suspend" | "restore";
type NoticeType = "success" | "error" | "warning" | "info";

function apiErrorMessage(payload: unknown): string | null {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = payload.message;
    return typeof message === "string" && message.trim() ? message : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNsrpPrefill(value: unknown): value is NsrpPrefill {
  if (!isRecord(value) || !isRecord(value.profile)) return false;
  const profile = value.profile;
  const profileStrings = ["first_name", "last_name", "email"];
  const profileNullableStrings = [
    "middle_name", "contact_number", "birth_date", "gender", "civil_status", "address", "landmark",
    "barangay", "municipality", "province", "education_level", "availability_status",
    "employment_type", "work_schedule", "salary_period",
  ];
  if (
    !profileStrings.every((key) => typeof profile[key] === "string")
    || !profileNullableStrings.every((key) => isNullableString(profile[key]))
    || !(profile.expected_salary === null || typeof profile.expected_salary === "string" || typeof profile.expected_salary === "number")
    || !(profile.experience_years === null || typeof profile.experience_years === "string" || typeof profile.experience_years === "number")
  ) {
    return false;
  }
  return Array.isArray(value.jobs)
    && value.jobs.every((job) => isRecord(job) && typeof job.job_title === "string" && typeof job.category_name === "string")
    && Array.isArray(value.skills)
    && value.skills.every((skill) => typeof skill === "string")
    && Array.isArray(value.languages)
    && value.languages.every((language) => typeof language === "string")
    && Array.isArray(value.history)
    && value.history.every((item) =>
      isRecord(item)
      && typeof item.employer_name === "string"
      && typeof item.position === "string"
      && isNullableString(item.employer_contact)
      && isNullableString(item.start_date)
      && isNullableString(item.end_date)
      && isNullableString(item.duties)
      && isNullableString(item.reason_for_leaving)
      && (typeof item.can_contact === "boolean" || typeof item.can_contact === "number" || typeof item.can_contact === "string"),
    );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export default function UserManagementActions({
  userId,
  userType,
  staffId,
  accountStatus,
  verificationStatus,
  onChanged,
}: {
  userId: number | string;
  userType: string;
  staffId: number | null;
  accountStatus: string;
  verificationStatus: string;
  onChanged?: () => void;
}) {
  const { c } = usePesoTheme();
  const [currentAccountStatus, setCurrentAccountStatus] = useState(accountStatus);
  const [currentVerificationStatus, setCurrentVerificationStatus] = useState(verificationStatus);
  const [action, setAction] = useState<ManagementAction | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nativePdfUri, setNativePdfUri] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [notice, setNotice] = useState({
    visible: false,
    type: "info" as NoticeType,
    title: "",
    message: "",
  });
  const previewUrlRef = useRef<string | null>(null);
  const previewRequestRef = useRef(false);
  const downloadRequestRef = useRef(false);
  const downloadedRef = useRef(false);
  const currentUserIdRef = useRef(String(userId));
  currentUserIdRef.current = String(userId);

  useEffect(() => {
    setCurrentAccountStatus(accountStatus);
    setCurrentVerificationStatus(verificationStatus);
  }, [accountStatus, verificationStatus]);

  useEffect(() => {
    if (previewUrlRef.current && Platform.OS === "web") {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = null;
    previewRequestRef.current = false;
    downloadRequestRef.current = false;
    const downloadKey = `carelink-nsrp-downloaded-${userId}`;
    const alreadyDownloaded = Platform.OS === "web"
      && typeof sessionStorage !== "undefined"
      && sessionStorage.getItem(downloadKey) === "1";
    downloadedRef.current = alreadyDownloaded;
    setPreviewUrl(null);
    setNativePdfUri(null);
    setPreviewVisible(false);
    setPreviewLoading(false);
    setDownloading(false);
    setDownloaded(alreadyDownloaded);
  }, [userId]);

  useEffect(() => () => {
    if (previewUrlRef.current && Platform.OS === "web") {
      URL.revokeObjectURL(previewUrlRef.current);
    }
  }, []);

  const showNotice = (type: NoticeType, title: string, message: string) =>
    setNotice({ visible: true, type, title, message });

  const openAction = (nextAction: ManagementAction) => {
    setReason("");
    setAction(nextAction);
  };

  const submitAction = async () => {
    if (!reason.trim()) {
      showNotice("warning", "Reason required", "Enter a reason so the moderation decision is properly recorded.");
      return;
    }
    if (!staffId) {
      showNotice("error", "Staff session unavailable", "Sign in to the PESO portal again before changing this account.");
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch(`${API_URL}/peso/manage_user.php?staff_user_id=${staffId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          action,
          reason: reason.trim(),
          verified_by: staffId,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "The account action could not be completed.");
      }

      setCurrentAccountStatus(result.data.user_status);
      setCurrentVerificationStatus(result.data.verification_status);
      setAction(null);
      setReason("");
      onChanged?.();

      const changes = action === "suspend"
        ? ` ${result.data.closed_job_posts} open job post(s) closed and ${result.data.withdrawn_applications} unsigned application(s) withdrawn. Signed or hired work was preserved.`
        : "";
      showNotice("success", "Account updated", `${result.message}${changes}`);
    } catch (error) {
      showNotice(
        "error",
        "Could not update account",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const prepareNsrpPreview = async () => {
    if (Platform.OS === "web" && previewUrlRef.current) {
      setPreviewVisible(true);
      return;
    }
    if (Platform.OS !== "web" && nativePdfUri) {
      setPreviewVisible(true);
      return;
    }
    if (previewRequestRef.current) return;

    const requestUserId = String(userId);
    previewRequestRef.current = true;
    setPreviewLoading(true);
    try {
      if (!staffId) {
        throw new Error("Sign in to the PESO portal again before downloading this draft.");
      }
      const url = `${API_URL}/peso/export_nsrp_form.php?user_id=${encodeURIComponent(String(userId))}&staff_user_id=${staffId}`;
      const token = await loadAuthToken();
      if (!token) {
        throw new Error("Your secure session is unavailable. Sign in again before downloading this draft.");
      }

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const payload: unknown = await response.json();
      if (!response.ok || !isRecord(payload) || payload.success !== true) {
        throw new Error(apiErrorMessage(payload) ?? `The server refused the draft preview (${response.status}).`);
      }
      if (!isNsrpPrefill(payload.data)) {
        throw new Error("The server returned incomplete helper details for the NSRP draft.");
      }
      const pdfBytes = await generateNsrpPdf(payload.data);
      if (currentUserIdRef.current !== requestUserId) return;

      if (Platform.OS === "web") {
        const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
        new Uint8Array(pdfBuffer).set(pdfBytes);
        const objectUrl = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
        if (currentUserIdRef.current !== requestUserId) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        previewUrlRef.current = objectUrl;
        setPreviewUrl(objectUrl);
        setPreviewVisible(true);
      } else {
        if (!FileSystem.cacheDirectory) {
          throw new Error("This device does not have a writable cache location.");
        }
        const fileUri = `${FileSystem.cacheDirectory}NSRP-Form-1-Rev-3-Draft-${userId}.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, bytesToBase64(pdfBytes), {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (currentUserIdRef.current !== requestUserId) return;
        setNativePdfUri(fileUri);
        setPreviewVisible(true);
      }
    } catch (error) {
      showNotice(
        "error",
        "Could not prepare NSRP preview",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      previewRequestRef.current = false;
      setPreviewLoading(false);
    }
  };

  const downloadNsrpDraft = async () => {
    if (downloadRequestRef.current || downloadedRef.current) return;
    downloadRequestRef.current = true;
    setDownloading(true);
    try {
      if (Platform.OS === "web") {
        if (!previewUrlRef.current) {
          throw new Error("Open the preview before downloading the draft.");
        }
        const link = document.createElement("a");
        link.href = previewUrlRef.current;
        link.download = `NSRP-Form-1-Rev-3-Draft-${userId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        if (!nativePdfUri) {
          throw new Error("Open the preview before sharing the draft.");
        }
        await Sharing.shareAsync(nativePdfUri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      }
      if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(`carelink-nsrp-downloaded-${userId}`, "1");
      }
      downloadedRef.current = true;
      setDownloaded(true);
    } catch (error) {
      showNotice(
        "error",
        "Could not save NSRP draft",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      downloadRequestRef.current = false;
      setDownloading(false);
    }
  };
  const isVerified = currentVerificationStatus === "Verified";
  const isActive = currentAccountStatus === "approved";
  const isSuspended = currentAccountStatus === "suspended";
  if (!isVerified) return null;

  const actionTitle = action === "unverify" ? "Unverify account"
    : action === "suspend" ? "Suspend account"
    : "Restore account";
  const actionDetails = action === "unverify"
    ? "This removes the PESO verified status and returns the account to review. Jobs and applications will remain unchanged."
    : action === "suspend"
    ? "This blocks account access, closes open job posts, and withdraws unsigned, non-hired applications. Signed or hired work records will remain unchanged."
    : "This restores access to the still-verified account. Previously closed job posts and withdrawn applications will not be reopened.";

  return (
    <View style={{ gap: 10, marginTop: 16, padding: 14, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }}>
      <Text style={{ color: c.ink, fontSize: 15, fontWeight: "700" }}>Account management</Text>
      <Text style={{ color: c.muted, fontSize: 12.5, lineHeight: 18 }}>
        Verification status and account access are separate decisions. Every change requires a reason and is recorded for PESO review.
      </Text>
      <Text style={{ color: isSuspended ? c.bad : isActive ? c.ok : c.warn, fontSize: 12.5, fontWeight: "700" }}>
        Account access: {isSuspended ? "Suspended" : isActive ? "Active" : "Pending"}
      </Text>

      {userType === "helper" && (
        <TouchableOpacity
          onPress={() => void prepareNsrpPreview()}
          disabled={previewLoading}
          activeOpacity={0.82}
          style={{ minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: c.infoSoft, borderWidth: 1, borderColor: c.info + "44", opacity: previewLoading ? 0.65 : 1 }}
        >
          {previewLoading
            ? <ActivityIndicator size="small" color={c.info} />
            : <Ionicons name="eye-outline" size={17} color={c.info} />}
          <Text style={{ color: c.info, fontSize: 13, fontWeight: "700" }}>
            {previewLoading ? "Preparing preview…" : previewUrl || nativePdfUri ? "View NSRP draft" : "Preview NSRP Form 1 Rev. 3 draft"}
          </Text>
        </TouchableOpacity>
      )}

      <Modal visible={previewVisible} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <View style={{ flex: 1, backgroundColor: c.canvas }}>
          <View style={{ minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: c.ink, fontSize: 16, fontWeight: "800" }}>NSRP Form 1 Rev. 3</Text>
              <Text style={{ color: c.muted, fontSize: 11.5, marginTop: 2 }}>Review the prefilled draft before saving it.</Text>
            </View>
            <TouchableOpacity onPress={() => setPreviewVisible(false)} accessibilityLabel="Close NSRP preview" style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={23} color={c.ink} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, minHeight: 0, backgroundColor: "#fff" }}>
            {Platform.OS === "web" && previewUrl
              ? React.createElement("iframe", {
                  src: `${previewUrl}#toolbar=0&navpanes=0`,
                  title: "NSRP Form 1 Rev. 3 draft preview",
                  style: { width: "100%", height: "100%", border: 0, display: "block" },
                })
              : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
                  <Ionicons name="document-text-outline" size={42} color={c.info} />
                  <Text style={{ color: c.ink, fontSize: 15, fontWeight: "700", marginTop: 12 }}>Your draft is ready to review</Text>
                  <Text style={{ color: c.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 }}>
                    This device opens PDF previews in its document viewer. Use “Open / save PDF” below to review or keep a copy.
                  </Text>
                </View>}
          </View>

          <View style={{ flexDirection: "row", gap: 10, padding: 14, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line }}>
            <TouchableOpacity
              onPress={() => setPreviewVisible(false)}
              style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, borderWidth: 1, borderColor: c.line }}
            >
              <Text style={{ color: c.ink, fontSize: 13, fontWeight: "700" }}>Close preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void downloadNsrpDraft()}
              disabled={downloading || downloaded}
              style={{ flex: 1.2, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: radius.sm, backgroundColor: downloaded ? c.ok : c.info, opacity: downloading ? 0.65 : 1 }}
            >
              {downloading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name={downloaded ? "checkmark-circle-outline" : "download-outline"} size={17} color="#fff" />}
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                {downloading ? "Saving…" : downloaded ? "Downloaded" : Platform.OS === "web" ? "Download PDF" : "Open / save PDF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isSuspended ? (
        <TouchableOpacity
          onPress={() => openAction("restore")}
          disabled={processing}
          activeOpacity={0.82}
          style={{ minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: c.ok, opacity: processing ? 0.6 : 1 }}
        >
          <Ionicons name="lock-open-outline" size={17} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>Restore account access</Text>
        </TouchableOpacity>
      ) : isActive ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => openAction("unverify")}
            disabled={processing}
            activeOpacity={0.82}
            style={{ flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8, borderRadius: radius.sm, backgroundColor: c.warnSoft, borderWidth: 1, borderColor: c.warn + "55", opacity: processing ? 0.6 : 1 }}
          >
            <Ionicons name="shield-outline" size={16} color={c.warn} />
            <Text style={{ color: c.warn, fontSize: 12.5, fontWeight: "700" }}>Unverify</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openAction("suspend")}
            disabled={processing}
            activeOpacity={0.82}
            style={{ flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8, borderRadius: radius.sm, backgroundColor: c.badSoft, borderWidth: 1, borderColor: c.bad + "55", opacity: processing ? 0.6 : 1 }}
          >
            <Ionicons name="ban-outline" size={16} color={c.bad} />
            <Text style={{ color: c.bad, fontSize: 12.5, fontWeight: "700" }}>Suspend</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <NotificationModal
        visible={notice.visible}
        type={notice.type}
        title={notice.title}
        message={notice.message}
        onClose={() => setNotice((current) => ({ ...current, visible: false }))}
      />

      <Modal visible={action !== null} animationType="fade" transparent onRequestClose={() => setAction(null)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(15,23,42,0.55)" }}>
          <View style={{ width: "100%", maxWidth: 460, alignSelf: "center", padding: 20, borderRadius: radius.lg, backgroundColor: c.surface, gap: 12 }}>
            <Text style={{ color: c.ink, fontSize: 19, fontWeight: "800" }}>{actionTitle}</Text>
            <Text style={{ color: c.muted, fontSize: 13.5, lineHeight: 20 }}>{actionDetails}</Text>
            <Text style={{ color: c.ink, fontSize: 13, fontWeight: "700" }}>Reason for this decision</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              editable={!processing}
              multiline
              maxLength={1000}
              placeholder="Describe the documents or circumstances reviewed."
              placeholderTextColor={c.subtle}
              textAlignVertical="top"
              style={{ minHeight: 94, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: c.line, color: c.ink, backgroundColor: c.canvas, fontSize: 14 }}
            />
            <Text style={{ color: c.subtle, fontSize: 11, textAlign: "right" }}>{reason.length}/1000</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setAction(null)}
                disabled={processing}
                style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: c.sunken }}
              >
                <Text style={{ color: c.ink, fontSize: 13, fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void submitAction()}
                disabled={processing || !reason.trim()}
                style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: action === "suspend" ? c.bad : c.accent, opacity: processing || !reason.trim() ? 0.55 : 1 }}
              >
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{processing ? "Saving…" : actionTitle}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
