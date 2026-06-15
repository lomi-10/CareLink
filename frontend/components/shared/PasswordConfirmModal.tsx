// components/shared/PasswordConfirmModal.tsx
// Re-verifies the signed-in user's account password before recording a
// contract signature. Re-entering the password is the user's electronic
// signature confirmation under RA 8792 (Electronic Commerce Act).

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { verifyPasswordUrl } from '@/constants/applications';

interface PasswordConfirmModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  /** Called once the password has been verified successfully. */
  onConfirmed: () => void;
  onCancel: () => void;
}

interface VerifyPasswordResponse {
  success?: boolean;
  message?: string;
  locked?: boolean;
  retry_after_seconds?: number;
  attempts_remaining?: number;
}

export function PasswordConfirmModal({
  visible,
  title = 'Confirm your digital signature',
  message = 'Enter your account password to confirm and sign this contract. Re-entering your password serves as your electronic signature under RA 8792 (Electronic Commerce Act).',
  onConfirmed,
  onCancel,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setPassword('');
    setShowPassword(false);
    setError('');
  };

  const handleCancel = () => {
    if (busy) return;
    reset();
    onCancel();
  };

  const handleConfirm = async () => {
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const raw = await AsyncStorage.getItem('user_data');
      if (!raw) {
        setError('Not logged in. Please sign in again.');
        return;
      }
      const user = JSON.parse(raw);
      const res = await fetch(verifyPasswordUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, password }),
      });
      const data: VerifyPasswordResponse = await res.json();

      if (!data.success) {
        if (data.locked) {
          const mins = Math.max(1, Math.ceil((data.retry_after_seconds ?? 300) / 60));
          setError(`Too many incorrect attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
        } else if (typeof data.attempts_remaining === 'number') {
          const left = data.attempts_remaining;
          setError(`${data.message || 'Incorrect password.'} (${left} attempt${left === 1 ? '' : 's'} left)`);
        } else {
          setError(data.message || 'Incorrect password.');
        }
        return;
      }

      reset();
      onConfirmed();
    } catch (e: any) {
      setError(e?.message || 'Could not verify your password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={48} color={theme.color.parent} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError('');
              }}
              placeholder="Password"
              placeholderTextColor={theme.color.subtle}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              onSubmitEditing={() => { void handleConfirm(); }}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.color.subtle} />
            </TouchableOpacity>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, busy && styles.confirmButtonBusy]}
              onPress={() => { void handleConfirm(); }}
              disabled={busy}
              activeOpacity={0.7}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm & Sign</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.color.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.color.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.color.inkMuted,
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.color.ink,
  },
  eyeBtn: {
    padding: 6,
  },
  error: {
    width: '100%',
    marginTop: 10,
    fontSize: 13,
    color: theme.color.danger,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.color.inkMuted,
  },
  confirmButton: {
    backgroundColor: theme.color.parent,
  },
  confirmButtonBusy: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
