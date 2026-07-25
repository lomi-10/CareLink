// app/(peso)/placements/index.tsx — PESO placement lifecycle oversight
// PHP: peso/get_placements.php
// Note: distinct from /(peso)/contracts — Contracts is the paperwork/PDF view,
// this is the employment-lifecycle view (Active / Terminating / Terminated).
// Shared PESO design system: theme-aware, animated, branded backdrop.
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import {
  usePesoTheme, ScreenHeader, ListRow, Pill, EmptyState, IconButton, AnimateIn, layout, font, radius, space, type Tone,
} from "@/components/peso/ui";
import { fetchPesoPlacements, type PesoPlacementRow, type PlacementLifecycleStatus } from "@/lib/pesoPlacementsApi";

type FilterKey = PlacementLifecycleStatus | "All";
const FILTERS: FilterKey[] = ["All", "Active", "Terminating", "Terminated"];
const STATUS_TONE: Record<string, Tone> = { Active: "ok", Terminating: "warn", Terminated: "bad" };

export default function PesoPlacementsScreen() {
  const { c } = usePesoTheme();
  const [filter, setFilter] = useState<FilterKey>("All");
  const [rows, setRows] = useState<PesoPlacementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (status: FilterKey) => {
    try {
      const res = await fetchPesoPlacements(status);
      setRows(res.success && res.data ? res.data.placements : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setLoading(true); void load(filter); }, [filter, load]);

  const onRefresh = async () => { setRefreshing(true); await load(filter); setRefreshing(false); };

  return (
    <View style={layout.page(c.canvas)}>
      <ScreenHeader eyebrow="Oversight" title="Placements"
        subtitle="Employment lifecycle across all confirmed hires."
        right={<IconButton icon="refresh" tone="accent" onPress={() => load(filter)} />} />

      <AnimateIn delay={140} style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable key={f} onPress={() => setFilter(f)}
                style={({ hovered }: any) => [{ paddingVertical: 8, paddingHorizontal: 15, borderRadius: radius.pill, transitionDuration: "140ms", backgroundColor: active ? c.accent : hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: active ? "#fff" : c.muted }}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </AnimateIn>

      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.application_id)}
          style={layout.flex1}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.accent} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="home-outline" title="No placements found" sub="Confirmed hires and their lifecycle will appear here." />}
          renderItem={({ item, index }) => {
            const tone = STATUS_TONE[item.lifecycle_status] ?? "neutral";
            const iconColor = tone === "ok" ? c.ok : tone === "warn" ? c.warn : tone === "bad" ? c.bad : c.accent;
            const iconBg = tone === "ok" ? c.okSoft : tone === "warn" ? c.warnSoft : tone === "bad" ? c.badSoft : c.accentSoft;
            return (
              <ListRow delay={Math.min(index * 45, 320)}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="home" size={19} color={iconColor} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: c.ink }} numberOfLines={1}>{item.job_title}</Text>
                    <Pill label={item.lifecycle_status} tone={tone} />
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3 }} numberOfLines={1}>
                    {item.helper_name} <Text style={{ color: c.subtle }}>employed by</Text> {item.parent_name}
                  </Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 3 }} numberOfLines={1}>
                    Start: {item.employment_start_date ?? "—"} · End: {item.employment_end_date ?? "Ongoing"}
                  </Text>
                  {item.lifecycle_status !== "Active" && (
                    <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 2 }} numberOfLines={1}>
                      Notice: {item.termination_notice_date ?? "—"} · Last day: {item.termination_last_day ?? "—"}
                    </Text>
                  )}
                </View>
              </ListRow>
            );
          }}
        />
      )}
    </View>
  );
}
