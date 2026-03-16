// components/parent/jobs/SalaryInputCard.tsx
// Component for salary input with period and benefits

import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SalaryInputCardProps {
  salaryOffered: string;
  salaryPeriod: 'Daily' | 'Monthly';
  benefits: string;
  onSalaryChange: (value: string) => void;
  onPeriodChange: (period: 'Daily' | 'Monthly') => void;
  onBenefitsChange: (value: string) => void;
  error?: string; 
  disabled?: boolean;
}

export function SalaryInputCard({
  salaryOffered,
  salaryPeriod,
  benefits,
  onSalaryChange,
  onPeriodChange,
  onBenefitsChange,
  error,
  disabled,
}: SalaryInputCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cash-outline" size={22} color="#34C759" />
        <Text style={styles.title}>Salary & Benefits *</Text>
      </View>

      {/* Salary Amount */}
      <Text style={styles.label}>Salary Offered</Text>
      <View style={styles.salaryInputRow}>
        <View style={styles.currencySymbol}>
          <Text style={styles.currencyText}>₱</Text>
        </View>
        <TextInput
          style={[styles.salaryInput, disabled && { backgroundColor: '#f99c9cff' }]}
          placeholder="e.g., 8000"
          value={salaryOffered}
          onChangeText={onSalaryChange}
          keyboardType="numeric"
          editable={!disabled}
          placeholderTextColor="#999"
        />
      </View>
      
      <Text style={styles.minimumNote}>Minimum: ₱6,000 (PESO requirement)</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Salary Period */}
      <Text style={[styles.label, { marginTop: 16 }]}>Payment Period</Text>
      <View style={styles.periodRow}>
        <TouchableOpacity
          style={[
            styles.periodButton,
            salaryPeriod === 'Daily' && styles.periodButtonActive,
            disabled && { backgroundColor: '#f99c9cff' },
          ]}
          onPress={() => onPeriodChange('Daily')} 
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.periodText,
              salaryPeriod === 'Daily' && styles.periodTextActive,
            ]}
          >
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.periodButton,
            salaryPeriod === 'Monthly' && styles.periodButtonActive,
            disabled && { backgroundColor: '#f99c9cff' },
          ]}
          onPress={() => onPeriodChange('Monthly')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.periodText,
              salaryPeriod === 'Monthly' && styles.periodTextActive,
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Benefits */}
      <Text style={[styles.label, { marginTop: 16 }]}>
        Benefits (Optional)
      </Text>
      <TextInput
        style={styles.benefitsInput}
        placeholder="e.g., SSS, PhilHealth, 13th month pay, free meals"
        value={benefits}
        onChangeText={onBenefitsChange}
        multiline
        numberOfLines={3}
        placeholderTextColor="#999"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  salaryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRightWidth: 0,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  salaryInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1C1E',
    borderLeftWidth: 0,
  },
  minimumNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 6,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  periodButtonActive: {
    borderColor: '#34C759',
    backgroundColor: '#E8F5E9',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodTextActive: {
    color: '#34C759',
    fontWeight: '700',
  },
  benefitsInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1C1E',
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
