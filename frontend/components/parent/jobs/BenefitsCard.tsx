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
        <Text style={styles.title}>Benefits & Perks (Optional)</Text>
      </View>

      {/* Basic Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Basic Benefits</Text>
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

      {/* Government Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Government Benefits (if applicable)</Text>
        <Text style={styles.sectionHint}>Required by law for formal employment</Text>
        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[styles.checkbox, providesSSS && styles.checkboxActive, disabled && styles.checkboxDisabled]}
            onPress={!disabled ? onSSSToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons name={providesSSS ? 'checkbox' : 'square-outline'} size={24} color={disabled ? '#ccc' : providesSSS ? BROWN : '#999'} />
            <Text style={[styles.checkboxLabel, disabled && styles.checkboxLabelDisabled]}>SSS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkbox, providesPhilHealth && styles.checkboxActive, disabled && styles.checkboxDisabled]}
            onPress={!disabled ? onPhilHealthToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons name={providesPhilHealth ? 'checkbox' : 'square-outline'} size={24} color={disabled ? '#ccc' : providesPhilHealth ? BROWN : '#999'} />
            <Text style={[styles.checkboxLabel, disabled && styles.checkboxLabelDisabled]}>PhilHealth</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkbox, providesPagIbig && styles.checkboxActive, disabled && styles.checkboxDisabled]}
            onPress={!disabled ? onPagIbigToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons name={providesPagIbig ? 'checkbox' : 'square-outline'} size={24} color={disabled ? '#ccc' : providesPagIbig ? BROWN : '#999'} />
            <Text style={[styles.checkboxLabel, disabled && styles.checkboxLabelDisabled]}>Pag-IBIG</Text>
          </TouchableOpacity>
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
    marginBottom: 8,
  },
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
