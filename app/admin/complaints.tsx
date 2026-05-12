import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchAdminComplaints,
  forwardComplaintToPeso,
  type AdminComplaintRow,
} from "@/lib/complaintsApi";

export default function AdminComplaintsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<AdminComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(0);
  const [forwardId, setForwardId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("user_data");
      if (!raw) {
        setRows([]);
        return;
      }
      const u = JSON.parse(raw) as { user_id?: string; user_type?: string };
      const id = Number(u.user_id);
      if (u.user_type !== "admin" || !id) {
        Alert.alert("Access denied", "Super admin only.");
        router.back();
        return;
      }
      setAdminId(id);
      const res = await fetchAdminComplaints(id);
      if (res.success && res.complaints) setRows(res.complaints);
      else setRows([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const onForward = async () => {
    if (!forwardId || !adminId) return;
    setBusy(true);
    try {
      const res = await forwardComplaintToPeso({
        complaint_id: forwardId,
        admin_user_id: adminId,
        admin_note: note.trim() || undefined,
      });
      if (!res.success) {
        Alert.alert("Forward", res.message || "Could not forward.");
        return;
      }
      setForwardId(null);
      setNote("");
      await load();
      Alert.alert("Done", "PESO officers and both parties were notified.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Placement complaints</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#5856D6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.complaint_id)}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={() => void load()}
          ListEmptyComponent={
            <Text style={styles.empty}>No complaints yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.subject}
              </Text>
              <Text style={styles.meta}>
                {item.complainant_role ?? "—"} · {item.complainant_name}
                {item.application_id != null ? ` · App #${item.application_id}` : ""}
              </Text>
              <Text style={styles.meta}>
                {item.status}
                {item.severity === "elevated" ? " · elevated" : ""}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
              {item.status === "Pending" ? (
                <TouchableOpacity
                  style={styles.fwd}
                  onPress={() => setForwardId(item.complaint_id)}
                >
                  <Text style={styles.fwdText}>Forward to PESO</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        />
      )}
      <Modal visible={forwardId != null} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Forward to PESO?</Text>
            <Text style={styles.modalHint}>Optional note for PESO records.</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Internal note…"
              placeholderTextColor="#999"
              multiline
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setForwardId(null);
                  setNote("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.okBtn]}
                onPress={() => void onForward()}
                disabled={busy}
              >
                <Text style={styles.okBtnText}>{busy ? "…" : "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backBtn: { marginRight: 12 },
  title: { fontSize: 20, fontWeight: "700", color: "#333" },
  list: { padding: 16, paddingBottom: 48 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#222" },
  meta: { fontSize: 13, color: "#666", marginTop: 6 },
  body: { fontSize: 15, color: "#333", marginTop: 10, lineHeight: 22 },
  fwd: {
    marginTop: 14,
    backgroundColor: "#5856D6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  fwdText: { color: "#fff", fontWeight: "700" },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  modalHint: { fontSize: 14, color: "#666", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginTop: 12,
    padding: 12,
    minHeight: 88,
    textAlignVertical: "top",
  },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  cancelBtn: { backgroundColor: "#E5E5EA" },
  okBtn: { backgroundColor: "#5856D6" },
  cancelBtnText: { fontWeight: "600", color: "#333" },
  okBtnText: { fontWeight: "700", color: "#fff" },
});
