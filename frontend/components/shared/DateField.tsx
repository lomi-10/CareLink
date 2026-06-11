// components/shared/DateField.tsx
// Reusable YYYY-MM-DD date picker — native browser calendar on web,
// @react-native-community/datetimepicker on iOS/Android.
// Same UX as the "Preferred Start Date" picker in the job post modal.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@/constants/theme';

function parseYmd(value: string): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface DateFieldProps {
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

export function DateField({ value, onChange, placeholder = 'Select a date', minimumDate, maximumDate, disabled }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'date',
      value: /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '',
      min: minimumDate ? toYmd(minimumDate) : undefined,
      max: maximumDate ? toYmd(maximumDate) : undefined,
      disabled,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value || ''),
      style: webInputStyle(disabled),
    });
  }

  const label = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseYmd(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : placeholder;

  return (
    <>
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={() => !disabled && setShowPicker(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>{label}</Text>
        <Ionicons name="calendar" size={20} color={disabled ? theme.color.subtle : theme.color.parent} />
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
            value={parseYmd(value)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event, selected) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (event.type === 'set' && selected) onChange(toYmd(selected));
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
    fontSize: '15px',
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
  inputText: { fontSize: 15, color: theme.color.ink },
  placeholderText: { color: theme.color.subtle },
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
