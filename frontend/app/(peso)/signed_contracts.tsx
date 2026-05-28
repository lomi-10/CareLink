// PESO: signed employment contracts + terminations
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
import { pesoSignedContractsUrl, pesoTerminatedPlacementsUrl } from "@/constants/applications";
import { theme } from "@/constants/theme";
import { withPesoStaffQuery } from "@/lib/pesoStaffQuery";

type SignedRow = {
  application_id: number;
  job_title: string;
  parent_name: string;
  helper_name: string;
  employer_signed_at: string | null;
  helper_signed_at: string | null;
  pdf_url: string | null;
};

type TerminatedRow = {
  application_id: number;
  job_title: string;
  parent_name: string;
  helper_name: string;
  status: string;
  termination_reason: string | null;
  termination_notice_date: string | null;
  termination_last_day: string | null;
};

type TabKey = "active" | "terminated";

export default function SignedContractsScreen() {
  const [tab, setTab] = useState<TabKey>("active");
  const [rows, setRows] = useState<SignedRow[]>([]);
  const [termRows, setTermRows] = useState<TerminatedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [signedUrl, termUrl] = await Promise.all([
        withPesoStaffQuery(pesoSignedContractsUrl()),
        withPesoStaffQuery(pesoTerminatedPlacementsUrl()),
      ]);
      const [cRes, tRes] = await Promise.all([fetch(signedUrl), fetch(termUrl)]);
      const cData = await cRes.json();
      const tData = await tRes.json();
      if (cData.success && Array.isArray(cData.contracts)) {
        setRows(cData.contracts);
      } else {
        setRows([]);
      }
      if (tData.success && Array.isArray(tData.placements)) {
        setTermRows(tData.placements);
      } else {
        setTermRows([]);
      }
    } catch {
      setRows([]);
      setTermRows([]);
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
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contracts</Text>
      <Text style={styles.sub}>Active hires and contracts ending or already ended.</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "active" && styles.tabOn]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabTxt, tab === "active" && styles.tabTxtOn]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "terminated" && styles.tabOn]}
          onPress={() => setTab("terminated")}
        >
          <Text style={[styles.tabTxt, tab === "terminated" && styles.tabTxtOn]}>Terminated</Text>
        </TouchableOpacity>
      </View>

      {tab === "active" ? (
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
      ) : (
        <FlatList
          data={termRows}
          keyExtractor={(item) => String(item.application_id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={termRows.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="file-tray-outline" size={48} color={theme.color.subtle} />
              <Text style={styles.emptyTitle}>No termination records</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.jobTitle} numberOfLines={2}>{item.job_title}</Text>
              <Text style={styles.line}>Employer: {item.parent_name}</Text>
              <Text style={styles.line}>Helper: {item.helper_name}</Text>
              <Text style={styles.meta}>Status: {item.status}</Text>
              <Text style={styles.meta}>
                Notice: {item.termination_notice_date ?? "—"} · Last day: {item.termination_last_day ?? "—"}
              </Text>
              {item.termination_reason ? (
                <Text style={styles.meta}>Reason code: {item.termination_reason}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.color.canvasPeso },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  muted: { color: theme.color.muted },
  title: { fontSize: 24, fontWeight: "800", color: theme.color.ink, marginBottom: 6 },
  sub: { fontSize: 14, color: theme.color.muted, marginBottom: 14, lineHeight: 20 },
  tabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.color.line,
    backgroundColor: "#fff",
  },
  tabOn: { backgroundColor: theme.color.peso, borderColor: theme.color.peso },
  tabTxt: { fontSize: 14, fontWeight: "700", color: theme.color.muted },
  tabTxtOn: { color: "#fff" },
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
  meta: { fontSize: 12, color: theme.color.muted, marginTop: 4, marginBottom: 0 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: theme.color.peso,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  warn: { fontSize: 13, color: theme.color.warning, marginTop: 12 },
});
