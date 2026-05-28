// components/parent/jobs/WorkArrangementCard.tsx
// Component for selecting work arrangement (live-in/out, full/part-time)

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WorkArrangementCardProps {
  employmentType: 'Stay-in' | 'Stay-out' | 'Any';
  workSchedule: 'Full-time' | 'Part-time' | 'Any';
  onEmploymentTypeChange: (type: 'Stay-in' | 'Stay-out' | 'Any') => void;
  onWorkScheduleChange: (schedule: 'Full-time' | 'Part-time' | 'Any') => void;
  disabled?: boolean;
}

export function WorkArrangementCard({
  employmentType,
  workSchedule,
  onEmploymentTypeChange,
  onWorkScheduleChange,
  disabled,
}: WorkArrangementCardProps) {
  const employmentOptions: Array<'Stay-in' | 'Stay-out' | 'Any'> = [
    'Stay-in',
    'Stay-out',
    'Any',
  ];
  
  const scheduleOptions: Array<'Full-time' | 'Part-time' | 'Any'> = [
    'Full-time',
    'Part-time',
    'Any',
  ];

  const isStayIn = employmentType === 'Stay-in';

  const handleEmploymentTypeChange = (type: 'Stay-in' | 'Stay-out' | 'Any') => {
    onEmploymentTypeChange(type);
    if (type === 'Stay-in') {
      // If selecting Stay-in, automatically set to Full-time if it's not already
      if (workSchedule !== 'Full-time') {
        onWorkScheduleChange('Full-time');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="briefcase-outline" size={22} color="#2563EB" />
        <Text style={styles.title}>Work Arrangement *</Text>
      </View>

      {/* Employment Type */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Stay-in or Stay-out?</Text>
        <View style={styles.optionsRow}>
          {employmentOptions.map((option) => (
            <TouchableOpacity
              key={option}
              disabled={disabled}
              style={[
                styles.optionButton,
                employmentType === option && styles.optionButtonActive,
              ]}
              onPress={() => handleEmploymentTypeChange(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  employmentType === option && styles.optionTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Work Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Full-time or Part-time?</Text>
        <View style={styles.optionsRow}>
          {scheduleOptions.map((option) => {
            const isPartTimeOrAny = option === 'Part-time' || option === 'Any';
            const shouldDisable = isPartTimeOrAny && isStayIn;
            const isSelected = workSchedule === option;
            
            // If Stay-in is selected and we're trying to select Part-time or Any, don't allow it
            const handlePress = () => {
              if (shouldDisable) {
                return;
              }
              onWorkScheduleChange(option);
            };
            
            return (
              <TouchableOpacity
                key={option}
                disabled={disabled || shouldDisable}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonActive,
                  shouldDisable && styles.optionButtonDisabled,
                ]}
                onPress={handlePress}
                activeOpacity={shouldDisable ? 1 : 0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextActive,
                    shouldDisable && styles.optionTextDisabled,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
    color: '#1A1C1E',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F8FF',
  },
  optionButtonDisabled: {
    borderColor: '#E5E5EA',
    backgroundColor: '#F3F4F6',
    opacity: 0.5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  optionTextDisabled: {
    color: '#9CA3AF',
  },
});
