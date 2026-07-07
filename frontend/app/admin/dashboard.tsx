import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, Modal, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import { CareLinkLogoMark } from "@/components/branding/CareLinkLogoMark";
import API_URL from "../../constants/api";
import { fetchAdminComplaints } from "@/lib/complaintsApi";

// ── Dark palette (reference) ──────────────────────────────────────────────────
const BG      = "#0B1526";
const PANEL   = "#132038";
const PANEL2  = "#0F1A2E";
const BORDER  = "rgba(255,255,255,0.08)";
const TEXT    = "#EAF0F8";
const MUTED   = "#8595AD";
const SUBTLE  = "#5C6B85";
const BLUE    = "#3B82F6";
const GREEN   = "#22C55E";
const RED     = "#EF4444";
const AMBER   = "#F59E0B";
const PURPLE  = "#8B5CF6";

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso.replace(" ", "T")).getTime();
  if (isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const HEALTH = [
  { label: "API Gateway", icon: "git-network-outline" as const },
  { label: "Database", icon: "server-outline" as const },
  { label: "Messaging Service", icon: "chatbubbles-outline" as const },
  { label: "AI Matching Service", icon: "sparkles-outline" as const },
  { label: "File Storage", icon: "folder-outline" as const },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width > 900;

  const [adminName, setAdminName] = useState("Admin");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, peso: 0, logs: 0, complaintsOpen: 0 });
  const [complaints, setComplaints] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => { loadUser(); fetchAll(); }, []);

  const loadUser = async () => {
    const raw = await AsyncStorage.getItem("user_data");
    if (raw) setAdminName(JSON.parse(raw)?.first_name || "Admin");
  };

  const fetchAll = async () => {
    try {
      const raw = await AsyncStorage.getItem("user_data");
      const adminUid = raw ? Number(JSON.parse(raw)?.user_id) : 0;

      const users = await (await fetch(`${API_URL}/admin_get_users.php`)).json().catch(() => []);
      if (Array.isArray(users)) {
        setStats((p) => ({
          ...p,
          total: users.length,
          pending: users.filter((u: any) => u.status === "pending").length,
          peso: users.filter((u: any) => u.user_type === "peso").length,
        }));
      }

      const logList = await (await fetch(`${API_URL}/admin/admin_get_logs.php?admin_user_id=${adminUid}`)).json().catch(() => []);
      if (Array.isArray(logList)) {
        setLogs(logList.slice(0, 5));
        setStats((p) => ({ ...p, logs: logList.length }));
      }

      if (adminUid) {
        const cRes = await fetchAdminComplaints(adminUid);
        const list = cRes.success && cRes.complaints ? cRes.complaints : [];
        const open = list.filter((c: any) => c.status === "Pending");
        setComplaints(open.slice(0, 4));
        setStats((p) => ({ ...p, complaintsOpen: open.length }));
      }
    } catch (e) {
      console.error("admin dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  const confirmLogout = async () => {
    await AsyncStorage.clear();
    setLogoutModalVisible(false);
    router.replace("/welcome");
  };

  const today = new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

  const STAT_CARDS = [
    { icon: "people" as const, color: BLUE,   value: stats.total,          label: "Total Users",          sub: "All system users" },
    { icon: "business" as const, color: PURPLE, value: stats.peso,          label: "PESO Accounts",        sub: "Verified staff" },
    { icon: "time" as const, color: AMBER,    value: stats.pending,         label: "Pending Verifications", sub: "Awaiting review" },
    { icon: "warning" as const, color: RED,   value: stats.complaintsOpen,  label: "Open Complaints",      sub: "Requires attention" },
    { icon: "pulse" as const, color: GREEN,   value: stats.logs,            label: "Audit Log Entries",    sub: "Recorded actions" },
  ];

  // ── Sidebar ──
  const NavItem = ({ icon, label, active, badge, onPress }: any) => (
    <TouchableOpacity style={[ns.item, active && ns.itemActive]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={active ? "#fff" : MUTED} />
      <Text style={[ns.itemText, active && { color: "#fff" }]}>{label}</Text>
      {badge > 0 && <View style={ns.badge}><Text style={ns.badgeText}>{badge}</Text></View>}
    </TouchableOpacity>
  );

  const Sidebar = () => (
    <View style={[ns.sidebar, wide ? { width: 250 } : { width: "100%" }]}>
      <View style={ns.brandRow}>
        <CareLinkLogoMark size={34} containerStyle={{ marginRight: 10 }} />
        <View>
          <Text style={ns.brand}>CareLink</Text>
          <Text style={ns.brandSub}>Super Admin Portal</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={ns.group}>OVERVIEW</Text>
        <NavItem icon="grid" label="Dashboard" active onPress={() => {}} />

        <Text style={ns.group}>USER & ADMIN</Text>
        <NavItem icon="people" label="User Verification" onPress={() => router.push("/admin/user_management")} />
        <NavItem icon="person-add" label="Admin & PESO Accounts" onPress={() => router.push("/admin/create_admin_user")} />

        <Text style={ns.group}>SYSTEM</Text>
        <NavItem icon="list" label="Audit Trail" onPress={() => router.push("/admin/logs")} />
        <NavItem icon="warning" label="Complaints" badge={stats.complaintsOpen} onPress={() => router.push("/admin/complaints")} />
      </ScrollView>

      <TouchableOpacity style={ns.logout} onPress={() => setLogoutModalVisible(true)} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color={RED} />
        <Text style={ns.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );

  const Panel = ({ title, badge, children, onMore, style }: any) => (
    <View style={[ps.panel, style]}>
      <View style={ps.panelHead}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={ps.panelTitle}>{title}</Text>
          {badge > 0 && <View style={ps.headBadge}><Text style={ps.headBadgeText}>{badge}</Text></View>}
        </View>
        {onMore && (
          <TouchableOpacity onPress={onMore} activeOpacity={0.7}>
            <Text style={ps.more}>View all →</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        <Sidebar />

        {/* MAIN */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 26 : 16, paddingBottom: 60 }}>
          {/* Header */}
          <View style={hs.header}>
            <View style={{ flex: 1 }}>
              <Text style={hs.hello}>Welcome back, {adminName}! 👋</Text>
              <Text style={hs.helloSub}>Super Administrator Dashboard Overview</Text>
            </View>
            <View style={hs.headerRight}>
              <View style={hs.datePill}>
                <Ionicons name="calendar-outline" size={14} color={MUTED} />
                <Text style={hs.dateText}>{today}</Text>
              </View>
              <TouchableOpacity style={hs.bell} onPress={() => router.push("/admin/complaints")} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={18} color={TEXT} />
                {stats.complaintsOpen > 0 && <View style={hs.bellDot} />}
              </TouchableOpacity>
              <View style={hs.avatar}><Ionicons name="person" size={18} color="#fff" /></View>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 80 }} />
          ) : (
            <>
              {/* Stat cards */}
              <View style={cs.statRow}>
                {STAT_CARDS.map((c) => (
                  <View key={c.label} style={cs.statCard}>
                    <View style={[cs.statIcon, { backgroundColor: c.color + "22" }]}>
                      <Ionicons name={c.icon} size={20} color={c.color} />
                    </View>
                    <Text style={cs.statValue}>{Number(c.value).toLocaleString()}</Text>
                    <Text style={cs.statLabel}>{c.label}</Text>
                    <Text style={cs.statSub}>{c.sub}</Text>
                  </View>
                ))}
              </View>

              {/* Panels grid */}
              <View style={[ps.grid, !wide && { flexDirection: "column" }]}>
                {/* Platform Health */}
                <Panel title="Platform Health" style={wide ? { flex: 1 } : {}}>
                  {HEALTH.map((h) => (
                    <View key={h.label} style={ps.healthRow}>
                      <Ionicons name={h.icon} size={16} color={MUTED} />
                      <Text style={ps.healthLabel}>{h.label}</Text>
                      <View style={ps.opPill}>
                        <View style={ps.opDot} />
                        <Text style={ps.opText}>Operational</Text>
                      </View>
                    </View>
                  ))}
                  <View style={ps.healthFooter}>
                    <Ionicons name="checkmark-circle" size={15} color={GREEN} />
                    <Text style={ps.healthFooterText}>All systems operational</Text>
                  </View>
                </Panel>

                {/* High Priority Complaints */}
                <Panel title="Open Complaints" badge={stats.complaintsOpen}
                  onMore={() => router.push("/admin/complaints")} style={wide ? { flex: 1 } : {}}>
                  {complaints.length === 0 ? (
                    <Text style={ps.empty}>No open complaints 🎉</Text>
                  ) : complaints.map((c) => {
                    const sev = (c.severity || "").toLowerCase();
                    const sc = sev === "high" ? RED : sev === "medium" ? AMBER : SUBTLE;
                    return (
                      <View key={c.complaint_id} style={ps.listRow}>
                        <View style={[ps.dot, { backgroundColor: sc }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={ps.listTitle} numberOfLines={1}>{c.subject || "Complaint"}</Text>
                          <Text style={ps.listMeta} numberOfLines={1}>
                            Case #{c.complaint_id} · {c.category || "general"}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          {!!c.severity && (
                            <View style={[ps.sevPill, { backgroundColor: sc + "22" }]}>
                              <Text style={[ps.sevText, { color: sc }]}>{c.severity}</Text>
                            </View>
                          )}
                          <Text style={ps.timeText}>{timeAgo(c.created_at)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </Panel>
              </View>

              <View style={[ps.grid, !wide && { flexDirection: "column" }]}>
                {/* Recent Audit Activity */}
                <Panel title="Recent Audit Activity" onMore={() => router.push("/admin/logs")} style={wide ? { flex: 1 } : {}}>
                  {logs.length === 0 ? (
                    <Text style={ps.empty}>No recent activity.</Text>
                  ) : logs.map((l) => (
                    <View key={l.log_id} style={ps.listRow}>
                      <View style={[ps.auditIcon, { backgroundColor: (l.status === "Failed" ? RED : BLUE) + "22" }]}>
                        <Ionicons name={l.status === "Failed" ? "alert-circle" : "checkmark-circle"} size={15}
                          color={l.status === "Failed" ? RED : BLUE} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={ps.listTitle} numberOfLines={1}>{l.action || "Action"}</Text>
                        <Text style={ps.listMeta} numberOfLines={1}>
                          {l.username ? `${l.username}` : "System"}{l.role ? ` · ${l.role}` : ""}
                        </Text>
                      </View>
                      <Text style={ps.timeText}>{timeAgo(l.timestamp)}</Text>
                    </View>
                  ))}
                </Panel>

                {/* Quick Actions */}
                <Panel title="Quick Actions" style={wide ? { flex: 1 } : {}}>
                  {[
                    { icon: "person-add" as const, label: "Create PESO / Admin account", color: PURPLE, to: "/admin/create_admin_user" },
                    { icon: "people" as const, label: "Review user verifications", color: BLUE, to: "/admin/user_management" },
                    { icon: "warning" as const, label: "Manage complaints", color: RED, to: "/admin/complaints" },
                    { icon: "list" as const, label: "View full audit trail", color: GREEN, to: "/admin/logs" },
                  ].map((a) => (
                    <TouchableOpacity key={a.label} style={ps.qaRow} onPress={() => router.push(a.to as any)} activeOpacity={0.8}>
                      <View style={[ps.qaIcon, { backgroundColor: a.color + "22" }]}>
                        <Ionicons name={a.icon} size={16} color={a.color} />
                      </View>
                      <Text style={ps.qaLabel}>{a.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
                    </TouchableOpacity>
                  ))}
                </Panel>
              </View>
            </>
          )}
        </ScrollView>
      </View>

      {/* Logout modal */}
      <Modal animationType="fade" transparent visible={logoutModalVisible}>
        <View style={ms.overlay}>
          <View style={ms.box}>
            <Text style={ms.title}>Log Out</Text>
            <Text style={ms.msg}>Are you sure you want to log out?</Text>
            <View style={ms.btns}>
              <TouchableOpacity style={[ms.btn, ms.cancel]} onPress={() => setLogoutModalVisible(false)}>
                <Text style={ms.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ms.btn, ms.confirm]} onPress={confirmLogout}>
                <Text style={ms.confirmText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sidebar styles ──
const ns = StyleSheet.create({
  sidebar: { backgroundColor: PANEL2, borderRightWidth: 1, borderRightColor: BORDER, padding: 16, height: "100%" },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 22, paddingHorizontal: 4 },
  brand: { fontSize: 18, fontWeight: "900", color: "#fff" },
  brandSub: { fontSize: 10, color: MUTED, fontWeight: "700", letterSpacing: 0.5, marginTop: 1 },
  group: { fontSize: 10.5, fontWeight: "800", color: SUBTLE, letterSpacing: 1, marginTop: 18, marginBottom: 8, marginLeft: 6 },
  item: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
  itemActive: { backgroundColor: BLUE },
  itemText: { fontSize: 14, fontWeight: "600", color: MUTED, flex: 1 },
  badge: { backgroundColor: RED, borderRadius: 999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  logout: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 8 },
  logoutText: { color: RED, fontSize: 14, fontWeight: "700" },
});

// ── Header styles ──
const hs = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: 22, gap: 12, flexWrap: "wrap" },
  hello: { fontSize: 24, fontWeight: "900", color: TEXT },
  helloSub: { fontSize: 13, color: MUTED, marginTop: 3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  datePill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: PANEL, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  dateText: { color: TEXT, fontSize: 12.5, fontWeight: "600" },
  bell: { width: 40, height: 40, borderRadius: 10, backgroundColor: PANEL, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: RED, borderWidth: 1.5, borderColor: PANEL },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
});

// ── Stat card styles ──
const cs = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 14, flexWrap: "wrap", marginBottom: 16 },
  statCard: { flex: 1, minWidth: 150, backgroundColor: PANEL, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 16 },
  statIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statValue: { fontSize: 26, fontWeight: "900", color: TEXT },
  statLabel: { fontSize: 13, fontWeight: "700", color: TEXT, marginTop: 2 },
  statSub: { fontSize: 11.5, color: MUTED, marginTop: 2 },
});

// ── Panel styles ──
const ps = StyleSheet.create({
  grid: { flexDirection: "row", gap: 14, marginBottom: 14 },
  panel: { backgroundColor: PANEL, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 16 },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  panelTitle: { fontSize: 15, fontWeight: "800", color: TEXT },
  headBadge: { backgroundColor: RED, borderRadius: 999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  headBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  more: { fontSize: 12.5, fontWeight: "700", color: BLUE },
  empty: { color: MUTED, fontSize: 13, paddingVertical: 16, textAlign: "center" },

  healthRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  healthLabel: { flex: 1, color: TEXT, fontSize: 13, fontWeight: "600" },
  opPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  opDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  opText: { color: GREEN, fontSize: 12, fontWeight: "700" },
  healthFooter: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  healthFooterText: { color: GREEN, fontSize: 12.5, fontWeight: "700" },

  listRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  dot: { width: 8, height: 8, borderRadius: 4 },
  auditIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  listTitle: { color: TEXT, fontSize: 13, fontWeight: "700" },
  listMeta: { color: MUTED, fontSize: 11.5, marginTop: 1 },
  sevPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sevText: { fontSize: 10.5, fontWeight: "800" },
  timeText: { color: SUBTLE, fontSize: 11, marginTop: 3 },

  qaRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  qaIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  qaLabel: { flex: 1, color: TEXT, fontSize: 13, fontWeight: "600" },
});

// ── Modal styles ──
const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 22 },
  box: { backgroundColor: PANEL, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 22, width: "100%", maxWidth: 360, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "900", color: TEXT },
  msg: { fontSize: 14, color: MUTED, textAlign: "center", marginTop: 8, marginBottom: 18 },
  btns: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  cancel: { backgroundColor: PANEL2, borderWidth: 1, borderColor: BORDER },
  cancelText: { color: TEXT, fontWeight: "800", fontSize: 14 },
  confirm: { backgroundColor: RED },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
