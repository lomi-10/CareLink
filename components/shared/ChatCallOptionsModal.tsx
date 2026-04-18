// components/shared/ChatCallOptionsModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@/constants/theme';
import API_URL from '@/constants/api';

/** Step 1: choose action. Step 2: confirm instant video (posts link + opens Jitsi). */
export function ChatCallOptionsModal({
  visible,
  onClose,
  accent,
  partnerName,
  onScheduleInterview,
  onConfirmStartVideo,
}: {
  visible: boolean;
  onClose: () => void;
  accent: string;
  partnerName: string;
  onScheduleInterview: () => void;
  onConfirmStartVideo: () => void | Promise<void>;
}) {
  const [step, setStep] = useState<0 | 1>(0);

  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.box}>
          {step === 0 ? (
            <>
              <Text style={s.title}>Interview &amp; video</Text>
              <Text style={s.sub}>Chat with {partnerName}</Text>

              <TouchableOpacity
                style={[s.primary, { borderColor: accent }]}
                onPress={() => { onScheduleInterview(); onClose(); }}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={22} color={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.primaryTitle, { color: accent }]}>Schedule interview</Text>
                  <Text style={s.primarySub}>Pick a date/time so both of you get notified and can prepare.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.secondary}
                onPress={() => setStep(1)}
                activeOpacity={0.85}
              >
                <Ionicons name="videocam-outline" size={22} color={theme.color.ink} />
                <View style={{ flex: 1 }}>
                  <Text style={s.secondaryTitle}>Start video call now</Text>
                  <Text style={s.secondarySub}>Posts a meeting link in chat and opens the room.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.title}>Start video call?</Text>
              <Text style={s.sub}>
                A Jitsi meeting link will be sent in this chat and the call will open in your browser.
                {Platform.OS !== 'web' ? ' On mobile, your browser will open.' : ''}
              </Text>
              <TouchableOpacity
                style={[s.goBtn, { backgroundColor: accent }]}
                onPress={async () => { await onConfirmStartVideo(); onClose(); }}
              >
                <Ionicons name="videocam" size={20} color="#fff" />
                <Text style={s.goBtnTxt}>Join meeting now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.backBtn} onPress={() => setStep(0)}>
                <Text style={{ color: theme.color.muted, fontWeight: '600' }}>Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Helper proposes a time — notifies parent + chat message */
export function HelperInterviewRequestModal({
  visible,
  onClose,
  accent,
  partnerName,
  jobPostId,
  helperId,
  parentId,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  accent: string;
  partnerName: string;
  jobPostId: number | null;
  helperId: number;
  parentId: number;
  onDone?: () => void;
}) {
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000));
  const [showPicker, setShowPicker] = useState(false);
  const [proposedStr, setProposedStr] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (visible) {
      setErr('');
      setNotes('');
      const d = new Date(Date.now() + 86400000);
      setDate(d);
      setProposedStr(d.toISOString().slice(0, 16).replace('T', ' '));
    }
  }, [visible]);

  const submit = async () => {
    setErr('');
    setLoading(true);
    try {
      const proposed = Platform.OS === 'web'
        ? proposedStr.trim()
        : date.toISOString().slice(0, 19).replace('T', ' ');
      if (!proposed) {
        setErr('Please set a proposed date and time.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_URL}/interviews/request_from_chat.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          helper_id: helperId,
          parent_id: parentId,
          job_post_id: jobPostId ?? 0,
          proposed_datetime: proposed,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed');
      onDone?.();
      onClose();
    } catch (e: any) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title}>Propose interview time</Text>
          <Text style={s.sub}>We&apos;ll notify {partnerName} and add a message to this chat.</Text>

          {Platform.OS === 'web' ? (
            <TextInput
              style={s.notes}
              value={proposedStr}
              onChangeText={setProposedStr}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={theme.color.subtle}
            />
          ) : (
            <>
              <TouchableOpacity style={s.dateBtn} onPress={() => setShowPicker(true)}>
                <Ionicons name="time-outline" size={20} color={accent} />
                <Text style={s.dateTxt}>{date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_ev, d) => {
                    if (Platform.OS === 'android') setShowPicker(false);
                    if (d) setDate(d);
                  }}
                />
              )}
            </>
          )}

          <TextInput
            style={s.notes}
            placeholder="Optional note (e.g. preferred platform)"
            placeholderTextColor={theme.color.subtle}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          {!!err && <Text style={s.err}>{err}</Text>}

          <TouchableOpacity
            style={[s.goBtn, { backgroundColor: accent, opacity: loading ? 0.7 : 1 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.goBtnTxt}>Send request</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  title: { fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 4 },
  sub: { fontSize: 13, color: theme.color.muted, marginBottom: 16, lineHeight: 18 },
  primary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  primaryTitle: { fontSize: 15, fontWeight: '700' },
  primarySub: { fontSize: 12, color: theme.color.muted, marginTop: 4, lineHeight: 16 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
    marginBottom: 12,
  },
  secondaryTitle: { fontSize: 15, fontWeight: '700', color: theme.color.ink },
  secondarySub: { fontSize: 12, color: theme.color.muted, marginTop: 4, lineHeight: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: theme.color.muted },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  goBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: theme.color.surface,
    borderRadius: 10,
    marginBottom: 10,
  },
  dateTxt: { fontSize: 14, color: theme.color.ink, fontWeight: '600' },
  notes: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 10,
    padding: 12,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  err: { color: theme.color.danger, fontSize: 12, marginBottom: 8 },
});
