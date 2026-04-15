// components/parent/jobs/ContractDetailsCard.tsx
// Contract details: duration and probation period

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ContractDetailsCardProps {
  contractDuration: string;
  probationPeriod: string;
  onContractDurationChange: (duration: string) => void;
  onProbationPeriodChange: (period: string) => void;
  disabled?: boolean;
}

const CONTRACT_OPTIONS = [
  { value: '3 months', label: '3 Months' },
  { value: '6 months', label: '6 Months' },
  { value: '1 year', label: '1 Year' },
  { value: '2 years', label: '2 Years' },
  { value: 'Indefinite', label: 'Indefinite' },
];

const PROBATION_OPTIONS = [
  { value: 'None', label: 'No Probation' },
  { value: '1 month', label: '1 Month' },
  { value: '2 months', label: '2 Months' },
  { value: '3 months', label: '3 Months' },
  { value: '6 months', label: '6 Months' },
];

export function ContractDetailsCard({
  contractDuration,
  probationPeriod,
  onContractDurationChange,
  onProbationPeriodChange,
  disabled = false,
}: ContractDetailsCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text-outline" size={24} color="#2563EB" />
        <Text style={styles.title}>Contract Details (Optional)</Text>
      </View>

      {/* Contract Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Contract Duration</Text>
        <View style={styles.optionsRow}>
          {CONTRACT_OPTIONS.map((option) => {
            const isSelected = contractDuration === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionChip,
                  isSelected && styles.optionChipActive,
                  disabled && styles.optionChipDisabled,
                ]}
                onPress={() => !disabled && onContractDurationChange(option.value)}
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
                  <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Probation Period */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Probation Period</Text>
        <View style={styles.optionsRow}>
          {PROBATION_OPTIONS.map((option) => {
            const isSelected = probationPeriod === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionChip,
                  isSelected && styles.optionChipActive,
                  disabled && styles.optionChipDisabled,
                ]}
                onPress={() => !disabled && onProbationPeriodChange(option.value)}
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
                  <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#2563EB" />
        <Text style={styles.infoText}>
          Contract terms help set clear expectations with your helper
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  optionChipActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2563EB',
  },
  optionChipDisabled: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  optionTextActive: {
    color: '#2563EB',
  },
  optionTextDisabled: {
    color: '#999',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16,
  },
});
