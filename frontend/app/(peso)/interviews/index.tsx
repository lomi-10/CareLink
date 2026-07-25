// app/(peso)/interviews/index.tsx — PESO interview oversight
// PHP: peso/get_interviews.php
// Shared PESO design system: theme-aware (light/dark), animated list + chips,
// gradient header, branded backdrop showing through.
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import {
  usePesoTheme, ScreenHeader, ListRow, Pill, EmptyState, IconButton, AnimateIn, layout, font, radius, space, type Tone,
} from "@/components/peso/ui";
import { fetchPesoInterviews, type InterviewStatus, type PesoInterviewRow } from "@/lib/pesoInterviewsApi";

type FilterKey = InterviewStatus | "All";
const FILTERS: FilterKey[] = ["All", "Scheduled", "Confirmed", "Completed", "Cancelled"];
const STATUS_TONE: Record<string, Tone> = {
  Scheduled: "accent", Confirmed: "info", Completed: "ok", Cancelled: "bad", Rescheduled: "warn",
};

export default function PesoInterviewsScreen() {
  const { c } = usePesoTheme();
  const [filter, setFilter] = useState<FilterKey>("All");
  const [rows, setRows] = useState<PesoInterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (status: FilterKey) => {
    try {
      const res = await fetchPesoInterviews(status);
      setRows(res.success && res.data ? res.data.interviews : []);
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
      <ScreenHeader eyebrow="Oversight" title="Interviews"
        subtitle="Helper–employer interviews across the platform."
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
          keyExtractor={(item) => String(item.interview_id)}
          style={layout.flex1}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.accent} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No interviews found" sub="Interviews will appear here as they're scheduled." />}
          renderItem={({ item, index }) => (
            <ListRow delay={Math.min(index * 45, 320)}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="calendar" size={20} color={c.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: c.ink }} numberOfLines={1}>{item.job_title}</Text>
                  <Pill label={item.status} tone={STATUS_TONE[item.status] ?? "neutral"} />
                </View>
                <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3 }} numberOfLines={1}>
                  {item.helper_name} <Text style={{ color: c.subtle }}>with</Text> {item.employer_name}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 3 }} numberOfLines={1}>
                  {new Date(item.interview_date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {item.interview_type}
                  {item.location_or_link ? ` · ${item.location_or_link}` : ""}
                </Text>
              </View>
            </ListRow>
          )}
        />
      )}
    </View>
  );
}
