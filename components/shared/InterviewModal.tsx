// components/shared/InterviewModal.tsx
// Allows a parent to schedule an interview; helper can confirm/decline.

import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';

export interface InterviewInfo {
  interview_id?: number;
  interview_date?: string;
  interview_type?: 'In-person' | 'Video Call' | 'Phone';
  location_or_link?: string | null;
  status?: string;
  parent_confirmed?: boolean;
  helper_confirmed?: boolean;
  notes?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  applicationId: number;
  helperName: string;
  jobTitle: string;
  scheduledBy: number;           // parent user_id
  existing?: InterviewInfo | null;
  onScheduled?: () => void;
}

const TYPES = [
  { key: 'In-person', icon: 'people-outline' as const,    label: 'In-person' },
  { key: 'Video Call', icon: 'videocam-outline' as const, label: 'Video Call' },
  { key: 'Phone',     icon: 'call-outline' as const,      label: 'Phone' },
];

function formatDate(d: Date) {
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function InterviewModal({ visible, onClose, applicationId, helperName, jobTitle, scheduledBy, existing, onScheduled }: Props) {
  const [date,       setDate]       = useState<Date>(new Date(Date.now() + 86400000));
  const [type,       setType]       = useState<'In-person' | 'Video Call' | 'Phone'>('In-person');
  const [location,   setLocation]   = useState('');
  const [notes,      setNotes]      = useState('');
  const [showDate,   setShowDate]   = useState(false);
  const [showTime,   setShowTime]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const placeholderMap = {
    'In-person': 'e.g. 123 Main St, Ormoc City',
    'Video Call': 'e.g. https://meet.google.com/abc-xyz',
    'Phone':     'e.g. 09XX-XXX-XXXX',
  };

  const handleSchedule = async () => {
    if (type !== 'Phone' && !location.trim()) {
      setError('Please enter a location or meeting link.'); return;
    }
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/interviews/schedule.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id:   applicationId,
          interview_date:   date.toISOString().slice(0, 19).replace('T', ' '),
          interview_type:   type,
          location_or_link: location.trim() || null,
          notes:            notes.trim() || null,
          scheduled_by:     scheduledBy,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to schedule');
      onScheduled?.();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const mergeDateTime = (base: Date, newPart: Date, mode: 'date' | 'time') => {
    const merged = new Date(base);
    if (mode === 'date') {
      merged.setFullYear(newPart.getFullYear(), newPart.getMonth(), newPart.getDate());
    } else {
      merged.setHours(newPart.getHours(), newPart.getMinutes(), 0, 0);
    }
    return merged;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <Ionicons name="calendar-outline" size={22} color={theme.color.parent} />
            <Text style={s.title}>Schedule Interview</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={theme.color.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Context */}
            <View style={s.contextBox}>
              <Text style={s.contextLabel}>Applicant</Text>
              <Text style={s.contextValue}>{helperName}</Text>
              <Text style={s.contextLabel}>For Position</Text>
              <Text style={s.contextValue}>{jobTitle}</Text>
            </View>

            {/* Existing info */}
            {existing?.interview_date && (
              <View style={s.existingBox}>
                <Ionicons name="information-circle-outline" size={16} color={theme.color.warning} />
                <Text style={s.existingTxt}>
                  A previous interview was scheduled on {new Date(existing.interview_date).toLocaleString()}.
                  Scheduling a new one will replace it.
                </Text>
              </View>
            )}

            {/* Interview type */}
            <Text style={s.sectionLabel}>Interview Type</Text>
            <View style={s.typeRow}>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.typeBtn, type === t.key && s.typeBtnActive]}
                  onPress={() => setType(t.key as any)}
                >
                  <Ionicons name={t.icon} size={18} color={type === t.key ? '#fff' : theme.color.muted} />
                  <Text style={[s.typeLabel, type === t.key && s.typeLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date & time */}
            <Text style={s.sectionLabel}>Date & Time</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[s.dateBtn, { flex: 1 }]} onPress={() => setShowDate(true)}>
                <Ionicons name="calendar-outline" size={16} color={theme.color.parent} />
                <Text style={s.dateBtnTxt}>{date.toLocaleDateString([], { dateStyle: 'medium' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dateBtn, { flex: 1 }]} onPress={() => setShowTime(true)}>
                <Ionicons name="time-outline" size={16} color={theme.color.parent} />
                <Text style={s.dateBtnTxt}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
            </View>
            {showDate && (
              <DateTimePicker
                value={date}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => { setShowDate(false); if (d) setDate(mergeDateTime(date, d, 'date')); }}
              />
            )}
            {showTime && (
              <DateTimePicker
                value={date}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => { setShowTime(false); if (d) setDate(mergeDateTime(date, d, 'time')); }}
              />
            )}

            {/* Location / link */}
            <Text style={s.sectionLabel}>{type === 'In-person' ? 'Location' : type === 'Video Call' ? 'Meeting Link' : 'Phone Number'}</Text>
            <TextInput
              style={s.textInput}
              value={location}
              onChangeText={setLocation}
              placeholder={placeholderMap[type]}
              placeholderTextColor={theme.color.subtle}
            />

            {/* Notes */}
            <Text style={s.sectionLabel}>Notes <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={[s.textInput, s.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional information for the applicant…"
              placeholderTextColor={theme.color.subtle}
              multiline
              numberOfLines={3}
            />

            {error ? <Text style={s.errorTxt}>{error}</Text> : null}
          </ScrollView>

          <TouchableOpacity style={[s.scheduleBtn, loading && s.scheduleBtnDisabled]} onPress={handleSchedule} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={s.scheduleBtnTxt}>Send Interview Invite</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: theme.color.overlay, justifyContent: 'flex-end' },
  card:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  header:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title:      { flex: 1, fontSize: 17, fontWeight: '700', color: theme.color.ink, marginLeft: 8 },
  closeBtn:   { padding: 4 },
  contextBox: { backgroundColor: theme.color.parentSoft, borderRadius: 10, padding: 12, marginBottom: 14 },
  contextLabel: { fontSize: 11, color: theme.color.muted, fontWeight: '600', textTransform: 'uppercase', marginTop: 4 },
  contextValue: { fontSize: 14, fontWeight: '600', color: theme.color.ink },
  existingBox:{ flexDirection: 'row', backgroundColor: theme.color.warningSoft, borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'flex-start', gap: 6 },
  existingTxt:{ fontSize: 12, color: theme.color.warning, flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: theme.color.ink, marginTop: 14, marginBottom: 6 },
  typeRow:    { flexDirection: 'row', gap: 8 },
  typeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: theme.color.line, borderRadius: 10, paddingVertical: 10 },
  typeBtnActive: { backgroundColor: theme.color.parent, borderColor: theme.color.parent },
  typeLabel:  { fontSize: 13, color: theme.color.muted, fontWeight: '500' },
  typeLabelActive: { color: '#fff' },
  dateBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: theme.color.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dateBtnTxt: { flex: 1, fontSize: 14, color: theme.color.ink },
  textInput:  { borderWidth: 1.5, borderColor: theme.color.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: theme.color.ink, backgroundColor: theme.color.surface, marginBottom: 2 },
  textArea:   { minHeight: 72, textAlignVertical: 'top' },
  optional:   { color: theme.color.muted, fontWeight: '400' },
  errorTxt:   { color: theme.color.danger, fontSize: 13, marginTop: 8 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.color.parent, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  scheduleBtnDisabled: { opacity: 0.6 },
  scheduleBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
