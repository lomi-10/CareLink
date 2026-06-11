// components/parent/jobs/ExperienceSelector.tsx
// Minimum experience selector

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';

interface ExperienceSelectorProps {
  minExperience: number;
  onExperienceChange: (years: number) => void;
  disabled?: boolean;
}

const EXPERIENCE_OPTIONS = [
  { value: 0, label: 'No experience' },
  { value: 1, label: '1+ year' },
  { value: 2, label: '2+ years' },
  { value: 3, label: '3+ years' },
  { value: 5, label: '5+ years' },
  { value: 10, label: '10+ years' },
];

export function ExperienceSelector({
  minExperience,
  onExperienceChange,
  disabled = false,
}: ExperienceSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Minimum Experience (Optional)</Text>
      <Text style={styles.hint}>
        Select the minimum years of experience required
      </Text>

      <View style={styles.chipRow}>
        {EXPERIENCE_OPTIONS.map((option) => {
          const isSelected = minExperience === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                isSelected && styles.chipActive,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => !disabled && onExperienceChange(option.value)}
              activeOpacity={disabled ? 1 : 0.7}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextActive,
                  disabled && styles.chipTextDisabled,
                ]}
              >
                {option.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={16} color={BROWN} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    borderColor: CARAMEL,
    backgroundColor: ICON_BG,
  },
  chipDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8F9FA',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chipTextActive: {
    color: BROWN,
    fontWeight: '700',
  },
  chipTextDisabled: {
    color: '#999',
  },
});
