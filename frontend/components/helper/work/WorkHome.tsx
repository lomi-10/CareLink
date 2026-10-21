// components/helper/work/WorkHome.tsx
// Work Mode home for a hired helper: agreed pay, actual payslip records,
// contract access, employer messages, and assistance are the primary actions.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  DARK, MUTED, SUBTLE, ORANGE, GREEN, BLUE, DIVIDER, ICON_BG, SURFACE,
  DANGER, INFO_BG,
} from '@/components/helper/home/helperWarmTheme';
import type { ActiveHire } from '@/contexts/HelperWorkModeContext';
import { formatPeso, salaryPeriodAbbr } from '@/lib/payrollApi';
import { fetchHelperPayslips, type HelperPayslip } from '@/lib/payslipsApi';
import { useConversations, useNotice, useResponsive } from '@/hooks/shared';
import { EndEmploymentModal } from '@/components/shared';

type Props = {
  helperId: number;
  userFirstName: string;
  userFullName?: string;
  activeHire: ActiveHire;
  profileImage?: string | null;
  verified?: boolean;
  refreshToken?: number;
  onRefreshWorkContext: () => Promise<void>;
  announcement?: React.ReactNode;
};

export function WorkHome({
  helperId, userFirstName, userFullName, activeHire, profileImage, verified, refreshToken, onRefreshWorkContext, announcement,
}: Props) {
  const router = useRouter();
  const { notify, noticeHost } = useNotice();
  const { conversations } = useConversations();
  const { isDesktop } = useResponsive();

  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<HelperPayslip[]>([]);
  const [endModal, setEndModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payslipRes = await fetchHelperPayslips(activeHire.application_id, helperId);
      if (payslipRes.success) setPayslips(payslipRes.payslips ?? []);
      else notify('Payslips', payslipRes.message || 'Could not load payment records.', 'error');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [helperId, activeHire.application_id, notify]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const pendingPayslipCount = useMemo(() => payslips.filter((row) => row.status === 'pending').length, [payslips]);
  const disputedPayslipCount = useMemo(() => payslips.filter((row) => row.status === 'disputed').length, [payslips]);

  const employerConv = useMemo(
    () => conversations.find((c) => String(c.partner_id) === String(activeHire.parent_id)),
    [conversations, activeHire.parent_id],
  );
  const employerPhoto = employerConv?.partner_photo ?? null;
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const firstName = (userFullName || userFirstName || 'there').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const agreedSalary = Number(activeHire.salary_amount ?? 0);

  const openMessages = () => {
    router.push({
      pathname: '/(helper)/messages',
      params: { partner_id: String(activeHire.parent_id), partner_name: activeHire.employer_name || 'Employer', job_post_id: String(activeHire.job_post_id) },
    } as any);
  };
  const openContract = () => router.push('/(helper)/work/contract' as any);
  const openAssistance = () => router.push('/(helper)/work/assistance' as any);
  const goPayslips = () => router.push('/(helper)/work/payslips' as any);

  return (
    <View style={[s.content, isDesktop && s.contentDesktop]}>
      {loading && payslips.length === 0 ? (
        <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* ── Unified hero: identity + earnings together, one full-width card ── */}
          <LinearGradient colors={['#41220F', '#241109']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, isDesktop && s.heroDesktop, isDesktop && { marginBottom: 12 }]}>
            <View style={s.heroGlowA} pointerEvents="none" />
            <View style={s.heroGlowB} pointerEvents="none" />

            {/* Identity */}
            <View style={[s.heroIdentity, isDesktop && s.heroIdentityDesktop]}>
              <View style={s.heroAvatarWrap}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={s.heroAvatar} contentFit="cover" />
                ) : (
                  <View style={[s.heroAvatar, s.heroAvatarFb]}><Ionicons name="person" size={30} color="rgba(255,255,255,0.55)" /></View>
                )}
                {verified ? (
                  <View style={s.heroAvatarBadge}><Ionicons name="checkmark" size={12} color="#fff" /></View>
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.heroGreetHi}>{greeting},</Text>
                <Text style={s.heroGreetName} numberOfLines={1}>{firstName} 👋</Text>
                <View style={s.heroMetaRow}>
                  {activeHire.employer_name ? (
                    <Text style={s.heroMetaTxt} numberOfLines={1}>with {activeHire.employer_name}</Text>
                  ) : null}
                  {verified ? (
                    <View style={s.heroVerBadge}>
                      <Ionicons name="shield-checkmark" size={11} color="#fff" />
                      <Text style={s.heroVerText}>PESO Verified</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={isDesktop ? s.heroDividerV : s.heroDividerH} />

            {/* Earnings */}
            <View style={[s.heroEarnings, isDesktop && s.heroEarningsDesktop]}>
              <View style={s.heroTopRow}>
                <Text style={s.heroLabel}>AGREED PAY</Text>
                <View style={s.periodChip}><Text style={s.periodChipTxt}>{activeHire.salary_period ?? 'Contract'}</Text></View>
              </View>
              <Text style={[s.heroAmount, isDesktop && { fontSize: 34, marginTop: 6 }]}>{agreedSalary > 0 ? formatPeso(agreedSalary) : '—'}</Text>
              <Text style={s.heroSub}>
                {agreedSalary > 0
                  ? `${salaryPeriodAbbr(activeHire.salary_period || 'Monthly')} rate · See actual paydays in Payslips`
                  : 'Your agreed pay is listed in your signed contract.'}
              </Text>
              <View style={[s.heroFooter, isDesktop && { marginTop: 10, paddingTop: 8 }]}>
                <Ionicons name="shield-checkmark" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.heroFootTxt}>
                  {activeHire.payment_schedule
                    ? `Payment schedule: ${activeHire.payment_schedule}. Each payday is recorded separately.`
                    : 'Agreed salary is separate from payment records; each payday is recorded separately.'}
                </Text>
              </View>
            </View>
          </LinearGradient>
          {announcement}

          {/* ── At a glance ── */}
          <View style={[s.glanceRow, isDesktop && { marginBottom: 10 }]}>
            <TouchableOpacity style={[s.glanceCard, isDesktop && s.glanceCardDesktop]} onPress={goPayslips} activeOpacity={0.85}>
              <View style={[s.glanceIcon, { backgroundColor: ICON_BG }]}><Ionicons name="receipt-outline" size={17} color={ORANGE} /></View>
              <Text style={s.glanceValue} numberOfLines={1}>{pendingPayslipCount > 0 ? `${pendingPayslipCount} to review` : `${payslips.length} recorded`}</Text>
              <Text style={s.glanceLabel}>Payslips</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.glanceCard, isDesktop && s.glanceCardDesktop]} onPress={openContract} activeOpacity={0.85}>
              <View style={[s.glanceIcon, { backgroundColor: '#EDF3FF' }]}><Ionicons name="document-text-outline" size={17} color={BLUE} /></View>
              <Text style={s.glanceValue} numberOfLines={1}>View terms</Text>
              <Text style={s.glanceLabel}>Contract reference</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.glanceCard, isDesktop && s.glanceCardDesktop]} onPress={openMessages} activeOpacity={0.85}>
              <View style={[s.glanceIcon, { backgroundColor: INFO_BG, overflow: 'hidden' }]}>
                {employerPhoto ? <Image source={{ uri: employerPhoto }} style={{ width: 34, height: 34 }} contentFit="cover" /> : <Ionicons name="person" size={17} color={BLUE} />}
              </View>
              <Text style={s.glanceValue} numberOfLines={1}>{(activeHire.employer_name || 'Employer').split(' ')[0]}</Text>
              <Text style={s.glanceLabel}>Employer</Text>
            </TouchableOpacity>
          </View>

          {/* ── Payment records + placement tools (side-by-side on desktop) ── */}
          <View style={isDesktop ? [s.twoCol, { marginBottom: 10 }] : undefined}>
            <View style={[s.card, isDesktop && s.colItem, isDesktop && s.cardDesktop]}>
              <Text style={s.cardTitle}>Payment records</Text>
              <View style={s.monthRow}>
                <MonthStat value={String(payslips.length)} label="Payslips" />
                <View style={s.monthDivider} />
                <MonthStat value={String(pendingPayslipCount)} label="Need response" />
                <View style={s.monthDivider} />
                <MonthStat value={String(disputedPayslipCount)} label="Issues" />
              </View>
              <Text style={s.monthNote}>A payslip appears after your employer records a payday. You can confirm receipt or report a problem.</Text>
              <TouchableOpacity style={s.viewRecordsButton} onPress={goPayslips} activeOpacity={0.8}>
                <Text style={s.viewRecordsText}>Open payslips</Text>
                <Ionicons name="arrow-forward" size={15} color={ORANGE} />
              </TouchableOpacity>
            </View>

            <View style={[s.card, isDesktop && s.colItem, isDesktop && s.cardDesktop]}>
              <Text style={s.cardTitle}>Manage</Text>
              <ManageRow icon="chatbubbles-outline" color={ORANGE} label="Message employer" badge={unreadMessages} onPress={openMessages} />
              <ManageRow icon="receipt-outline" color={ORANGE} label="Payslips" badge={pendingPayslipCount} onPress={goPayslips} />
              <ManageRow icon="document-text-outline" color={BLUE} label="Contract reference" onPress={openContract} />
              <ManageRow icon="help-buoy-outline" color={MUTED} label="Request assistance" onPress={openAssistance} />
              <ManageRow icon="exit-outline" color={DANGER} label="End employment" onPress={() => setEndModal(true)} last />
            </View>
          </View>

          <TouchableOpacity style={[s.refreshBtn, isDesktop && { paddingVertical: 4, marginTop: 0 }]} onPress={() => { void onRefreshWorkContext(); void load(); }} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={14} color={MUTED} />
            <Text style={s.refreshTxt}>Refresh</Text>
          </TouchableOpacity>
        </>
      )}

      <EndEmploymentModal
        visible={endModal}
        onClose={() => setEndModal(false)}
        applicationId={activeHire.application_id}
        userId={helperId}
        userType="helper"
        counterpartyName={activeHire.employer_name || 'employer'}
        onSuccess={() => { void onRefreshWorkContext(); void load(); }}
      />
      {noticeHost}
    </View>
  );
}

function MonthStat({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[s.monthValue, small && { fontSize: 14 }]} numberOfLines={1}>{value}</Text>
      <Text style={s.monthLabel}>{label}</Text>
    </View>
  );
}

function ManageRow({ icon, color, label, onPress, badge, last }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress: () => void; badge?: number; last?: boolean;
}) {
  return (
    <TouchableOpacity style={[s.manageRow, !last && s.manageRowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.manageIcon, { backgroundColor: color + '18' }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={[s.manageLabel, color === DANGER && { color: DANGER }]}>{label}</Text>
      {badge != null && badge > 0 ? (
        <View style={s.manageBadge}><Text style={s.manageBadgeTxt}>{badge > 9 ? '9+' : badge}</Text></View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  // Desktop: no scroll wrapper, so keep this tight — no artificial bottom buffer.
  contentDesktop: { padding: 20, paddingBottom: 8 },
  twoCol: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  colItem: { flex: 1 },

  // Unified hero — identity + earnings in ONE card (fills the width; no dead space)
  hero: { borderRadius: 24, padding: 22, marginBottom: 16, overflow: 'hidden' },
  heroDesktop: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 22 },
  heroGlowA: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,154,77,0.14)' },
  heroGlowB: { position: 'absolute', bottom: -70, left: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,154,77,0.08)' },

  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIdentityDesktop: { flex: 1, minWidth: 0 },
  heroAvatarWrap: { position: 'relative' },
  heroAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  heroAvatarFb: { alignItems: 'center', justifyContent: 'center' },
  heroAvatarBadge: { position: 'absolute', bottom: -1, right: -1, width: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, borderWidth: 2, borderColor: '#241109', alignItems: 'center', justifyContent: 'center' },
  heroGreetHi: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  heroGreetName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 23, color: '#fff', marginTop: 1 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  heroMetaTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' },
  heroVerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  heroVerText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: '#fff' },

  heroDividerH: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 18 },
  heroDividerV: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.12)' },

  heroEarnings: {},
  heroEarningsDesktop: { flex: 1, minWidth: 0 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, letterSpacing: 1, color: 'rgba(255,255,255,0.6)' },
  periodChip: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  periodChipTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: 'rgba(255,255,255,0.85)' },
  heroAmount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 42, color: '#fff', marginTop: 10, letterSpacing: -0.5 },
  heroSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  heroFootTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1 },

  // At a glance
  glanceRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  glanceCard: { flex: 1, backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: DIVIDER, padding: 12, alignItems: 'center', gap: 6 },
  glanceCardDesktop: { paddingVertical: 10 },
  glanceIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  glanceValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, textAlign: 'center' },
  glanceLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: MUTED },

  // Cards
  card: { backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: DIVIDER, padding: 16, marginBottom: 14 },
  cardDesktop: { padding: 14, marginBottom: 0 },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginBottom: 12 },

  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthDivider: { width: 1, height: 34, backgroundColor: DIVIDER },
  monthValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: DARK },
  monthLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: MUTED, marginTop: 2, textAlign: 'center' },
  monthNote: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: SUBTLE, marginTop: 12, lineHeight: 16 },
  viewRecordsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: DIVIDER, marginTop: 12, paddingTop: 12 },
  viewRecordsText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: ORANGE },

  // Manage list
  manageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  manageRowBorder: { borderBottomWidth: 1, borderBottomColor: DIVIDER },
  manageIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  manageLabel: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  manageBadge: { backgroundColor: ORANGE, borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  manageBadgeTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: '#fff' },

  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
  refreshTxt: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED },
});
