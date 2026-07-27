// app/(peso)/users/index.tsx  — User Verification queue (reference redesign)
// Built on the shared PESO design system (components/peso/ui): theme-aware
// (light/dark), animated list, gradient header. Master-detail: list + filters on
// the left, the full-height detail panel on the right.
// PHP: peso/get_pending_users.php, peso/approve_user.php, peso/reject_user.php
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import UserDetailPanel from "@/components/peso/UserDetailPanel";
import {
  usePesoTheme, ScreenHeader, StatRow, StatTile, ListRow, Pill, EmptyState, IconButton, AnimateIn, layout, font, radius, space,
  type Tone,
} from "@/components/peso/ui";
import API_URL from "../../../constants/api";

export interface VerificationUser {
  user_id: number; name: string; email: string; user_type: string;
  contact_number?: string; profile_image?: string; verification_status: string; created_at?: string;
  ai_scanned?: boolean;
}

const FILTER_TABS = ["Pending", "Verified", "Rejected", "All"] as const;
type FilterStatus = (typeof FILTER_TABS)[number];
const SCAN_TABS = [
  { key: "all", label: "Any scan" },
  { key: "scanned", label: "AI-scanned" },
  { key: "unscanned", label: "Not scanned" },
] as const;
type ScanFilter = (typeof SCAN_TABS)[number]["key"];
const STATUS_TONE: Record<string, Tone> = { Pending: "warn", Verified: "ok", Rejected: "bad", Unverified: "neutral" };

export default function UserVerification() {
  const router = useRouter();
  const { c } = usePesoTheme();
  const { focus } = useLocalSearchParams<{ focus?: string; focus_type?: string }>();
  const { width } = useWindowDimensions();
  const twoPane = Platform.OS === "web" && width >= 1024;

  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Pending");
  const [scanFilter, setScanFilter] = useState<ScanFilter>("all");
  const [activeRole, setActiveRole] = useState<"helper" | "parent">("helper");
  const [selected, setSelected] = useState<VerificationUser | null>(null);

  useEffect(() => { fetchUsers(); }, []);

  // Deep-link from the dashboard queue: open with the user pre-selected.
  useEffect(() => {
    if (!focus || users.length === 0) return;
    const target = users.find((u) => String(u.user_id) === String(focus));
    if (!target) return;
    setActiveRole(target.user_type === "parent" ? "parent" : "helper");
    setFilterStatus("All");
    if (twoPane) setSelected(target);
    else router.push({ pathname: "/(peso)/users/view_profile", params: { user_id: String(target.user_id), user_type: target.user_type } });
  }, [focus, users, twoPane]); // eslint-disable-line

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/peso/get_pending_users.php`);
      const data = JSON.parse(await res.text());
      if (data.success) setUsers(data.data ?? []);
    } catch (e) { console.error("fetchUsers:", e); } finally { setLoading(false); }
  };
  const onRefresh = async () => { setRefreshing(true); await fetchUsers(); setRefreshing(false); };

  const helperCount = useMemo(() => users.filter((u) => u.user_type === "helper").length, [users]);
  const parentCount = useMemo(() => users.filter((u) => u.user_type === "parent").length, [users]);
  const pendingHelpers = useMemo(() => users.filter((u) => u.user_type === "helper" && u.verification_status === "Pending").length, [users]);
  const pendingParents = useMemo(() => users.filter((u) => u.user_type === "parent" && u.verification_status === "Pending").length, [users]);
  const countFor = (status: string) => users.filter((u) => u.user_type === activeRole && u.verification_status === status).length;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (u.user_type !== activeRole) return false;
      if (filterStatus !== "All" && u.verification_status !== filterStatus) return false;
      if (scanFilter === "scanned" && !u.ai_scanned) return false;
      if (scanFilter === "unscanned" && u.ai_scanned) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.contact_number ?? "").includes(q);
    });
  }, [users, activeRole, filterStatus, scanFilter, searchQuery]);

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
        </View>
        <Pill label={item.verification_status} tone={STATUS_TONE[item.verification_status] ?? "neutral"} />
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
        subtitle={loading ? "Loading…" : `${users.length} total account${users.length !== 1 ? "s" : ""} · reviewing ${activeRole}s`}
        right={<IconButton icon="refresh" tone="accent" onPress={fetchUsers} />} />

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
        {!loading && (
          <StatRow>
            <StatTile label="Pending" value={pendingHelpers + pendingParents} tone="warn" sub="awaiting review" delay={0} />
            <StatTile label="Helpers" value={helperCount} tone="accent" sub="total" delay={60} />
            <StatTile label="Parents" value={parentCount} tone="info" sub="total" delay={120} />
          </StatRow>
        )}

        {/* Role segmented */}
        <AnimateIn delay={170} style={{ flexDirection: "row", gap: 8, marginTop: space.lg }}>
          {(["helper", "parent"] as const).map((role) => {
            const active = activeRole === role;
            const pending = role === "helper" ? pendingHelpers : pendingParents;
            return (
              <Pressable key={role} onPress={() => setActiveRole(role)}
                style={({ hovered }: any) => [{ flex: 1, maxWidth: 220, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: radius.md, transitionDuration: "140ms",
                  backgroundColor: active ? c.accentSoft : hovered ? c.raise : c.surface, borderWidth: 1.4, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                <Ionicons name={role === "helper" ? "briefcase-outline" : "people-outline"} size={17} color={active ? c.accent : c.muted} />
                <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: active ? c.accentInk : c.muted }}>{role === "helper" ? "Helpers" : "Parents"}</Text>
                {pending > 0 && <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: active ? c.accent : c.sunken, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: active ? "#fff" : c.muted, fontSize: 11, fontFamily: font.semibold }}>{pending}</Text></View>}
              </Pressable>
            );
          })}
        </AnimateIn>

        {/* Search */}
        <AnimateIn delay={215} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 10, marginTop: space.md }}>
          <Ionicons name="search" size={16} color={c.subtle} />
          <TextInput style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: c.ink, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) }}
            placeholder={`Search ${activeRole}s by name or email…`} placeholderTextColor={c.subtle} value={searchQuery} onChangeText={setSearchQuery} />
          {!!searchQuery && <Pressable onPress={() => setSearchQuery("")} hitSlop={10}><Ionicons name="close-circle" size={16} color={c.subtle} /></Pressable>}
        </AnimateIn>

        {/* Filter chips */}
        <AnimateIn delay={260}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: space.md }} contentContainerStyle={{ gap: 8 }}>
          {FILTER_TABS.map((status) => {
            const active = filterStatus === status;
            const count = status === "All" ? undefined : countFor(status);
            return (
              <Pressable key={status} onPress={() => setFilterStatus(status)}
                style={({ hovered }: any) => [{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, transitionDuration: "140ms", backgroundColor: active ? c.accent : hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: active ? c.accent : hovered ? c.accent : c.line } as any]}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: active ? "#fff" : c.muted }}>{status === "All" ? "All statuses" : status}</Text>
                {count !== undefined && <View style={{ minWidth: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: active ? "rgba(255,255,255,0.25)" : c.sunken, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontFamily: font.semibold, color: active ? "#fff" : c.muted }}>{count}</Text></View>}
              </Pressable>
            );
          })}
        </ScrollView>
        </AnimateIn>

        {/* AI-scan filter */}
        <AnimateIn delay={300}>
        <View style={{ flexDirection: "row", gap: 8, marginTop: space.sm }}>
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
      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={activeRole === "helper" ? "briefcase-outline" : "people-outline"} title={`No ${activeRole}s ${filterStatus !== "All" ? `with "${filterStatus}" status` : "found"}`}
          sub={searchQuery ? "Try a different search or clear filters." : `No ${activeRole}s are waiting for review right now.`} />
      ) : (
        <FlatList style={layout.flex1} data={filtered} keyExtractor={(i) => String(i.user_id)} renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: 40, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />} />
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
