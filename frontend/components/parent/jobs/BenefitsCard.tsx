// components/parent/jobs/BenefitsCard.tsx
// Enhanced benefits card with government mandatories and leave benefits

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BenefitsCardProps {
  benefits: string;
  providesMeals: boolean;
  providesAccommodation: boolean;
  providesSSS: boolean;
  providesPhilHealth: boolean;
  providesPagIbig: boolean;
  vacationDays: number;
  sickDays: number;
  onBenefitsChange: (value: string) => void;
  onMealsToggle: () => void;
  onAccommodationToggle: () => void;
  onSSSToggle: () => void;
  onPhilHealthToggle: () => void;
  onPagIbigToggle: () => void;
  onVacationDaysChange: (days: number) => void;
  onSickDaysChange: (days: number) => void;
  disabled?: boolean;
}

const LEAVE_OPTIONS = [0, 5, 10, 15, 20, 30];

export function BenefitsCard({
  benefits,
  providesMeals,
  providesAccommodation,
  providesSSS,
  providesPhilHealth,
  providesPagIbig,
  vacationDays,
  sickDays,
  onBenefitsChange,
  onMealsToggle,
  onAccommodationToggle,
  onSSSToggle,
  onPhilHealthToggle,
  onPagIbigToggle,
  onVacationDaysChange,
  onSickDaysChange,
  disabled = false,
}: BenefitsCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="gift-outline" size={24} color="#2563EB" />
        <Text style={styles.title}>Benefits & Perks (Optional)</Text>
      </View>

      {/* Basic Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Basic Benefits</Text>
        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              providesMeals && styles.checkboxActive,
              disabled && styles.checkboxDisabled,
            ]}
            onPress={!disabled ? onMealsToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons
              name={providesMeals ? 'checkbox' : 'square-outline'}
              size={24}
              color={disabled ? '#ccc' : providesMeals ? '#2563EB' : '#999'}
            />
            <Text
              style={[
                styles.checkboxLabel,
                disabled && styles.checkboxLabelDisabled,
              ]}
            >
              Free Meals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.checkbox,
              providesAccommodation && styles.checkboxActive,
              disabled && styles.checkboxDisabled,
            ]}
            onPress={!disabled ? onAccommodationToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons
              name={providesAccommodation ? 'checkbox' : 'square-outline'}
              size={24}
              color={disabled ? '#ccc' : providesAccommodation ? '#2563EB' : '#999'}
            />
            <Text
              style={[
                styles.checkboxLabel,
                disabled && styles.checkboxLabelDisabled,
              ]}
            >
              Free Accommodation
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Government Mandatories */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Government Mandatories</Text>
        <Text style={styles.sectionHint}>
          Required by law for formal employment
        </Text>
        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              providesSSS && styles.checkboxActive,
              disabled && styles.checkboxDisabled,
            ]}
            onPress={!disabled ? onSSSToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons
              name={providesSSS ? 'checkbox' : 'square-outline'}
              size={24}
              color={disabled ? '#ccc' : providesSSS ? '#2563EB' : '#999'}
            />
            <Text
              style={[
                styles.checkboxLabel,
                disabled && styles.checkboxLabelDisabled,
              ]}
            >
              SSS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.checkbox,
              providesPhilHealth && styles.checkboxActive,
              disabled && styles.checkboxDisabled,
            ]}
            onPress={!disabled ? onPhilHealthToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons
              name={providesPhilHealth ? 'checkbox' : 'square-outline'}
              size={24}
              color={disabled ? '#ccc' : providesPhilHealth ? '#2563EB' : '#999'}
            />
            <Text
              style={[
                styles.checkboxLabel,
                disabled && styles.checkboxLabelDisabled,
              ]}
            >
              PhilHealth
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.checkbox,
              providesPagIbig && styles.checkboxActive,
              disabled && styles.checkboxDisabled,
            ]}
            onPress={!disabled ? onPagIbigToggle : undefined}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Ionicons
              name={providesPagIbig ? 'checkbox' : 'square-outline'}
              size={24}
              color={disabled ? '#ccc' : providesPagIbig ? '#2563EB' : '#999'}
            />
            <Text
              style={[
                styles.checkboxLabel,
                disabled && styles.checkboxLabelDisabled,
              ]}
            >
              Pag-IBIG
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Leave Benefits */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Leave Benefits</Text>
        
        {/* Vacation Leave */}
        <View style={styles.leaveRow}>
          <Text style={styles.leaveLabel}>Vacation Leave (days/year)</Text>
          <View style={styles.leaveOptions}>
            {LEAVE_OPTIONS.map((days) => (
              <TouchableOpacity
                key={`vacation-${days}`}
                style={[
                  styles.leaveChip,
                  vacationDays === days && styles.leaveChipActive,
                  disabled && styles.leaveChipDisabled,
                ]}
                onPress={() => !disabled && onVacationDaysChange(days)}
                activeOpacity={disabled ? 1 : 0.7}
              >
                <Text
                  style={[
                    styles.leaveChipText,
                    vacationDays === days && styles.leaveChipTextActive,
                    disabled && styles.leaveChipTextDisabled,
                  ]}
                >
                  {days}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sick Leave */}
        <View style={styles.leaveRow}>
          <Text style={styles.leaveLabel}>Sick Leave (days/year)</Text>
          <View style={styles.leaveOptions}>
            {LEAVE_OPTIONS.map((days) => (
              <TouchableOpacity
                key={`sick-${days}`}
                style={[
                  styles.leaveChip,
                  sickDays === days && styles.leaveChipActive,
                  disabled && styles.leaveChipDisabled,
                ]}
                onPress={() => !disabled && onSickDaysChange(days)}
                activeOpacity={disabled ? 1 : 0.7}
              >
                <Text
                  style={[
                    styles.leaveChipText,
                    sickDays === days && styles.leaveChipTextActive,
                    disabled && styles.leaveChipTextDisabled,
                  ]}
                >
                  {days}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Additional Benefits Text */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Other Benefits (Optional)</Text>
        <TextInput
          style={[styles.textArea, disabled && styles.textAreaDisabled]}
          placeholder="e.g., 13th month pay, annual bonus, transportation allowance, mobile load allowance..."
          value={benefits}
          onChangeText={onBenefitsChange}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor="#999"
          editable={!disabled}
        />
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
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
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
  leaveRow: {
    marginBottom: 12,
  },
  leaveLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  leaveOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  leaveChip: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  leaveChipActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2563EB',
  },
  leaveChipDisabled: {
    opacity: 0.5,
  },
  leaveChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  leaveChipTextActive: {
    color: '#2563EB',
  },
  leaveChipTextDisabled: {
    color: '#999',
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1A1C1E',
    minHeight: 80,
  },
  textAreaDisabled: {
    backgroundColor: '#F0F0F0',
    color: '#999',
  },
});
