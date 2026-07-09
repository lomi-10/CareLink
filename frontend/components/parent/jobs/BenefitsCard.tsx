// components/parent/jobs/BenefitsCard.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BROWN, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';

interface BenefitsCardProps {
  providesMeals: boolean;
  providesAccommodation: boolean;
  providesSSS: boolean;
  providesPhilHealth: boolean;
  providesPagIbig: boolean;
  onMealsToggle: () => void;
  onAccommodationToggle: () => void;
  onSSSToggle: () => void;
  onPhilHealthToggle: () => void;
  onPagIbigToggle: () => void;
  disabled?: boolean;
}

export function BenefitsCard({
  providesMeals,
  providesAccommodation,
  providesSSS,
  providesPhilHealth,
  providesPagIbig,
  onMealsToggle,
  onAccommodationToggle,
  onSSSToggle,
  onPhilHealthToggle,
  onPagIbigToggle,
  disabled = false,
}: BenefitsCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="gift-outline" size={24} color={BROWN} />
        <Text style={styles.title}>Benefits</Text>
      </View>

      {/* Basic Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Extra perks (optional)</Text>
        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[styles.checkbox, providesMeals && styles.checkboxActive, disabled && styles.checkboxDisabled]}
            onPress={!disabled ? onMealsToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons name={providesMeals ? 'checkbox' : 'square-outline'} size={24} color={disabled ? '#ccc' : providesMeals ? BROWN : '#999'} />
            <Text style={[styles.checkboxLabel, disabled && styles.checkboxLabelDisabled]}>Free Meals</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkbox, providesAccommodation && styles.checkboxActive, disabled && styles.checkboxDisabled]}
            onPress={!disabled ? onAccommodationToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons name={providesAccommodation ? 'checkbox' : 'square-outline'} size={24} color={disabled ? '#ccc' : providesAccommodation ? BROWN : '#999'} />
            <Text style={[styles.checkboxLabel, disabled && styles.checkboxLabelDisabled]}>Free Accommodation</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Government contributions — mandatory under RA 10361 (Kasambahay Law) */}
      <View style={styles.section}>
        <View style={styles.reqLabelRow}>
          <Text style={styles.sectionLabel}>Government contributions</Text>
          <View style={styles.reqPill}><Text style={styles.reqPillText}>Required by law</Text></View>
        </View>
        <Text style={styles.sectionHint}>
          Under RA 10361, SSS, PhilHealth, and Pag-IBIG are required once the salary qualifies — and every CareLink job does. These are included automatically.
        </Text>
        <View style={styles.govRow}>
          {['SSS', 'PhilHealth', 'Pag-IBIG'].map((label) => (
            <View key={label} style={styles.govItem}>
              <Ionicons name="shield-checkmark" size={18} color={BROWN} />
              <Text style={styles.govLabel}>{label}</Text>
            </View>
          ))}
        </View>
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
    borderColor: DIVIDER,
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
    color: DARK,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 10,
    lineHeight: 17,
  },
  reqLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  reqPill: { backgroundColor: '#FDECEC', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  reqPillText: { fontSize: 10.5, fontWeight: '800', color: '#C0392B', letterSpacing: 0.3 },
  govRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  govItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F4E7D6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  govLabel: { fontSize: 13, fontWeight: '700', color: DARK },
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  checkboxActive: {},
  checkboxDisabled: {
    opacity: 0.5,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  checkboxLabelDisabled: {
    color: '#999',
  },
});
