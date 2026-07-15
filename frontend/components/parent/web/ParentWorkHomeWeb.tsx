// components/parent/web/ParentWorkHomeWeb.tsx — desktop WORK-mode dashboard body.
// Sidebar (mode card · CareBot) + bento main: hero · stats · attendance donut ·
// active helpers · tasks overview · payroll · attention needed · quick actions.
// Real data from useParentWorkDashboard + useParentAttendanceSummary.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentWorkDashboard, useParentAttendanceSummary } from '@/hooks/parent';
import { useCareBot } from '@/contexts/CareBotContext';
import { pt, ACCENT_GRADIENT } from './parentWebTheme';
import { ParentHeroCard } from './ParentHeroCard';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
const initials = (n: string) => (n || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
function fmtTime(v?: string | null) { if (!v) return ''; const d = new Date(String(v).replace(' ', 'T')); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }); }
const monthly = (p: any) => (String(p.salary_period).toLowerCase() === 'daily' ? Number(p.salary_offered || 0) * 26 : Number(p.salary_offered || 0));

function Donut({ size = 128, stroke = 15, segments, centerBig, centerSmall }: { size?: number; stroke?: number; segments: { value: number; color: string }[]; centerBig: string; centerSmall?: string }) {
  const r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
  const total = segments.reduce((sum, x) => sum + x.value, 0) || 1;
  let acc = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={c} cy={c} r={r} stroke={pt.lineSoft} strokeWidth={stroke} fill="none" />
          {segments.map((seg, i) => {
            const len = (seg.value / total) * circ;
            const node = <circle key={i} cx={c} cy={c} r={r} stroke={seg.color} strokeWidth={stroke} fill="none" strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} transform={`rotate(-90 ${c} ${c})`} />;
            acc += len;
            return node;
          })}
        </svg>
      </View>
      <Text style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: size * 0.2, color: pt.ink }}>{centerBig}</Text>
      {centerSmall ? <Text style={{ fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted, marginTop: -2 }}>{centerSmall}</Text> : null}
    </View>
  );
}

export function ParentWorkHomeWeb({
  userName, avatar, verified, onSwitchMode,
}: {
  userName: string; avatar: string | null; verified?: boolean; onSwitchMode: (m: 'recruitment' | 'work') => void;
}) {
  const router = useRouter();
  const { open: openCareBot } = useCareBot();
  const { perPlacement, stats, loading } = useParentWorkDashboard();
  const { attendance } = useParentAttendanceSummary();
  const first = (userName || 'there').split(' ')[0];
  const go = (p: string) => router.push(p as never);

  const tasksDone = useMemo(() => perPlacement.reduce((s, p) => s + p.tasksDone, 0), [perPlacement]);
  const tasksTotal = useMemo(() => perPlacement.reduce((s, p) => s + p.tasksTotal, 0), [perPlacement]);
  const tasksPending = Math.max(0, tasksTotal - tasksDone);
  const payrollTotal = useMemo(() => perPlacement.reduce((s, p) => s + monthly(p.placement), 0), [perPlacement]);
  const firstLeave = perPlacement.find((p) => p.pendingLeaves.length > 0);

  const KPIS = [
    { icon: 'people-outline' as const, value: stats.activeHelpers, label: 'Active Helpers', link: 'View all', to: '/(parent)/hire' },
    { icon: 'checkmark-circle-outline' as const, value: stats.checkedInToday, label: 'Checked In Today', link: 'Attendance', to: '/(parent)/hire/placement_attendance' },
    { icon: 'clipboard-outline' as const, value: stats.pendingTasksTotal, label: 'Pending Tasks', link: 'View tasks', to: '/(parent)/hire/placement_tasks' },
    { icon: 'file-tray-outline' as const, value: stats.pendingLeaveTotal, label: 'Pending Leave', link: 'Requests', to: '/(parent)/hire/requests' },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.page}>
        {/* ── Sidebar ── */}
        <View style={s.sidebar}>
          <View style={s.card}>
            <Text style={s.eyebrow}>Current Mode</Text>
            <View style={s.modeRow}>
              <View style={s.modeIc}><Ionicons name="briefcase" size={20} color={pt.accent} /></View>
              <Text style={s.modeName}>Work Mode</Text>
            </View>
            <Text style={s.modeDesc}>Manage your active helpers and daily household operations.</Text>
            <Pressable onPress={() => onSwitchMode('recruitment')} style={({ hovered }: any) => [s.switchBtn, TRANS, hovered && { backgroundColor: pt.accentSoft }]}>
              <Text style={s.switchBtnText}>Switch to Recruitment Mode</Text>
              <Ionicons name="arrow-forward" size={15} color={pt.accent} />
            </Pressable>
          </View>
          <View style={s.botCard}>
            <Image source={CAREBOT_ICON} style={s.botMascot} resizeMode="contain" />
            <Text style={s.botTitle}>Need help?</Text>
            <Text style={s.botText}>Ask CareBot about tasks, leave, payroll & the Kasambahay Law.</Text>
            <Pressable onPress={openCareBot} style={({ hovered, pressed }: any) => [{ alignSelf: 'stretch' }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
              <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.botBtn}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={pt.ink} />
                <Text style={s.botBtnText}>Chat with CareBot</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* ── Main ── */}
        <View style={s.main}>
          <ParentHeroCard
            badge={{ icon: 'briefcase', label: 'WORK MODE' }}
            greeting={greeting()}
            name={first}
            tagline="Manage your active helpers and daily household operations."
            avatar={avatar}
            verified={verified}
            primary={{ label: 'Assign Task', icon: 'add-circle-outline', onPress: () => go('/(parent)/hire/placement_tasks') }}
            secondary={{ label: 'View Attendance', icon: 'calendar-outline', onPress: () => go('/(parent)/hire/placement_attendance') }}
          />

          {loading ? (
            <View style={s.center}><ActivityIndicator color={pt.accent} /></View>
          ) : perPlacement.length === 0 ? (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 44 }]}>
              <View style={s.emptyIc}><Ionicons name="briefcase-outline" size={28} color={pt.accent} /></View>
              <Text style={s.emptyTitle}>No active helpers yet</Text>
              <Text style={s.emptyText}>Once you hire a helper, Work Mode unlocks tasks, attendance, leave and payroll here.</Text>
              <Pressable onPress={() => onSwitchMode('recruitment')} style={({ hovered }: any) => [s.emptyBtn, TRANS, hovered && { transform: [{ translateY: -2 }] }]}><Text style={s.emptyBtnText}>Switch to Recruitment</Text></Pressable>
            </View>
          ) : (
            <>
              {/* KPIs + attendance donut */}
              <View style={s.topRow}>
                <View style={s.kpis}>
                  {KPIS.map((k) => (
                    <Pressable key={k.label} onPress={() => go(k.to)} style={({ hovered }: any) => [s.kpi, TRANS, hovered && s.kpiHover]}>
                      <View style={s.kpiIc}><Ionicons name={k.icon} size={20} color={pt.accent} /></View>
                      <Text style={s.kpiVal}>{k.value}</Text>
                      <Text style={s.kpiLabel} numberOfLines={1}>{k.label}</Text>
                      <Text style={s.kpiLink}>{k.link} →</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={[s.card, s.attCard]}>
                  <Text style={s.cardTitle}>Attendance This Week</Text>
                  <View style={s.attRow}>
                    <Donut size={110} stroke={13} centerBig={`${attendance.present_pct}%`} centerSmall="Present"
                      segments={attendance.total > 0 ? [{ value: attendance.present, color: pt.green }, { value: attendance.leave, color: pt.amber }, { value: attendance.absent, color: pt.red }] : [{ value: 1, color: pt.lineSoft }]} />
                    <View style={{ gap: 8 }}>
                      <Legend color={pt.green} label="Present" value={`${attendance.present_pct}%`} />
                      <Legend color={pt.amber} label="Leave" value={`${attendance.leave_pct}%`} />
                      <Legend color={pt.red} label="Absent" value={`${attendance.absent_pct}%`} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Active helpers · tasks · payroll */}
              <View style={s.row3}>
                <View style={[s.card, s.colWide]}>
                  <View style={s.head}><Text style={s.cardTitle}>My Active Helpers</Text><Pressable onPress={() => go('/(parent)/hire')}><Text style={s.headLink}>View all</Text></Pressable></View>
                  <View style={{ gap: 12 }}>
                    {perPlacement.map((p) => (
                      <View key={p.placement.application_id} style={s.helperCard}>
                        <View style={s.helperTop}>
                          {p.placement.helper_photo ? <Image source={{ uri: p.placement.helper_photo }} style={s.helperAva} /> : <View style={[s.helperAva, s.avaFb]}><Text style={s.avaInit}>{initials(p.placement.helper_name)}</Text></View>}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.helperName} numberOfLines={1}>{p.placement.helper_name}</Text>
                            <Text style={s.helperRole} numberOfLines={1}>{p.placement.job_title}</Text>
                          </View>
                          <View style={[s.checkPill, { backgroundColor: p.checkedIn ? pt.greenSoft : pt.lineSoft }]}>
                            <Ionicons name={p.checkedIn ? 'checkmark-circle' : 'ellipse-outline'} size={12} color={p.checkedIn ? pt.green : pt.subtle} />
                            <Text style={[s.checkText, { color: p.checkedIn ? pt.green : pt.subtle }]}>{p.checkedIn ? `Checked In ${fmtTime(p.checkInAt)}` : 'Not checked in'}</Text>
                          </View>
                        </View>
                        <View style={s.helperStats}>
                          <HStat label="Tasks Today" value={`${p.tasksDone}/${p.tasksTotal}`} />
                          <HStat label="Pending Leave" value={String(p.pendingLeaves.length)} />
                          <HStat label="Salary" value={`₱${monthly(p.placement).toLocaleString()}/mo`} last />
                        </View>
                        <View style={s.helperBtns}>
                          <Pressable onPress={() => go('/(parent)/hire')} style={({ hovered }: any) => [s.helperBtn, TRANS, hovered && { backgroundColor: pt.lineSoft }]}><Ionicons name="eye-outline" size={15} color={pt.ink} /><Text style={s.helperBtnText}>View Details</Text></Pressable>
                          <Pressable onPress={() => go(`/(parent)/messages?partner_id=${p.placement.helper_id}`)} style={({ hovered }: any) => [s.helperBtn, TRANS, hovered && { backgroundColor: pt.accentSoft, borderColor: pt.accent }]}><Ionicons name="chatbubble-outline" size={15} color={pt.accent} /><Text style={[s.helperBtnText, { color: pt.accent }]}>Message</Text></Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={[s.card, s.col]}>
                  <View style={s.head}><Text style={s.cardTitle}>Tasks Overview</Text><Pressable onPress={() => go('/(parent)/hire/placement_tasks')}><Text style={s.headLink}>View all</Text></Pressable></View>
                  <View style={{ alignItems: 'center', gap: 14 }}>
                    <Donut size={128} centerBig={String(tasksTotal)} centerSmall="Total Tasks"
                      segments={tasksTotal > 0 ? [{ value: tasksDone, color: pt.green }, { value: tasksPending, color: pt.amber }] : [{ value: 1, color: pt.lineSoft }]} />
                    <View style={{ alignSelf: 'stretch', gap: 8 }}>
                      <Legend color={pt.green} label="Completed" value={`${tasksDone} (${tasksTotal ? Math.round(tasksDone / tasksTotal * 100) : 0}%)`} />
                      <Legend color={pt.amber} label="Pending" value={`${tasksPending} (${tasksTotal ? Math.round(tasksPending / tasksTotal * 100) : 0}%)`} />
                    </View>
                    <Text style={s.donutNote}>Based on today’s assigned tasks.</Text>
                  </View>
                </View>

                <View style={[s.card, s.col]}>
                  <Text style={s.cardTitle}>Payroll Overview</Text>
                  <Text style={s.payLabel}>Est. Monthly Payroll</Text>
                  <Text style={s.payTotal}>₱{payrollTotal.toLocaleString()}</Text>
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {perPlacement.map((p) => (
                      <View key={p.placement.application_id} style={s.payRow}>
                        {p.placement.helper_photo ? <Image source={{ uri: p.placement.helper_photo }} style={s.payAva} /> : <View style={[s.payAva, s.avaFb]}><Text style={[s.avaInit, { fontSize: 11 }]}>{initials(p.placement.helper_name)}</Text></View>}
                        <Text style={s.payName} numberOfLines={1}>{p.placement.helper_name}</Text>
                        <Text style={s.payAmt}>₱{monthly(p.placement).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable onPress={() => go('/(parent)/hire')} style={({ hovered }: any) => [s.payBtn, TRANS, hovered && { backgroundColor: pt.accentSoft }]}><Ionicons name="cash-outline" size={15} color={pt.accent} /><Text style={s.payBtnText}>Manage Payroll</Text></Pressable>
                </View>
              </View>

              {/* Attention needed */}
              {firstLeave && (
                <View style={s.attention}>
                  <View style={s.attentionIc}><Ionicons name="notifications" size={18} color={pt.amber} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.attentionTitle}>Attention Needed</Text>
                    <Text style={s.attentionText}>{firstLeave.placement.helper_name} has a pending leave request{stats.pendingLeaveTotal > 1 ? ` (+${stats.pendingLeaveTotal - 1} more)` : ''}.</Text>
                  </View>
                  <Pressable onPress={() => go('/(parent)/hire/requests')} style={({ hovered }: any) => [s.attentionBtn, TRANS, hovered && { transform: [{ translateY: -1 }] }]}><Text style={s.attentionBtnText}>Review Now →</Text></Pressable>
                </View>
              )}

              {/* Quick actions */}
              <View style={s.card}>
                <Text style={[s.cardTitle, { marginBottom: 14 }]}>Quick Actions</Text>
                <View style={s.qaRow}>
                  <WQA icon="clipboard-outline" label="Assign Task" onPress={() => go('/(parent)/hire/placement_tasks')} />
                  <WQA icon="file-tray-outline" label="Review Leave" onPress={() => go('/(parent)/hire/requests')} />
                  <WQA icon="document-text-outline" label="View Contracts" onPress={() => go('/(parent)/messages')} />
                  <WQA icon="calendar-outline" label="Attendance" onPress={() => go('/(parent)/hire/placement_attendance')} />
                  <WQA icon="add-circle-outline" label="Post New Job" onPress={() => { onSwitchMode('recruitment'); go('/(parent)/jobs'); }} />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={s.legend}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
      <Text style={s.legendVal}>{value}</Text>
    </View>
  );
}
function HStat({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.hstat, !last && s.hstatDiv]}>
      <Text style={s.hstatVal} numberOfLines={1}>{value}</Text>
      <Text style={s.hstatLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}
function WQA({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.wqa, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.accentSoft }]}>
      <View style={s.wqaIc}><Ionicons name={icon} size={19} color={pt.accent} /></View>
      <Text style={s.wqaLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const shadowSm = { boxShadow: '0 2px 10px rgba(139,90,43,.06)' } as any;
const s = StyleSheet.create({
  scroll: { paddingBottom: 34 },
  page: { flexDirection: 'row', gap: 20, maxWidth: 1480, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 22, flexWrap: 'wrap' },
  sidebar: { width: 236, flexShrink: 0, flexGrow: 0, gap: 16 },
  main: { flex: 1, minWidth: 480, gap: 18 },
  center: { paddingVertical: 40, alignItems: 'center' },

  card: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 18, ...shadowSm },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: pt.ink },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.accent },

  eyebrow: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  modeIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  modeName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  modeDesc: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, lineHeight: 18, marginBottom: 14 },
  switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.4, borderColor: pt.accent, borderRadius: 11, paddingVertical: 10, minHeight: 44 },
  switchBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.accent },

  botCard: { backgroundColor: pt.accentSoft, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#F1DFB6', alignItems: 'center' },
  botMascot: { width: 52, height: 52, marginBottom: 8 },
  botTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  botText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, textAlign: 'center', lineHeight: 17, marginTop: 4, marginBottom: 14 },
  botBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 11, minHeight: 44 },
  botBtnText: { color: pt.ink, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },

  // Top row (KPIs + attendance)
  topRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  kpis: { flex: 1, minWidth: 320, flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kpi: { flex: 1, minWidth: 130, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 14, ...shadowSm, cursor: 'pointer' as any },
  kpiHover: { borderColor: pt.accent, transform: [{ translateY: -2 }] },
  kpiIc: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pt.accentSoft, marginBottom: 8 },
  kpiVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: pt.ink },
  kpiLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 1 },
  kpiLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.accent, marginTop: 6 },
  attCard: { width: 300, flexGrow: 1 },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 6 },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted },
  legendVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink },
  donutNote: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.subtle, textAlign: 'center' },

  // 3-col
  row3: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  colWide: { flex: 1.4, minWidth: 340 },
  col: { flex: 1, minWidth: 250 },

  // Helper card
  helperCard: { borderWidth: 1, borderColor: pt.line, borderRadius: 14, padding: 14, backgroundColor: pt.raise },
  helperTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  helperAva: { width: 46, height: 46, borderRadius: 23 },
  helperName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink },
  helperRole: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 1 },
  checkPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  checkText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },
  helperStats: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: pt.lineSoft, paddingTop: 12 },
  hstat: { flex: 1, paddingHorizontal: 6 },
  hstatDiv: { borderRightWidth: 1, borderRightColor: pt.lineSoft },
  hstatVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  hstatLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted, marginTop: 1 },
  helperBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  helperBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: pt.line, borderRadius: 10, paddingVertical: 9, minHeight: 40 },
  helperBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink },

  // Payroll
  payLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 4 },
  payTotal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: pt.ink },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payAva: { width: 30, height: 30, borderRadius: 15 },
  payName: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.ink },
  payAmt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.4, borderColor: pt.accent, borderRadius: 12, paddingVertical: 11, marginTop: 14, minHeight: 44 },
  payBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },

  // Attention
  attention: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.amberSoft, borderWidth: 1, borderColor: '#F1D89B', borderRadius: 16, padding: 16 },
  attentionIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  attentionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  attentionText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 1 },
  attentionBtn: { backgroundColor: pt.accent, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  attentionBtnText: { color: pt.ink, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },

  // Quick actions
  qaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  wqa: { flex: 1, minWidth: 120, alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: pt.line, backgroundColor: pt.raise },
  wqaIc: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: pt.accentSoft },
  wqaLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink },

  // shared
  avaFb: { backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avaInit: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.caramel },
  emptyIc: { width: 60, height: 60, borderRadius: 18, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: pt.ink },
  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, textAlign: 'center', maxWidth: 360, lineHeight: 19, marginTop: 4 },
  emptyBtn: { marginTop: 14, backgroundColor: pt.accent, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
  emptyBtnText: { color: pt.ink, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },
});
