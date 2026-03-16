// components/parent/jobs/ExperienceSelector.tsx
// Minimum experience selector

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExperienceSelectorProps {
  minExperience: number;
  onExperienceChange: (years: number) => void;
  disabled?: boolean;
}

const EXPERIENCE_OPTIONS = [
  { value: 0, label: 'No requirement' },
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

      <View style={styles.optionsGrid}>
        {EXPERIENCE_OPTIONS.map((option) => {
          const isSelected = minExperience === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardActive,
                disabled && styles.optionCardDisabled,
              ]}
              onPress={() => !disabled && onExperienceChange(option.value)}
              activeOpacity={disabled ? 1 : 0.7}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextActive,
                  disabled && styles.optionTextDisabled,
                ]}
              >
                {option.label}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#007AFF"
                  style={styles.checkmark}
                />
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
    color: '#1A1C1E',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  optionCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8F9FA',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  optionTextDisabled: {
    color: '#999',
  },
  checkmark: {
    marginLeft: 4,
  },
});
