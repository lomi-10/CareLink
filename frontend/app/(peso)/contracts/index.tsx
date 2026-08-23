// PESO: signed employment contracts + terminations
// Shared PESO design system: theme-aware (light/dark), animated, branded backdrop.
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl, Text, View, useWindowDimensions } from "react-native";
import { pesoSignedContractsUrl, pesoTerminatedPlacementsUrl } from "@/constants/applications";
import { withPesoStaffQuery } from "@/lib/pesoStaffQuery";
import { ContractDetailPanel } from "@/components/peso/ContractDetailPanel";
import {
  usePesoTheme, ScreenHeader, ListRow, Pill, EmptyState, IconButton, AnimateIn, layout, font, radius, space,
} from "@/components/peso/ui";

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
  const { c } = usePesoTheme();
  const [tab, setTab] = useState<TabKey>("active");
  const [rows, setRows] = useState<SignedRow[]>([]);
  const [termRows, setTermRows] = useState<TerminatedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const twoPane = Platform.OS === "web" && width >= 1024;

  const load = useCallback(async () => {
    try {
      const [signedUrl, termUrl] = await Promise.all([
        withPesoStaffQuery(pesoSignedContractsUrl()),
        withPesoStaffQuery(pesoTerminatedPlacementsUrl()),
      ]);
      const [cRes, tRes] = await Promise.all([fetch(signedUrl), fetch(termUrl)]);
      const cData = await cRes.json();
      const tData = await tRes.json();
      if (cData.success && Array.isArray(cData.contracts)) setRows(cData.contracts); else setRows([]);
      if (tData.success && Array.isArray(tData.placements)) setTermRows(tData.placements); else setTermRows([]);
    } catch {
      setRows([]);
      setTermRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "active", label: "Active", count: rows.length },
    { key: "terminated", label: "Terminated", count: termRows.length },
  ];

  const selected = rows.find((r) => r.application_id === selectedId) ?? null;

  // Keep the pane populated on desktop; a blank right half reads as broken.
  useEffect(() => {
    if (twoPane && tab === "active" && rows.length && !rows.some((r) => r.application_id === selectedId)) {
      setSelectedId(rows[0].application_id);
    }
  }, [twoPane, tab, rows, selectedId]);

  return (
    <View style={layout.page(c.canvas)}>
     <View style={twoPane ? layout.splitRow : layout.flex1}>
      <View style={twoPane ? layout.leftPane : layout.flex1}>
      <ScreenHeader eyebrow="Records" title="Contracts"
        subtitle="Active hires and contracts ending or already ended."
        right={<IconButton icon="refresh" tone="accent" onPress={load} />} />

      <AnimateIn delay={140} style={{ flexDirection: "row", gap: 10, paddingHorizontal: space.xl, paddingTop: space.md }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={({ hovered }: any) => [{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill, transitionDuration: "140ms", backgroundColor: active ? c.accent : hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: active ? "#fff" : c.muted }}>{t.label}</Text>
              <View style={{ minWidth: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: active ? "rgba(255,255,255,0.25)" : c.sunken, alignItems: "center" }}>
                <Text style={{ fontSize: 11, fontFamily: font.semibold, color: active ? "#fff" : c.muted }}>{t.count}</Text></View>
            </Pressable>
          );
        })}
      </AnimateIn>

      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : tab === "active" ? (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.application_id)}
          style={layout.flex1}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No signed contracts yet" sub="Signed employment contracts will appear here." />}
          renderItem={({ item, index }) => (
            <ListRow delay={Math.min(index * 45, 320)} selected={twoPane && selectedId === item.application_id} onPress={() => setSelectedId(item.application_id)}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="document-text" size={20} color={c.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: c.ink }} numberOfLines={2}>{item.job_title}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3 }} numberOfLines={1}>
                  {item.helper_name} <Text style={{ color: c.subtle }}>employed by</Text> {item.parent_name}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 3 }}>
                  Signed — employer: {item.employer_signed_at ?? "—"} · helper: {item.helper_signed_at ?? "—"}
                </Text>
                {!item.pdf_url && (
                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: c.warn, marginTop: 10 }}>PDF path missing</Text>
                )}
              </View>
            </ListRow>
          )}
        />
      ) : (
        <FlatList
          data={termRows}
          keyExtractor={(item) => String(item.application_id)}
          style={layout.flex1}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="file-tray-outline" title="No termination records" sub="Ended contracts and terminations will appear here." />}
          renderItem={({ item, index }) => (
            <ListRow delay={Math.min(index * 45, 320)} tone="bad">
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.badSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="hand-left" size={19} color={c.bad} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: c.ink }} numberOfLines={2}>{item.job_title}</Text>
                  <Pill label={item.status} tone="bad" />
                </View>
                <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3 }} numberOfLines={1}>
                  {item.helper_name} <Text style={{ color: c.subtle }}>·</Text> {item.parent_name}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 3 }}>
                  Notice: {item.termination_notice_date ?? "—"} · Last day: {item.termination_last_day ?? "—"}
                </Text>
                {item.termination_reason ? (
                  <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 2 }}>Reason code: {item.termination_reason}</Text>
                ) : null}
              </View>
            </ListRow>
          )}
        />
      )}
      </View>

      {twoPane && tab === "active" && (
        <View style={layout.rightPane(c.line, c.surface)}>
          <ContractDetailPanel contract={selected} />
        </View>
      )}
     </View>

      {/* Mobile: the contract opens over the list rather than beside it. */}
      {!twoPane && (
        <Modal visible={!!selectedId && tab === "active"} animationType="slide" transparent onRequestClose={() => setSelectedId(null)}>
          <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: 40 }}>
            <ContractDetailPanel contract={selected} onClose={() => setSelectedId(null)} showClose />
          </View>
        </Modal>
      )}
    </View>
  );
}
