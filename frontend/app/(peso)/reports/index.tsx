// app/(peso)/reports/index.tsx — PESO Reports & Analytics dashboard
// Shared PESO design system: theme-aware (light/dark), animated, branded backdrop.
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, View, useWindowDimensions,
} from "react-native";
import API_URL from "@/constants/api";
import { withPesoStaffQuery } from "@/lib/pesoStaffQuery";
import { Donut, Legend, LineMini, HBars, type Segment } from "@/components/peso/reports/Charts";
import { usePesoTheme, ScreenHeader, IconButton, AnimateIn, layout, font, space, type PesoColors } from "@/components/peso/ui";

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
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
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

  const grievanceColors = useMemo(() => [c.accent, c.info, "#7C3AED", c.warn, c.bad, "#0891B2", c.ok, "#DB2777"], [c]);

  if (loading && !data) {
    return <View style={[layout.page(c.canvas), { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator size="large" color={c.accent} /></View>;
  }
  const cards = data?.cards ?? {};
  const comp = data?.compliance ?? {};
  const demo = data?.demographics ?? { employers: 0, helpers: 0 };
  const vq = data?.verification_queue ?? { helper: 0, employer: 0 };

  const demoSeg: Segment[] = [
    { label: "Employers", value: demo.employers, color: c.accent },
    { label: "Helpers", value: demo.helpers, color: c.info },
  ];
  const vqSeg: Segment[] = [
    { label: "Helper Profiles", value: vq.helper, color: c.accent },
    { label: "Employer Profiles", value: vq.employer, color: c.info },
  ];
  const benefits = comp.benefits ?? { compliant: 0, partial: 0, noncompliant: 0 };
  const benTotal = (benefits.compliant + benefits.partial + benefits.noncompliant) || 1;
  const benSeg: Segment[] = [
    { label: "Compliant", value: benefits.compliant, color: c.ok },
    { label: "Partial", value: benefits.partial, color: c.warn },
    { label: "Non-compliant", value: benefits.noncompliant, color: c.bad },
  ];
  const cs = comp.contract_status ?? { active: 0, pending: 0, expired: 0 };
  const csTotal = (cs.active + cs.pending + cs.expired) || 1;
  const csSeg: Segment[] = [
    { label: "Active", value: cs.active, color: c.ok },
    { label: "Pending", value: cs.pending, color: c.warn },
    { label: "Expired", value: cs.expired, color: c.bad },
  ];
  const grievances: Segment[] = (data?.grievances_by_type ?? []).map((g: any, i: number) => ({ label: g.type, value: g.count, color: grievanceColors[i % grievanceColors.length] }));
  const grievTotal = grievances.reduce((sum: number, g: Segment) => sum + g.value, 0);
  const terms = (data?.termination_reasons ?? []).map((t: any) => ({ label: String(t.reason).replace(/_/g, " ").replace(/\b\w/g, (m: string) => m.toUpperCase()), value: t.count }));

  const cardW = { width: cols === 1 ? ("100%" as const) : cols === 2 ? ("48%" as const) : ("31.5%" as const) };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "transparent" }} contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}>
      <ScreenHeader eyebrow="Reports & Analytics" title="Reports & Analytics"
        subtitle="Monitor platform performance, compliance, and operational activity."
        right={<IconButton icon="refresh" tone="accent" onPress={onRefresh} />} />

      <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
        {/* Stat cards */}
        <View style={s.statsRow}>
          <StatCard label="Total Placements" value={cards.total_placements} delta={cards.placements_delta} icon="briefcase" tone="accent" delay={0} />
          <StatCard label="Pending Verifications" value={cards.pending_verifications?.total} icon="time" tone="warn" delay={60}
            foot={`Helper: ${cards.pending_verifications?.helper ?? 0}   Employer: ${cards.pending_verifications?.employer ?? 0}`} />
          <StatCard label="Registered Users" value={cards.registered_users?.total} icon="people" tone="ok" delay={120}
            foot={`Employers: ${cards.registered_users?.employers ?? 0}   Helpers: ${cards.registered_users?.helpers ?? 0}`} />
          <StatCard label="Active Contracts" value={cards.active_contracts} icon="document-text" tone="violet" delay={180} />
          <StatCard label="Active Grievances" value={cards.active_grievances} delta={cards.grievances_delta} deltaInverse icon="shield" tone="bad" delay={240} />
        </View>

        {/* Section 1 */}
        <Section title="1. Employment & Placement Metrics">
          <View style={s.grid}>
            <Panel title="Placements Over Time" style={cardW} delay={0}>
              <LineMini points={(data?.placements_over_time ?? []).map((p: any) => p.count)} />
            </Panel>
            <Panel title="User Demographics" style={cardW} delay={60}>
              <View style={s.donutRow}>
                <Donut segments={demoSeg} centerValue={String(demo.employers + demo.helpers)} centerLabel="Total Users" />
                <Legend segments={demoSeg} suffix={(x) => `${x.value} ${x.label} (${Math.round((x.value / ((demo.employers + demo.helpers) || 1)) * 100)}%)`} />
              </View>
            </Panel>
            <Panel title="Verification Queue" style={cardW} delay={120}>
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
            <Panel title="Average Offered Salary" style={cardW} delay={0}>
              <Text style={s.bigMoney}>₱{Number(comp.avg_salary ?? 0).toLocaleString()}</Text>
              <Text style={s.bigMoneySub}>per month</Text>
              {typeof comp.avg_salary_delta === "number" ? (
                <Text style={[s.deltaText, { color: comp.avg_salary_delta >= 0 ? c.ok : c.bad }]}>
                  {comp.avg_salary_delta >= 0 ? "▲" : "▼"} {Math.abs(comp.avg_salary_delta)}% vs last month
                </Text>
              ) : null}
              <View style={s.minWageBox}>
                <Text style={s.minWageLabel}>Minimum Wage (Region VIII)</Text>
                <Text style={s.minWageValue}>₱{Number(comp.min_wage ?? 6500).toLocaleString()} / month</Text>
              </View>
            </Panel>
            <Panel title="Benefits Compliance" style={cardW} delay={60}>
              <View style={s.donutRow}>
                <Donut segments={benSeg} centerValue={`${Math.round((benefits.compliant / benTotal) * 100)}%`} centerLabel="Compliant" />
                <Legend segments={benSeg} suffix={(x) => `${Math.round((x.value / benTotal) * 100)}% ${x.label}`} />
              </View>
            </Panel>
            <Panel title="Contract Status" style={cardW} delay={120}>
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
            <Panel title="Active Grievances by Type" style={cols === 1 ? cardW : { width: "40%" }} delay={0}>
              {grievances.length ? (
                <View style={s.donutRow}>
                  <Donut segments={grievances} centerValue={String(grievTotal)} centerLabel="Total" />
                  <Legend segments={grievances} />
                </View>
              ) : <Empty text="No active grievances" />}
            </Panel>
            <Panel title="Termination Reasons" style={cols === 1 ? cardW : { flex: 1 }} delay={60}>
              {terms.length ? <HBars items={terms} /> : <Empty text="No terminations recorded" />}
            </Panel>
          </View>
        </Section>

        {/* Section 4 — audit log */}
        <Section title="4. System Audit & Log Trails">
          <Panel title="Recent Activity Logs" delay={0}>
            <View style={s.tableHead}>
              <Text style={[s.th, { flex: 1.4 }]}>DATE & TIME</Text>
              <Text style={[s.th, { flex: 1.2 }]}>USER</Text>
              <Text style={[s.th, { flex: 1 }]}>ACTION</Text>
              <Text style={[s.th, { flex: 2 }]}>DETAILS</Text>
            </View>
            {(data?.recent_activities ?? []).length ? (data?.recent_activities ?? []).map((a: any, i: number) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.td, { flex: 1.4, color: c.muted }]}>{fmtDate(a.ts)}</Text>
                <Text style={[s.td, { flex: 1.2, fontFamily: font.semibold }]}>{a.actor}</Text>
                <View style={{ flex: 1 }}>
                  <View style={s.actionChip}><Text style={s.actionChipText}>{a.action}</Text></View>
                </View>
                <Text style={[s.td, { flex: 2, color: c.muted }]} numberOfLines={2}>{a.details}</Text>
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
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ── pieces ──
const TONE_MAP = (tone: string, c: PesoColors): string =>
  ({ accent: c.accent, warn: c.warn, ok: c.ok, bad: c.bad, info: c.info, violet: "#7C3AED" }[tone] ?? c.accent);

function StatCard({ label, value, delta, deltaInverse, icon, tone, foot, delay }: any) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const color = TONE_MAP(tone, c);
  const up = (delta ?? 0) >= 0;
  const good = deltaInverse ? !up : up;
  return (
    <AnimateIn delay={delay} style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: color + "22" }]}><Ionicons name={icon} size={20} color={color} /></View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{Number(value ?? 0).toLocaleString()}</Text>
      {typeof delta === "number" ? (
        <Text style={[s.statDelta, { color: good ? c.ok : c.bad }]}>
          {up ? "▲" : "▼"} {Math.abs(delta)}% vs last month
        </Text>
      ) : foot ? <Text style={s.statFoot}>{foot}</Text> : null}
    </AnimateIn>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>;
}
function Panel({ title, children, style, delay = 0 }: { title: string; children: React.ReactNode; style?: any; delay?: number }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return <AnimateIn delay={delay} style={[s.panel, style]}><Text style={s.panelTitle}>{title}</Text>{children}</AnimateIn>;
}
function ExportCard({ icon, title, sub, onPress, style }: any) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.exportCard, style, hovered && { borderColor: c.accent, backgroundColor: c.raise }]}>
      <View style={s.exportIcon}><Ionicons name={icon} size={20} color={c.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.exportTitle}>{title}</Text>
        <Text style={s.exportSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.subtle} />
    </Pressable>
  );
}
function Empty({ text }: { text: string }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return <View style={s.emptyBox}><Text style={s.emptyText}>{text}</Text></View>;
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  statCard: { flex: 1, minWidth: 180, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 16, gap: 4 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statLabel: { fontSize: 12.5, color: c.muted, fontFamily: font.semibold },
  statValue: { fontSize: 26, fontFamily: font.display, color: c.ink },
  statDelta: { fontSize: 12, fontFamily: font.semibold },
  statFoot: { fontSize: 11.5, color: c.muted, fontFamily: font.semibold },

  section: { marginTop: 20 },
  sectionTitle: { fontSize: 15, fontFamily: font.display, color: c.ink, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  panel: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.line, padding: 16, minWidth: 220 },
  panelTitle: { fontSize: 14, fontFamily: font.display, color: c.ink, marginBottom: 14 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" },

  bigMoney: { fontSize: 30, fontFamily: font.display, color: c.ink },
  bigMoneySub: { fontSize: 12, color: c.muted, marginTop: -2, fontFamily: font.regular },
  deltaText: { fontSize: 12.5, fontFamily: font.semibold, marginTop: 6 },
  minWageBox: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line },
  minWageLabel: { fontSize: 11.5, color: c.muted, fontFamily: font.semibold },
  minWageValue: { fontSize: 17, fontFamily: font.display, color: c.ink, marginTop: 2 },

  tableHead: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.line, gap: 8 },
  th: { fontSize: 10.5, fontFamily: font.semibold, color: c.subtle, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line, gap: 8 },
  td: { fontSize: 12.5, color: c.ink, fontFamily: font.regular },
  actionChip: { alignSelf: "flex-start", backgroundColor: c.accentSoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  actionChipText: { fontSize: 11, fontFamily: font.semibold, color: c.accentInk },

  exportCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.line, padding: 14, minWidth: 200, ...(({ transitionDuration: "140ms" }) as any) },
  exportIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" },
  exportTitle: { fontSize: 13.5, fontFamily: font.display, color: c.ink },
  exportSub: { fontSize: 11.5, color: c.muted, marginTop: 1, fontFamily: font.regular },
  exportNote: { fontSize: 12, color: c.muted, marginTop: 10, fontFamily: font.regular },

  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 13, color: c.muted, fontFamily: font.regular },
});
