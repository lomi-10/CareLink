// components/shared/InterviewModal.tsx
// Allows a parent to schedule an interview; helper can confirm/decline.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';
import { NotificationModal } from './NotificationModal';
import { BottomSheetModal } from './BottomSheetModal';

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

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

const webDateTimeInputStyle: Record<string, string | number> = {
  padding: '12px',
  border: '1px solid #E5E5EA',
  borderRadius: '10px',
  backgroundColor: '#F8F9FA',
  color: '#1A1C1E',
  fontSize: '15px',
  flex: 1,
  minWidth: 120,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

export function InterviewModal({ visible, onClose, applicationId, helperName, jobTitle, scheduledBy, existing, onScheduled }: Props) {
  const [date,       setDate]       = useState<Date>(new Date(Date.now() + 86400000));
  const [type,       setType]       = useState<'In-person' | 'Video Call' | 'Phone'>('In-person');
  const [location,   setLocation]   = useState('');
  const [notes,      setNotes]      = useState('');
  const [showDateTime, setShowDateTime] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [errorField, setErrorField] = useState<null | 'date' | 'location'>(null);
  const [alert,      setAlert]      = useState('');

  const placeholderMap = {
    'In-person': 'e.g. 123 Main St, Ormoc City',
    'Video Call': 'e.g. https://meet.google.com/abc-xyz',
    'Phone':     'e.g. 09XX-XXX-XXXX',
  };

  /**
   * Surfaces a validation problem two ways on purpose.
   *
   * The message alone was a line of small red text below a long form, directly
   * under the button the user had just pressed — so their eye was nowhere near
   * it and the tap read as "nothing happened". The modal makes the failure
   * impossible to miss; the field highlight is what tells them WHERE to fix it,
   * which a modal on its own cannot do.
   */
  const fail = (message: string, field?: 'date' | 'location') => {
    setError(message);
    setErrorField(field ?? null);
    setAlert(message);
  };

  const handleSchedule = async () => {
    if (date.getTime() <= Date.now()) {
      fail('Please choose a date and time in the future.', 'date');
      return;
    }
    if (type === 'Phone' && !location.trim()) {
      fail('Please enter a phone number.', 'location'); return;
    }
    if (type !== 'Phone' && !location.trim()) {
      fail('Please enter a location or meeting link.', 'location'); return;
    }
    setError('');
    setErrorField(null);
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
      // A server-side failure is exceptional, not a field problem — surface it
      // the same loud way so a failed submit is never mistaken for a dead tap.
      fail(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const minWebDate = new Date().toISOString().split('T')[0];
  const webDateValue = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const webTimeValue = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  const renderWebDateTime = () => (
    <View style={s.webDateTimeRow}>
      {React.createElement('input', {
        type: 'date',
        value: webDateValue,
        min: minWebDate,
        onChange: (e: { target: { value: string } }) => {
          const selectedStr = e.target.value;
          if (!selectedStr) return;
          const [y, m, d] = selectedStr.split('-').map(Number);
          const next = new Date(date);
          next.setFullYear(y, m - 1, d);
          setDate(next);
        },
        style: webDateTimeInputStyle,
      })}
      {React.createElement('input', {
        type: 'time',
        value: webTimeValue,
        onChange: (e: { target: { value: string } }) => {
          const v = e.target.value;
          if (!v) return;
          const [hh, mm] = v.split(':').map(Number);
          const next = new Date(date);
          next.setHours(hh, mm, 0, 0);
          setDate(next);
        },
        style: webDateTimeInputStyle,
      })}
    </View>
  );

  return (
    // Bottom sheet on mobile (edge-to-edge, rounded top, thumb-reachable
    // action), centred card on web — see BottomSheetModal for the reasoning.
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Schedule Interview"
      subtitle={jobTitle ? `${helperName} · ${jobTitle}` : helperName}
      footer={
        <TouchableOpacity style={[s.scheduleBtn, loading && s.scheduleBtnDisabled]} onPress={handleSchedule} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={s.scheduleBtnTxt}>Send Interview Invite</Text></>
          }
        </TouchableOpacity>
      }
    >
      <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* The applicant and position now live in the sheet header, so the
                old context box here would state the same two facts twice in a
                small surface — costing the vertical space the form needs. */}

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

            {/* Date & time: native = datetime picker; web = browser date + time inputs (same idea as job post WorkScheduleCard) */}
            <Text style={s.sectionLabel}>Date & Time</Text>
            {Platform.OS === 'web' ? (
              <>
                {renderWebDateTime()}
                <Text style={s.datePreview}>{formatDate(date)}</Text>
              </>
            ) : (
              <>
                <TouchableOpacity style={s.dateBtnFull} onPress={() => setShowDateTime(true)} activeOpacity={0.85}>
                  <Ionicons name="calendar-outline" size={18} color={theme.color.parent} />
                  <Text style={s.dateBtnTxtFull}>{formatDate(date)}</Text>
                  <Ionicons name="chevron-down" size={18} color={theme.color.muted} />
                </TouchableOpacity>
                {showDateTime && (
                  <DateTimePicker
                    value={date}
                    mode="datetime"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(_, selected) => {
                      setShowDateTime(false);
                      if (selected) setDate(selected);
                    }}
                  />
                )}
              </>
            )}

            {/* Location / link */}
            <Text style={s.sectionLabel}>{type === 'In-person' ? 'Location' : type === 'Video Call' ? 'Meeting Link' : 'Phone Number'}</Text>
            <TextInput
              style={[s.textInput, errorField === 'location' && s.inputError]}
              value={location}
              onChangeText={(v) => { setLocation(v); if (errorField === 'location') { setErrorField(null); setError(''); } }}
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

          {/* Not auto-dismissing: the user has to acknowledge it, which is the
              whole point — the quiet inline line is what they were missing. */}
          <NotificationModal
            visible={!!alert}
            title="Can't send this invite yet"
            message={alert}
            type="warning"
            autoClose={false}
            onClose={() => setAlert('')}
          />
      </>
    </BottomSheetModal>
  );
}

// The overlay / card / header / close styles that used to live here are gone:
// BottomSheetModal owns the shell now, and the context box was removed because
// the sheet header already names the applicant and the position.
const s = StyleSheet.create({
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
  dateBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: theme.color.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: theme.color.surface,
  },
  dateBtnTxtFull: { flex: 1, fontSize: 15, color: theme.color.ink, fontWeight: '600' },
  webDateTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'stretch',
  },
  datePreview: {
    fontSize: 13,
    color: theme.color.muted,
    marginTop: 8,
  },
  textInput:  { borderWidth: 1.5, borderColor: theme.color.line, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: theme.color.ink, backgroundColor: theme.color.surface, marginBottom: 2 },
  textArea:   { minHeight: 72, textAlignVertical: 'top' },
  optional:   { color: theme.color.muted, fontWeight: '400' },
  errorTxt:   { color: theme.color.danger, fontSize: 13, marginTop: 8 },
  /** Marks the field the message is about, so dismissing the alert leaves the
   *  user looking at exactly what needs fixing. */
  inputError: { borderColor: theme.color.danger, borderWidth: 1.5 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.color.parent, borderRadius: 12, paddingVertical: 14, marginTop: 16 },
  scheduleBtnDisabled: { opacity: 0.6 },
  scheduleBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
