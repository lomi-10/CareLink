// PESO: signed employment contracts (both parties confirmed)
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { pesoSignedContractsUrl } from "@/constants/applications";
import { theme } from "@/constants/theme";

type SignedRow = {
  application_id: number;
  job_title: string;
  parent_name: string;
  helper_name: string;
  employer_signed_at: string | null;
  helper_signed_at: string | null;
  pdf_url: string | null;
};

export default function SignedContractsScreen() {
  const [rows, setRows] = useState<SignedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(pesoSignedContractsUrl());
      const data = await res.json();
      if (data.success && Array.isArray(data.contracts)) {
        setRows(data.contracts);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.color.peso} />
        <Text style={styles.muted}>Loading contracts…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signed contracts</Text>
      <Text style={styles.sub}>
        Employment agreements where both employer and helper have confirmed (status: hired).
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.application_id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={rows.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={theme.color.subtle} />
            <Text style={styles.emptyTitle}>No signed contracts yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.jobTitle} numberOfLines={2}>{item.job_title}</Text>
            <Text style={styles.line}>Employer: {item.parent_name}</Text>
            <Text style={styles.line}>Helper: {item.helper_name}</Text>
            <Text style={styles.meta}>
              Signed employer: {item.employer_signed_at ?? "—"} · Helper: {item.helper_signed_at ?? "—"}
            </Text>
            {item.pdf_url ? (
              <TouchableOpacity
                style={styles.btn}
                onPress={() => Linking.openURL(item.pdf_url!)}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.btnTxt}>Open PDF</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.warn}>PDF path missing</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.color.canvasPeso },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  muted: { color: theme.color.muted },
  title: { fontSize: 24, fontWeight: "800", color: theme.color.ink, marginBottom: 6 },
  sub: { fontSize: 14, color: theme.color.muted, marginBottom: 16, lineHeight: 20 },
  emptyList: { flexGrow: 1 },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16, color: theme.color.muted },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  jobTitle: { fontSize: 16, fontWeight: "700", color: theme.color.ink, marginBottom: 8 },
  line: { fontSize: 14, color: theme.color.ink, marginBottom: 4 },
  meta: { fontSize: 12, color: theme.color.muted, marginTop: 8, marginBottom: 12 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: theme.color.peso,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  warn: { fontSize: 13, color: theme.color.warning },
});
