import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubmitComplaintModal } from '@/components/shared';
import { ParentWorkModeShell } from '@/components/parent/work/ParentWorkModeShell';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import { BROWN, DARK, DIVIDER, ICON_BG, MUTED, SUBTLE, SURFACE } from '@/components/parent/home/parentWarmTheme';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';

const TOPICS = [
  ['cash-outline', 'Wages or payment', 'Report a recorded payment concern or unpaid wages.'],
  ['document-text-outline', 'Contract or duties', 'Ask for help with agreed terms, duties, or a contract concern.'],
  ['shield-outline', 'Safety or treatment', 'Report unsafe conditions, mistreatment, or other conduct.'],
] as const;

export default function ParentAssistanceScreen() {
  const { placements, loading, error } = useParentActivePlacements();
  const [selected, setSelected] = useState<ActivePlacement | null>(null);

  return (
    <ParentWorkModeShell active="assistance" title="Assistance" subtitle="Report a concern or request support">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color={BROWN} />
          <Text style={styles.noticeText}>Reports are reviewed by the CareLink system administrator first. Serious cases may be referred to PESO, but mediation or a particular outcome is not guaranteed.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Topics you can raise</Text>
          {TOPICS.map(([icon, title, description]) => (
            <View key={title} style={styles.topic}>
              <View style={styles.topicIcon}><Ionicons name={icon} size={18} color={BROWN} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topicTitle}>{title}</Text>
                <Text style={styles.topicText}>{description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Choose a placement</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? null : placements.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="help-buoy-outline" size={26} color={BROWN} />
            <Text style={styles.emptyTitle}>Assistance preview</Text>
            <Text style={styles.emptyText}>After a placement starts, you can submit a report linked to that helper and employment record.</Text>
          </View>
        ) : placements.map((placement) => (
          <TouchableOpacity
            key={placement.application_id}
            style={styles.placement}
            onPress={() => setSelected(placement)}
            activeOpacity={0.8}
          >
            <View style={styles.placementIcon}><Ionicons name="person-outline" size={19} color={BROWN} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placementName}>{placement.helper_name}</Text>
              <Text style={styles.placementRole}>{placement.job_title}</Text>
            </View>
            <Text style={styles.reportLink}>Report</Text>
            <Ionicons name="chevron-forward" size={16} color={SUBTLE} />
          </TouchableOpacity>
        ))}

        <View style={styles.guidance}>
          <Ionicons name="shield-checkmark-outline" size={18} color={BROWN} />
          <Text style={styles.guidanceText}>Include what happened, when it happened, and relevant details. Do not share passwords or unrelated sensitive information.</Text>
        </View>
      </ScrollView>

      {selected ? (
        <SubmitComplaintModal
          visible
          onClose={() => setSelected(null)}
          applicationId={Number(selected.application_id)}
          userType="parent"
          counterpartyLabel={selected.helper_name}
        />
      ) : null}
    </ParentWorkModeShell>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 36, gap: 12 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: ICON_BG, borderRadius: 13, padding: 12 },
  noticeText: { flex: 1, color: DARK, fontSize: 12, lineHeight: 17 },
  card: { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 14 },
  sectionTitle: { color: DARK, fontSize: 15, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  topic: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: DIVIDER },
  topicIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  topicTitle: { color: DARK, fontSize: 12.5, fontWeight: '700' },
  topicText: { color: MUTED, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  placement: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  placementIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  placementName: { color: DARK, fontSize: 13, fontWeight: '700' },
  placementRole: { color: MUTED, fontSize: 11.5, marginTop: 2 },
  reportLink: { color: BROWN, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 16, padding: 24 },
  emptyTitle: { color: DARK, fontSize: 15, fontWeight: '700' },
  emptyText: { color: MUTED, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  guidance: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 13, padding: 12 },
  guidanceText: { flex: 1, color: MUTED, fontSize: 11.5, lineHeight: 17 },
  error: { color: '#B42318', backgroundColor: '#FEE4E2', borderRadius: 10, padding: 10, fontSize: 12 },
});
