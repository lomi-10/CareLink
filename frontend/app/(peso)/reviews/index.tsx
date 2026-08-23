// app/(peso)/reviews/index.tsx — PESO: peer reviews between helpers and employers
//
// This screen exists because the written reviews had nowhere to be read. PESO's
// rule (Aug 2026): the star RATING each party gives the other is public on
// profiles, but the WRITTEN review is private — only PESO and super admin see
// it. Without this screen that policy meant the text was collected and never
// looked at by anyone.
//
// The low-rating filter is the point of the screen. An officer is not going to
// read every review; they need the ones at 2 stars and below, which are the
// complaints that have not been filed yet.
//
// PHP: peso/list_reviews.php
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, Text, TextInput, View,
} from "react-native";
import API_URL from "@/constants/api";
import { withPesoStaffQuery } from "@/lib/pesoStaffQuery";
import {
  usePesoTheme, ScreenHeader, StatRow, StatTile, ListRow, EmptyState, IconButton, AnimateIn,
  layout, font, radius, space,
} from "@/components/peso/ui";

type ReviewRow = {
  review_id: number;
  rating: number;
  review_text: string;
  reviewer_name: string; reviewer_role: string;
  reviewee_name: string; reviewee_role: string;
  job_title: string | null;
  created_at: string | null;
};

type Filter = "all" | "low" | "helper" | "parent";

export default function PesoReviewsScreen() {
  const { c } = usePesoTheme();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, average: null as number | null, low: 0, written: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const load = useCallback(async (f: Filter, query: string) => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (f === "low") params.set("max_rating", "2");
      if (f === "helper" || f === "parent") params.set("role", f);
      const url = await withPesoStaffQuery(`${API_URL}/peso/list_reviews.php?${params.toString()}`);
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) { setRows(data.reviews ?? []); setSummary(data.summary ?? summary); }
      else setRows([]);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setLoading(true); void load(filter, q); }, [filter]); // eslint-disable-line
  const onRefresh = async () => { setRefreshing(true); await load(filter, q); setRefreshing(false); };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All reviews" },
    { key: "low", label: "2 stars and below" },
    { key: "helper", label: "About helpers" },
    { key: "parent", label: "About employers" },
  ];

  const Stars = ({ n }: { n: number }) => (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={n >= i ? "star" : n >= i - 0.5 ? "star-half" : "star-outline"} size={13} color={c.warn} />
      ))}
    </View>
  );

  return (
    <View style={layout.page(c.canvas)}>
      <ScreenHeader eyebrow="Oversight" title="Reviews"
        subtitle="What helpers and households wrote about each other. Ratings are public; this text is not."
        right={<IconButton icon="refresh" tone="accent" onPress={() => load(filter, q)} />} />

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
        {!loading && (
          <StatRow>
            <StatTile label="Total reviews" value={summary.total} tone="accent" sub="on record" delay={0} />
            <StatTile label="Average rating" value={summary.average ?? "—"} tone="ok" sub="out of 5" delay={60} />
            <StatTile label="Low ratings" value={summary.low} tone="bad" sub="2 stars or below" delay={120} />
            <StatTile label="With comments" value={summary.written} tone="info" sub="written feedback" delay={180} />
          </StatRow>
        )}

        {/* The privacy rule, stated on the screen that enforces it. */}
        <AnimateIn delay={200} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: c.accentSoft, borderRadius: radius.md, padding: 12, marginTop: space.lg }}>
          <Ionicons name="lock-closed" size={15} color={c.accentInk} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, color: c.accentInk, lineHeight: 17 }}>
            Written reviews are visible to PESO and super admin only. Helpers and households see each other's star rating,
            never the words. Do not quote this text back to either party.
          </Text>
        </AnimateIn>

        <AnimateIn delay={240} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 10, marginTop: space.md }}>
          <Ionicons name="search" size={16} color={c.subtle} />
          <TextInput
            style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: c.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) }}
            placeholder="Search by name or wording…" placeholderTextColor={c.subtle}
            value={q} onChangeText={setQ} onSubmitEditing={() => load(filter, q)} returnKeyType="search"
          />
          {!!q && <Pressable onPress={() => { setQ(""); load(filter, ""); }} hitSlop={10}><Ionicons name="close-circle" size={16} color={c.subtle} /></Pressable>}
        </AnimateIn>

        <AnimateIn delay={280}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: space.md }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable key={f.key} onPress={() => setFilter(f.key)}
                  style={({ hovered }: any) => [{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, transitionDuration: "140ms", backgroundColor: active ? c.accent : hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: active ? "#fff" : c.muted }}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </AnimateIn>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(i) => String(i.review_id)}
          style={layout.flex1}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState icon="chatbox-ellipses-outline" title="No reviews yet"
              sub={summary.total === 0
                ? "Reviews appear once a placement ends and both sides rate each other."
                : "No review matches this filter."} />
          }
          renderItem={({ item, index }) => {
            const low = item.rating <= 2;
            return (
              <ListRow delay={Math.min(index * 45, 320)} tone={low ? "bad" : undefined}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: low ? c.badSoft : c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={low ? "alert-circle" : "chatbox-ellipses"} size={19} color={low ? c.bad : c.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 14, color: c.ink }} numberOfLines={1}>
                      {item.reviewee_name}
                    </Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle }}>{item.reviewee_role}</Text>
                    <Stars n={item.rating} />
                    <Text style={{ fontFamily: font.semibold, fontSize: 12, color: low ? c.bad : c.muted }}>{item.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 3 }} numberOfLines={1}>
                    reviewed by {item.reviewer_name} ({item.reviewer_role})
                    {item.job_title ? ` · ${item.job_title}` : ""}
                    {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })}` : ""}
                  </Text>
                  {item.review_text
                    ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: c.ink, lineHeight: 19, marginTop: 8 }}>{item.review_text}</Text>
                    : <Text style={{ fontFamily: font.regular, fontSize: 12, color: c.subtle, fontStyle: "italic", marginTop: 8 }}>Rated, but wrote no comment.</Text>}
                </View>
              </ListRow>
            );
          }}
        />
      )}
    </View>
  );
}
