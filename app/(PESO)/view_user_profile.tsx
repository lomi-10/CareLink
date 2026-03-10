// app/(PESO)/view_user_profile.tsx
// View User Profile - UPDATED with NotificationModal (better for web)
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router"; 
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "../../constants/api";
import NotificationModal from "../../components/peso/NotificationModal";

export default function ViewUserProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user_id, user_type } = params;

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingDocument, setRejectingDocument] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  // Notification states
  const [notification, setNotification] = useState({
    visible: false,
    type: "success" as "success" | "error" | "warning" | "info",
    title: "",
    message: "",
    onAction: undefined as (() => void) | undefined,
    actionLabel: undefined as string | undefined,
  });

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/peso/get_user_details.php?user_id=${user_id}&user_type=${user_type}`
      );
      const text = await response.text();
      console.log("User details:", text);
      const data = JSON.parse(text);

      if (data.success) {
        setUserData(data.data);
      } else {
        showNotification("error", "Error", data.message || "Failed to load user details");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      showNotification("error", "Error", "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    setNotification({
      visible: true,
      type,
      title,
      message,
      actionLabel,
      onAction,
    });
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  const handleApproveUser = () => {
    showNotification(
      "warning",
      "Verify User",
      "Are you sure you want to approve this user? This action will mark them as verified.",
      "Approve",
      async () => {
        try {
          setProcessing(true);
          const response = await fetch(`${API_URL}/peso/verify_user.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id,
              action: "approve",
            }),
          });
          const data = await response.json();

          if (data.success) {
            showNotification(
              "success",
              "Success!",
              "User verified successfully",
              "Back to List",
              () => router.back()
            );
          } else {
            showNotification("error", "Error", data.message || "Failed to verify user");
          }
        } catch (error) {
          showNotification("error", "Error", "Network error occurred");
        } finally {
          setProcessing(false);
        }
      }
    );
  };

  const handleRejectUser = async () => {
    if (!rejectReason.trim()) {
      showNotification("warning", "Missing Information", "Please provide a reason for rejection");
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch(`${API_URL}/peso/verify_user.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          action: "reject",
          reason: rejectReason,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setRejectModalVisible(false);
        setRejectReason("");
        showNotification(
          "success",
          "User Rejected",
          "User has been rejected successfully",
          "Back to List",
          () => router.back()
        );
      } else {
        showNotification("error", "Error", data.message || "Failed to reject user");
      }
    } catch (error) {
      showNotification("error", "Error", "Network error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveDocument = (doc: any) => {
    showNotification(
      "info",
      "Verify Document",
      `Approve ${doc.document_type}?`,
      "Approve",
      async () => {
        try {
          const response = await fetch(`${API_URL}/peso/verify_document.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document_id: doc.document_id,
              action: "approve",
            }),
          });
          const data = await response.json();

          if (data.success) {
            showNotification("success", "Document Verified", "Document has been approved");
            fetchUserDetails();
          } else {
            showNotification("error", "Error", data.message || "Failed to verify document");
          }
        } catch (error) {
          showNotification("error", "Error", "Network error occurred");
        }
      }
    );
  };

  const handleRejectDocument = async () => {
    if (!rejectReason.trim()) {
      showNotification("warning", "Missing Information", "Please provide a reason for rejection");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/peso/verify_document.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: rejectingDocument.document_id,
          action: "reject",
          reason: rejectReason,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setRejectingDocument(null);
        setRejectReason("");
        showNotification("success", "Document Rejected", "Document has been rejected");
        fetchUserDetails();
      } else {
        showNotification("error", "Error", data.message || "Failed to reject document");
      }
    } catch (error) {
      showNotification("error", "Error", "Network error occurred");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle" size={64} color="#ccc" />
        <Text style={styles.emptyText}>User not found</Text>
      </View>
    );
  }

  const { user, profile, documents } = userData;

  return (
    <View style={styles.container}>
      {/* Notification Modal */}
      <NotificationModal
        visible={notification.visible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        actionLabel={notification.actionLabel}
        onAction={notification.onAction}
        onClose={closeNotification}
      />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.pageTitle}>User Profile</Text>
          <Text style={styles.pageSubtitle}>Review and verify</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {profile?.profile_image ? (
              <Image source={{ uri: profile.profile_image }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={48} color="#ccc" />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user.first_name} {user.middle_name} {user.last_name}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <Text style={styles.profileType}>
                {user.user_type === "helper" ? "Domestic Helper" : "Parent/Service Seeker"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadgeLarge,
              profile?.verification_status === "Verified" && styles.statusVerified,
              profile?.verification_status === "Pending" && styles.statusPending,
              profile?.verification_status === "Rejected" && styles.statusRejected,
            ]}
          >
            <Ionicons
              name={
                profile?.verification_status === "Verified"
                  ? "checkmark-circle"
                  : profile?.verification_status === "Pending"
                  ? "time"
                  : "close-circle"
              }
              size={20}
              color="#fff"
            />
            <Text style={styles.statusTextLarge}>{profile?.verification_status}</Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow label="Contact Number" value={profile?.contact_number || "N/A"} />
          <InfoRow label="Birth Date" value={profile?.birth_date || "N/A"} />
          <InfoRow label="Gender" value={profile?.gender || "N/A"} />
          <InfoRow label="Civil Status" value={profile?.civil_status || "N/A"} />
          <InfoRow label="Religion" value={profile?.religion || "N/A"} />
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <InfoRow label="Province" value={profile?.province || "N/A"} />
          <InfoRow label="Municipality" value={profile?.municipality || "N/A"} />
          <InfoRow label="Barangay" value={profile?.barangay || "N/A"} />
          <InfoRow label="Full Address" value={profile?.address || "N/A"} />
          <InfoRow label="Landmark" value={profile?.landmark || "N/A"} />
        </View>

        {/* Work Information (Helpers only) */}
        {user.user_type === "helper" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Information</Text>
            <InfoRow label="Employment Type" value={profile?.employment_type || "N/A"} />
            <InfoRow label="Work Schedule" value={profile?.work_schedule || "N/A"} />
            <InfoRow
              label="Expected Salary"
              value={`₱${profile?.expected_salary || "0"} / ${profile?.salary_period || "month"}`}
            />
            <InfoRow label="Experience" value={`${profile?.experience_years || "0"} years`} />
            <InfoRow label="Education" value={profile?.education_level || "N/A"} />
          </View>
        )}

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Documents</Text>
          {documents && documents.length > 0 ? (
            documents.map((doc: any) => (
              <View key={doc.document_id} style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <View style={styles.documentInfo}>
                    <Ionicons
                      name={
                        doc.document_type === "Valid ID"
                          ? "card"
                          : doc.document_type === "Barangay Clearance"
                          ? "home"
                          : doc.document_type === "Police Clearance"
                          ? "document-text"
                          : "ribbon"
                      }
                      size={24}
                      color="#007AFF"
                    />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.documentTitle}>{doc.document_type}</Text>
                      {doc.id_type && (
                        <Text style={styles.documentSubtitle}>ID Type: {doc.id_type}</Text>
                      )}
                      <Text style={styles.documentDate}>
                        Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.documentStatus,
                      doc.status === "Verified" && styles.statusVerified,
                      doc.status === "Pending" && styles.statusPending,
                      doc.status === "Rejected" && styles.statusRejected,
                    ]}
                  >
                    <Text style={styles.documentStatusText}>{doc.status}</Text>
                  </View>
                </View>

                <View style={styles.documentActions}>
                  <TouchableOpacity
                    style={styles.viewDocButton}
                    onPress={() => setViewingDocument(doc)}
                  >
                    <Ionicons name="eye" size={18} color="#007AFF" />
                    <Text style={styles.viewDocText}>View Document</Text>
                  </TouchableOpacity>

                  {doc.status === "Pending" && (
                    <>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApproveDocument(doc)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => setRejectingDocument(doc)}
                      >
                        <Ionicons name="close-circle" size={18} color="#fff" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDocumentsText}>No documents uploaded</Text>
          )}
        </View>

        {/* Approve/Reject Buttons */}
        {profile?.verification_status === "Pending" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButtonLarge]}
              onPress={handleApproveUser}
              disabled={processing}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Verify User</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButtonLarge]}
              onPress={() => setRejectModalVisible(true)}
              disabled={processing}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Reject User</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Document Viewer Modal */}
      <Modal visible={!!viewingDocument} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.documentViewerContainer}>
            <View style={styles.documentViewerHeader}>
              <Text style={styles.documentViewerTitle}>
                {viewingDocument?.document_type}
              </Text>
              <TouchableOpacity onPress={() => setViewingDocument(null)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {viewingDocument?.file_path?.toLowerCase().endsWith(".pdf") ? (
              <View style={styles.pdfPlaceholder}>
                <Ionicons name="document-text" size={80} color="#007AFF" />
                <Text style={styles.pdfText}>PDF Document</Text>
                <Text style={styles.pdfHint}>Open in browser to view</Text>
              </View>
            ) : (
              <Image
                source={{ uri: viewingDocument?.file_url }}
                style={styles.documentImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Reject User Modal */}
      <Modal visible={rejectModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContainer}>
            <Ionicons name="warning" size={56} color="#FF9500" />
            <Text style={styles.modalTitle}>Reject User</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleRejectUser}
                disabled={processing}
              >
                <Text style={styles.submitButtonText}>
                  {processing ? "Processing..." : "Reject"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Document Modal */}
      <Modal visible={!!rejectingDocument} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContainer}>
            <Ionicons name="warning" size={56} color="#FF9500" />
            <Text style={styles.modalTitle}>Reject Document</Text>
            <Text style={styles.modalSubtitle}>
              Rejecting: {rejectingDocument?.document_type}
            </Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectingDocument(null);
                  setRejectReason("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleRejectDocument}
              >
                <Text style={styles.submitButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// Styles remain the same as before - just copied from previous version
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, alignItems: "center" },
  pageTitle: { fontSize: 18, fontWeight: "700", color: "#1A1C1E" },
  pageSubtitle: { fontSize: 13, color: "#666" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  profileHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  profileImage: { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
  profileImagePlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center", marginRight: 16 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: "700", color: "#1A1C1E", marginBottom: 4 },
  profileEmail: { fontSize: 14, color: "#666", marginBottom: 4 },
  profileType: { fontSize: 13, color: "#FF9500", fontWeight: "600" },
  statusBadgeLarge: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, gap: 8 },
  statusTextLarge: { fontSize: 14, fontWeight: "700", color: "#fff" },
  statusPending: { backgroundColor: "#FF9500" },
  statusVerified: { backgroundColor: "#34C759" },
  statusRejected: { backgroundColor: "#FF3B30" },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1C1E", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F8F9FA" },
  infoLabel: { fontSize: 14, color: "#666", fontWeight: "500" },
  infoValue: { fontSize: 14, color: "#1A1C1E", fontWeight: "600", textAlign: "right", flex: 1, marginLeft: 16 },
  documentCard: { backgroundColor: "#F8F9FA", borderRadius: 12, padding: 16, marginBottom: 12 },
  documentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  documentInfo: { flexDirection: "row", flex: 1 },
  documentTitle: { fontSize: 15, fontWeight: "700", color: "#1A1C1E" },
  documentSubtitle: { fontSize: 12, color: "#666", marginTop: 2 },
  documentDate: { fontSize: 11, color: "#999", marginTop: 4 },
  documentStatus: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  documentStatusText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  documentActions: { flexDirection: "row", gap: 8 },
  viewDocButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 8, backgroundColor: "#E3F2FD", gap: 6 },
  viewDocText: { fontSize: 14, fontWeight: "600", color: "#007AFF" },
  approveButton: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#34C759", gap: 6 },
  approveButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  rejectButton: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#FF3B30", gap: 6 },
  rejectButtonText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  noDocumentsText: { textAlign: "center", color: "#999", fontSize: 14, paddingVertical: 20 },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 12, gap: 8 },
  approveButtonLarge: { backgroundColor: "#34C759" },
  rejectButtonLarge: { backgroundColor: "#FF3B30" },
  actionButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  documentViewerContainer: { width: "90%", height: "80%", backgroundColor: "#1A1C1E", borderRadius: 16, overflow: "hidden" },
  documentViewerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#2A2C2E" },
  documentViewerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  documentImage: { flex: 1, width: "100%" },
  pdfPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  pdfText: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 16 },
  pdfHint: { color: "#999", fontSize: 14, marginTop: 8 },
  rejectModalContainer: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "85%", maxWidth: 400, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1A1C1E", marginTop: 16, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: "#666", marginBottom: 16, textAlign: "center" },
  rejectInput: { backgroundColor: "#F8F9FA", borderRadius: 12, padding: 16, fontSize: 15, color: "#1A1C1E", height: 120, marginBottom: 20, borderWidth: 1, borderColor: "#E0E0E0", width: "100%" },
  modalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  cancelButton: { backgroundColor: "#F0F0F0" },
  submitButton: { backgroundColor: "#FF3B30" },
  cancelButtonText: { color: "#666", fontSize: 15, fontWeight: "600" },
  submitButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
