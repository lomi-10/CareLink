// components/shared/VerifyChangeModal.tsx
// Reusable 2-step verified change of email OR contact number. Works on web + mobile.
//   1. Enter the new value  → server emails a 6-digit code
//   2. Enter the code       → server applies it, onSuccess(newValue)
// Pass `accent` for the role theme (helper orange / parent gold).

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requestFieldChange, confirmFieldChange, type ChangeField } from '@/lib/profileChange';

const DARK = '#2A1608', MUTED = '#7A5C3E', LINE = '#EFE0CB', RED = '#DC2626';

interface Props {
  visible: boolean;
  field: ChangeField;
  userId: string | number;
  currentValue?: string;
  accent?: string;
  onClose: () => void;
  onSuccess: (newValue: string) => void;
}

const LABEL: Record<ChangeField, { title: string; noun: string; placeholder: string }> = {
  email:   { title: 'Change email',          noun: 'email address',  placeholder: 'you@example.com' },
  contact: { title: 'Change contact number', noun: 'contact number', placeholder: '0917 123 4567' },
};

export function VerifyChangeModal({ visible, field, userId, currentValue, accent = '#E86019', onClose, onSuccess }: Props) {
  const meta = LABEL[field];
  const [step, setStep] = useState<'input' | 'code'>('input');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Reset whenever it (re)opens.
  useEffect(() => {
    if (visible) { setStep('input'); setValue(''); setCode(''); setSentTo(''); setError(''); setBusy(false); }
  }, [visible, field]);

  const sendCode = async () => {
    setError('');
    const v = value.trim();
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setError('Please enter a valid email address.'); return; }
    if (field === 'contact' && v.replace(/\D/g, '').length < 7) { setError('Please enter a valid contact number.'); return; }
    setBusy(true);
    const res = await requestFieldChange(userId, field, v);
    setBusy(false);
    if (res.success) { setSentTo(res.sent_to || ''); setStep('code'); }
    else setError(res.message || 'Could not send the code.');
  };

  const confirm = async () => {
    setError('');
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from the email.'); return; }
    setBusy(true);
    const res = await confirmFieldChange(userId, field, code.trim());
    setBusy(false);
    if (res.success) onSuccess(res.value || value.trim());
    else setError(res.message || 'That code was not accepted.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.center}>
          <Pressable style={s.card} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={s.head}>
              <View style={[s.icon, { backgroundColor: accent + '1A' }]}>
                <Ionicons name={field === 'email' ? 'mail-outline' : 'call-outline'} size={20} color={accent} />
              </View>
              <Text style={s.title}>{meta.title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10} style={s.close}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            </View>

            {step === 'input' ? (
              <>
                {!!currentValue && (
                  <Text style={s.current}>Current: <Text style={s.currentVal}>{currentValue}</Text></Text>
                )}
                <Text style={s.label}>New {meta.noun}</Text>
                <TextInput
                  style={s.input}
                  value={value}
                  onChangeText={setValue}
                  placeholder={meta.placeholder}
                  placeholderTextColor="#B8956A"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={field === 'email' ? 'email-address' : 'phone-pad'}
                  autoFocus
                />
                <Text style={s.hint}>
                  {field === 'email'
                    ? "We'll email a 6-digit code to the new address to confirm it's yours."
                    : "We'll email a 6-digit code to your account email to confirm this change."}
                </Text>
                {!!error && <Text style={s.error}>{error}</Text>}
                <TouchableOpacity style={[s.btn, { backgroundColor: accent }, busy && s.btnBusy]} onPress={sendCode} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.hint}>Enter the 6-digit code we sent to {sentTo ? <Text style={s.currentVal}>{sentTo}</Text> : 'your email'}.</Text>
                <TextInput
                  style={[s.input, s.codeInput]}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  placeholderTextColor="#CBB89B"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {!!error && <Text style={s.error}>{error}</Text>}
                <TouchableOpacity style={[s.btn, { backgroundColor: accent }, busy && s.btnBusy]} onPress={confirm} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Confirm change</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setStep('input'); setCode(''); setError(''); }} disabled={busy} style={s.backLink}>
                  <Text style={[s.backText, { color: accent }]}>Use a different {meta.noun}</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,15,5,0.55)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#FFFDF9', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: LINE },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'Fredoka-SemiBold', fontSize: 17, color: DARK },
  close: { padding: 2 },
  current: { fontFamily: 'Fredoka-Regular', fontSize: 12.5, color: MUTED, marginBottom: 10 },
  currentVal: { fontFamily: 'Fredoka-SemiBold', color: DARK },
  label: { fontFamily: 'Fredoka-SemiBold', fontSize: 13, color: DARK, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.4, borderColor: LINE, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Fredoka-Regular', fontSize: 15, color: DARK },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 24, fontFamily: 'Fredoka-SemiBold', marginTop: 8 },
  hint: { fontFamily: 'Fredoka-Regular', fontSize: 12.5, color: MUTED, lineHeight: 18, marginTop: 10 },
  error: { fontFamily: 'Fredoka-Medium', fontSize: 12.5, color: RED, marginTop: 10 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  btnBusy: { opacity: 0.7 },
  btnText: { fontFamily: 'Fredoka-SemiBold', fontSize: 15, color: '#fff' },
  backLink: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  backText: { fontFamily: 'Fredoka-SemiBold', fontSize: 13.5 },
});
