import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubmitComplaintModal } from '@/components/shared';
import { WorkModeShell } from '@/components/helper/work';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import {
  DARK,
  DIVIDER,
  ICON_BG,
  MUTED,
  ORANGE,
  SUBTLE,
  SURFACE,
} from '@/components/helper/home/helperWarmTheme';

const CONCERNS: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}[] = [
  { icon: 'cash-outline', title: 'Wages or payment', description: 'Raise a concern about a recorded payment or unpaid wages.' },
  { icon: 'document-text-outline', title: 'Contract or duties', description: 'Ask for help with agreed terms, duties, or a contract concern.' },
  { icon: 'shield-outline', title: 'Safety or treatment', description: 'Report unsafe conditions, mistreatment, harassment, or conduct.' },
];

export default function HelperAssistanceScreen() {
  const { ready, isWorkMode, activeHire } = useHelperWorkMode();
  const [reportOpen, setReportOpen] = useState(false);
  const isActive = ready && isWorkMode && !!activeHire;

  return (
    <WorkModeShell desktopTitle="Assistance" desktopSubtitle="Report an issue or ask for help">
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="help-buoy-outline" size={22} color={ORANGE} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{isActive ? 'Request assistance' : 'Assistance preview'}</Text>
            <Text style={styles.subtitle}>
              {isActive
                ? 'Use this channel to report a workplace concern or request help with your placement.'
                : 'See how the assistance channel works. Submitting a real report is available after your placement starts.'}
            </Text>
          </View>
          {!isActive ? <PreviewPill /> : null}
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={ORANGE} />
          <Text style={styles.noticeText}>
            Reports go to the CareLink system administrator first. Serious cases may be forwarded to PESO with notice to the people involved. PESO referral or mediation is not guaranteed.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topics you can raise</Text>
          {CONCERNS.map((concern) => (
            <View key={concern.title} style={styles.concernRow}>
              <View style={styles.concernIcon}><Ionicons name={concern.icon} size={18} color={ORANGE} /></View>
              <View style={styles.concernCopy}>
                <Text style={styles.concernTitle}>{concern.title}</Text>
                <Text style={styles.concernDescription}>{concern.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {isActive && activeHire ? (
          <TouchableOpacity style={styles.primaryButton} onPress={() => setReportOpen(true)} activeOpacity={0.85}>
            <Ionicons name="chatbox-ellipses-outline" size={19} color="#fff" />
            <Text style={styles.primaryButtonText}>Report an issue or request help</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledButton}>
            <Ionicons name="lock-closed-outline" size={16} color={SUBTLE} />
            <Text style={styles.disabledButtonText}>Real assistance requests unlock after placement starts</Text>
          </View>
        )}

        <View style={styles.guidance}>
          <Ionicons name="shield-checkmark-outline" size={18} color={ORANGE} />
          <Text style={styles.guidanceText}>
            Include what happened, when it happened, and any relevant details. Avoid sharing passwords or unrelated sensitive information.
          </Text>
        </View>
      </ScrollView>

      {isActive && activeHire ? (
        <SubmitComplaintModal
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          applicationId={activeHire.application_id}
          userType="helper"
          counterpartyLabel={activeHire.employer_name}
        />
      ) : null}
    </WorkModeShell>
  );
}

function PreviewPill() {
  return (
    <View style={styles.previewPill}>
      <Ionicons name="eye-outline" size={12} color={ORANGE} />
      <Text style={styles.previewPillText}>PREVIEW</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 16, paddingBottom: 32, gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 18, padding: 16 },
  heroIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  title: { color: DARK, fontSize: 20, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  previewPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: ICON_BG },
  previewPillText: { color: ORANGE, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 13, backgroundColor: ICON_BG },
  noticeText: { flex: 1, color: DARK, fontSize: 12, lineHeight: 17 },
  section: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 17, padding: 15 },
  sectionTitle: { color: DARK, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  concernRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: DIVIDER },
  concernIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  concernCopy: { flex: 1, paddingTop: 1 },
  concernTitle: { color: DARK, fontSize: 12.5, fontWeight: '700' },
  concernDescription: { color: MUTED, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: ORANGE, borderRadius: 13, paddingHorizontal: 14 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabledButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#F4F1EE', borderRadius: 13, paddingHorizontal: 12 },
  disabledButtonText: { color: SUBTLE, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  guidance: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 13, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER },
  guidanceText: { flex: 1, color: MUTED, fontSize: 11.5, lineHeight: 17 },
});
