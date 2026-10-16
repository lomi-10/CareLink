import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { ParentWorkModeShell } from '@/components/parent/work/ParentWorkModeShell';
import { useAuth } from '@/hooks/shared';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { applicationContractPdfUrl } from '@/constants/applications';
import { formatPeso } from '@/lib/payrollApi';
import { BROWN, DARK, DIVIDER, ICON_BG, MUTED, SURFACE } from '@/components/parent/home/parentWarmTheme';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';

function display(value: string | number | null | undefined) {
  return value === null || value === undefined || String(value).trim() === '' ? 'Not specified' : String(value);
}

function displayDate(value?: string | null) {
  if (!value) return 'Not specified';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function ContractCard({ placement, parentId, onPdfError }: {
  placement: ActivePlacement; parentId: number; onPdfError: (message: string) => void;
}) {
  const signed = !!placement.employer_signed_at && !!placement.helper_signed_at;
  const details: [string, string][] = [
    ['Helper', placement.helper_name],
    ['Position', placement.job_title],
    ['Agreed salary', placement.confirmed_salary != null
      ? `${formatPeso(placement.confirmed_salary)}${placement.salary_period ? ` / ${placement.salary_period}` : ''}`
      : 'Not specified'],
    ['Payment schedule', display(placement.payment_schedule)],
    ['Work hours', display(placement.work_hours)],
    ['Rest days', display(placement.rest_days?.join(', '))],
    ['Start date', displayDate(placement.employment_start_date)],
    ['End date', displayDate(placement.employment_end_date)],
    ['Contract duration', display(placement.contract_duration)],
    ['Overtime rate', display(placement.overtime_rate)],
    ['Vacation leave', placement.vacation_leave_days == null ? 'Not specified' : `${placement.vacation_leave_days} days`],
    ['Sick leave', placement.sick_leave_days == null ? 'Not specified' : `${placement.sick_leave_days} days`],
    ['Other benefits', display(placement.other_benefits)],
    ['Special conditions', display(placement.special_conditions || placement.terms_notes)],
    ['Debt agreement', display(placement.debt_agreement)],
    ['Debt amount', placement.debt_amount == null ? 'Not specified' : formatPeso(placement.debt_amount)],
    ['Deployment agreement', display(placement.deployment_agreement)],
    ['Termination terms', display(placement.termination_conditions)],
  ];

  const openPdf = async () => {
    try {
      await WebBrowser.openBrowserAsync(
        applicationContractPdfUrl(Number(placement.application_id), parentId, 'parent'),
      );
    } catch (error) {
      console.error('Could not open signed parent contract:', error);
      onPdfError('Could not open the signed contract. Please try again.');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.icon}><Ionicons name="document-text-outline" size={20} color={BROWN} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{placement.helper_name}</Text>
          <Text style={styles.role} numberOfLines={1}>{placement.job_title}</Text>
        </View>
        <View style={[styles.status, signed ? styles.statusSigned : styles.statusPending]}>
          <Text style={[styles.statusText, signed && styles.statusTextSigned]}>{signed ? 'SIGNED' : 'TERMS'}</Text>
        </View>
      </View>

      <View style={styles.details}>
        {details.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>

      {signed ? (
        <TouchableOpacity style={styles.pdfButton} onPress={openPdf} activeOpacity={0.8}>
          <Ionicons name="open-outline" size={17} color="#fff" />
          <Text style={styles.pdfText}>Open signed contract PDF</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={BROWN} />
          <Text style={styles.noteText}>This is a reference to the recorded terms. The signed PDF becomes available after both parties sign.</Text>
        </View>
      )}
    </View>
  );
}

export default function ParentContractScreen() {
  const { userData } = useAuth();
  const parentId = Number(userData?.user_id ?? 0);
  const { placements, loading, error } = useParentActivePlacements();
  const [pdfError, setPdfError] = useState('');

  return (
    <ParentWorkModeShell active="contract" title="Contract reference" subtitle="Read the terms recorded for each active placement">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Ionicons name="lock-closed-outline" size={18} color={BROWN} />
          <Text style={styles.introText}>This is a read-only summary. The signed contract PDF remains the complete agreement for both parties.</Text>
        </View>
        {loading ? <ActivityIndicator color={BROWN} size="large" style={{ marginTop: 28 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {pdfError ? <Text style={styles.error}>{pdfError}</Text> : null}
        {!loading && placements.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={28} color={BROWN} />
            <Text style={styles.emptyTitle}>Contract preview</Text>
            <Text style={styles.emptyText}>Agreed terms, signatures, and the signed PDF will appear here when you have an active placement.</Text>
          </View>
        ) : placements.map((placement) => (
          <ContractCard key={placement.application_id} placement={placement} parentId={parentId} onPdfError={setPdfError} />
        ))}
      </ScrollView>
    </ParentWorkModeShell>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 36, gap: 12 },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: ICON_BG, borderRadius: 13, padding: 12 },
  introText: { flex: 1, color: DARK, fontSize: 12, lineHeight: 17 },
  card: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 17, padding: 15, gap: 13 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  name: { color: DARK, fontSize: 15, fontWeight: '700' },
  role: { color: MUTED, fontSize: 12, marginTop: 2 },
  status: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusSigned: { backgroundColor: '#E7F3EA' },
  statusPending: { backgroundColor: '#F4EFE8' },
  statusText: { color: MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statusTextSigned: { color: '#35734B' },
  details: { borderTopWidth: 1, borderTopColor: DIVIDER },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  label: { flex: 1, color: MUTED, fontSize: 12 },
  value: { flex: 1.25, color: DARK, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  pdfButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BROWN, borderRadius: 12, paddingHorizontal: 12 },
  pdfText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: ICON_BG, borderRadius: 11, padding: 10 },
  noteText: { flex: 1, color: MUTED, fontSize: 11, lineHeight: 16 },
  empty: { alignItems: 'center', gap: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 24 },
  emptyTitle: { color: DARK, fontSize: 15, fontWeight: '700' },
  emptyText: { color: MUTED, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  error: { color: '#B42318', backgroundColor: '#FEE4E2', borderRadius: 10, padding: 10, fontSize: 12 },
});
