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
import { ReportPreviewModal } from "@/components/peso/ReportPreviewModal";

function fmtDate(ts?: string) {
  if (!ts) return "—";
  const d = new Date(String(ts).replace(" ", "T"));
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Pulls the workbook from peso/export_report.php and saves it.
 *
 * Fetched as a blob rather than pointed at with a plain link: the endpoint is
 * staff-only, and a bare <a href> would drop the caller out of the app's auth
 * wrapper. Going through fetch keeps the staff query string attached and lets a
 * server-side refusal surface as an error instead of a downloaded HTML page.
 */
async function downloadWorkbookFile(): Promise<string | null> {
  if (Platform.OS !== "web") return "Download is available on the web dashboard.";
  try {
    const url = await withPesoStaffQuery(`${API_URL}/peso/export_report.php`);
    const res = await fetch(url);
    if (!res.ok) return `The server refused the export (${res.status}).`;
    const blob = await res.blob();
    // A JSON body here means an auth failure, not a workbook.
    if (blob.type.includes("json")) return "Not signed in as PESO staff. Please sign in again.";
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `CareLink_PESO_Report_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(href);
    return null;
  } catch {
    return "Couldn't reach the server.";
  }
}

export default function ReportsAnalytics() {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
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

  const downloadWorkbook = async () => {
    setExporting(true);
    setExportError(null);
    const err = await downloadWorkbookFile();
    if (err) setExportError(err);
    setExporting(false);
  };

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

  // ── The demographic questions PESO asked for (Aug 2026) ────────────────────
  const gender = data?.gender ?? {};
  const gHelpers = gender.helpers ?? { Male: 0, Female: 0, "Not stated": 0 };
  const gRate = gender.complaint_rate ?? { Male: 0, Female: 0, "Not stated": 0 };
  const gPlace = gender.placements ?? { Male: 0, Female: 0, "Not stated": 0 };
  const genderTotal = (gHelpers.Male ?? 0) + (gHelpers.Female ?? 0) + (gHelpers["Not stated"] ?? 0);
  const genderSeg: Segment[] = [
    { label: "Female", value: gHelpers.Female ?? 0, color: "#DB2777" },
    { label: "Male", value: gHelpers.Male ?? 0, color: c.info },
    { label: "Not stated", value: gHelpers["Not stated"] ?? 0, color: c.subtle },
  ];
  const GENDER_KEYS = ["Female", "Male", "Not stated"] as const;
  const complaintRateItems = GENDER_KEYS.map((k) => ({ label: k, value: Number(gRate[k] ?? 0) }));
  const placementGenderItems = GENDER_KEYS.map((k) => ({ label: k, value: Number(gPlace[k] ?? 0) }));

  const parties = data?.complaint_parties ?? { against_helper: 0, against_employer: 0 };
  const reportedTotal = (parties.against_helper ?? 0) + (parties.against_employer ?? 0);
  const reportedSeg: Segment[] = [
    { label: "Against helpers", value: parties.against_helper ?? 0, color: c.warn },
    { label: "Against employers", value: parties.against_employer ?? 0, color: c.bad },
  ];

  const geo = data?.geography ?? {};
  const geoH = geo.helpers ?? { inside: 0, outside: 0, unknown: 0 };
  const geoE = geo.employers ?? { inside: 0, outside: 0, unknown: 0 };
  const geoHelperTotal = geoH.inside + geoH.outside + geoH.unknown;
  const geoEmpTotal = geoE.inside + geoE.outside + geoE.unknown;
  const geoSegOf = (g: any): Segment[] => [
    { label: "Within Ormoc", value: g.inside, color: c.accent },
    { label: "Beyond Ormoc", value: g.outside, color: c.info },
    { label: "Not recorded", value: g.unknown, color: c.subtle },
  ];
  const geoHelperSeg = geoSegOf(geoH);
  const geoEmpSeg = geoSegOf(geoE);
  const topOutside = (geo.top_outside ?? []).map((r: any) => ({
    label: [r.name, r.province].filter(Boolean).join(", "),
    value: r.count,
  }));

  const topCats = data?.top_categories ?? {};
  const toBars = (arr: any[]) => (arr ?? []).map((r: any) => ({ label: r.name, value: r.count }));
  const catJobs = toBars(topCats.job_posts);
  const catPlacements = toBars(topCats.placements);
  const catSpecialty = toBars(topCats.specialty);

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

        {/* Section 3 — the demographic questions PESO asked for */}
        <Section title="3. Workforce Demographics">
          <View style={s.grid}>
            <Panel title="Helper Gender" style={cardW} delay={0}>
              {genderTotal ? (
                <View style={s.donutRow}>
                  <Donut segments={genderSeg} centerValue={String(genderTotal)} centerLabel="Helpers" />
                  <Legend segments={genderSeg} suffix={(x) => `${x.value} ${x.label} (${Math.round((x.value / genderTotal) * 100)}%)`} />
                </View>
              ) : <Empty text="No helper profiles yet" />}
            </Panel>

            <Panel title="Complaint Rate by Gender" style={cardW} delay={60}>
              {/* Rate, not raw count. A raw count just follows headcount, so it
                  cannot answer "which group is more prone to complaint" — with
                  4x more women on the platform they would top a raw chart even
                  if they were complained about half as often per person. */}
              {genderTotal ? (
                <>
                  <HBars items={complaintRateItems} color={c.bad} />
                  <Text style={s.panelNote}>Complaints received per 100 helpers of that gender.</Text>
                </>
              ) : <Empty text="No data yet" />}
            </Panel>

            <Panel title="Placements by Gender" style={cardW} delay={120}>
              {placementGenderItems.some((x) => x.value > 0)
                ? <HBars items={placementGenderItems} color={c.ok} />
                : <Empty text="No placements yet" />}
            </Panel>
          </View>
        </Section>

        {/* Section 4 — geography */}
        <Section title="4. Where Users Are">
          <View style={s.grid}>
            <Panel title="Helpers: Ormoc vs Beyond" style={cardW} delay={0}>
              {geoHelperTotal ? (
                <View style={s.donutRow}>
                  <Donut segments={geoHelperSeg} centerValue={`${Math.round((geoH.inside / geoHelperTotal) * 100)}%`} centerLabel="In Ormoc" />
                  <Legend segments={geoHelperSeg} suffix={(x) => `${x.value} ${x.label}`} />
                </View>
              ) : <Empty text="No helper locations recorded" />}
            </Panel>
            <Panel title="Employers: Ormoc vs Beyond" style={cardW} delay={60}>
              {geoEmpTotal ? (
                <View style={s.donutRow}>
                  <Donut segments={geoEmpSeg} centerValue={`${Math.round((geoE.inside / geoEmpTotal) * 100)}%`} centerLabel="In Ormoc" />
                  <Legend segments={geoEmpSeg} suffix={(x) => `${x.value} ${x.label}`} />
                </View>
              ) : <Empty text="No employer locations recorded" />}
            </Panel>
            <Panel title="Top Areas Beyond Ormoc" style={cardW} delay={120}>
              {/* "Beyond Ormoc" is only actionable if you know where. */}
              {topOutside.length
                ? <HBars items={topOutside} color={c.info} />
                : <Empty text="All recorded users are within Ormoc" />}
            </Panel>
          </View>
        </Section>

        {/* Section 5 — categories */}
        <Section title="5. Category Leaders">
          <View style={s.grid}>
            <Panel title="Job Posts by Category" style={cardW} delay={0}>
              {catJobs.length ? <HBars items={catJobs} color={c.accent} /> : <Empty text="No job posts yet" />}
            </Panel>
            <Panel title="Placements by Category" style={cardW} delay={60}>
              {catPlacements.length ? <HBars items={catPlacements} color={c.ok} /> : <Empty text="No placements yet" />}
            </Panel>
            <Panel title="Helper Specialty by Category" style={cardW} delay={120}>
              {catSpecialty.length ? <HBars items={catSpecialty} color={c.info} /> : <Empty text="No specialties recorded" />}
            </Panel>
          </View>
        </Section>

        {/* Section 6 */}
        <Section title="6. Dispute & Incident Management">
          <View style={s.grid}>
            <Panel title="Who Gets Reported" style={cardW} delay={0}>
              {reportedTotal ? (
                <>
                  <View style={s.donutRow}>
                    <Donut segments={reportedSeg} centerValue={String(reportedTotal)} centerLabel="Complaints" />
                    <Legend segments={reportedSeg} suffix={(x) => `${x.value} ${x.label}`} />
                  </View>
                  <View style={s.verdictBox}>
                    <Ionicons name="information-circle" size={15} color={c.accentInk} />
                    <Text style={s.verdictText}>
                      {parties.against_helper === parties.against_employer
                        ? "Helpers and employers are reported equally often."
                        : `${parties.against_helper > parties.against_employer ? "Helpers" : "Employers"} are reported more often (${Math.max(parties.against_helper, parties.against_employer)} vs ${Math.min(parties.against_helper, parties.against_employer)}).`}
                    </Text>
                  </View>
                </>
              ) : <Empty text="No complaints on record" />}
            </Panel>
            <Panel title="Active Grievances by Type" style={cardW} delay={60}>
              {grievances.length ? (
                <View style={s.donutRow}>
                  <Donut segments={grievances} centerValue={String(grievTotal)} centerLabel="Total" />
                  <Legend segments={grievances} />
                </View>
              ) : <Empty text="No active grievances" />}
            </Panel>
            <Panel title="Termination Reasons" style={cardW} delay={120}>
              {terms.length ? <HBars items={terms} /> : <Empty text="No terminations recorded" />}
            </Panel>
          </View>
        </Section>

        {/* Section 7 — audit log */}
        <Section title="7. System Audit & Log Trails">
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

        {/* Data export */}
        <Section title="Data Export">
          <Panel title="Full analytics workbook" delay={0}>
            <Text style={s.exportLead}>
              A six-sheet Excel workbook: Summary, Helpers, Employers, Placements, Complaints and Demographics.
              Every helper and employer row carries name, age, gender, barangay, municipality, whether they are within
              or beyond Ormoc, category specialty, verification status and their placement and complaint counts.
              Placements name both parties; complaints name who filed and who was reported.
            </Text>
            <View style={s.sheetChips}>
              {["Summary", "Helpers", "Employers", "Placements", "Complaints", "Demographics"].map((n) => (
                <View key={n} style={s.sheetChip}><Text style={s.sheetChipText}>{n}</Text></View>
              ))}
            </View>
            <View style={s.exportActions}>
              {/* Preview first. An export is something PESO files or hands to a
                  supervisor, so checking it beforehand beats downloading twice. */}
              <Pressable
                onPress={() => setPreviewOpen(true)}
                style={({ hovered }: any) => [s.bigExport, hovered && { backgroundColor: c.accent2 }]}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={s.bigExportText}>Preview report</Text>
              </Pressable>
              <Pressable
                onPress={downloadWorkbook}
                disabled={exporting}
                style={({ hovered }: any) => [s.ghostExport, hovered && { borderColor: c.accent }, exporting && { opacity: 0.6 }]}
              >
                {exporting
                  ? <ActivityIndicator color={c.accent} size="small" />
                  : <Ionicons name="download-outline" size={18} color={c.accent} />}
                <Text style={s.ghostExportText}>{exporting ? "Preparing…" : "Download now"}</Text>
              </Pressable>
            </View>
            {!!exportError && (
              <View style={s.exportError}>
                <Ionicons name="alert-circle" size={14} color={c.bad} />
                <Text style={s.exportErrorText}>{exportError}</Text>
              </View>
            )}
            <Text style={s.exportNote}>
              {Platform.OS === "web"
                ? "Opens in Excel, LibreOffice or Google Sheets."
                : "Download is available on the web dashboard."}
            </Text>
          </Panel>
        </Section>
      </View>

      <ReportPreviewModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        downloading={exporting}
        onDownload={async () => { await downloadWorkbook(); }}
      />
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

  panelNote: { fontSize: 11.5, color: c.subtle, fontFamily: font.regular, marginTop: 10, lineHeight: 16 },
  verdictBox: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: c.accentSoft, borderRadius: 10, padding: 11, marginTop: 12 },
  verdictText: { flex: 1, fontSize: 12, color: c.accentInk, fontFamily: font.semibold, lineHeight: 17 },

  exportLead: { fontSize: 13, color: c.muted, fontFamily: font.regular, lineHeight: 19 },
  sheetChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  sheetChip: { backgroundColor: c.sunken, borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  sheetChipText: { fontSize: 11.5, fontFamily: font.semibold, color: c.muted },
  bigExport: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, ...(({ transitionDuration: "140ms" }) as any) },
  exportActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  ghostExport: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1.5, borderColor: c.line, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, ...(({ transitionDuration: "140ms" }) as any) },
  ghostExportText: { color: c.accent, fontSize: 14, fontFamily: font.semibold },
  bigExportText: { color: "#fff", fontSize: 14, fontFamily: font.semibold },
  exportError: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.badSoft, borderRadius: 9, padding: 10, marginTop: 10 },
  exportErrorText: { flex: 1, fontSize: 12, color: c.bad, fontFamily: font.semibold },
  exportNote: { fontSize: 12, color: c.muted, marginTop: 10, fontFamily: font.regular },

  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 13, color: c.muted, fontFamily: font.regular },
});
