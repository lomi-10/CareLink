// app/(peso)/reports/index.tsx — PESO Reports & Analytics dashboard
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import API_URL from "@/constants/api";
import { theme } from "@/constants/theme";
import { withPesoStaffQuery } from "@/lib/pesoStaffQuery";
import { Donut, Legend, LineMini, HBars, type Segment } from "@/components/peso/reports/Charts";

const GRIEVANCE_COLORS = [theme.color.peso, theme.color.info, "#7C3AED", theme.color.warning, theme.color.danger, "#0891B2", theme.color.success, "#DB2777"];

function fmtDate(ts?: string) {
  if (!ts) return "—";
  const d = new Date(String(ts).replace(" ", "T"));
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function downloadCsv(name: string, headers: string[], data: (string | number)[][]) {
  if (Platform.OS !== "web") return false;
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...data.map((r) => r.map(esc).join(","))].join("\n");
  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch { return false; }
}

export default function ReportsAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const cols = width >= 1100 ? 3 : width >= 720 ? 2 : 1;

  const fetchData = useCallback(async () => {
    try {
      const url = await withPesoStaffQuery(`${API_URL}/peso/get_reports_analytics.php`);
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error("reports fetch", e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  if (loading && !data) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.color.peso} /></View>;
  }
  const c = data?.cards ?? {};
  const comp = data?.compliance ?? {};
  const demo = data?.demographics ?? { employers: 0, helpers: 0 };
  const vq = data?.verification_queue ?? { helper: 0, employer: 0 };

  const demoSeg: Segment[] = [
    { label: "Employers", value: demo.employers, color: theme.color.peso },
    { label: "Helpers", value: demo.helpers, color: theme.color.info },
  ];
  const vqSeg: Segment[] = [
    { label: "Helper Profiles", value: vq.helper, color: theme.color.peso },
    { label: "Employer Profiles", value: vq.employer, color: theme.color.info },
  ];
  const benefits = comp.benefits ?? { compliant: 0, partial: 0, noncompliant: 0 };
  const benTotal = (benefits.compliant + benefits.partial + benefits.noncompliant) || 1;
  const benSeg: Segment[] = [
    { label: "Compliant", value: benefits.compliant, color: theme.color.success },
    { label: "Partial", value: benefits.partial, color: theme.color.warning },
    { label: "Non-compliant", value: benefits.noncompliant, color: theme.color.danger },
  ];
  const cs = comp.contract_status ?? { active: 0, pending: 0, expired: 0 };
  const csTotal = (cs.active + cs.pending + cs.expired) || 1;
  const csSeg: Segment[] = [
    { label: "Active", value: cs.active, color: theme.color.success },
    { label: "Pending", value: cs.pending, color: theme.color.warning },
    { label: "Expired", value: cs.expired, color: theme.color.danger },
  ];
  const grievances: Segment[] = (data?.grievances_by_type ?? []).map((g: any, i: number) => ({ label: g.type, value: g.count, color: GRIEVANCE_COLORS[i % GRIEVANCE_COLORS.length] }));
  const grievTotal = grievances.reduce((sum: number, g: Segment) => sum + g.value, 0);
  const terms = (data?.termination_reasons ?? []).map((t: any) => ({ label: String(t.reason).replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase()), value: t.count }));

  const cardW = { width: cols === 1 ? ("100%" as const) : cols === 2 ? ("48%" as const) : ("31.5%" as const) };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.peso} />}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Reports & Analytics</Text>
          <Text style={s.subtitle}>Monitor platform performance, compliance, and operational activities</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color={theme.color.peso} />
          <Text style={s.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Stat cards */}
      <View style={s.statsRow}>
        <StatCard label="Total Placements" value={c.total_placements} delta={c.placements_delta} icon="briefcase" color={theme.color.peso} />
        <StatCard label="Pending Verifications" value={c.pending_verifications?.total} icon="time" color={theme.color.warning}
          foot={`Helper: ${c.pending_verifications?.helper ?? 0}   Employer: ${c.pending_verifications?.employer ?? 0}`} />
        <StatCard label="Registered Users" value={c.registered_users?.total} icon="people" color={theme.color.success}
          foot={`Employers: ${c.registered_users?.employers ?? 0}   Helpers: ${c.registered_users?.helpers ?? 0}`} />
        <StatCard label="Active Contracts" value={c.active_contracts} icon="document-text" color="#7C3AED" />
        <StatCard label="Active Grievances" value={c.active_grievances} delta={c.grievances_delta} deltaInverse icon="shield" color={theme.color.danger} />
      </View>

      {/* Section 1 */}
      <Section title="1. Employment & Placement Metrics">
        <View style={s.grid}>
          <Panel title="Placements Over Time" style={cardW}>
            <LineMini points={(data?.placements_over_time ?? []).map((p: any) => p.count)} />
          </Panel>
          <Panel title="User Demographics" style={cardW}>
            <View style={s.donutRow}>
              <Donut segments={demoSeg} centerValue={String(demo.employers + demo.helpers)} centerLabel="Total Users" />
              <Legend segments={demoSeg} suffix={(x) => `${x.value} ${x.label} (${Math.round((x.value / ((demo.employers + demo.helpers) || 1)) * 100)}%)`} />
            </View>
          </Panel>
          <Panel title="Verification Queue" style={cardW}>
            <View style={s.donutRow}>
              <Donut segments={vqSeg} centerValue={String(vq.helper + vq.employer)} centerLabel="Total Pending" />
              <Legend segments={vqSeg} />
            </View>
          </Panel>
        </View>
      </Section>

      {/* Section 2 */}
      <Section title="2. RA 10361 (Kasambahay Law) Compliance">
        <View style={s.grid}>
          <Panel title="Average Offered Salary" style={cardW}>
            <Text style={s.bigMoney}>₱{Number(comp.avg_salary ?? 0).toLocaleString()}</Text>
            <Text style={s.bigMoneySub}>per month</Text>
            {typeof comp.avg_salary_delta === "number" ? (
              <Text style={[s.deltaText, { color: comp.avg_salary_delta >= 0 ? theme.color.success : theme.color.danger }]}>
                {comp.avg_salary_delta >= 0 ? "▲" : "▼"} {Math.abs(comp.avg_salary_delta)}% vs last month
              </Text>
            ) : null}
            <View style={s.minWageBox}>
              <Text style={s.minWageLabel}>Minimum Wage (Region VIII)</Text>
              <Text style={s.minWageValue}>₱{Number(comp.min_wage ?? 6500).toLocaleString()} / month</Text>
            </View>
          </Panel>
          <Panel title="Benefits Compliance" style={cardW}>
            <View style={s.donutRow}>
              <Donut segments={benSeg} centerValue={`${Math.round((benefits.compliant / benTotal) * 100)}%`} centerLabel="Compliant" />
              <Legend segments={benSeg} suffix={(x) => `${Math.round((x.value / benTotal) * 100)}% ${x.label}`} />
            </View>
          </Panel>
          <Panel title="Contract Status" style={cardW}>
            <View style={s.donutRow}>
              <Donut segments={csSeg} centerValue={String(cs.active + cs.pending + cs.expired)} centerLabel="Total" />
              <Legend segments={csSeg} suffix={(x) => `${x.value} ${x.label} (${Math.round((x.value / csTotal) * 100)}%)`} />
            </View>
          </Panel>
        </View>
      </Section>

      {/* Section 3 */}
      <Section title="3. Dispute & Incident Management">
        <View style={s.grid}>
          <Panel title="Active Grievances by Type" style={cols === 1 ? cardW : { width: "40%" }}>
            {grievances.length ? (
              <View style={s.donutRow}>
                <Donut segments={grievances} centerValue={String(grievTotal)} centerLabel="Total" />
                <Legend segments={grievances} />
              </View>
            ) : <Empty text="No active grievances" />}
          </Panel>
          <Panel title="Termination Reasons" style={cols === 1 ? cardW : { flex: 1 }}>
            {terms.length ? <HBars items={terms} color={theme.color.peso} /> : <Empty text="No terminations recorded" />}
          </Panel>
        </View>
      </Section>

      {/* Section 4 — audit log */}
      <Section title="4. System Audit & Log Trails">
        <Panel title="Recent Activity Logs">
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 1.4 }]}>DATE & TIME</Text>
            <Text style={[s.th, { flex: 1.2 }]}>USER</Text>
            <Text style={[s.th, { flex: 1 }]}>ACTION</Text>
            <Text style={[s.th, { flex: 2 }]}>DETAILS</Text>
          </View>
          {(data?.recent_activities ?? []).length ? (data?.recent_activities ?? []).map((a: any, i: number) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.td, { flex: 1.4, color: theme.color.muted }]}>{fmtDate(a.ts)}</Text>
              <Text style={[s.td, { flex: 1.2, fontWeight: "700" }]}>{a.actor}</Text>
              <View style={{ flex: 1 }}>
                <View style={s.actionChip}><Text style={s.actionChipText}>{a.action}</Text></View>
              </View>
              <Text style={[s.td, { flex: 2, color: theme.color.muted }]} numberOfLines={2}>{a.details}</Text>
            </View>
          )) : <Empty text="No recent activity" />}
        </Panel>
      </Section>

      {/* Quick reports */}
      <Section title="Quick Reports & Export">
        <View style={s.grid}>
          <ExportCard icon="document-text-outline" title="Placements Report" sub="Export placement summary" style={cardW}
            onPress={() => downloadCsv("placements_over_time.csv", ["Week", "Placements"], (data?.placements_over_time ?? []).map((p: any) => [p.label, p.count]))} />
          <ExportCard icon="shield-checkmark-outline" title="Compliance Report" sub="RA 10361 compliance" style={cardW}
            onPress={() => downloadCsv("benefits_compliance.csv", ["Status", "Count"], benSeg.map((b) => [b.label, b.value]))} />
          <ExportCard icon="people-outline" title="User Demographics" sub="User statistics report" style={cardW}
            onPress={() => downloadCsv("user_demographics.csv", ["Group", "Count"], demoSeg.map((d) => [d.label, d.value]))} />
          <ExportCard icon="alert-circle-outline" title="Grievance Report" sub="Dispute & incident report" style={cardW}
            onPress={() => downloadCsv("grievances_by_type.csv", ["Type", "Count"], grievances.map((g: Segment) => [g.label, g.value]))} />
          <ExportCard icon="download-outline" title="All Reports (CSV)" sub="Export activity log" style={cardW}
            onPress={() => downloadCsv("activity_log.csv", ["Date", "User", "Action", "Details"], (data?.recent_activities ?? []).map((a: any) => [fmtDate(a.ts), a.actor, a.action, a.details]))} />
        </View>
        {Platform.OS !== "web" ? <Text style={s.exportNote}>CSV export is available on the web dashboard.</Text> : null}
      </Section>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ── pieces ──
function StatCard({ label, value, delta, deltaInverse, icon, color, foot }: any) {
  const up = (delta ?? 0) >= 0;
  const good = deltaInverse ? !up : up;
  return (
    <View style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: color + "18" }]}><Ionicons name={icon} size={20} color={color} /></View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{Number(value ?? 0).toLocaleString()}</Text>
      {typeof delta === "number" ? (
        <Text style={[s.statDelta, { color: good ? theme.color.success : theme.color.danger }]}>
          {up ? "▲" : "▼"} {Math.abs(delta)}% vs last month
        </Text>
      ) : foot ? <Text style={s.statFoot}>{foot}</Text> : null}
    </View>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>;
}
function Panel({ title, children, style }: { title: string; children: React.ReactNode; style?: any }) {
  return <View style={[s.panel, style]}><Text style={s.panelTitle}>{title}</Text>{children}</View>;
}
function ExportCard({ icon, title, sub, onPress, style }: any) {
  return (
    <TouchableOpacity style={[s.exportCard, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={s.exportIcon}><Ionicons name={icon} size={20} color={theme.color.peso} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.exportTitle}>{title}</Text>
        <Text style={s.exportSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.color.subtle} />
    </TouchableOpacity>
  );
}
function Empty({ text }: { text: string }) {
  return <View style={s.emptyBox}><Text style={s.emptyText}>{text}</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.color.canvasPeso },
  content: { padding: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 26, fontWeight: "800", color: theme.color.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: theme.color.muted, marginTop: 2 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: theme.color.line, backgroundColor: theme.color.surface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  refreshText: { color: theme.color.peso, fontWeight: "700", fontSize: 13 },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  statCard: { flex: 1, minWidth: 180, backgroundColor: theme.color.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.color.line, padding: 16, gap: 4 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statLabel: { fontSize: 12.5, color: theme.color.muted, fontWeight: "600" },
  statValue: { fontSize: 26, fontWeight: "800", color: theme.color.ink },
  statDelta: { fontSize: 12, fontWeight: "700" },
  statFoot: { fontSize: 11.5, color: theme.color.muted, fontWeight: "600" },

  section: { marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: theme.color.ink, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  panel: { backgroundColor: theme.color.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.color.line, padding: 16, minWidth: 220 },
  panelTitle: { fontSize: 14, fontWeight: "800", color: theme.color.ink, marginBottom: 14 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" },

  bigMoney: { fontSize: 30, fontWeight: "800", color: theme.color.ink },
  bigMoneySub: { fontSize: 12, color: theme.color.muted, marginTop: -2 },
  deltaText: { fontSize: 12.5, fontWeight: "700", marginTop: 6 },
  minWageBox: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.color.line },
  minWageLabel: { fontSize: 11.5, color: theme.color.muted, fontWeight: "600" },
  minWageValue: { fontSize: 17, fontWeight: "800", color: theme.color.ink, marginTop: 2 },

  tableHead: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.color.line, gap: 8 },
  th: { fontSize: 10.5, fontWeight: "800", color: theme.color.subtle, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.color.line, gap: 8 },
  td: { fontSize: 12.5, color: theme.color.ink },
  actionChip: { alignSelf: "flex-start", backgroundColor: theme.color.pesoSoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  actionChipText: { fontSize: 11, fontWeight: "700", color: theme.color.peso },

  exportCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.color.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.color.line, padding: 14, minWidth: 200 },
  exportIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.color.pesoSoft, alignItems: "center", justifyContent: "center" },
  exportTitle: { fontSize: 13.5, fontWeight: "800", color: theme.color.ink },
  exportSub: { fontSize: 11.5, color: theme.color.muted, marginTop: 1 },
  exportNote: { fontSize: 12, color: theme.color.muted, marginTop: 10 },

  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 13, color: theme.color.muted },
});
