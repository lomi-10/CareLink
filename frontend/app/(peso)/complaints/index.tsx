// app/(peso)/complaints/index.tsx — PESO complaint resolution queue
// PHP: peso/get_complaints.php, peso/resolve_complaint.php
// Master-detail, matching the User Verification screen: list on the left,
// full detail on the right (or replacing the list on narrow screens) — a bare
// Resolve/Dismiss row gave the officer nothing to act on beyond a title.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import {
  usePesoTheme, ScreenHeader, ListRow, Pill, EmptyState, IconButton, PButton, layout, font, radius, space,
} from "@/components/peso/ui";
import { type PesoColors } from "@/contexts/PesoThemeContext";
import { fetchPesoComplaints, type AdminComplaintRow } from "@/lib/complaintsApi";
import { ComplaintCasePanel } from "@/components/peso/ComplaintCasePanel";

function timeAgo(v: string) {
  if (!v) return '—';
  const diff = Math.floor((Date.now() - new Date(String(v).replace(' ', 'T')).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PesoComplaintsScreen() {
  const { c } = usePesoTheme();
  const router = useRouter();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const twoPane = Platform.OS === "web" && width >= 1024;

  const [pesoUserId, setPesoUserId] = useState<number | null>(null);
  const [rows, setRows] = useState<AdminComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AdminComplaintRow | null>(null);


  const load = useCallback(async (uid: number) => {
    try {
      const res = await fetchPesoComplaints(uid);
      const list = res.success && res.complaints ? res.complaints : [];
      setRows(list);
      setSelected((prev) => (prev ? list.find((r) => r.complaint_id === prev.complaint_id) ?? null : prev));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("user_data");
      if (!raw) return;
      const uid = Number(JSON.parse(raw)?.user_id);
      if (uid) { setPesoUserId(uid); void load(uid); }
    })();
  }, [load]);

  const onRefresh = async () => {
    if (!pesoUserId) return;
    setRefreshing(true);
    await load(pesoUserId);
    setRefreshing(false);
  };


  const messageUser = (userId?: number | null) => {
    if (!userId) return;
    router.push({ pathname: '/(peso)/messages', params: { user_id: String(userId) } } as never);
  };

  const listColumn = (
    <View style={twoPane ? layout.flex1 : { flex: 1 }}>
      <ScreenHeader eyebrow="Resolution Queue" title="Complaints"
        subtitle="Cases escalated to PESO for resolution."
        right={<IconButton icon="refresh" tone="accent" onPress={() => pesoUserId && load(pesoUserId)} />} />

      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.complaint_id)}
          style={layout.flex1}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.accent} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: 40, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="No complaints escalated to PESO" sub="Cases that reach PESO for resolution will appear here." />}
          renderItem={({ item, index }) => {
            const on = selected?.complaint_id === item.complaint_id;
            return (
              <ListRow delay={Math.min(index * 45, 320)} onPress={() => setSelected(item)} selected={on}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: on ? c.accentSoft : c.warnSoft, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" }}>
                  <Ionicons name="alert-circle" size={20} color={on ? c.accent : c.warn} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: on ? c.accentInk : c.ink }} numberOfLines={1}>{item.subject}</Text>
                    <Pill label={item.category ?? "Other"} tone="warn" dot={false} />
                  </View>
                  <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: c.muted, marginTop: 4 }} numberOfLines={1}>
                    {item.complainant_name} ({item.complainant_role ?? "user"})
                    {item.respondent_name ? ` → ${item.respondent_name}` : ""}
                  </Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 6 }}>
                    Forwarded {timeAgo(item.forwarded_at ?? item.created_at)}
                  </Text>
                </View>
              </ListRow>
            );
          }}
        />
      )}
    </View>
  );

  const detailColumn = (
    <View style={{ flex: 1 }}>
      {!twoPane && !!selected && (
        <View style={s.detailBackRow}>
          <IconButton icon="arrow-back" onPress={() => setSelected(null)} />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: c.ink }}>Back to queue</Text>
        </View>
      )}
      <ComplaintCasePanel
        complaintId={selected?.complaint_id ?? null}
        onChanged={() => { if (pesoUserId) void load(pesoUserId); }}
      />
      {/* Messaging stays available from the case file — an officer resolving a
          dispute usually needs to talk to one side before recording anything. */}
      {!!selected && (
        <View style={s.msgBar}>
          <Pressable onPress={() => messageUser(selected.complainant_user_id)} style={s.msgBtn}>
            <Ionicons name="chatbubble-outline" size={14} color={c.accent} />
            <Text style={s.msgBtnText}>Message {selected.complainant_name?.split(' ')[0] || 'reporter'}</Text>
          </Pressable>
          {!!selected.respondent_id && (
            <Pressable onPress={() => messageUser(selected.respondent_id)} style={s.msgBtn}>
              <Ionicons name="chatbubble-outline" size={14} color={c.accent} />
              <Text style={s.msgBtnText}>Message {selected.respondent_name?.split(' ')[0] || 'reported party'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={layout.page(c.canvas)}>
      {twoPane ? (
        <View style={layout.splitRow}>
          {listColumn}
          <View style={layout.rightPane(c.line, c.surface)}>{detailColumn}</View>
        </View>
      ) : selected ? detailColumn : listColumn}

    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  msgBar: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 11, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.surface },
  detailBackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: c.accent + '55', borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  msgBtnText: { fontSize: 12, fontFamily: font.semibold, color: c.accent },
});
