// components/helper/profile/profileEditModal/WorkPreferencesSection.tsx

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';

export function WorkPreferencesSection({
  employmentType, setEmploymentType,
  workSchedule, setWorkSchedule,
  expectedSalary, setExpectedSalary,
  availabilityStatus, setAvailabilityStatus
}: any) {
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
        {['Live-in', 'Live-out', 'Any'].map(opt => (
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
        {['Full-time', 'Part-time', 'Any'].map(opt => (
          <TouchableOpacity 
            key={opt} 
            onPress={() => setWorkSchedule(opt)} 
            style={[styles.option, workSchedule === opt && styles.optionActive]}
          >
            <Text style={[styles.optionText, workSchedule === opt && styles.optionTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.salaryContainer}>
        <LabeledInput 
          label="Expected Salary (₱) *" 
          value={expectedSalary} 
          onChangeText={setExpectedSalary} 
          keyboardType="numeric"
          placeholder="6000"
        />
        <Text style={styles.salaryHint}>Recommended minimum: ₱6,000/month</Text>
      </View>

      <Text style={styles.label}>Current Availability</Text>
      <View style={styles.row}>
        {['Available', 'Employed', 'Not Available'].map(opt => (
          <TouchableOpacity 
            key={opt} 
            onPress={() => setAvailabilityStatus(opt)} 
            style={[styles.option, availabilityStatus === opt && styles.optionActive]}
          >
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot, 
                opt === 'Available' ? styles.dotGreen : 
                opt === 'Employed' ? styles.dotOrange : styles.dotRed
              ]} />
              <Text style={[styles.optionText, availabilityStatus === opt && styles.optionTextActive]}>
                {opt}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}