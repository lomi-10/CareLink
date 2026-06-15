// components/shared/TimeField.tsx
// Reusable HH:MM (24h) time picker — native browser time input on web,
// @react-native-community/datetimepicker on iOS/Android, 30-minute steps.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@/constants/theme';
import { formatTime12h } from '@/components/parent/hire/hireFlowWorkHours';

function parseHHMM(value: string): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  const now = new Date();
  if (m) {
    now.setHours(Number(m[1]), Number(m[2]), 0, 0);
  } else {
    now.setHours(8, 0, 0, 0);
  }
  return now;
}

function toHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

interface TimeFieldProps {
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TimeField({ value, onChange, placeholder = 'Select time', disabled }: TimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'time',
      step: 1800,
      value: /^\d{1,2}:\d{2}$/.test(value) ? value : '',
      disabled,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value || ''),
      style: webInputStyle(disabled),
    });
  }

  const label = /^\d{1,2}:\d{2}$/.test(value) ? formatTime12h(value) : placeholder;

  return (
    <>
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={() => !disabled && setShowPicker(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>{label}</Text>
        <Ionicons name="time-outline" size={20} color={disabled ? theme.color.subtle : theme.color.parent} />
      </TouchableOpacity>

      {showPicker && (
        <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : undefined}>
          {Platform.OS === 'ios' && (
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.iosDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          <DateTimePicker
            value={parseHHMM(value)}
            mode="time"
            minuteInterval={30}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selected) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (event.type === 'set' && selected) onChange(toHHMM(selected));
              else if (event.type === 'dismissed') setShowPicker(false);
            }}
          />
        </View>
      )}
    </>
  );
}

function webInputStyle(disabled?: boolean): Record<string, string | number> {
  return {
    padding: '12px',
    border: `1px solid ${theme.color.line}`,
    borderRadius: '10px',
    backgroundColor: disabled ? '#F0F0F0' : '#F8F9FA',
    color: disabled ? theme.color.subtle : theme.color.ink,
    colorScheme: 'light',
    fontSize: '15px',
    fontWeight: 600,
    width: '100%',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputDisabled: {
    backgroundColor: '#F0F0F0',
  },
  inputText: { fontSize: 15, fontWeight: '600', color: theme.color.ink },
  placeholderText: { fontWeight: '400', color: theme.color.muted },
  iosPickerContainer: {
    backgroundColor: '#fff',
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.color.line,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  iosDoneText: { color: theme.color.parent, fontSize: 16, fontWeight: '600' },
});
