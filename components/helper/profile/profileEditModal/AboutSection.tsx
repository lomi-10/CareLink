// components/helper/profile/profileEditModal/AboutSection.tsx

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';

export function AboutSection({
  bio, setBio,
  educationLevel, setEducationLevel,
  experienceYears, setExperienceYears
}: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: '#F3E8FF' }]}>
          <Ionicons name="book" size={20} color="#9333EA" />
        </View>
        <Text style={styles.sectionTitleText}>Professional Bio</Text>
      </View>
      
      <LabeledInput 
        label="Tell employers about yourself" 
        value={bio} 
        onChangeText={setBio} 
        multiline 
        numberOfLines={4} 
        placeholder="Briefly describe your work history and strengths..."
      />

      <Text style={styles.label}>Educational Attainment</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <View style={styles.row}>
          {['Elementary', 'High School Grad', 'College Grad', 'Vocational'].map(opt => (
            <TouchableOpacity 
              key={opt} 
              onPress={() => setEducationLevel(opt)} 
              style={[styles.option, educationLevel === opt && styles.optionActive]}
            >
              <Text style={[styles.optionText, educationLevel === opt && styles.optionTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <LabeledInput 
        label="Years of Experience" 
        value={experienceYears} 
        onChangeText={setExperienceYears} 
        keyboardType="numeric"
        placeholder="0"
      />
    </View>
  );
}