import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { BROWN, DARK, DIVIDER, ICON_BG, MUTED, SURFACE } from '@/components/parent/home/parentWarmTheme';
import { ParentWorkModeTabBar } from '@/components/parent/home';
import { ParentTopNav } from '@/components/parent/web/ParentTopNav';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useParentProfile } from '@/hooks/parent/useParentProfile';
import { useAuth, useResponsive } from '@/hooks/shared';

type ContractTerms = {
  work_schedule?: string | null;
  work_hours?: string | null;
  employment_start_date?: string | null;
  employment_end_date?: string | null;
  confirmed_salary?: number | null;
  payment_schedule?: string | null;
  vacation_leave_days?: number | null;
  sick_leave_days?: number | null;
  rest_days?: string[] | null;
  overtime_rate?: string | null;
  other_benefits?: string | null;
  contract_duration?: string | null;
};

type Tab = 'contract' | 'payroll';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatPeso(value: number | null | undefined): string {
  return value == null || !Number.isFinite(Number(value))
    ? 'Not specified'
    : `₱${Number(value).toLocaleString('en-PH')}`;
}

function nextPayday(schedule: string | null | undefined): string {
  const today = new Date();
  const normalized = (schedule ?? 'monthly').toLowerCase();
  const payday = new Date(today);
  if (normalized === 'weekly') {
    const daysUntilFriday = today.getDay() <= 5 ? (5 - today.getDay() || 7) : 6;
    payday.setDate(today.getDate() + daysUntilFriday);
  } else if (normalized === 'daily') {
    payday.setDate(today.getDate() + 1);
  } else {
    payday.setDate(30);
    if (today.getDate() >= 28) payday.setMonth(today.getMonth() + 1, 30);
  }
  return payday.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function contractStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'hired' || normalized === 'accepted') {
    return { label: 'Active placement', background: '#E7F3EA', color: '#35734B' };
  }
  if (normalized.includes('termination')) {
    return { label: 'Ending placement', background: '#FEE2E2', color: '#B42318' };
  }
  return { label: status, background: ICON_BG, color: MUTED };
}

function DetailRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
          <Text style={[styles.detailValue, styles.link]}>{value}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.detailValue}>{value}</Text>
      )}
    </View>
  );
}

export default function HelperProfileScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { userData, getFullName, handleLogout } = useAuth();
  const parentId = Number(userData?.user_id ?? 0);
  const { profileData } = useParentProfile();
  const params = useLocalSearchParams<{
    application_id?: string;
    helper_id?: string;
    helper_name?: string;
    helper_photo?: string;
    job_title?: string;
    status?: string;
    salary_offered?: string;
    salary_period?: string;
    helper_phone?: string;
  }>();

  const applicationId = Number(params.application_id ?? 0);
  const helperId = Number(params.helper_id ?? 0);
  const helperName = params.helper_name ? decodeURIComponent(params.helper_name) : 'Helper';
  const helperPhoto = params.helper_photo ? decodeURIComponent(params.helper_photo) : null;
  const jobTitle = params.job_title ? decodeURIComponent(params.job_title) : '';
  const status = params.status ? decodeURIComponent(params.status) : 'hired';
  const salaryOffered = params.salary_offered ? Number(params.salary_offered) : null;
  const salaryPeriod = params.salary_period ? decodeURIComponent(params.salary_period) : null;
  const helperPhone = params.helper_phone ? decodeURIComponent(params.helper_phone) : null;

  const [activeTab, setActiveTab] = useState<Tab>('contract');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [terms, setTerms] = useState<ContractTerms | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const loadTerms = useCallback(async () => {
    if (!applicationId || !parentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(
        `${API_URL}/parent/get_contract_terms.php?application_id=${applicationId}&parent_id=${parentId}&requester_id=${parentId}`,
      );
      const data = await response.json();
      if (!data.success) {
        setLoadError(data.message || 'Could not load contract terms.');
        return;
      }
      const contract = data.contract ?? {};
      let restDays: string[] | null = null;
      if (Array.isArray(contract.rest_days)) restDays = contract.rest_days;
      else if (typeof contract.rest_days === 'string') {
        try {
          restDays = JSON.parse(contract.rest_days);
        } catch {
          restDays = null;
        }
      }
      setTerms({
        work_schedule: data.work_schedule ?? null,
        work_hours: contract.work_hours ?? null,
        employment_start_date: contract.employment_start_date ?? null,
        employment_end_date: contract.employment_end_date ?? null,
        confirmed_salary: contract.confirmed_salary ?? null,
        payment_schedule: contract.payment_schedule ?? null,
        vacation_leave_days: contract.vacation_leave_days ?? null,
        sick_leave_days: contract.sick_leave_days ?? null,
        rest_days: restDays,
        overtime_rate: contract.overtime_rate ?? null,
        other_benefits: contract.other_benefits ?? null,
        contract_duration: contract.contract_duration ?? null,
      });
    } catch (error) {
      console.error('Could not load helper contract terms:', error);
      setLoadError('Could not load contract terms. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, parentId]);

  useEffect(() => {
    void loadTerms();
  }, [loadTerms]);

  const salary = terms?.confirmed_salary ?? salaryOffered;
  const period = terms?.payment_schedule ?? salaryPeriod ?? 'Monthly';
  const estimatedMonthly = useMemo(() => {
    if (salary == null || !Number.isFinite(Number(salary))) return 'Not specified';
    const amount = Number(salary);
    const normalized = period.toLowerCase();
    const monthly = normalized === 'daily' ? amount * 26 : normalized === 'weekly' ? amount * 4.33 : amount;
    return `₱${Math.round(monthly).toLocaleString('en-PH')}`;
  }, [period, salary]);
  const initials = helperName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  const statusStyle = contractStatus(status);
  const leavePath = () => router.push({
    pathname: '/(parent)/hire/placement_leave_requests',
    params: { application_id: String(applicationId), helper_name: helperName },
  } as never);

  const contractRows = [
    ['Position', jobTitle || 'Not specified'],
    ['Work schedule', terms?.work_schedule || 'Not specified'],
    ['Work hours', terms?.work_hours || 'Not specified'],
    ['Rest days', terms?.rest_days?.join(', ') || 'Not specified'],
    ['Start date', formatDate(terms?.employment_start_date)],
    ['End date', formatDate(terms?.employment_end_date)],
    ['Contract duration', terms?.contract_duration || 'Not specified'],
    ['Other benefits', terms?.other_benefits || 'Not specified'],
  ];

  const content = (
    <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#F6D9AE', '#E2A968', '#C5853E']} style={styles.hero}>
        <View style={styles.avatar}>
          {helperPhoto ? (
            <Image source={{ uri: helperPhoto }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.helperName}>{helperName}</Text>
          <Text style={styles.jobTitle}>{jobTitle || 'Placement details'}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.background }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => router.push({
            pathname: '/(parent)/messages',
            params: { partner_id: String(helperId), partner_name: helperName },
          } as never)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.tabs}>
        {([
          ['contract', 'Contract & Leave'],
          ['payroll', 'Payroll'],
        ] as const).map(([tab, label]) => (
          <TouchableOpacity key={tab} style={styles.tab} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>{label}</Text>
            {activeTab === tab ? <View style={styles.tabUnderline} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={BROWN} size="large" style={{ marginTop: 28 }} /> : null}
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      {!loading && !loadError && activeTab === 'contract' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agreed contract terms</Text>
          {contractRows.map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
          {helperPhone ? (
            <DetailRow
              label="Contact"
              value={helperPhone}
              onPress={() => void Linking.openURL(`tel:${helperPhone}`)}
            />
          ) : null}
          <TouchableOpacity style={styles.leaveButton} onPress={leavePath} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={18} color={BROWN} />
            <Text style={styles.leaveButtonText}>Review leave requests</Text>
            <Ionicons name="chevron-forward" size={17} color={BROWN} />
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !loadError && activeTab === 'payroll' ? (
        <>
          <View style={styles.payCard}>
            <Text style={styles.eyebrow}>AGREED PAY</Text>
            <Text style={styles.payAmount}>{formatPeso(salary)}</Text>
            <Text style={styles.payPeriod}>per {period.toLowerCase()} · monthly estimate {estimatedMonthly}</Text>
            <View style={styles.payDivider} />
            <DetailRow label="Payment schedule" value={period} />
            <DetailRow label="Next payday" value={nextPayday(period)} />
            {terms?.overtime_rate ? <DetailRow label="Overtime rate" value={terms.overtime_rate} /> : null}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Leave entitlements</Text>
            <DetailRow
              label="Contract vacation leave"
              value={terms?.vacation_leave_days == null ? 'Not specified' : `${terms.vacation_leave_days} days`}
            />
            <DetailRow
              label="Contract sick leave"
              value={terms?.sick_leave_days == null ? 'Not specified' : `${terms.sick_leave_days} days`}
            />
            <TouchableOpacity style={styles.leaveButton} onPress={leavePath} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={18} color={BROWN} />
              <Text style={styles.leaveButtonText}>Review leave requests</Text>
              <Ionicons name="chevron-forward" size={17} color={BROWN} />
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </ScrollView>
  );

  const logoutModals = (
    <>
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged out successfully"
        type="success"
        autoClose
        duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
    </>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <ParentTopNav
          active="helpers"
          mode="work"
          userName={getFullName()}
          avatar={(profileData?.profile?.profile_image as string | null) ?? null}
          verified={profileData?.profile?.verification_status === 'Verified'}
          onLogout={() => setConfirmLogout(true)}
        />
        {content}
        {logoutModals}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mobileRoot}>
      <View style={styles.mobileHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.mobileTitle} numberOfLines={1}>{helperName}</Text>
        <View style={styles.backButton} />
      </View>
      {content}
      <ParentWorkModeTabBar />
      {logoutModals}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  desktopRoot: { flex: 1, backgroundColor: '#F7F2EA' },
  mobileRoot: { flex: 1, backgroundColor: '#F7F2EA' },
  mobileHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  mobileTitle: { flex: 1, textAlign: 'center', color: DARK, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17 },
  content: { flexGrow: 1, gap: 14, padding: 16, paddingBottom: 28 },
  contentDesktop: { width: '100%', maxWidth: 980, alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 18, padding: 16 },
  avatar: { width: 58, height: 58, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 58, height: 58, borderRadius: 17 },
  avatarFallback: { width: 52, height: 52, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  initials: { color: BROWN, fontFamily: FontFamily.fredokaSemiBold, fontSize: 20 },
  heroInfo: { flex: 1, minWidth: 0 },
  helperName: { color: '#3B2A18', fontFamily: FontFamily.fredokaSemiBold, fontSize: 19 },
  jobTitle: { color: '#6E5032', fontSize: 12, marginTop: 2 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginTop: 7 },
  statusText: { fontSize: 10, fontWeight: '800' },
  messageButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BROWN, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  messageButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: DIVIDER },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 7 },
  tabLabel: { color: MUTED, fontSize: 13, fontWeight: '700' },
  tabLabelActive: { color: BROWN },
  tabUnderline: { height: 2, width: '72%', backgroundColor: BROWN, borderRadius: 2 },
  card: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 17, padding: 15 },
  cardTitle: { color: DARK, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  detailRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderBottomWidth: 1, borderBottomColor: DIVIDER, paddingVertical: 9 },
  detailLabel: { flex: 1, color: MUTED, fontSize: 12 },
  detailValue: { flex: 1.2, color: DARK, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  link: { color: BROWN, textDecorationLine: 'underline' },
  leaveButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: DIVIDER, borderRadius: 12, paddingHorizontal: 12, marginTop: 14 },
  leaveButtonText: { flex: 1, color: BROWN, fontSize: 13, fontWeight: '700' },
  payCard: { backgroundColor: '#1E2A4A', borderRadius: 18, padding: 17 },
  eyebrow: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  payAmount: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 30, marginTop: 4 },
  payPeriod: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  payDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 14 },
  error: { color: '#B42318', backgroundColor: '#FEE4E2', borderRadius: 12, padding: 12 },
});
