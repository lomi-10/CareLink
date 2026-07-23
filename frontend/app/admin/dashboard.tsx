import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import API_URL from "../../constants/api";
import { fetchAdminComplaints } from "@/lib/complaintsApi";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminTheme, type AdminPalette } from "@/contexts/AdminThemeContext";

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
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, peso: 0, logs: 0, complaintsOpen: 0 });
  const [complaints, setComplaints] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [overview, setOverview] = useState<{ activeContracts: number; peso: any[] }>({ activeContracts: 0, peso: [] });

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
        const open = list.filter((x: any) => x.status === "Pending");
        setComplaints(open.slice(0, 4));
        setStats((p) => ({ ...p, complaintsOpen: open.length }));

        const ov = await (await fetch(`${API_URL}/admin/admin_get_overview.php?admin_user_id=${adminUid}`)).json().catch(() => null);
        if (ov?.success) setOverview({ activeContracts: ov.active_contracts ?? 0, peso: ov.peso_performance ?? [] });
      }
    } catch (e) {
      console.error("admin dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

  const STAT_CARDS = [
    { icon: "people" as const, color: c.blue, value: stats.total, label: "Total Users", sub: "All system users" },
    { icon: "business" as const, color: c.purple, value: stats.peso, label: "PESO Accounts", sub: "Verified staff" },
    { icon: "document-text" as const, color: c.blue, value: overview.activeContracts, label: "Active Contracts", sub: "Ongoing placements" },
    { icon: "time" as const, color: c.amber, value: stats.pending, label: "Pending Verifications", sub: "Awaiting review" },
    { icon: "warning" as const, color: c.red, value: stats.complaintsOpen, label: "Open Complaints", sub: "Requires attention" },
    { icon: "pulse" as const, color: c.green, value: stats.logs, label: "Audit Log Entries", sub: "Recorded actions" },
  ];

  const Panel = ({ title, badge, children, onMore, style }: any) => (
    <View style={[s.panel, style]}>
      <View style={s.panelHead}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={s.panelTitle}>{title}</Text>
          {badge > 0 && <View style={s.headBadge}><Text style={s.headBadgeText}>{badge}</Text></View>}
        </View>
        {onMore && (
          <TouchableOpacity onPress={onMore} activeOpacity={0.7}>
            <Text style={s.more}>View all →</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );

  const datePill = (
    <View style={s.datePill}>
      <Ionicons name="calendar-outline" size={14} color={c.muted} />
      <Text style={s.dateText}>{today}</Text>
    </View>
  );

  return (
    <AdminShell
      active="dashboard"
      title={`Welcome back, ${adminName}! 👋`}
      subtitle="Super Administrator Dashboard Overview"
      complaintsBadge={stats.complaintsOpen}
      headerRight={datePill}
    >
      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 80 }} />
      ) : (
        <>
          {/* Stat cards */}
          <View style={s.statRow}>
            {STAT_CARDS.map((card) => (
              <View key={card.label} style={s.statCard}>
                <View style={[s.statIcon, { backgroundColor: card.color + "22" }]}>
                  <Ionicons name={card.icon} size={20} color={card.color} />
                </View>
                <Text style={s.statValue}>{Number(card.value).toLocaleString()}</Text>
                <Text style={s.statLabel}>{card.label}</Text>
                <Text style={s.statSub}>{card.sub}</Text>
              </View>
            ))}
          </View>

          {/* Panels grid 1 */}
          <View style={[s.grid, !wide && { flexDirection: "column" }]}>
            <Panel title="Platform Health" style={wide ? { flex: 1 } : {}}>
              {HEALTH.map((h) => (
                <View key={h.label} style={s.healthRow}>
                  <Ionicons name={h.icon} size={16} color={c.muted} />
                  <Text style={s.healthLabel}>{h.label}</Text>
                  <View style={s.opPill}>
                    <View style={s.opDot} />
                    <Text style={s.opText}>Operational</Text>
                  </View>
                </View>
              ))}
              <View style={s.healthFooter}>
                <Ionicons name="checkmark-circle" size={15} color={c.green} />
                <Text style={s.healthFooterText}>All systems operational</Text>
              </View>
            </Panel>

            <Panel title="Open Complaints" badge={stats.complaintsOpen}
              onMore={() => router.push("/admin/complaints")} style={wide ? { flex: 1 } : {}}>
              {complaints.length === 0 ? (
                <Text style={s.empty}>No open complaints 🎉</Text>
              ) : complaints.map((x) => {
                const sev = (x.severity || "").toLowerCase();
                const sc = sev === "high" ? c.red : sev === "medium" ? c.amber : c.subtle;
                return (
                  <View key={x.complaint_id} style={s.listRow}>
                    <View style={[s.dot, { backgroundColor: sc }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.listTitle} numberOfLines={1}>{x.subject || "Complaint"}</Text>
                      <Text style={s.listMeta} numberOfLines={1}>Case #{x.complaint_id} · {x.category || "general"}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      {!!x.severity && (
                        <View style={[s.sevPill, { backgroundColor: sc + "22" }]}>
                          <Text style={[s.sevText, { color: sc }]}>{x.severity}</Text>
                        </View>
                      )}
                      <Text style={s.timeText}>{timeAgo(x.created_at)}</Text>
                    </View>
                  </View>
                );
              })}
            </Panel>
          </View>

          {/* Panels grid 2 */}
          <View style={[s.grid, !wide && { flexDirection: "column" }]}>
            <Panel title="Recent Audit Activity" onMore={() => router.push("/admin/logs")} style={wide ? { flex: 1 } : {}}>
              {logs.length === 0 ? (
                <Text style={s.empty}>No recent activity.</Text>
              ) : logs.map((l) => (
                <View key={l.log_id} style={s.listRow}>
                  <View style={[s.auditIcon, { backgroundColor: (l.status === "Failed" ? c.red : c.blue) + "22" }]}>
                    <Ionicons name={l.status === "Failed" ? "alert-circle" : "checkmark-circle"} size={15}
                      color={l.status === "Failed" ? c.red : c.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle} numberOfLines={1}>{l.action || "Action"}</Text>
                    <Text style={s.listMeta} numberOfLines={1}>{l.username || "System"}{l.role ? ` · ${l.role}` : ""}</Text>
                  </View>
                  <Text style={s.timeText}>{timeAgo(l.timestamp)}</Text>
                </View>
              ))}
            </Panel>

            <Panel title="PESO Staff Performance" style={wide ? { flex: 1 } : {}}>
              {overview.peso.length === 0 ? (
                <Text style={s.empty}>No PESO staff accounts yet.</Text>
              ) : (
                <>
                  <View style={s.tHead}>
                    <Text style={[s.th, { flex: 2 }]}>Officer</Text>
                    <Text style={s.th}>Helpers</Text>
                    <Text style={s.th}>Docs</Text>
                    <Text style={s.th}>Jobs</Text>
                  </View>
                  {overview.peso.map((p) => (
                    <View key={p.user_id} style={s.tRow}>
                      <Text style={[s.tName, { flex: 2 }]} numberOfLines={1}>{p.name}</Text>
                      <Text style={s.td}>{p.verified_helpers}</Text>
                      <Text style={s.td}>{p.verified_docs}</Text>
                      <Text style={s.td}>{p.verified_jobs}</Text>
                    </View>
                  ))}
                  <Text style={s.tHint}>Counts of helpers, documents & job posts each officer has verified.</Text>
                </>
              )}
            </Panel>
          </View>
        </>
      )}
    </AdminShell>
  );
}

// Palette-driven styles so the dashboard recolours with the navy/brown toggle.
const makeStyles = (c: AdminPalette) => StyleSheet.create({
  datePill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  dateText: { color: c.text, fontSize: 12.5, fontWeight: "600" },

  statRow: { flexDirection: "row", gap: 14, flexWrap: "wrap", marginBottom: 16 },
  statCard: { flex: 1, minWidth: 150, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16 },
  statIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  statValue: { fontSize: 26, fontWeight: "900", color: c.text },
  statLabel: { fontSize: 13, fontWeight: "700", color: c.text, marginTop: 2 },
  statSub: { fontSize: 11.5, color: c.muted, marginTop: 2 },

  grid: { flexDirection: "row", gap: 14, marginBottom: 14 },
  panel: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 18 },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  panelTitle: { fontSize: 15.5, fontWeight: "800", color: c.text },
  headBadge: { backgroundColor: c.red, borderRadius: 999, minWidth: 20, height: 20, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" },
  headBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  more: { fontSize: 12.5, fontWeight: "700", color: c.accent },
  empty: { fontSize: 13, color: c.muted, paddingVertical: 20, textAlign: "center" },

  healthRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  healthLabel: { flex: 1, fontSize: 13.5, color: c.text, fontWeight: "500" },
  opPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  opDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.green },
  opText: { fontSize: 12.5, color: c.green, fontWeight: "700" },
  healthFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border },
  healthFooterText: { fontSize: 13, color: c.green, fontWeight: "700" },

  listRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  dot: { width: 9, height: 9, borderRadius: 5 },
  auditIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  listTitle: { fontSize: 13.5, fontWeight: "700", color: c.text },
  listMeta: { fontSize: 11.5, color: c.muted, marginTop: 1 },
  timeText: { fontSize: 11, color: c.subtle },
  sevPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 3 },
  sevText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },

  tHead: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  th: { flex: 1, fontSize: 11, fontWeight: "800", color: c.subtle, textTransform: "uppercase", letterSpacing: 0.5 },
  tRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  tName: { flex: 1, fontSize: 13, fontWeight: "600", color: c.text },
  td: { flex: 1, fontSize: 13, color: c.muted },
  tHint: { fontSize: 11, color: c.subtle, marginTop: 10, lineHeight: 15 },
});
