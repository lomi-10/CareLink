// app/(peso)/interviews/index.tsx — PESO interview oversight (two-pane master-detail)
//
// Was a bare list: the cards highlighted on hover and did nothing when clicked,
// because there was no detail view to open. PESO reported exactly that. Now the
// list drives a detail pane carrying the two-party progress tracker, the outcome
// recorder that notifies both sides, and PESO's private review.
//
// PHP: peso/get_interviews.php, peso/get_interview_detail.php,
//      peso/record_interview_outcome.php
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, FlatList, Modal, Platform, Pressable, RefreshControl,
  ScrollView, Text, View, useWindowDimensions,
} from "react-native";

import { InterviewDetailPanel } from "@/components/peso/InterviewDetailPanel";
import {
  usePesoTheme, ScreenHeader, StatRow, StatTile, ListRow, Pill, EmptyState, IconButton, AnimateIn,
  layout, font, radius, space, type Tone,
} from "@/components/peso/ui";
import { fetchPesoInterviews, type InterviewStatus, type PesoInterviewRow } from "@/lib/pesoInterviewsApi";

type FilterKey = InterviewStatus | "All";
const FILTERS: FilterKey[] = ["All", "Scheduled", "Confirmed", "Completed", "Cancelled"];
const STATUS_TONE: Record<string, Tone> = {
  Scheduled: "accent", Confirmed: "info", Completed: "ok", Cancelled: "bad", Rescheduled: "warn",
};
const RESULT_TONE: Record<string, Tone> = { Pass: "ok", Fail: "bad", "No Show": "warn" };

export default function PesoInterviewsScreen() {
  const { c } = usePesoTheme();
  const { width } = useWindowDimensions();
  const twoPane = Platform.OS === "web" && width >= 1024;

  const [filter, setFilter] = useState<FilterKey>("All");
  const [rows, setRows] = useState<PesoInterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  // Desktop: never leave the detail pane empty when there is something to show.
  useEffect(() => {
    if (twoPane && rows.length && !rows.some((r) => r.interview_id === selectedId)) {
      setSelectedId(rows[0].interview_id);
    }
    if (!rows.length) setSelectedId(null);
  }, [twoPane, rows, selectedId]);

  const onRefresh = async () => { setRefreshing(true); await load(filter); setRefreshing(false); };

  // Awaiting-confirmation is the number an officer actually chases: an interview
  // where one side has gone quiet is the one that needs a nudge.
  const counts = useMemo(() => ({
    total: rows.length,
    awaiting: rows.filter((r) => r.status !== "Cancelled" && (!r.helper_confirmed || !r.parent_confirmed)).length,
    needsOutcome: rows.filter((r) =>
      r.status !== "Cancelled" && (!r.result || r.result === "Pending") && new Date(r.interview_date) < new Date()).length,
  }), [rows]);

  const leftColumn = (
    <View style={twoPane ? layout.leftPane : layout.flex1}>
      <ScreenHeader eyebrow="Oversight" title="Interviews"
        subtitle="Helper–employer interviews across the platform."
        right={<IconButton icon="refresh" tone="accent" onPress={() => load(filter)} />} />

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
        {!loading && (
          <StatRow>
            <StatTile label="Total" value={counts.total} tone="accent" sub="interviews" delay={0} />
            <StatTile label="Awaiting confirmation" value={counts.awaiting} tone="warn" sub="one side pending" delay={60} />
            <StatTile label="Needs outcome" value={counts.needsOutcome} tone="bad" sub="date has passed" delay={120} />
          </StatRow>
        )}

        <AnimateIn delay={180}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: space.lg }} contentContainerStyle={{ gap: 8 }}>
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
      </View>

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
          renderItem={({ item, index }) => {
            const both = item.helper_confirmed && item.parent_confirmed;
            const recorded = !!item.result && item.result !== "Pending";
            return (
              <ListRow
                selected={twoPane && selectedId === item.interview_id}
                onPress={() => setSelectedId(item.interview_id)}
                delay={Math.min(index * 45, 320)}
              >
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons
                    name={item.interview_type === "Video Call" ? "videocam" : item.interview_type === "Phone" ? "call" : "location"}
                    size={19} color={c.accent}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14.5, color: c.ink }} numberOfLines={1}>{item.job_title}</Text>
                    <Pill
                      label={recorded ? item.result : item.status}
                      tone={recorded ? RESULT_TONE[item.result] ?? "neutral" : STATUS_TONE[item.status] ?? "neutral"}
                    />
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3 }} numberOfLines={1}>
                    {item.helper_name} <Text style={{ color: c.subtle }}>with</Text> {item.employer_name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                    <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle }} numberOfLines={1}>
                      {new Date(item.interview_date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </Text>
                    {/* Which side is holding it up, without opening the record. */}
                    {item.status !== "Cancelled" && !both && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.warnSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Ionicons name="hourglass-outline" size={10} color={c.warn} />
                        <Text style={{ fontFamily: font.semibold, fontSize: 10, color: c.warn }}>
                          {!item.helper_confirmed && !item.parent_confirmed ? "Both unconfirmed"
                            : !item.helper_confirmed ? "Helper unconfirmed" : "Employer unconfirmed"}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.subtle} />
              </ListRow>
            );
          }}
        />
      )}
    </View>
  );

  return (
    <View style={layout.page(c.canvas)}>
      <View style={twoPane ? layout.splitRow : layout.flex1}>
        {leftColumn}
        {twoPane && (
          <View style={layout.rightPane(c.line, c.surface)}>
            <InterviewDetailPanel interviewId={selectedId} onRecorded={() => load(filter)} />
          </View>
        )}
      </View>

      {!twoPane && (
        <Modal visible={!!selectedId} animationType="slide" transparent onRequestClose={() => setSelectedId(null)}>
          <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: 40 }}>
            <InterviewDetailPanel
              interviewId={selectedId}
              onRecorded={() => load(filter)}
              onClose={() => setSelectedId(null)}
              showClose
            />
          </View>
        </Modal>
      )}
    </View>
  );
}
