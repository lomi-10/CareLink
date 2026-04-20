import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { ymdLocal } from '@/lib/helperWorkApi';
import {
  type TerminationReasonCode,
  TERMINATION_REASON_OPTIONS,
  computePreviewLastWorkingDay,
  postTerminationInitiate,
} from '@/lib/terminationApi';

function formatLongDate(ymd: string): string {
  try {
    const d = new Date(ymd.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1-$2-$3T12:00:00'));
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return ymd;
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
  applicationId: number;
  userId: number;
  userType: 'parent' | 'helper';
  counterpartyName: string;
  onSuccess: () => void;
};

export function EndEmploymentModal({
  visible,
  onClose,
  applicationId,
  userId,
  userType,
  counterpartyName,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<0 | 1>(0);
  const [reason, setReason] = useState<TerminationReasonCode>('other');
  const [note, setNote] = useState('');
  const [isMutual, setIsMutual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const todayYmd = useMemo(() => ymdLocal(), []);
  const previewLast = useMemo(
    () => computePreviewLastWorkingDay(isMutual, todayYmd),
    [isMutual, todayYmd],
  );

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setReason('other');
    setNote('');
    setIsMutual(false);
    setBusy(false);
    setErr(null);
  }, [visible]);

  useEffect(() => {
    if (isMutual) {
      setReason('mutual_agreement');
    }
  }, [isMutual]);

  const onConfirmFinal = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await postTerminationInitiate({
        application_id: applicationId,
        user_id: userId,
        user_type: userType,
        reason,
        note: note.trim() || undefined,
        is_mutual_agreement: isMutual,
      });
      if (!res.success) {
        setErr(res.message || 'Could not start termination.');
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setErr('Network error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.title}>End employment</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color={theme.color.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            {step === 0 ? (
              <>
                <Text style={styles.lead}>
                  You are about to end your employment with {counterpartyName || 'your counterpart'}.
                </Text>

                <Text style={styles.lbl}>Reason (required)</Text>
                <View style={styles.pickerWrap}>
                  <Picker<string>
                    enabled={!isMutual}
                    selectedValue={reason}
                    onValueChange={(v) => setReason(v as TerminationReasonCode)}
                    style={styles.picker}
                    itemStyle={Platform.OS === 'ios' ? { height: 160 } : undefined}
                  >
                    {TERMINATION_REASON_OPTIONS.map((o) => (
                      <Picker.Item key={o.value} label={o.label} value={o.value} />
                    ))}
                  </Picker>
                </View>

                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.lbl}>Mutual agreement</Text>
                    <Text style={styles.hint}>When on, notice period is skipped and last day is today.</Text>
                  </View>
                  <Switch value={isMutual} onValueChange={setIsMutual} />
                </View>

                <Text style={styles.lbl}>Note (optional)</Text>
                <TextInput
                  style={styles.note}
                  multiline
                  maxLength={2000}
                  placeholder="Optional explanation…"
                  value={note}
                  onChangeText={setNote}
                />

                <Text style={styles.lastDayLabel}>Last working day will be:</Text>
                <Text style={styles.lastDayValue}>{formatLongDate(previewLast)}</Text>

                {err ? <Text style={styles.err}>{err}</Text> : null}

                <TouchableOpacity style={styles.primary} onPress={() => setStep(1)} activeOpacity={0.9}>
                  <Text style={styles.primaryTxt}>Continue</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.warnTitle}>Please confirm</Text>
                <Text style={styles.warnBody}>
                  The other party will be notified. PESO staff will receive a record of this termination. You
                  cannot undo this step from the app.
                </Text>
                <Text style={styles.recap}>
                  Last working day: <Text style={styles.recapEm}>{formatLongDate(previewLast)}</Text>
                </Text>
                {err ? <Text style={styles.err}>{err}</Text> : null}
                <TouchableOpacity
                  style={[styles.primary, busy && { opacity: 0.6 }]}
                  onPress={() => void onConfirmFinal()}
                  disabled={busy}
                  activeOpacity={0.9}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryTxt}>Confirm and end employment</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={() => setStep(0)} disabled={busy}>
                  <Text style={styles.secondaryTxt}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    ...Platform.select({
      web: { justifyContent: 'center', padding: 20 },
      default: { justifyContent: 'flex-end' },
    }),
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: theme.color.surfaceElevated,
    maxHeight: '92%',
    paddingBottom: 24,
    ...theme.shadow.card,
    ...Platform.select({
      web: { borderRadius: 20 },
      default: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    }),
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  title: { fontSize: 18, fontWeight: '800', color: theme.color.ink },
  scroll: { padding: 20, paddingBottom: 32 },
  lead: { fontSize: 16, color: theme.color.ink, lineHeight: 24, marginBottom: 16, fontWeight: '600' },
  lbl: { fontSize: 13, fontWeight: '700', color: theme.color.muted, marginBottom: 6 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: theme.color.surface,
  },
  picker: Platform.OS === 'ios' ? { height: 160 } : { height: 52 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  hint: { fontSize: 12, color: theme.color.muted, marginTop: 2 },
  note: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 12,
    fontSize: 15,
    color: theme.color.ink,
    backgroundColor: theme.color.surface,
  },
  lastDayLabel: { fontSize: 14, fontWeight: '700', color: theme.color.ink, marginTop: 4 },
  lastDayValue: { fontSize: 18, fontWeight: '800', color: theme.color.info, marginBottom: 16 },
  err: { color: theme.color.danger, marginBottom: 12, fontWeight: '600' },
  primary: {
    backgroundColor: theme.color.danger,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  warnTitle: { fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 10 },
  warnBody: { fontSize: 15, color: theme.color.ink, lineHeight: 22, marginBottom: 12 },
  recap: { fontSize: 15, color: theme.color.muted, marginBottom: 18 },
  recapEm: { fontWeight: '800', color: theme.color.ink },
  secondary: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  secondaryTxt: { fontSize: 15, fontWeight: '700', color: theme.color.info },
});
