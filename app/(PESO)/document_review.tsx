// app/(PESO)/document_review.tsx
// Document Review Screen - Quick view of all pending documents
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import API_URL from "../../constants/api";

export default function DocumentReview() {
  const router = useRouter();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<any>(null);

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async () => {
    try {
      setLoading(true);
      // This endpoint would return all pending documents across all users
      const response = await fetch(`${API_URL}/peso/get_pending_documents.php`);
      const text = await response.text();
      console.log("Documents:", text);
      const data = JSON.parse(text);

      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPendingDocuments();
    setRefreshing(false);
  };

  const handleApprove = async (doc: any) => {
    Alert.alert("Verify Document", `Approve ${doc.document_type}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
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
              Alert.alert("Success", "Document verified");
              fetchPendingDocuments();
            }
          } catch (error) {
            Alert.alert("Error", "Network error occurred");
          }
        },
      },
    ]);
  };

  const renderDocument = ({ item }: any) => (
    <View style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <View style={styles.userInfo}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Ionicons name="person" size={20} color="#ccc" />
            </View>
          )}
          <View>
            <Text style={styles.userName}>{item.user_name}</Text>
            <Text style={styles.userType}>{item.user_type === "helper" ? "Helper" : "Parent"}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewUserButton}
          onPress={() =>
            router.push({
              pathname: "/(PESO)/view_user_profile",
              params: { user_id: item.user_id, user_type: item.user_type },
            })
          }
        >
          <Ionicons name="person" size={16} color="#007AFF" />
          <Text style={styles.viewUserText}>View Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.documentInfo}>
        <Ionicons
          name={
            item.document_type === "Valid ID"
              ? "card"
              : item.document_type === "Barangay Clearance"
              ? "home"
              : item.document_type === "Police Clearance"
              ? "document-text"
              : "ribbon"
          }
          size={28}
          color="#FF9500"
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.documentTitle}>{item.document_type}</Text>
          {item.id_type && <Text style={styles.documentSubtitle}>ID Type: {item.id_type}</Text>}
          <Text style={styles.documentDate}>
            Uploaded: {new Date(item.uploaded_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.documentActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => setViewingDocument(item)}
        >
          <Ionicons name="eye" size={18} color="#007AFF" />
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(item)}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Document Review</Text>
          <Text style={styles.pageSubtitle}>
            {documents.length} pending document{documents.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No pending documents</Text>
          <Text style={styles.emptySubtext}>All documents have been reviewed</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={(item) => item.document_id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Document Viewer Modal */}
      <Modal visible={!!viewingDocument} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.viewerContainer}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>{viewingDocument?.document_type}</Text>
              <TouchableOpacity onPress={() => setViewingDocument(null)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {viewingDocument?.file_path?.toLowerCase().endsWith(".pdf") ? (
              <View style={styles.pdfPlaceholder}>
                <Ionicons name="document-text" size={80} color="#007AFF" />
                <Text style={styles.pdfText}>PDF Document</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1C1E",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#666",
  },

  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  documentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1C1E",
  },
  userType: {
    fontSize: 12,
    color: "#666",
  },
  viewUserButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
    gap: 4,
  },
  viewUserText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
  },
  documentInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1C1E",
  },
  documentSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  documentDate: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  documentActions: {
    flexDirection: "row",
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#34C759",
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerContainer: {
    width: "90%",
    height: "80%",
    backgroundColor: "#1A1C1E",
    borderRadius: 16,
    overflow: "hidden",
  },
  viewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#2A2C2E",
  },
  viewerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  documentImage: {
    flex: 1,
    width: "100%",
  },
  pdfPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pdfText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
});
