// app/(peso)/user_verification.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API_URL from "../../constants/api";
import { theme } from "@/constants/theme";

export interface VerificationUser {
  user_id: number;
  name: string;
  email: string;
  user_type: string;
  contact_number?: string;
  profile_image?: string;
  verification_status: string;
  created_at?: string;
}

const STATUS_CONFIG = {
  Pending:  { bg: theme.color.warningSoft,  text: theme.color.warning, icon: "time-outline"             as const },
  Verified: { bg: theme.color.successSoft,  text: theme.color.success, icon: "shield-checkmark-outline" as const },
  Rejected: { bg: theme.color.dangerSoft,   text: theme.color.danger,  icon: "close-circle-outline"     as const },
  Unverified:{ bg: theme.color.surface,     text: theme.color.muted,   icon: "ellipse-outline"          as const },
};

const FILTER_TABS = ["Pending", "Verified", "Rejected", "All"] as const;
type FilterStatus = (typeof FILTER_TABS)[number];

export default function UserVerification() {
  const router = useRouter();

  const [users, setUsers]             = useState<VerificationUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("Pending");
  const [activeRole, setActiveRole]   = useState<"helper" | "parent">("helper");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/peso/get_pending_users.php`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.success) setUsers(data.data ?? []);
    } catch (e) {
      console.error("fetchUsers:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  // ─── derived counts ────────────────────────────────────────────────────────
  const helperCount  = useMemo(() => users.filter((u) => u.user_type === "helper").length,  [users]);
  const parentCount  = useMemo(() => users.filter((u) => u.user_type === "parent").length,  [users]);
  const pendingHelpers = useMemo(() => users.filter((u) => u.user_type === "helper" && u.verification_status === "Pending").length, [users]);
  const pendingParents = useMemo(() => users.filter((u) => u.user_type === "parent" && u.verification_status === "Pending").length, [users]);

  const countFor = (status: string) =>
    users.filter((u) => u.user_type === activeRole && u.verification_status === status).length;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (u.user_type !== activeRole) return false;
      if (filterStatus !== "All" && u.verification_status !== filterStatus) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.contact_number ?? "").includes(q)
      );
    });
  }, [users, activeRole, filterStatus, searchQuery]);

  // ─── card ──────────────────────────────────────────────────────────────────
  const renderCard = ({ item, index }: { item: VerificationUser; index: number }) => {
    const cfg = STATUS_CONFIG[item.verification_status as keyof typeof STATUS_CONFIG]
      ?? STATUS_CONFIG.Unverified;
    const isHelper = item.user_type === "helper";
    const ringColor = isHelper ? theme.color.helper : theme.color.parent;
    const ringBg    = isHelper ? theme.color.helperSoft : theme.color.parentSoft;
    const joinDate  = item.created_at
      ? new Date(item.created_at).toLocaleDateString("en-PH", { month: "short", year: "numeric" })
      : null;

    return (
      <TouchableOpacity
        style={[styles.card, index === 0 && { marginTop: 0 }]}
        activeOpacity={0.78}
        onPress={() =>
          router.push({
            pathname: "/(peso)/view_user_profile",
            params: { user_id: item.user_id, user_type: item.user_type },
          })
        }
      >
        {/* Avatar */}
        <View style={[styles.avatarRing, { backgroundColor: ringBg, borderColor: ringColor + "55" }]}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: ringBg }]}>
              <Ionicons name={isHelper ? "person" : "people"} size={30} color={ringColor} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardEmail} numberOfLines={1}>{item.email}</Text>

          <View style={styles.cardMeta}>
            {item.contact_number ? (
              <View style={styles.metaChip}>
                <Ionicons name="call-outline" size={12} color={theme.color.muted} />
                <Text style={styles.metaText}>{item.contact_number}</Text>
              </View>
            ) : null}
            {joinDate && (
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={12} color={theme.color.muted} />
                <Text style={styles.metaText}>Joined {joinDate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status + arrow */}
        <View style={styles.cardRight}>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.text} />
            <Text style={[styles.statusPillText, { color: cfg.text }]}>
              {item.verification_status}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.color.subtle} style={{ marginTop: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── PAGE HEADER ── */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>User Verification</Text>
          <Text style={styles.pageSubtitle}>
            {loading ? "Loading…" : `${users.length} total account${users.length !== 1 ? "s" : ""} in queue`}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchUsers} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color={theme.color.peso} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* ── SUMMARY STATS ── */}
      {!loading && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={theme.color.warning} />
            <Text style={styles.statNum}>{pendingHelpers + pendingParents}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="briefcase-outline" size={20} color={theme.color.helper} />
            <Text style={styles.statNum}>{helperCount}</Text>
            <Text style={styles.statLabel}>Helpers</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={20} color={theme.color.parent} />
            <Text style={styles.statNum}>{parentCount}</Text>
            <Text style={styles.statLabel}>Parents</Text>
          </View>
        </View>
      )}

      {/* ── ROLE TABS ── */}
      <View style={styles.roleTabs}>
        {(["helper", "parent"] as const).map((role) => {
          const active   = activeRole === role;
          const accent   = role === "helper" ? theme.color.helper : theme.color.parent;
          const accentBg = role === "helper" ? theme.color.helperSoft : theme.color.parentSoft;
          const pending  = role === "helper" ? pendingHelpers : pendingParents;
          const icon     = role === "helper" ? "briefcase-outline" : "people-outline" as const;

          return (
            <TouchableOpacity
              key={role}
              style={[
                styles.roleTab,
                active && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => setActiveRole(role)}
              activeOpacity={0.8}
            >
              <Ionicons name={icon} size={18} color={active ? "#fff" : accent} />
              <Text style={[styles.roleTabLabel, active ? { color: "#fff" } : { color: accent }]}>
                {role === "helper" ? "Helpers" : "Parents"}
              </Text>
              {pending > 0 && (
                <View
                  style={[
                    styles.roleTabBadge,
                    { backgroundColor: active ? "rgba(255,255,255,0.3)" : accentBg },
                  ]}
                >
                  <Text style={[styles.roleTabBadgeText, { color: active ? "#fff" : accent }]}>
                    {pending}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={theme.color.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeRole}s by name or email…`}
            placeholderTextColor={theme.color.subtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={theme.color.subtle} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── STATUS FILTER CHIPS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        {FILTER_TABS.map((status) => {
          const active = filterStatus === status;
          const cfg    = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const count  = status === "All" ? undefined : countFor(status);
          return (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
              activeOpacity={0.75}
            >
              {cfg && !active && (
                <Ionicons name={cfg.icon} size={13} color={active ? "#fff" : cfg.text} />
              )}
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {status === "All" ? "All statuses" : status}
              </Text>
              {count !== undefined && (
                <View style={[styles.chipCount, active && styles.chipCountActive]}>
                  <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── LIST ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.color.peso} />
          <Text style={styles.centerText}>Loading accounts…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={activeRole === "helper" ? "briefcase-outline" : "people-outline"}
            size={64}
            color={theme.color.subtle}
          />
          <Text style={styles.emptyTitle}>
            No {activeRole}s {filterStatus !== "All" ? `with "${filterStatus}" status` : "found"}
          </Text>
          <Text style={styles.emptyBody}>
            {searchQuery
              ? "Try a different search term or clear filters."
              : filterStatus === "Pending"
              ? `No ${activeRole}s are waiting for review right now.`
              : `No ${filterStatus.toLowerCase()} ${activeRole} accounts match.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.peso} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },

  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.color.ink,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: theme.color.muted,
    fontWeight: "600",
    marginTop: 3,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.nav,
  },
  refreshText: { fontSize: 13, fontWeight: "700", color: theme.color.ink },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.nav,
  },
  statNum: { fontSize: 22, fontWeight: "900", color: theme.color.ink },
  statLabel: { fontSize: 12, fontWeight: "700", color: theme.color.muted },

  roleTabs: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.color.line,
    ...theme.shadow.nav,
  },
  roleTabLabel: { fontSize: 15, fontWeight: "800" },
  roleTabBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: "center",
  },
  roleTabBadgeText: { fontSize: 12, fontWeight: "900" },

  searchWrap: { paddingHorizontal: 24, marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.color.ink, fontWeight: "500" },

  filterChipsRow: { flexDirection: "row", paddingHorizontal: 24, paddingBottom: 14, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  filterChipActive: { backgroundColor: theme.color.peso, borderColor: theme.color.peso },
  filterChipText: { fontSize: 13, fontWeight: "700", color: theme.color.muted },
  filterChipTextActive: { color: "#fff" },
  chipCount: {
    backgroundColor: theme.color.surface,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  chipCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipCountText: { fontSize: 11, fontWeight: "800", color: theme.color.muted },
  chipCountTextActive: { color: "#fff" },

  listContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 4 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },

  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: "800", color: theme.color.ink },
  cardEmail: { fontSize: 13, color: theme.color.muted, fontWeight: "500" },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.color.surface,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  metaText: { fontSize: 11, color: theme.color.muted, fontWeight: "600" },

  cardRight: { alignItems: "flex-end", gap: 4, marginLeft: 10 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusPillText: { fontSize: 12, fontWeight: "800" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, paddingHorizontal: 24 },
  centerText: { marginTop: 12, color: theme.color.muted, fontSize: 14 },
  emptyTitle: { marginTop: 16, fontSize: 17, fontWeight: "800", color: theme.color.ink, textAlign: "center" },
  emptyBody: { marginTop: 8, fontSize: 13, color: theme.color.muted, textAlign: "center", lineHeight: 20 },
});
