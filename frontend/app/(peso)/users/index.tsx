// app/(peso)/users/index.tsx  — User Verification queue (reference redesign)
// Built on the shared PESO design system (components/peso/ui): theme-aware
// (light/dark), animated list, gradient header. Master-detail: list + filters on
// the left, the full-height detail panel on the right.
// PHP: peso/get_pending_users.php, peso/approve_user.php, peso/reject_user.php
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import UserDetailPanel from "@/components/peso/UserDetailPanel";
import {
  usePesoTheme, ScreenHeader, ListRow, Pill, EmptyState, IconButton, AnimateIn, layout, font, radius, space,
  type Tone,
} from "@/components/peso/ui";
import API_URL from "../../../constants/api";

export interface VerificationUser {
  user_id: number; name: string; email: string; user_type: string;
  contact_number?: string; profile_image?: string; verification_status: string; account_status: string; created_at?: string;
  ai_scanned?: boolean;
  missing_required_documents?: string[];
}

const FILTER_TABS = ["Pending", "Verified", "Rejected", "Suspended", "All"] as const;
type FilterStatus = (typeof FILTER_TABS)[number];
const SCAN_TABS = [
  { key: "all", label: "Any scan" },
  { key: "scanned", label: "AI-scanned" },
  { key: "unscanned", label: "Not scanned" },
] as const;
type ScanFilter = (typeof SCAN_TABS)[number]["key"];
const STATUS_TONE: Record<string, Tone> = { Pending: "warn", Verified: "ok", Rejected: "bad", Suspended: "bad", Unverified: "neutral" };

export default function UserVerification() {
  const router = useRouter();
  const { c } = usePesoTheme();
  const { focus, focus_type } = useLocalSearchParams<{ focus?: string; focus_type?: string }>();
  const { width } = useWindowDimensions();
  const twoPane = Platform.OS === "web" && width >= 1024;

  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(focus ? "All" : "Pending");
  const [scanFilter, setScanFilter] = useState<ScanFilter>("all");
  const [activeRole, setActiveRole] = useState<"helper" | "parent">(focus_type === "parent" ? "parent" : "helper");
  const [selected, setSelected] = useState<VerificationUser | null>(null);
  const handledFocus = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setUsers([]);
    setHasMore(false);
    setPage(1);
    void fetchUsers(1);
  }, [activeRole, filterStatus, scanFilter, debouncedSearch]); // eslint-disable-line

  // Deep-link from the dashboard queue: open with the user pre-selected.
  useEffect(() => {
    if (!focus) return;
    if (handledFocus.current === String(focus)) return;
    handledFocus.current = String(focus);
    const target = users.find((u) => String(u.user_id) === String(focus));
    const targetRole = target?.user_type === "parent" || focus_type === "parent" ? "parent" : "helper";
    setActiveRole(targetRole);
    setFilterStatus("All");
    if (twoPane) {
      setSelected(target ?? {
        user_id: Number(focus),
        user_type: targetRole,
        name: "",
        email: "",
        verification_status: "",
        account_status: "",
      });
    } else {
      router.push({ pathname: "/(peso)/users/view_profile", params: { user_id: String(focus), user_type: targetRole } });
    }
  }, [focus, focus_type, twoPane]); // eslint-disable-line

  const fetchUsers = async (requestedPage = 1, append = false) => {
    try {
      setLoadError(null);
      if (append) setLoadingMore(true);
      else setLoading(true);
      const query = new URLSearchParams({
        page: String(requestedPage),
        page_size: "30",
        role: activeRole,
        status: filterStatus === "All" ? "" : filterStatus,
        scan: scanFilter === "all" ? "" : scanFilter,
        search: debouncedSearch,
      });
      const res = await fetch(`${API_URL}/peso/get_pending_users.php?${query.toString()}`);
      const data = JSON.parse(await res.text());
      if (!data.success) throw new Error(data.message || "Could not load accounts.");
      setUsers((current) => append ? [...current, ...(data.data ?? [])] : (data.data ?? []));
      setPage(requestedPage);
      setHasMore(Boolean(data.pagination?.has_more));
    } catch (e) {
      console.error("fetchUsers:", e);
      setLoadError(e instanceof Error ? e.message : "Could not load accounts. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };
  const onRefresh = async () => { setRefreshing(true); await fetchUsers(1); };
  // activeRole holds the API value ("parent"). Never render it directly:
  // every place that did produced "parents" in the interface.
  const roleLabel = activeRole === "helper" ? "helpers" : "household employers";

  const openUser = (item: VerificationUser) => {
    if (twoPane) setSelected(item);
    else router.push({ pathname: "/(peso)/users/view_profile", params: { user_id: item.user_id, user_type: item.user_type } });
  };

  const renderCard = ({ item, index }: { item: VerificationUser; index: number }) => {
    const isHelper = item.user_type === "helper";
    const joinDate = item.created_at ? new Date(item.created_at).toLocaleDateString("en-PH", { month: "short", year: "numeric" }) : null;
    return (
      <ListRow selected={twoPane && selected?.user_id === item.user_id} onPress={() => openUser(item)} delay={Math.min(index * 45, 320)}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isHelper ? c.accentSoft : c.infoSoft, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {item.profile_image ? <Image source={{ uri: item.profile_image }} style={{ width: 44, height: 44 }} contentFit="cover" />
            : <Ionicons name={isHelper ? "person" : "people"} size={22} color={isHelper ? c.accent : c.info} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: c.ink }} numberOfLines={1}>{item.name}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.muted }} numberOfLines={1}>{item.email}</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
            {!!item.contact_number && <Meta icon="call-outline" text={item.contact_number} />}
            {!!joinDate && <Meta icon="calendar-outline" text={`Joined ${joinDate}`} />}
          </View>
          {!!item.missing_required_documents?.length && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
              <Ionicons name="alert-circle-outline" size={12} color={c.warn} />
              <Text style={{ fontFamily: font.semibold, fontSize: 11, color: c.warn }} numberOfLines={1}>
                Missing: {item.missing_required_documents.join(", ")}
              </Text>
            </View>
          )}
        </View>
        <Pill label={item.account_status === "suspended" ? "Suspended" : item.verification_status}
          tone={STATUS_TONE[item.account_status === "suspended" ? "Suspended" : item.verification_status] ?? "neutral"} />
        <Ionicons name="chevron-forward" size={16} color={c.subtle} />
      </ListRow>
    );
  };

  const Meta = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={12} color={c.subtle} />
      <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: c.subtle }}>{text}</Text>
    </View>
  );

  const leftColumn = (
    <View style={twoPane ? layout.leftPane : layout.flex1}>
      <ScreenHeader eyebrow="Verification & Management" title="User Verification"
        subtitle={`${loading ? "Loading" : `${users.length}${hasMore ? "+" : ""} loaded`} · reviewing ${roleLabel}`}
        right={<IconButton icon="refresh" tone="accent" onPress={() => void fetchUsers(1)} />} />

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
        {/* Role segmented */}
        <AnimateIn delay={80} style={{ flexDirection: "row", gap: 8 }}>
          {(["helper", "parent"] as const).map((role) => {
            const active = activeRole === role;
            return (
              <Pressable key={role} onPress={() => setActiveRole(role)}
                style={({ hovered }: any) => [{ flex: 1, maxWidth: 220, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: radius.md, transitionDuration: "140ms",
                  backgroundColor: active ? c.accentSoft : hovered ? c.raise : c.surface, borderWidth: 1.4, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                <Ionicons name={role === "helper" ? "briefcase-outline" : "people-outline"} size={17} color={active ? c.accent : c.muted} />
                <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: active ? c.accentInk : c.muted }}>{role === "helper" ? "Helpers" : "Household Employers"}</Text>
              </Pressable>
            );
          })}
        </AnimateIn>

        {/* Search */}
        <AnimateIn delay={120} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 8, marginTop: space.sm }}>
          <Ionicons name="search" size={16} color={c.subtle} />
          <TextInput style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: c.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) }}
            placeholder={`Search ${roleLabel} by name or email…`} placeholderTextColor={c.subtle} value={searchQuery} onChangeText={setSearchQuery} />
          {!!searchQuery && <Pressable onPress={() => setSearchQuery("")} hitSlop={10}><Ionicons name="close-circle" size={16} color={c.subtle} /></Pressable>}
        </AnimateIn>

        {/* Filter chips */}
        <AnimateIn delay={160}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: space.sm }} contentContainerStyle={{ gap: 8 }}>
          {FILTER_TABS.map((status) => {
            const active = filterStatus === status;
            return (
              <Pressable key={status} onPress={() => setFilterStatus(status)}
                style={({ hovered }: any) => [{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, transitionDuration: "140ms", backgroundColor: active ? c.accent : hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: active ? "#fff" : c.muted }}>{status === "All" ? "All statuses" : status}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        </AnimateIn>

        {/* AI-scan filter */}
        <AnimateIn delay={200}>
        <View style={{ flexDirection: "row", gap: 8, marginTop: space.xs }}>
          <Ionicons name="scan-outline" size={15} color={c.subtle} style={{ alignSelf: "center" }} />
          {SCAN_TABS.map((t) => {
            const active = scanFilter === t.key;
            return (
              <Pressable key={t.key} onPress={() => setScanFilter(t.key)}
                style={({ hovered }: any) => [{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill, transitionDuration: "140ms", backgroundColor: active ? c.accentSoft : hovered ? c.raise : c.surface, borderWidth: 1, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: active ? c.accentInk : c.muted }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
        </AnimateIn>
      </View>

      {/* List */}
      {loading && users.length === 0 ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : loadError && users.length === 0 ? (
        <EmptyState icon="alert-circle-outline" title="Could not load accounts" sub={loadError} />
      ) : users.length === 0 ? (
        <EmptyState icon={activeRole === "helper" ? "briefcase-outline" : "people-outline"} title={`No ${roleLabel} ${filterStatus !== "All" ? `with "${filterStatus}" status` : "found"}`}
          sub={debouncedSearch ? "Try a different search or clear filters." : `No ${roleLabel} match these filters.`} />
      ) : (
        <FlatList style={layout.flex1} data={users} keyExtractor={(i) => String(i.user_id)} renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          onEndReached={() => { if (hasMore && !loadingMore && !loading) void fetchUsers(page + 1, true); }}
          onEndReachedThreshold={0.35}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={c.accent} style={{ padding: 16 }} /> : loadError ? <Text style={{ color: c.bad, fontFamily: font.medium, textAlign: "center", padding: 14 }}>{loadError}</Text> : null} />
      )}
    </View>
  );

  return (
    <View style={layout.page(c.canvas)}>
      <View style={twoPane ? layout.splitRow : layout.flex1}>
        {leftColumn}
        {twoPane && (
          <View style={layout.rightPane(c.line, c.surface)}>
            {selected ? (
              <UserDetailPanel key={selected.user_id} userId={selected.user_id} userType={selected.user_type} onChanged={fetchUsers} onClose={() => setSelected(null)} />
            ) : (
              <EmptyState icon="person-circle-outline" title="Select an account to review" sub="Pick a user from the list to view their profile, documents, and job posts." />
            )}
          </View>
        )}
      </View>
    </View>
  );
}
