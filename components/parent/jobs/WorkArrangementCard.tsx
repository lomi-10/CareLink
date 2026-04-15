// components/parent/jobs/WorkArrangementCard.tsx
// Component for selecting work arrangement (live-in/out, full/part-time)

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WorkArrangementCardProps {
  employmentType: 'Live-in' | 'Live-out' | 'Any';
  workSchedule: 'Full-time' | 'Part-time' | 'Any';
  onEmploymentTypeChange: (type: 'Live-in' | 'Live-out' | 'Any') => void;
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
  const employmentOptions: Array<'Live-in' | 'Live-out' | 'Any'> = [
    'Live-in',
    'Live-out',
    'Any',
  ];
  
  const scheduleOptions: Array<'Full-time' | 'Part-time' | 'Any'> = [
    'Full-time',
    'Part-time',
    'Any',
  ];

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
              onPress={() => onEmploymentTypeChange(option)}
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
          {scheduleOptions.map((option) => (
            <TouchableOpacity
              key={option}
              disabled={disabled}
              style={[
                styles.optionButton,
                workSchedule === option && styles.optionButtonActive,
              ]}
              onPress={() => onWorkScheduleChange(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  workSchedule === option && styles.optionTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
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
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
