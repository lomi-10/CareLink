// components/helper/profile/profileEditModal/WorkPreferencesSection.tsx

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';

export function WorkPreferencesSection({
  employmentType, setEmploymentType,
  workSchedule, setWorkSchedule,
  expectedSalary, setExpectedSalary
}: any) {
  const isStayIn = employmentType === 'Stay-in';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: '#E1F5FE' }]}>
          <Ionicons name="briefcase" size={20} color="#0288D1" />
        </View>
        <Text style={styles.sectionTitleText}>Work Preferences</Text>
      </View>
      
      <Text style={styles.label}>Stay Arrangement</Text>
      <View style={styles.row}>
        {['Stay-in', 'Stay-out', 'Any'].map(opt => (
          <TouchableOpacity 
            key={opt} 
            onPress={() => setEmploymentType(opt)} 
            style={[styles.option, employmentType === opt && styles.optionActive]}
          >
            <Text style={[styles.optionText, employmentType === opt && styles.optionTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Work Hours</Text>
      <View style={styles.row}>
        {['Full-time', 'Part-time', 'Any'].map(opt => {
          const disabled = isStayIn && (opt === 'Part-time' || opt === 'Any');
          return (
            <TouchableOpacity 
              key={opt} 
              onPress={() => !disabled && setWorkSchedule(opt)} 
              style={[
                styles.option, 
                workSchedule === opt && styles.optionActive,
                disabled && styles.optionDisabled
              ]}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <Text style={[
                styles.optionText, 
                workSchedule === opt && styles.optionTextActive,
                disabled && styles.optionTextDisabled
              ]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.salaryContainer}>
        <LabeledInput 
          label="Expected Salary (₱)" 
          required
          value={expectedSalary} 
          onChangeText={setExpectedSalary} 
          keyboardType="numeric"
          placeholder="6000"
        />
        <Text style={styles.salaryHint}>Recommended minimum: ₱6,000/month</Text>
      </View>
    </View>
  );
}
