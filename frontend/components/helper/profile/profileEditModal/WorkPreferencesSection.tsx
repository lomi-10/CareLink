// components/helper/profile/profileEditModal/WorkPreferencesSection.tsx

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';
import { useT } from '@/contexts/LocaleContext';

export function WorkPreferencesSection({
  employmentType, setEmploymentType,
  workSchedule, setWorkSchedule,
  expectedSalary, setExpectedSalary
}: any) {
  const { t } = useT();
  const isStayIn = employmentType === 'Stay-in';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: '#E1F5FE' }]}>
          <Ionicons name="briefcase" size={20} color="#0288D1" />
        </View>
        <Text style={styles.sectionTitleText}>{t('helper.setup.workPreferences')}</Text>
      </View>
      
      <Text style={styles.label}>{t('helper.setup.stayArrangement')}</Text>
      <View style={styles.row}>
        {['Stay-in', 'Stay-out', 'Any'].map(opt => (
          <TouchableOpacity 
            key={opt} 
            onPress={() => setEmploymentType(opt)} 
            style={[styles.option, employmentType === opt && styles.optionActive]}
          >
            <Text style={[styles.optionText, employmentType === opt && styles.optionTextActive]}>
              {opt === 'Stay-in' ? t('helper.setup.stayIn') : opt === 'Stay-out' ? t('helper.setup.stayOut') : t('helper.setup.any')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('helper.setup.workHours')}</Text>
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
                {opt === 'Full-time' ? t('helper.setup.fullTime') : opt === 'Part-time' ? t('helper.setup.partTime') : t('helper.setup.any')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.salaryContainer}>
        <LabeledInput 
          label={t('helper.setup.salaryLabel')}
          required
          value={expectedSalary} 
          onChangeText={setExpectedSalary} 
          keyboardType="numeric"
          placeholder="6000"
        />
        <Text style={styles.salaryHint}>{t('helper.setup.expectedSalaryMinimum')}</Text>
      </View>
    </View>
  );
}
