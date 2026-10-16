import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ParentWorkModeShell } from '@/components/parent/work/ParentWorkModeShell';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { formatPeso } from '@/lib/payrollApi';
import { BROWN, DARK, DIVIDER, ICON_BG, MUTED, SUBTLE, SURFACE } from '@/components/parent/home/parentWarmTheme';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';

function Action({ icon, title, detail, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.actionIcon}><Ionicons name={icon} size={19} color={BROWN} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={SUBTLE} />
    </TouchableOpacity>
  );
}

function HelperDetail({ placement, onAction }: {
  placement: ActivePlacement; onAction: (action: 'contract' | 'payslips' | 'assistance' | 'messages') => void;
}) {
  const salary = placement.confirmed_salary ?? placement.salary_offered;
  const salaryText = salary == null
    ? 'Not specified'
    : `${formatPeso(salary)}${placement.salary_period ? ` / ${placement.salary_period}` : ''}`;

  return (
    <>
      <View style={styles.profileCard}>
        {placement.helper_photo ? (
          <Image source={{ uri: placement.helper_photo }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}><Ionicons name="person" size={28} color={BROWN} /></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{placement.helper_name}</Text>
          <Text style={styles.role}>{placement.job_title}</Text>
          <View style={styles.status}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{placement.status === 'termination_pending' ? 'Termination pending' : 'Active placement'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.termsCard}>
        <Text style={styles.sectionTitle}>Placement snapshot</Text>
        <Detail label="Agreed pay" value={salaryText} />
        <Detail label="Payment schedule" value={placement.payment_schedule || 'Not specified'} />
        <Detail label="Work hours" value={placement.work_hours || 'Not specified'} />
        <Detail label="Rest days" value={placement.rest_days?.join(', ') || 'Not specified'} />
        <Detail label="Start date" value={placement.employment_start_date || 'Not specified'} />
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Placement tools</Text>
        <Action icon="document-text-outline" title="Contract reference" detail="Review the agreed terms and signed agreement" onPress={() => onAction('contract')} />
        <Action icon="wallet-outline" title="Payment records" detail="Review or record payments already made" onPress={() => onAction('payslips')} />
        <Action icon="help-buoy-outline" title="Request assistance" detail="Raise an issue linked to this placement" onPress={() => onAction('assistance')} />
        <Action icon="chatbubble-ellipses-outline" title="Message helper" detail="Continue your placement conversation" onPress={() => onAction('messages')} />
      </View>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ParentWorkHelperDetailScreen() {
  const router = useRouter();
  const { application_id } = useLocalSearchParams<{ application_id?: string }>();
  const { placements, loading, error } = useParentActivePlacements();
  const placement = placements.find((item) => String(item.application_id) === String(application_id));

  const onAction = (action: 'contract' | 'payslips' | 'assistance' | 'messages') => {
    if (!placement) return;
    if (action === 'messages') {
      router.push({
        pathname: '/(parent)/messages',
        params: {
          partner_id: String(placement.helper_id),
          partner_name: placement.helper_name,
          job_post_id: String(placement.job_post_id),
        },
      } as never);
      return;
    }
    router.push(`/(parent)/work/${action === 'payslips' ? 'payslips' : action}` as never);
  };

  return (
    <ParentWorkModeShell active="home" title="Helper placement" subtitle="A focused view of the active employment record">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator color={BROWN} size="large" style={{ marginTop: 28 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !error && !placement ? (
          <View style={styles.empty}>
            <Ionicons name="person-outline" size={26} color={BROWN} />
            <Text style={styles.emptyTitle}>Placement not found</Text>
            <Text style={styles.emptyText}>This active placement may have ended. Return to Work Home to refresh your helper list.</Text>
            <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(parent)/home' as never)}>
              <Text style={styles.homeButtonText}>Return to Work Home</Text>
            </TouchableOpacity>
          </View>
        ) : placement ? (
          <HelperDetail placement={placement} onAction={onAction} />
        ) : null}
      </ScrollView>
    </ParentWorkModeShell>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 36, gap: 12 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 15 },
  photo: { width: 58, height: 58, borderRadius: 18 },
  photoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: ICON_BG },
  name: { color: DARK, fontSize: 17, fontWeight: '800' },
  role: { color: MUTED, fontSize: 12, marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#398253' },
  statusText: { color: '#398253', fontSize: 10.5, fontWeight: '700' },
  termsCard: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 14 },
  sectionTitle: { color: DARK, fontSize: 14.5, fontWeight: '800', marginBottom: 7 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: DIVIDER },
  detailLabel: { color: MUTED, fontSize: 11.5, flex: 1 },
  detailValue: { color: DARK, fontSize: 11.5, fontWeight: '700', flex: 1.2, textAlign: 'right' },
  actionsCard: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 13 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 63, borderTopWidth: 1, borderTopColor: DIVIDER },
  actionIcon: { width: 37, height: 37, borderRadius: 11, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { color: DARK, fontSize: 12.5, fontWeight: '700' },
  actionDetail: { color: MUTED, fontSize: 10.5, marginTop: 3 },
  empty: { alignItems: 'center', gap: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 24 },
  emptyTitle: { color: DARK, fontSize: 15, fontWeight: '700' },
  emptyText: { color: MUTED, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  homeButton: { backgroundColor: BROWN, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 10, marginTop: 6 },
  homeButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  error: { color: '#B42318', backgroundColor: '#FEE4E2', borderRadius: 10, padding: 10, fontSize: 12 },
});
