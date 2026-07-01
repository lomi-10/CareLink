// components/parent/jobs/SalaryInputCard.tsx

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';

// Suggested monthly salary range per category (PHP), keyed by ref_categories.category_id
const SUGGESTED_RANGES: Record<string, { min: number; max: number }> = {
  '1': { min: 7000, max: 10000 }, // General Househelp
  '2': { min: 8000, max: 12000 }, // Yaya
  '3': { min: 8000, max: 12000 }, // Cook
  '4': { min: 7000, max: 9000 },  // Gardening
  '5': { min: 7000, max: 9000 },  // Laundry Person
  '6': { min: 7000, max: 12000 }, // Others
};

function getSuggestedRange(categoryIds: string[]) {
  const ranges = categoryIds.map((id) => SUGGESTED_RANGES[id]).filter(Boolean);
  if (ranges.length === 0) return null;
  return {
    min: Math.min(...ranges.map((r) => r.min)),
    max: Math.max(...ranges.map((r) => r.max)),
  };
}

interface SalaryInputCardProps {
  salaryMin: string;
  salaryMax: string;
  salaryPeriod: 'Daily' | 'Weekly' | 'Monthly';
  onSalaryMinChange: (value: string) => void;
  onSalaryMaxChange: (value: string) => void;
  onPeriodChange: (period: 'Daily' | 'Weekly' | 'Monthly') => void;
  categoryIds?: string[];
  error?: string;
  errorMax?: string;
  disabled?: boolean;
}

export function SalaryInputCard({
  salaryMin,
  salaryMax,
  salaryPeriod,
  onSalaryMinChange,
  onSalaryMaxChange,
  onPeriodChange,
  categoryIds = [],
  error,
  errorMax,
  disabled,
}: SalaryInputCardProps) {
  const suggested = getSuggestedRange(categoryIds);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cash-outline" size={22} color={BROWN} />
        <Text style={styles.title}>Monthly Salary Range <Text style={{ color: '#EF4444' }}>*</Text></Text>
      </View>

      <View style={styles.rangeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Minimum</Text>
          <View style={styles.inputRow}>
            <View style={styles.currencySymbol}>
              <Text style={styles.currencyText}>₱</Text>
            </View>
            <TextInput
              style={[styles.salaryInput, disabled && styles.inputDisabled]}
              placeholder="7,000"
              value={salaryMin}
              onChangeText={onSalaryMinChange}
              keyboardType="numeric"
              editable={!disabled}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.rangeSep}>
          <Text style={styles.rangeSepText}>–</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Maximum (optional)</Text>
          <View style={styles.inputRow}>
            <View style={styles.currencySymbol}>
              <Text style={styles.currencyText}>₱</Text>
            </View>
            <TextInput
              style={[styles.salaryInput, disabled && styles.inputDisabled]}
              placeholder="e.g. 12,000"
              value={salaryMax}
              onChangeText={onSalaryMaxChange}
              keyboardType="numeric"
              editable={!disabled}
              placeholderTextColor="#999"
            />
          </View>
        </View>
      </View>

      <Text style={styles.minimumNote}>Minimum: ₱7,000/month (CareLink platform standard)</Text>
      {suggested && (
        <Text style={styles.suggestedText}>
          Suggested range for this role: ₱{suggested.min.toLocaleString()} - ₱{suggested.max.toLocaleString()} / month
        </Text>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {errorMax ? <Text style={styles.errorText}>{errorMax}</Text> : null}

      <Text style={styles.periodLabel}>Payment Period</Text>
      <View style={styles.periodRow}>
        {(['Daily', 'Weekly', 'Monthly'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, salaryPeriod === p && styles.periodButtonActive]}
            onPress={() => onPeriodChange(p)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text style={[styles.periodText, salaryPeriod === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
    color: DARK,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rangeSep: {
    paddingBottom: 14,
    alignItems: 'center',
  },
  rangeSepText: {
    fontSize: 18,
    color: MUTED,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: DIVIDER,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 0,
  },
  currencyText: {
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
  },
  salaryInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DIVIDER,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1C1E',
    borderLeftWidth: 0,
  },
  inputDisabled: {
    backgroundColor: '#F0F0F0',
    color: '#999',
  },
  minimumNote: {
    fontSize: 12,
    color: MUTED,
    marginTop: 6,
    fontStyle: 'italic',
  },
  suggestedText: {
    fontSize: 12,
    color: BROWN,
    fontWeight: '600',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 4,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    marginTop: 16,
    marginBottom: 8,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  periodButtonActive: {
    borderColor: CARAMEL,
    backgroundColor: ICON_BG,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  periodTextActive: {
    color: BROWN,
    fontWeight: '700',
  },
});
