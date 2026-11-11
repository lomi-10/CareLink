import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { fetchComplaintTracking, type ComplaintCase } from '@/lib/complaintsApi';

type Props = {
  visible: boolean;
  onClose: () => void;
  userType: 'parent' | 'helper';
};

const ACCENT: Record<Props['userType'], string> = {
  parent: '#8B5A2B',
  helper: '#E8641A',
};

export function ComplaintTrackingModal({ visible, onClose, userType }: Props) {
  const [cases, setCases] = useState<ComplaintCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const raw = await AsyncStorage.getItem('user_data');
        const userId = raw ? Number((JSON.parse(raw) as { user_id?: string | number }).user_id) : 0;
        if (!userId) throw new Error('Your session expired. Please sign in again to view your reports.');

        const result = await fetchComplaintTracking(userId);
        if (!result.success) throw new Error(result.message || 'Could not load your complaint records.');
        if (!cancelled) setCases(result.cases ?? []);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load your complaint records. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [visible, reloadKey]);

  const accent = ACCENT[userType];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.titleIcon, { backgroundColor: `${accent}18` }]}>
                <Ionicons name="document-text-outline" size={19} color={accent} />
              </View>
              <Text style={styles.title}>Track my complaints</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close complaint tracking">
              <Ionicons name="close" size={25} color={theme.color.ink} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            You can track reports you filed and cases filed about you. The other party does not see the reporter’s identity or full report description.
          </Text>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={accent} />
                <Text style={styles.muted}>Loading your case records…</Text>
              </View>
            ) : error ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={20} color={theme.color.danger} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryButton, { borderColor: accent }]}
                  onPress={() => setReloadKey((key) => key + 1)}
                >
                  <Text style={[styles.retryText, { color: accent }]}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : cases.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="file-tray-outline" size={30} color={accent} />
                <Text style={styles.emptyTitle}>No complaint records yet</Text>
                <Text style={styles.muted}>Reports you submit or cases involving you will appear here.</Text>
              </View>
            ) : (
              cases.map((item) => <ComplaintCaseCard key={item.complaint_id} item={item} />)
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ComplaintCaseCard({ item }: { item: ComplaintCase }) {
  const statusColor = item.status === 'Resolved' ? '#16803C'
    : item.status === 'Dismissed' ? '#667085'
      : item.status === 'Escalated_PESO' ? '#175CD3' : '#B54708';

  return (
    <View style={styles.caseCard}>
      <View style={styles.caseTop}>
        <Text style={styles.reference}>{item.reference}</Text>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}16` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{formatStatus(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.subject}>{item.subject}</Text>
      <Text style={styles.meta}>{formatStatus(item.category)} · {item.your_role === 'complainant' ? 'Filed by you' : 'About you'}</Text>
      <Text style={styles.meta}>Filed {formatDate(item.created_at, true)}</Text>
      {item.incident_at ? <Text style={styles.meta}>Incident: {formatDate(item.incident_at, true)}</Text> : null}
      {item.incident_address ? <Text style={styles.meta}>Location: {item.incident_address}</Text> : null}
      {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

      <View style={styles.timeline}>
        <Text style={styles.timelineHeading}>Updates</Text>
        {item.timeline.length ? item.timeline.map((entry) => (
          <View key={entry.action_id} style={styles.timelineEntry}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineCopy}>
              <View style={styles.timelineTitleRow}>
                <Text style={styles.timelineTitle}>{entry.title}</Text>
                <Text style={styles.timelineDate}>{formatDate(entry.created_at, true)}</Text>
              </View>
              {entry.detail ? <Text style={styles.timelineDetail}>{entry.detail}</Text> : null}
              <Text style={styles.timelineActor}>{entry.actor_name}</Text>
            </View>
          </View>
        )) : <Text style={styles.muted}>No updates have been recorded yet.</Text>}
      </View>
    </View>
  );
}

function formatStatus(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatDate(value: string, includeTime = false): string {
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  const dateLabel = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  if (!includeTime || (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0)) return dateLabel;
  return `${dateLabel}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.overlay },
  sheet: {
    backgroundColor: theme.color.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '900', color: theme.color.ink },
  hint: { fontSize: 12.5, color: theme.color.muted, lineHeight: 18, paddingHorizontal: 20, marginBottom: 8 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, gap: 12 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 36 },
  muted: { color: theme.color.muted, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  empty: { alignItems: 'center', gap: 10, padding: 28, borderRadius: 16, backgroundColor: theme.color.surface },
  emptyTitle: { color: theme.color.ink, fontSize: 15, fontWeight: '800' },
  errorCard: { alignItems: 'center', gap: 10, padding: 20, borderRadius: 16, backgroundColor: '#FEF3F2' },
  errorText: { color: theme.color.danger, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  retryButton: { borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  retryText: { fontSize: 13, fontWeight: '700' },
  caseCard: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.line, borderRadius: 16, padding: 14 },
  caseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reference: { color: theme.color.subtle, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 10.5, fontWeight: '800', textTransform: 'capitalize' },
  subject: { color: theme.color.ink, fontSize: 15, fontWeight: '800', marginTop: 8 },
  meta: { color: theme.color.muted, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  description: { color: theme.color.inkMuted, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  timeline: { marginTop: 13, borderTopWidth: 1, borderTopColor: theme.color.line, paddingTop: 11 },
  timelineHeading: { color: theme.color.ink, fontSize: 12.5, fontWeight: '800', marginBottom: 8 },
  timelineEntry: { flexDirection: 'row', gap: 9, paddingBottom: 12 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.parent, marginTop: 4 },
  timelineCopy: { flex: 1, minWidth: 0 },
  timelineTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  timelineTitle: { flex: 1, color: theme.color.ink, fontSize: 12, fontWeight: '700' },
  timelineDate: { color: theme.color.subtle, fontSize: 10, textAlign: 'right' },
  timelineDetail: { color: theme.color.muted, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  timelineActor: { color: theme.color.subtle, fontSize: 10.5, marginTop: 3 },
});
