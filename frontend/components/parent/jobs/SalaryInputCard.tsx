// components/parent/jobs/SalaryInputCard.tsx

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';
import { SALARY_PERIODS, payoutBreakdown, peso, type SalaryPeriod } from '@/lib/salary';

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
  salaryPeriod: SalaryPeriod;
  onSalaryMinChange: (value: string) => void;
  onSalaryMaxChange: (value: string) => void;
  onPeriodChange: (period: SalaryPeriod) => void;
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
  const minNum = Number(String(salaryMin).replace(/[^0-9.]/g, '')) || 0;
  const maxNum = Number(String(salaryMax).replace(/[^0-9.]/g, '')) || 0;

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

      <Text style={styles.minimumNote}>
        Minimum ₱7,000 / month — CareLink’s fair-pay standard, set above the legal kasambahay minimum. SSS, PhilHealth &amp; Pag-IBIG are added on top (required by law).
      </Text>
      {suggested && (
        <Text style={styles.suggestedText}>
          Suggested range for this role: ₱{suggested.min.toLocaleString()} - ₱{suggested.max.toLocaleString()} / month
        </Text>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {errorMax ? <Text style={styles.errorText}>{errorMax}</Text> : null}

      <Text style={styles.periodLabel}>Payment Schedule</Text>
      <Text style={styles.periodHint}>
        How often you hand over the pay. The salary above stays the same monthly total — we just split it for you.
      </Text>
      <View style={styles.periodGrid}>
        {SALARY_PERIODS.map((p) => {
          const active = salaryPeriod === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              style={[styles.periodButton, active && styles.periodButtonActive]}
              onPress={() => onPeriodChange(p.value)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Text style={[styles.periodText, active && styles.periodTextActive]}>{p.label}</Text>
              <Text style={[styles.periodSub, active && styles.periodSubActive]}>{p.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {minNum >= 1 && <PayoutPreview monthly={minNum} maxMonthly={maxNum} period={salaryPeriod} />}
    </View>
  );
}

/** Live "what you'll actually pay each time" breakdown — the whole point of picking a schedule. */
function PayoutPreview({ monthly, maxMonthly, period }: { monthly: number; maxMonthly: number; period: SalaryPeriod }) {
  const lo = payoutBreakdown(monthly, period);
  const hasRange = maxMonthly > monthly;
  const hi = hasRange ? payoutBreakdown(maxMonthly, period) : null;

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHead}>
        <Ionicons name="calculator-outline" size={16} color={BROWN} />
        <Text style={styles.previewTitle}>What you’ll pay each time</Text>
      </View>

      {lo.slices.map((slice, i) => (
        <View key={slice.label} style={styles.previewRow}>
          <Text style={styles.previewLabel}>{slice.label}</Text>
          <Text style={styles.previewAmount}>
            {lo.approximate ? '≈ ' : ''}
            {hi ? `${peso(slice.amount)} – ${peso(hi.slices[i].amount)}` : peso(slice.amount)}
          </Text>
        </View>
      ))}

      <View style={styles.previewDivider} />
      <View style={styles.previewRow}>
        <Text style={styles.previewTotalLabel}>Monthly total</Text>
        <Text style={styles.previewTotal}>
          {hi ? `${peso(lo.monthly)} – ${peso(hi.monthly)}` : peso(lo.monthly)}
        </Text>
      </View>

      {lo.approximate && (
        <Text style={styles.previewNote}>
          {period === 'Daily'
            ? 'Based on 26 working days a month (6-day week). Actual pay follows days worked.'
            : 'Based on about 4.33 weeks a month, so weekly amounts vary slightly.'}
        </Text>
      )}
      {period === 'Semi-monthly' && (
        <Text style={styles.previewNote}>Kinsenas — the monthly salary is split in half, paid twice a month.</Text>
      )}
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
  periodHint: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 10,
    lineHeight: 17,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    flexGrow: 1,
    flexBasis: 100,
    minWidth: 92,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
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
  periodSub: {
    fontSize: 10.5,
    color: MUTED,
    marginTop: 2,
    textAlign: 'center',
  },
  periodSubActive: {
    color: BROWN,
  },

  // Live payout preview
  previewCard: {
    marginTop: 16,
    backgroundColor: ICON_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    padding: 14,
  },
  previewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: DARK,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 13,
    color: MUTED,
  },
  previewAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
  },
  previewDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 8,
  },
  previewTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
  },
  previewTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: BROWN,
  },
  previewNote: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 8,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
