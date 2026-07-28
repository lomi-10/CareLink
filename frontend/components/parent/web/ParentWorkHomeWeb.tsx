// components/parent/web/ParentWorkHomeWeb.tsx — desktop WORK-mode "Work Home".
// Mirrors the mobile rebuild: identity hero (shared ParentHeroCard), a full-width
// "Total Monthly Payroll" band, a "needs your attention" list (leave + helper
// requests together), compact active-helper rows, and a tucked Manage row.
// Attendance/task detail live on their own screens now, not crammed in here.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentWorkDashboard, type PlacementDashData } from '@/hooks/parent';
import { useCareBot } from '@/contexts/CareBotContext';
import { pt, ACCENT_GRADIENT } from './parentWebTheme';
import { ParentHeroCard } from './ParentHeroCard';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';
import type { LeaveRequestRow } from '@/lib/leaveRequestsApi';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
const initials = (n: string) => (n || '?').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const monthly = (p: any) => (String(p.salary_period).toLowerCase() === 'daily' ? Number(p.salary_offered || 0) * 26 : String(p.salary_period).toLowerCase() === 'weekly' ? Math.round(Number(p.salary_offered || 0) * 4.33) : Number(p.salary_offered || 0));
function fmtLeaveDate(ymd: string) { try { const d = new Date(ymd.replace(/-/g, '/')); return isNaN(d.getTime()) ? ymd : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ymd; } }
function fmtCheckTime(v?: string | null) { if (!v) return ''; const d = new Date(String(v).replace(' ', 'T')); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }); }

type AttentionItem =
  | { kind: 'leave'; key: string; placement: ActivePlacement; leave: LeaveRequestRow }
  | { kind: 'request'; key: string; placement: ActivePlacement };

export function ParentWorkHomeWeb({
  userName, avatar, verified, onSwitchMode,
}: {
  userName: string; avatar: string | null; verified?: boolean; onSwitchMode: (m: 'recruitment' | 'work') => void;
}) {
  const router = useRouter();
  const { open: openCareBot } = useCareBot();
  const { perPlacement, loading } = useParentWorkDashboard();
  const first = (userName || 'there').split(' ')[0];
  const go = (p: string) => router.push(p as never);

  const payrollTotal = useMemo(() => perPlacement.reduce((s, p) => s + monthly(p.placement), 0), [perPlacement]);

  const attentionItems = useMemo((): AttentionItem[] => {
    const requests: AttentionItem[] = perPlacement
      .filter((d) => d.placement.status === 'termination_pending')
      .map((d) => ({ kind: 'request' as const, key: `r-${d.placement.application_id}`, placement: d.placement }));
    const leaves: AttentionItem[] = perPlacement.flatMap((d) =>
      d.pendingLeaves.map((l) => ({ kind: 'leave' as const, key: `l-${l.id}`, placement: d.placement, leave: l })));
    return [...requests, ...leaves];
  }, [perPlacement]);

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
              <View style={s.botBtnGrad}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={pt.ink} />
                <Text style={s.botBtnText}>Chat with CareBot</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Main ── */}
        <View style={s.main}>
          <ParentHeroCard
            badge={{ icon: 'briefcase', label: 'WORK MODE' }}
            greeting={greeting()}
            name={first}
            tagline="Manage pay, rest days, and day-to-day coordination for your helpers. Attendance tracking is optional."
            avatar={avatar}
            verified={verified}
            primary={{ label: 'Helper Management', icon: 'people-outline', onPress: () => go('/(parent)/hire') }}
            secondary={{ label: 'Tasks', icon: 'clipboard-outline', onPress: () => go('/(parent)/hire/placement_tasks') }}
          />

          {loading ? (
            <View style={s.center}><ActivityIndicator color={pt.accent} /></View>
          ) : perPlacement.length === 0 ? (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 44 }]}>
              <View style={s.emptyIc}><Ionicons name="briefcase-outline" size={28} color={pt.accent} /></View>
              <Text style={s.emptyTitle}>No active helpers yet</Text>
              <Text style={s.emptyText}>Once you hire a helper, Work Mode unlocks tasks, leave and payroll here.</Text>
              <Pressable onPress={() => onSwitchMode('recruitment')} style={({ hovered }: any) => [s.emptyBtn, TRANS, hovered && { transform: [{ translateY: -2 }] }]}><Text style={s.emptyBtnText}>Switch to Recruitment</Text></Pressable>
            </View>
          ) : (
            <>
              {/* Payroll hero band */}
              <View style={s.payrollBand}>
                <View style={{ flex: 1 }}>
                  <Text style={s.payrollLabel}>TOTAL MONTHLY PAYROLL</Text>
                  <Text style={s.payrollTotal}>₱{payrollTotal.toLocaleString()}</Text>
                  <Text style={s.payrollSub}>Across {perPlacement.length} active helper{perPlacement.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={s.payrollIc}><Ionicons name="wallet" size={26} color={pt.accent} /></View>
              </View>

              {/* Needs your attention */}
              <View style={s.card}>
                <View style={s.head}>
                  <Text style={s.cardTitle}>Needs your attention</Text>
                  {attentionItems.length > 0 && <Pressable onPress={() => go('/(parent)/hire/requests')}><Text style={s.headLink}>View all ({attentionItems.length})</Text></Pressable>}
                </View>
                {attentionItems.length === 0 ? (
                  <Text style={s.mutedText}>Nothing needs your attention right now.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {attentionItems.slice(0, 4).map((item) => {
                      const p = item.placement;
                      const sub = item.kind === 'leave' ? `Leave requested · ${fmtLeaveDate(item.leave.date)}` : `Wants to end the placement${p.termination_last_day ? ` · ${p.termination_last_day}` : ''}`;
                      return (
                        <Pressable key={item.key} onPress={() => go('/(parent)/hire/requests')} style={({ hovered }: any) => [s.attnRow, TRANS, hovered && { borderColor: pt.accent }]}>
                          {p.helper_photo ? <Image source={{ uri: p.helper_photo }} style={s.attnAva} /> : <View style={[s.attnAva, s.avaFb]}><Text style={s.avaInit}>{initials(p.helper_name)}</Text></View>}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.attnName} numberOfLines={1}>{p.helper_name}</Text>
                            <Text style={s.attnSub} numberOfLines={1}>{sub}</Text>
                          </View>
                          <View style={[s.attnPill, item.kind === 'request' && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                            <Text style={[s.attnPillText, item.kind === 'request' && { color: pt.red }]}>Review</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Active helpers (compact rows) */}
              <View style={s.card}>
                <View style={s.head}><Text style={s.cardTitle}>Active helpers</Text><Pressable onPress={() => go('/(parent)/hire')}><Text style={s.headLink}>View all</Text></Pressable></View>
                <View style={{ gap: 8 }}>
                  {perPlacement.map((p: PlacementDashData) => (
                    <Pressable
                      key={p.placement.application_id}
                      onPress={() => go(`/(parent)/hire/helper_profile?application_id=${p.placement.application_id}&helper_id=${p.placement.helper_id}&helper_name=${encodeURIComponent(p.placement.helper_name)}&job_title=${encodeURIComponent(p.placement.job_title)}&status=${encodeURIComponent(p.placement.status)}`)}
                      style={({ hovered }: any) => [s.helperRow, TRANS, hovered && { borderColor: pt.accent }]}
                    >
                      {p.placement.helper_photo ? <Image source={{ uri: p.placement.helper_photo }} style={s.helperAva} /> : <View style={[s.helperAva, s.avaFb]}><Text style={s.avaInit}>{initials(p.placement.helper_name)}</Text></View>}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.helperName} numberOfLines={1}>{p.placement.helper_name}</Text>
                        <Text style={s.helperRole} numberOfLines={1}>{p.placement.job_title}</Text>
                      </View>
                      <View style={[s.checkPill, { backgroundColor: p.checkedIn ? pt.greenSoft : pt.lineSoft }]}>
                        <Ionicons name={p.checkedIn ? 'checkmark-circle' : 'ellipse-outline'} size={12} color={p.checkedIn ? pt.green : pt.subtle} />
                        <Text style={[s.checkText, { color: p.checkedIn ? pt.green : pt.subtle }]}>{p.checkedIn ? `Checked in ${fmtCheckTime(p.checkInAt)}` : 'Not checked in'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={pt.subtle} />
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Manage */}
              <View style={s.card}>
                <Text style={[s.cardTitle, { marginBottom: 14 }]}>Manage</Text>
                <View style={s.qaRow}>
                  <WQA icon="people-outline" label="Helper Management" onPress={() => go('/(parent)/hire')} />
                  <WQA icon="clipboard-outline" label="Tasks" onPress={() => go('/(parent)/hire/placement_tasks')} />
                  <WQA icon="time-outline" label="Placement History" onPress={() => go('/(parent)/hire/history')} />
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
  page: { flexDirection: 'row', gap: 20, maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 22, flexWrap: 'wrap' },
  sidebar: { width: 236, flexShrink: 0, flexGrow: 0, gap: 16 },
  main: { flex: 1, minWidth: 480, gap: 18 },
  center: { paddingVertical: 40, alignItems: 'center' },

  card: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 18, ...shadowSm },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: pt.ink },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.accent },
  mutedText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted },

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
  botBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 11, minHeight: 44, backgroundColor: pt.accent },
  botBtnText: { color: pt.ink, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },

  // Payroll band
  payrollBand: { flexDirection: 'row', alignItems: 'center', backgroundColor: pt.accentSoft, borderWidth: 1, borderColor: '#F1DFB6', borderRadius: 18, padding: 20 },
  payrollLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, letterSpacing: 1, color: pt.muted },
  payrollTotal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 34, color: pt.ink, marginTop: 4, letterSpacing: -0.5 },
  payrollSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 2 },
  payrollIc: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  // Attention row
  attnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 10, cursor: 'pointer' as any },
  attnAva: { width: 38, height: 38, borderRadius: 10 },
  attnName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  attnSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 1 },
  attnPill: { backgroundColor: pt.accentSoft, borderWidth: 1, borderColor: pt.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  attnPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.accent },

  // Helper row
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: pt.line, borderRadius: 14, padding: 12, backgroundColor: pt.raise, cursor: 'pointer' as any },
  helperAva: { width: 44, height: 44, borderRadius: 13 },
  helperName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink },
  helperRole: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 1 },
  checkPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  checkText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  // Manage / quick actions
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
