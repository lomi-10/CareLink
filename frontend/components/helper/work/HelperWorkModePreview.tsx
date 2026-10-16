import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  DARK,
  DIVIDER,
  ICON_BG,
  MUTED,
  ORANGE,
  SUBTLE,
  SURFACE,
} from '@/components/helper/home/helperWarmTheme';

type Props = {
  startDate?: string | null;
  onBrowseJobs: () => void;
  onOpenContract: () => void;
  onOpenAssistance: () => void;
};

function displayDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function HelperWorkModePreview({
  startDate,
  onBrowseJobs,
  onOpenContract,
  onOpenAssistance,
}: Props) {
  const hasFutureStart = !!startDate && startDate > new Date().toISOString().slice(0, 10);

  return (
    <View style={styles.page}>
      <LinearGradient colors={['#41220F', '#241109']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroIcon}><Ionicons name="briefcase-outline" size={22} color="#fff" /></View>
        <View style={styles.previewBadge}>
          <Ionicons name="eye-outline" size={13} color="#FFE0C6" />
          <Text style={styles.previewBadgeText}>PREVIEW ONLY</Text>
        </View>
        <Text style={styles.heroTitle}>Your Work Mode home</Text>
        <Text style={styles.heroBody}>
          {hasFutureStart
            ? `Your placement is arranged, but the work tools unlock on ${displayDate(startDate!)}. This preview does not change your placement.`
            : 'After a signed placement starts, Home keeps payment records close by, with your contract and assistance in separate tabs.'}
        </Text>
      </LinearGradient>

      <View style={styles.paymentCard}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionIcon}><Ionicons name="receipt-outline" size={19} color={ORANGE} /></View>
          <View style={styles.headingCopy}>
            <Text style={styles.cardTitle}>Payslips and payment records</Text>
            <Text style={styles.cardDescription}>Review employer-recorded paydays and respond to each record.</Text>
          </View>
          <View style={styles.lockedPill}>
            <Ionicons name="lock-closed-outline" size={11} color={MUTED} />
            <Text style={styles.lockedText}>Preview</Text>
          </View>
        </View>
        <View style={styles.sampleCard}>
          <View style={styles.sampleHeader}>
            <Text style={styles.sampleLabel}>ILLUSTRATION</Text>
            <View style={styles.pendingPill}><Text style={styles.pendingText}>Awaiting response</Text></View>
          </View>
          <SampleRow label="Pay period" value="Example period" />
          <SampleRow label="Gross pay" value="Employer-recorded" />
          <SampleRow label="Amount paid" value="Shown on a real record" last />
        </View>
      </View>

      <View style={styles.quickLinks}>
        <PreviewLink
          icon="document-text-outline"
          title="Contract"
          description="See what the read-only signed agreement reference includes."
          onPress={onOpenContract}
        />
        <PreviewLink
          icon="help-buoy-outline"
          title="Assistance"
          description="See how to report a concern or request help."
          onPress={onOpenAssistance}
        />
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={18} color={ORANGE} />
        <Text style={styles.disclaimerText}>
          This is sample content only. No payment acknowledgment, leave request, or assistance report can be submitted in preview mode.
        </Text>
      </View>

      <TouchableOpacity style={styles.browseButton} onPress={onBrowseJobs} activeOpacity={0.85} accessibilityRole="button">
        <Ionicons name="search-outline" size={17} color="#fff" />
        <Text style={styles.browseButtonText}>Browse jobs</Text>
      </TouchableOpacity>
    </View>
  );
}

function SampleRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.sampleRow, !last && styles.sampleRowBorder]}>
      <Text style={styles.sampleKey}>{label}</Text>
      <Text style={styles.sampleValue}>{value}</Text>
    </View>
  );
}

function PreviewLink({
  icon,
  title,
  description,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.linkCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.linkIcon}><Ionicons name={icon} size={19} color={ORANGE} /></View>
      <View style={styles.linkCopy}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={SUBTLE} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: 16, paddingBottom: 28 },
  hero: { borderRadius: 22, padding: 22, marginBottom: 14, overflow: 'hidden' },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  previewBadge: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  previewBadgeText: { color: '#FFE0C6', fontFamily: FontFamily.fredokaSemiBold, fontSize: 9.5, letterSpacing: 0.7 },
  heroTitle: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, marginBottom: 5 },
  heroBody: { color: 'rgba(255,255,255,0.78)', fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, lineHeight: 20, maxWidth: 720 },
  paymentCard: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 17, padding: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: DARK, fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
  cardDescription: { color: MUTED, fontFamily: FontFamily.fredokaRegular, fontSize: 12, lineHeight: 17, marginTop: 3 },
  lockedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: '#F4F1EE', paddingHorizontal: 8, paddingVertical: 5 },
  lockedText: { color: MUTED, fontFamily: FontFamily.fredokaSemiBold, fontSize: 10 },
  sampleCard: { backgroundColor: '#FBF8F5', borderWidth: 1, borderColor: DIVIDER, borderRadius: 12, paddingHorizontal: 11 },
  sampleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 3 },
  sampleLabel: { color: SUBTLE, fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, letterSpacing: 0.8 },
  pendingPill: { backgroundColor: '#FFF1D6', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  pendingText: { color: '#9A5C00', fontFamily: FontFamily.fredokaSemiBold, fontSize: 9.5 },
  sampleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 9 },
  sampleRowBorder: { borderBottomWidth: 1, borderBottomColor: DIVIDER },
  sampleKey: { color: MUTED, fontFamily: FontFamily.fredokaRegular, fontSize: 11.5 },
  sampleValue: { color: DARK, fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, textAlign: 'right', flexShrink: 1 },
  quickLinks: { gap: 10, marginTop: 12 },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 15, padding: 13 },
  linkIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  linkCopy: { flex: 1, minWidth: 0 },
  linkTitle: { color: DARK, fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  linkDescription: { color: MUTED, fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: ICON_BG, borderRadius: 13, padding: 12, marginTop: 14 },
  disclaimerText: { flex: 1, color: DARK, fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, lineHeight: 17 },
  browseButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, paddingHorizontal: 20, borderRadius: 13, backgroundColor: ORANGE, marginTop: 14 },
  browseButtonText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },
});
