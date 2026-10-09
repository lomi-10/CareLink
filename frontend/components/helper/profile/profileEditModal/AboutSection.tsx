// components/helper/profile/profileEditModal/AboutSection.tsx

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';
import { useT } from '@/contexts/LocaleContext';

export function AboutSection({
  bio, setBio,
  educationLevel, setEducationLevel,
  experienceYears, setExperienceYears
}: any) {
  const { t } = useT();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: '#F3E8FF' }]}>
          <Ionicons name="book" size={20} color="#9333EA" />
        </View>
        <Text style={styles.sectionTitleText}>{t('helper.setup.professionalBio')}</Text>
      </View>
      
      <LabeledInput 
        label={t('helper.setup.tellAboutYourself')}
        required
        value={bio} 
        onChangeText={setBio} 
        multiline 
        numberOfLines={4} 
        placeholder={t('helper.setup.describeWork')}
      />

      <Text style={styles.label}>{t('helper.setup.educationalAttainment')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <View style={styles.row}>
          {['Elementary', 'High School Grad', 'College Grad', 'Vocational'].map(opt => (
            <TouchableOpacity 
              key={opt} 
              onPress={() => setEducationLevel(opt)} 
              style={[styles.option, educationLevel === opt && styles.optionActive]}
            >
              <Text style={[styles.optionText, educationLevel === opt && styles.optionTextActive]}>
                {t(`helper.setup.educationOptions.${opt}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <LabeledInput 
        label={t('helper.setup.yearsOfExperience')}
        value={experienceYears} 
        onChangeText={setExperienceYears} 
        keyboardType="numeric"
        placeholder="0"
      />
    </View>
  );
}